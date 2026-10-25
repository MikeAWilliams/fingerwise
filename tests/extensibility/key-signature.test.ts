import { Accidental, Clef, KeySignature, type Stave } from "vexflow/bravura";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import type { ClefName } from "../../src/core/instrument";
import {
	isNatural,
	type Pitch,
	parsePitch,
	pitchesInRange,
} from "../../src/core/pitch";
import {
	buildNote,
	buildStave,
	type KeySignature as KeyName,
	noteLayout,
	type StaffOptions,
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

const CLEFS: ClefName[] = ["treble", "treble-8vb", "bass"];

function inC(clef: ClefName): StaffOptions {
	return {
		clef,
		accidentals: "sharps",
		keySignature: "C",
		lowest: p("A3"),
		highest: p("F5"),
	};
}

/** Key specs of the stave's key signature modifiers (built without a rendering context). */
function keySpecs(stave: Stave): string[] {
	return stave
		.getModifiers(undefined, KeySignature.CATEGORY)
		.map((m) => (m as unknown as { keySpec: string }).keySpec);
}

function accidentalMods(pitch: Pitch, opts: StaffOptions): string[] {
	return buildNote(noteLayout(pitch, opts))
		.getModifiersByType(Accidental.CATEGORY)
		.map((m) => (m as Accidental).type);
}

describe("C major is unchanged (AC7)", () => {
	test.each(CLEFS)("%s: sharps get one #, naturals none", (clef) => {
		const opts = inC(clef);
		for (const pitch of pitchesInRange(opts.lowest, opts.highest)) {
			const expected = isNatural(pitch) ? [] : ["#"];
			expect(noteLayout(pitch, opts).accidental).toBe(
				isNatural(pitch) ? null : "#",
			);
			expect(accidentalMods(pitch, opts)).toEqual(expected);
		}
	});

	test.each(CLEFS)("%s: the stave has only the clef", (clef) => {
		const stave = buildStave(noteLayout(p("C4"), inC(clef)), 0, 0, 200);
		expect(keySpecs(stave)).toEqual([]);
		expect(stave.getModifiers(undefined, Clef.CATEGORY)).toHaveLength(1);
	});
});

describe("key signature on the stave (AC5)", () => {
	test("C draws no signature", () => {
		const stave = buildStave(noteLayout(p("C4"), inC("treble")), 0, 0, 200);
		expect(keySpecs(stave)).toEqual([]);
	});

	test.each(["G", "D"] as KeyName[])("%s draws its signature", (key) => {
		const opts = { ...inC("treble"), keySignature: key };
		const stave = buildStave(noteLayout(p("C4"), opts), 0, 0, 200);
		expect(keySpecs(stave)).toEqual([key]);
	});
});

describe("accidentals follow the key (AC5)", () => {
	const cases: [KeyName, string, "#" | "n" | null][] = [
		["G", "F♯4", null],
		["G", "F4", "n"],
		["G", "C♯5", "#"],
		["G", "C5", null],
		["D", "C♯5", null],
		["D", "C5", "n"],
		["C", "F♯4", "#"],
	];
	test.each(cases)("in %s, %s gets %s", (key, name, accidental) => {
		const opts = { ...inC("treble"), keySignature: key };
		expect(noteLayout(p(name), opts).accidental).toBe(accidental);
		expect(accidentalMods(p(name), opts)).toEqual(
			accidental ? [accidental] : [],
		);
	});
});
