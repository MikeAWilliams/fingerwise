import { describe, expect, test } from "vitest";
import alto from "../../data/instruments/ocarina-12-taiwanese.json";
import { type AbcResult, parseAbc } from "../../src/abc";
import {
	applySongText,
	canUseSong,
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
	songAbc: "",
};

const song = createSong([{ pitch: C4, start: 0, beats: 1 }], {
	tempo: null,
	meter: DEFAULT_METER,
});
const passing: AbcResult = { ok: true, song, notes: 21, converted: 2 };
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

describe("applySongText", () => {
	test("a passing text is saved and gives its song", () => {
		const edit = applySongText(SETTINGS, "C", passing);
		expect(edit.settings).toEqual({ ...SETTINGS, songAbc: "C" });
		expect(edit.state?.song).toBe(song);
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
			song,
			summary: "21 notes, 2 flats converted to sharps",
			problems: [],
		});
	});

	test("a failing result holds its problems and no song", () => {
		expect(songStateFrom(failing)).toEqual({
			song: null,
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

describe("NO_TEMPO_NOTE (F08-S01 AC5)", () => {
	test("names the default tempo", () => {
		expect(NO_TEMPO_NOTE).toBe("No tempo in the tune, using ♩ = 90");
	});
});
