import { describe, expect, test } from "vitest";
import alto from "../../data/instruments/ocarina-12-taiwanese.json";
import {
	type AbcResult,
	MAX_ABC_CHARS,
	MAX_ABC_NOTES,
	parseAbc,
} from "../../src/abc";
import { loadInstrument } from "../../src/core/instrument";
import { formatPitch } from "../../src/core/pitch";

const instrument = loadInstrument(alto);

async function parsed(text: string) {
	const result: AbcResult = await parseAbc(text, instrument);
	if (!result.ok) throw new Error(JSON.stringify(result.problems));
	return result;
}

async function names(text: string): Promise<string[]> {
	return (await parsed(text)).song.pitches.map(formatPitch);
}

async function problems(text: string) {
	const result: AbcResult = await parseAbc(text, instrument);
	if (result.ok) throw new Error("expected problems");
	return result.problems;
}

const head = "X:1\nT:t\n";

describe("pitches (AC2)", () => {
	test("C is C4, c is C5, A, is A3", async () => {
		expect(await names(`${head}K:C\nC c A,|`)).toEqual(["C4", "C5", "A3"]);
	});

	test("an octave past the range is a range problem, not a wrong pitch", async () => {
		const found = await problems(`${head}K:C\nC, c'|`);
		expect(found.map((p) => p.message)).toEqual([
			expect.stringContaining("C3 is below"),
			expect.stringContaining("C6 is above"),
		]);
	});
});

describe("key signatures and accidentals (AC3)", () => {
	test("K:G applies F sharp, a natural cancels and carries, the bar line resets", async () => {
		expect(await names(`${head}K:G\nD E F G | F =F F ^F | A B c d |]`)).toEqual(
			[
				"D4",
				"E4",
				"F♯4",
				"G4",
				"F♯4",
				"F4",
				"F4",
				"F♯4",
				"A4",
				"B4",
				"C5",
				"D5",
			],
		);
	});

	test("K:F applies B flat, a marked flat carries, a natural cancels", async () => {
		expect(await names(`${head}K:F\nF G A B | B _B B =B | B c d e |]`)).toEqual(
			[
				"F4",
				"G4",
				"A4",
				"A♯4",
				"A♯4",
				"A♯4",
				"A♯4",
				"B4",
				"A♯4",
				"C5",
				"D5",
				"E5",
			],
		);
	});

	test("a mode: K:Ddor has no sharps", async () => {
		expect(await names(`${head}K:Ddor\nD E F G A B c d|`)).toEqual([
			"D4",
			"E4",
			"F4",
			"G4",
			"A4",
			"B4",
			"C5",
			"D5",
		]);
	});

	test("K:D applies F sharp and C sharp", async () => {
		expect(await names(`${head}K:D\nD F A c|`)).toEqual([
			"D4",
			"F♯4",
			"A4",
			"C♯5",
		]);
	});

	test("a sharp carries within the bar and not to the next octave", async () => {
		expect(await names(`${head}K:C\n^C C c | C|`)).toEqual([
			"C♯4",
			"C♯4",
			"C5",
			"C4",
		]);
	});
});

describe("flats become sharps and the converted count (AC4)", () => {
	test("flats from the key and marked ones count", async () => {
		const result = await parsed(`${head}K:F\nF G A B | B _B B =B | B c d e |]`);
		expect(result.notes).toBe(12);
		// B in bar 1, B _B B in bar 2 (not =B), B in bar 3.
		expect(result.converted).toBe(5);
	});

	test("E sharp, B sharp and double accidentals", async () => {
		const result = await parsed(`${head}K:C\n^E ^B ^^D __B|`);
		expect(result.song.pitches.map(formatPitch)).toEqual([
			"F4",
			"C5",
			"E4",
			"A4",
		]);
		expect(result.converted).toBe(4);
	});

	test("natural sharps and sharps in the key are not converted", async () => {
		const result = await parsed(`${head}K:G\nD F ^c A|`);
		expect(result.converted).toBe(0);
	});

	test("a converted note inside a repeat counts each time it is played", async () => {
		const result = await parsed(`${head}K:F\n|: B A :|`);
		expect(result.notes).toBe(4);
		expect(result.converted).toBe(2);
	});
});

