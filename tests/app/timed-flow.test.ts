import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { END_OF_SONG, summaryText } from "../../src/app/judge-text";
import {
	createTimedFlow,
	FALLBACK_LAG_MS,
	INPUT_ALLOWANCE_MS,
	LEAD_SECONDS,
	METRONOME_LOOKAHEAD_SECONDS,
	scoringLagMs,
	type TimedFlow,
	type TimedListen,
	type TimedState,
} from "../../src/app/timed-flow";
import type { ListenResult, PitchReading } from "../../src/audio/listener";
import type { CoverageOptions, CoverageResult } from "../../src/core/coverage";
import { DEFAULT_THRESHOLDS } from "../../src/core/judge";
import { type Pitch, toFrequency } from "../../src/core/pitch";
import {
	createSong,
	DEFAULT_METER,
	DEFAULT_TEMPO,
	type Meter,
	type Song,
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
			index: 0,
			pitch: 60,
			beats: 1,
			phase: "ready",
			countBeat: null,
			listening: "off",
			origin: null,
			summary: null,
		});
		vi.advanceTimersByTime(60000);
		expect(states).toHaveLength(1);
		expect(clicks).toEqual([]);
	});
});

describe("the origin (F09-S05 AC3)", () => {
	test("is null while ready and the first slot's start from the count-in on, and a restart sets a new one", () => {
		const flow = setup(songOf([1]));
		expect(last().origin).toBeNull();
		flow.step();
		expect(last().origin).toBeCloseTo(LEAD_SECONDS + 2, 9);
		vi.advanceTimersByTime((LEAD_SECONDS + 2) * 1000 + 500);
		expect(last()).toMatchObject({ phase: "summary" });
		expect(last().origin).toBeCloseTo(LEAD_SECONDS + 2, 9);
		const before = now();
		flow.step();
		expect(last().origin).toBeCloseTo(before + LEAD_SECONDS + 2, 9);
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

	test("each count-in beat shows on its click", () => {
		const flow = setup();
		flow.step();
		expect(last()).toMatchObject({ phase: "count-in", countBeat: null });
		const beats = () =>
			states.filter((s) => s.phase === "count-in").map((s) => s.countBeat);
		vi.advanceTimersByTime(LEAD_SECONDS * 1000);
		expect(beats()).toEqual([null, 0]);
		vi.advanceTimersByTime(499);
		expect(last().countBeat).toBe(0);
		vi.advanceTimersByTime(1);
		expect(last().countBeat).toBe(1);
		vi.advanceTimersByTime(1000);
		expect(beats()).toEqual([null, 0, 1, 2, 3]);
		vi.advanceTimersByTime(500);
		expect(last()).toMatchObject({ phase: "playing", countBeat: null });
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
		expect(states).toHaveLength(count);
		vi.advanceTimersByTime(1000);
		const ticked = states.length;
		flow.step();
		expect(states).toHaveLength(ticked);
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
			index: 2,
			pitch: 62,
			beats: 1,
			phase: "summary",
			countBeat: null,
			listening: "off",
			origin: LEAD_SECONDS + 2,
			summary: null,
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

describe("scoring by coverage (F09-S03)", () => {
	const RUNNING: ListenResult = { status: "running" };
	const LOCKED: ListenResult = { status: "locked" };
	const DENIED: ListenResult = { status: "unavailable", reason: "denied" };
	/** The tap is at 0 ms, so the first slot starts after the lead and the 4/4 count-in at 120. */
	const FIRST_SLOT_S = LEAD_SECONDS + 2;
	const FIRST_SLOT_MS = FIRST_SLOT_S * 1000;
	const hz = (pitch: number) => toFrequency(pitch as Pitch);
	/** Where song time stands on the fake clock, in ms. */
	const songMs = () => (now() - FIRST_SLOT_S) * 1000;

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
		read(reading: Partial<PitchReading> & Pick<PitchReading, "frequency">) {
			this.onReading?.({
				time: Date.now(),
				audioTime: now(),
				clarity: 0.98,
				level: -30,
				envelope: [],
				...reading,
			});
		}
	}

	async function settle() {
		for (let k = 0; k < 5; k++) await Promise.resolve();
	}

	const coverage: CoverageOptions = {
		toleranceCents: 25,
		checks: DEFAULT_THRESHOLDS,
		sounding: (p) => p,
	};

	function listenSetup(
		song = songOf([1, 1, 1]),
		over: Partial<FakeListener> = {},
		outputLatency: number | null = 0.045,
	) {
		const listener = Object.assign(new FakeListener(), over);
		const listen: TimedListen = { listener, coverage };
		const flow = createTimedFlow({
			song,
			clock: { now },
			clicker,
			listen,
			outputLatency: () => outputLatency,
			onChange: (s) => states.push(s),
		});
		flow.start();
		return { flow, listener, listen };
	}

	/** The song's notes sounding in their own slots, a `gap` ms short of the end so joins are tongued. */
	function played(song: Song, gap = 30) {
		return (ms: number): number | null => {
			for (const n of song.notes) {
				const start = n.start * 500;
				if (ms >= start && ms < start + n.beats * 500 - gap) return hz(n.pitch);
			}
			return null;
		};
	}

	/**
	 * Reads a frame every 16 ms until `untilMs` on the fake clock. What the
	 * microphone hears at an audio time is what was played `latencyMs` earlier.
	 */
	function hear(
		listener: FakeListener,
		sound: (songMs: number) => number | null,
		latencyMs: number,
		untilMs: number,
		level: (songMs: number) => number = () => -30,
	) {
		while (Date.now() < untilMs) {
			const heard = songMs() - latencyMs;
			listener.read({ frequency: sound(heard), level: level(heard) });
			vi.advanceTimersByTime(Math.min(16, untilMs - Date.now()));
		}
	}

	/** Taps, lets the stream open, then plays until `untilMs`. */
	async function run(
		flow: TimedFlow,
		listener: FakeListener,
		sound: (songMs: number) => number | null,
		latencyMs: number,
		untilMs: number,
		level?: (songMs: number) => number,
	) {
		flow.step();
		await settle();
		hear(listener, sound, latencyMs, untilMs, level);
	}

	test("the scoring lag is the input allowance plus the output latency, or the fallback (AC3)", () => {
		expect(INPUT_ALLOWANCE_MS).toBe(55);
		expect(FALLBACK_LAG_MS).toBe(100);
		expect(scoringLagMs(0.042)).toBeCloseTo(97, 9);
		expect(scoringLagMs(0)).toBe(55);
		expect(scoringLagMs(0.25)).toBeCloseTo(305, 9);
		expect(scoringLagMs(null)).toBe(100);
	});

	describe("the stream (AC8)", () => {
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
			"a %s result still starts the count-in and plays the song in time, unscored",
			async (_name, result, listening) => {
				const { flow, listener } = listenSetup(songOf([1, 1]), {
					auto: result,
				});
				flow.step();
				await settle();
				expect(last()).toMatchObject({ phase: "count-in", listening });
				hear(listener, played(songOf([1, 1])), 100, FIRST_SLOT_MS + 999);
				expect(last().phase).toBe("playing");
				vi.advanceTimersByTime(1000);
				// No lag is waited for when nothing is scored.
				expect(last()).toMatchObject({ phase: "summary", summary: null });
				flow.stop();
			},
		);

		test.each(["throw", "reject"] as const)(
			"a start that does a %s counts as unavailable and plays unscored",
			async (mode) => {
				const { flow } = listenSetup(songOf([1]), { mode });
				flow.step();
				await settle();
				expect(last()).toMatchObject({
					phase: "count-in",
					listening: "unavailable",
				});
				vi.advanceTimersByTime(FIRST_SLOT_MS + 500);
				expect(last()).toMatchObject({ phase: "summary", summary: null });
			},
		);

		test("one stream serves the whole song and its restarts", async () => {
			const { flow, listener } = listenSetup(songOf([1]));
			flow.step();
			await settle();
			vi.advanceTimersByTime(FIRST_SLOT_MS + 500 + 100);
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

	describe("coverage with the lag (AC3, AC4)", () => {
		test("a note played on time is fully covered once the lag is applied", async () => {
			const song = songOf([1, 1, 1]);
			const { flow, listener } = listenSetup(song, {}, 0.045);
			// Heard 100 ms late: 45 ms of output and 55 ms of input.
			await run(flow, listener, played(song), 100, FIRST_SLOT_MS + 1500 + 150);
			expect(last().phase).toBe("summary");
			const summary = last().summary;
			expect(summary?.coverage).toBeGreaterThan(0.95);
			expect(summary?.graded).toBe(3);
			expect(summary?.separation).toEqual({ notSeparated: 0, plainJoins: 2 });
			expect(summary?.timingFaults).toEqual([]);
		});

		test("a slower output path is followed through the reported latency", async () => {
			const song = songOf([1, 1, 1]);
			// Bluetooth: 195 ms of output, so heard 250 ms late.
			const { flow, listener } = listenSetup(song, {}, 0.195);
			await run(flow, listener, played(song), 250, FIRST_SLOT_MS + 1500 + 300);
			expect(last().phase).toBe("summary");
			expect(last().summary?.coverage).toBeGreaterThan(0.95);
			expect(last().summary?.timingFaults).toEqual([]);
		});

		test("without the output latency the fallback lag is used", async () => {
			const song = songOf([1, 1, 1]);
			const { flow, listener } = listenSetup(song, {}, null);
			// Heard exactly as late as the fallback assumes.
			await run(
				flow,
				listener,
				played(song),
				FALLBACK_LAG_MS,
				FIRST_SLOT_MS + 1500 + 150,
			);
			expect(last().phase).toBe("summary");
			expect(last().summary?.coverage).toBeGreaterThan(0.95);
		});

		test("a lag that is wrong shows as late notes", async () => {
			const song = songOf([1, 1, 1]);
			// The flow assumes 100 ms but the sound is 250 ms late.
			const { flow, listener } = listenSetup(song, {}, 0.045);
			await run(flow, listener, played(song), 250, FIRST_SLOT_MS + 1500 + 300);
			const summary = last().summary;
			expect(summary?.timing.startedLate.faults).toBeGreaterThan(0);
		});

		test("a note not played is not covered", async () => {
			const song = songOf([1, 1, 1]);
			const second = played(song);
			const { flow, listener } = listenSetup(song);
			await run(
				flow,
				listener,
				(ms) => (ms >= 500 && ms < 1000 ? null : second(ms)),
				100,
				FIRST_SLOT_MS + 1500 + 150,
			);
			const items = last().summary?.items ?? [];
			expect(items[0]?.coverage).toBeGreaterThan(0.9);
			expect(items[1]?.coverage).toBe(0);
			expect(items[2]?.coverage).toBeGreaterThan(0.9);
		});

		test("the level blocks are placed in song time too: a dip at a same-pitch join separates it", async () => {
			const song = createSong(
				[
					{ pitch: 60 as Pitch, start: 0, beats: 1 },
					{ pitch: 60 as Pitch, start: 1, beats: 1 },
				],
				{ tempo: 120, meter: DEFAULT_METER },
			);
			const sound = () => hz(60);
			const dip = (ms: number) => (ms >= 485 && ms < 515 ? -60 : -30);
			const blocks = async (withDip: boolean) => {
				states = [];
				vi.setSystemTime(0);
				const { flow, listener } = listenSetup(song);
				flow.step();
				await settle();
				const level = withDip ? dip : () => -30;
				while (Date.now() < FIRST_SLOT_MS + 1000 + 150) {
					const heard = songMs() - 100;
					const audioTime = now();
					listener.read({
						frequency: sound(),
						// Six blocks of 2.67 ms for the 16 ms frame, as the listener gives them.
						envelope: Array.from({ length: 6 }, (_, j) => {
							const time = audioTime - ((5 - j) * 128) / 48000;
							return {
								time,
								level: level((time - FIRST_SLOT_S) * 1000 - 100),
							};
						}),
						level: level(heard),
					});
					vi.advanceTimersByTime(16);
				}
				const summary = last().summary;
				flow.stop();
				return summary?.separation;
			};
			expect(await blocks(true)).toEqual({ notSeparated: 0, plainJoins: 1 });
			expect(await blocks(false)).toEqual({ notSeparated: 1, plainJoins: 1 });
		});

		test("readings from the count-in are scored from the first note's start", async () => {
			const song = songOf([1]);
			const { flow, listener } = listenSetup(song);
			// The note sounds 200 ms before it should: seen as started early.
			await run(
				flow,
				listener,
				(ms) => (ms >= -200 && ms < 470 ? hz(60) : null),
				100,
				FIRST_SLOT_MS + 500 + 150,
			);
			expect(last().summary?.timingFaults).toContainEqual({
				index: 0,
				edge: "start",
				kind: "early",
			});
		});

		test("a reading with no audio time is dropped", async () => {
			const song = songOf([1]);
			const { flow, listener } = listenSetup(song);
			flow.step();
			await settle();
			while (Date.now() < FIRST_SLOT_MS + 500 + 150) {
				listener.read({
					frequency: hz(60),
					audioTime: undefined,
					envelope: undefined,
				});
				vi.advanceTimersByTime(16);
			}
			expect(last().summary?.items[0]?.coverage).toBe(0);
		});
	});

	describe("progress and the newest reading (F09-S06)", () => {
		test("progress is the scoring's while it runs, and null before, after and without it", async () => {
			const song = songOf([1]);
			const { flow, listener } = listenSetup(song);
			expect(flow.progress()).toBeNull();
			await run(flow, listener, played(song), 100, FIRST_SLOT_MS + 400);
			const during = flow.progress();
			expect(during).not.toBeNull();
			expect(during?.open.length).toBeGreaterThan(0);
			hear(listener, played(song), 100, FIRST_SLOT_MS + 500 + 150);
			expect(last().phase).toBe("summary");
			expect(flow.progress()).toBeNull();
			const unscored = listenSetup(song, { auto: LOCKED });
			unscored.flow.step();
			await settle();
			expect(unscored.flow.progress()).toBeNull();
			unscored.flow.stop();
			const off = setup(song);
			off.step();
			expect(off.progress()).toBeNull();
		});

		test("the newest reading is kept, and cleared by stop", async () => {
			const { flow, listener } = listenSetup(songOf([1]));
			expect(flow.reading()).toBeNull();
			flow.step();
			await settle();
			listener.read({ frequency: 440 });
			listener.read({ frequency: 330 });
			expect(flow.reading()?.frequency).toBe(330);
			flow.stop();
			expect(flow.reading()).toBeNull();
		});
	});

	describe("the end of the run (AC5, AC6)", () => {
		test("the run ends one lag after the last slot ends, and the summary shows then", async () => {
			const { flow } = listenSetup(songOf([1]), {}, 0.145);
			flow.step();
			await settle();
			// The lag is 55 + 145 = 200 ms: the slot ends 500 ms in, the summary 700 ms in.
			vi.advanceTimersByTime(FIRST_SLOT_MS + 500 + 199);
			expect(last()).toMatchObject({
				phase: "playing",
				index: 0,
				summary: null,
			});
			vi.advanceTimersByTime(1);
			expect(last().phase).toBe("summary");
			expect(last().summary).not.toBeNull();
		});

		test("without the output latency it ends after the fallback lag", async () => {
			const { flow } = listenSetup(songOf([1]), {}, null);
			flow.step();
			await settle();
			vi.advanceTimersByTime(FIRST_SLOT_MS + 500 + 99);
			expect(last().phase).toBe("playing");
			vi.advanceTimersByTime(1);
			expect(last().phase).toBe("summary");
		});

		test("the summary of an unscored song has nothing graded to report", async () => {
			const { flow } = listenSetup(songOf([1]), { auto: LOCKED });
			flow.step();
			await settle();
			vi.advanceTimersByTime(FIRST_SLOT_MS + 500);
			expect(last().summary).toBeNull();
			expect(summaryText(last().summary)).toBe(END_OF_SONG);
		});

		test("a restart starts a fresh scoring", async () => {
			const song = songOf([1]);
			const { flow, listener } = listenSetup(song);
			await run(flow, listener, played(song), 100, FIRST_SLOT_MS + 500 + 150);
			expect(last().summary?.coverage).toBeGreaterThan(0.9);
			const before = Date.now();
			flow.step();
			expect(last().summary).toBeNull();
			// Nothing is played the second time.
			hear(listener, () => null, 100, before + FIRST_SLOT_MS + 500 + 150);
			expect(last().phase).toBe("summary");
			expect(last().summary?.coverage).toBe(0);
		});

		test("readings after the summary change nothing", async () => {
			const song = songOf([1]);
			const { flow, listener } = listenSetup(song);
			await run(flow, listener, played(song), 100, FIRST_SLOT_MS + 500 + 150);
			const count = states.length;
			hear(listener, () => hz(60), 100, Date.now() + 500);
			expect(states).toHaveLength(count);
		});

		test("a scoring that throws leaves the song playing in time with nothing to report", async () => {
			const song = songOf([1]);
			const { flow, listener, listen } = listenSetup(song);
			(listen.coverage as { sounding: unknown }).sounding = () => {
				throw new Error("sounding threw");
			};
			flow.step();
			await settle();
			expect(() =>
				hear(listener, played(song), 100, FIRST_SLOT_MS + 500 + 150),
			).not.toThrow();
			expect(last().phase).toBe("summary");
			expect(last().summary).toBeNull();
		});

		test("with judging off the song plays in time and reports nothing (AC8)", () => {
			const flow = setup(songOf([1, 1]));
			flow.step();
			vi.advanceTimersByTime(FIRST_SLOT_MS + 1000);
			expect(last()).toMatchObject({ phase: "summary", summary: null });
		});
	});
});

describe("summaryText (F09-S03 AC6)", () => {
	const result = (coverage: number | null) => ({ coverage }) as CoverageResult;

	test("gives the share covered, rounded", () => {
		expect(summaryText(result(0.824))).toBe("82% covered");
		expect(summaryText(result(0.825))).toBe("83% covered");
		expect(summaryText(result(1))).toBe("100% covered");
		expect(summaryText(result(0))).toBe("0% covered");
	});

	test("gives the end of the song when nothing was graded or scored", () => {
		expect(summaryText(result(null))).toBe(END_OF_SONG);
		expect(summaryText(null)).toBe(END_OF_SONG);
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
