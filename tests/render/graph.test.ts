import { describe, expect, test } from "vitest";
import { type Pitch, parsePitch } from "../../src/core/pitch";
import { formatCents, pitchGraph, SIDE_MARGIN } from "../../src/render/graph";

const WIDTH = 320;
const INNER = WIDTH - 2 * SIDE_MARGIN;

function pitch(name: string): Pitch {
	const p = parsePitch(name);
	if (p === null) throw new Error(`bad pitch ${name}`);
	return p;
}

describe("pitchGraph ticks (AC5)", () => {
	test("five ticks, two semitones either side, labelled by name", () => {
		const g = pitchGraph(pitch("C5"), 0, WIDTH);
		expect(g.ticks.map((t) => t.label)).toEqual([
			"A♯4",
			"B4",
			"C5",
			"C♯5",
			"D5",
		]);
		expect(g.ticks.map((t) => t.x)).toEqual([
			SIDE_MARGIN,
			SIDE_MARGIN + INNER / 4,
			SIDE_MARGIN + INNER / 2,
			SIDE_MARGIN + (3 * INNER) / 4,
			WIDTH - SIDE_MARGIN,
		]);
	});

	test("the expected pitch is at the centre", () => {
		const g = pitchGraph(pitch("A3"), 0, WIDTH);
		expect(g.expectedX).toBe(WIDTH / 2);
		expect(g.played).toEqual({ x: WIDTH / 2, pinned: null });
	});
});

describe("pitchGraph played marker (AC6, AC7)", () => {
	test("midway between C5 and C♯5 sits midway between their ticks", () => {
		const g = pitchGraph(pitch("C5"), 50, WIDTH);
		const c5 = g.ticks[2]?.x as number;
		const cs5 = g.ticks[3]?.x as number;
		expect(g.played.x).toBeCloseTo((c5 + cs5) / 2, 9);
		expect(g.played.pinned).toBeNull();
	});

	test("±200 cents sit on the edge ticks, not pinned", () => {
		expect(pitchGraph(pitch("C5"), 200, WIDTH).played).toEqual({
			x: WIDTH - SIDE_MARGIN,
			pinned: null,
		});
		expect(pitchGraph(pitch("C5"), -200, WIDTH).played).toEqual({
			x: SIDE_MARGIN,
			pinned: null,
		});
	});

	test("beyond the axis is pinned to that edge", () => {
		expect(pitchGraph(pitch("C5"), 201, WIDTH).played).toEqual({
			x: WIDTH - SIDE_MARGIN,
			pinned: "right",
		});
		expect(pitchGraph(pitch("C5"), -201, WIDTH).played).toEqual({
			x: SIDE_MARGIN,
			pinned: "left",
		});
		expect(pitchGraph(pitch("C5"), 1200, WIDTH).played.pinned).toBe("right");
		expect(pitchGraph(pitch("C5"), -1200, WIDTH).played.pinned).toBe("left");
	});
});

describe("offset label (AC5)", () => {
	test("signed and rounded", () => {
		expect(pitchGraph(pitch("C5"), 23.4, WIDTH).offsetLabel).toBe("+23¢");
		expect(pitchGraph(pitch("C5"), -6.6, WIDTH).offsetLabel).toBe("-7¢");
		expect(pitchGraph(pitch("C5"), 1200, WIDTH).offsetLabel).toBe("+1200¢");
	});

	test("zero has no sign, also when it rounds from a negative", () => {
		expect(formatCents(0)).toBe("0¢");
		expect(formatCents(-0.4)).toBe("0¢");
		expect(formatCents(0.4)).toBe("0¢");
	});
});