describe("repeats and endings (AC5)", () => {
	test("are played out as written", async () => {
		const result = await parsed(`${head}K:C\n|: C D :|1 E :|2 F |]`);
		expect(result.song.pitches.map(formatPitch)).toEqual([
			"C4",
			"D4",
			"E4",
			"C4",
			"D4",
			"F4",
		]);
		expect(result.notes).toBe(6);
	});
});

describe("things that are ignored (AC6)", () => {
	test("rests, slurs, decorations, chord symbols, lyrics, dynamics, triplets", async () => {
		const text = `${head}K:C\n"Am"!f!(C D) z ~E .F (3GAB|\nw:la la la la la la la\n`;
		expect(await names(text)).toEqual([
			"C4",
			"D4",
			"E4",
			"F4",
			"G4",
			"A4",
			"B4",
		]);
	});

	test("a tie within a bar is one note", async () => {
		expect(await names(`${head}K:C\nC-C D|`)).toEqual(["C4", "D4"]);
	});

	test("a tie across a bar line is one note", async () => {
		expect(await names(`${head}K:C\nC D E-|E F|`)).toEqual([
			"C4",
			"D4",
			"E4",
			"F4",
		]);
	});

	test("a ticked sharp across a tie still ends at the bar line", async () => {
		expect(await names(`${head}K:C\n^C-|C D|`)).toEqual(["C♯4", "D4"]);
	});

	test("note lengths and meter do not change pitches", async () => {
		expect(await names(`${head}M:6/8\nL:1/8\nK:C\nC2 D4 E/ F//|`)).toEqual([
			"C4",
			"D4",
			"E4",
			"F4",
		]);
	});

	test("CRLF, tabs and trailing blank lines are accepted", async () => {
		expect(await names("X:1\r\nK:C\r\nC\tD E\r\n\r\n\r\n")).toEqual([
			"C4",
			"D4",
			"E4",
		]);
	});

	test("a tune without header lines is read", async () => {
		expect(await names("C D E|")).toEqual(["C4", "D4", "E4"]);
	});
});

describe("rejections with positions (AC7)", () => {
	test("a chord, with line, note number and column", async () => {
		const [problem, ...rest] = await problems(`${head}K:C\nC D [EG] F|`);
		expect(rest).toEqual([]);
		expect(problem).toMatchObject({ line: 4, note: 3, column: 5 });
		expect(problem?.message).toMatch(/chord/i);
	});

	test("the line is counted with CRLF endings too", async () => {
		const [problem] = await problems("X:1\r\nK:C\r\nC D [EG] F|");
		expect(problem).toMatchObject({ line: 3, note: 3 });
	});

	test("a grace note", async () => {
		const [problem] = await problems(`${head}K:C\nC {A}D|`);
		expect(problem).toMatchObject({ line: 4, note: 2 });
		expect(problem?.message).toMatch(/grace/i);
	});

	test("a second voice", async () => {
		const [problem] = await problems(`${head}K:C\nV:1\nCDE|\nV:2\nGGG|\n`);
		expect(problem?.message).toMatch(/voice/i);
		expect(problem?.line).toBe(7);
	});

	test("more than one tune", async () => {
		const [problem] = await problems("X:1\nK:C\nCDE|\n\nX:2\nK:C\nGGG|\n");
		expect(problem?.message).toMatch(/one tune/i);
		expect(problem?.line).toBe(5);
	});

	test.each(["D.C.", "D.S.", "fine", "coda", "segno"])(
		"the %s mark",
		async (mark) => {
			const [problem] = await problems(`${head}K:C\nC !${mark}!D|`);
			expect(problem).toMatchObject({ line: 4, note: 2 });
			expect(problem?.message).toContain(mark);
		},
	);

	test("a mark on a bar line has a line and column", async () => {
		const [problem] = await problems(`${head}K:C\nC D !fine!|]`);
		expect(problem).toMatchObject({ line: 4 });
		expect(problem?.note).toBeUndefined();
	});

	test.each(["", "X:1\nK:C\n", "X:1\nK:C\nz z|"])(
		"no notes: %j",
		async (text) => {
			const [problem] = await problems(text);
			expect(problem?.message).toMatch(/no notes/i);
		},
	);

	test("several problems are listed in text order", async () => {
		const found = await problems(`${head}K:C\n[CE] D {A}F|`);
		expect(found.map((p) => p.note)).toEqual([1, 3]);
	});
});

