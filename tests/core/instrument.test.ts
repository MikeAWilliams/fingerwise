import { describe, expect, test } from "vitest";
import alto from "../../data/instruments/ocarina-12-taiwanese.json";
import {
	glyphFor,
	type Instrument,
	InstrumentError,
	loadInstrument,
	soundingPitch,
} from "../../src/core/instrument";
import { formatPitch, type Pitch, parsePitch } from "../../src/core/pitch";

function pitch(name: string): Pitch {
	const p = parsePitch(name);
	if (p === null) throw new Error(`bad pitch ${name}`);
	return p;
}

// Written independently of the JSON, from docs/research/ocarina-fingering-data.md.
const EXPECTED_GLYPHS: [string, string][] = [
	["A3", "A"],
	["A♯3", "B"],
	["B3", "C"],
	["C4", "D"],
	["C♯4", "E"],
	["D4", "F"],
	["D♯4", "G"],
	["E4", "H"],
	["F4", "I"],
	["F♯4", "J"],
	["G4", "K"],
	["G♯4", "L"],
	["A4", "M"],
	["A♯4", "N"],
	["B4", "O"],
	["C5", "P"],
	["C♯5", "Q"],
	["D5", "R"],
	["D♯5", "S"],
	["E5", "T"],
	["F5", "U"],
];

// biome-ignore lint/suspicious/noExplicitAny: test mutates a deep copy of the JSON
function copy(): any {
	return structuredClone(alto);
}

const altoC: Instrument = loadInstrument(alto);

describe("alto C file", () => {
	test("AC3: loads with the expected fields", () => {
		expect(altoC.name).toBe("12-hole alto C ocarina");
		expect(altoC.family).toBe("ocarina");
		expect(altoC.holes).toBe(12);
		expect(altoC.fingeringStyle).toBe("taiwanese");
		expect(altoC.defaultClef).toBe("treble");
		expect(formatPitch(altoC.lowest)).toBe("A3");
		expect(formatPitch(altoC.highest)).toBe("F5");
		expect(altoC.transposition).toBe(12);
		expect(altoC.tablatureFont).toBe("Open-12-Hole-Ocarina-1.ttf");
		expect(altoC.glyphs.size).toBe(21);
	});

	test("AC4: every pitch maps to the research glyph", () => {
		expect(EXPECTED_GLYPHS).toHaveLength(21);
		for (const [name, glyph] of EXPECTED_GLYPHS) {
			expect(glyphFor(altoC, pitch(name)), name).toBe(glyph);
		}
	});

	test("glyphFor is undefined outside the range", () => {
		expect(glyphFor(altoC, pitch("G5"))).toBeUndefined();
	});

	test("AC2: sounding pitch is written plus transposition", () => {
		expect(formatPitch(soundingPitch(altoC, pitch("A3")))).toBe("A4");
	});
});

describe("rejections", () => {
	test("AC5: missing transposition names the field", () => {
		const bad = copy();
		delete bad.transposition;
		expect(() => loadInstrument(bad)).toThrow(InstrumentError);
		expect(() => loadInstrument(bad)).toThrow(/transposition/);
	});

	test("AC5: non-integer transposition", () => {
		const bad = copy();
		bad.transposition = 1.5;
		expect(() => loadInstrument(bad)).toThrow(/transposition/);
	});

	test("AC6: missing glyph names the pitch", () => {
		const bad = copy();
		delete bad.tablature.glyphs["C♯4"];
		expect(() => loadInstrument(bad)).toThrow(/C♯4/);
	});

	test("AC7: lowest equal to highest", () => {
		const bad = copy();
		bad.writtenRange.highest = "A3";
		expect(() => loadInstrument(bad)).toThrow(InstrumentError);
	});

	test("AC7: lowest above highest", () => {
		const bad = copy();
		bad.writtenRange = { lowest: "F5", highest: "A3" };
		expect(() => loadInstrument(bad)).toThrow(InstrumentError);
	});

	test("AC7: glyph outside the range", () => {
		const bad = copy();
		bad.tablature.glyphs.G5 = "V";
		expect(() => loadInstrument(bad)).toThrow(/G5/);
	});

	test("AC7: non-canonical glyph key", () => {
		const bad = copy();
		bad.tablature.glyphs["C#4"] = "E";
		expect(() => loadInstrument(bad)).toThrow(/C#4/);
	});

	test("raw that is not an object", () => {
		expect(() => loadInstrument(null)).toThrow(InstrumentError);
		expect(() => loadInstrument("alto")).toThrow(InstrumentError);
		expect(() => loadInstrument([])).toThrow(InstrumentError);
	});

	const fieldCases: [string, (o: ReturnType<typeof copy>) => void][] = [
		["name", (o) => delete o.name],
		["family", (o) => (o.family = "")],
		["holes", (o) => (o.holes = 0)],
		["holes", (o) => (o.holes = "12")],
		["fingeringStyle", (o) => (o.fingeringStyle = "korean")],
		["defaultClef", (o) => delete o.defaultClef],
		["writtenRange", (o) => delete o.writtenRange],
		["writtenRange.lowest", (o) => (o.writtenRange.lowest = "H1")],
		["writtenRange.highest", (o) => delete o.writtenRange.highest],
		["tablature", (o) => delete o.tablature],
		["tablature.font", (o) => delete o.tablature.font],
		["tablature.glyphs", (o) => (o.tablature.glyphs = "ABC")],
		["tablature.glyphs.A3", (o) => (o.tablature.glyphs.A3 = "")],
	];
	test.each(fieldCases)("bad %s names the field", (field, mutate) => {
		const bad = copy();
		mutate(bad);
		expect(() => loadInstrument(bad)).toThrow(
			new RegExp(field.replace(/\./g, "\\.")),
		);
	});
});
