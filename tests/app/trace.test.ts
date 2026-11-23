import { describe, expect, test } from "vitest";
import {
	emptyPaths,
	type LaneRow,
	REST_BAND,
	segmentPaths,
	TRACE_THICKNESS,
	traceColour,
	traceY,
} from "../../src/app/trace";
import type { Segment } from "../../src/core/coverage";
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
