import { describe, expect, test } from "vitest";
import { rowMap, type Stop } from "../../src/render/staff";

/**
 * A hand-built row: the line starts at x 40 after the clef, a quarter note at
 * x 50 (beat 0), a quarter rest at 100 (beat 1), a half note at 150 (beat 2),
 * the bar line at 200 (beat 4), then a note at 230 (beat 4) and the next bar
 * line at 300 (beat 8).
 */
const stops: Stop[] = [
	{ x: 40, beat: 0 },
	{ x: 50, beat: 0 },
	{ x: 100, beat: 1 },
	{ x: 150, beat: 2 },
	{ x: 200, beat: 4 },
	{ x: 230, beat: 4 },
	{ x: 300, beat: 8 },
];
const map = rowMap(stops);

describe("the row map (AC2)", () => {
	test("each stop's beat gives its x, and a note takes its own x, not the line start's or the bar line's", () => {
		expect(map.beatToX(0)).toBe(50);
		expect(map.beatToX(1)).toBe(100);
		expect(map.beatToX(2)).toBe(150);
		expect(map.beatToX(4)).toBe(230);
		expect(map.beatToX(8)).toBe(300);
	});

	test("x is linear in time between stops", () => {
		expect(map.beatToX(0.5)).toBe(75);
		expect(map.beatToX(3)).toBe(175);
		expect(map.beatToX(6)).toBe(265);
	});

	test("a note's span starts at its own x and ends where the next note, rest or bar line begins", () => {
		expect(map.span(0, 1)).toEqual({ x0: 50, x1: 100 });
		expect(map.span(1, 2)).toEqual({ x0: 100, x1: 150 });
		// The half note ends at the bar line, not at the next bar's first note.
		expect(map.span(2, 4)).toEqual({ x0: 150, x1: 200 });
		expect(map.span(4, 8)).toEqual({ x0: 230, x1: 300 });
	});

	test("a span that crosses a bar line runs from its start to the end past the line", () => {
		expect(map.span(2, 6)).toEqual({ x0: 150, x1: 265 });
	});

	test("the line starts at its first note, after the clef and key signature", () => {
		expect(map.beatToX(0)).toBeGreaterThan(40);
		expect(map.span(0, 4).x0).toBe(50);
	});

	test("beats outside the row are clamped to it", () => {
		expect(map.beatToX(-3)).toBe(50);
		expect(map.beatToX(20)).toBe(300);
		expect(map.span(-2, 20)).toEqual({ x0: 50, x1: 300 });
	});

	test("the count-in's negative beats map before the first note", () => {
		const row = rowMap([
			{ x: 40, beat: -4 },
			{ x: 45, beat: -4 },
			{ x: 65, beat: -3 },
			{ x: 85, beat: -2 },
			{ x: 100, beat: 0 },
			{ x: 110, beat: 0 },
		]);
		expect(row.beatToX(-4)).toBe(45);
		expect(row.beatToX(-3.5)).toBe(55);
		expect(row.beatToX(-1)).toBe(92.5);
		expect(row.beatToX(0)).toBe(110);
	});

	test("a single stop maps every beat to its x", () => {
		const row = rowMap([{ x: 10, beat: 0 }]);
		expect(row.beatToX(5)).toBe(10);
		expect(row.span(1, 2)).toEqual({ x0: 10, x1: 10 });
	});
});
