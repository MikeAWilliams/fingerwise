import { describe, expect, test } from "vitest";
import type { LaneSegment } from "../../src/app/lane";
import {
	faultMarks,
	MARK_HEIGHT,
	MARK_LABELS,
	type Mark,
	markPath,
	marksPaths,
} from "../../src/app/marks";
import {
	buildTimeline,
	type CoverageOptions,
	createCoverageRun,
} from "../../src/core/coverage";
import { DEFAULT_THRESHOLDS } from "../../src/core/judge";
import type { Pitch } from "../../src/core/pitch";
import { createSong, DEFAULT_METER } from "../../src/core/song";

const seg = (
	index: number,
	x0: number,
	x1: number,
	over: Partial<LaneSegment> = {},
): LaneSegment => ({
	row: 0,
	x0,
	x1,
	kind: "note",
	graded: true,
	index,
	starts: true,
	ends: true,
	...over,
});

// Two notes: 0 from x 20 to 60, 1 from 60 to 100, on one row.
const segments = [seg(0, 20, 60), seg(1, 60, 100)];

describe("faultMarks (F09-S07 AC1 to AC4)", () => {
	test("each of the four timing faults gives its own shape at its edge", () => {
		const marks = faultMarks(
			[
				{ index: 0, edge: "start", kind: "late" },
				{ index: 0, edge: "start", kind: "early" },
				{ index: 1, edge: "end", kind: "early" },
				{ index: 1, edge: "end", kind: "late" },
			],
			[],
			segments,
		);
		expect(marks).toEqual([
			{ row: 0, x: 20, shape: "start-late" },
			{ row: 0, x: 20, shape: "start-early" },
			{ row: 0, x: 100, shape: "end-early" },
			{ row: 0, x: 100, shape: "end-late" },
		]);
		expect(new Set(marks.map((m) => m.shape)).size).toBe(4);
	});

	test("the four shapes draw differently: by edge and by pointer, not colour", () => {
		const paths = (
			["start-early", "start-late", "end-early", "end-late"] as const
		).map((shape) => markPath({ row: 0, x: 50, shape }, 100, 124));
		expect(new Set(paths).size).toBe(4);
		// All four sit in the lane's top quarter.
		for (const d of paths) {
			for (const [, y] of d.matchAll(/ (\d+(?:\.\d+)?)(?=[HLZ])/g)) {
				expect(Number(y)).toBeGreaterThanOrEqual(100);
				expect(Number(y)).toBeLessThanOrEqual(100 + MARK_HEIGHT);
			}
		}
	});

	test("a pointer faces left for early and right for late, inside the note", () => {
		const tip = (shape: Mark["shape"]) => {
			const d = markPath({ row: 0, x: 50, shape }, 100, 124);
			// The triangle's middle point is the one at the mid height, 103.
			return Number(/L([\d.]+) 103/.exec(d)?.[1]);
		};
		// At the start edge the pointer is to the right of the edge, at the end edge to the left.
		expect(tip("start-late")).toBeGreaterThan(tip("start-early"));
		expect(tip("end-late")).toBeGreaterThan(tip("end-early"));
		expect(tip("start-early")).toBeGreaterThan(50);
		expect(tip("end-late")).toBeLessThan(50);
	});

	test("a not-separated join gives a mark at the join, between notes of the same pitch too", () => {
		const marks = faultMarks(
			[],
			[{ before: 0, after: 1, atMs: 500 }],
			segments,
		);
		expect(marks).toEqual([{ row: 0, x: 60, shape: "not-separated" }]);
		const d = markPath(marks[0] as Mark, 100, 124);
		// In the lane's bottom quarter, with a cross.
		expect(d).toContain("L");
		for (const [, y] of d.matchAll(/ (\d+(?:\.\d+)?)(?=[HLZM])/g)) {
			expect(Number(y)).toBeGreaterThanOrEqual(124 - MARK_HEIGHT - 3);
			expect(Number(y)).toBeLessThanOrEqual(124);
		}
	});

	test("the timing marks keep above the trace's centre line, the join mark below it", () => {
		const lane = { top: 100, bottom: 124, centre: 112 };
		const timing = markPath(
			{ row: 0, x: 50, shape: "end-late" },
			lane.top,
			lane.bottom,
		);
		const join = markPath(
			{ row: 0, x: 50, shape: "not-separated" },
			lane.top,
			lane.bottom,
		);
		const maxY = (d: string) =>
			Math.max(
				...[...d.matchAll(/ (\d+(?:\.\d+)?)/g)].map((m) => Number(m[1])),
			);
		const minY = (d: string) =>
			Math.min(
				...[...d.matchAll(/ (\d+(?:\.\d+)?)/g)].map((m) => Number(m[1])),
			);
		expect(maxY(timing)).toBeLessThan(lane.centre);
		expect(minY(join)).toBeGreaterThan(lane.centre);
	});

	test("a note continued from or carried to another row has its edges only where they are", () => {
		const across = [
			seg(0, 80, 120, { row: 0, ends: false }),
			seg(0, 20, 60, { row: 1, starts: false }),
		];
		const marks = faultMarks(
			[
				{ index: 0, edge: "start", kind: "late" },
				{ index: 0, edge: "end", kind: "late" },
			],
			[],
			across,
		);
		expect(marks).toEqual([
			{ row: 0, x: 80, shape: "start-late" },
			{ row: 1, x: 60, shape: "end-late" },
		]);
		// With only the second row on show, the start edge has gone with its row.
		expect(
			faultMarks(
				[{ index: 0, edge: "start", kind: "late" }],
				[],
				[across[1] as LaneSegment],
			),
		).toEqual([]);
	});

	test("a join whose first note is off the rows is marked at the next note's start", () => {
		const only = [seg(1, 20, 60, { row: 1 })];
		expect(faultMarks([], [{ before: 0, after: 1, atMs: 500 }], only)).toEqual([
			{ row: 1, x: 20, shape: "not-separated" },
		]);
	});

	test("rests have no marks and no faults give none", () => {
		expect(faultMarks([], [], segments)).toEqual([]);
		expect(
			faultMarks(
				[{ index: 0, edge: "start", kind: "late" }],
				[],
				[seg(0, 20, 60, { kind: "rest" })],
			),
		).toEqual([]);
	});

	test("marksPaths gathers each row's marks", () => {
		const paths = marksPaths(
			[
				{ row: 0, x: 50, shape: "end-late" },
				{ row: 1, x: 70, shape: "not-separated" },
			],
			[
				{ laneTop: 100, laneBottom: 124 },
				{ laneTop: 200, laneBottom: 224 },
			],
		);
		expect(paths[0]).toBe(
			markPath({ row: 0, x: 50, shape: "end-late" }, 100, 124),
		);
		expect(paths[1]).toBe(
			markPath({ row: 1, x: 70, shape: "not-separated" }, 200, 224),
		);
	});
});

