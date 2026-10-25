import { Accidental } from "vexflow/bravura";
import { describe, expect, test } from "vitest";
import { type Pitch, parsePitch } from "../../src/core/pitch";
import {
	buildNote,
	ledgerLines,
	noteLayout,
	type StaffOptions,
	StaffRangeError,
} from "../../src/render/staff/layout";

function p(name: string): Pitch {
	const pitch = parsePitch(name);
	if (pitch === null) throw new Error(`bad pitch ${name}`);
	return pitch;
}

const options: StaffOptions = {
	clef: "treble",
	accidentals: "sharps",
	keySignature: "C",
	lowest: p("A3"),
	highest: p("F5"),
};

function noteFor(name: string, opts: StaffOptions = options) {
	return buildNote(noteLayout(p(name), opts));
}

function line(name: string): number {
	return (noteFor(name).getKeyProps()[0] as { line: number }).line;
}

describe("staff position (AC2)", () => {
	test("E4 sits on the bottom line", () => expect(line("E4")).toBe(1));
	test("F5 sits on the top line", () => expect(line("F5")).toBe(5));
	test("C5 sits in the third space", () => expect(line("C5")).toBe(3.5));
});

describe("accidentals (AC3)", () => {
	test("F♯4 has a sharp", () => {
		const layout = noteLayout(p("F♯4"), options);
		expect(layout.key).toBe("f#/4");
		const mods = noteFor("F♯4").getModifiersByType(Accidental.CATEGORY);
		expect(mods).toHaveLength(1);
		expect((mods[0] as Accidental).type).toBe("#");
	});

	test("E4 has none", () => {
		expect(noteFor("E4").getModifiersByType(Accidental.CATEGORY)).toHaveLength(
			0,
		);
	});
});

describe("ledger lines (AC4)", () => {
	test("A3 needs two", () => {
		expect(line("A3")).toBe(-1);
		expect(ledgerLines(noteFor("A3"))).toBe(2);
	});
	test("C4 needs one", () => expect(ledgerLines(noteFor("C4"))).toBe(1));
	test("E4 and F5 need none", () => {
		expect(ledgerLines(noteFor("E4"))).toBe(0);
		expect(ledgerLines(noteFor("F5"))).toBe(0);
	});
});

describe("range (AC5)", () => {
	test("a pitch outside the range throws", () => {
		expect(() => noteLayout(p("G3"), options)).toThrow(StaffRangeError);
		expect(() => noteLayout(p("F♯5"), options)).toThrow(StaffRangeError);
	});
	test("narrowing lowest makes A3 throw", () => {
		expect(() => noteLayout(p("A3"), { ...options, lowest: p("C4") })).toThrow(
			StaffRangeError,
		);
	});
});
