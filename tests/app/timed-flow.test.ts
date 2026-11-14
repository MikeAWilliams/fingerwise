import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { CardListen } from "../../src/app/card-flow";
import {
	createTimedFlow,
	LEAD_SECONDS,
	METRONOME_LOOKAHEAD_SECONDS,
	MIN_GRADED_SLOT_MS,
	TIMED_HOLD_OFF_MS,
	type TimedFlow,
	type TimedState,
} from "../../src/app/timed-flow";
import type { ListenResult, PitchReading } from "../../src/audio/listener";
import { createToneTracker, DEFAULT_THRESHOLDS } from "../../src/core/judge";
import type { Pitch } from "../../src/core/pitch";
import {
	createSong,
	DEFAULT_METER,
	DEFAULT_TEMPO,
	type Meter,
} from "../../src/core/song";

let states: TimedState[];
let clicks: number[];
let clickerStops: number;
/** Seconds on the fake page clock, which the fake timers drive. */
const now = () => Date.now() / 1000;

const clicker = {
	click: (at: number) => clicks.push(at),
	stop: () => {
		clickerStops++;
	},
};

/** `lengths[i]` beats for note i, each starting where the last one ends plus `gaps[i]`. */
function songOf(
	lengths: number[],
	{
		tempo = 120 as number | null,
		meter = DEFAULT_METER,
		gaps = [] as number[],
	}: { tempo?: number | null; meter?: Meter; gaps?: number[] } = {},
) {
	let start = 0;
	const notes = lengths.map((beats, i) => {
		const note = { pitch: (60 + (i % 12)) as Pitch, start, beats };
		start += beats + (gaps[i] ?? 0);
		return note;
	});
	return createSong(notes, { tempo, meter });
}

function setup(
	song = songOf([1, 1, 1]),
	{ clock = { now }, silent = false, metronome = false } = {},
): TimedFlow {
	const flow = createTimedFlow({
		song,
		clock,
		clicker: silent ? null : clicker,
		metronome,
		onChange: (s) => states.push(s),
	});
	flow.start();
	return flow;
}

const last = () => states[states.length - 1] as TimedState;
const phases = () => states.map((s) => s.phase);

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(0);
	states = [];
	clicks = [];
	clickerStops = 0;
});

afterEach(() => {
	vi.useRealTimers();
});

describe("ready (AC3)", () => {
	test("start shows the first note and nothing happens until a tap", () => {
		setup();
		expect(states).toHaveLength(1);
		expect(last()).toEqual({
			pitch: 60,
			beats: 1,
			phase: "ready",
			verdict: null,
			listening: "off",
			summary: null,
		});
		vi.advanceTimersByTime(60000);
		expect(states).toHaveLength(1);
		expect(clicks).toEqual([]);
	});
});

describe("count-in (AC4)", () => {
	test("4/4 at 120: four clicks 0.5 s apart after the lead, the first slot after the bar", () => {
		const flow = setup();
		flow.step();
		expect(last().phase).toBe("count-in");
		expect(last().pitch).toBe(60);
		expect(clicks).toEqual([
			LEAD_SECONDS,
			LEAD_SECONDS + 0.5,
			LEAD_SECONDS + 1,
			LEAD_SECONDS + 1.5,
		]);
		vi.advanceTimersByTime((LEAD_SECONDS + 2) * 1000 - 1);
		expect(last().phase).toBe("count-in");
		vi.advanceTimersByTime(1);
		expect(last()).toMatchObject({ phase: "playing", pitch: 60 });
	});

	test("3/4 gives three clicks", () => {
		const flow = setup(songOf([1, 1], { meter: { beats: 3, unit: 4 } }));
		flow.step();
		expect(clicks).toHaveLength(3);
		vi.advanceTimersByTime((LEAD_SECONDS + 1.5) * 1000);
		expect(last().phase).toBe("playing");
	});

	test("6/8 gives two dotted-quarter clicks, 0.75 s apart at 120", () => {
		const flow = setup(songOf([1, 1], { meter: { beats: 6, unit: 8 } }));
		flow.step();
		expect(clicks).toEqual([LEAD_SECONDS, LEAD_SECONDS + 0.75]);
		vi.advanceTimersByTime((LEAD_SECONDS + 1.5) * 1000 - 1);
		expect(last().phase).toBe("count-in");
		vi.advanceTimersByTime(1);
		expect(last().phase).toBe("playing");
	});

	test("no tempo counts in at the default", () => {
		const flow = setup(songOf([1], { tempo: null }));
		flow.step();
		expect(clicks[1]).toBeCloseTo(LEAD_SECONDS + 60 / DEFAULT_TEMPO);
	});
});

