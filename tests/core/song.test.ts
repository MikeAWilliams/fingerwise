import { describe, expect, test } from "vitest";
import alto from "../../data/instruments/ocarina-12-taiwanese.json";
import { loadInstrument } from "../../src/core/instrument";
import { type Pitch, parsePitch } from "../../src/core/pitch";
import { createSong, SongError, songOutOfRange } from "../../src/core/song";
import songSource from "../../src/core/song/index.ts?raw";

const instrument = loadInstrument(alto);

function pitch(name: string): Pitch {
	const p = parsePitch(name);
	if (p === null) throw new Error(`bad pitch ${name}`);
	return p;
}

describe("createSong (AC1)", () => {
	test("keeps the order", () => {
		const list = [pitch("C4"), pitch("A3"), pitch("C4")];
		expect(createSong(list).pitches).toEqual(list);
	});

	test("copies the list", () => {
		const list = [pitch("C4"), pitch("D4")];
		const song = createSong(list);
		list.push(pitch("E4"));
		expect(song.pitches).toHaveLength(2);
		expect(song.pitches).not.toBe(list);
	});

	test("an empty list throws SongError", () => {
		expect(() => createSong([])).toThrow(SongError);
	});
});

describe("songOutOfRange against the alto C (AC2)", () => {
	test("a song that fits gives nothing", () => {
		const song = createSong([pitch("A3"), pitch("C5"), pitch("F5")]);
		expect(songOutOfRange(song, instrument)).toEqual([]);
	});

	test("below only", () => {
		const song = createSong([pitch("C4"), pitch("G3")]);
		expect(songOutOfRange(song, instrument)).toEqual([
			{ index: 1, pitch: pitch("G3"), side: "below" },
		]);
	});

	test("above only", () => {
		const song = createSong([pitch("F♯5"), pitch("C4")]);
		expect(songOutOfRange(song, instrument)).toEqual([
			{ index: 0, pitch: pitch("F♯5"), side: "above" },
		]);
	});

	test("both sides, in song order with indexes", () => {
		const song = createSong([
			pitch("C6"),
			pitch("C4"),
			pitch("G3"),
			pitch("G5"),
		]);
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
