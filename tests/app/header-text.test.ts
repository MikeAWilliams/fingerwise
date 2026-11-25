import { describe, expect, test } from "vitest";
import alto from "../../data/instruments/ocarina-12-taiwanese.json";
import defaults from "../../data/settings/defaults.json";
import {
	headerSong,
	PLAY_SONG_TEXT,
	playButton,
	STOP_TEXT,
	tempoText,
	tuneChoice,
	tuneLabels,
} from "../../src/app/header-text";
import { loadInstrument } from "../../src/core/instrument";
import { parsePitch } from "../../src/core/pitch";
import { parseDefaults, type Settings } from "../../src/core/settings";
import { createSong, DEFAULT_METER } from "../../src/core/song";

const base = parseDefaults(defaults, loadInstrument(alto));
const on: Settings = { ...base, mode: "song", practice: "tempo" };
const flashcards: Settings = { ...base, mode: "flashcards" };

function song(tempo: number | null, title?: string) {
	const pitch = parsePitch("C4");
	if (pitch === null) throw new Error("bad pitch");
	return createSong([{ pitch, start: 0, beats: 1 }], {
		tempo,
		meter: DEFAULT_METER,
		title,
	});
}

describe("tempoText (F10-S01 AC4)", () => {
	test("shows the tempo in quarter notes", () => {
		expect(tempoText(120)).toBe("♩ = 120");
	});

	test("rounds a fractional tempo", () => {
		expect(tempoText(89.6)).toBe("♩ = 90");
		expect(tempoText(60.4)).toBe("♩ = 60");
	});
});

describe("headerSong (F10-S01 AC3, AC4, AC7)", () => {
	test("a given tempo", () => {
		expect(headerSong(on, song(120, "Ode"), false).tempo).toBe("♩ = 120");
	});

	test("no tempo in the tune shows the default 90", () => {
		expect(headerSong(on, song(null), false).tempo).toBe("♩ = 90");
	});

	test("a Q:3/8=40 tune plays at 60 quarters", () => {
		expect(headerSong(on, song(60), false).tempo).toBe("♩ = 60");
	});

	test("the title shows in Song mode, in either practice", () => {
		expect(headerSong(on, song(null, "Ode"), false).title).toBe("Ode");
		const single = { ...on, practice: "single" as const };
		expect(headerSong(single, song(null, "Ode"), false).title).toBe("Ode");
	});

	test("no title without one, or in Flashcards (AC9)", () => {
		expect(headerSong(on, song(null), false).title).toBeNull();
		expect(headerSong(flashcards, song(null, "Ode"), false).title).toBeNull();
	});

	test("the tempo shows in Song mode in either practice, not in Flashcards", () => {
		const single = { ...on, practice: "single" as const };
		expect(headerSong(single, song(120, "Ode"), false).tempo).toBe("♩ = 120");
		expect(headerSong(flashcards, song(120, "Ode"), false).tempo).toBeNull();
	});

	test("no song shows nothing", () => {
		expect(headerSong(on, null, false)).toEqual({ title: null, tempo: null });
	});

	test("nothing while Settings is open", () => {
		expect(headerSong(on, song(120, "Ode"), true)).toEqual({
			title: null,
			tempo: null,
		});
	});
});

describe("headerSong while playing (F13-S02 AC11)", () => {
	test("the tempo shows in Flashcards while the song plays", () => {
		expect(headerSong(flashcards, song(120), false).tempo).toBeNull();
		expect(headerSong(flashcards, song(120), false, true).tempo).toBe(
			"♩ = 120",
		);
		expect(headerSong(flashcards, song(null), false, true).tempo).toBe(
			"♩ = 90",
		);
	});

	test("no song or Settings open still shows nothing", () => {
		expect(headerSong(on, null, false, true).tempo).toBeNull();
		expect(headerSong(on, song(120), true, true).tempo).toBeNull();
	});
});

