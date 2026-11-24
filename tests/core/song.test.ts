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
	EDGE_GRACE_MS,
	JOIN_GAP_MS,
	type Meter,
	noteReleasesMs,
	playbackSchedule,
	RELEASE_CAP_QUARTERS,
	RELEASE_SHARE,
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

	test("a missing slurred becomes false and an explicit true is kept (F09-S01 AC1)", () => {
		const made = createSong(
			[
				{ pitch: pitch("C4"), start: 0, beats: 1 },
				{ pitch: pitch("D4"), start: 1, beats: 1, slurred: true },
				{ pitch: pitch("E4"), start: 2, beats: 1, slurred: false },
			],
			{ tempo: null, meter: DEFAULT_METER },
		);
		expect(made.notes.map((n) => n.slurred)).toEqual([false, true, false]);
	});

	test("keeps starts, lengths, tempo and meter", () => {
		const meter = { beats: 3, unit: 4 };
		const made = createSong([{ pitch: pitch("C4"), start: 0, beats: 1.5 }], {
			tempo: 120,
			meter,
		});
		expect(made.notes).toEqual([
			{ pitch: pitch("C4"), start: 0, beats: 1.5, slurred: false },
		]);
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

	test("the title is kept when given and absent otherwise", () => {
		const notes = [{ pitch: pitch("C4"), start: 0, beats: 1 }];
		const options = { tempo: null, meter: DEFAULT_METER };
		expect(createSong(notes, { ...options, title: "Ode" }).title).toBe("Ode");
		expect(createSong(notes, options).title).toBeUndefined();
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

describe("noteReleasesMs (F15-S01 AC1, AC2)", () => {
	const lengths = [0.25, 0.5, 1, 2, 4];
	/** One note of each length, spaced so none is joined to the next, as plain joins. */
	const ofLength = (beats: number) => song([["C4", 0, beats]]);
	const table: [number, number[]][] = [
		[60, [62.5, 125, 250, 500, 500]],
		[75, [50, 100, 200, 400, 400]],
		[100, [40, 75, 150, 300, 300]],
		[140, [40, 750 / 14, 750 / 7, 1500 / 7, 1500 / 7]],
		[180, [40, 125 / 3, 250 / 3, 500 / 3, 500 / 3]],
	];

	test("the constants are the agreed starting values", () => {
		expect(RELEASE_SHARE).toBe(0.25);
		expect(RELEASE_CAP_QUARTERS).toBe(0.5);
		expect(EDGE_GRACE_MS).toBe(40);
	});

	for (const [tempo, expected] of table) {
		test(`a quarter of its length, at most half a quarter note, at least 40 ms, at ♩ = ${tempo}`, () => {
			lengths.forEach((beats, i) => {
				const [release] = noteReleasesMs(ofLength(beats), tempo);
				expect(release, `${beats} beats`).toBeCloseTo(expected[i] as number, 6);
			});
		});
	}

	test("the figures the stories name: ♩ = 75 quarter 200 and half and whole 400, ♩ = 100 sixteenth 40, ♩ = 140 eighth about 54", () => {
		expect(noteReleasesMs(ofLength(1), 75)[0]).toBe(200);
		expect(noteReleasesMs(ofLength(2), 75)[0]).toBe(400);
		expect(noteReleasesMs(ofLength(4), 75)[0]).toBe(400);
		expect(noteReleasesMs(ofLength(0.25), 100)[0]).toBe(40);
		expect(noteReleasesMs(ofLength(0.5), 140)[0]).toBeCloseTo(53.57, 2);
	});

	const slurredPair = (second: [string, number, number]) =>
		createSong(
			[
				{ pitch: pitch("C4"), start: 0, beats: 1, slurred: true },
				{ pitch: pitch(second[0]), start: second[1], beats: second[2] },
			],
			{ tempo: null, meter: DEFAULT_METER },
		);

	test("a note slurred into a note at its written end has none; the last note does", () => {
		expect(noteReleasesMs(slurredPair(["D4", 1, 1]), 75)).toEqual([0, 200]);
	});

	test("a slurred note before a rest has a release", () => {
		expect(noteReleasesMs(slurredPair(["D4", 2, 1]), 75)).toEqual([200, 200]);
	});

	test("a plain join, a note before a rest and the last note have one", () => {
		expect(noteReleasesMs(quarters("C4", "D4"), 75)).toEqual([200, 200]);
		expect(
			noteReleasesMs(
				song([
					["C4", 0, 1],
					["D4", 2, 1],
				]),
				75,
			),
		).toEqual([200, 200]);
	});

	test("a tied note is one long note: its release follows its whole length", () => {
		// Written as one 3-beat note, as a tie across a bar line is in the song.
		expect(noteReleasesMs(ofLength(3), 75)[0]).toBe(400);
		expect(noteReleasesMs(ofLength(3), 180)[0]).toBeCloseTo(500 / 3, 6);
	});

	test("is not rounded and takes the tempo given, not the song's", () => {
		expect(noteReleasesMs(song([["C4", 0, 0.5]], 60), 140)[0]).toBeCloseTo(
			750 / 14,
			6,
		);
	});
});

describe("playbackSchedule (F13-S01)", () => {
	function slurSong(
		notes: [string, number, number, boolean?][],
		tempo: number | null = 120,
	) {
		return createSong(
			notes.map(([name, start, beats, slurred]) => ({
				pitch: pitch(name),
				start,
				beats,
				slurred: slurred ?? false,
			})),
			{ tempo, meter: DEFAULT_METER },
		);
	}

	test("equal quarters at 120: starts, pitches and gapped lengths, the last too (AC1, AC2, AC4)", () => {
		const tones = playbackSchedule(quarters("C5", "D5", "E5"), 120);
		expect(tones.map((t) => t.startMs)).toEqual([0, 500, 1000]);
		expect(tones.map((t) => t.lengthMs)).toEqual([450, 450, 450]);
		expect(tones.map((t) => t.endMs)).toEqual([500, 1000, 1500]);
		expect(tones.map((t) => t.pitch)).toEqual([
			pitch("C5"),
			pitch("D5"),
			pitch("E5"),
		]);
		expect(JOIN_GAP_MS).toBe(50);
	});

	test("mixed lengths (AC1, AC2)", () => {
		const tones = playbackSchedule(
			song([
				["C5", 0, 2],
				["D5", 2, 0.5],
				["E5", 2.5, 1],
			]),
			120,
		);
		expect(tones.map((t) => t.startMs)).toEqual([0, 1000, 1250]);
		expect(tones.map((t) => t.lengthMs)).toEqual([950, 200, 450]);
	});

	test("a slur sounds its full length and the plain note after it keeps its gap (AC3)", () => {
		const tones = playbackSchedule(
			slurSong([
				["C5", 0, 1, true],
				["D5", 1, 1],
			]),
			120,
		);
		expect(tones.map((t) => t.lengthMs)).toEqual([500, 450]);
	});

	test("a rest after a slurred note keeps the gap (AC5)", () => {
		const tones = playbackSchedule(
			slurSong([
				["C5", 0, 1, true],
				["D5", 2, 1],
			]),
			120,
		);
		expect(tones.map((t) => t.lengthMs)).toEqual([450, 450]);
		expect(tones[0]?.endMs).toBe(500);
	});

	test("a plain note before a rest keeps the gap (AC5)", () => {
		const tones = playbackSchedule(
			song([
				["C5", 0, 1],
				["D5", 2, 1],
			]),
			120,
		);
		expect(tones.map((t) => t.lengthMs)).toEqual([450, 450]);
	});

	test("the last note keeps the gap even when flagged slurred (AC4)", () => {
		const tones = playbackSchedule(
			slurSong([
				["C5", 0, 1],
				["D5", 1, 1, true],
			]),
			120,
		);
		expect(tones[1]?.lengthMs).toBe(450);
	});

	test("a sixteenth at 160 gives a quarter of its length as the gap (AC2)", () => {
		const tones = playbackSchedule(song([["C5", 0, 0.25]], 160), 90);
		expect(tones[0]?.endMs).toBe(93.75);
		expect(tones[0]?.lengthMs).toBeCloseTo(93.75 - 23.4375, 10);
	});

	test("no Q: uses the fallback tempo, a Q: wins over it (AC6)", () => {
		const none = playbackSchedule(quarters("C5", "D5"), 90);
		expect(none.map((t) => t.startMs)).toEqual([0, 60000 / 90]);
		expect(none[0]?.lengthMs).toBeCloseTo(60000 / 90 - 50, 10);
		const own = playbackSchedule(slurSong([["C5", 0, 1]], 60), 90);
		expect(own[0]?.endMs).toBe(1000);
	});
});
