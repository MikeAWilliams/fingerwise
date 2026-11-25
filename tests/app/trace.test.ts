import { describe, expect, test } from "vitest";
import type { LaneSegment, NoteEnd } from "../../src/app/lane";
import { faultMarks, marksPaths } from "../../src/app/marks";
import {
	emptyPaths,
	type LaneRow,
	REST_BAND,
	rowsToUpdate,
	segmentPaths,
	settledPaths,
	TRACE_COLOURS,
	TRACE_THICKNESS,
	tonePassLengthMs,
	toneSegment,
	traceColour,
	traceY,
} from "../../src/app/trace";
import type {
	JoinFault,
	Segment,
	TimelineNote,
	TimingFault,
} from "../../src/core/coverage";
import { DEFAULT_THRESHOLDS, type Reading } from "../../src/core/judge";
import { toFrequency } from "../../src/core/pitch";
import { rowMap } from "../../src/render/staff";

describe("traceY (F09-S06 AC1, AC3)", () => {
	// A lane from y 100 to 124: centre 112, 12 units for 150 cents.
	const y = (cents: number) => traceY(cents, 100, 124);

	test("in tune is the lane's centre", () => {
		expect(y(0)).toBe(112);
	});

	test("sharp is up and flat is down, linearly", () => {
		expect(y(75)).toBe(106);
		expect(y(-75)).toBe(118);
		expect(y(150)).toBe(100);
		expect(y(-150)).toBe(124);
		expect(y(30)).toBeCloseTo(109.6, 9);
	});

	test("beyond the span it is pinned to the top or bottom edge", () => {
		expect(y(151)).toBe(100);
		expect(y(1200)).toBe(100);
		expect(y(-400)).toBe(124);
	});
});

describe("traceColour (F09-S06 AC2)", () => {
	test("green within the tolerance, amber to 50 cents, red beyond", () => {
		expect(traceColour(0, 25)).toBe("green");
		expect(traceColour(25, 25)).toBe("green");
		expect(traceColour(-25, 25)).toBe("green");
		expect(traceColour(25.1, 25)).toBe("amber");
		expect(traceColour(-40, 25)).toBe("amber");
		expect(traceColour(50, 25)).toBe("amber");
		expect(traceColour(50.1, 25)).toBe("red");
		expect(traceColour(-90, 25)).toBe("red");
		expect(traceColour(300, 25)).toBe("red");
	});

	test("follows the tolerance setting", () => {
		expect(traceColour(40, 25)).toBe("amber");
		expect(traceColour(40, 45)).toBe("green");
	});
});

