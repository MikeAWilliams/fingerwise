import { describe, expect, test } from "vitest";
import {
	type Analysis,
	type AnalysisInput,
	analyse,
	DRIFT_MIN_NOTES,
	median,
	PER_LENGTH_MIN,
	theilSen,
} from "../../src/core/analysis";
import analysisSource from "../../src/core/analysis/index.ts?raw";
import {
	buildTimeline,
	type CoverageOptions,
	createCoverageRun,
	TIMING_TOLERANCE_MS,
} from "../../src/core/coverage";
import { DEFAULT_THRESHOLDS } from "../../src/core/judge";
import { type Pitch, parsePitch, toFrequency } from "../../src/core/pitch";
import { createSong, DEFAULT_METER } from "../../src/core/song";

const STEP = 16.7;
const BLOCK = 2.67;
/** At ♩ = 120 a quarter note is 500 ms. */
const TEMPO = 120;

function pitch(name: string): Pitch {
	const p = parsePitch(name);
	if (p === null) throw new Error(`bad pitch ${name}`);
	return p;
}

function hz(name: string, cents = 0): number {
	return toFrequency(pitch(name)) * 2 ** (cents / 1200);
}

type Sound = (t: number) => number | null;

/** Sounds `freq` from `from` to `to` (ms); silent elsewhere. Later spans win. */
function spans(...parts: [number, number, number | null][]): Sound {
	return (t) => {
		let heard: number | null = null;
		for (const [from, to, freq] of parts) {
			if (t >= from && t < to) heard = freq;
		}
		return heard;
	};
}

const options: CoverageOptions = {
	toleranceCents: 25,
	checks: DEFAULT_THRESHOLDS,
	sounding: (written) => written,
};

type NoteSpec = [name: string, start: number, beats: number, slurred?: boolean];

function song(notes: NoteSpec[]) {
	return createSong(
		notes.map(([name, start, beats, slurred]) => ({
			pitch: pitch(name),
			start,
			beats,
			slurred,
		})),
		{ tempo: null, meter: DEFAULT_METER },
	);
}

function quarters(...names: string[]) {
	return song(names.map((name, i) => [name, i, 1]));
}

/** The input to `analyse` from a song and what was played, run through a real coverage run. */
function inputFor(
	s: ReturnType<typeof song>,
	sound: Sound,
	tempo = TEMPO,
): AnalysisInput {
	const timeline = buildTimeline(s, tempo);
	const last = timeline.notes[timeline.notes.length - 1];
	const run = createCoverageRun(timeline, options);
	let nextBlock = -500;
	const levelAt = (t: number) => (sound(t) === null ? -70 : -30);
	for (let t = -500; t <= (last?.endMs ?? 0) + 500; t += STEP) {
		const blocks = [];
		for (; nextBlock <= t; nextBlock += BLOCK) {
			blocks.push({ time: nextBlock, level: levelAt(nextBlock) });
		}
		run.pushEnvelope(blocks);
		const freq = sound(t);
		run.pushReading(
			freq === null
				? { time: t, frequency: null, clarity: 0, level: -70 }
				: { time: t, frequency: freq, clarity: 0.98, level: levelAt(t) },
		);
	}
	const result = run.finish();
	return {
		song: s,
		tempo,
		timeline,
		segments: run.progress().segments,
		result,
	};
}

function analysisFor(
	s: ReturnType<typeof song>,
	sound: Sound,
	tempo = TEMPO,
): Analysis {
	const a = analyse(inputFor(s, sound, tempo));
	if (a === null) throw new Error("nothing graded");
	return a;
}

const near = (
	value: number | null | undefined,
	expected: number,
	by = 0.05,
) => {
	expect(value).not.toBeNull();
	expect(Math.abs((value as number) - expected)).toBeLessThanOrEqual(by);
};

const sum = (a: Analysis) =>
	Object.values(a.breakdown).reduce((x, y) => x + y, 0);

