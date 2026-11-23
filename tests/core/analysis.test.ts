import { describe, expect, test } from "vitest";
import {
	type Analysis,
	type AnalysisInput,
	analyse,
	DRIFT_MIN_NOTES,
	mannWhitneyExact,
	mannWhitneyLower,
	mannWhitneyNormal,
	median,
	PER_LENGTH_MIN,
	practiceSpots,
	theilSen,
} from "../../src/core/analysis";
import analysisSource from "../../src/core/analysis/index.ts?raw";
import {
	buildTimeline,
	type CoverageOptions,
	createCoverageRun,
	type ItemScore,
	TIMING_TOLERANCE_MS,
} from "../../src/core/coverage";
import { DEFAULT_THRESHOLDS } from "../../src/core/judge";
import { type Pitch, parsePitch, toFrequency } from "../../src/core/pitch";
import { createSong, DEFAULT_METER, songBars } from "../../src/core/song";

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

/** A song of `bars` bars of four quarter notes at ♩ = 120 (2000 ms a bar), with `firstBar` beats before the first bar line. */
function barsSong(bars: number, firstBar?: number) {
	const notes = Array.from({ length: bars * 4 }, (_, i) => ({
		pitch: pitch("C4"),
		start: i,
		beats: 1,
	}));
	return createSong(notes, {
		tempo: null,
		meter: DEFAULT_METER,
		...(firstBar === undefined ? {} : { firstBar }),
	});
}

/** Graded items placed in bars: `perBar[b]` are the coverages of the items that start in bar b. */
function placed(perBar: number[][], barMs = 2000): { items: ItemScore[] } {
	const items: ItemScore[] = [];
	perBar.forEach((coverages, b) => {
		coverages.forEach((coverage, k) => {
			items.push({
				kind: "note",
				index: items.length,
				startMs: b * barMs + k * 100,
				endMs: b * barMs + k * 100 + 90,
				graded: true,
				coverage,
				inTune: null,
				startEdge: false,
				endEdge: false,
				soundStartMs: null,
				soundedMs: null,
			});
		});
	});
	return { items };
}

/** A deterministic wobble in 0..1 for a little noise. */
const wobble = (i: number) => ((i * 37) % 11) / 11;

