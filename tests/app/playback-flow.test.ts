import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
	createPlaybackFlow,
	type PlaybackFlow,
	type PlaybackState,
	soundingChanges,
} from "../../src/app/playback-flow";
import { playheadBeat } from "../../src/app/playhead";
import {
	createTimedFlow,
	LEAD_SECONDS,
	METRONOME_LOOKAHEAD_SECONDS,
} from "../../src/app/timed-flow";
import type { Pitch } from "../../src/core/pitch";
import {
	countIn,
	createSong,
	DEFAULT_METER,
	DEFAULT_TEMPO,
	type Meter,
	type Song,
} from "../../src/core/song";

interface Scheduled {
	pitch: Pitch;
	at: number;
	seconds: number;
}

let states: PlaybackState[];
let clicks: number[];
let scheduled: Scheduled[];
let clickerStops: number;
let toneStops: number;
let ends: number;
const now = () => Date.now() / 1000;

const clicker = {
	click: (at: number) => clicks.push(at),
	stop: () => {
		clickerStops++;
	},
};
const tones = {
	schedule: (pitch: Pitch, at: number, seconds: number) =>
		scheduled.push({ pitch, at, seconds }),
	stop: () => {
		toneStops++;
	},
};

function songOf(
	lengths: number[],
	{
		tempo = 120 as number | null,
		meter = DEFAULT_METER,
		gaps = [] as number[],
		firstBar,
	}: {
		tempo?: number | null;
		meter?: Meter;
		gaps?: number[];
		firstBar?: number;
	} = {},
): Song {
	let start = 0;
	const notes = lengths.map((beats, i) => {
		const note = { pitch: (60 + (i % 12)) as Pitch, start, beats };
		start += beats + (gaps[i] ?? 0);
		return note;
	});
	return createSong(notes, { tempo, meter, firstBar });
}

function setup(
	song = songOf([1, 1, 1]),
	{ clock = { now }, metronome = false } = {},
): PlaybackFlow {
	return createPlaybackFlow({
		song,
		clock,
		clicker,
		tones,
		sounding: (p) => (p + 12) as Pitch,
		metronome,
		onChange: (s) => states.push(s),
		onEnd: () => {
			ends++;
		},
	});
}

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(0);
	states = [];
	clicks = [];
	scheduled = [];
	clickerStops = 0;
	toneStops = 0;
	ends = 0;
});

afterEach(() => {
	vi.useRealTimers();
});

describe("the count-in (F13-S02 AC2)", () => {
	const cases: [string, Song][] = [
		["4/4", songOf([1, 1])],
		["3/4", songOf([1, 1], { meter: { beats: 3, unit: 4 } })],
		["6/8", songOf([1.5, 1.5], { meter: { beats: 6, unit: 8 } })],
		["a pickup", songOf([1, 1, 1], { firstBar: 1 })],
	];
	for (const [name, song] of cases) {
		test(`${name}: the clicks equal a timed run's`, () => {
			const timedClicks: number[] = [];
			const timed = createTimedFlow({
				song,
				clock: { now },
				clicker: { click: (at) => timedClicks.push(at), stop: () => {} },
				onChange: () => {},
			});
			timed.start();
			timed.step();
			const flow = setup(song);
			flow.start();
			expect(clicks).toEqual(timedClicks);
			expect(clicks).toHaveLength(countIn(song.meter, 120).beats);
			flow.stop();
			timed.stop();
		});
	}

	test("it emits count-in with the first slot as origin, then playing", () => {
		const flow = setup(songOf([1, 1]));
		flow.start();
		const firstSlot = LEAD_SECONDS + 2;
		expect(states).toEqual([
			{ phase: "count-in", index: 0, origin: firstSlot },
		]);
		vi.advanceTimersByTime((LEAD_SECONDS + 2) * 1000);
		expect(states).toEqual([
			{ phase: "count-in", index: 0, origin: firstSlot },
			{ phase: "playing", index: 0, origin: firstSlot },
		]);
	});
});