describe("slots (AC5)", () => {
	test("each note shows from its slot start and is replaced at its end", () => {
		const flow = setup(songOf([1, 2, 1]));
		flow.step();
		const first = (LEAD_SECONDS + 2) * 1000;
		vi.advanceTimersByTime(first);
		expect(last()).toMatchObject({ phase: "playing", pitch: 60 });
		vi.advanceTimersByTime(499);
		expect(last().pitch).toBe(60);
		vi.advanceTimersByTime(1);
		expect(last().pitch).toBe(61);
		vi.advanceTimersByTime(999);
		expect(last().pitch).toBe(61);
		vi.advanceTimersByTime(1);
		expect(last().pitch).toBe(62);
		vi.advanceTimersByTime(499);
		expect(last().phase).toBe("playing");
		vi.advanceTimersByTime(1);
		expect(last().phase).toBe("summary");
	});

	test("a rest's time goes to the note before it", () => {
		const flow = setup(songOf([1, 1], { gaps: [2] }));
		flow.step();
		vi.advanceTimersByTime((LEAD_SECONDS + 2) * 1000);
		expect(last().pitch).toBe(60);
		vi.advanceTimersByTime(1499);
		expect(last().pitch).toBe(60);
		vi.advanceTimersByTime(1);
		expect(last().pitch).toBe(61);
	});

	test("no clicks play while the song runs", () => {
		const flow = setup();
		flow.step();
		vi.advanceTimersByTime(20000);
		expect(clicks).toHaveLength(4);
	});
});

describe("taps (AC6)", () => {
	test("steps in the count-in and in a slot do nothing", () => {
		const flow = setup();
		flow.step();
		const count = states.length;
		flow.step();
		vi.advanceTimersByTime(1000);
		flow.step();
		expect(states).toHaveLength(count);
		expect(clicks).toHaveLength(4);
		vi.advanceTimersByTime(1100);
		expect(last().phase).toBe("playing");
		const during = states.length;
		flow.step();
		expect(states).toHaveLength(during);
		expect(last().pitch).toBe(60);
	});
});

describe("the end (AC7)", () => {
	test("the summary stays, and a tap counts in again from the first note", () => {
		const flow = setup();
		flow.step();
		vi.advanceTimersByTime((LEAD_SECONDS + 2 + 1.5) * 1000);
		expect(last()).toEqual({
			pitch: 62,
			beats: 1,
			phase: "summary",
			verdict: null,
			listening: "off",
			summary: { correct: 0, graded: 0 },
		});
		const count = states.length;
		vi.advanceTimersByTime(60000);
		expect(states).toHaveLength(count);

		clicks = [];
		flow.step();
		expect(last()).toMatchObject({ phase: "count-in", pitch: 60 });
		expect(clicks).toHaveLength(4);
		expect(clicks[0]).toBeCloseTo(now() + LEAD_SECONDS);
		vi.advanceTimersByTime((LEAD_SECONDS + 2) * 1000);
		expect(last()).toMatchObject({ phase: "playing", pitch: 60 });
		vi.advanceTimersByTime(1500);
		expect(last().phase).toBe("summary");
	});
});

