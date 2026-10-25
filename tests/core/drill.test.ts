import { describe, expect, test } from "vitest";
import alto from "../../data/instruments/ocarina-12-taiwanese.json";
import {
	buildPool,
	DrillError,
	drawPitch,
	fullRange,
	type RandomSource,
} from "../../src/core/drill";
import drillSource from "../../src/core/drill/index.ts?raw";
import { loadInstrument } from "../../src/core/instrument";
import { formatPitch, type Pitch, parsePitch } from "../../src/core/pitch";

const instrument = loadInstrument(alto);

function pitch(name: string): Pitch {
	const p = parsePitch(name);
	if (p === null) throw new Error(`bad pitch ${name}`);
	return p;
}

function names(pool: Pitch[]): string[] {
	return pool.map(formatPitch);
}

/** Returns `i / n` for `i` in `0..n-1`, one per call. */
function stepping(n: number): RandomSource {
	let i = 0;
	return () => (i++ % n) / n;
}

describe("buildPool (AC1)", () => {
	test("full range with sharps is all 21 pitches A3..F5", () => {
		const pool = buildPool(instrument, {
			...fullRange(instrument),
			includeSharps: true,
		});
		expect(pool).toHaveLength(21);
		expect(pool[0]).toBe(pitch("A3"));
		expect(pool[20]).toBe(pitch("F5"));
	});

	test("full range without sharps is exactly the 13 naturals", () => {
		const pool = buildPool(instrument, {
			...fullRange(instrument),
			includeSharps: false,
		});
		expect(names(pool)).toEqual([
			"A3",
			"B3",
			"C4",
			"D4",
			"E4",
			"F4",
			"G4",
			"A4",
			"B4",
			"C5",
			"D5",
			"E5",
			"F5",
		]);
	});

	test("a sub-range with and without sharps", () => {
		const range = { lowest: pitch("C4"), highest: pitch("E4") };
		expect(
			names(buildPool(instrument, { ...range, includeSharps: true })),
		).toEqual(["C4", "C♯4", "D4", "D♯4", "E4"]);
		expect(
			names(buildPool(instrument, { ...range, includeSharps: false })),
		).toEqual(["C4", "D4", "E4"]);
	});

	test("bounds outside the instrument or inverted throw DrillError", () => {
		const bad = [
			{ lowest: pitch("G3"), highest: pitch("C4") },
			{ lowest: pitch("C4"), highest: pitch("F♯5") },
			{ lowest: pitch("E4"), highest: pitch("C4") },
		];
		for (const range of bad) {
			expect(() =>
				buildPool(instrument, { ...range, includeSharps: true }),
			).toThrow(DrillError);
		}
	});

	test("an empty pool throws DrillError", () => {
		const p = pitch("C♯4");
		expect(() =>
			buildPool(instrument, { lowest: p, highest: p, includeSharps: false }),
		).toThrow(DrillError);
	});
});

describe("drawPitch", () => {
	const pool = buildPool(instrument, {
		...fullRange(instrument),
		includeSharps: true,
	});

	test("AC2: every candidate is returned exactly once, with and without a previous", () => {
		for (const previous of [null, pool[3] as Pitch]) {
			const candidates = pool.filter((p) => p !== previous);
			const random = stepping(candidates.length);
			const drawn = candidates.map(() => drawPitch(pool, previous, random));
			expect(drawn).toEqual(candidates);
		}
	});

	test("AC2: a random just below 1 stays in bounds", () => {
		const drawn = drawPitch(pool, null, () => 0.9999999999999999);
		expect(drawn).toBe(pool[pool.length - 1]);
	});

	test("AC3: never returns the previous pitch", () => {
		for (const previous of pool) {
			for (let i = 0; i < 40; i++) {
				const drawn = drawPitch(pool, previous, () => i / 40);
				expect(drawn).not.toBe(previous);
			}
		}
	});

	test("AC3: a pool of two alternates", () => {
		const two = [pitch("C4"), pitch("D4")];
		expect(drawPitch(two, two[0] as Pitch, () => 0.5)).toBe(two[1]);
		expect(drawPitch(two, two[1] as Pitch, () => 0.5)).toBe(two[0]);
	});

	test("AC4: a pool of one returns it again", () => {
		const one = [pitch("C4")];
		expect(drawPitch(one, pitch("C4"), () => 0.5)).toBe(pitch("C4"));
		expect(drawPitch(one, null, () => 0.5)).toBe(pitch("C4"));
	});

	test("an empty pool throws DrillError", () => {
		expect(() => drawPitch([], null, () => 0)).toThrow(DrillError);
	});
});

describe("AC10: imports and randomness", () => {
	test("imports exactly ../pitch and ../instrument", () => {
		const specifiers = [...drillSource.matchAll(/from\s+["']([^"']+)["']/g)]
			.map((m) => m[1])
			.sort();
		expect(specifiers).toEqual(["../instrument", "../pitch"]);
	});

	test("never calls Math.random", () => {
		expect(drillSource).not.toContain("Math.random");
	});
});