describe("segmentPaths (F09-S06 AC1 to AC4, AC6)", () => {
	// ♩ = 60: a beat is 1000 ms. One row, beats 0 to 4, x 100 to 300 (50 per beat), lane 100 to 124.
	const row: LaneRow = {
		from: 0,
		to: 4,
		map: rowMap([
			{ x: 100, beat: 0 },
			{ x: 300, beat: 4 },
		]),
		laneTop: 100,
		laneBottom: 124,
	};
	const segment = (over: Partial<Segment>): Segment => ({
		startMs: 0,
		endMs: 1000,
		kind: "right-in-tune",
		on: "note",
		graded: true,
		points: [],
		...over,
	});
	const rect = (x0: number, x1: number, mid: number, thick = TRACE_THICKNESS) =>
		`M${x0} ${mid - thick / 2}H${x1}V${mid + thick / 2}H${x0}Z`;

	test("each sounding reading is a thick line from its time to the next, at its offset's height and colour", () => {
		const paths = segmentPaths(
			[
				segment({
					points: [
						{ timeMs: 0, cents: 0 },
						{ timeMs: 500, cents: -40 },
					],
				}),
			],
			[row],
			60,
			25,
		);
		expect(paths[0]?.green).toBe(rect(100, 125, 112));
		// -40 cents: 3.2 units below the centre; the segment ends at 1000 ms.
		expect(paths[0]?.amber).toBe(rect(125, 150, 115.2));
		expect(paths[0]?.red).toBe("");
	});

	test("a wrong reading within the span is drawn red at its offset, beyond it pinned and red", () => {
		const paths = segmentPaths(
			[
				segment({
					kind: "wrong",
					points: [
						{ timeMs: 0, cents: -90 },
						{ timeMs: 500, cents: 400 },
					],
				}),
			],
			[row],
			60,
			25,
		);
		// -90 cents is 7.2 units below the centre, 119.2.
		expect(paths[0]?.red).toBe(rect(100, 125, 119.2) + rect(125, 150, 101.5));
	});

	test("a line pinned to the bottom edge stays inside the lane", () => {
		const paths = segmentPaths(
			[segment({ kind: "wrong", points: [{ timeMs: 0, cents: -900 }] })],
			[row],
			60,
			25,
		);
		expect(paths[0]?.red).toBe(rect(100, 150, 122.5));
	});

	test("silence on a note leaves the lane as it is", () => {
		const paths = segmentPaths([segment({ kind: "silent" })], [row], 60, 25);
		expect(paths).toEqual([emptyPaths()]);
	});

	test("on a rest, silence is a green band across the middle and sound a red one", () => {
		const paths = segmentPaths(
			[
				segment({ on: "rest", kind: "silent", startMs: 0, endMs: 500 }),
				segment({ on: "rest", kind: "wrong", startMs: 500, endMs: 1000 }),
			],
			[row],
			60,
			25,
		);
		expect(paths[0]?.green).toBe(rect(100, 125, 112, REST_BAND));
		expect(paths[0]?.red).toBe(rect(125, 150, 112, REST_BAND));
	});

	test("a note or rest too short to grade is never filled", () => {
		const paths = segmentPaths(
			[
				segment({ graded: false, points: [{ timeMs: 0, cents: 0 }] }),
				segment({ graded: false, on: "rest", kind: "silent" }),
			],
			[row],
			60,
			25,
		);
		expect(paths).toEqual([emptyPaths()]);
	});

	test("a stretch over a line break is drawn on each row it reaches, and only on rows on show", () => {
		const second: LaneRow = {
			from: 4,
			to: 8,
			map: rowMap([
				{ x: 100, beat: 4 },
				{ x: 300, beat: 8 },
			]),
			laneTop: 200,
			laneBottom: 224,
		};
		const points = [{ timeMs: 3500, cents: 0 }];
		const both = segmentPaths(
			[segment({ startMs: 3000, endMs: 4500, points })],
			[row, second],
			60,
			25,
		);
		expect(both[0]?.green).toBe(rect(275, 300, 112));
		expect(both[1]?.green).toBe(rect(100, 125, 212));
		// With only the second row on show, the first row's part is gone with it.
		const only = segmentPaths(
			[segment({ startMs: 3000, endMs: 4500, points })],
			[second],
			60,
			25,
		);
		expect(only[0]?.green).toBe(rect(100, 125, 212));
	});

	test("time off the rows draws nothing", () => {
		const paths = segmentPaths(
			[
				segment({
					startMs: 9000,
					endMs: 10000,
					points: [{ timeMs: 9000, cents: 0 }],
				}),
			],
			[row],
			60,
			25,
		);
		expect(paths).toEqual([emptyPaths()]);
	});
});

describe("rowsToUpdate (F10-S02 AC6)", () => {
	// ♩ = 60: a beat is 1000 ms. Three rows of four beats.
	const lane = (from: number): LaneRow => ({
		from,
		to: from + 4,
		map: rowMap([
			{ x: 100, beat: from },
			{ x: 300, beat: from + 4 },
		]),
		laneTop: 100,
		laneBottom: 124,
	});
	const rows = [lane(0), lane(4), lane(8)];
	const open = (startMs: number, endMs: number): Segment => ({
		startMs,
		endMs,
		kind: "right-in-tune",
		on: "note",
		graded: true,
		points: [],
	});

	test("an open segment inside the current row gives the current row", () => {
		expect(rowsToUpdate(rows, 1, [open(5000, 6000)], 60)).toEqual([1]);
	});

	test("just after a break, an open segment ending on the row before gives both", () => {
		expect(rowsToUpdate(rows, 1, [open(3000, 4500)], 60)).toEqual([0, 1]);
	});

	test("nothing open gives the current row", () => {
		expect(rowsToUpdate(rows, 2, [], 60)).toEqual([2]);
	});

	test("rows not reached and rows finished are left out", () => {
		expect(rowsToUpdate(rows, 0, [open(0, 1000)], 60)).toEqual([0]);
	});

	test("no playhead row gives only the rows an open segment reaches", () => {
		expect(rowsToUpdate(rows, null, [open(9000, 9500)], 60)).toEqual([2]);
	});
});