describe("stop (AC8)", () => {
	test("cancels the timer and the clicks", () => {
		const flow = setup();
		flow.step();
		const count = states.length;
		const stops = clickerStops;
		flow.stop();
		expect(clickerStops).toBe(stops + 1);
		vi.advanceTimersByTime(60000);
		expect(states).toHaveLength(count);
		expect(vi.getTimerCount()).toBe(0);
	});

	test("a step after stop does nothing", () => {
		const flow = setup();
		flow.stop();
		flow.step();
		expect(phases()).toEqual(["ready"]);
		expect(clicks).toEqual([]);
	});
});

describe("the clock leads, the timers only wake the flow (AC10)", () => {
	test("a clock that lags the timers never shows a card early", () => {
		let clockNow = 0;
		const flow = setup(songOf([1, 1]), { clock: { now: () => clockNow } });
		flow.step();
		// The timers run far ahead while the clock is frozen: nothing shows.
		vi.advanceTimersByTime(10000);
		expect(last().phase).toBe("count-in");
		clockNow = LEAD_SECONDS + 2 - 0.001;
		vi.advanceTimersByTime(10000);
		expect(last().phase).toBe("count-in");
		clockNow = LEAD_SECONDS + 2;
		vi.advanceTimersByTime(10000);
		expect(last()).toMatchObject({ phase: "playing", pitch: 60 });
		clockNow = LEAD_SECONDS + 2.5;
		vi.advanceTimersByTime(10000);
		expect(last().pitch).toBe(61);
		clockNow = LEAD_SECONDS + 3;
		vi.advanceTimersByTime(10000);
		expect(last().phase).toBe("summary");
	});

	test("the clicks and the first slot use the clock's time at the tap", () => {
		let clockNow = 40;
		const flow = setup(songOf([1]), { clock: { now: () => clockNow } });
		flow.step();
		expect(clicks[0]).toBeCloseTo(40 + LEAD_SECONDS);
		clockNow = 40 + LEAD_SECONDS + 2;
		vi.advanceTimersByTime(3000);
		expect(last().phase).toBe("playing");
	});

	test("500 notes end exactly at the summed slot time", () => {
		// 1/3-beat notes at 97 bpm give slots that are not whole milliseconds.
		const beats = Array.from({ length: 500 }, () => 1 / 3);
		const song = songOf(beats, { tempo: 97 });
		const flow = setup(song);
		const seen: number[] = [];
		flow.stop();
		const timed = createTimedFlow({
			song,
			clock: { now },
			clicker,
			onChange: (s) => {
				states.push(s);
				if (s.phase === "summary") seen.push(Date.now());
			},
		});
		timed.start();
		timed.step();
		vi.advanceTimersByTime(10 * 60 * 1000);
		const firstSlotMs = (LEAD_SECONDS + (4 * 60) / 97) * 1000;
		const totalMs = (500 * (1 / 3) * 60000) / 97;
		expect(seen).toHaveLength(1);
		expect(seen[0]).toBeGreaterThanOrEqual(firstSlotMs + totalMs);
		expect(seen[0]).toBeLessThan(firstSlotMs + totalMs + 1);
	});
});

describe("no audio (AC4, AC5)", () => {
	test("with no clicker the song still runs in time", () => {
		const flow = setup(songOf([1, 1]), { silent: true });
		flow.step();
		vi.advanceTimersByTime((LEAD_SECONDS + 2 + 1) * 1000);
		expect(last().phase).toBe("summary");
		flow.stop();
		expect(clicks).toEqual([]);
	});
});

