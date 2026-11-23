import { describe, expect, test } from "vitest";
import alto from "../../data/instruments/ocarina-12-taiwanese.json";
import {
	buildTimeline,
	type CoverageOptions,
	type CoverageResult,
	classify,
	createCoverageRun,
	EDGE_GRACE_MS,
	GAP_DIP_DB,
	GAP_MEDIAN_WINDOW_MS,
	MIN_GRADED_MS,
	MIN_SCORED_SPAN_MS,
	RIGHT_NOTE_BAND_CENTS,
	TIMING_TOLERANCE_MS,
	TRACE_SPAN_CENTS,
	WRONG_RUN,
} from "../../src/core/coverage";
import coverageSource from "../../src/core/coverage/index.ts?raw";
import { loadInstrument, soundingPitch } from "../../src/core/instrument";
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

/** The frequency of a pitch, `cents` off. */
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

/** Quarter notes one after another, plain joins. */
function quarters(...names: string[]) {
	return song(names.map((name, i) => [name, i, 1]));
}

interface Feed {
	from?: number;
	to?: number;
	/** The level at a time; by default loud while sound and quiet in silence. */
	level?: (t: number) => number;
}

/** Feeds readings every 16.7 ms and level blocks every 2.67 ms, as the listener would. */
function feed(
	run: ReturnType<typeof createCoverageRun>,
	sound: Sound,
	{ from = -500, to = 0, level }: Feed = {},
): void {
	const levelAt = level ?? ((t) => (sound(t) === null ? -70 : -30));
	let nextBlock = from;
	for (let t = from; t <= to; t += STEP) {
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
}

function score(
	timelineSong: ReturnType<typeof song>,
	sound: Sound,
	opts: Feed & { tempo?: number; options?: CoverageOptions } = {},
): CoverageResult {
	const timeline = buildTimeline(timelineSong, opts.tempo ?? TEMPO);
	const last = timeline.notes[timeline.notes.length - 1];
	const run = createCoverageRun(timeline, opts.options ?? options);
	feed(run, sound, { to: (last?.endMs ?? 0) + 500, ...opts });
	return run.finish();
}

/** Each note of `names` sounds from its start to `gap` ms before its end, so the joins are tongued. */
function tongued(
	names: string[],
	gap = 30,
	cents: (i: number) => number = () => 0,
) {
	return spans(
		...names.map((n, i): [number, number, number] => [
			i * 500,
			(i + 1) * 500 - gap,
			hz(n, cents(i)),
		]),
	);
}

const near = (value: number | null | undefined, expected: number) => {
	expect(value).not.toBeNull();
	expect(Math.abs((value as number) - expected)).toBeLessThan(0.05);
};

describe("the constants (AC11)", () => {
	test("are the agreed starting values", () => {
		expect(EDGE_GRACE_MS).toBe(40);
		expect(WRONG_RUN).toBe(3);
		expect(TIMING_TOLERANCE_MS).toBe(60);
		expect(GAP_DIP_DB).toBe(10);
		expect(GAP_MEDIAN_WINDOW_MS).toBe(100);
		expect(MIN_SCORED_SPAN_MS).toBe(50);
		expect(RIGHT_NOTE_BAND_CENTS).toBe(50);
		expect(TRACE_SPAN_CENTS).toBe(150);
		expect(MIN_GRADED_MS).toBe(130);
	});
});

describe("buildTimeline (AC1)", () => {
	test("notes keep their written length, not their slot", () => {
		const t = buildTimeline(
			song([
				["C4", 0, 0.5],
				["D4", 1, 1],
			]),
			TEMPO,
		);
		expect(t.notes.map((n) => [n.index, n.startMs, n.endMs])).toEqual([
			[0, 0, 250],
			[1, 500, 1000],
		]);
		expect(t.notes[0]?.written).toBe(pitch("C4"));
	});

	test("a rest is the gap from one note's end to the next note's start", () => {
		const t = buildTimeline(
			song([
				["C4", 0, 0.5],
				["D4", 1, 1],
			]),
			TEMPO,
		);
		expect(t.rests).toEqual([{ startMs: 250, endMs: 500, graded: true }]);
		expect(t.joins).toEqual([]);
	});

	test("joins are plain or slurred and only between notes with no rest", () => {
		const t = buildTimeline(
			song([
				["C4", 0, 1, true],
				["D4", 1, 1],
				["E4", 2, 0.5, true],
				["F4", 3, 1],
			]),
			TEMPO,
		);
		expect(t.joins).toEqual([
			{ before: 0, after: 1, atMs: 500, kind: "slurred" },
			{ before: 1, after: 2, atMs: 1000, kind: "plain" },
		]);
		expect(t.rests).toHaveLength(1);
	});

	test("a note or rest is graded from the minimum graded length (AC5)", () => {
		const exactly = buildTimeline(
			song([
				["C4", 0, 0.13],
				["D4", 0.13, 0.129],
				["E4", 0.4, 1],
			]),
			60,
		);
		expect(exactly.notes.map((n) => n.graded)).toEqual([true, false, true]);
		expect(exactly.rests.map((r) => r.graded)).toEqual([true]);
		const rest = buildTimeline(
			song([
				["C4", 0, 1],
				["D4", 1.1, 1],
			]),
			60,
		);
		expect(rest.rests.map((r) => r.graded)).toEqual([false]);
	});

	test("eighths are graded at ♩ = 80 and ♩ = 160 and not at ♩ = 240", () => {
		const eighths = song([
			["C4", 0, 0.5],
			["D4", 0.5, 0.5],
		]);
		for (const [tempo, graded] of [
			[80, true],
			[160, true],
			[240, false],
		] as const) {
			expect(buildTimeline(eighths, tempo).notes.map((n) => n.graded)).toEqual([
				graded,
				graded,
			]);
		}
	});
});

describe("classify (AC2)", () => {
	const expected = pitch("C5");
	const reading = (frequency: number | null, extra = {}) => ({
		time: 0,
		frequency,
		clarity: 0.98,
		level: -30,
		...extra,
	});

	test("the expected note is right, in tune within the tolerance, with its cents", () => {
		const inTune = classify(reading(hz("C5", -20)), expected, options);
		expect(inTune.kind).toBe("right");
		if (inTune.kind === "right") {
			expect(inTune.inTune).toBe(true);
			expect(inTune.cents).toBeCloseTo(-20, 5);
		}
		const sagging = classify(reading(hz("C5", -45)), expected, options);
		expect(sagging).toMatchObject({ kind: "right", inTune: false });
	});

	test("another note is pending, with its nearest pitch", () => {
		expect(classify(reading(hz("D5")), expected, options)).toMatchObject({
			kind: "pending",
			nearest: pitch("D5"),
		});
		expect(classify(reading(hz("C5", -60)), expected, options)).toMatchObject({
			kind: "pending",
			nearest: pitch("B4"),
		});
		expect(classify(reading(hz("C6")), expected, options).kind).toBe("pending");
	});

	test("a reading that fails the checks is silent", () => {
		expect(classify(reading(null), expected, options).kind).toBe("silent");
		expect(
			classify(reading(hz("C5"), { clarity: 0.5 }), expected, options).kind,
		).toBe("silent");
		expect(
			classify(reading(hz("C5"), { level: -70 }), expected, options).kind,
		).toBe("silent");
	});

	test("on a rest any sound is pending", () => {
		expect(classify(reading(hz("C5")), null, options).kind).toBe("pending");
		expect(classify(reading(null), null, options).kind).toBe("silent");
	});
});

describe("note coverage (AC3)", () => {
	test("a note played fully scores 1, half about a half, none 0", () => {
		const s = quarters("C4", "D4");
		const full = score(s, tongued(["C4", "D4"]));
		near(full.items[0]?.coverage, 1);
		near(full.items[1]?.coverage, 1);
		const half = score(s, spans([0, 250, hz("C4")], [500, 970, hz("D4")]));
		near(half.items[0]?.coverage, 0.5);
		near(half.items[1]?.coverage, 1);
		const none = score(s, spans([500, 970, hz("D4")]));
		expect(none.items[0]?.coverage).toBe(0);
	});

	test("a note's own length counts, not its slot, so a following rest is not part of it", () => {
		const s = song([
			["C4", 0, 1],
			["D4", 2, 1],
		]);
		const r = score(s, spans([0, 500, hz("C4")], [1000, 1500, hz("D4")]));
		near(r.items[0]?.coverage, 1);
		expect(r.items[1]?.kind).toBe("rest");
	});

	test("a sagging note counts as right in tune, then out of tune, then wrong beyond the band", () => {
		const s = quarters("C4");
		const sound = spans(
			[0, 150, hz("C4", -10)],
			[150, 300, hz("C4", -45)],
			[300, 500, hz("C4", -70)],
		);
		const run = createCoverageRun(buildTimeline(s, TEMPO), options);
		feed(run, sound, { to: 1000 });
		const result = run.finish();
		const kinds = run
			.progress()
			.segments.filter((g) => g.endMs > 0)
			.map((g) => g.kind);
		expect(kinds).toEqual(["right-in-tune", "right-out", "wrong"]);
		// The coverage is the share on the right note, in tune or not: 40 to 300 of 40 to 460.
		near(result.items[0]?.coverage, 260 / 420);
		near(result.items[0]?.inTune, 110 / 260);
	});

	test("release and attack slivers inside the graces are not counted", () => {
		const s = quarters("C4", "D4");
		// D leaks 30 ms into C's end, and C holds 30 ms into D's start.
		const sound = spans([0, 530, hz("C4")], [530, 1000, hz("D4")]);
		const r = score(s, sound);
		near(r.items[0]?.coverage, 1);
		near(r.items[1]?.coverage, 1);
		const early = score(s, spans([0, 470, hz("C4")], [470, 1000, hz("D4")]));
		near(early.items[0]?.coverage, 1);
	});

	test("silence inside a note is unfilled, not wrong", () => {
		const s = quarters("C4");
		const sound = spans([0, 200, hz("C4")], [300, 500, hz("C4")]);
		const run = createCoverageRun(buildTimeline(s, TEMPO), options);
		feed(run, sound, { to: 1000 });
		const r = run.finish();
		near(r.items[0]?.coverage, (160 + 160) / 420);
		expect(run.progress().segments.some((g) => g.kind === "wrong")).toBe(false);
	});
});

describe("wrong notes need a run (AC2)", () => {
	function kindsOf(sound: Sound) {
		const run = createCoverageRun(
			buildTimeline(quarters("C4"), TEMPO),
			options,
		);
		feed(run, sound, { from: 0, to: 700 });
		run.finish();
		return run.progress().segments.map((g) => g.kind);
	}

	test("a blip of one other note stays silent", () => {
		const blip = (t: number) => (t >= 200 && t < 215 ? hz("D4") : hz("C4"));
		expect(kindsOf(blip)).not.toContain("wrong");
	});

	test("the same other note for WRONG_RUN readings in a row is wrong from its first reading", () => {
		const run = createCoverageRun(
			buildTimeline(quarters("C4"), TEMPO),
			options,
		);
		feed(run, (t) => (t >= 200 && t < 200 + 3 * STEP ? hz("D4") : hz("C4")), {
			from: 0,
			to: 700,
		});
		run.finish();
		const wrong = run.progress().segments.filter((g) => g.kind === "wrong");
		expect(wrong).toHaveLength(1);
		expect(wrong[0]?.startMs).toBeGreaterThanOrEqual(200);
		expect(wrong[0]?.startMs).toBeLessThan(200 + STEP);
		const [only] = wrong as [(typeof wrong)[number]];
		expect(only.endMs - only.startMs).toBeGreaterThan(2.5 * STEP);
	});

	test("readings that jump between wrong notes are not confirmed", () => {
		const jumpy = (t: number) =>
			t >= 200 && t < 400
				? hz(Math.floor(t / STEP) % 2 === 0 ? "D4" : "E4")
				: hz("C4");
		expect(kindsOf(jumpy)).not.toContain("wrong");
	});

	test("an octave error is wrong once it lasts", () => {
		expect(kindsOf(() => hz("C5"))).toContain("wrong");
	});
});

describe("rests (AC4)", () => {
	const s = song([
		["C4", 0, 1],
		["D4", 2, 1],
	]);

	test("a rest kept silent scores 1", () => {
		const r = score(s, spans([0, 460, hz("C4")], [1000, 1500, hz("D4")]));
		const rest = r.items.find((i) => i.kind === "rest");
		near(rest?.coverage, 1);
	});

	test("a rest filled with the held note is lowered, and the note ended late", () => {
		const r = score(s, spans([0, 700, hz("C4")], [1000, 1500, hz("D4")]));
		const rest = r.items.find((i) => i.kind === "rest");
		// Silent only from 700 to 960 of 540 to 960.
		near(rest?.coverage, 260 / 420);
		expect(r.timingFaults).toContainEqual({
			index: 0,
			edge: "end",
			kind: "late",
		});
	});

	test("the first and last 40 ms of a rest are not counted", () => {
		// C's release and D's attack both land in the rest's graces.
		const r = score(s, spans([0, 530, hz("C4")], [970, 1500, hz("D4")]));
		near(r.items.find((i) => i.kind === "rest")?.coverage, 1);
	});
});

describe("minimum graded length (AC5)", () => {
	test("a note too short is drawn, not graded, and counted", () => {
		const s = song([
			["C4", 0, 1],
			["D4", 1, 0.1],
			["E4", 1.1, 1],
		]);
		const r = score(s, spans([0, 500, hz("C4")], [550, 1000, hz("E4")]));
		expect(r.tooShort).toBe(1);
		expect(r.items[1]?.graded).toBe(false);
		expect(r.items[1]?.coverage).toBeNull();
		expect(r.graded).toBe(2);
	});

	test("its segments say whether they are in a graded note or rest", () => {
		const s = song([
			["C4", 0, 1],
			["D4", 1, 0.1],
			["E4", 1.1, 1],
		]);
		const run = createCoverageRun(buildTimeline(s, TEMPO), options);
		feed(run, spans([0, 500, hz("C4")], [500, 550, hz("D4")]), { to: 1500 });
		run.finish();
		const segments = run.progress().segments;
		expect(segments.some((g) => g.graded)).toBe(true);
		expect(segments.filter((g) => !g.graded).length).toBeGreaterThan(0);
		for (const g of segments) {
			expect(g.graded).toBe(g.startMs < 500 || g.startMs >= 550);
		}
	});

	test("a rest too short is not graded and has its own count", () => {
		const s = song([
			["C4", 0, 1],
			["D4", 1.1, 1],
		]);
		const r = score(s, spans([0, 500, hz("C4")], [550, 1050, hz("D4")]));
		expect(r.tooShort).toBe(0);
		expect(r.tooShortRests).toBe(1);
	});
});

describe("song figures (AC6)", () => {
	test("coverage is the mean over notes and rests, each counting equally", () => {
		const s = song([
			["C4", 0, 4],
			["D4", 4, 0.3],
		]);
		// The long note is fully played, the short one not at all.
		const r = score(s, spans([0, 2000, hz("C4")]));
		expect(r.graded).toBe(2);
		near(r.coverage, 0.5);
	});

	test("the in-tune share is per note and the song figure is the mean over notes with right-note time", () => {
		const s = quarters("C4", "D4", "E4");
		const sound = spans(
			[0, 470, hz("C4", -10)],
			[500, 970, hz("D4", -40)],
			// E is never played.
		);
		const r = score(s, sound);
		near(r.items[0]?.inTune, 1);
		near(r.items[1]?.inTune, 0);
		expect(r.items[2]?.inTune).toBeNull();
		near(r.inTune, 0.5);
	});

	test("nothing graded gives null figures", () => {
		const r = score(song([["C4", 0, 0.1]]), spans());
		expect(r.graded).toBe(0);
		expect(r.coverage).toBeNull();
		expect(r.inTune).toBeNull();
		expect(r.tooShort).toBe(1);
	});

	test("the written pitch goes through the instrument's transposition", () => {
		const instrument = loadInstrument(alto);
		const transposing: CoverageOptions = {
			...options,
			sounding: (written) => soundingPitch(instrument, written),
		};
		const s = quarters("C4");
		const sounding = toFrequency(soundingPitch(instrument, pitch("C4")));
		const played = score(s, spans([0, 500, sounding]), {
			options: transposing,
		});
		near(played.items[0]?.coverage, 1);
		const written = score(s, spans([0, 500, hz("C4")]), {
			options: transposing,
		});
		expect(written.items[0]?.coverage).toBe(0);
	});
});

describe("timing faults (AC7)", () => {
	const s = quarters("C4", "D4");
	const faults = (r: CoverageResult) =>
		r.timingFaults.map((f) => `${f.index} ${f.edge} ${f.kind}`);

	test("a late start is flagged just past the tolerance, not at it", () => {
		const at = score(s, spans([0, 470, hz("C4")], [500 + 40, 970, hz("D4")]));
		expect(faults(at)).not.toContain("1 start late");
		const past = score(s, spans([0, 470, hz("C4")], [500 + 75, 970, hz("D4")]));
		expect(faults(past)).toContain("1 start late");
	});

	test("an early end is flagged just past the tolerance, not at it", () => {
		const at = score(s, spans([0, 500 - 40, hz("C4")], [500, 970, hz("D4")]));
		expect(faults(at)).not.toContain("0 end early");
		const past = score(s, spans([0, 500 - 80, hz("C4")], [500, 970, hz("D4")]));
		expect(faults(past)).toContain("0 end early");
	});

	test("an early start is flagged when the pitch sounds from before the tolerance", () => {
		const at = score(s, spans([-40, 470, hz("C4")], [500, 970, hz("D4")]));
		expect(faults(at)).not.toContain("0 start early");
		const past = score(s, spans([-90, 470, hz("C4")], [500, 970, hz("D4")]));
		expect(faults(past)).toContain("0 start early");
	});

	test("a late end is flagged when the pitch sounds past the tolerance", () => {
		const at = score(s, spans([0, 500 + 40, hz("C4")], [540, 970, hz("D4")]));
		expect(faults(at)).not.toContain("0 end late");
		const past = score(s, spans([0, 500 + 90, hz("C4")], [590, 970, hz("D4")]));
		expect(faults(past)).toContain("0 end late");
	});

	test("silence inside a note does not move its edges", () => {
		const r = score(
			quarters("C4"),
			spans([0, 150, hz("C4")], [250, 470, hz("C4")]),
		);
		expect(r.timingFaults).toEqual([]);
		expect(r.timing.startedLate).toEqual({ faults: 0, withEdge: 1 });
	});

	test("a change late from one note to the next is both ended late and started late", () => {
		const r = score(s, spans([0, 590, hz("C4")], [590, 970, hz("D4")]));
		expect(faults(r)).toContain("0 end late");
		expect(faults(r)).toContain("1 start late");
	});

	test("the first note can be seen starting early in the count-in", () => {
		const r = score(quarters("C4"), spans([-150, 470, hz("C4")]));
		expect(faults(r)).toEqual(["0 start early"]);
	});

	test("a note never played has no edges and is left out", () => {
		const r = score(s, spans([500, 970, hz("D4")]));
		expect(r.items[0]).toMatchObject({ startEdge: false, endEdge: false });
		expect(r.timing.startedLate.withEdge).toBe(1);
		expect(r.timing.endedEarly.withEdge).toBe(1);
	});

	test("each figure counts faults over the notes that have the edge", () => {
		const r = score(
			quarters("C4", "D4", "E4", "F4"),
			spans(
				[0, 470, hz("C4")],
				[500 + 100, 970, hz("D4")],
				[1000, 1470, hz("E4")],
				// F is never played.
			),
		);
		expect(r.timing.startedLate).toEqual({ faults: 1, withEdge: 3 });
		expect(r.timing.endedEarly).toEqual({ faults: 0, withEdge: 3 });
	});
});

describe("separation (AC8)", () => {
	const same = quarters("C4", "C4");

	test("a silent gap at a plain join, even at the same pitch, is separated", () => {
		const r = score(same, tongued(["C4", "C4"], 40));
		expect(r.separation).toEqual({ notSeparated: 0, plainJoins: 1 });
	});

	test("a note held through a same-pitch join is not separated and has no edge there", () => {
		const r = score(same, spans([0, 970, hz("C4")]));
		expect(r.separation).toEqual({ notSeparated: 1, plainJoins: 1 });
		expect(r.notSeparatedJoins).toEqual([{ before: 0, after: 1, atMs: 500 }]);
		expect(r.items[0]).toMatchObject({ startEdge: true, endEdge: false });
		expect(r.items[1]).toMatchObject({ startEdge: false, endEdge: true });
		expect(r.timingFaults).toEqual([]);
	});

	test("a short dip in the level that recovers counts as a gap, with no silent reading", () => {
		const dip = (t: number) => (t >= 485 && t < 515 ? -60 : -30);
		const r = score(same, spans([0, 970, hz("C4")]), { level: dip });
		expect(r.separation.notSeparated).toBe(0);
	});

	test("a dip outside the tolerance does not count", () => {
		const dip = (t: number) => (t >= 600 && t < 630 ? -60 : -30);
		const r = score(same, spans([0, 970, hz("C4")]), { level: dip });
		expect(r.separation.notSeparated).toBe(1);
	});

	test("a shallow dip does not count", () => {
		const dip = (t: number) => (t >= 485 && t < 515 ? -38 : -30);
		const r = score(same, spans([0, 970, hz("C4")]), { level: dip });
		expect(r.separation.notSeparated).toBe(1);
	});

	test("a fall in the level with no recovery is not a gap", () => {
		const fall = (t: number) => (t >= 480 ? -50 : -30);
		const r = score(same, spans([0, 970, hz("C4")]), { level: fall });
		expect(r.separation.notSeparated).toBe(1);
	});

	test("a tongued join between different notes is separated, and a legato one is not", () => {
		const names = ["C4", "D4"];
		const gap = score(quarters(...names), tongued(names, 40));
		expect(gap.separation.notSeparated).toBe(0);
		const legato = score(
			quarters(...names),
			spans([0, 500, hz("C4")], [500, 970, hz("D4")]),
		);
		expect(legato.separation).toEqual({ notSeparated: 1, plainJoins: 1 });
		// A different pitch still has edges either side of the join.
		expect(legato.items[0]?.endEdge).toBe(true);
		expect(legato.items[1]?.startEdge).toBe(true);
	});
});

describe("slurred joins (AC3, AC8)", () => {
	const names = ["C4", "D4"];
	const slurred = song([
		["C4", 0, 1, true],
		["D4", 1, 1],
	]);

	test("are not checked for separation", () => {
		const r = score(slurred, spans([0, 500, hz("C4")], [500, 970, hz("D4")]));
		expect(r.separation).toEqual({ notSeparated: 0, plainJoins: 0 });
		near(r.items[0]?.coverage, 1);
		near(r.items[1]?.coverage, 1);
	});

	test("a break in a slur counts against the notes, where a plain join would forgive it", () => {
		const broken = spans([0, 440, hz("C4")], [560, 970, hz("D4")]);
		const slur = score(slurred, broken);
		const plain = score(quarters(...names), broken);
		near(plain.items[0]?.coverage, 400 / 420);
		near(slur.items[0]?.coverage, 400 / 460);
		near(plain.items[1]?.coverage, 410 / 420);
		near(slur.items[1]?.coverage, 410 / 460);
	});

	test("the grace at a slurred join forgives the neighbour's pitch but not silence", () => {
		// The change comes 30 ms early: D sounds in C's last grace.
		const early = score(
			slurred,
			spans([0, 470, hz("C4")], [470, 970, hz("D4")]),
		);
		near(early.items[0]?.coverage, 1);
		// Silence in the same grace is not forgiven.
		const silent = score(
			slurred,
			spans([0, 470, hz("C4")], [500, 970, hz("D4")]),
		);
		near(silent.items[0]?.coverage, 430 / 460);
	});

	test("the start side forgives the previous pitch in the same way", () => {
		// C holds 30 ms into D's first grace.
		const late = score(
			slurred,
			spans([0, 530, hz("C4")], [530, 970, hz("D4")]),
		);
		near(late.items[1]?.coverage, 1);
		const silent = score(
			slurred,
			spans([0, 500, hz("C4")], [530, 970, hz("D4")]),
		);
		near(silent.items[1]?.coverage, 430 / 460);
	});

	test("a slurred join at the same pitch has no edge to judge either side", () => {
		const r = score(
			song([
				["C4", 0, 1, true],
				["C4", 1, 1],
			]),
			spans([0, 970, hz("C4")]),
		);
		expect(r.items[0]).toMatchObject({ endEdge: false });
		expect(r.items[1]).toMatchObject({ startEdge: false });
	});
});

describe("tuning list (AC9)", () => {
	test("names up to three pitches outside the tolerance, worst first", () => {
		const names = ["C4", "D4", "E4", "F4", "G4"];
		const offsets = [10, -35, 70, -45, -20];
		const r = score(
			quarters(...names),
			tongued(names, 30, (i) => offsets[i] as number),
		);
		expect(r.tuning.map((t) => t.pitch)).toEqual([
			pitch("E4"),
			pitch("F4"),
			pitch("D4"),
		]);
		expect(r.tuning[0]?.cents).toBeCloseTo(70, 0);
		expect(r.tuning[1]?.cents).toBeCloseTo(-45, 0);
	});

	test("is empty when every pitch is within the tolerance", () => {
		const names = ["C4", "D4"];
		const r = score(
			quarters(...names),
			tongued(names, 30, () => 15),
		);
		expect(r.tuning).toEqual([]);
	});

	test("counts readings beyond the right-note band but not beyond the trace span", () => {
		const r = score(quarters("C4"), spans([0, 500, hz("C4", -200)]));
		expect(r.tuning).toEqual([]);
		const near100 = score(quarters("C4"), spans([0, 500, hz("C4", -100)]));
		expect(near100.tuning[0]?.cents).toBeCloseTo(-100, 0);
	});
});

describe("live progress (AC10)", () => {
	test("segments and faults are reported as notes finish, without changing what was reported", () => {
		const names = ["C4", "D4", "E4"];
		const s = quarters(...names);
		const sound = tongued(names);
		const run = createCoverageRun(buildTimeline(s, TEMPO), options);
		feed(run, sound, { from: -500, to: 600 });
		const early = run.progress();
		const seen = early.segments.length;
		const snapshot = JSON.parse(JSON.stringify(early.segments));
		// The first note is not final yet at 560 ms, its end plus the delay is later.
		feed(run, sound, { from: 600 + STEP, to: 1400 });
		const later = run.progress();
		expect(later.segments).toBe(early.segments);
		expect(later.segments.length).toBeGreaterThan(seen);
		expect(JSON.parse(JSON.stringify(later.segments.slice(0, seen)))).toEqual(
			snapshot,
		);
		expect(later.open.length).toBeGreaterThan(0);
	});

	test("a fault appears when its note is finished", () => {
		const s = quarters("C4", "D4");
		const sound = spans([0, 470, hz("C4")], [620, 970, hz("D4")]);
		const run = createCoverageRun(buildTimeline(s, TEMPO), options);
		feed(run, sound, { from: -100, to: 700 });
		expect(run.progress().timingFaults).toEqual([]);
		feed(run, sound, { from: 700 + STEP, to: 1700 });
		expect(run.progress().timingFaults).toContainEqual({
			index: 1,
			edge: "start",
			kind: "late",
		});
	});

	test("a wrong run confirmed late turns the last readings wrong in the open segments", () => {
		const s = quarters("C4");
		const run = createCoverageRun(buildTimeline(s, TEMPO), options);
		const sound = (t: number) => (t >= 100 ? hz("D4") : hz("C4"));
		feed(run, sound, { from: 0, to: 100 + 2 * STEP });
		expect(run.progress().open.map((g) => g.kind)).not.toContain("wrong");
		feed(run, sound, { from: 100 + 3 * STEP, to: 100 + 4 * STEP });
		expect(run.progress().open.map((g) => g.kind)).toContain("wrong");
	});

	test("each segment's points are the sounding readings with their offsets", () => {
		const run = createCoverageRun(
			buildTimeline(quarters("C4"), TEMPO),
			options,
		);
		feed(run, spans([0, 500, hz("C4", -20)]), { from: 0, to: 1000 });
		run.finish();
		const [segment] = run.progress().segments;
		expect(segment?.kind).toBe("right-in-tune");
		expect(segment?.points.length).toBeGreaterThan(20);
		expect(segment?.points[0]?.cents).toBeCloseTo(-20, 5);
		expect(segment?.on).toBe("note");
	});
});

describe("module rules (AC13)", () => {
	test("imports only core modules and uses no clock, timer or browser API", () => {
		const imports = [
			...coverageSource.matchAll(/from\s+["']([^"']+)["']/g),
		].map((m) => m[1]);
		expect(imports.length).toBeGreaterThan(0);
		for (const spec of imports) {
			expect(["../pitch", "../judge", "../song", "../instrument"]).toContain(
				spec,
			);
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
				new RegExp(`\\b${name.replace(".", "\\.")}\\b`).test(coverageSource),
			).toBe(false);
		}
	});
});