describe("practice spots (S02)", () => {
	const spots = (perBar: number[][], firstBar?: number) =>
		practiceSpots({
			song: barsSong(perBar.length, firstBar),
			tempo: TEMPO,
			result: placed(perBar),
		});
	/** Good bars with a bad stretch. */
	const withBad = (bars: number, bad: number[], noise = 0) =>
		Array.from({ length: bars }, (_, b) =>
			Array.from({ length: 5 }, (_, k) =>
				bad.includes(b)
					? Math.max(0, 0.2 + noise * wobble(b * 5 + k) * 0.3)
					: Math.min(1, 0.95 - noise * wobble(b * 5 + k) * 0.3),
			),
		);

	test("one clearly bad span is found, with its bars, beats and means", () => {
		const r = spots(withBad(8, [2, 3]));
		expect(r.tested).toBe(true);
		expect(r.spots).toHaveLength(1);
		const spot = r.spots[0];
		expect(spot).toMatchObject({
			firstBar: 3,
			lastBar: 4,
			startBeat: 8,
			endBeat: 16,
		});
		near(spot?.coverage, 0.2, 0.001);
		near(spot?.elsewhere, 0.95, 0.001);
	});

	test("the same with noise is still found", () => {
		const r = spots(withBad(8, [2, 3], 1));
		expect(r.spots[0]).toMatchObject({ firstBar: 3, lastBar: 4 });
	});

	test("the last span ends at the song's end", () => {
		const r = spots(withBad(6, [4, 5]));
		expect(r.spots[0]).toMatchObject({ firstBar: 5, lastBar: 6, endBeat: 24 });
	});

	test("one bad item alone is not found", () => {
		const bars = withBad(8, []);
		(bars[3] as number[])[0] = 0;
		expect(spots(bars).spots).toEqual([]);
		expect(spots(bars).tested).toBe(true);
	});

	test("uniformly low and uniformly high give none", () => {
		const flat = (v: number) =>
			Array.from({ length: 8 }, () => Array.from({ length: 5 }, () => v));
		expect(spots(flat(0.3))).toEqual({ tested: true, spots: [] });
		expect(spots(flat(1))).toEqual({ tested: true, spots: [] });
	});

	test("two bad spans far apart are both found, lowest p first", () => {
		const bars = withBad(12, [1, 2, 8, 9]);
		// Make the first stretch less bad so the second has the lower p.
		bars[1] = [0.5, 0.5, 0.5, 0.5, 0.5];
		bars[2] = [0.5, 0.5, 0.5, 0.5, 0.5];
		const r = spots(bars);
		expect(r.spots.map((x) => x.firstBar)).toEqual([9, 2]);
		expect(r.spots[0]?.p).toBeLessThanOrEqual(r.spots[1]?.p ?? 0);
	});

	test("two overlapping bad spans give one", () => {
		const r = spots(withBad(10, [3, 4, 5]));
		expect(r.spots).toHaveLength(1);
	});

	test("a two-bar song is not tested", () => {
		expect(
			spots([
				[0, 1],
				[0, 1],
			]),
		).toEqual({ tested: false, spots: [] });
	});

	test("a pickup bar counts as bar 1", () => {
		// One beat of pickup: bar 1 is beat 0 to 1, then bars of four.
		const perBar = withBad(8, [3, 4]);
		const song = barsSong(8, 1);
		const bars = songBars(song);
		expect(bars[0]?.start).toBe(0);
		const items = placed(
			bars.map((bar, b) =>
				Array.from({ length: 5 }, () => (b === 3 || b === 4 ? 0.2 : 0.95)),
			),
			0,
		);
		// Place each item at its bar's own start.
		items.items.forEach((item, i) => {
			const bar = bars[Math.floor(i / 5)];
			const start = ((bar?.start ?? 0) * 60000) / TEMPO + (i % 5) * 10;
			Object.assign(item, { startMs: start, endMs: start + 5 });
		});
		const r = practiceSpots({ song, tempo: TEMPO, result: items });
		expect(r.spots[0]).toMatchObject({ firstBar: 4, lastBar: 5 });
		expect(r.spots[0]?.startBeat).toBe(bars[3]?.start);
		expect(perBar.length).toBe(8);
	});

	test("ties at 0 and 1 are handled", () => {
		const bars = Array.from({ length: 8 }, (_, b) =>
			Array.from({ length: 4 }, () => (b === 2 || b === 3 ? 0 : 1)),
		);
		const r = spots(bars);
		expect(r.spots[0]).toMatchObject({ firstBar: 3, lastBar: 4 });
		expect(r.spots[0]?.coverage).toBe(0);
		expect(r.spots[0]?.elsewhere).toBe(1);
	});

	test("a graded item belongs to the bar it starts in; ungraded items are ignored", () => {
		const bars = withBad(6, [2, 3]);
		const { items } = placed(bars);
		items.push({
			...(items[0] as ItemScore),
			graded: false,
			coverage: null,
			startMs: 2 * 2000,
		});
		const r = practiceSpots({
			song: barsSong(6),
			tempo: TEMPO,
			result: { items },
		});
		expect(r.spots[0]).toMatchObject({ firstBar: 3, lastBar: 4 });
	});

	test("a span with no graded item, or none outside it, is skipped", () => {
		const onlyFirst = [[0.5, 0.2], [], []];
		expect(spots(onlyFirst)).toEqual({ tested: false, spots: [] });
	});

	test("ties between spots break by lower mean, then the earlier bar", () => {
		// Two identical bad stretches, the same p and mean: the earlier bar comes first.
		const bars = withBad(14, [1, 2, 9, 10]);
		const r = spots(bars);
		expect(r.spots.map((x) => x.firstBar)).toEqual([2, 10]);
		// The second is a little higher in mean at the same p pattern: it comes second whichever its bar.
		const worse = withBad(14, [1, 2, 9, 10]);
		worse[9] = [0.1, 0.1, 0.1, 0.1, 0.1];
		worse[10] = [0.1, 0.1, 0.1, 0.1, 0.1];
		expect(spots(worse).spots.map((x) => x.firstBar)[0]).toBe(10);
	});
});