describe("grading within the slot (F08-S03)", () => {
	const RUNNING: ListenResult = { status: "running" };
	const LOCKED: ListenResult = { status: "locked" };
	const DENIED: ListenResult = { status: "unavailable", reason: "denied" };
	const RIGHT = 440;
	const WRONG = 330;
	const FIRST_SLOT_MS = (LEAD_SECONDS + 2) * 1000;

	class FakeListener {
		starts = 0;
		stops = 0;
		onReading: ((r: PitchReading) => void) | null = null;
		results: ((r: ListenResult) => void)[] = [];
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
		read(frequency: number | null) {
			this.onReading?.({
				time: Date.now(),
				frequency,
				clarity: 0.98,
				level: -30,
			});
		}
	}

	async function settle() {
		for (let k = 0; k < 5; k++) await Promise.resolve();
	}

	/** Steady readings every 16 ms for `ms`. */
	function play(listener: FakeListener, hz: number, ms: number) {
		for (let t = 0; t < ms; t += 16) {
			listener.read(hz);
			vi.advanceTimersByTime(16);
		}
	}

	function listenSetup(
		song = songOf([1, 1, 1]),
		over: Partial<FakeListener> = {},
	) {
		const listener = Object.assign(new FakeListener(), over);
		const graded: { pitch: Pitch; hz: number }[] = [];
		const listen: CardListen = {
			listener,
			tracker: createToneTracker({
				...DEFAULT_THRESHOLDS,
				holdOffMs: TIMED_HOLD_OFF_MS,
			}),
			grade: (pitch, hz) => {
				graded.push({ pitch, hz });
				return hz === RIGHT ? "correct" : "incorrect";
			},
			now: () => Date.now(),
		};
		const flow = createTimedFlow({
			song,
			clock: { now },
			clicker,
			listen,
			onChange: (s) => states.push(s),
		});
		flow.start();
		return { flow, listener, listen, graded };
	}

	/** Runs to the first slot's start. */
	function toFirstSlot() {
		vi.advanceTimersByTime(FIRST_SLOT_MS);
	}

	test("the constants start at 0 ms and 300 ms (AC8)", () => {
		expect(TIMED_HOLD_OFF_MS).toBe(0);
		expect(MIN_GRADED_SLOT_MS).toBe(300);
	});

	describe("the stream (AC1, AC9)", () => {
		test("the count-in waits for the start result, which opens the stream on the tap", async () => {
			const { flow, listener } = listenSetup(songOf([1, 1]), { auto: null });
			expect(last().listening).toBe("locked");
			flow.step();
			expect(listener.starts).toBe(1);
			expect(last()).toMatchObject({ phase: "ready", listening: "opening" });
			expect(clicks).toEqual([]);
			flow.step();
			expect(listener.starts).toBe(1);
			vi.advanceTimersByTime(5000);
			expect(clicks).toEqual([]);
			listener.results[0]?.(RUNNING);
			await settle();
			expect(last()).toMatchObject({ phase: "count-in", listening: "running" });
			expect(clicks).toHaveLength(4);
			expect(clicks[0]).toBeCloseTo(now() + LEAD_SECONDS);
		});

		test.each([
			["locked", LOCKED, "locked"],
			["unavailable", DENIED, "unavailable"],
		])(
			"a %s result still starts the count-in",
			async (_name, result, listening) => {
				const { flow } = listenSetup(songOf([1]), { auto: result });
				flow.step();
				await settle();
				expect(last()).toMatchObject({ phase: "count-in", listening });
			},
		);

		test.each(["throw", "reject"] as const)(
			"a start that does a %s counts as unavailable",
			async (mode) => {
				const { flow } = listenSetup(songOf([1]), { mode });
				flow.step();
				await settle();
				expect(last()).toMatchObject({
					phase: "count-in",
					listening: "unavailable",
				});
			},
		);

		test("one stream serves the whole song and its restarts", async () => {
			const { flow, listener } = listenSetup(songOf([1]));
			flow.step();
			await settle();
			vi.advanceTimersByTime(FIRST_SLOT_MS + 500);
			expect(last().phase).toBe("summary");
			flow.step();
			expect(last().phase).toBe("count-in");
			expect(listener.starts).toBe(1);
			expect(listener.stops).toBe(0);
		});

		test("a locked stream is asked again on a restart", async () => {
			const { flow, listener } = listenSetup(songOf([1]), { auto: LOCKED });
			flow.step();
			await settle();
			vi.advanceTimersByTime(FIRST_SLOT_MS + 500);
			flow.step();
			expect(listener.starts).toBe(2);
		});

		test("a result after stop is ignored", async () => {
			const { flow, listener } = listenSetup(songOf([1]), { auto: null });
			flow.step();
			flow.stop();
			listener.results[0]?.(RUNNING);
			await settle();
			expect(clicks).toEqual([]);
			expect(last().listening).toBe("opening");
		});

		test("stop releases the microphone, and a throwing stop is swallowed", async () => {
			const { flow, listener } = listenSetup(songOf([1]));
			flow.step();
			await settle();
			flow.stop();
			expect(listener.stops).toBe(1);
			const bad = listenSetup(songOf([1]));
			bad.listener.stop = () => {
				throw new Error("stop threw");
			};
			expect(() => bad.flow.stop()).not.toThrow();
		});
	});

	describe("a slot (AC2 to AC5)", () => {
		async function playing(
			song = songOf([1, 1, 1]),
			over: Partial<FakeListener> = {},
		) {
			const setup = listenSetup(song, over);
			setup.flow.step();
			await settle();
			toFirstSlot();
			return setup;
		}

		test("a correct tone shows its verdict at once and the card stays until the slot ends", async () => {
			const { listener, graded } = await playing();
			play(listener, RIGHT, 300);
			expect(last()).toMatchObject({
				phase: "playing",
				pitch: 60,
				verdict: { grade: "correct", frequency: RIGHT },
			});
			expect(graded[0]).toEqual({ pitch: 60, hz: RIGHT });
			vi.advanceTimersByTime(150);
			expect(last().pitch).toBe(60);
			vi.advanceTimersByTime(60);
			expect(last()).toMatchObject({ pitch: 61, verdict: null });
		});

		test("an incorrect tone shows incorrect and keeps listening; a correct one replaces it", async () => {
			const { listener } = await playing(songOf([4, 1]));
			play(listener, WRONG, 300);
			expect(last().verdict).toMatchObject({ grade: "incorrect" });
			expect(last().pitch).toBe(60);
			play(listener, RIGHT, 300);
			expect(last().verdict).toMatchObject({ grade: "correct" });
			vi.advanceTimersByTime(2000);
			expect(last().summary).toEqual({ correct: 1, graded: 2 });
		});

		test("later readings after a correct tone change nothing", async () => {
			const { listener } = await playing(songOf([4, 1]));
			play(listener, RIGHT, 300);
			play(listener, WRONG, 600);
			expect(last().verdict).toMatchObject({ grade: "correct" });
		});

		test("a slot with nothing heard is a miss that shows nothing", async () => {
			await playing(songOf([1, 1]));
			vi.advanceTimersByTime(500);
			expect(last().verdict).toBeNull();
			vi.advanceTimersByTime(500);
			expect(last().summary).toEqual({ correct: 0, graded: 2 });
		});

		test("the verdict clears at the slot's end", async () => {
			const { listener } = await playing();
			play(listener, WRONG, 300);
			expect(last().verdict).not.toBeNull();
			vi.advanceTimersByTime(300);
			expect(last().pitch).toBe(61);
			expect(last().verdict).toBeNull();
		});

		test("a tone spanning a boundary counts only for the slot it settles in", async () => {
			const { listener } = await playing(songOf([1, 1, 1]));
			// Starts 100 ms before the first slot ends, so it settles in the second.
			vi.advanceTimersByTime(400);
			play(listener, RIGHT, 500);
			expect(last().pitch).toBe(61);
			expect(last().verdict).toMatchObject({ grade: "correct" });
			vi.advanceTimersByTime(600);
			expect(last().summary).toEqual({ correct: 1, graded: 3 });
		});

		test("readings after the last slot's end do not count", async () => {
			const { listener } = await playing(songOf([1]));
			vi.advanceTimersByTime(500);
			expect(last().phase).toBe("summary");
			const count = states.length;
			play(listener, RIGHT, 500);
			expect(states).toHaveLength(count);
		});
	});

	describe("slots that are not listened to (AC6)", () => {
		test("a slot under the minimum shows no verdict and is not counted", async () => {
			// 1/4-beat notes at 120 are 125 ms.
			const { flow, listener } = listenSetup(songOf([0.25, 1]));
			flow.step();
			await settle();
			toFirstSlot();
			play(listener, RIGHT, 100);
			expect(last().verdict).toBeNull();
			vi.advanceTimersByTime(50);
			expect(last().pitch).toBe(61);
			vi.advanceTimersByTime(500);
			expect(last().summary).toEqual({ correct: 0, graded: 1 });
		});

		test("a slot exactly the minimum is listened to", async () => {
			const song = songOf([0.3 * 2], { tempo: 120 }); // 300 ms
			expect(MIN_GRADED_SLOT_MS).toBe(300);
			const { flow, listener } = listenSetup(song);
			flow.step();
			await settle();
			toFirstSlot();
			play(listener, RIGHT, 250);
			expect(last().verdict).toMatchObject({ grade: "correct" });
		});

		test("with a locked or unavailable stream every slot is shown in time and none counted", async () => {
			for (const auto of [LOCKED, DENIED]) {
				states = [];
				const { flow, listener } = listenSetup(songOf([1, 1]), { auto });
				flow.step();
				await settle();
				toFirstSlot();
				play(listener, RIGHT, 400);
				expect(last().verdict).toBeNull();
				vi.advanceTimersByTime(700);
				expect(last().phase).toBe("summary");
				expect(last().summary).toEqual({ correct: 0, graded: 0 });
				flow.stop();
			}
		});

		test("a tracker that throws leaves the slot ungraded and the song running", async () => {
			const { flow, listener, listen } = listenSetup(songOf([1, 1]));
			listen.tracker.push = () => {
				throw new Error("tracker threw");
			};
			flow.step();
			await settle();
			toFirstSlot();
			play(listener, RIGHT, 300);
			expect(last().verdict).toBeNull();
			vi.advanceTimersByTime(1000);
			expect(last().summary).toEqual({ correct: 0, graded: 1 });
		});

		test("a grade that throws leaves the slot ungraded", async () => {
			const { flow, listener, listen } = listenSetup(songOf([1]));
			listen.grade = () => {
				throw new Error("grade threw");
			};
			flow.step();
			await settle();
			toFirstSlot();
			play(listener, RIGHT, 300);
			vi.advanceTimersByTime(500);
			expect(last().summary).toEqual({ correct: 0, graded: 0 });
		});
	});

	describe("the summary (AC7)", () => {
		test("counts correct over graded notes and a restart resets them", async () => {
			const { flow, listener } = listenSetup(songOf([1, 1, 1]));
			flow.step();
			await settle();
			toFirstSlot();
			play(listener, RIGHT, 500); // first slot, ends 500 ms in
			play(listener, WRONG, 500); // second slot
			vi.advanceTimersByTime(500); // third: nothing
			expect(last()).toMatchObject({
				phase: "summary",
				summary: { correct: 1, graded: 3 },
			});
			flow.step();
			expect(last().phase).toBe("count-in");
			expect(last().summary).toBeNull();
			await settle();
			vi.advanceTimersByTime(FIRST_SLOT_MS + 1500);
			expect(last().summary).toEqual({ correct: 0, graded: 3 });
		});
	});
});

