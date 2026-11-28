import { describe, expect, test } from "vitest";
import alto from "../../data/instruments/ocarina-12-taiwanese.json";
import defaults from "../../data/settings/defaults.json";
import {
	chooseTempo,
	chosenTempo,
	headerSong,
	PLAY_SONG_TEXT,
	playButton,
	STOP_TEXT,
	tempoChoice,
	tempoEntries,
	tempoText,
	tuneChoice,
	tuneLabels,
	withTempo,
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

describe("Tuner mode (F19-S01 AC3)", () => {
	const tuner: Settings = { ...base, mode: "tuner" };
	const two = [song(120, "One"), song(90, "Two")];

	test("no title or tempo, even with a titled song held", () => {
		expect(headerSong(tuner, song(120, "One"), false)).toEqual({
			title: null,
		});
	});

	test("no Play song button and no tune list, even with two tunes", () => {
		expect(
			playButton({
				settings: tuner,
				song: two[0] ?? null,
				open: false,
				webAudio: true,
				playing: false,
				phase: undefined,
			}),
		).toBeNull();
		expect(
			tuneChoice({
				settings: tuner,
				tunes: two,
				open: false,
				phase: undefined,
			}),
		).toBeNull();
	});
});

describe("tempoText (F10-S01 AC4)", () => {
	test("shows the tempo in quarter notes", () => {
		expect(tempoText(120)).toBe("♩ = 120");
	});

	test("rounds a fractional tempo", () => {
		expect(tempoText(89.6)).toBe("♩ = 90");
		expect(tempoText(60.4)).toBe("♩ = 60");
	});
});

describe("headerSong (F10-S01 AC3, AC7; F18-S02 AC1)", () => {
	test("the title shows in Song mode, in either practice", () => {
		expect(headerSong(on, song(null, "Ode"), false).title).toBe("Ode");
		const single = { ...on, practice: "single" as const };
		expect(headerSong(single, song(null, "Ode"), false).title).toBe("Ode");
	});

	test("no title without one, or in Flashcards (AC9)", () => {
		expect(headerSong(on, song(null), false).title).toBeNull();
		expect(headerSong(flashcards, song(null, "Ode"), false).title).toBeNull();
	});

	test("no song, or Settings open, shows nothing", () => {
		expect(headerSong(on, null, false)).toEqual({ title: null });
		expect(headerSong(on, song(120, "Ode"), true)).toEqual({ title: null });
	});
});

function notes(tempo: number | null, beats: number[]) {
	const pitch = parsePitch("C4");
	if (pitch === null) throw new Error("bad pitch");
	let start = 0;
	const list = beats.map((b) => {
		const note = { pitch, start, beats: b };
		start += b;
		return note;
	});
	return createSong(list, { tempo, meter: DEFAULT_METER });
}
const values = (s: ReturnType<typeof song>) =>
	tempoEntries(s).map((e) => e.value);
const range = (from: number, to: number) => {
	const out: number[] = [];
	for (let n = from; n <= to; n += 5) out.push(n);
	return out;
};

describe("tempoEntries (F18-S02 AC2, AC3, AC4)", () => {
	test("a tune at 90 with eighths: 45 to 135, 90 marked", () => {
		const entries = tempoEntries(notes(90, [0.5, 0.5, 1]));
		expect(entries.map((e) => e.value)).toEqual(range(45, 135));
		const own = entries.filter((e) => e.own);
		expect(own).toHaveLength(1);
		expect(own[0]).toEqual({ value: 90, label: "♩ = 90 (tune)", own: true });
		expect(entries.find((e) => e.value === 100)?.label).toBe("♩ = 100");
	});

	test("a tune at 96 has 96 marked between 95 and 100", () => {
		const entries = tempoEntries(notes(96, [1]));
		const at = entries.findIndex((e) => e.own);
		expect(entries[at]?.value).toBe(96);
		expect(entries[at - 1]?.value).toBe(95);
		expect(entries[at + 1]?.value).toBe(100);
		expect(entries[0]?.value).toBe(50);
		expect(entries[entries.length - 1]?.value).toBe(140);
	});

	test("sixteenths at 100 are capped at 115", () => {
		const list = values(notes(100, [0.25, 1]));
		expect(list[0]).toBe(50);
		expect(list[list.length - 1]).toBe(115);
	});

	test("a tune past its cap lists only its own entry above it", () => {
		const entries = tempoEntries(notes(140, [0.25, 1]));
		expect(entries.map((e) => e.value)).toEqual([...range(70, 115), 140]);
		expect(entries[entries.length - 1]?.own).toBe(true);
	});

	test("no Q: line marks 90", () => {
		const entries = tempoEntries(notes(null, [1]));
		expect(entries.find((e) => e.own)?.label).toBe("♩ = 90 (tune)");
	});

	test("Q:3/8=40 is labelled 60 with the exact value", () => {
		const own = tempoEntries(notes(60, [1])).find((e) => e.own);
		expect(own).toEqual({ value: 60, label: "♩ = 60 (tune)", own: true });
		const odd = tempoEntries(notes(60.4, [1])).find((e) => e.own);
		expect(odd?.value).toBe(60.4);
		expect(odd?.label).toBe("♩ = 60 (tune)");
	});

	test("a slow tune starts at the 30 floor", () => {
		const list = values(notes(40, [1]));
		expect(list[0]).toBe(30);
		expect(list).toEqual([30, 35, 40, 45, 50, 55, 60]);
	});

	test("a rest is not a note, so it does not set the cap", () => {
		const list = values(notes(100, [1, 1]));
		expect(list[list.length - 1]).toBe(150);
	});
});

describe("chosenTempo (F18-S02 AC5, AC10)", () => {
	const tune = notes(96, [1]);
	test("null is the tune's own", () => {
		expect(chosenTempo(tune, null)).toBe(96);
	});
	test("a listed value is used", () => {
		expect(chosenTempo(tune, 75)).toBe(75);
		expect(chosenTempo(tune, 96)).toBe(96);
	});
	test("an unlisted value gives the tune's own", () => {
		expect(chosenTempo(tune, 77)).toBe(96);
		expect(chosenTempo(tune, 400)).toBe(96);
	});
});

describe("tempoChoice (F18-S02 AC1, AC5, AC11)", () => {
	const tune = notes(90, [1]);
	const args = {
		settings: on,
		song: tune,
		open: false,
		phase: "ready" as const,
	};
	test("null in Flashcards, with no song and with Settings open", () => {
		expect(tempoChoice({ ...args, settings: flashcards })).toBeNull();
		expect(tempoChoice({ ...args, song: null })).toBeNull();
		expect(tempoChoice({ ...args, open: true })).toBeNull();
	});
	test("the tune's own entry is selected by default", () => {
		const choice = tempoChoice(args);
		expect(choice?.entries[choice.selected]?.own).toBe(true);
		expect(choice?.disabled).toBe(false);
	});
	test("a saved tempo is selected", () => {
		const choice = tempoChoice({
			...args,
			settings: { ...on, songTempo: 60 },
		});
		expect(choice?.entries[choice.selected]?.value).toBe(60);
	});
	test("disabled only while playing", () => {
		expect(tempoChoice({ ...args, phase: "playing" })?.disabled).toBe(true);
		expect(tempoChoice({ ...args, phase: "summary" })?.disabled).toBe(false);
		expect(tempoChoice({ ...args, phase: undefined })?.disabled).toBe(false);
	});
});

describe("chooseTempo (F18-S02 AC5, AC7)", () => {
	const tune = notes(90, [1]);
	const index = (v: number) =>
		tempoEntries(tune).findIndex((e) => e.value === v);
	test("null for the entry already selected", () => {
		expect(chooseTempo(on, tune, index(90))).toBeNull();
		expect(chooseTempo({ ...on, songTempo: 60 }, tune, index(60))).toBeNull();
	});
	test("a listed entry saves its value", () => {
		expect(chooseTempo(on, tune, index(60))).toEqual({ ...on, songTempo: 60 });
	});
	test("the tune's own entry saves null", () => {
		expect(chooseTempo({ ...on, songTempo: 60 }, tune, index(90))).toEqual({
			...on,
			songTempo: null,
		});
	});
	test("an index past the list is null", () => {
		expect(chooseTempo(on, tune, 999)).toBeNull();
	});
});

describe("withTempo (F18-S02 AC6)", () => {
	const tune = notes(90, [1]);
	test("keeps the song itself for its own tempo", () => {
		expect(withTempo(tune, 90)).toBe(tune);
		expect(withTempo(notes(null, [1]), 90).tempo).toBeNull();
	});
	test("a copy with the new tempo otherwise, the original untouched", () => {
		const copy = withTempo(tune, 60);
		expect(copy).not.toBe(tune);
		expect(copy.tempo).toBe(60);
		expect(copy.notes).toBe(tune.notes);
		expect(tune.tempo).toBe(90);
	});
	test("null stays null", () => {
		expect(withTempo(null, 60)).toBeNull();
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