describe("settledPaths (F12-S02 AC5, AC6)", () => {
	// ♩ = 60. Row 0 holds beats 0 to 2 (x 100 to 200), row 1 beats 2 to 4 (x 100 to 200).
	const rows: LaneRow[] = [
		{
			from: 0,
			to: 2,
			map: rowMap([
				{ x: 100, beat: 0 },
				{ x: 200, beat: 2 },
			]),
			laneTop: 100,
			laneBottom: 124,
		},
		{
			from: 2,
			to: 4,
			map: rowMap([
				{ x: 100, beat: 2 },
				{ x: 200, beat: 4 },
			]),
			laneTop: 200,
			laneBottom: 224,
		},
	];
	const note = (index: number, startMs: number, cents: number): Segment => ({
		startMs,
		endMs: startMs + 1000,
		kind: "right-in-tune",
		on: "note",
		graded: true,
		points: [{ timeMs: startMs, cents }],
	});
	const segments = [
		note(0, 0, 0),
		note(1, 1000, 30),
		note(2, 2000, -60),
		note(3, 3000, 10),
	];
	const lane = (
		row: number,
		index: number,
		x0: number,
		x1: number,
	): LaneSegment => ({
		row,
		x0,
		x1,
		kind: "note",
		graded: true,
		index,
		starts: true,
		ends: true,
	});
	const laneSegs = [
		lane(0, 0, 100, 150),
		lane(0, 1, 150, 200),
		lane(1, 2, 100, 150),
		lane(1, 3, 150, 200),
	];
	const ends: NoteEnd[] = [
		{ index: 0, row: 0, x: 150 },
		{ index: 1, row: 0, x: 200 },
		{ index: 2, row: 1, x: 150 },
		{ index: 3, row: 1, x: 200 },
	];
	const faults: TimingFault[] = [
		{ index: 0, edge: "start", kind: "late" },
		{ index: 2, edge: "end", kind: "early" },
	];
	const joins: JoinFault[] = [{ before: 1, after: 2, atMs: 2000 }];

	test("equals what the frame loop builds from the same segments in two batches", () => {
		const settled = settledPaths(
			{ segments, timingFaults: faults, notSeparated: joins },
			laneSegs,
			ends,
			rows,
			60,
			25,
		);
		const a = segmentPaths(segments.slice(0, 2), rows, 60, 25);
		const b = segmentPaths(segments.slice(2), rows, 60, 25);
		const fill = rows.map((_, r) => {
			const joined = emptyPaths();
			for (const colour of TRACE_COLOURS) {
				joined[colour] = (a[r]?.[colour] ?? "") + (b[r]?.[colour] ?? "");
			}
			return joined;
		});
		expect(settled.fill).toEqual(fill);
		const m1 = marksPaths(
			faultMarks(faults.slice(0, 1), joins.slice(0, 0), laneSegs, ends),
			rows,
		);
		const m2 = marksPaths(
			faultMarks(faults.slice(1), joins, laneSegs, ends),
			rows,
		);
		expect(settled.marks).toEqual(
			rows.map((_, r) => (m1[r] ?? "") + (m2[r] ?? "")),
		);
		expect(settled.fill.some((p) => p.green !== "")).toBe(true);
		expect(settled.marks.every((m) => m !== "")).toBe(true);
	});

	test("a fill point in a note's release is drawn, though the lane segment ends before it (F15-S03 AC4)", () => {
		// Note 0's lane segment ends at x 130 (its release start); the sound runs to x 190.
		const shortSegs = [lane(0, 0, 100, 130)];
		const inRelease: Segment = {
			startMs: 0,
			endMs: 950,
			kind: "right-in-tune",
			on: "note",
			graded: true,
			points: [
				{ timeMs: 100, cents: 0 },
				{ timeMs: 900, cents: 0 },
			],
		};
		const settled = settledPaths(
			{ segments: [inRelease], timingFaults: [], notSeparated: [] },
			shortSegs,
			[{ index: 0, row: 0, x: 195 }],
			rows,
			60,
			25,
		);
		// The point at 900 ms is at x 190, past the shortened segment.
		const xs = [
			...(settled.fill[0] as { green: string }).green.matchAll(
				/-?\d+(?:\.\d+)?/g,
			),
		].map((m) => Number(m[0]));
		expect(Math.max(...xs)).toBeGreaterThan(130);
	});

	test("nothing scored gives empty paths for every row", () => {
		const settled = settledPaths(
			{ segments: [], timingFaults: [], notSeparated: [] },
			laneSegs,
			ends,
			rows,
			60,
			25,
		);
		expect(settled.fill).toEqual(rows.map(emptyPaths));
		expect(settled.marks).toEqual(["", ""]);
	});
});

