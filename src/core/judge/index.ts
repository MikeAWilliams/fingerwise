import { type Instrument, soundingPitch } from "../instrument";
import { type Pitch, toFrequency } from "../pitch";

const A4 = 69;
const A4_HZ = 440;
// Absorbs floating-point error so a tone exactly at the tolerance is correct.
const EPSILON_CENTS = 1e-6;

export type Grade = "correct" | "incorrect";

export interface FrequencyBand {
	minHz: number;
	maxHz: number;
}

/** One detector reading. `time` is in ms, `level` is RMS in dBFS. */
export interface Reading {
	time: number;
	frequency: number | null;
	clarity: number;
	level: number;
}

export interface StabilityOptions {
	/** Readings outside it are not counted; null counts every frequency. */
	band: FrequencyBand | null;
	clarity: number;
	gateDb: number;
	spreadCents: number;
	settleMs: number;
	holdOffMs: number;
}

/** Provisional values from the detector spike (docs/research/pitch-detection-spike.md). */
export const DEFAULT_THRESHOLDS: StabilityOptions = {
	band: null,
	clarity: 0.9,
	gateDb: -55,
	spreadCents: 25,
	settleMs: 200,
	holdOffMs: 500,
};

/** The nearest pitch to a frequency and the offset from it in cents, in [-50, 50]. */
export function nearestPitch(hz: number): { pitch: Pitch; cents: number } {
	const midi = A4 + 12 * Math.log2(hz / A4_HZ);
	const pitch = Math.round(midi);
	return { pitch: pitch as Pitch, cents: (midi - pitch) * 100 };
}

/** Signed distance in cents from the expected pitch's frequency. */
export function centsFrom(hz: number, expected: Pitch): number {
	return 1200 * Math.log2(hz / toFrequency(expected));
}

/** Correct when the heard frequency is within `toleranceCents` (inclusive) of the expected sounding pitch. */
export function judge(
	expected: Pitch,
	hz: number,
	toleranceCents: number,
): Grade {
	return Math.abs(centsFrom(hz, expected)) <= toleranceCents + EPSILON_CENTS
		? "correct"
		: "incorrect";
}

/** One octave below the lowest sounding pitch to one octave above the highest. */
export function frequencyBand(instrument: Instrument): FrequencyBand {
	return {
		minHz: toFrequency(
			(soundingPitch(instrument, instrument.lowest) - 12) as Pitch,
		),
		maxHz: toFrequency(
			(soundingPitch(instrument, instrument.highest) + 12) as Pitch,
		),
	};
}

function counts(reading: Reading, options: StabilityOptions): boolean {
	const hz = reading.frequency;
	if (hz === null || !Number.isFinite(hz) || hz <= 0) return false;
	if (!(reading.clarity >= options.clarity)) return false;
	if (!(reading.level >= options.gateDb)) return false;
	const band = options.band;
	return band === null || (hz >= band.minHz && hz <= band.maxHz);
}

function spreadCents(run: readonly Reading[]): number {
	let min = Number.POSITIVE_INFINITY;
	let max = 0;
	for (const r of run) {
		const hz = r.frequency as number;
		if (hz < min) min = hz;
		if (hz > max) max = hz;
	}
	return 1200 * Math.log2(max / min);
}

function median(values: number[]): number {
	const sorted = [...values].sort((a, b) => a - b);
	const mid = sorted.length >> 1;
	return sorted.length % 2 === 1
		? (sorted[mid] as number)
		: ((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2;
}

export interface ToneTracker {
	/** Start listening afresh at `startMs`, clearing any state. */
	reset(startMs: number): void;
	/** Returns the stable tone's frequency once per reset, otherwise null. */
	push(reading: Reading): number | null;
}

/** Turns a stream of readings into at most one stable tone per reset. Time comes only from the readings and `reset`. */
export function createToneTracker(options: StabilityOptions): ToneTracker {
	let start: number | null = null;
	let reported = false;
	let run: Reading[] = [];

	return {
		reset(startMs) {
			start = startMs;
			reported = false;
			run = [];
		},
		push(reading) {
			if (start === null || reported) return null;
			if (reading.time < start + options.holdOffMs) return null;
			if (!counts(reading, options)) {
				run = [];
				return null;
			}
			run.push(reading);
			while (run.length > 1 && spreadCents(run) > options.spreadCents) {
				run.shift();
			}
			const first = run[0] as Reading;
			if (reading.time - first.time < options.settleMs) return null;
			reported = true;
			const tone = median(run.map((r) => r.frequency as number));
			run = [];
			return tone;
		},
	};
}
