import { Accidental } from "vexflow/bravura";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import type { ClefName } from "../../src/core/instrument";
import { type Pitch, parsePitch } from "../../src/core/pitch";
import {
	buildNote,
	ledgerLines,
	noteLayout,
	type StaffOptions,
	StaffRangeError,
} from "../../src/render/staff/layout";

// Notes are built without a rendering context, so VexFlow warns that it cannot
// measure text. The tests only read the note model; drop that one message.
beforeAll(() => {
	const warn = console.warn.bind(console);
	vi.spyOn(console, "warn").mockImplementation((...args: unknown[]) => {
		if (String(args[0]).includes("No context for txtCanvas")) return;
		warn(...args);
	});
});
afterAll(() => vi.restoreAllMocks());

function p(name: string): Pitch {
	const pitch = parsePitch(name);
	if (pitch === null) throw new Error(`bad pitch ${name}`);
	return pitch;
}

/** Wide range so the range check does not get in the way. */
function wide(clef: ClefName): StaffOptions {
	return {
		clef,
		accidentals: "sharps",
		keySignature: "C",
		lowest: p("C2"),
		highest: p("C7"),
	};
}

function ranged(clef: ClefName, lowest: string, highest: string) {
	return { ...wide(clef), lowest: p(lowest), highest: p(highest) };
}

function noteFor(name: string, opts: StaffOptions) {
	return buildNote(noteLayout(p(name), opts));
}

// Staff lines: 1 = bottom line, 5 = top line, half steps are spaces.
function line(name: string, opts: StaffOptions): number {
	return (noteFor(name, opts).getKeyProps()[0] as { line: number }).line;
}

function sharps(name: string, opts: StaffOptions): string[] {
	return noteFor(name, opts)
		.getModifiersByType(Accidental.CATEGORY)
		.map((m) => (m as Accidental).type);
}

describe("same pitch in each clef (AC2)", () => {
	test("C4: treble line 0, one ledger below", () => {
		const opts = wide("treble");
		expect(noteLayout(p("C4"), opts)).toEqual({
			key: "c/4",
			accidental: null,
			clef: "treble",
			annotation: undefined,
		});
		expect(line("C4", opts)).toBe(0);
		expect(ledgerLines(noteFor("C4", opts))).toBe(1);
	});

	test("C4: treble 8vb, written an octave up on the third space", () => {
		const opts = wide("treble-8vb");
		expect(noteLayout(p("C4"), opts)).toEqual({
			key: "c/5",
			accidental: null,
			clef: "treble",
			annotation: "8vb",
		});
		expect(line("C4", opts)).toBe(3.5);
		expect(ledgerLines(noteFor("C4", opts))).toBe(0);
	});

	test("C4: bass line 6, one ledger above", () => {
		const opts = wide("bass");
		expect(noteLayout(p("C4"), opts)).toEqual({
			key: "c/4",
			accidental: null,
			clef: "bass",
			annotation: undefined,
		});
		expect(line("C4", opts)).toBe(6);
		expect(ledgerLines(noteFor("C4", opts))).toBe(1);
	});

	// Worked by hand: treble E4 = 1, so G3 is three steps below C4 (0);
	// 8vb writes G4, the second line; bass F3 = 4, so G3 is the space above.
	test("G3 in treble, treble 8vb and bass", () => {
		expect(line("G3", wide("treble"))).toBe(-1.5);
		expect(ledgerLines(noteFor("G3", wide("treble")))).toBe(2);
		expect(noteLayout(p("G3"), wide("treble-8vb")).key).toBe("g/4");
		expect(line("G3", wide("treble-8vb"))).toBe(2);
		expect(ledgerLines(noteFor("G3", wide("treble-8vb")))).toBe(0);
		expect(line("G3", wide("bass"))).toBe(4.5);
		expect(ledgerLines(noteFor("G3", wide("bass")))).toBe(0);
	});
});

describe("ledger lines at range limits (AC3)", () => {
	test("fixture range C5..C6 in treble", () => {
		const opts = ranged("treble", "C5", "C6");
		expect(line("C5", opts)).toBe(3.5);
		expect(ledgerLines(noteFor("C5", opts))).toBe(0);
		expect(line("C6", opts)).toBe(7);
		expect(ledgerLines(noteFor("C6", opts))).toBe(2);
		expect(() => noteLayout(p("B4"), opts)).toThrow(StaffRangeError);
		expect(() => noteLayout(p("C♯6"), opts)).toThrow(StaffRangeError);
	});

	test("above-staff limit A5 in treble", () => {
		const opts = ranged("treble", "C5", "A5");
		expect(line("A5", opts)).toBe(6);
		expect(ledgerLines(noteFor("A5", opts))).toBe(1);
		expect(() => noteLayout(p("A♯5"), opts)).toThrow(StaffRangeError);
	});

	test("bass limits E2..C4", () => {
		const opts = ranged("bass", "E2", "C4");
		// G2 is the bottom line; E2 sits on the first ledger line below.
		expect(line("E2", opts)).toBe(0);
		expect(ledgerLines(noteFor("E2", opts))).toBe(1);
		expect(line("C4", opts)).toBe(6);
		expect(ledgerLines(noteFor("C4", opts))).toBe(1);
		expect(() => noteLayout(p("D♯2"), opts)).toThrow(StaffRangeError);
		expect(() => noteLayout(p("C♯4"), opts)).toThrow(StaffRangeError);
	});

	test("bass C2 needs two ledgers below", () => {
		const opts = wide("bass");
		expect(line("C2", opts)).toBe(-1);
		expect(ledgerLines(noteFor("C2", opts))).toBe(2);
	});

	test("treble 8vb limits A2..A4", () => {
		const opts = ranged("treble-8vb", "A2", "A4");
		// Written A3 and A5.
		expect(line("A2", opts)).toBe(-1);
		expect(ledgerLines(noteFor("A2", opts))).toBe(2);
		expect(line("A4", opts)).toBe(6);
		expect(ledgerLines(noteFor("A4", opts))).toBe(1);
		expect(() => noteLayout(p("G♯2"), opts)).toThrow(StaffRangeError);
		expect(() => noteLayout(p("A♯4"), opts)).toThrow(StaffRangeError);
	});
});

describe("sharps in each clef (AC4)", () => {
	const cases: [ClefName, string, string][] = [
		["bass", "F♯3", "f#/3"],
		["treble-8vb", "C♯5", "c#/6"],
		["treble", "G♯5", "g#/5"],
	];
	test.each(cases)("%s %s gets one sharp, key %s", (clef, name, key) => {
		const opts = wide(clef);
		expect(noteLayout(p(name), opts).key).toBe(key);
		expect(sharps(name, opts)).toEqual(["#"]);
	});

	test("sharps at the range limits A♯3..F♯5", () => {
		const opts = ranged("treble", "A♯3", "F♯5");
		expect(noteLayout(p("A♯3"), opts).key).toBe("a#/3");
		expect(sharps("A♯3", opts)).toEqual(["#"]);
		expect(noteLayout(p("F♯5"), opts).key).toBe("f#/5");
		expect(sharps("F♯5", opts)).toEqual(["#"]);
	});
});
