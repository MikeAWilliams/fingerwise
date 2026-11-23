// Texts about judging shared by the card and the settings view.

import type { CoverageResult } from "../core/coverage";
import type { Instrument } from "../core/instrument";
import {
	DEFAULT_THRESHOLDS,
	frequencyBand,
	passesChecks,
	type Reading,
} from "../core/judge";
import { judgedNote } from "./verdict";

export const JUDGE_HELP =
	"The microphone is open while you drill with this on. Only the time before each reveal is analysed, and no audio is stored or sent.";

export const JUDGE_UNAVAILABLE =
	"Judging is unavailable (microphone blocked or missing).";

export const LISTEN_PROMPT = "Tap or press a key to start listening";

export const START_PROMPT = "Tap or press a key to start";

export const END_OF_SONG = "End of song";

/** What a timed song's summary says: the share covered, or the plain end when nothing was graded or scored. */
export function summaryText(result: CoverageResult | null): string {
	return result === null || result.coverage === null
		? END_OF_SONG
		: `${Math.round(result.coverage * 100)}% covered`;
}

export const HEARING_NOTHING = "Hearing nothing";

/** The readout changes no more often than this, so it stays readable. */
export const READOUT_INTERVAL_MS = 100;

/**
 * What the microphone hears now, in written pitch with its offset from that
 * note, such as "Hearing D4 +23¢"; "Hearing nothing" when the reading fails the
 * judge's checks (no frequency, too quiet, unclear or out of the band).
 */
export function hearingText(instrument: Instrument, reading: Reading): string {
	const checks = { ...DEFAULT_THRESHOLDS, band: frequencyBand(instrument) };
	if (!passesChecks(reading, checks)) return HEARING_NOTHING;
	return `Hearing ${judgedNote(instrument, reading.frequency as number).label}`;
}

/**
 * A rate limit for the readout: call it with the time in ms to ask whether a
 * change may be shown now. It allows one every `READOUT_INTERVAL_MS`.
 */
export function createReadoutThrottle(): (nowMs: number) => boolean {
	let last = Number.NEGATIVE_INFINITY;
	return (nowMs) => {
		if (nowMs - last < READOUT_INTERVAL_MS) return false;
		last = nowMs;
		return true;
	};
}
