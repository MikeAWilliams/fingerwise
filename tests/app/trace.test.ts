import { describe, expect, test } from "vitest";
import type { LaneSegment } from "../../src/app/lane";
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
	traceColour,
	traceY,
} from "../../src/app/trace";
import type { JoinFault, Segment, TimingFault } from "../../src/core/coverage";
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
	const faults: TimingFault[] = [
		{ index: 0, edge: "start", kind: "late" },
		{ index: 2, edge: "end", kind: "early" },
	];
	const joins: JoinFault[] = [{ before: 1, after: 2, atMs: 2000 }];

	test("equals what the frame loop builds from the same segments in two batches", () => {
		const settled = settledPaths(
			{ segments, timingFaults: faults, notSeparated: joins },
			laneSegs,
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
			faultMarks(faults.slice(0, 1), joins.slice(0, 0), laneSegs),
			rows,
		);
		const m2 = marksPaths(faultMarks(faults.slice(1), joins, laneSegs), rows);
		expect(settled.marks).toEqual(
			rows.map((_, r) => (m1[r] ?? "") + (m2[r] ?? "")),
		);
		expect(settled.fill.some((p) => p.green !== "")).toBe(true);
		expect(settled.marks.every((m) => m !== "")).toBe(true);
	});

	test("nothing scored gives empty paths for every row", () => {
		const settled = settledPaths(
			{ segments: [], timingFaults: [], notSeparated: [] },
			laneSegs,
			rows,
			60,
			25,
		);
		expect(settled.fill).toEqual(rows.map(emptyPaths));
		expect(settled.marks).toEqual(["", ""]);
	});
});
