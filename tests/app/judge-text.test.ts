import { describe, expect, test } from "vitest";
import alto from "../../data/instruments/ocarina-12-taiwanese.json";
import {
	createReadoutThrottle,
	HEARING_NOTHING,
	hearingText,
	READOUT_INTERVAL_MS,
} from "../../src/app/judge-text";
import { loadInstrument, soundingPitch } from "../../src/core/instrument";
import type { Reading } from "../../src/core/judge";
import { type Pitch, parsePitch, toFrequency } from "../../src/core/pitch";

const instrument = loadInstrument(alto);

/** The frequency the alto sounds for written `name`, `cents` off. */
function heard(name: string, cents = 0): number {
	const written = parsePitch(name) as Pitch;
	return toFrequency(soundingPitch(instrument, written)) * 2 ** (cents / 1200);
}

const reading = (frequency: number | null, over: Partial<Reading> = {}) => ({
	time: 0,
	frequency,
	clarity: 0.98,
	level: -30,
	...over,
});

describe("hearingText (F09-S06 AC7)", () => {
	test("names the written note and its offset", () => {
		expect(hearingText(instrument, reading(heard("D4")))).toBe("Hearing D4 0¢");
	});

	test("a sharp and a flat offset keep their signs", () => {
		expect(hearingText(instrument, reading(heard("D4", 23)))).toBe(
			"Hearing D4 +23¢",
		);
		expect(hearingText(instrument, reading(heard("C4", -31)))).toBe(
			"Hearing C4 -31¢",
		);
	});

	test("a reading further off is named by its nearest written note", () => {
		expect(hearingText(instrument, reading(heard("D4", 62)))).toBe(
			"Hearing D♯4 -38¢",
		);
	});

	test("a reading that fails the checks is nothing", () => {
		expect(hearingText(instrument, reading(null))).toBe(HEARING_NOTHING);
		expect(hearingText(instrument, reading(heard("D4"), { level: -70 }))).toBe(
			HEARING_NOTHING,
		);
		expect(
			hearingText(instrument, reading(heard("D4"), { clarity: 0.3 })),
		).toBe(HEARING_NOTHING);
		// Far above the instrument's band.
		expect(hearingText(instrument, reading(9000))).toBe(HEARING_NOTHING);
		expect(HEARING_NOTHING).toBe("Hearing nothing");
	});
});

describe("createReadoutThrottle (F09-S06 AC7)", () => {
	test("allows the first change, then one every 100 ms", () => {
		expect(READOUT_INTERVAL_MS).toBe(100);
		const allowed = createReadoutThrottle();
		expect(allowed(1000)).toBe(true);
		expect(allowed(1099)).toBe(false);
		expect(allowed(1100)).toBe(true);
		expect(allowed(1199)).toBe(false);
		expect(allowed(1250)).toBe(true);
	});

	test("a refused change does not move the clock", () => {
		const allowed = createReadoutThrottle();
		allowed(0);
		expect(allowed(60)).toBe(false);
		expect(allowed(99)).toBe(false);
		expect(allowed(100)).toBe(true);
	});

	test("each throttle has its own clock", () => {
		const a = createReadoutThrottle();
		const b = createReadoutThrottle();
		expect(a(0)).toBe(true);
		expect(b(0)).toBe(true);
	});
});
