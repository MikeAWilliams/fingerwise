import { describe, expect, test } from "vitest";
import alto from "../../data/instruments/ocarina-12-taiwanese.json";
import {
	graphLabel,
	judgedNote,
	playedOffset,
	tunerVerdict,
} from "../../src/app/verdict";
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

describe("tunerVerdict (F19-S02 AC6)", () => {
	test("within the tolerance, at it and at 0 is in tune, either sign", () => {
		for (const cents of [0, 12, -12, 40, -40]) {
			expect(tunerVerdict(cents, 40)).toEqual({
				inTune: true,
				text: "In tune",
			});
		}
	});

	test("just past the tolerance reads flat or sharp", () => {
		expect(tunerVerdict(40.6, 40)).toEqual({
			inTune: false,
			text: "41 cents sharp",
		});
		expect(tunerVerdict(-40.6, 40)).toEqual({
			inTune: false,
			text: "41 cents flat",
		});
	});

	test("rounds the offset, and goes beyond 50", () => {
		expect(tunerVerdict(62.4, 40).text).toBe("62 cents sharp");
		expect(tunerVerdict(-77.5, 40).text).toBe("78 cents flat");
	});

	test("one cent is singular", () => {
		expect(tunerVerdict(1, 0.5).text).toBe("1 cent sharp");
		expect(tunerVerdict(-1.2, 0.5).text).toBe("1 cent flat");
		expect(tunerVerdict(2, 0.5).text).toBe("2 cents sharp");
	});
});