describe("the rank test (S02 AC7)", () => {
	/** Every choice of `m` of the pooled values, by doubled-rank sum: the exact answer by brute force. */
	function brute(span: number[], rest: number[]): number {
		const pooled = [...span, ...rest];
		const order = pooled.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
		const doubled = new Array<number>(pooled.length).fill(0);
		for (let i = 0; i < order.length; ) {
			let j = i;
			while (
				j + 1 < order.length &&
				Math.abs(
					(order[j + 1] as { v: number }).v - (order[i] as { v: number }).v,
				) <= 1e-9
			)
				j++;
			for (let k = i; k <= j; k++)
				doubled[(order[k] as { i: number }).i] = i + 1 + j + 1;
			i = j + 1;
		}
		const observed = doubled.slice(0, span.length).reduce((a, b) => a + b, 0);
		let le = 0;
		let all = 0;
		const walk = (from: number, left: number, sum: number) => {
			if (left === 0) {
				all++;
				if (sum <= observed) le++;
				return;
			}
			for (let i = from; i <= pooled.length - left; i++) {
				walk(i + 1, left - 1, sum + (doubled[i] as number));
			}
		};
		walk(0, span.length, 0);
		return le / all;
	}

	test("matches a brute-force enumeration, with and without ties", () => {
		const cases: [number[], number[]][] = [
			[
				[1, 2, 3],
				[4, 5, 6, 7],
			],
			[
				[1, 5, 3],
				[2, 4, 6, 7, 8],
			],
			[
				[0.1, 0.4],
				[0.2, 0.3, 0.5, 0.9, 0.95, 0.6],
			],
			[
				[0, 0, 1],
				[1, 1, 1, 1],
			],
			[
				[0, 0.5, 0],
				[1, 1, 0.5, 1, 0, 1, 0.5],
			],
			[
				[0.2, 0.2],
				[0.2, 0.9, 1, 1, 0.9],
			],
			[
				[0, 0, 0, 1],
				[1, 1, 1, 1, 1, 0],
			],
		];
		for (const [span, rest] of cases) {
			const exact = mannWhitneyExact(span, rest);
			expect(exact).not.toBeNull();
			expect(Math.abs((exact as number) - brute(span, rest))).toBeLessThan(
				1e-12,
			);
		}
	});

	test("matches published table values with no ties (m = 3, n = 4)", () => {
		expect(mannWhitneyLower([1, 2, 3], [4, 5, 6, 7])).toBeCloseTo(1 / 35, 12);
		// U = 1: the span {1, 2, 4}.
		expect(mannWhitneyLower([1, 2, 4], [3, 5, 6, 7])).toBeCloseTo(2 / 35, 12);
	});

	test("a span that is not lower cannot be significant", () => {
		expect(mannWhitneyLower([5, 6, 7], [1, 2, 3, 4])).toBeGreaterThan(0.9);
		expect(mannWhitneyLower([1, 1], [1, 1, 1])).toBe(1);
		expect(mannWhitneyLower([], [1])).toBe(1);
	});

	test("the normal path matches the tie-corrected formula worked by hand (1e-6)", () => {
		// span [0, 0, 1] against [1, 1, 1, 1]: N = 7, W = 1.5 + 1.5 + 5 = 8, mean 12,
		// tie sum (8 - 2) + (125 - 5) = 126, variance 3 * 4 / 12 * (8 - 126 / 42) = 5,
		// z = (8 + 0.5 - 12) / sqrt(5) = -1.5652476, p = Φ(z) = 0.0587624.
		expect(
			Math.abs(mannWhitneyNormal([0, 0, 1], [1, 1, 1, 1]) - 0.058762434),
		).toBeLessThan(1e-6);
		// Without ties: [1,2,3] vs [4..7]: W = 6, mean 12, variance 12/12 * 8 = 8,
		// z = (6.5 - 12) / sqrt(8) = -1.9445436, Φ = 0.0259150.
		expect(
			Math.abs(mannWhitneyNormal([1, 2, 3], [4, 5, 6, 7]) - 0.0259149636),
		).toBeLessThan(1e-6);
	});

	test("the normal path is within 0.01 of the exact one at m = 8, n = 40", () => {
		const rest = Array.from({ length: 40 }, (_, i) => wobble(i) * 0.5 + 0.5);
		const span = Array.from({ length: 8 }, (_, i) => wobble(i + 3) * 0.6);
		const exact = mannWhitneyExact(span, rest);
		expect(exact).not.toBeNull();
		expect(
			Math.abs(mannWhitneyNormal(span, rest) - (exact as number)),
		).toBeLessThan(0.01);
		const tied = Array.from({ length: 40 }, (_, i) => (i % 5 === 0 ? 0 : 1));
		const tiedSpan = [0, 0, 0, 0, 1, 0, 0, 1];
		const tiedExact = mannWhitneyExact(tiedSpan, tied);
		expect(
			Math.abs(mannWhitneyNormal(tiedSpan, tied) - (tiedExact as number)),
		).toBeLessThan(0.01);
	});

	test("above the budget the normal approximation is used", () => {
		const big = Array.from({ length: 600 }, (_, i) => wobble(i));
		const span = Array.from({ length: 10 }, (_, i) => wobble(i) * 0.3);
		expect(mannWhitneyExact(span, big)).toBeNull();
		expect(mannWhitneyLower(span, big)).toBe(mannWhitneyNormal(span, big));
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
