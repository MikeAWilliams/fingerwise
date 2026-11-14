import { describe, expect, test } from "vitest";
import alto from "../../data/instruments/ocarina-12-taiwanese.json";
import { graphLabel, judgedNote, playedOffset } from "../../src/app/verdict";
import { loadInstrument } from "../../src/core/instrument";
import {
	formatPitch,
	type Pitch,
	parsePitch,
	toFrequency,
} from "../../src/core/pitch";

const instrument = loadInstrument(alto);

function pitch(name: string): Pitch {
	const p = parsePitch(name);
	if (p === null) throw new Error(`bad pitch ${name}`);
	return p;
}

function shift(hz: number, cents: number): number {
	return hz * 2 ** (cents / 1200);
}

describe("judgedNote (AC4)", () => {
	test("sounding A4 (440 Hz) is written A3 on the alto C", () => {
		const note = judgedNote(instrument, 440);
		expect(formatPitch(note.pitch)).toBe("A3");
		expect(note.label).toBe("A3 0¢");
	});

	test("names the nearest written note with signed cents", () => {
		const cs6 = toFrequency(pitch("C♯6"));
		expect(judgedNote(instrument, shift(cs6, 23)).label).toBe("C♯5 +23¢");
		expect(judgedNote(instrument, shift(cs6, -7.4)).label).toBe("C♯5 -7¢");
		expect(judgedNote(instrument, shift(cs6, 60)).label).toBe("D5 -40¢");
	});
});

describe("playedOffset", () => {
	test("is measured from the card's sounding pitch", () => {
		const c5 = pitch("C5");
		expect(playedOffset(instrument, c5, toFrequency(pitch("C6")))).toBeCloseTo(
			0,
			9,
		);
		expect(
			playedOffset(instrument, c5, shift(toFrequency(pitch("C6")), 23)),
		).toBeCloseTo(23, 9);
		expect(playedOffset(instrument, c5, toFrequency(pitch("C5")))).toBeCloseTo(
			-1200,
			9,
		);
	});
});

describe("graphLabel (AC10)", () => {
	test("sharp, flat, in tune and one cent", () => {
		expect(graphLabel(pitch("C♯5"), 23.2, pitch("C5"))).toBe(
			"Played C♯5, 23 cents sharp of C5",
		);
		expect(graphLabel(pitch("B4"), -112, pitch("C5"))).toBe(
			"Played B4, 112 cents flat of C5",
		);
		expect(graphLabel(pitch("C5"), 0.3, pitch("C5"))).toBe(
			"Played C5, in tune with C5",
		);
		expect(graphLabel(pitch("C5"), -1, pitch("C5"))).toBe(
			"Played C5, 1 cent flat of C5",
		);
	});
});
