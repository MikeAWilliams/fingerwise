import { Accidental } from "vexflow/bravura";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import { type Pitch, parsePitch } from "../../src/core/pitch";
import {
	ROW_HEIGHT,
	rowFrame,
	STRIP_HEIGHT,
	songHeight,
	splitBeats,
} from "../../src/render/staff";
import {
	buildNote,
	ledgerLines,
	noteDuration,
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

describe("note length", () => {
	test("song lengths map to VexFlow durations", () => {
		expect(noteDuration(4)).toBe("w");
		expect(noteDuration(3)).toBe("hd");
		expect(noteDuration(2)).toBe("h");
		expect(noteDuration(1.5)).toBe("qd");
		expect(noteDuration(1)).toBe("q");
		expect(noteDuration(0.5)).toBe("8");
		expect(noteDuration(0.25)).toBe("16");
	});

	test("a length no single note shows gets the longest that fits", () => {
		expect(noteDuration(5)).toBe("w");
		expect(noteDuration(1 / 3)).toBe("16");
	});

	test("a note is whole by default, or as long as asked", () => {
		const layout = noteLayout(p("C4"), options);
		expect(buildNote(layout).getDuration()).toBe("w");
		expect(buildNote(layout, 1).getDuration()).toBe("q");
	});
});

describe("song lines", () => {
	test("splitBeats breaks a length into note values to tie", () => {
		expect(splitBeats(1)).toEqual([1]);
		expect(splitBeats(2.5)).toEqual([2, 0.5]);
		expect(splitBeats(5)).toEqual([4, 1]);
		expect(splitBeats(1.5)).toEqual([1.5]);
	});

	test("a triplet length stays one note", () => {
		expect(splitBeats(1 / 3)).toEqual([1 / 3]);
	});
});

describe("rows of the whole song (F10-S02 AC3, AC11)", () => {
	const frames = Array.from({ length: 6 }, (_, i) => rowFrame(i));

	test("songHeight and the frames cover six lines", () => {
		expect(frames).toHaveLength(6);
		const last = frames[5] as ReturnType<typeof rowFrame>;
		expect(songHeight(6)).toBeGreaterThanOrEqual(last.laneBottom);
	});

	test("tops increase in order and the first row is at the top", () => {
		expect(frames[0]?.top).toBe(0);
		for (let i = 1; i < frames.length; i++) {
			expect(frames[i]?.top).toBeGreaterThan(frames[i - 1]?.top as number);
		}
	});

	test("the lane sits under its staff", () => {
		for (const f of frames) {
			expect(f.laneTop).toBeGreaterThanOrEqual(f.bottom);
			expect(f.laneBottom).toBeGreaterThan(f.laneTop);
		}
	});

	test("no row overlaps the next", () => {
		for (let i = 1; i < frames.length; i++) {
			expect(frames[i]?.top).toBeGreaterThanOrEqual(
				frames[i - 1]?.laneBottom as number,
			);
		}
	});

	test("a row is ROW_HEIGHT tall and the height grows with the song", () => {
		const f = rowFrame(2);
		expect(f.laneBottom - f.top).toBe(ROW_HEIGHT);
		expect(songHeight(7)).toBeGreaterThan(songHeight(6));
	});
});

describe("the fingering strip (F16-S02 AC3)", () => {
	const frames = Array.from({ length: 6 }, (_, i) => rowFrame(i, true));

	test("every row has a strip of the same height under its lane", () => {
		for (const f of frames) {
			expect(f.stripTop).toBe(f.laneBottom);
			expect(f.stripBottom - f.stripTop).toBe(STRIP_HEIGHT);
		}
	});

	test("without a strip it has no height and sits at the lane's bottom", () => {
		for (let i = 0; i < 6; i++) {
			const f = rowFrame(i);
			expect(f.stripBottom).toBe(f.laneBottom);
			expect(f.stripTop).toBe(f.laneBottom);
		}
		expect(rowFrame(0)).toEqual(rowFrame(0, false));
	});

	test("rows stay evenly spaced and do not overlap", () => {
		const step = (frames[1]?.top as number) - (frames[0]?.top as number);
		expect(step).toBe(ROW_HEIGHT + STRIP_HEIGHT);
		for (let i = 1; i < frames.length; i++) {
			expect((frames[i]?.top as number) - (frames[i - 1]?.top as number)).toBe(
				step,
			);
			expect(frames[i]?.top).toBeGreaterThanOrEqual(
				frames[i - 1]?.stripBottom as number,
			);
		}
	});

	test("the drawing is taller by a strip a row, and the page's height holds the last strip", () => {
		expect(songHeight(6, true) - songHeight(6)).toBe(6 * STRIP_HEIGHT);
		expect(songHeight(6, true)).toBeGreaterThanOrEqual(
			(frames[5] as ReturnType<typeof rowFrame>).stripBottom,
		);
	});
});
