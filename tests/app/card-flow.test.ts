import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
	type CardListen,
	type CardState,
	type CardTone,
	createCardFlow,
} from "../../src/app/card-flow";
import type { ListenResult, PitchReading } from "../../src/audio/listener";
import { createToneTracker, DEFAULT_THRESHOLDS } from "../../src/core/judge";
import type { Pitch } from "../../src/core/pitch";

const POOL = [60, 62, 64, 65] as Pitch[];
const NONE = { grade: "none" };
const DELAY = 3000;
const ADVANCE = 2000;

let states: CardState[];

function setup(advanceDelayMs: number | null = null) {
	let i = 0;
	// Cycles 0, 1/3, 2/3: with a previous pitch removed, three candidates.
	const random = () => (i++ % 3) / 3;
	const flow = createCardFlow({
		pool: POOL,
		random,
		delayMs: DELAY,
		advanceDelayMs,
		onChange: (s) => states.push(s),
	});
	flow.start();
	return flow;
}

const last = () => states[states.length - 1] as CardState;

beforeEach(() => {
	vi.useFakeTimers();
	states = [];
});

afterEach(() => {
	vi.useRealTimers();
});

describe("createCardFlow", () => {
	test("start shows an unrevealed card and reveals after the delay", () => {
		setup();
		expect(last().revealed).toBe(false);
		vi.advanceTimersByTime(DELAY - 1);
		expect(last().revealed).toBe(false);
		vi.advanceTimersByTime(1);
		expect(last().revealed).toBe(true);
	});

	test("AC6: step before the delay reveals at once and the timer stops", () => {
		const flow = setup();
		const first = last().pitch;
		vi.advanceTimersByTime(1000);
		flow.step();
		expect(last()).toEqual({
			pitch: first,
			revealed: true,
			verdict: NONE,
			listening: "off",
		});
		const count = states.length;
		vi.advanceTimersByTime(DELAY * 2);
		expect(states).toHaveLength(count);
	});

	test("AC7: step when revealed shows a new unrevealed card with a fresh timer", () => {
		const flow = setup();
		const first = last().pitch;
		vi.advanceTimersByTime(DELAY);
		flow.step();
		expect(last().revealed).toBe(false);
		expect(last().pitch).not.toBe(first);
		vi.advanceTimersByTime(DELAY - 1);
		expect(last().revealed).toBe(false);
		vi.advanceTimersByTime(1);
		expect(last().revealed).toBe(true);
	});

	test("AC7: the timer of a card revealed early does not shorten the next card's delay", () => {
		const flow = setup();
		vi.advanceTimersByTime(2000);
		flow.step();
		flow.step();
		vi.advanceTimersByTime(DELAY - 1);
		expect(last().revealed).toBe(false);
		vi.advanceTimersByTime(1);
		expect(last().revealed).toBe(true);
	});

	test("AC8: one step from unrevealed only reveals", () => {
		const flow = setup();
		const first = last().pitch;
		const count = states.length;
		flow.step();
		expect(states).toHaveLength(count + 1);
		expect(last()).toEqual({
			pitch: first,
			revealed: true,
			verdict: NONE,
			listening: "off",
		});
	});

	test("AC8: one step from revealed only advances", () => {
		const flow = setup();
		const first = last().pitch;
		flow.step();
		const count = states.length;
		flow.step();
		expect(states).toHaveLength(count + 1);
		expect(last().revealed).toBe(false);
		expect(last().pitch).not.toBe(first);
	});

	test("stop prevents a pending reveal", () => {
		const flow = setup();
		const count = states.length;
		flow.stop();
		vi.advanceTimersByTime(DELAY * 2);
		expect(states).toHaveLength(count);
	});

	test("AC2: a revealed card advances after the advance delay, and the next card's reveal timer starts from zero", () => {
		setup(ADVANCE);
		const first = last().pitch;
		vi.advanceTimersByTime(DELAY);
		expect(last()).toEqual({
			pitch: first,
			revealed: true,
			verdict: NONE,
			listening: "off",
		});
		vi.advanceTimersByTime(ADVANCE - 1);
		expect(last()).toEqual({
			pitch: first,
			revealed: true,
			verdict: NONE,
			listening: "off",
		});
		vi.advanceTimersByTime(1);
		expect(last().revealed).toBe(false);
		expect(last().pitch).not.toBe(first);
		vi.advanceTimersByTime(DELAY - 1);
		expect(last().revealed).toBe(false);
		vi.advanceTimersByTime(1);
		expect(last().revealed).toBe(true);
	});

	test("AC2: the advance delay counts from an early reveal", () => {
		const flow = setup(ADVANCE);
		const first = last().pitch;
		vi.advanceTimersByTime(1000);
		flow.step();
		vi.advanceTimersByTime(ADVANCE - 1);
		expect(last()).toEqual({
			pitch: first,
			revealed: true,
			verdict: NONE,
			listening: "off",
		});
		vi.advanceTimersByTime(1);
		expect(last().revealed).toBe(false);
		expect(last().pitch).not.toBe(first);
	});

	test("AC5: no advance timer runs while hidden, and one step only reveals", () => {
		const flow = setup(ADVANCE);
		const first = last().pitch;
		vi.advanceTimersByTime(ADVANCE);
		expect(last()).toEqual({
			pitch: first,
			revealed: false,
			verdict: null,
			listening: "off",
		});
		const count = states.length;
		flow.step();
		expect(states).toHaveLength(count + 1);
		expect(last()).toEqual({
			pitch: first,
			revealed: true,
			verdict: NONE,
			listening: "off",
		});
	});

	test("AC3: a step during the advance wait shows the next card at once and the advance never fires", () => {
		const flow = setup(ADVANCE);
		const first = last().pitch;
		vi.advanceTimersByTime(DELAY);
		vi.advanceTimersByTime(500);
		flow.step();
		const second = last().pitch;
		expect(last().revealed).toBe(false);
		expect(second).not.toBe(first);
		const count = states.length;
		vi.advanceTimersByTime(DELAY + ADVANCE - 1);
		expect(last().pitch).toBe(second);
		expect(states.slice(count)).toEqual([
			{ pitch: second, revealed: true, verdict: NONE, listening: "off" },
		]);
	});

	test("AC4: with auto-advance off a revealed card stays until a step", () => {
		const flow = setup(null);
		vi.advanceTimersByTime(DELAY);
		const shown = last();
		expect(shown.revealed).toBe(true);
		const count = states.length;
		vi.runAllTimers();
		expect(states).toHaveLength(count);
		flow.step();
		expect(last().revealed).toBe(false);
		expect(last().pitch).not.toBe(shown.pitch);
	});

	test("AC6: stop cancels a pending advance", () => {
		const flow = setup(ADVANCE);
		vi.advanceTimersByTime(DELAY);
		const count = states.length;
		flow.stop();
		vi.runAllTimers();
		expect(states).toHaveLength(count);
	});
});

