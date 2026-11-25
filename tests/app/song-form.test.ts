import { describe, expect, test } from "vitest";
import alto from "../../data/instruments/ocarina-12-taiwanese.json";
import { type AbcResult, parseAbc } from "../../src/abc";
import {
	applySongText,
	chooseTune,
	chosenTune,
	FILE_UNREADABLE,
	FIRST_TUNE_TOO_LONG,
	fileCutMessage,
	firstPassing,
	NO_SONG,
	NO_TEMPO_NOTE,
	NO_TUNE_IN_FILE,
	problemLine,
	songSectionSummary,
	songStateFrom,
	songStatus,
	songSummary,
	tunePosition,
} from "../../src/app/song-form";
import { loadInstrument } from "../../src/core/instrument";
import { type Pitch, parsePitch } from "../../src/core/pitch";
import type { Settings } from "../../src/core/settings";
import { createSong, DEFAULT_METER } from "../../src/core/song";

const C4 = parsePitch("C4") as Pitch;

const SETTINGS: Settings = {
	lowest: parsePitch("A3") as Pitch,
	highest: parsePitch("F5") as Pitch,
	includeSharps: true,
	delaySeconds: 3,
	autoAdvance: true,
	advanceDelaySeconds: 3,
	soundEnabled: true,
	soundDelaySeconds: 0.5,
	soundDurationSeconds: 1.5,
	judgeEnabled: false,
	smartSampling: false,
	toleranceCents: 40,
	mode: "flashcards",
	practice: "single",
	fingeringDelaySeconds: 3,
	singleAdvanceDelaySeconds: 3,
	metronome: false,
	scoring: "live",
	barsPerLine: 2,
	songAbc: "",
	songTune: 1,
};

const song = createSong([{ pitch: C4, start: 0, beats: 1 }], {
	tempo: null,
	meter: DEFAULT_METER,
});
const passing: AbcResult = {
	ok: true,
	tunes: [{ song, notes: 21, converted: 2 }],
};
const several: AbcResult = {
	ok: true,
	tunes: [
		{ song, notes: 10, converted: 1 },
		{ song, notes: 12, converted: 0 },
		{ song, notes: 5, converted: 2 },
	],
};
const failing: AbcResult = {
	ok: false,
	problems: [
		{ message: "Chords are not supported", line: 3, note: 7, column: 5 },
	],
};

describe("messages", () => {
	test("the summary for several, one and no conversions", () => {
		expect(songSummary(21, 2)).toBe("21 notes, 2 flats converted to sharps");
		expect(songSummary(1, 1)).toBe("1 note, 1 flat converted to a sharp");
		expect(songSummary(21, 0)).toBe("21 notes");
		expect(songSummary(1, 0)).toBe("1 note");
	});

	test("success gives one summary line", () => {
		expect(songStatus(passing)).toEqual({
			ok: true,
			lines: ["21 notes, 2 flats converted to sharps"],
		});
	});

	test("failure gives one line per problem", () => {
		expect(songStatus(failing)).toEqual({
			ok: false,
			lines: ["Line 3, note 7: Chords are not supported"],
		});
	});

	test("a problem names its note, else its column, else its line", () => {
		expect(problemLine({ message: "m", line: 2, note: 4, column: 1 })).toBe(
			"Line 2, note 4: m",
		);
		expect(problemLine({ message: "m", line: 2, column: 6 })).toBe(
			"Line 2, column 6: m",
		);
		expect(problemLine({ message: "m", line: 2 })).toBe("Line 2: m");
	});
});