describe("limits (AC7)", () => {
	test("text over the character limit is rejected before parsing", async () => {
		const [problem] = await problems(
			`${head}K:C\n${"C ".repeat(MAX_ABC_CHARS)}`,
		);
		expect(problem?.message).toContain(String(MAX_ABC_CHARS));
	});

	test("500 notes pass", async () => {
		const result = await parsed(`${head}K:C\n${"C D E F|".repeat(125)}`);
		expect(result.notes).toBe(MAX_ABC_NOTES);
	});

	test("501 notes are rejected at the 501st", async () => {
		const [problem] = await problems(`${head}K:C\n${"C D E F|".repeat(125)}C|`);
		expect(problem).toMatchObject({ line: 4, note: 501 });
		expect(problem?.message).toContain(String(MAX_ABC_NOTES));
	});

	test("the limit counts repeats", async () => {
		const [problem] = await problems(`${head}K:C\n|: ${"C ".repeat(300)}:|`);
		expect(problem).toMatchObject({ note: 201 });
	});
});

describe("range (AC8)", () => {
	test("each offender is listed with its pitch, position and side", async () => {
		const found = await problems(`${head}K:C\nC C, D c'|`);
		expect(found).toHaveLength(2);
		expect(found[0]).toMatchObject({ line: 4, note: 2, column: 3 });
		expect(found[0]?.message).toContain("C3 is below the written range");
		expect(found[1]).toMatchObject({ line: 4, note: 4, column: 8 });
		expect(found[1]?.message).toContain("C6 is above the written range");
	});

	test("the ends of the range pass", async () => {
		expect(await names(`${head}K:C\nA, f|`)).toEqual(["A3", "F5"]);
	});
});

describe("warnings and failures (AC9)", () => {
	test("plain prose gives plain warnings with line and column", async () => {
		const found = await problems("X:1\nK:C\nCDE|\nzz\nhello world\n");
		expect(found.length).toBeGreaterThan(0);
		expect(found[0]).toMatchObject({ line: 5, column: 1 });
		for (const p of found) {
			expect(p.message).not.toMatch(/[<>]/);
		}
		expect(found[0]?.message).toBe('Unknown character "h" ignored');
	});

	test("a length after a space names the stray character", async () => {
		const found = await problems(`${head}K:C\nE D C D | E E E 2 |`);
		expect(found).toEqual([
			{ message: 'Unknown character "2" ignored', line: 4, column: 17 },
		]);
	});

	test("a long list of warnings is cut short", async () => {
		const found = await problems(`${head}K:C\n${"qwxyz ".repeat(30)}`);
		expect(found.length).toBeLessThanOrEqual(11);
		expect(found.at(-1)?.message).toMatch(/more problem/);
	});

	test("odd input never throws and never gives a song for nothing", async () => {
		for (const text of [
			"|||",
			"[[[",
			"X:",
			"K:",
			"{{{{",
			"&&&&",
			"\u0000",
			"!!!!",
		]) {
			const result = await parseAbc(text, instrument);
			if (result.ok) expect(result.song.pitches.length).toBeGreaterThan(0);
			else expect(result.problems.length).toBeGreaterThan(0);
		}
	});
});

async function rhythm(text: string) {
	const { song } = await parsed(text);
	return song.notes.map((n) => [formatPitch(n.pitch), n.start, n.beats]);
}