describe("createCardFlow tone", () => {
	interface Call {
		kind: "play" | "stop";
		at: number;
		pitch?: Pitch;
	}

	function toneSetup(
		toneDelayMs: number | null,
		advanceDelayMs: number | null = ADVANCE,
		over: Partial<CardTone> = {},
	) {
		const calls: Call[] = [];
		const start = Date.now();
		const tone: CardTone | null =
			toneDelayMs === null
				? null
				: {
						delayMs: toneDelayMs,
						play: (pitch) =>
							calls.push({ kind: "play", at: Date.now() - start, pitch }),
						stop: () => calls.push({ kind: "stop", at: Date.now() - start }),
						...over,
					};
		let i = 0;
		const flow = createCardFlow({
			pool: POOL,
			random: () => (i++ % 3) / 3,
			delayMs: DELAY,
			advanceDelayMs,
			tone,
			onChange: (s) => states.push(s),
		});
		flow.start();
		const plays = () => calls.filter((c) => c.kind === "play");
		return { flow, calls, plays };
	}

	test("plays the revealed pitch after the sound delay following a timed reveal", () => {
		const { calls, plays } = toneSetup(500);
		vi.advanceTimersByTime(DELAY + 499);
		expect(plays()).toHaveLength(0);
		vi.advanceTimersByTime(1);
		expect(plays()).toEqual([
			{ kind: "play", at: DELAY + 500, pitch: last().pitch },
		]);
		expect(calls.filter((c) => c.kind === "stop")).toHaveLength(1);
	});

	test("plays after the sound delay following an early reveal", () => {
		const { flow, plays } = toneSetup(500);
		vi.advanceTimersByTime(1000);
		flow.step();
		expect(plays()).toHaveLength(0);
		vi.advanceTimersByTime(499);
		expect(plays()).toHaveLength(0);
		vi.advanceTimersByTime(1);
		expect(plays()).toEqual([{ kind: "play", at: 1500, pitch: last().pitch }]);
	});

	test("never plays before the reveal", () => {
		const { plays } = toneSetup(0);
		vi.advanceTimersByTime(DELAY - 1);
		expect(plays()).toHaveLength(0);
	});

	test("a sound delay of 0 plays synchronously inside step()", () => {
		const { flow, plays } = toneSetup(0);
		flow.step();
		expect(last().revealed).toBe(true);
		expect(plays()).toHaveLength(1);
	});

	test("the advance step cancels a pending tone", () => {
		const { flow, plays, calls } = toneSetup(500);
		flow.step();
		const before = calls.length;
		vi.advanceTimersByTime(200);
		flow.step();
		expect(last().revealed).toBe(false);
		expect(calls.slice(before)).toEqual([{ kind: "stop", at: 200 }]);
		vi.advanceTimersByTime(299);
		expect(plays()).toHaveLength(0);
	});

	test("a playing tone is stopped by the step that deals the next card", () => {
		const { flow, calls } = toneSetup(0);
		flow.step();
		const before = calls.length;
		flow.step();
		expect(calls.slice(before)[0]).toMatchObject({ kind: "stop" });
		expect(last().revealed).toBe(false);
	});

	test("auto-advance stops the tone at the advance, after the play", () => {
		const { calls } = toneSetup(500);
		vi.advanceTimersByTime(DELAY + ADVANCE);
		const kinds = calls.map((c) => c.kind);
		const play = kinds.indexOf("play");
		const stopAfter = calls.findIndex(
			(c, i) => i > play && c.kind === "stop" && c.at === DELAY + ADVANCE,
		);
		expect(play).toBeGreaterThan(-1);
		expect(stopAfter).toBeGreaterThan(play);
	});

	test("with the sound ending exactly at the advance, the advance still stops it", () => {
		const { calls } = toneSetup(500, 2000);
		vi.advanceTimersByTime(DELAY + 2000);
		expect(calls.at(-1)).toMatchObject({ kind: "stop", at: DELAY + 2000 });
	});

	test("stop() cancels a pending tone and stops the playing one", () => {
		const { flow, plays, calls } = toneSetup(500);
		vi.advanceTimersByTime(DELAY);
		flow.stop();
		vi.advanceTimersByTime(10000);
		expect(plays()).toHaveLength(0);
		expect(calls.at(-1)).toMatchObject({ kind: "stop" });
	});

	test("tone: null never plays and the flow works as before", () => {
		const { flow } = toneSetup(null);
		vi.advanceTimersByTime(DELAY);
		expect(last().revealed).toBe(true);
		flow.step();
		expect(last().revealed).toBe(false);
	});

	test("with auto-advance off the note plays once and the card stays", () => {
		const { plays } = toneSetup(500, null);
		vi.advanceTimersByTime(DELAY + 60000);
		expect(plays()).toHaveLength(1);
		expect(last().revealed).toBe(true);
	});

	test("a throwing play and stop leave reveal and advance working", () => {
		const boom = () => {
			throw new Error("tone failed");
		};
		const { flow } = toneSetup(500, ADVANCE, { play: boom, stop: boom });
		vi.advanceTimersByTime(DELAY);
		expect(last().revealed).toBe(true);
		vi.advanceTimersByTime(ADVANCE);
		expect(last().revealed).toBe(false);
		flow.step();
		expect(last().revealed).toBe(true);
		expect(() => flow.stop()).not.toThrow();
	});
});

