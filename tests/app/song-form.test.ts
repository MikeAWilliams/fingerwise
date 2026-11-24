import { describe, expect, test } from "vitest";
import alto from "../../data/instruments/ocarina-12-taiwanese.json";
import { type AbcResult, parseAbc } from "../../src/abc";
import {
	applySongText,
	canUseSong,
	chosenTune,
	NO_SONG,
	NO_TEMPO_NOTE,
	problemLine,
	songSectionSummary,
	songStateFrom,
	songStatus,
	songSummary,
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
	useSong: false,
	keepTempo: false,
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

	test("a passing text keeps use song as it was", () => {
		const on = { ...SETTINGS, useSong: true, songAbc: "old" };
		expect(applySongText(on, "C", passing).settings.useSong).toBe(true);
	});

	test("a failing text keeps the last good song and the saved text", () => {
		const saved = { ...SETTINGS, useSong: true, songAbc: "C" };
		const edit = applySongText(saved, "[CE]", failing);
		expect(edit.settings).toBe(saved);
		expect(edit.state).toBeUndefined();
		expect(edit.problems).toEqual(failing.problems);
	});

	test("an empty text clears the song and turns use song off, without a result", () => {
		const saved = { ...SETTINGS, useSong: true, songAbc: "C" };
		const edit = applySongText(saved, "", null);
		expect(edit.settings).toEqual({ ...saved, songAbc: "", useSong: false });
		expect(edit.state).toBe(NO_SONG);
		expect(edit.problems).toEqual([]);
	});

	test("whitespace alone counts as empty", () => {
		const saved = { ...SETTINGS, useSong: true, songAbc: "C" };
		const edit = applySongText(saved, " \n\t ", null);
		expect(edit.settings.songAbc).toBe("");
		expect(edit.settings.useSong).toBe(false);
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

	test("the toggle is enabled only with a parsed song", () => {
		expect(canUseSong(null)).toBe(false);
		expect(canUseSong(song)).toBe(true);
	});

	test("the closed section says on or off", () => {
		expect(songSectionSummary(SETTINGS)).toBe("off");
		expect(songSectionSummary({ ...SETTINGS, useSong: true })).toBe("on");
	});

	test("with keep tempo on it says so, and keep tempo alone says off (F08-S02 AC2)", () => {
		expect(
			songSectionSummary({ ...SETTINGS, useSong: true, keepTempo: true }),
		).toBe("on, keep tempo");
		expect(songSectionSummary({ ...SETTINGS, keepTempo: true })).toBe("off");
	});
});

describe("the closed section with scoring (F12-S01)", () => {
	test("says scored after the song only when it applies", () => {
		const on = { ...SETTINGS, useSong: true, keepTempo: true };
		expect(
			songSectionSummary({ ...on, judgeEnabled: true, scoring: "after" }),
		).toBe("on, keep tempo, scored after the song");
		expect(
			songSectionSummary({ ...on, judgeEnabled: false, scoring: "after" }),
		).toBe("on, keep tempo");
		expect(
			songSectionSummary({ ...on, judgeEnabled: true, scoring: "live" }),
		).toBe("on, keep tempo");
	});
});

describe("NO_TEMPO_NOTE (F08-S01 AC5)", () => {
	test("names the default tempo", () => {
		expect(NO_TEMPO_NOTE).toBe("No tempo in the tune, using ♩ = 90");
	});
});