describe("note lengths (F08-S01 AC4)", () => {
	test("quarter, eighth, half and dotted notes in quarter-note beats", async () => {
		expect(await rhythm(`${head}L:1/4\nK:C\nC D/ E/ F2 G3/2 A/|`)).toEqual([
			["C4", 0, 1],
			["D4", 1, 0.5],
			["E4", 1.5, 0.5],
			["F4", 2, 2],
			["G4", 4, 1.5],
			["A4", 5.5, 0.5],
		]);
	});

	test("a tie joins two notes into one", async () => {
		expect(await rhythm(`${head}L:1/4\nK:C\nC2- C D|`)).toEqual([
			["C4", 0, 3],
			["D4", 3, 1],
		]);
	});

	test("a triplet is written thirds of a beat", async () => {
		const notes = await rhythm(`${head}L:1/8\nK:C\n(3CDE F2|`);
		expect(notes.map((n) => n[0])).toEqual(["C4", "D4", "E4", "F4"]);
		const third = 1 / 3;
		expect(notes[0]?.[1]).toBeCloseTo(0);
		expect(notes[1]?.[1]).toBeCloseTo(third);
		expect(notes[2]?.[1]).toBeCloseTo(2 * third);
		expect(notes[3]?.[1]).toBeCloseTo(1);
		for (const n of notes.slice(0, 3)) expect(n[2]).toBeCloseTo(third);
		expect(notes[3]?.[2]).toBeCloseTo(1);
	});

	test("a rest between notes leaves a gap; rests before the first note are dropped", async () => {
		expect(await rhythm(`${head}L:1/4\nK:C\nz2 C z D|`)).toEqual([
			["C4", 0, 1],
			["D4", 2, 1],
		]);
	});

	test("a repeat with first and second endings plays out with its starts", async () => {
		expect(await rhythm(`${head}L:1/4\nK:C\nC D |1 E F :|2 G A|]`)).toEqual([
			["C4", 0, 1],
			["D4", 1, 1],
			["E4", 2, 1],
			["F4", 3, 1],
			["C4", 4, 1],
			["D4", 5, 1],
			["G4", 6, 1],
			["A4", 7, 1],
		]);
	});
});

describe("tempo (F08-S01 AC5)", () => {
	const tempoOf = async (q: string) =>
		(await parsed(`${head}${q}K:C\nC D|`)).song.tempo;

	test("Q:1/4=120 is 120", async () => {
		expect(await tempoOf("Q:1/4=120\n")).toBe(120);
	});

	test("Q:3/8=60 is 90", async () => {
		expect(await tempoOf("Q:3/8=60\n")).toBe(90);
	});

	test("Q:1/2=60 is 120", async () => {
		expect(await tempoOf("Q:1/2=60\n")).toBe(120);
	});

	test("no Q: gives null and the tune is valid", async () => {
		const result = await parsed(`${head}K:C\nC D|`);
		expect(result.ok).toBe(true);
		expect(result.song.tempo).toBeNull();
	});
});

describe("meter (F08-S01 AC6)", () => {
	const meterOf = async (m: string) =>
		(await parsed(`${head}${m}K:C\nC D|`)).song.meter;

	test("no M: is 4/4", async () => {
		expect(await meterOf("")).toEqual({ beats: 4, unit: 4 });
	});

	test("M:none is 4/4", async () => {
		expect(await meterOf("M:none\n")).toEqual({ beats: 4, unit: 4 });
	});

	test("M:C is 4/4", async () => {
		expect(await meterOf("M:C\n")).toEqual({ beats: 4, unit: 4 });
	});

	test("M:C| is 2/2", async () => {
		expect(await meterOf("M:C|\n")).toEqual({ beats: 2, unit: 2 });
	});

	test("M:6/8 is 6/8", async () => {
		expect(await meterOf("M:6/8\n")).toEqual({ beats: 6, unit: 8 });
	});

	test("a compound top number falls back to 4/4", async () => {
		expect(await meterOf("M:2+3/8\n")).toEqual({ beats: 4, unit: 4 });
	});
});

describe("a later Q: or M: (F08-S01 AC7)", () => {
	test("a second Q: line and an inline Q: leave the first tempo and the written lengths", async () => {
		const text = `${head}M:4/4\nL:1/8\nQ:1/4=120\nK:C\nCDEF|\nQ:1/4=60\nGABc|[Q:1/4=30] cdef|`;
		const result = await parsed(text);
		expect(result.song.tempo).toBe(120);
		expect(result.song.notes.map((n) => n.beats)).toEqual(Array(12).fill(0.5));
		expect(result.song.notes.map((n) => n.start)).toEqual(
			Array.from({ length: 12 }, (_, i) => i / 2),
		);
	});

	test("a second M: is ignored and reports no problem", async () => {
		const result = await parsed(`${head}M:3/4\nK:C\nC D E|\nM:6/8\nF G A|`);
		expect(result.song.meter).toEqual({ beats: 3, unit: 4 });
	});
});
