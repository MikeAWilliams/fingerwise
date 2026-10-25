import { describe, expect, test } from "vitest";
import {
	formatPitch,
	type Pitch,
	parsePitch,
	pitchesInRange,
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

	test("known values", () => {
		expect(parsePitch("C4")).toBe(60);
		expect(parsePitch("A4")).toBe(69);
	});

	test.each([
		"H4",
		"C#4",
		"D♭4",
		"E♯4",
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
