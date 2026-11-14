import { describe, expect, test } from "vitest";
import alto from "../../data/instruments/ocarina-12-taiwanese.json";
import { loadInstrument } from "../../src/core/instrument";
import { type Pitch, parsePitch } from "../../src/core/pitch";
import {
	barBeats,
	countIn,
	createSong,
	DEFAULT_METER,
	DEFAULT_TEMPO,
	type Meter,
	SongError,
	type SongNote,
	songBars,
	songLines,
	songOutOfRange,
	songSlotsMs,
} from "../../src/core/song";
import songSource from "../../src/core/song/index.ts?raw";

const instrument = loadInstrument(alto);

function pitch(name: string): Pitch {
	const p = parsePitch(name);
	if (p === null) throw new Error(`bad pitch ${name}`);
	return p;
}

/** A song of the named pitches, one quarter note each, in 4/4 with no tempo. */
function quarters(...names: string[]) {
	return createSong(
		names.map((name, i) => ({ pitch: pitch(name), start: i, beats: 1 })),
		{ tempo: null, meter: DEFAULT_METER },
	);
}

function song(notes: [string, number, number][], tempo: number | null = null) {
	return createSong(
		notes.map(([name, start, beats]) => ({
			pitch: pitch(name),
			start,
			beats,
		})),
		{ tempo, meter: DEFAULT_METER },
	);
}

describe("createSong (AC1)", () => {
	test("keeps the order", () => {
		const made = quarters("C4", "A3", "C4");
		expect(made.pitches).toEqual([pitch("C4"), pitch("A3"), pitch("C4")]);
		expect(made.notes.map((n) => n.pitch)).toEqual(made.pitches);
	});

	test("keeps starts, lengths, tempo and meter", () => {
		const meter = { beats: 3, unit: 4 };
		const made = createSong([{ pitch: pitch("C4"), start: 0, beats: 1.5 }], {
			tempo: 120,
			meter,
		});
		expect(made.notes).toEqual([{ pitch: pitch("C4"), start: 0, beats: 1.5 }]);
		expect(made.tempo).toBe(120);
		expect(made.meter).toEqual(meter);
	});

	test("copies the list", () => {
		const list: SongNote[] = [{ pitch: pitch("C4"), start: 0, beats: 1 }];
		const made = createSong(list, { tempo: null, meter: DEFAULT_METER });
		list.push({ pitch: pitch("D4"), start: 1, beats: 1 });
		expect(made.notes).toHaveLength(1);
		expect(made.pitches).toHaveLength(1);
		expect(made.notes).not.toBe(list);
	});

	test("an empty list throws SongError", () => {
		expect(() => createSong([], { tempo: null, meter: DEFAULT_METER })).toThrow(
			SongError,
		);
	});

	test("a bad tempo, length, meter or start order throws SongError", () => {
		const note = { pitch: pitch("C4"), start: 0, beats: 1 };
		const ok = { tempo: 90, meter: DEFAULT_METER };
		for (const tempo of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
			expect(() => createSong([note], { ...ok, tempo })).toThrow(SongError);
		}
		for (const beats of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
			expect(() => createSong([{ ...note, beats }], ok)).toThrow(SongError);
		}
		for (const meter of [
			{ beats: 0, unit: 4 },
			{ beats: 4, unit: Number.NaN },
			{ beats: -3, unit: 4 },
		]) {
			expect(() => createSong([note], { ...ok, meter })).toThrow(SongError);
		}
		expect(() =>
			createSong(
				[
					{ ...note, start: 2 },
					{ ...note, start: 1 },
				],
				ok,
			),
		).toThrow(SongError);
		expect(() => createSong([{ ...note, start: Number.NaN }], ok)).toThrow(
			SongError,
		);
	});

	test("the defaults are named constants", () => {
		expect(DEFAULT_TEMPO).toBe(90);
		expect(DEFAULT_METER).toEqual({ beats: 4, unit: 4 });
	});
});

describe("songSlotsMs (AC2)", () => {
	test("equal quarters at 120 are 500 ms each", () => {
		const s = song(
			[
				["C4", 0, 1],
				["D4", 1, 1],
				["E4", 2, 1],
			],
			120,
		);
		expect(songSlotsMs(s, 90)).toEqual([500, 500, 500]);
	});

	test("mixed lengths follow the starts", () => {
		const s = song(
			[
				["C4", 0, 0.5],
				["D4", 0.5, 2],
				["E4", 2.5, 1],
			],
			60,
		);
		expect(songSlotsMs(s, 90)).toEqual([500, 2000, 1000]);
	});

	test("a rest between two notes extends the first", () => {
		const s = song(
			[
				["C4", 0, 1],
				["D4", 2, 1],
			],
			60,
		);
		expect(songSlotsMs(s, 90)).toEqual([2000, 1000]);
	});

	test("the last note's slot is its own length", () => {
		expect(songSlotsMs(song([["C4", 0, 3]], 60), 90)).toEqual([3000]);
	});

	test("no tempo takes the fallback", () => {
		const s = quarters("C4", "D4");
		expect(songSlotsMs(s, 120)).toEqual([500, 500]);
		expect(songSlotsMs(s, DEFAULT_TEMPO)).toEqual([60000 / 90, 60000 / 90]);
	});

	test("the song's own tempo wins over the fallback", () => {
		expect(songSlotsMs(song([["C4", 0, 1]], 60), 120)).toEqual([1000]);
	});

	test("is not rounded", () => {
		const s = song([["C4", 0, 1 / 3]], 90);
		const [slot] = songSlotsMs(s, 90);
		expect(slot).toBeCloseTo(222.2222222, 5);
		expect(Number.isInteger(slot)).toBe(false);
	});
});

