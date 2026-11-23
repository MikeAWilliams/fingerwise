import { describe, expect, test } from "vitest";
import alto from "../../data/instruments/ocarina-12-taiwanese.json";
import defaults from "../../data/settings/defaults.json";
import { headerSong, tempoText } from "../../src/app/header-text";
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
