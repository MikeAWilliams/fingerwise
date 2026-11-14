import { describe, expect, test } from "vitest";
import { detectPitch, rmsDb } from "../../src/audio/detector";
import { parsePitch, pitchesInRange, toFrequency } from "../../src/core/pitch";

const RATE = 48000;
const SIZE = 2048;

function pitchHz(name: string): number {
	const p = parsePitch(name);
	if (p === null) throw new Error(`bad pitch ${name}`);
	return toFrequency(p);
}

/** Fundamental plus a 2nd harmonic at -24 dB and a 3rd at -32 dB, peak about `amp`. */
function ocarina(hz: number, amp = 0.5, phase = 0.3): Float32Array {
	const h2 = 10 ** (-24 / 20);
	const h3 = 10 ** (-32 / 20);
	const out = new Float32Array(SIZE);
	for (let i = 0; i < SIZE; i++) {
		const t = (2 * Math.PI * hz * i) / RATE + phase;
		out[i] = amp * (Math.sin(t) + h2 * Math.sin(2 * t) + h3 * Math.sin(3 * t));
	}
	return out;
}

/** Deterministic white noise in [-amp, amp] (mulberry32). */
function noise(seed: number, amp = 0.3): Float32Array {
	let a = seed >>> 0;
	const out = new Float32Array(SIZE);
	for (let i = 0; i < SIZE; i++) {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		const r = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		out[i] = (r * 2 - 1) * amp;
	}
	return out;
}

function cents(hz: number, expected: number): number {
	return 1200 * Math.log2(hz / expected);
}

describe("detectPitch (AC8)", () => {
	const lowest = parsePitch("A4");
	const highest = parsePitch("F6");
	if (lowest === null || highest === null) throw new Error("bad range");

	test("every semitone from A4 to F6 within 10 cents, clarity at least 0.9", () => {
		for (const p of pitchesInRange(lowest, highest)) {
			const hz = toFrequency(p);
			for (const amp of [0.5, 0.01]) {
				const { frequency, clarity } = detectPitch(ocarina(hz, amp), RATE);
				expect(frequency, `${hz} Hz`).not.toBeNull();
				expect(
					Math.abs(cents(frequency as number, hz)),
					`${hz} Hz`,
				).toBeLessThan(10);
				expect(clarity, `${hz} Hz`).toBeGreaterThanOrEqual(0.9);
			}
		}
	});

	test("a tone between semitones is found where it is", () => {
		const hz = pitchHz("C5") * 2 ** (23 / 1200);
		const { frequency } = detectPitch(ocarina(hz), RATE);
		expect(Math.abs(cents(frequency as number, hz))).toBeLessThan(10);
	});

	test("white noise has clarity below 0.5", () => {
		for (const seed of [1, 2, 3, 42]) {
			const { clarity } = detectPitch(noise(seed), RATE);
			expect(clarity, `seed ${seed}`).toBeLessThan(0.5);
		}
	});

	test("silence gives no frequency and clarity 0", () => {
		const result = detectPitch(new Float32Array(SIZE), RATE);
		expect(result).toEqual({ frequency: null, clarity: 0 });
	});

	test("a constant offset gives no NaN", () => {
		const dc = new Float32Array(SIZE).fill(0.2);
		const { frequency, clarity } = detectPitch(dc, RATE);
		expect(frequency).toBeNull();
		expect(clarity).toBe(0);
	});

	test("a buffer too short for the range gives nothing", () => {
		expect(detectPitch(new Float32Array(100), RATE)).toEqual({
			frequency: null,
			clarity: 0,
		});
	});

	test("the range is a parameter", () => {
		const hz = pitchHz("A3");
		expect(
			Math.abs(
				cents(
					detectPitch(ocarina(hz), RATE, { minHz: 100, maxHz: 1000 })
						.frequency as number,
					hz,
				),
			),
		).toBeLessThan(10);
	});
});

describe("rmsDb (AC7)", () => {
	test("a full-scale sine is about -3 dBFS", () => {
		const sine = new Float32Array(SIZE);
		for (let i = 0; i < SIZE; i++)
			sine[i] = Math.sin((2 * Math.PI * 1000 * i) / RATE);
		expect(rmsDb(sine)).toBeCloseTo(-3.01, 1);
	});

	test("silence and an empty buffer are -Infinity", () => {
		expect(rmsDb(new Float32Array(SIZE))).toBe(Number.NEGATIVE_INFINITY);
		expect(rmsDb(new Float32Array(0))).toBe(Number.NEGATIVE_INFINITY);
	});
});
