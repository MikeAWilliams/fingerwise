import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
	createTimedFlow,
	LEAD_SECONDS,
	type TimedFlow,
	type TimedState,
} from "../../src/app/timed-flow";
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
	{ clock = { now }, silent = false } = {},
): TimedFlow {
	const flow = createTimedFlow({
		song,
		clock,
		clicker: silent ? null : clicker,
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
			phase: "ready",
			verdict: null,
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
			phase: "summary",
			verdict: null,
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