describe("the tones (F13-S02 AC2)", () => {
	test("times, lengths and sounding pitches", () => {
		const flow = setup(songOf([1, 0.5, 2], { gaps: [0, 1] }));
		flow.start();
		vi.advanceTimersByTime(10000);
		const first = LEAD_SECONDS + 2;
		expect(scheduled.map((s) => s.pitch)).toEqual([72, 73, 74]);
		expect(scheduled.map((s) => s.at)).toEqual([
			first,
			first + 0.5,
			first + 1.25,
		]);
		// A tone ends where its release starts: a quarter of its length, at most half a beat, at least 40 ms.
		expect(scheduled[0]?.seconds).toBeCloseTo(0.5 - 0.125, 10);
		expect(scheduled[1]?.seconds).toBeCloseTo(0.25 - 0.0625, 10);
		expect(scheduled[2]?.seconds).toBeCloseTo(1 - 0.25, 10);
	});

	test("no Q: plays at the default tempo", () => {
		const flow = setup(songOf([1, 1], { tempo: null }));
		flow.start();
		vi.advanceTimersByTime(10000);
		const beat = 60 / DEFAULT_TEMPO;
		const first = LEAD_SECONDS + 4 * beat;
		expect(scheduled.map((s) => s.at)).toEqual([first, first + beat]);
	});
});

describe("the metronome (F13-S02 AC3)", () => {
	test("on: a click on every beat of the song, none at or after its end", () => {
		const flow = setup(songOf([1, 1, 1]), { metronome: true });
		flow.start();
		vi.advanceTimersByTime(10000);
		const first = LEAD_SECONDS + 2;
		expect(clicks.slice(4)).toEqual([first, first + 0.5, first + 1]);
		expect(clicks).toHaveLength(4 + 3);
	});

	test("off: no clicks after the count-in", () => {
		const flow = setup(songOf([1, 1, 1]));
		flow.start();
		vi.advanceTimersByTime(10000);
		expect(clicks).toHaveLength(4);
	});
});

describe("batches", () => {
	test("a 200-note song schedules nothing past the lookahead at start", () => {
		const flow = setup(songOf(Array(200).fill(1)), { metronome: true });
		flow.start();
		const firstSlot = LEAD_SECONDS + 2;
		const limit = firstSlot + METRONOME_LOOKAHEAD_SECONDS;
		expect(scheduled.length).toBeGreaterThan(0);
		expect(scheduled.length).toBeLessThan(10);
		for (const s of scheduled) expect(s.at).toBeLessThanOrEqual(limit);
		for (const c of clicks.slice(4)) expect(c).toBeLessThanOrEqual(limit);
		vi.advanceTimersByTime(200 * 500 + 5000);
		expect(scheduled).toHaveLength(200);
		expect(clicks).toHaveLength(4 + 200);
		flow.stop();
	});

	test("a held note longer than the lookahead gets every beat before it falls", () => {
		// Two tied bars, then a rest and a note: beats deep inside the long note
		// and the rest must be sent before their time, not at the next note.
		const song = songOf([8, 1, 1], { gaps: [0, 2] });
		const late: { at: number; sentAt: number }[] = [];
		const flow = createPlaybackFlow({
			song,
			clock: { now },
			clicker: {
				click: (at) => {
					clicks.push(at);
					if (now() > at) late.push({ at, sentAt: now() });
				},
				stop: () => {},
			},
			tones: {
				schedule: (pitch, at, seconds) => {
					scheduled.push({ pitch, at, seconds });
					if (now() > at) late.push({ at, sentAt: now() });
				},
				stop: () => {},
			},
			sounding: (p) => p,
			metronome: true,
			onChange: () => {},
			onEnd: () => {},
		});
		flow.start();
		vi.advanceTimersByTime(20000);
		expect(late).toEqual([]);
		expect(clicks).toHaveLength(4 + 12);
		expect(scheduled).toHaveLength(3);
	});
});

describe("the end", () => {
	test("onEnd comes once, at the last written end", () => {
		const flow = setup(songOf([1, 1]));
		flow.start();
		const end = (LEAD_SECONDS + 2 + 1) * 1000;
		vi.advanceTimersByTime(end - 1);
		expect(ends).toBe(0);
		vi.advanceTimersByTime(1);
		expect(ends).toBe(1);
		vi.advanceTimersByTime(60000);
		expect(ends).toBe(1);
	});
});

