import { describe, expect, test } from "vitest";
import {
	buildPool,
	DrillError,
	drawPitch,
	fullRange,
	type RandomSource,
} from "../../src/core/drill";
import {
	glyphFor,
	loadInstrument,
	soundingPitch,
} from "../../src/core/instrument";
import { formatPitch, type Pitch, parsePitch } from "../../src/core/pitch";
import { fontFamilyFor, tabView } from "../../src/render/tab";
import fixture from "../fixtures/instruments/fixture-6-hole.json";

// AC1: an instrument unlike the alto C goes through the loader, the drill and the tab renderer.
const instrument = loadInstrument(fixture);

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

// Written independently of the JSON.
const EXPECTED_GLYPHS: [string, string][] = [
	["C5", "c5"],
	["C♯5", "c#5"],
	["D5", "d5"],
	["D♯5", "d#5"],
	["E5", "e5"],
	["F5", "f5"],
	["F♯5", "f#5"],
	["G5", "g5"],
	["G♯5", "g#5"],
	["A5", "a5"],
	["A♯5", "a#5"],
	["B5", "b5"],
	["C6", "c6"],
];

describe("loader (AC1)", () => {
	test("accepts the fixture with its own fields", () => {
		expect(instrument.holes).toBe(6);
		expect(instrument.fingeringStyle).toBe("japanese");
		expect(instrument.defaultClef).toBe("bass");
		expect(formatPitch(instrument.lowest)).toBe("C5");
		expect(formatPitch(instrument.highest)).toBe("C6");
		expect(instrument.transposition).toBe(0);
		expect(instrument.tablatureFont).toBe("Fixture-Font.ttf");
		expect(instrument.glyphs.size).toBe(13);
	});

	test("glyphFor returns each fixture glyph", () => {
		for (const [name, glyph] of EXPECTED_GLYPHS) {
			expect(glyphFor(instrument, pitch(name)), name).toBe(glyph);
		}
	});

	test("sounding pitch uses transposition 0", () => {
		expect(formatPitch(soundingPitch(instrument, pitch("C5")))).toBe("C5");
	});
});

describe("drill (AC1)", () => {
	test("full range is the 13 chromatic pitches C5..C6", () => {
		const pool = buildPool(instrument, {
			...fullRange(instrument),
			includeSharps: true,
		});
		expect(names(pool)).toEqual(EXPECTED_GLYPHS.map(([name]) => name));
	});

	test("sharps off gives the 8 naturals", () => {
		const pool = buildPool(instrument, {
			...fullRange(instrument),
			includeSharps: false,
		});
		expect(names(pool)).toEqual([
			"C5",
			"D5",
			"E5",
			"F5",
			"G5",
			"A5",
			"B5",
			"C6",
		]);
	});

	test("a sub-range works", () => {
		const pool = buildPool(instrument, {
			lowest: pitch("E5"),
			highest: pitch("G5"),
			includeSharps: true,
		});
		expect(names(pool)).toEqual(["E5", "F5", "F♯5", "G5"]);
	});

	test("a range outside C5..C6 throws DrillError", () => {
		const bad = [
			{ lowest: pitch("B4"), highest: pitch("C6") },
			{ lowest: pitch("C5"), highest: pitch("C♯6") },
			// Inside the alto C range, outside the fixture's.
			{ lowest: pitch("A3"), highest: pitch("F5") },
		];
		for (const range of bad) {
			expect(() =>
				buildPool(instrument, { ...range, includeSharps: true }),
			).toThrow(DrillError);
		}
	});

	test("drawPitch reaches every pitch and never repeats", () => {
		const pool = buildPool(instrument, {
			...fullRange(instrument),
			includeSharps: true,
		});
		const seen = new Set<Pitch>();
		for (const previous of [null, ...pool]) {
			const candidates = pool.filter((p) => p !== previous);
			const random = stepping(candidates.length);
			for (const _ of candidates) {
				const next = drawPitch(pool, previous, random);
				expect(pool).toContain(next);
				expect(next).not.toBe(previous);
				seen.add(next);
			}
		}
		expect(seen.size).toBe(pool.length);
	});
});

describe("tab renderer (AC1)", () => {
	test("font family comes from the fixture's font file", () => {
		expect(fontFamilyFor(instrument.tablatureFont)).toBe("Fixture-Font");
	});

	test("every pitch in range shows its fixture glyph", () => {
		const family = fontFamilyFor(instrument.tablatureFont);
		for (const [name, glyph] of EXPECTED_GLYPHS) {
			const text = glyphFor(instrument, pitch(name));
			expect(text, name).toBeDefined();
			expect(tabView(text as string, { family, status: "loaded" })).toEqual({
				kind: "glyph",
				text: glyph,
				fontFamily: "Fixture-Font",
			});
		}
	});
});