describe("playButton (F13-S02)", () => {
	const args = {
		settings: on,
		song: song(120),
		open: false,
		webAudio: true,
		playing: false,
		phase: undefined,
	} as const;

	test("shown in either practice, judging and scoring on or off (AC1)", () => {
		for (const practice of ["tempo", "single"] as const) {
			for (const judgeEnabled of [true, false]) {
				for (const scoring of ["after", "live"] as const) {
					const settings = { ...on, practice, judgeEnabled, scoring };
					expect(playButton({ ...args, settings })).toEqual({
						icon: "▶",
						text: PLAY_SONG_TEXT,
						disabled: false,
					});
				}
			}
		}
	});

	test("hidden when Settings is open, the mode is Flashcards, there is no song or no Web Audio (AC1)", () => {
		expect(playButton({ ...args, open: true })).toBeNull();
		expect(playButton({ ...args, settings: flashcards })).toBeNull();
		expect(playButton({ ...args, song: null })).toBeNull();
		expect(playButton({ ...args, webAudio: false })).toBeNull();
	});

	test("greyed out while a timed run is playing, not in ready, summary or without one (AC7)", () => {
		expect(playButton({ ...args, phase: "playing" })?.disabled).toBe(true);
		expect(playButton({ ...args, phase: "ready" })?.disabled).toBe(false);
		expect(playButton({ ...args, phase: "summary" })?.disabled).toBe(false);
		expect(playButton(args)?.disabled).toBe(false);
	});

	test("while playing it reads Stop and can be pressed (AC4)", () => {
		expect(playButton({ ...args, playing: true })).toEqual({
			icon: "■",
			text: STOP_TEXT,
			disabled: false,
		});
	});

	test("play note off still shows it (AC12)", () => {
		const settings = { ...on, soundEnabled: false };
		expect(playButton({ ...args, settings })?.text).toBe(PLAY_SONG_TEXT);
	});
});

describe("tune list (F14-S02)", () => {
	const tunes = [song(100, "One"), song(100), song(100, "Three")];
	const args = {
		settings: { ...on, songTune: 1 },
		tunes,
		open: false,
		phase: undefined,
	} as const;

	test("labels follow the text, a missing title is Tune N by position (AC2)", () => {
		expect(tuneLabels(tunes)).toEqual(["One", "Tune 2", "Three"]);
	});

	test("hidden with one tune, in Flashcards or Settings open (AC4)", () => {
		expect(tuneChoice({ ...args, tunes: [tunes[0] as never] })).toBeNull();
		expect(tuneChoice({ ...args, tunes: [] })).toBeNull();
		expect(tuneChoice({ ...args, settings: flashcards })).toBeNull();
		expect(tuneChoice({ ...args, open: true })).toBeNull();
	});

	test("selected is the chosen tune's index, the first for a past-the-end position (AC1)", () => {
		for (const [songTune, selected] of [
			[1, 0],
			[2, 1],
			[3, 2],
			[4, 0],
		] as const) {
			expect(
				tuneChoice({ ...args, settings: { ...on, songTune } })?.selected,
			).toBe(selected);
		}
		expect(tuneChoice(args)?.labels).toEqual(["One", "Tune 2", "Three"]);
	});

	test("greyed out only while a timed run is playing (AC8)", () => {
		expect(tuneChoice({ ...args, phase: "playing" })?.disabled).toBe(true);
		for (const phase of ["ready", "summary", undefined] as const) {
			expect(tuneChoice({ ...args, phase })?.disabled).toBe(false);
		}
	});
});

describe("tuneChoice with dropped tunes (F17-S01 AC5)", () => {
	const lost = { dropped: true, title: "Lost" } as const;
	const blank = { dropped: true, title: "" } as const;
	const args = {
		settings: { ...on, songTune: 1 },
		open: false,
		phase: undefined,
	} as const;

	test("labels in text order, dropped flagged, selected skips the dropped (AC5, AC6)", () => {
		const tunes = [lost, song(null, "Two"), blank];
		const choice = tuneChoice({ ...args, tunes });
		expect(choice?.labels).toEqual(["Lost", "Two", "Tune 3"]);
		expect(choice?.dropped).toEqual([true, false, true]);
		expect(choice?.selected).toBe(1);
	});

	test("one passing and one dropped tune still shows the list (AC5)", () => {
		const choice = tuneChoice({ ...args, tunes: [song(null, "A"), lost] });
		expect(choice?.labels).toEqual(["A", "Lost"]);
		expect(choice?.dropped).toEqual([false, true]);
	});

	test("tuneLabels names a blank dropped tune by position", () => {
		expect(tuneLabels([blank, song(null)])).toEqual(["Tune 1", "Tune 2"]);
	});
});