describe("countIn (AC3)", () => {
	const at = (beats: number, unit: number, tempo: number) =>
		countIn({ beats, unit } satisfies Meter, tempo);

	test("4/4 is four quarter beats", () => {
		expect(at(4, 4, 90)).toEqual({ beats: 4, beatMs: 60000 / 90 });
		expect(at(4, 4, 120)).toEqual({ beats: 4, beatMs: 500 });
	});

	test("3/4 is three quarter beats", () => {
		expect(at(3, 4, 120)).toEqual({ beats: 3, beatMs: 500 });
	});

	test("2/2 is two half-note beats", () => {
		expect(at(2, 2, 120)).toEqual({ beats: 2, beatMs: 1000 });
		expect(at(2, 2, 90)).toEqual({ beats: 2, beatMs: 120000 / 90 });
	});

	test("6/8, 9/8 and 12/8 count dotted quarters", () => {
		expect(at(6, 8, 120)).toEqual({ beats: 2, beatMs: 750 });
		expect(at(9, 8, 120)).toEqual({ beats: 3, beatMs: 750 });
		expect(at(12, 8, 120)).toEqual({ beats: 4, beatMs: 750 });
		expect(at(6, 8, 90).beatMs).toBeCloseTo(1000);
	});

	test("3/8 is simple: three eighth beats", () => {
		expect(at(3, 8, 120)).toEqual({ beats: 3, beatMs: 250 });
	});
});

describe("songOutOfRange against the alto C (AC2)", () => {
	test("a song that fits gives nothing", () => {
		const song = quarters("A3", "C5", "F5");
		expect(songOutOfRange(song, instrument)).toEqual([]);
	});

	test("below only", () => {
		const song = quarters("C4", "G3");
		expect(songOutOfRange(song, instrument)).toEqual([
			{ index: 1, pitch: pitch("G3"), side: "below" },
		]);
	});

	test("above only", () => {
		const song = quarters("F♯5", "C4");
		expect(songOutOfRange(song, instrument)).toEqual([
			{ index: 0, pitch: pitch("F♯5"), side: "above" },
		]);
	});

	test("both sides, in song order with indexes", () => {
		const song = quarters("C6", "C4", "G3", "G5");
		expect(songOutOfRange(song, instrument)).toEqual([
			{ index: 0, pitch: pitch("C6"), side: "above" },
			{ index: 2, pitch: pitch("G3"), side: "below" },
			{ index: 3, pitch: pitch("G5"), side: "above" },
		]);
	});
});

describe("imports and randomness (AC6)", () => {
	test("imports exactly ../pitch and ../instrument", () => {
		const specifiers = [...songSource.matchAll(/from\s+["']([^"']+)["']/g)]
			.map((m) => m[1])
			.sort();
		expect(specifiers).toEqual(["../instrument", "../pitch"]);
	});

	test("never calls Math.random", () => {
		expect(songSource).not.toContain("Math.random");
	});
});

describe("bars and lines (timed song staff)", () => {
	/** Each bar as `pitch:beats`, with `~` after a tied piece and `r:beats` for a rest. */
	function shape(s: ReturnType<typeof song>) {
		return songBars(s).map((bar) =>
			bar.items
				.map((item) =>
					item.kind === "rest"
						? `r:${item.beats}`
						: `${item.index}:${item.beats}${item.tied ? "~" : ""}`,
				)
				.join(" "),
		);
	}

	test("barBeats counts quarter notes", () => {
		expect(barBeats({ beats: 4, unit: 4 })).toBe(4);
		expect(barBeats({ beats: 6, unit: 8 })).toBe(3);
		expect(barBeats({ beats: 2, unit: 2 })).toBe(4);
	});

	test("the first bar defaults to a whole bar and must be positive", () => {
		expect(quarters("C4").firstBar).toBe(4);
		expect(() =>
			createSong([{ pitch: pitch("C4"), start: 0, beats: 1 }], {
				tempo: null,
				meter: DEFAULT_METER,
				firstBar: 0,
			}),
		).toThrow(SongError);
	});

	test("quarters fill whole bars; the last ends with its note", () => {
		expect(shape(quarters("C4", "D4", "E4", "F4", "G4", "A4"))).toEqual([
			"0:1 1:1 2:1 3:1",
			"4:1 5:1",
		]);
	});

	test("a gap between notes is a rest", () => {
		expect(
			shape(
				song([
					["C4", 0, 1],
					["D4", 2, 2],
				]),
			),
		).toEqual(["0:1 r:1 1:2"]);
	});

	test("a note over a bar line is split and tied", () => {
		expect(
			shape(
				song([
					["C4", 0, 3],
					["D4", 3, 2],
					["E4", 5, 1],
				]),
			),
		).toEqual(["0:3 1:1~", "1:1 2:1"]);
	});

	test("a pickup makes a short first bar", () => {
		const s = createSong(
			[
				{ pitch: pitch("C4"), start: 0, beats: 1 },
				{ pitch: pitch("D4"), start: 1, beats: 4 },
			],
			{ tempo: null, meter: DEFAULT_METER, firstBar: 1 },
		);
		expect(songBars(s).map((b) => b.start)).toEqual([0, 1]);
		expect(songBars(s)[1]?.items).toEqual([
			{ kind: "note", index: 1, pitch: pitch("D4"), beats: 4, tied: false },
		]);
	});

	test("songLines groups bars, the last line may be short", () => {
		const s = quarters(...Array.from({ length: 12 }, () => "C4"));
		expect(songLines(s, 2).map((line) => line.length)).toEqual([2, 1]);
		expect(songLines(s, 1).map((line) => line.length)).toEqual([1, 1, 1]);
	});
});