describe("tonePassLengthMs (F16-S03 AC4)", () => {
	const note = (releaseMs: number): TimelineNote => ({
		index: 0,
		written: 69 as never,
		startMs: 1000,
		endMs: 1857,
		releaseMs,
		graded: true,
	});

	test("the lane segment: the written length less the release", () => {
		// A quarter at 70: 857 ms written, a 214 ms release, a 643 ms box.
		expect(tonePassLengthMs(note(214))).toBe(643);
	});

	test("a note slurred into the next has no release, so its whole written length", () => {
		expect(tonePassLengthMs(note(0))).toBe(857);
	});
});

describe("toneSegment (F16-S03 AC2)", () => {
	const note: TimelineNote = {
		index: 2,
		written: 69 as never,
		startMs: 2000,
		endMs: 3000,
		releaseMs: 0,
		graded: true,
	};
	const A4 = 69 as never;
	const hz = toFrequency(A4);
	const reading = (time: number, frequency: number | null): Reading => ({
		time,
		frequency,
		clarity: 0.98,
		level: -30,
	});
	const off = (cents: number) => hz * 2 ** (cents / 1200);

	test("null without a tone", () => {
		expect(toneSegment(null, note, A4, DEFAULT_THRESHOLDS)).toBeNull();
		expect(
			toneSegment({ startMs: 0, readings: [] }, note, A4, DEFAULT_THRESHOLDS),
		).toBeNull();
	});

	test("places readings from the note's start by the tone's own time", () => {
		const seg = toneSegment(
			{
				startMs: 10000,
				readings: [
					reading(10000, hz),
					reading(10100, off(20)),
					reading(10200, off(-30)),
				],
			},
			note,
			A4,
			DEFAULT_THRESHOLDS,
		);
		expect(seg).toMatchObject({
			startMs: 2000,
			endMs: 2200,
			on: "note",
			graded: true,
		});
		expect(seg?.points.map((p) => p.timeMs)).toEqual([2000, 2100, 2200]);
		expect(seg?.points[0]?.cents).toBeCloseTo(0, 6);
		expect(seg?.points[1]?.cents).toBeCloseTo(20, 6);
		expect(seg?.points[2]?.cents).toBeCloseTo(-30, 6);
	});

	test("only sounding readings become points", () => {
		const seg = toneSegment(
			{
				startMs: 0,
				readings: [reading(0, hz), reading(100, null), reading(200, hz)],
			},
			note,
			A4,
			DEFAULT_THRESHOLDS,
		);
		expect(seg?.points.map((p) => p.timeMs)).toEqual([2000, 2200]);
	});

	test("is clamped at the note's written end, so a longer tone draws nothing more", () => {
		const readings = Array.from({ length: 30 }, (_, i) => reading(i * 100, hz));
		const seg = toneSegment(
			{ startMs: 0, readings },
			note,
			A4,
			DEFAULT_THRESHOLDS,
		);
		expect(seg?.endMs).toBe(3000);
		expect(Math.max(...(seg?.points.map((p) => p.timeMs) ?? []))).toBeLessThan(
			3000,
		);
		expect(seg?.points).toHaveLength(10);
	});

	test("the colours follow Tempo's through segmentPaths", () => {
		const row: LaneRow = {
			from: 0,
			to: 4,
			map: rowMap([
				{ x: 100, beat: 0 },
				{ x: 300, beat: 4 },
			]),
			laneTop: 100,
			laneBottom: 124,
		};
		const seg = toneSegment(
			{
				startMs: 0,
				readings: [
					reading(0, hz),
					reading(100, off(35)),
					reading(200, off(80)),
					reading(300, null),
				],
			},
			note,
			A4,
			DEFAULT_THRESHOLDS,
		) as Segment;
		// ♩ = 60: the note starts at beat 2.
		const paths = segmentPaths([seg], [row], 60, 25)[0] as Record<
			string,
			string
		>;
		expect(paths.green).not.toBe("");
		expect(paths.amber).not.toBe("");
		expect(paths.red).not.toBe("");
	});
});