describe("stop (F13-S02 AC4)", () => {
	test("mid-song stops clicks and tones and brings nothing more", () => {
		const flow = setup(songOf([1, 1, 1, 1, 1, 1]), { metronome: true });
		flow.start();
		vi.advanceTimersByTime((LEAD_SECONDS + 2 + 1) * 1000);
		const emitted = states.length;
		const toneCount = scheduled.length;
		const clickCount = clicks.length;
		clickerStops = 0;
		flow.stop();
		expect(clickerStops).toBe(1);
		expect(toneStops).toBe(1);
		vi.advanceTimersByTime(60000);
		expect(states).toHaveLength(emitted);
		expect(scheduled).toHaveLength(toneCount);
		expect(clicks).toHaveLength(clickCount);
		expect(ends).toBe(0);
		expect(() => flow.stop()).not.toThrow();
	});
});

describe("a clock that lags the timers", () => {
	test("nothing shows or ends early", () => {
		let clockNow = 0;
		const flow = setup(songOf([1, 1]), { clock: { now: () => clockNow } });
		flow.start();
		vi.advanceTimersByTime(10000);
		expect(states.map((s) => s.phase)).toEqual(["count-in"]);
		clockNow = LEAD_SECONDS + 2;
		vi.advanceTimersByTime(10000);
		expect(states.map((s) => s.phase)).toEqual(["count-in", "playing"]);
		expect(ends).toBe(0);
		clockNow = LEAD_SECONDS + 3;
		vi.advanceTimersByTime(10000);
		expect(ends).toBe(1);
	});
});

describe("soundingChanges (F13-S03)", () => {
	test("plain quarters: each note at its start", () => {
		expect(soundingChanges(songOf([1, 1, 1]), 120)).toEqual([
			{ atMs: 0, index: 0 },
			{ atMs: 500, index: 1 },
			{ atMs: 1000, index: 2 },
		]);
	});

	test("a rest: -1 from the written end until the next start", () => {
		expect(soundingChanges(songOf([1, 1], { gaps: [1] }), 120)).toEqual([
			{ atMs: 0, index: 0 },
			{ atMs: 500, index: -1 },
			{ atMs: 1000, index: 1 },
		]);
	});

	test("a slur followed by a rest still goes grey at the written end", () => {
		const song = createSong(
			[
				{ pitch: 60 as Pitch, start: 0, beats: 1, slurred: true },
				{ pitch: 62 as Pitch, start: 1, beats: 1, slurred: true },
				{ pitch: 64 as Pitch, start: 3, beats: 1 },
			],
			{ tempo: 120, meter: DEFAULT_METER },
		);
		expect(soundingChanges(song, 120)).toEqual([
			{ atMs: 0, index: 0 },
			{ atMs: 500, index: 1 },
			{ atMs: 1000, index: -1 },
			{ atMs: 1500, index: 2 },
		]);
	});
});

describe("the sounding index and the origin (F13-S03)", () => {
	test("0 in the count-in, each note at its start, -1 through a rest", () => {
		const flow = setup(songOf([1, 1, 1], { gaps: [0, 1] }));
		flow.start();
		const first = (LEAD_SECONDS + 2) * 1000;
		expect(states.map((s) => s.index)).toEqual([0]);
		vi.advanceTimersByTime(first);
		expect(states.at(-1)).toMatchObject({ phase: "playing", index: 0 });
		vi.advanceTimersByTime(500);
		expect(states.at(-1)?.index).toBe(1);
		vi.advanceTimersByTime(500);
		expect(states.at(-1)?.index).toBe(-1);
		vi.advanceTimersByTime(499);
		expect(states.at(-1)?.index).toBe(-1);
		vi.advanceTimersByTime(1);
		expect(states.at(-1)?.index).toBe(2);
		flow.stop();
	});

	test("the origin equals the timed flow's, so the playhead is placed as in a run", () => {
		const song = songOf([1, 1]);
		let origin: number | null = null;
		const timed = createTimedFlow({
			song,
			clock: { now },
			clicker: null,
			onChange: (s) => {
				origin = s.origin;
			},
		});
		timed.start();
		timed.step();
		const flow = setup(song);
		flow.start();
		expect(states[0]?.origin).toBe(origin);
		expect(
			playheadBeat(now(), null, states[0]?.origin as number, 120),
		).toBeLessThan(0);
		vi.advanceTimersByTime((LEAD_SECONDS + 2) * 1000);
		expect(
			playheadBeat(now(), null, states[0]?.origin as number, 120),
		).toBeCloseTo(0, 6);
		flow.stop();
		timed.stop();
	});
});
