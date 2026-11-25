import { describe, expect, test } from "vitest";
import alto from "../../data/instruments/ocarina-12-taiwanese.json";
import {
	type AbcResult,
	type DroppedTune,
	isDroppedTune,
	loadAbcFile,
	MAX_ABC_CHARS,
	MAX_ABC_NOTES,
	type ParsedTune,
	parseAbc,
} from "../../src/abc";
import { loadInstrument } from "../../src/core/instrument";
import { formatPitch } from "../../src/core/pitch";

const instrument = loadInstrument(alto);

async function parsedAll(text: string) {
	const result: AbcResult = await parseAbc(text, instrument);
	if (!result.ok) throw new Error(JSON.stringify(result.problems));
	return result.tunes as ParsedTune[];
}

/** The first tune of a text that passes. */
async function parsed(text: string) {
	return (await parsedAll(text))[0] as Awaited<
		ReturnType<typeof parsedAll>
	>[number];
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

	test("a second tune is no longer a problem (F14-S01 AC1)", async () => {
		const tunes = await parsedAll("X:1\nK:C\nCDE|\n\nX:2\nK:C\nGGG|\n");
		expect(tunes).toHaveLength(2);
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
			{
				message: 'Unknown character "2" ignored',
				line: 4,
				column: 17,
				kind: "ABC errors",
			},
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
			if (result.ok)
				expect(
					(result.tunes[0] as ParsedTune).song.pitches.length,
				).toBeGreaterThan(0);
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
		expect(result.song.tempo).toBeNull();
	});
});

