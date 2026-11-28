// Texts about judging shared by the card and the settings view.

import type { CoverageResult } from "../core/coverage";
import type { Instrument } from "../core/instrument";
import {
	DEFAULT_THRESHOLDS,
	frequencyBand,
	passesChecks,
	type Reading,
} from "../core/judge";
import { formatPitch, type Pitch } from "../core/pitch";
import { judgedNote } from "./verdict";

export const JUDGE_HELP =
	"The microphone is open while you drill with this on. Only the time before each reveal is analysed, and no audio is stored or sent.";

/** Shown in place of `JUDGE_HELP` in Tuner, where the checkbox is hidden. */
export const TUNER_HELP =
	"The microphone is open while Tuner shows. No audio is stored or sent.";

/** Tuner's prompt while the microphone is open and no note sounds. */
export const PLAY_A_NOTE = "Play a note";

export const JUDGE_UNAVAILABLE =
	"Judging is unavailable (microphone blocked or missing).";

export const LISTEN_PROMPT = "Tap or press a key to start listening";

export const START_PROMPT = "Tap or press a key to start";

export const END_OF_SONG = "End of song";

/** Single note, a right tone that ended before it passed: shown in the bar until the next tone starts. */
export const PLAY_WHOLE_VALUE = "Play the note's whole value";

/** The quiet line in the song's bar while it plays with scoring after the song. */
export const SCORING_AFTER = "Scoring after the song";

/** The quiet line once the last note has ended and the player is still being listened to. */
/** The label of the overrun lane under the last line. */
export const OVERRUN_LABEL = "after the end";

/** "+3.2 s": how much of the overrun is past the lane's width. */
export function overrunMoreText(ms: number): string {
	return `+${(ms / 1000).toFixed(1)} s`;
}

/** The quiet line in the song's bar while the song is played to the player. */
export const PLAYING_SONG = "Playing the song";

export const LISTENING_PAST_END = "Listening… stop playing to see your score";

const percent = (share: number) => `${Math.round(share * 100)}%`;

/** "started late 12%, early 3%" from the two faults and the notes with that edge; null when no note has the edge. */
function timingPart(
	label: string,
	first: [string, { faults: number; withEdge: number }],
	second: [string, { faults: number; withEdge: number }],
): string | null {
	const edges = first[1].withEdge;
	if (edges === 0) return null;
	return `${label} ${first[0]} ${percent(first[1].faults / edges)}, ${second[0]} ${percent(second[1].faults / edges)}`;
}

/**
 * What a timed song's summary says, such as "82% covered · 64% in tune ·
 * started late 12%, early 3% · ended early 5%, late 20% · not separated 10% · 2
 * notes too short to grade". A part with nothing to count (no notes with that
 * edge, no plain joins, no note played right, none too short) is left out
 * rather than shown as 0%. With nothing graded, or no scoring (judging off),
 * the plain end of the song.
 */
export function summaryText(result: CoverageResult | null): string {
	if (result === null || result.coverage === null) return END_OF_SONG;
	const { timing, separation } = result;
	const parts = [
		`${percent(result.coverage)} covered`,
		result.inTune === null ? null : `${percent(result.inTune)} in tune`,
		timingPart(
			"started",
			["late", timing.startedLate],
			["early", timing.startedEarly],
		),
		timingPart(
			"ended",
			["early", timing.endedEarly],
			["late", timing.endedLate],
		),
		separation.plainJoins === 0
			? null
			: `not separated ${percent(separation.notSeparated / separation.plainJoins)}`,
		result.tooShort === 0
			? null
			: `${result.tooShort} ${result.tooShort === 1 ? "note" : "notes"} too short to grade`,
	];
	return parts.filter((part) => part !== null).join(" · ");
}

/** How many pitches the tuning line names. */
const TUNING_SHOWN = 3;

/** "+70¢", or "−35¢" with a true minus sign. */
function signedCents(cents: number): string {
	const rounded = Math.round(cents);
	return rounded < 0 ? `−${-rounded}¢` : `+${rounded}¢`;
}

/**
 * The line after the summary, such as "Furthest off: D4 +70¢ · E5 +40¢ · C4
 * −35¢": up to three written pitches, in the order given (worst first); null
 * when none is outside the tolerance.
 */
export function tuningText(
	tuning: readonly { pitch: Pitch; cents: number }[],
): string | null {
	if (tuning.length === 0) return null;
	const named = tuning
		.slice(0, TUNING_SHOWN)
		.map((t) => `${formatPitch(t.pitch)} ${signedCents(t.cents)}`);
	return `Furthest off: ${named.join(" · ")}`;
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