describe("the breakdown (AC1, AC2)", () => {
	const one = quarters("C4");

	test("a note played fully is in tune", () => {
		const a = analysisFor(one, spans([0, 470, hz("C4")]));
		near(a.breakdown.inTune, 1);
		expect(sum(a)).toBeCloseTo(1, 9);
	});

	test("a late start is silent before", () => {
		const a = analysisFor(one, spans([150, 470, hz("C4")]));
		// The scored span is 40 to 460: 110 of 420 ms before the first reading.
		near(a.breakdown.silentBefore, 110 / 420);
		near(a.breakdown.inTune, 310 / 420);
		expect(sum(a)).toBeCloseTo(1, 9);
	});

	test("stopping early is silent after", () => {
		const a = analysisFor(one, spans([0, 300, hz("C4")]));
		near(a.breakdown.silentAfter, 160 / 420);
		expect(a.breakdown.silentBefore).toBeLessThan(0.05);
	});

	test("a dropout is silent in the middle", () => {
		const a = analysisFor(one, spans([0, 150, hz("C4")], [250, 470, hz("C4")]));
		near(a.breakdown.silentMiddle, 100 / 420);
		expect(a.breakdown.silentAfter).toBeLessThan(0.05);
	});

	test("a note never played is not played, whatever silence falls where", () => {
		const a = analysisFor(quarters("C4", "D4"), spans([500, 970, hz("D4")]));
		// Half the graded note time is the unplayed C.
		near(a.breakdown.notPlayed, 0.5);
		expect(a.breakdown.silentBefore).toBe(0);
		expect(a.breakdown.silentAfter).toBe(0);
	});

	test("a confirmed wrong run is wrong; a pending blip is silent", () => {
		const wrong = analysisFor(
			one,
			spans([0, 200, hz("C4")], [200, 470, hz("G4")]),
		);
		near(wrong.breakdown.wrong, 260 / 420);
		const blip = analysisFor(
			one,
			spans([0, 470, hz("C4")], [200, 200 + STEP, hz("G4")]),
		);
		expect(blip.breakdown.wrong).toBe(0);
		near(blip.breakdown.silentMiddle, STEP / 420, 0.02);
	});

	test("a note wrong all through, with no right reading, is wrong, not unplayed", () => {
		const a = analysisFor(one, spans([0, 470, hz("G4")]));
		near(a.breakdown.wrong, 1);
		expect(a.breakdown.notPlayed).toBe(0);
	});

	test("a note out of tune is out of tune", () => {
		const a = analysisFor(one, spans([0, 470, hz("C4", 40)]));
		near(a.breakdown.outOfTune, 1);
		expect(a.breakdown.inTune).toBe(0);
	});

	test("the shares add to 1 over a mixed song", () => {
		const a = analysisFor(
			quarters("C4", "D4", "E4", "F4"),
			spans(
				[100, 470, hz("C4")],
				[500, 780, hz("D4")],
				[1000, 1200, hz("E4", 40)],
				[1250, 1470, hz("G4")],
			),
		);
		expect(sum(a)).toBeCloseTo(1, 9);
	});

	test("a slurred join is not cut at that side", () => {
		const s = song([
			["C4", 0, 1, true],
			["D4", 1, 1],
		]);
		const a = analysisFor(s, spans([0, 470, hz("C4")], [500, 970, hz("D4")]));
		expect(sum(a)).toBeCloseTo(1, 9);
		// C's span ends at 500 (880 ms in all with D's 420): C has 500 - 40, D 420.
		near(a.breakdown.inTune, 1, 0.06);
	});
});

describe("rests (AC3)", () => {
	const s = song([
		["C4", 0, 1],
		["D4", 2, 1],
	]);

	test("a rest with sound has a share; a silent rest 0", () => {
		const quiet = analysisFor(
			s,
			spans([0, 460, hz("C4")], [1000, 1470, hz("D4")]),
		);
		expect(quiet.restSound).toBe(0);
		const loud = analysisFor(
			s,
			spans([0, 460, hz("C4")], [600, 810, hz("G4")], [1000, 1470, hz("D4")]),
		);
		// The graced span is 540 to 960, 420 ms.
		near(loud.restSound, 210 / 420);
	});

	test("no graded rest gives null, not 0", () => {
		const a = analysisFor(quarters("C4", "D4"), spans([0, 470, hz("C4")]));
		expect(a.restSound).toBeNull();
	});
});

describe("median and Theil–Sen", () => {
	test("median at odd and even counts, unsorted", () => {
		expect(median([5])).toBe(5);
		expect(median([9, 1, 5])).toBe(5);
		expect(median([4, 1, 3, 2])).toBe(2.5);
	});

	test("Theil–Sen fits a line and ignores an outlier and equal x", () => {
		const points = [0, 1, 2, 3, 4, 5].map((x) => ({ x, y: 2 * x + 1 }));
		const fit = theilSen([...points, { x: 3, y: 500 }]);
		expect(fit?.slope).toBeCloseTo(2, 9);
		expect(fit?.intercept).toBeCloseTo(1, 9);
		expect(theilSen([{ x: 1, y: 1 }])).toBeNull();
		expect(
			theilSen([
				{ x: 1, y: 1 },
				{ x: 1, y: 5 },
			]),
		).toBeNull();
	});
});