describe("createCardFlow listen", () => {
	beforeEach(() => {
		vi.setSystemTime(0);
	});

	const RUNNING: ListenResult = { status: "running" };
	const LOCKED: ListenResult = { status: "locked" };
	const DENIED: ListenResult = { status: "unavailable", reason: "denied" };

	/** A listener whose start results are handed out by the test. */
	class FakeListener {
		starts = 0;
		stops = 0;
		onReading: ((r: PitchReading) => void) | null = null;
		results: ((r: ListenResult) => void)[] = [];
		/** When set, `start` resolves with it at once. */
		auto: ListenResult | null = RUNNING;
		mode: "ok" | "throw" | "reject" = "ok";
		start(onReading: (r: PitchReading) => void): Promise<ListenResult> {
			this.starts++;
			this.onReading = onReading;
			if (this.mode === "throw") throw new Error("start threw");
			if (this.mode === "reject") return Promise.reject(new Error("rejected"));
			if (this.auto) return Promise.resolve(this.auto);
			return new Promise((resolve) => this.results.push(resolve));
		}
		stop() {
			this.stops++;
		}
		/** Sends a reading at the fake clock's time. */
		read(frequency: number | null, clarity = 0.98) {
			this.onReading?.({ time: Date.now(), frequency, clarity, level: -30 });
		}
	}

	function listenSetup(
		over: {
			advanceDelayMs?: number | null;
			tracker?: CardListen["tracker"];
			tone?: CardTone | null;
			grade?: CardListen["grade"];
		} = {},
	) {
		const listener = new FakeListener();
		const tracker = over.tracker ?? createToneTracker(DEFAULT_THRESHOLDS);
		const graded: { pitch: Pitch; hz: number }[] = [];
		const listen: CardListen = {
			listener,
			tracker,
			grade:
				over.grade ??
				((pitch, hz) => {
					graded.push({ pitch, hz });
					return hz === 440 ? "correct" : "incorrect";
				}),
			now: () => Date.now(),
		};
		let i = 0;
		const flow = createCardFlow({
			pool: POOL,
			random: () => (i++ % 3) / 3,
			delayMs: DELAY,
			advanceDelayMs:
				over.advanceDelayMs === undefined ? null : over.advanceDelayMs,
			tone: over.tone ?? null,
			listen,
			onChange: (s) => states.push(s),
		});
		return { flow, listener, graded };
	}

	/** Lets pending promise callbacks run without moving the fake clock. */
	async function settle() {
		for (let k = 0; k < 5; k++) await Promise.resolve();
	}

	/** Plays a steady tone from now for `ms`, one reading per 16 ms. */
	function play(listener: FakeListener, hz: number, ms: number) {
		for (let t = 0; t < ms; t += 16) {
			listener.read(hz);
			vi.advanceTimersByTime(16);
		}
	}

	test("AC1: without listen nothing listens and the state says off", () => {
		setup();
		expect(last().listening).toBe("off");
		expect(last().verdict).toBeNull();
		vi.advanceTimersByTime(DELAY);
		expect(last().verdict).toEqual({ grade: "none" });
	});

	test("AC12: the card shows at once while opening, and its delay waits for the stream", async () => {
		const { flow, listener } = listenSetup();
		listener.auto = null;
		flow.start();
		expect(last()).toMatchObject({ revealed: false, listening: "opening" });
		vi.advanceTimersByTime(DELAY * 2);
		expect(last().revealed).toBe(false);
		listener.results[0]?.(RUNNING);
		await settle();
		expect(last().listening).toBe("running");
		vi.advanceTimersByTime(DELAY - 1);
		expect(last().revealed).toBe(false);
		vi.advanceTimersByTime(1);
		expect(last()).toMatchObject({
			revealed: true,
			verdict: { grade: "none" },
		});
	});

	test("AC12: a step while opening reveals at once with none, and the late result opens no window", async () => {
		const { flow, listener, graded } = listenSetup();
		listener.auto = null;
		flow.start();
		flow.step();
		expect(last()).toMatchObject({
			revealed: true,
			verdict: { grade: "none" },
		});
		listener.results[0]?.(RUNNING);
		await settle();
		expect(last()).toMatchObject({ revealed: true, listening: "running" });
		const count = states.length;
		play(listener, 440, 1500);
		vi.advanceTimersByTime(DELAY * 2);
		expect(states).toHaveLength(count);
		expect(graded).toEqual([]);
	});

	test("AC3: a stable tone reveals at once with the verdict and cancels the reveal timer", async () => {
		const { flow, listener, graded } = listenSetup();
		flow.start();
		await settle();
		const shown = last().pitch;
		play(listener, 440, 900);
		expect(last()).toMatchObject({
			pitch: shown,
			revealed: true,
			verdict: { grade: "correct", frequency: 440 },
		});
		expect(graded).toEqual([{ pitch: shown, hz: 440 }]);
		expect(Date.now()).toBeLessThan(DELAY);
		const count = states.length;
		vi.advanceTimersByTime(DELAY * 2);
		expect(states).toHaveLength(count);
	});

	test("AC3: a wrong note is incorrect, and one verdict per card", async () => {
		const { flow, listener, graded } = listenSetup();
		flow.start();
		await settle();
		play(listener, 494, 900);
		expect(last().verdict).toEqual({ grade: "incorrect", frequency: 494 });
		play(listener, 440, 900);
		expect(graded).toHaveLength(1);
		expect(last().verdict).toEqual({ grade: "incorrect", frequency: 494 });
	});

	test("AC4: the reveal delay ending with no tone gives none", async () => {
		const { flow, listener } = listenSetup();
		flow.start();
		await settle();
		play(listener, 440, 600);
		vi.advanceTimersByTime(DELAY);
		expect(last()).toMatchObject({
			revealed: true,
			verdict: { grade: "none" },
		});
	});

	test("AC5: an early click gives none and closes the window", async () => {
		const { flow, listener, graded } = listenSetup();
		flow.start();
		await settle();
		play(listener, 440, 600);
		flow.step();
		expect(last().verdict).toEqual({ grade: "none" });
		play(listener, 440, 900);
		expect(graded).toEqual([]);
		expect(last().verdict).toEqual({ grade: "none" });
	});

	test("AC6: readings after the reveal are ignored; tone and advance run as before", async () => {
		const calls: string[] = [];
		const { flow, listener, graded } = listenSetup({
			advanceDelayMs: ADVANCE,
			tone: {
				delayMs: 500,
				play: () => calls.push(`play@${Date.now()}`),
				stop: () => calls.push(`stop@${Date.now()}`),
			},
		});
		flow.start();
		await settle();
		while (!last().revealed) {
			listener.read(440);
			vi.advanceTimersByTime(16);
		}
		const revealedAt = Date.now() - 16;
		expect(last().verdict).toMatchObject({ grade: "correct" });
		const shown = last().pitch;
		play(listener, 494, ADVANCE - 16);
		expect(graded).toHaveLength(1);
		expect(calls).toContain(`play@${revealedAt + 500}`);
		vi.advanceTimersByTime(ADVANCE - (Date.now() - revealedAt));
		expect(last()).toMatchObject({ revealed: false, verdict: null });
		expect(last().pitch).not.toBe(shown);
	});

	test("AC2, AC8: the stream starts once; each card resets the tracker and its hold-off", async () => {
		const resets: number[] = [];
		const real = createToneTracker(DEFAULT_THRESHOLDS);
		const { flow, listener } = listenSetup({
			tracker: {
				reset: (ms) => {
					resets.push(ms);
					real.reset(ms);
				},
				push: (r) => real.push(r),
			},
		});
		flow.start();
		await settle();
		play(listener, 440, 900);
		expect(last().verdict).toMatchObject({ grade: "correct" });
		flow.step();
		const dealtAt = Date.now();
		expect(last()).toMatchObject({ verdict: null, listening: "running" });
		// Inside the new card's hold-off, the same tone is not judged.
		play(listener, 440, 480);
		expect(last().revealed).toBe(false);
		play(listener, 440, 400);
		expect(last().verdict).toMatchObject({ grade: "correct" });
		expect(listener.starts).toBe(1);
		expect(resets).toEqual([0, dealtAt]);
	});

	test("AC11: locked shows locked, starts the timer without a window, and retries next deal", async () => {
		const { flow, listener, graded } = listenSetup();
		listener.auto = LOCKED;
		flow.start();
		await settle();
		expect(last().listening).toBe("locked");
		play(listener, 440, 900);
		expect(graded).toEqual([]);
		flow.step();
		expect(last().verdict).toEqual({ grade: "none" });
		listener.auto = RUNNING;
		flow.step();
		await settle();
		expect(listener.starts).toBe(2);
		expect(last().listening).toBe("running");
		play(listener, 440, 900);
		expect(last().verdict).toMatchObject({ grade: "correct" });
	});

	test("AC9: unavailable behaves as judge off for the rest of the flow", async () => {
		const { flow, listener, graded } = listenSetup();
		listener.auto = DENIED;
		flow.start();
		await settle();
		expect(last().listening).toBe("unavailable");
		play(listener, 440, 900);
		expect(graded).toEqual([]);
		vi.advanceTimersByTime(DELAY);
		expect(last()).toMatchObject({
			revealed: true,
			verdict: { grade: "none" },
		});
		flow.step();
		expect(last()).toMatchObject({ revealed: false, listening: "unavailable" });
		expect(listener.starts).toBe(1);
		vi.advanceTimersByTime(DELAY);
		expect(last().revealed).toBe(true);
	});

	test("AC9: unavailable arriving after an early reveal still marks the flow", async () => {
		const { flow, listener } = listenSetup();
		listener.auto = null;
		flow.start();
		flow.step();
		listener.results[0]?.(DENIED);
		await settle();
		expect(last().listening).toBe("unavailable");
		flow.step();
		expect(last().listening).toBe("unavailable");
		expect(listener.starts).toBe(1);
	});

	test.each(["throw", "reject"] as const)(
		"AC10: a start that %ss becomes unavailable",
		async (mode) => {
			const { flow, listener } = listenSetup();
			listener.mode = mode;
			expect(() => flow.start()).not.toThrow();
			await settle();
			expect(last().listening).toBe("unavailable");
			vi.advanceTimersByTime(DELAY);
			expect(last().revealed).toBe(true);
		},
	);

	test("AC10: a throwing tracker or grade never escapes and the timer reveals", async () => {
		for (const broken of ["push", "reset", "grade"] as const) {
			states = [];
			const tracker = createToneTracker(DEFAULT_THRESHOLDS);
			const { flow, listener } = listenSetup({
				tracker: {
					reset: (ms) => {
						if (broken === "reset") throw new Error("reset");
						tracker.reset(ms);
					},
					push: (r) => {
						if (broken === "push") throw new Error("push");
						return tracker.push(r);
					},
				},
				grade: () => {
					throw new Error("grade");
				},
			});
			flow.start();
			await settle();
			expect(() => play(listener, 440, 900)).not.toThrow();
			expect(last().revealed).toBe(false);
			vi.advanceTimersByTime(DELAY);
			expect(last()).toMatchObject({
				revealed: true,
				verdict: { grade: "none" },
			});
			flow.stop();
		}
	});

	test("AC7: stop stops the listener; a throwing stop never escapes", async () => {
		const { flow, listener } = listenSetup();
		flow.start();
		await settle();
		flow.stop();
		expect(listener.stops).toBe(1);
		const count = states.length;
		play(listener, 440, 900);
		vi.runAllTimers();
		expect(states).toHaveLength(count);

		const other = listenSetup();
		other.listener.stop = () => {
			throw new Error("stop");
		};
		other.flow.start();
		expect(() => other.flow.stop()).not.toThrow();
	});

	test("AC7: a result arriving after stop does nothing", async () => {
		const { flow, listener } = listenSetup();
		listener.auto = null;
		flow.start();
		flow.stop();
		const count = states.length;
		listener.results[0]?.(RUNNING);
		await settle();
		vi.runAllTimers();
		expect(states).toHaveLength(count);
	});

	test("a result for a card already replaced does not touch the new card", async () => {
		const { flow, listener } = listenSetup();
		listener.auto = null;
		flow.start();
		flow.step();
		flow.step();
		expect(listener.starts).toBe(2);
		const current = last();
		listener.results[0]?.(LOCKED);
		await settle();
		expect(last()).toBe(current);
		listener.results[1]?.(RUNNING);
		await settle();
		expect(last().listening).toBe("running");
	});
});