describe("several tunes (F14-S01)", () => {
	test("the summary names the tunes only when there are several (AC4, AC9)", () => {
		expect(songSummary(27, 3, 3)).toBe(
			"3 tunes, 27 notes, 3 flats converted to sharps",
		);
		expect(songSummary(27, 0, 2)).toBe("2 tunes, 27 notes");
		expect(songSummary(1, 1, 1)).toBe("1 note, 1 flat converted to a sharp");
		expect(songStatus(several)).toEqual({
			ok: true,
			lines: ["3 tunes, 27 notes, 3 flats converted to sharps"],
		});
	});

	test("a problem leads with its tune (AC2)", () => {
		expect(problemLine({ message: "m", line: 12, note: 7, tune: 3 })).toBe(
			"Tune 3, line 12, note 7: m",
		);
		expect(problemLine({ message: "m", line: 2, column: 6, tune: 1 })).toBe(
			"Tune 1, line 2, column 6: m",
		);
		expect(problemLine({ message: "m", line: 2, tune: 2 })).toBe(
			"Tune 2, line 2: m",
		);
		expect(problemLine({ message: "m", line: 2, note: 4 })).toBe(
			"Line 2, note 4: m",
		);
	});

	test("chosenTune picks the position, else the first, else none", () => {
		const a = createSong([{ pitch: C4, start: 0, beats: 1 }], {
			tempo: 80,
			meter: DEFAULT_METER,
		});
		expect(chosenTune([song, a], 2)).toBe(a);
		expect(chosenTune([song, a], 3)).toBe(song);
		expect(chosenTune([], 1)).toBeNull();
	});

	test("chooseTune returns null for the same position (F14-S02 AC7)", () => {
		expect(chooseTune(SETTINGS, 1)).toBeNull();
		expect(chooseTune(SETTINGS, 2)).toEqual({ ...SETTINGS, songTune: 2 });
	});

	test("an edit keeps the position while the text has that many tunes (AC8)", () => {
		const on = { ...SETTINGS, songTune: 3 };
		expect(applySongText(on, "C", several).settings.songTune).toBe(3);
		expect(applySongText(on, "C", passing).settings.songTune).toBe(1);
		expect(applySongText(on, "C", failing).settings).toBe(on);
		expect(applySongText(on, "", null).settings.songTune).toBe(1);
		expect(songStateFrom(several).tunes).toHaveLength(3);
	});
});

describe("applySongText", () => {
	test("a passing text is saved and gives its song", () => {
		const edit = applySongText(SETTINGS, "C", passing);
		expect(edit.settings).toEqual({ ...SETTINGS, songAbc: "C" });
		expect(edit.state?.tunes).toEqual([song]);
		expect(edit.state?.summary).toBe("21 notes, 2 flats converted to sharps");
		expect(edit.problems).toEqual([]);
	});

	test("a passing text leaves the mode and practice as they were (AC12)", () => {
		const on: Settings = {
			...SETTINGS,
			mode: "song",
			practice: "tempo",
			songAbc: "old",
		};
		const out = applySongText(on, "C", passing).settings;
		expect(out.mode).toBe("song");
		expect(out.practice).toBe("tempo");
	});

	test("a failing text keeps the last good song, the saved text and the mode (AC12)", () => {
		const saved: Settings = { ...SETTINGS, mode: "song", songAbc: "C" };
		const edit = applySongText(saved, "[CE]", failing);
		expect(edit.settings).toBe(saved);
		expect(edit.state).toBeUndefined();
		expect(edit.problems).toEqual(failing.problems);
	});

	test("an empty text clears the song and leaves the mode alone, without a result", () => {
		const saved: Settings = { ...SETTINGS, mode: "song", songAbc: "C" };
		const edit = applySongText(saved, "", null);
		expect(edit.settings).toEqual({ ...saved, songAbc: "", songTune: 1 });
		expect(edit.state).toBe(NO_SONG);
		expect(edit.problems).toEqual([]);
	});

	test("whitespace alone counts as empty", () => {
		const saved: Settings = { ...SETTINGS, mode: "song", songAbc: "C" };
		const edit = applySongText(saved, " \n\t ", null);
		expect(edit.settings.songAbc).toBe("");
		expect(edit.settings.mode).toBe("song");
		expect(edit.state).toBe(NO_SONG);
	});
});

