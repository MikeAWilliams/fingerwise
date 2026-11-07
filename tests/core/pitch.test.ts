import { describe, expect, test } from "vitest";
import {
	formatPitch,
	isNatural,
	type Pitch,
	parsePitch,
	pitchesInRange,
	toFrequency,
	transpose,
} from "../../src/core/pitch";

function pitch(name: string): Pitch {
	const p = parsePitch(name);
	if (p === null) throw new Error(`bad pitch ${name}`);
	return p;
}

describe("parsePitch / formatPitch", () => {
	test("round trips A3, C♯5 and F5", () => {
		for (const name of ["A3", "C♯5", "F5"]) {
			expect(formatPitch(pitch(name))).toBe(name);
		}
	});

	test("round trips every name from C0 to G9", () => {
		const start = pitch("C0");
		const end = pitch("G9");
		expect(end).toBe(127);
		for (let p = start; p <= end; p++) {
			const name = formatPitch(p as Pitch);
			expect(parsePitch(name)).toBe(p);
		}
	});

	test("accepts ASCII # for ♯, and formats with ♯", () => {
		expect(parsePitch("C#4")).toBe(parsePitch("C♯4"));
		expect(formatPitch(pitch("F#4"))).toBe("F♯4");
	});

	test("known values", () => {
		expect(parsePitch("C4")).toBe(60);
		expect(parsePitch("A4")).toBe(69);
	});

	test.each([
		"H4",
		"D♭4",
		"E♯4",
		"E#4",
		"B#3",
		"B♯3",
		"C",
		"C10",
		"G♯9",
		"",
		"c4",
		" C4",
	])("rejects %j", (name) => {
		expect(parsePitch(name)).toBeNull();
	});
});

describe("transpose", () => {
	test("A3 up an octave is A4", () => {
		expect(formatPitch(transpose(pitch("A3"), 12))).toBe("A4");
	});

	test("negative semitones go down", () => {
		expect(formatPitch(transpose(pitch("A4"), -12))).toBe("A3");
	});
});

describe("pitchesInRange", () => {
	test("A3 to F5 has 21 entries", () => {
		const range = pitchesInRange(pitch("A3"), pitch("F5"));
		expect(range).toHaveLength(21);
		expect(formatPitch(range[0] as Pitch)).toBe("A3");
		expect(formatPitch(range[20] as Pitch)).toBe("F5");
	});
});

describe("isNatural", () => {
	test("naturals are natural", () => {
		expect(isNatural(pitch("C4"))).toBe(true);
		expect(isNatural(pitch("B4"))).toBe(true);
	});

	test("sharps are not natural", () => {
		expect(isNatural(pitch("C♯4"))).toBe(false);
		expect(isNatural(pitch("A♯3"))).toBe(false);
	});
});

describe("toFrequency", () => {
	test("A4 is exactly 440", () => {
		expect(toFrequency(pitch("A4"))).toBe(440);
	});

	test("known values", () => {
		expect(toFrequency(pitch("C4"))).toBeCloseTo(261.6256, 4);
		expect(toFrequency(pitch("A5"))).toBeCloseTo(880, 10);
		expect(toFrequency(pitch("A3"))).toBeCloseTo(220, 10);
	});

	test("an octave doubles the frequency", () => {
		for (let p = 0; p <= 115; p++) {
			const ratio = toFrequency((p + 12) as Pitch) / toFrequency(p as Pitch);
			expect(ratio).toBeCloseTo(2, 10);
		}
	});

	test("A4 to F6 is finite, positive and strictly increasing", () => {
		const freqs = pitchesInRange(pitch("A4"), pitch("F6")).map(toFrequency);
		for (const [i, f] of freqs.entries()) {
			expect(Number.isFinite(f) && f > 0).toBe(true);
			if (i > 0) expect(f).toBeGreaterThan(freqs[i - 1] as number);
		}
	});
});