describe("the legend (F09-S07)", () => {
	test("names every shape the lane can draw, once, in plain words", () => {
		expect(Object.keys(MARK_LABELS).sort()).toEqual([
			"end-early",
			"end-late",
			"not-separated",
			"start-early",
			"start-late",
		]);
		expect(new Set(Object.values(MARK_LABELS)).size).toBe(5);
		expect(MARK_LABELS["start-late"]).toBe("Started late");
		expect(MARK_LABELS["not-separated"]).toBe("Not separated");
	});
});

describe("what the core reports (F09-S07 AC3, AC4)", () => {
	const options: CoverageOptions = {
		toleranceCents: 25,
		checks: DEFAULT_THRESHOLDS,
		sounding: (p) => p,
	};
	const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

	/** Plays `sound` (song ms to frequency) through the core and returns its result. */
	function result(slurred: boolean, sound: (ms: number) => number | null) {
		const song = createSong(
			[
				{ pitch: 60 as Pitch, start: 0, beats: 1, slurred },
				{ pitch: 60 as Pitch, start: 1, beats: 1 },
				{ pitch: 62 as Pitch, start: 2, beats: 1 },
			],
			{ tempo: 120, meter: DEFAULT_METER },
		);
		const run = createCoverageRun(buildTimeline(song, 120), options);
		for (let t = -100; t < 2200; t += 16.7) {
			const f = sound(t);
			run.pushReading(
				f === null
					? { time: t, frequency: null, clarity: 0, level: -70 }
					: { time: t, frequency: f, clarity: 0.98, level: -30 },
			);
		}
		return run.finish();
	}

	test("a slurred join and a note never played give no marks", () => {
		// C held through the slurred join and into the second note, then nothing.
		const r = result(true, (t) => (t >= 0 && t < 1000 ? hz(60) : null));
		const segs = [seg(0, 20, 60), seg(1, 60, 100), seg(2, 100, 140)];
		const marks = faultMarks(r.timingFaults, r.notSeparatedJoins, segs);
		// The slurred join between the first two notes is never reported.
		expect(r.notSeparatedJoins.every((j) => j.before !== 0)).toBe(true);
		expect(marks.every((m) => m.x !== 60 || m.shape !== "not-separated")).toBe(
			true,
		);
		// The third note was never played: no timing mark at its edges.
		expect(r.timingFaults.some((f) => f.index === 2)).toBe(false);
		expect(marks.some((m) => m.x === 140)).toBe(false);
	});

	test("the same notes with a plain join are reported not separated when played through", () => {
		const r = result(false, (t) => (t >= 0 && t < 1000 ? hz(60) : null));
		expect(r.notSeparatedJoins).toEqual([{ before: 0, after: 1, atMs: 500 }]);
		const segs = [seg(0, 20, 60), seg(1, 60, 100), seg(2, 100, 140)];
		expect(faultMarks([], r.notSeparatedJoins, segs)).toEqual([
			{ row: 0, x: 60, shape: "not-separated" },
		]);
	});
});