describe("the start, length and gap habits (AC4, AC5, AC6)", () => {
	test("start is the median offset, early as negative, null with none", () => {
		const names = ["C4", "D4", "E4", "F4"];
		const late = analysisFor(
			quarters(...names),
			spans(
				...names.map((n, i): [number, number, number] => [
					i * 500 + 110,
					i * 500 + 400,
					hz(n),
				]),
			),
		);
		near(late.habits.start, 110, 20);
		const early = analysisFor(
			quarters(...names),
			spans(
				...names.map((n, i): [number, number, number] => [
					i * 500 - 100,
					i * 500 + 300,
					hz(n),
				]),
			),
		);
		near(early.habits.start, -100, 20);
		const none = analysisFor(quarters("C4"), spans());
		expect(none.habits.start).toBeNull();
		expect(none.habits.length).toBeNull();
		expect(none.habits.gap).toBeNull();
		expect(none.habits.byLength).toEqual([]);
	});

	test("an even count of notes takes the mean of the middle two", () => {
		// Offsets about 0, 0, 100, 100: median 50.
		const a = analysisFor(
			quarters("C4", "D4", "E4", "F4"),
			spans(
				[0, 300, hz("C4")],
				[500, 800, hz("D4")],
				[1100, 1400, hz("E4")],
				[1600, 1900, hz("F4")],
			),
		);
		near(a.habits.start, 50, 20);
	});

	test("length is the share of the written length sounded", () => {
		const names = ["C4", "D4", "E4"];
		const a = analysisFor(
			quarters(...names),
			spans(
				...names.map((n, i): [number, number, number] => [
					i * 500,
					i * 500 + 350,
					hz(n),
				]),
			),
		);
		near(a.habits.length, 0.7, 0.04);
	});

	test("a length gets its own figure from three notes, longest first", () => {
		const notes: NoteSpec[] = [
			["C4", 0, 2],
			["D4", 2, 2],
			["E4", 4, 2],
			["F4", 6, 1],
			["G4", 7, 1],
		];
		const parts: [number, number, number | null][] = [
			[0, 900, hz("C4")],
			[1000, 1900, hz("D4")],
			[2000, 2900, hz("E4")],
			[3000, 3300, hz("F4")],
			[3500, 3800, hz("G4")],
		];
		const a = analysisFor(song(notes), spans(...parts));
		// Three half notes sound 900 of 1000; two quarters are too few.
		expect(PER_LENGTH_MIN).toBe(3);
		expect(a.habits.byLength).toHaveLength(1);
		expect(a.habits.byLength[0]?.beats).toBe(2);
		near(a.habits.byLength[0]?.share, 0.9, 0.04);
	});

	test("two lengths with enough notes are listed longest first", () => {
		const notes: NoteSpec[] = [
			["C4", 0, 1],
			["D4", 1, 1],
			["E4", 2, 1],
			["F4", 3, 2],
			["G4", 5, 2],
			["A4", 7, 2],
		];
		const parts: [number, number, number][] = [
			[0, 400, hz("C4")],
			[500, 900, hz("D4")],
			[1000, 1400, hz("E4")],
			[1500, 2400, hz("F4")],
			[2500, 3400, hz("G4")],
			[3500, 4400, hz("A4")],
		];
		const a = analysisFor(song(notes), spans(...parts));
		expect(a.habits.byLength.map((l) => l.beats)).toEqual([2, 1]);
	});

	test("the gap is the median over plain joins; slurred joins and notes with a rest are left out", () => {
		const names = ["C4", "D4", "E4", "F4"];
		const plain = analysisFor(
			quarters(...names),
			spans(
				...names.map((n, i): [number, number, number] => [
					i * 500,
					i * 500 + 400,
					hz(n),
				]),
			),
		);
		near(plain.habits.gap, 100, 20);
		const slurred = analysisFor(
			song(names.map((n, i): NoteSpec => [n, i, 1, true])),
			spans(
				...names.map((n, i): [number, number, number] => [
					i * 500,
					i * 500 + 400,
					hz(n),
				]),
			),
		);
		expect(slurred.habits.gap).toBeNull();
		const withRests = analysisFor(
			song([
				["C4", 0, 1],
				["D4", 2, 1],
			]),
			spans([0, 460, hz("C4")], [1000, 1470, hz("D4")]),
		);
		expect(withRests.habits.gap).toBeNull();
	});

	test("a join whose second note was not played has no gap", () => {
		const a = analysisFor(quarters("C4", "D4"), spans([0, 470, hz("C4")]));
		expect(a.habits.gap).toBeNull();
	});
});