describe("title (F10-S01 AC1)", () => {
	const titleOf = async (header: string) =>
		(await parsed(`X:1\n${header}K:C\nC D|`)).song.title;

	test("the T: text is trimmed", async () => {
		expect(await titleOf("T:   Ode to Joy  \n")).toBe("Ode to Joy");
	});

	test("no T: gives no title", async () => {
		expect(await titleOf("")).toBeUndefined();
	});

	test("a blank T: gives no title", async () => {
		expect(await titleOf("T:   \n")).toBeUndefined();
	});

	test("the first of two T: lines wins", async () => {
		expect(await titleOf("T:First\nT:Second\n")).toBe("First");
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

describe("the first bar", () => {
	const firstBar = async (body: string) =>
		(await parsed(`${head}M:4/4\nL:1/4\nK:C\n${body}`)).song.firstBar;

	test("a tune that starts on the bar line has a whole first bar", async () => {
		expect(await firstBar("C D E F|G A B c|")).toBe(4);
	});

	test("a one-beat pickup gives a one-beat first bar", async () => {
		expect(await firstBar("C|D E F G|")).toBe(1);
	});

	test("a leading rest is not counted: the bar runs from the first note", async () => {
		expect(await firstBar("z C D E|F G A B|")).toBe(3);
	});

	test("a triplet pickup counts as its played length", async () => {
		expect(await firstBar("(3C/D/E/|F G A B|")).toBe(1);
	});

	test("a tune with no bar line has a whole first bar", async () => {
		expect(await firstBar("C D E")).toBe(4);
	});

	test("6/8 bars are three quarters long", async () => {
		const result = await parsed(`${head}M:6/8\nL:1/8\nK:C\nC|DEF GAB|`);
		expect(result.song.firstBar).toBe(0.5);
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

describe("slurs (F09-S01)", () => {
	/** The slurred flags of each note as T or F, e.g. "TTFF". */
	async function slurs(body: string): Promise<string> {
		const { song } = await parsed(`${head}K:C\n${body}`);
		return song.notes.map((n) => (n.slurred ? "T" : "F")).join("");
	}

	test.each([
		["(CDE) F", "TTFF"],
		["((CD)E)", "TTF"],
		["(C D)(E F)", "TFTF"],
		["(CD|EF) G", "TTTFF"],
		["(CD\nEF) G", "TTTFF"],
		["(3(CDE) F", "TTFF"],
		["(C2-C2) D", "FF"],
		["(C2-|C2 D) E", "TFF"],
		[".(CDE) F", "TTFF"],
		["C !tenuto!D E", "FFF"],
		["|:C(D:|1 E) F:|2 G", "FTFFFFF"],
		["(C z D) E", "FFF"],
	])("%s gives %s (AC2, AC3)", async (body, flags) => {
		expect(await slurs(body)).toBe(flags);
	});

	test("a repeated slurred passage has the same flags on both plays, and the join back is not slurred (AC4)", async () => {
		expect(await slurs("|:(C D) E:|")).toBe("TFFTFF");
	});

	test("a slur still open at the end is a problem at the note that opened it (AC5)", async () => {
		const found = await problems(`${head}K:C\nC (D E F|]`);
		expect(found).toEqual([
			{
				message: "Slur opened here is never closed",
				line: 4,
				note: 2,
				column: expect.any(Number),
				kind: "unmatched slur",
			},
		]);
		expect(found[0]?.column).toBeLessThanOrEqual(4);
	});

	test("the innermost unclosed slur is the one reported (AC5)", async () => {
		const found = await problems(`${head}K:C\n(C (D E) F|]`);
		expect(found.map((p) => [p.message, p.note])).toEqual([
			["Slur opened here is never closed", 1],
		]);
	});

	test("a close with nothing open is a problem at the closing note (AC6)", async () => {
		const found = await problems(`${head}K:C\nC D) E|]`);
		expect(found).toEqual([
			{
				message: "Slur closed here was never opened",
				kind: "unmatched slur",
				line: 4,
				note: 2,
				column: 3,
			},
		]);
	});

	test("a tune without slurs has no slurred notes and the same song as before (AC7)", async () => {
		const { song } = await parsed(
			"X:1\nT:t\nM:3/4\nQ:1/4=100\nL:1/4\nK:C\nC D E | F G A |]",
		);
		expect(song.notes.every((n) => n.slurred === false)).toBe(true);
		expect(song.notes.map((n) => [n.start, n.beats])).toEqual([
			[0, 1],
			[1, 1],
			[2, 1],
			[3, 1],
			[4, 1],
			[5, 1],
		]);
		expect(song.tempo).toBe(100);
		expect(song.meter).toEqual({ beats: 3, unit: 4 });
		expect(song.firstBar).toBe(3);
	});
});

describe("several tunes (F14-S01)", () => {
	const tune = (n: number, body: string, title = `T${n}`, extra = "") =>
		`X:${n}\nT:${title}\n${extra}K:C\n${body}`;
	const two = `${tune(1, "C D E F|", "One", "Q:100\nM:3/4\n")}\n\n${tune(2, "G A B c|", "Two", "Q:60\n")}\n`;

	test("two tunes: each tune's own notes, title, tempo and meter (AC1, AC7)", async () => {
		const tunes = await parsedAll(two);
		expect(tunes).toHaveLength(2);
		const [a, b] = tunes as [(typeof tunes)[0], (typeof tunes)[0]];
		expect(a.song.pitches.map(formatPitch)).toEqual(["C4", "D4", "E4", "F4"]);
		// With no L:, the unit is an eighth: a half beat each.
		expect(a.song.notes.map((n) => [n.start, n.beats])).toEqual([
			[0, 0.5],
			[0.5, 0.5],
			[1, 0.5],
			[1.5, 0.5],
		]);
		expect(a.song.title).toBe("One");
		expect(a.song.tempo).toBe(100);
		expect(a.song.meter).toEqual({ beats: 3, unit: 4 });
		expect([a.notes, a.converted]).toEqual([4, 0]);
		expect(b.song.pitches.map(formatPitch)).toEqual(["G4", "A4", "B4", "C5"]);
		expect(b.song.title).toBe("Two");
		expect(b.song.tempo).toBe(60);
		expect(b.song.meter).toEqual({ beats: 4, unit: 4 });
		expect([b.notes, b.converted]).toEqual([4, 0]);
	});

	test("three tunes, with conversions counted per tune (AC1)", async () => {
		const text = [
			tune(1, "C D|"),
			tune(2, "B _B|", "T2", ""),
			tune(3, "E F G|"),
		]
			.join("\n\n")
			.replace("T:T2\nK:C", "T:T2\nK:F");
		const tunes = await parsedAll(text);
		expect(tunes.map((t) => [t.notes, t.converted, t.song.title])).toEqual([
			[2, 0, "T1"],
			[2, 2, "T2"],
			[3, 0, "T3"],
		]);
	});

	test("abcjs splits as the line mapping expects", async () => {
		const abcjs = (await import("abcjs/src/api/abc_tunebook.js")).default;
		const book = new abcjs.TuneBook(two);
		expect(book.tunes.length).toBe(2);
		expect(book.header).toBe("");
	});

	test("a failing tune first, in the middle and last: tune, whole-text line and note (AC2)", async () => {
		const good = (n: number) => tune(n, "C D E|");
		const bad = (n: number) => tune(n, "C [CE] D|");
		const at = async (texts: string[]) =>
			(await problems(texts.join("\n\n")))[0];
		// Each tune is 4 lines plus a blank line, so tune n starts on line 6(n-1)+1... computed below.
		expect(await at([bad(1), good(2), good(3)])).toMatchObject({
			tune: 1,
			line: 4,
			note: 2,
		});
		expect(await at([good(1), bad(2), good(3)])).toMatchObject({
			tune: 2,
			line: 9,
			note: 2,
		});
		expect(await at([good(1), good(2), bad(3)])).toMatchObject({
			tune: 3,
			line: 14,
			note: 2,
		});
	});

	test("an abcjs warning in tune 2 or 3 gets its whole-text line (AC2)", async () => {
		const good = (n: number) => tune(n, "C D E|");
		const text = [good(1), tune(2, "C D$ E|"), tune(3, "C D E|\nQ:zz")].join(
			"\n\n",
		);
		const found = await problems(text);
		expect(found).toHaveLength(2);
		expect(found[0]).toMatchObject({ tune: 2, line: 9, column: 4 });
		expect(found[1]).toMatchObject({ tune: 3, line: 15, column: 3 });
	});

	test("more than 10 problems across tunes are cut, with the tune on the summary line (AC2)", async () => {
		const chords = (n: number, count: number) =>
			tune(n, `${"[CE] ".repeat(count)}|`);
		const found = await problems([chords(1, 6), chords(2, 6)].join("\n\n"));
		expect(found).toHaveLength(11);
		expect(found[9]).toMatchObject({ tune: 2 });
		expect(found[10]).toMatchObject({
			message: "and 2 more problems",
			tune: 2,
			line: 9,
		});
		expect(found.slice(0, 6).every((p) => p.tune === 1)).toBe(true);
	});

	test("the tune follows position, not the X: number (AC3)", async () => {
		for (const numbers of [
			[1, 5, 9],
			[1, 1, 1],
			[3, 2, 1],
		]) {
			const text = numbers
				.map((n, i) => tune(n, i === 2 ? "C [CE]|" : "C D|"))
				.join("\n\n");
			const [problem] = await problems(text);
			expect(problem?.tune).toBe(3);
		}
	});

	test("500 notes are the limit for each tune, not in total (AC5)", async () => {
		const many = (n: number, count: number) =>
			tune(n, `${"C ".repeat(count)}|`);
		const passes = await parsedAll([many(1, 300), many(2, 300)].join("\n\n"));
		expect(passes.map((t) => t.notes)).toEqual([300, 300]);
		const [over] = await problems([many(1, 3), many(2, 501)].join("\n\n"));
		expect(over).toMatchObject({ tune: 2, line: 9, note: 501 });
		// Counted after repeats: 251 notes played twice go over at the 501st played note, the 250th written one.
		const [again] = await problems(
			[many(1, 3), tune(2, `|: ${"C ".repeat(251)}:|`)].join("\n\n"),
		);
		expect(again).toMatchObject({ tune: 2, note: 250 });
		expect(over?.message).toContain(String(MAX_ABC_NOTES));
	});

	test("the character limit is on the whole text and names no tune (AC5)", async () => {
		const found = await problems(
			`${tune(1, "C|")}\n\n${tune(2, "C|")}\n%${"x".repeat(MAX_ABC_CHARS)}`,
		);
		expect(found).toHaveLength(1);
		expect(found[0]?.tune).toBeUndefined();
	});

	test("a file header: only %% lines reach the tunes, and warning lines stay right", async () => {
		const text = `%%scale 1\nL:1/4\n\n${tune(1, "C D|")}\n\n${tune(2, "C D$|")}\n`;
		const tunes = await parsedAll(text.replace("D$", "D"));
		// L:1/4 before the first X: is dropped, so notes keep the default unit, an eighth.
		expect(tunes.map((t) => t.song.notes.map((n) => n.beats))).toEqual([
			[0.5, 0.5],
			[0.5, 0.5],
		]);
		const [problem] = await problems(text);
		expect(problem).toMatchObject({ tune: 2, line: 12, column: 4 });
	});

	test("prose between tunes after a blank line is ignored (AC1)", async () => {
		const text = `${tune(1, "C D|")}\n\nA note about the next tune, with D: and K: inside.\n\n${tune(2, "E F|")}\n`;
		const tunes = await parsedAll(text);
		expect(tunes.map((t) => t.notes)).toEqual([2, 2]);
	});

	test("a no-notes tune points at its own X: line (AC2)", async () => {
		const found = await problems(`${tune(1, "C D|")}\n\nX:2\nK:C\n`);
		expect(found).toEqual([
			{ message: "No notes found", line: 6, tune: 2, kind: "no notes" },
		]);
	});

	test("a one-tune text gives no tune on any problem (AC9)", async () => {
		for (const body of ["C [CE]|", "C D$|", "C, c'|"]) {
			const found = await problems(tune(1, body));
			expect(found.length).toBeGreaterThan(0);
			expect(found.every((p) => p.tune === undefined)).toBe(true);
		}
	});
});

describe("dropped tunes (F17-S01)", () => {
	const good = (n: number) => `X:${n}\nT:Good ${n}\nK:C\nC D E|`;
	const dropped = (n: number, title: string) => `X:${n}\nT:${title}`;
	const all = async (text: string) => {
		const result = await parseAbc(text, instrument);
		if (!result.ok) throw new Error(JSON.stringify(result.problems));
		return result.tunes;
	};
	const shape = (tunes: (ParsedTune | DroppedTune)[]) =>
		tunes.map((t) => (isDroppedTune(t) ? t.title : t.song.title));

	test("a dropped tune first, in the middle and last keeps text order and its title (AC1)", async () => {
		for (const texts of [
			[dropped(1, "Lost"), good(2), good(3)],
			[good(1), dropped(2, "Lost"), good(3)],
			[good(1), good(2), dropped(3, "Lost")],
		]) {
			const tunes = await all(texts.join("\n\n"));
			expect(tunes).toHaveLength(3);
			const at = texts.findIndex((t) => !t.includes("Good"));
			expect(tunes[at]).toEqual({ dropped: true, title: "Lost" });
			expect(shape(tunes)).toEqual(
				texts.map((t, i) => (i === at ? "Lost" : `Good ${i + 1}`)),
			);
		}
	});

	test("a blank T: gives an empty title (AC1)", async () => {
		const tunes = await all([good(1), "X:2\nT:"].join("\n\n"));
		expect(tunes[1]).toEqual({ dropped: true, title: "" });
	});

	test("every tune dropped fails with No notes found (AC2)", async () => {
		expect(
			await problems([dropped(1, "A"), dropped(2, "B")].join("\n\n")),
		).toEqual([{ message: "No notes found", line: 1, kind: "no notes" }]);
		expect(await problems("X:1\nT:A")).toEqual([
			{ message: "No notes found", line: 1, kind: "no notes" },
		]);
	});

	test("near misses are not dropped tunes and fail as today (AC3)", async () => {
		for (const bad of [
			"X:2\nT:A\nM:4/4",
			"X:2\nT:A\n%note",
			"X:2\nT:A\nC [CE]",
			"T:A\nX:2",
			"X:2\nT:A\nT:B",
		]) {
			const result = await parseAbc([good(1), bad].join("\n\n"), instrument);
			expect(result.ok, bad).toBe(false);
		}
	});

	test("prose after a blank line does not stop a tune being dropped (AC1)", async () => {
		const tunes = await all(
			[good(1), `${dropped(2, "Lost")}\n\nSome notes about it.`].join("\n\n"),
		);
		expect(tunes[1]).toEqual({ dropped: true, title: "Lost" });
	});

	test("CRLF line endings (AC1)", async () => {
		const text = [good(1), dropped(2, "Lost"), good(3)]
			.join("\n\n")
			.replace(/\n/g, "\r\n");
		expect(shape(await all(text))).toEqual(["Good 1", "Lost", "Good 3"]);
	});

	test("a text with no dropped tune is as before (AC7)", async () => {
		const tunes = await all([good(1), good(2)].join("\n\n"));
		expect(tunes.some(isDroppedTune)).toBe(false);
	});
});

describe("loading a file (F17-S02)", () => {
	const good = (n: number, extra = "") =>
		`X:${n}\nT:Good ${n}\n${extra}K:C\nC D E|`;
	const bad = (n: number, body: string, title = `Bad ${n}`) =>
		`X:${n}\n${title === "" ? "" : `T:${title}\n`}K:C\n${body}`;
	const load = async (text: string) => loadAbcFile(text, instrument);
	const loaded = async (text: string) => {
		const result = await load(text);
		if (!result.ok) throw new Error(result.reason);
		return result;
	};
	/** The T: line a replaced tune ends up with. */
	const replaced = async (body: string) => {
		const { text } = await loaded([good(1), bad(2, body)].join("\n\n"));
		return /T:Bad 2[^\n]*/.exec(text)?.[0];
	};

	test("each kind has its label (AC4)", async () => {
		const cases: [string, string][] = [
			["C [CE] D|", "chords"],
			["C {D}E F|", "grace notes"],
			["V:1\nC D|\nV:2\nE F|", "second voice"],
			["C (D E F|]", "unmatched slur"],
			["C D !D.C.! E|", "D.C. or D.S."],
			["C D$ E|", "ABC errors"],
			["z z z|", "no notes"],
			["c'' c'' c''|", "out of range"],
		];
		for (const [body, kind] of cases) {
			expect(await replaced(body), body).toBe(`T:Bad 2 (not loaded: ${kind})`);
		}
		const many = Array.from({ length: 501 }, () => "C").join(" ");
		expect(await replaced(many)).toBe("T:Bad 2 (not loaded: too many notes)");
	});

	test("several kinds in one tune come in the fixed order (AC4)", async () => {
		expect(await replaced("C [CE] c''|")).toBe(
			"T:Bad 2 (not loaded: chords, out of range)",
		);
		expect(await replaced("C [CE] D$ {D}E (F|")).toBe(
			"T:Bad 2 (not loaded: chords, grace notes, unmatched slur, ABC errors)",
		);
	});

	test("kinds beyond the first 10 problems still count (AC5)", async () => {
		const body = `${"[CE] ".repeat(12)}c''|`;
		expect(await replaced(body)).toBe(
			"T:Bad 2 (not loaded: chords, out of range)",
		);
	});

	test("an untitled failing tune is named by its position (AC4)", async () => {
		const { text } = await loaded(
			[good(1), bad(2, "C [CE]|", "")].join("\n\n"),
		);
		expect(text).toContain("X:2\nT:Tune 2 (not loaded: chords)");
	});

	test("the replaced tune keeps its X: line, and prose after it (AC3, AC7)", async () => {
		const { text } = await loaded(
			[good(1), `${bad(7, "C [CE]|")}\n\nSome words.`, good(3)].join("\n\n"),
		);
		expect(text).toBe(
			[
				good(1),
				"X:7\nT:Bad 7 (not loaded: chords)\n\nSome words.",
				good(3),
			].join("\n\n"),
		);
	});

	test("a passing file comes back unchanged (AC2)", async () => {
		const file = `${[good(1), good(2)].join("\n\n")}\n`;
		expect(await load(file)).toEqual({
			ok: true,
			text: file,
			loaded: 2,
			total: 2,
			cut: false,
		});
	});

	test("a file header and prose between tunes are kept and counted (AC7)", async () => {
		const file = `%%scale 0.8\nMy tune book\n\n${good(1)}\n\nA note on tune one.\n\n${good(2)}`;
		const result = await loaded(file);
		expect(result.text).toBe(file);
		expect(result.total).toBe(2);
		const long = await load(`${"% pad\n".repeat(2000)}\n${good(1)}`);
		expect(long).toEqual({ ok: false, reason: "first-too-long" });
	});

	test("the cut falls at a tune boundary, with the counts (AC6)", async () => {
		const filler = `X:9\nT:Fill\nK:C\n${"C D E F|".repeat(40)}`;
		const tunes = Array.from({ length: 50 }, (_, i) =>
			filler.replace("X:9", `X:${i + 1}`),
		);
		const result = await loaded(tunes.join("\n\n"));
		expect(result.cut).toBe(true);
		expect(result.total).toBe(50);
		expect(result.loaded).toBeLessThan(50);
		expect(result.text.length).toBeLessThanOrEqual(MAX_ABC_CHARS);
		// Each tune keeps the line break that ended it.
		expect(result.text).toBe(`${tunes.slice(0, result.loaded).join("\n\n")}\n`);
	});

	test("a file that fits only because failing tunes were replaced is not cut (AC6)", async () => {
		const huge = bad(2, `${"C [CE] ".repeat(1500)}|`);
		const file = [good(1), huge, good(3)].join("\n\n");
		expect(file.length).toBeGreaterThan(MAX_ABC_CHARS);
		const result = await loaded(file);
		expect(result).toMatchObject({ loaded: 3, total: 3, cut: false });
	});

	test("every tune failing, or only a cut-off one passing, fails (AC8)", async () => {
		expect(
			await load([bad(1, "C [CE]|"), bad(2, "C [CE]|")].join("\n\n")),
		).toEqual({ ok: false, reason: "no-tune" });
		expect(await load("just words")).toEqual({
			ok: false,
			reason: "no-tune",
		});
		const filler = `X:1\nT:Fill\nK:C\n${"C [CE] ".repeat(600)}|`;
		expect(
			await load([bad(1, "C [CE]|"), `${filler}\n`, good(3)].join("\n\n")),
		).toMatchObject({ ok: true });
	});

	test("a first tune over the limit fails (AC8)", async () => {
		const first = `X:1\nT:${"Long ".repeat(2100)}\nK:C\nC D E|`;
		expect(await load(first)).toEqual({ ok: false, reason: "first-too-long" });
	});

	test("an already dropped tune is kept and does not pass (AC3)", async () => {
		const file = [good(1), "X:2\nT:Lost", good(3)].join("\n\n");
		expect(await load(file)).toMatchObject({ ok: true, text: file });
		expect(await load("X:1\nT:Lost")).toEqual({
			ok: false,
			reason: "no-tune",
		});
	});

	test("CRLF files load with LF endings", async () => {
		const file = [good(1), bad(2, "C [CE]|")].join("\n\n");
		const result = await loaded(file.replace(/\n/g, "\r\n"));
		expect(result.text).not.toContain("\r");
		expect(result.text).toContain("T:Bad 2 (not loaded: chords)");
	});

	test("the loaded text passes parseAbc with the dropped tunes in place", async () => {
		const file = [
			"%%scale 0.8\n",
			good(1),
			bad(2, "C [CE]|"),
			bad(3, "C D$|", ""),
			good(4),
		].join("\n");
		const { text } = await loaded(file);
		const result = await parseAbc(text, instrument);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(
			result.tunes.map((t) => (isDroppedTune(t) ? t.title : "ok")),
		).toEqual([
			"ok",
			"Bad 2 (not loaded: chords)",
			"Tune 3 (not loaded: ABC errors)",
			"ok",
		]);
	});
});