describe("state", () => {
	test("a passing result holds its song and summary", () => {
		expect(songStateFrom(passing)).toEqual({
			tunes: [song],
			summary: "21 notes, 2 flats converted to sharps",
			problems: [],
		});
	});

	test("a failing result holds its problems and no song", () => {
		expect(songStateFrom(failing)).toEqual({
			tunes: [],
			summary: null,
			problems: failing.problems,
		});
	});

	test("the closed section describes the song and bars per line", () => {
		expect(
			songSectionSummary(SETTINGS, {
				tunes: [song],
				summary: "21 notes, 2 flats converted to sharps",
				problems: [],
			}),
		).toBe("21 notes, 2 flats converted to sharps, 2 bars per line");
		expect(
			songSectionSummary(
				{ ...SETTINGS, barsPerLine: 1 },
				songStateFrom(passing),
			),
		).toBe("21 notes, 2 flats converted to sharps, 1 bar per line");
		expect(songSectionSummary(SETTINGS, NO_SONG)).toBe(
			"no song, 2 bars per line",
		);
	});
});

describe("NO_TEMPO_NOTE (F08-S01 AC5)", () => {
	test("names the default tempo", () => {
		expect(NO_TEMPO_NOTE).toBe("No tempo in the tune, using ♩ = 90");
	});
});

describe("dropped tunes (F17-S01)", () => {
	const lost = { dropped: true, title: "Lost" } as const;
	const withDropped: AbcResult = {
		ok: true,
		tunes: [
			lost,
			{ song, notes: 10, converted: 1 },
			lost,
			{ song, notes: 5, converted: 0 },
		],
	};

	test("the summary counts dropped tunes and totals the passing ones (AC4)", () => {
		expect(songSummary(15, 1, 4, 2)).toBe(
			"4 tunes (2 not loaded), 15 notes, 1 flat converted to a sharp",
		);
		expect(songSummary(27, 0, 3, 1)).toBe("3 tunes (1 not loaded), 27 notes");
		expect(songSummary(27, 0, 3)).toBe("3 tunes, 27 notes");
		expect(songStatus(withDropped)).toEqual({
			ok: true,
			lines: ["4 tunes (2 not loaded), 15 notes, 1 flat converted to a sharp"],
		});
	});

	test("the state keeps dropped tunes in their places (AC5)", () => {
		expect(songStateFrom(withDropped).tunes).toEqual([lost, song, lost, song]);
	});

	test("firstPassing is the first Song, else 1", () => {
		expect(firstPassing([lost, lost, song])).toBe(3);
		expect(firstPassing([song, lost])).toBe(1);
		expect(firstPassing([lost])).toBe(1);
		expect(firstPassing([])).toBe(1);
	});

	test("tunePosition moves off a dropped tune to the first passing one (AC6)", () => {
		const tunes = [lost, song, lost, song];
		expect(tunePosition(tunes, 3)).toBe(2);
		expect(tunePosition(tunes, 1)).toBe(2);
		expect(tunePosition(tunes, 9)).toBe(2);
		expect(tunePosition(tunes, 4)).toBe(4);
		expect(tunePosition(tunes, 2)).toBe(2);
		expect(tunePosition([song, lost], 9)).toBe(1);
	});

	test("applySongText saves the moved position (AC6)", () => {
		const at = (songTune: number) =>
			applySongText({ ...SETTINGS, songTune }, "text", withDropped).settings
				.songTune;
		expect(at(3)).toBe(2);
		expect(at(9)).toBe(2);
		expect(at(4)).toBe(4);
	});

	test("chosenTune never returns a dropped tune", () => {
		const tunes = [lost, song, lost];
		for (const position of [0, 1, 2, 3, 9]) {
			expect(chosenTune(tunes, position)).toBe(song);
		}
		expect(chosenTune([lost], 1)).toBeNull();
		expect(chosenTune([], 1)).toBeNull();
	});
});

describe("file messages (F17-S02)", () => {
	test("the cut and failure messages (AC6, AC8)", () => {
		expect(fileCutMessage(12, 40)).toBe(
			"The file was too long: tunes 1 to 12 of 40 were loaded.",
		);
		expect(NO_TUNE_IN_FILE).toBe("No tune in the file could be loaded.");
		expect(FIRST_TUNE_TOO_LONG).toBe(
			"The first tune is longer than 10,000 characters.",
		);
		expect(FILE_UNREADABLE).toBe("The file could not be read.");
	});
});
