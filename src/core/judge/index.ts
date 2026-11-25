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

/** Whether a reading counts at all: a frequency, clear enough, loud enough and inside the band. */
export function passesChecks(
	reading: Reading,
	options: StabilityOptions,
): boolean {
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
			if (!passesChecks(reading, options)) {
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

/**
 * How long a silence must last to end a tone (a live-check value). Short enough
 * that a lifted finger ends it, long enough that a dropout of a reading or two
 * inside a held note does not.
 */
export const TONE_END_SILENCE_MS = 150;

/** The share of `lengthMs` a tone must spend within the tolerance to pass (a live-check value). */
export const SINGLE_NOTE_PASS_SHARE = 0.75;

/** How a finished tone went against the note: it passed, was right but too short, or was mostly wrong. */
export type ToneOutcome = "passed" | "too-short" | "wrong";

export interface ToneGradeOptions {
	/** The sounding pitch expected. */
	expected: Pitch;
	toleranceCents: number;
	/** The length the tone is held against, in time; the app gives the note's lane segment (written length less the release). */
	lengthMs: number;
	/** What makes a reading count as sounding. */
	checks: StabilityOptions;
}

/**
 * Grades a finished tone. Each reading lasts until the next one's time (the
 * last lasts no time). Sounding time is the readings that pass the checks;
 * time within is those the judge grades correct against the tolerance. The
 * tone passes when time within is at least `SINGLE_NOTE_PASS_SHARE` of
 * `lengthMs`, however much longer it sounded; otherwise it is too short
 * when more than half its sounding time was within, and wrong when not.
 */
export function gradeTone(
	readings: readonly Reading[],
	{ expected, toleranceCents, lengthMs, checks }: ToneGradeOptions,
): ToneOutcome {
	let sounding = 0;
	let within = 0;
	readings.forEach((reading, i) => {
		const next = readings[i + 1];
		const duration = next ? Math.max(0, next.time - reading.time) : 0;
		if (!passesChecks(reading, checks)) return;
		sounding += duration;
		if (
			judge(expected, reading.frequency as number, toleranceCents) === "correct"
		) {
			within += duration;
		}
	});
	if (within >= SINGLE_NOTE_PASS_SHARE * lengthMs - EPSILON_MS) return "passed";
	return within > sounding / 2 ? "too-short" : "wrong";
}

// Absorbs floating-point error so exactly the share passes.
const EPSILON_MS = 1e-6;

/** What a tone watch reports: a tone has started, or has ended with every reading it held. */
export type ToneEvent =
	| { kind: "start"; startMs: number }
	| { kind: "end"; readings: Reading[] };

export interface ToneWatch {
	/** Start listening afresh at `startMs`; the hold-off applies. */
	reset(startMs: number): void;
	/** Feeds a reading; returns an event when one happens, else null. */
	push(reading: Reading): ToneEvent | null;
	/** The tone sounding now (its start and every reading since), or null; for the live trace. */
	tone(): { startMs: number; readings: readonly Reading[] } | null;
}

/**
 * Watches readings for tones, any number per reset. A tone starts once
 * sounding readings have lasted `settleMs` (it starts at the first of them) and
 * ends only after `endSilenceMs` of readings that do not sound, never on a change of
 * pitch. A shorter sound is dropped and reports nothing. A tone counts only
 * after a silent reading since the reset, so a sound held across a reset is not
 * a new tone. Time comes only from the readings and `reset`.
 */
export function createToneWatch(
	options: StabilityOptions,
	endSilenceMs = TONE_END_SILENCE_MS,
): ToneWatch {
	let start: number | null = null;
	// Sounding readings since the last silence, before a tone starts.
	let pending: Reading[] = [];
	let active: { startMs: number; readings: Reading[] } | null = null;
	// Where the current silence began inside a tone.
	let silentSince: number | null = null;
	// A tone counts only after some silence since the reset, so a sound held from the
	// last note (or a repeated pitch held across two notes) is not a new tone.
	let armed = false;

	return {
		reset(startMs) {
			start = startMs;
			pending = [];
			active = null;
			silentSince = null;
			armed = false;
		},
		push(reading) {
			if (start === null) return null;
			const sounding = passesChecks(reading, options);
			if (reading.time < start + options.holdOffMs) {
				if (!sounding) armed = true;
				return null;
			}
			if (active === null) {
				if (!sounding) {
					armed = true;
					pending = [];
					return null;
				}
				if (!armed) return null;
				pending.push(reading);
				const first = pending[0] as Reading;
				if (reading.time - first.time < options.settleMs) return null;
				active = { startMs: first.time, readings: pending };
				pending = [];
				silentSince = null;
				return { kind: "start", startMs: first.time };
			}
			active.readings.push(reading);
			if (sounding) {
				silentSince = null;
				return null;
			}
			silentSince ??= reading.time;
			if (reading.time - silentSince < endSilenceMs) return null;
			const readings = active.readings;
			active = null;
			silentSince = null;
			return { kind: "end", readings };
		},
		tone() {
			return active;
		},
	};
}