describe("metronome (F08-S04)", () => {
	const near = (actual: number[], expected: number[]) => {
		expect(actual).toHaveLength(expected.length);
		for (const [i, e] of expected.entries())
			expect(actual[i]).toBeCloseTo(e, 9);
	};

	test("4/4 clicks every beat from the first slot, continuing the count-in's grid (AC3)", () => {
		const flow = setup(songOf([1, 1, 1]), { metronome: true });
		flow.step();
		const first = LEAD_SECONDS + 2;
		// Count-in beats, then the song's beats; the first slot's click is one beat after
		// the count-in's last, with no gap and no double. The end (3.6) gets none.
		near(clicks, [
			LEAD_SECONDS,
			LEAD_SECONDS + 0.5,
			LEAD_SECONDS + 1,
			LEAD_SECONDS + 1.5,
			first,
			first + 0.5,
			first + 1,
		]);
		vi.advanceTimersByTime(20000);
		expect(clicks).toHaveLength(7);
	});

	test("6/8 clicks every dotted quarter, none at or after the last slot's end", () => {
		const flow = setup(songOf([1, 1, 1, 1], { meter: { beats: 6, unit: 8 } }), {
			metronome: true,
		});
		flow.step();
		const first = LEAD_SECONDS + 1.5;
		near(clicks, [
			LEAD_SECONDS,
			LEAD_SECONDS + 0.75,
			first,
			first + 0.75,
			first + 1.5,
		]);
	});

	test("a song ending on a beat gets no click at its end", () => {
		const flow = setup(songOf([2]), { metronome: true });
		flow.step();
		const first = LEAD_SECONDS + 2;
		near(clicks.slice(4), [first, first + 0.5]);
	});

	test("with it off only the count-in clicks (AC4)", () => {
		const flow = setup(songOf([1, 1, 1]));
		flow.step();
		vi.advanceTimersByTime(20000);
		expect(clicks).toHaveLength(4);
	});

	test("clicks are scheduled a batch at a time, not all at the start", () => {
		const flow = setup(songOf(Array(40).fill(1)), { metronome: true });
		flow.step();
		const early = clicks.length;
		expect(early).toBeLessThan(4 + 80);
		expect(early).toBeGreaterThan(4);
		const first = LEAD_SECONDS + 2;
		expect(Math.max(...clicks)).toBeLessThanOrEqual(
			first + 0.5 + METRONOME_LOOKAHEAD_SECONDS,
		);
		vi.advanceTimersByTime(60000);
		// 40 beats of song at 2 per beat's second: beats at 0.5 s from the first slot to 20 s.
		expect(clicks).toHaveLength(4 + 40);
		for (let i = 4; i < clicks.length; i++) {
			expect(clicks[i]).toBeCloseTo(first + (i - 4) * 0.5, 9);
		}
	});

	test("nothing is scheduled once the summary shows", () => {
		const flow = setup(songOf([1, 1]), { metronome: true });
		flow.step();
		vi.advanceTimersByTime(10000);
		expect(last().phase).toBe("summary");
		const count = clicks.length;
		vi.advanceTimersByTime(60000);
		expect(clicks).toHaveLength(count);
	});

	test("a stop stops the clicks and schedules no more (AC5)", () => {
		const flow = setup(songOf(Array(40).fill(1)), { metronome: true });
		flow.step();
		const stops = clickerStops;
		vi.advanceTimersByTime(5000);
		flow.stop();
		expect(clickerStops).toBe(stops + 1);
		const count = clicks.length;
		vi.advanceTimersByTime(60000);
		expect(clicks).toHaveLength(count);
	});

	test("a restart stops the old clicks and starts a clean grid (AC5)", () => {
		const flow = setup(songOf([1, 1]), { metronome: true });
		flow.step();
		vi.advanceTimersByTime(10000);
		expect(last().phase).toBe("summary");
		clicks = [];
		const stops = clickerStops;
		flow.step();
		expect(clickerStops).toBe(stops + 1);
		const first = now() + LEAD_SECONDS + 2;
		near(clicks.slice(4), [first, first + 0.5]);
		expect(clicks).toHaveLength(6);
	});

	test("with no clicker it still runs", () => {
		const flow = setup(songOf([1]), { metronome: true, silent: true });
		flow.step();
		vi.advanceTimersByTime(5000);
		expect(last().phase).toBe("summary");
	});
});
