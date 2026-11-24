import { describe, expect, test } from "vitest";
import alto from "../../data/instruments/ocarina-12-taiwanese.json";
import defaults from "../../data/settings/defaults.json";
import {
	headerSong,
	PLAY_SONG_TEXT,
	playButton,
	STOP_TEXT,
	tempoText,
} from "../../src/app/header-text";
import { loadInstrument } from "../../src/core/instrument";
import { parsePitch } from "../../src/core/pitch";
import { parseDefaults, type Settings } from "../../src/core/settings";
import { createSong, DEFAULT_METER } from "../../src/core/song";

const base = parseDefaults(defaults, loadInstrument(alto));
const on: Settings = { ...base, useSong: true, keepTempo: true };

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

	test("the title shows with use song", () => {
		expect(headerSong(on, song(null, "Ode"), false).title).toBe("Ode");
		const untimed = { ...on, keepTempo: false };
		expect(headerSong(untimed, song(null, "Ode"), false).title).toBe("Ode");
	});

	test("no title without one, or with use song off", () => {
		expect(headerSong(on, song(null), false).title).toBeNull();
		const off = { ...on, useSong: false };
		expect(headerSong(off, song(null, "Ode"), false).title).toBeNull();
	});

	test("no tempo without keep tempo", () => {
		const untimed = { ...on, keepTempo: false };
		expect(headerSong(untimed, song(120, "Ode"), false).tempo).toBeNull();
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
	test("the tempo shows with keep tempo off", () => {
		const untimed = { ...on, keepTempo: false };
		expect(headerSong(untimed, song(120), false).tempo).toBeNull();
		expect(headerSong(untimed, song(120), false, true).tempo).toBe("♩ = 120");
		expect(headerSong(untimed, song(null), false, true).tempo).toBe("♩ = 90");
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

	test("shown with keep tempo, judging and scoring on or off (AC1)", () => {
		for (const keepTempo of [true, false]) {
			for (const judgeEnabled of [true, false]) {
				for (const scoring of ["after", "live"] as const) {
					const settings = { ...on, keepTempo, judgeEnabled, scoring };
					expect(playButton({ ...args, settings })).toEqual({
						icon: "▶",
						text: PLAY_SONG_TEXT,
						disabled: false,
					});
				}
			}
		}
	});

	test("hidden when Settings is open, use song is off, there is no song or no Web Audio (AC1)", () => {
		expect(playButton({ ...args, open: true })).toBeNull();
		expect(
			playButton({ ...args, settings: { ...on, useSong: false } }),
		).toBeNull();
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
