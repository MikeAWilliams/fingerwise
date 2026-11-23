import { describe, expect, test } from "vitest";
import { playheadBeat, playheadPlace } from "../../src/app/playhead";
import type { RowLayout, Stop } from "../../src/render/staff";

describe("playheadBeat (F09-S05 AC1, AC3, AC7)", () => {
	// ♩ = 60, so a beat is a second; the first note starts at 10 s.
	test("is the heard time: the clock less the output latency less the origin", () => {
		expect(playheadBeat(10, 0.04, 10, 60)).toBeCloseTo(-0.04, 9);
		expect(playheadBeat(10.04, 0.04, 10, 60)).toBeCloseTo(0, 9);
		expect(playheadBeat(12.54, 0.04, 10, 60)).toBeCloseTo(2.5, 9);
	});

	test("is negative through the count-in, in time with the clicks", () => {
		// The count-in's first click is 4 beats before the origin.
		expect(playheadBeat(6, 0, 10, 60)).toBe(-4);
		expect(playheadBeat(8, 0, 10, 60)).toBe(-2);
	});

	test("follows the tempo", () => {
		expect(playheadBeat(11, 0, 10, 120)).toBe(2);
		expect(playheadBeat(11, 0, 10, 70)).toBeCloseTo(70 / 60, 9);
	});

	test("without a reported latency, or on the page clock, nothing is taken off", () => {
		expect(playheadBeat(12, null, 10, 60)).toBe(2);
		// The page clock in seconds, as the flow's fallback uses.
		expect(playheadBeat(1000.5, null, 998.5, 90)).toBeCloseTo(3, 9);
	});
});

function row(line: number, stops: Stop[]): RowLayout {
	return {
		line,
		row: line % 2,
		top: 0,
		bottom: 0,
		laneTop: 0,
		laneBottom: 0,
		stops,
		notes: new Map(),
	};
}

describe("playheadPlace (F09-S05 AC2, AC3, AC4)", () => {
	const rows = [
		row(0, [
			{ x: 0, beat: -4 },
			{ x: 10, beat: -4 },
			{ x: 30, beat: -3 },
			{ x: 50, beat: -2 },
			{ x: 70, beat: -1 },
			{ x: 90, beat: 0 },
			{ x: 100, beat: 0 },
			{ x: 140, beat: 1 },
			{ x: 180, beat: 2 },
			{ x: 200, beat: 4 },
		]),
		row(1, [
			{ x: 0, beat: 4 },
			{ x: 20, beat: 4 },
			{ x: 80, beat: 6 },
			{ x: 120, beat: 8 },
		]),
	];

	test("is at each note's x when the note is due", () => {
		expect(playheadPlace(0, rows)).toEqual({ row: 0, x: 100 });
		expect(playheadPlace(1, rows)).toEqual({ row: 0, x: 140 });
		expect(playheadPlace(2, rows)).toEqual({ row: 0, x: 180 });
		expect(playheadPlace(6, rows)).toEqual({ row: 1, x: 80 });
	});

	test("moves between notes in proportion to time", () => {
		expect(playheadPlace(0.5, rows)).toEqual({ row: 0, x: 120 });
		expect(playheadPlace(5, rows)).toEqual({ row: 1, x: 50 });
	});

	test("runs through the count-in's rests in time", () => {
		expect(playheadPlace(-4, rows)).toEqual({ row: 0, x: 10 });
		expect(playheadPlace(-3, rows)).toEqual({ row: 0, x: 30 });
		expect(playheadPlace(-2.5, rows)).toEqual({ row: 0, x: 40 });
		expect(playheadPlace(-1, rows)).toEqual({ row: 0, x: 70 });
	});

	test("glides over a bar line instead of jumping across it at the new bar's first beat", () => {
		// The bar line is at x 90 and the first note after it at x 100, both at beat 0.
		const before = playheadPlace(-0.01, rows)?.x as number;
		const after = playheadPlace(0, rows)?.x as number;
		expect(after - before).toBeLessThan(1);
		expect(playheadPlace(-0.5, rows)).toEqual({ row: 0, x: 85 });
		// Within a bar, and at a row's end, nothing changes.
		expect(playheadPlace(3.99, rows)?.x).toBeCloseTo(199.9, 1);
	});

	test("waits at the start of the first row before the count-in", () => {
		expect(playheadPlace(-6, rows)).toEqual({ row: 0, x: 10 });
	});

	test("jumps to the first note of the other row at the end of a line", () => {
		expect(playheadPlace(3.99, rows)?.row).toBe(0);
		expect(playheadPlace(4, rows)).toEqual({ row: 1, x: 20 });
	});

	test("waits at the end of the last row", () => {
		expect(playheadPlace(9, rows)).toEqual({ row: 1, x: 120 });
	});

	test("has no place without rows", () => {
		expect(playheadPlace(0, [])).toBeNull();
	});
});