describe("tempo drift (AC7)", () => {
	const names = (n: number) =>
		Array.from({ length: n }, (_, i) => (i % 2 === 0 ? "C4" : "D4"));
	/** Note i sounds `length` ms from `offset(i)` after its written start. */
	function played(
		n: number,
		offset: (i: number) => number,
		length = 300,
		slot = 500,
	) {
		return spans(
			...names(n).map((name, i): [number, number, number] => [
				i * slot + offset(i),
				i * slot + offset(i) + length,
				hz(name),
			]),
		);
	}
	const quarterSong = (n: number) => quarters(...names(n));

	test("a steady slowdown is reported, later", () => {
		const a = analysisFor(
			quarterSong(8),
			played(8, (i) => 20 * i),
		);
		const d = a.habits.drift;
		expect(d).not.toBeNull();
		near(d?.first, 0, 25);
		near(d?.last, 140, 25);
	});

	test("a steady rush is reported, with early starts visible", () => {
		const a = analysisFor(
			quarterSong(8),
			played(8, (i) => -20 * i),
		);
		const d = a.habits.drift;
		expect(d).not.toBeNull();
		near(d?.first, 0, 25);
		near(d?.last, -140, 25);
	});

	test("a steady offset has no drift", () => {
		const a = analysisFor(
			quarterSong(8),
			played(8, () => 30),
		);
		expect(a.habits.drift).toBeNull();
		near(a.habits.start, 30, 20);
	});

	test("one outlier does not make a drift", () => {
		const a = analysisFor(
			quarterSong(9),
			played(9, (i) => (i === 4 ? 150 : 20), 280),
		);
		expect(a.habits.drift).toBeNull();
	});

	test("fewer than three notes give none", () => {
		expect(DRIFT_MIN_NOTES).toBe(3);
		const a = analysisFor(
			quarterSong(2),
			played(2, (i) => 200 * i),
		);
		expect(a.habits.drift).toBeNull();
		expect(a.habits.start).not.toBeNull();
	});

	test("the drift threshold is the timing tolerance", () => {
		const under = analysisFor(
			quarterSong(8),
			played(8, (i) => 4 * i),
		);
		expect(under.habits.drift).toBeNull();
		expect(TIMING_TOLERANCE_MS).toBe(60);
	});

	test("large drift: a quarter note behind at ♩ = 80 is still seen, a little understated", () => {
		const slot = 750;
		const n = 16;
		// Note i starts 50 ms later each time: 750 ms (one quarter note) behind by the end.
		const a = analysisFor(
			quarterSong(n),
			played(n, (i) => 50 * i, 200, slot),
			80,
		);
		const d = a.habits.drift;
		// Recorded in the module doc. Notes heard against the right slot keep their offsets, up to
		// just under the slot; the last note, a whole slot behind, drops out and ends the fit short of 750.
		expect(d).not.toBeNull();
		expect((d?.last ?? 0) - (d?.first ?? 0)).toBeGreaterThan(500);
		expect(d?.last ?? 0).toBeLessThan(750);
		console.info(
			`large drift fit: first ${d?.first.toFixed(0)} ms, last ${d?.last.toFixed(0)} ms, true 0 to 750 ms`,
		);
	});
});

describe("nothing graded (AC8)", () => {
	test("gives null", () => {
		// Eighth notes at ♩ = 240 are 125 ms: too short to grade.
		const s = song([
			["C4", 0, 0.5],
			["D4", 0.5, 0.5],
		]);
		expect(analyse(inputFor(s, spans([0, 200, hz("C4")]), 240))).toBeNull();
	});
});

describe("module rules (AC9)", () => {
	test("imports only coverage and song (and pitch) and uses no clock or random", () => {
		const imports = [
			...analysisSource.matchAll(/from\s+["']([^"']+)["']/g),
		].map((m) => m[1]);
		expect(imports.length).toBeGreaterThan(0);
		for (const spec of imports) {
			expect(["../coverage", "../song", "../pitch"]).toContain(spec);
		}
		for (const name of [
			"Date",
			"performance",
			"setTimeout",
			"setInterval",
			"requestAnimationFrame",
			"Math.random",
		]) {
			expect(
				new RegExp(`\\b${name.replace(".", "\\.")}\\b`).test(analysisSource),
			).toBe(false);
		}
	});
});
