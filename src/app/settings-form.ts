import type { Instrument } from "../core/instrument";
import {
	formatPitch,
	isNatural,
	type Pitch,
	pitchesInRange,
} from "../core/pitch";
import {
	isMode,
	isPractice,
	isScoring,
	isValidBarsPerLine,
	isValidTolerance,
	MAX_DELAY_SECONDS,
	MIN_DELAY_SECONDS,
	MIN_SOUND_DELAY_SECONDS,
	MIN_SOUND_DURATION_SECONDS,
	type Mode,
	type Practice,
	type Scoring,
	type Settings,
	setTimings,
} from "../core/settings";
import { formatSeconds } from "./section";

/** The Mode list's choices, in order, with their labels. */
export const MODE_LABELS: Record<Mode, string> = {
	flashcards: "Flashcards",
	song: "Song",
	tuner: "Tuner",
};

/** The Practice list's choices, in order, with their labels. */
export const PRACTICE_LABELS: Record<Practice, string> = {
	single: "Single note",
	tempo: "Tempo",
};

/** The line under Single note's advance delay while it is greyed out. */
export const SINGLE_ADVANCE_NOTE = "Used with the microphone off";

export type SettingsSection =
	| "cards"
	| "sound"
	| "song"
	| "practice"
	| "microphone";

/** The sections Settings shows for the mode, in order; the first one opens. */
export function settingsSections(settings: Settings): SettingsSection[] {
	if (settings.mode === "tuner") return ["microphone"];
	return settings.mode === "song"
		? ["song", "practice", "microphone"]
		: ["cards", "sound", "microphone"];
}

/** The "Judge my playing" checkbox is hidden in Tuner, where the microphone is always on. */
export function judgeCheckboxShown(settings: Settings): boolean {
	return settings.mode !== "tuner";
}

export type PracticeControl =
	| "fingeringDelay"
	| "singleAdvanceDelay"
	| "metronome"
	| "scoring";

/** The controls the Practice section shows for the chosen practice. */
export function practiceControls(settings: Settings): PracticeControl[] {
	return settings.practice === "single"
		? ["fingeringDelay", "singleAdvanceDelay"]
		: ["metronome", "scoring"];
}

/** Single note's advance delay is used with the microphone off, so judging greys it out. */
export function singleAdvanceDisabled(settings: Settings): boolean {
	return settings.judgeEnabled;
}

/** One line of the Practice section's values, shown while it is closed. */
export function practiceSummary(settings: Settings): string {
	if (settings.practice === "single") {
		return `single note, fingering ${formatSeconds(settings.fingeringDelaySeconds)}`;
	}
	return settings.judgeEnabled && settings.scoring === "after"
		? "tempo, scored after the song"
		: "tempo";
}

/** The settings with `value` as the mode, or unchanged when it is not a mode. */
export function applyModeInput(settings: Settings, value: string): Settings {
	if (!isMode(value)) return settings;
	return { ...settings, mode: value };
}

/** The settings with `value` as the practice, or unchanged when it is not a practice. */
export function applyPracticeInput(
	settings: Settings,
	value: string,
): Settings {
	if (!isPractice(value)) return settings;
	return { ...settings, practice: value };
}

/** Asked before progress is cleared. */
export const RESET_CONFIRM = "Reset progress? This can't be undone.";

/** The Scoring list's choices, in order, with their labels. */
export const SCORING_LABELS: Record<Scoring, string> = {
	live: "Live feedback",
	after: "After the song",
};

/** The Scoring list shows only under Tempo, and needs judging; off, it keeps its value. */
export function scoringEnabled(settings: Settings): boolean {
	return settings.judgeEnabled;
}

/** The settings with `value` as the scoring, or unchanged when it is not "live" or "after". */
export function applyScoringInput(settings: Settings, value: string): Settings {
	if (!isScoring(value)) return settings;
	return { ...settings, scoring: value };
}

/** The smart sampling checkbox is off-limits without judging. */
export function smartSamplingDisabled(settings: Settings): boolean {
	return !settings.judgeEnabled;
}

/** The line under the smart sampling checkbox while judging is off, else null. */
export function smartSamplingNote(settings: Settings): string | null {
	return settings.judgeEnabled ? null : "Needs Judge my playing";
}

/** One line of the Cards section's values, shown while it is closed. */
export function cardsSummary(settings: Settings): string {
	return [
		`${formatPitch(settings.lowest)} to ${formatPitch(settings.highest)}`,
		settings.includeSharps ? "sharps" : "naturals",
		`reveal ${formatSeconds(settings.delaySeconds)}`,
		settings.autoAdvance
			? `advance ${formatSeconds(settings.advanceDelaySeconds)}`
			: "advance off",
	].join(", ");
}

/** One line of the Sound section's values, shown while it is closed. */
export function soundSummary(settings: Settings): string {
	if (!settings.soundEnabled) return "off";
	return `on, after ${formatSeconds(settings.soundDelaySeconds)}, for ${formatSeconds(settings.soundDurationSeconds)}`;
}

/** One line of the Microphone section's values, shown while it is closed. */
export function micSummary(settings: Settings): string {
	// Tuner always listens, whatever `judgeEnabled` says.
	if (settings.mode === "tuner") return `within ${settings.toleranceCents}¢`;
	if (!settings.judgeEnabled) return "off";
	return `on, within ${settings.toleranceCents}¢`;
}

function offered(settings: Settings, lowest: Pitch, highest: Pitch): Pitch[] {
	if (lowest > highest) return [];
	return pitchesInRange(lowest, highest).filter(
		(p) => settings.includeSharps || isNatural(p),
	);
}

/** Choices for the lowest pitch: the written range up to, but not including, the highest. */
export function lowestOptions(
	instrument: Instrument,
	settings: Settings,
): Pitch[] {
	return offered(settings, instrument.lowest, (settings.highest - 1) as Pitch);
}

/** Choices for the highest pitch: the written range above, but not including, the lowest. */
export function highestOptions(
	instrument: Instrument,
	settings: Settings,
): Pitch[] {
	return offered(settings, (settings.lowest + 1) as Pitch, instrument.highest);
}

function isDelayInput(value: number): boolean {
	return (
		Number.isFinite(value) &&
		value >= MIN_DELAY_SECONDS &&
		value <= MAX_DELAY_SECONDS
	);
}

/** The settings with `value` as the reveal delay, or unchanged when it is not a finite number from 0.5 to 30. */
export function applyDelayInput(settings: Settings, value: number): Settings {
	if (!isDelayInput(value)) return settings;
	return { ...settings, delaySeconds: value };
}

/** The settings with `value` as the advance delay, or unchanged when it is not a finite number from 0.5 to 30. */
export function applyAdvanceDelayInput(
	settings: Settings,
	value: number,
): Settings {
	if (!isDelayInput(value)) return settings;
	return { ...settings, advanceDelaySeconds: value };
}

/** The settings with `value` as Single note's fingering delay, or unchanged when it is not a finite number from 0.5 to 30. */
export function applyFingeringDelayInput(
	settings: Settings,
	value: number,
): Settings {
	if (!isDelayInput(value)) return settings;
	return { ...settings, fingeringDelaySeconds: value };
}

/** The settings with `value` as Single note's advance delay, or unchanged when it is not a finite number from 0.5 to 30. */
export function applySingleAdvanceDelayInput(
	settings: Settings,
	value: number,
): Settings {
	if (!isDelayInput(value)) return settings;
	return { ...settings, singleAdvanceDelaySeconds: value };
}

/** The settings with `value` as the tolerance, or unchanged when it is not a finite number from 10 to 45. */
export function applyToleranceInput(
	settings: Settings,
	value: number,
): Settings {
	if (!isValidTolerance(value)) return settings;
	return { ...settings, toleranceCents: value };
}

/** The settings with `value` as the bars per line, or unchanged when it is not a whole number from 1 to 4. */
export function applyBarsPerLineInput(
	settings: Settings,
	value: number,
): Settings {
	if (!isValidBarsPerLine(value)) return settings;
	return { ...settings, barsPerLine: value };
}

export type TimingField =
	| "soundDelaySeconds"
	| "soundDurationSeconds"
	| "advanceDelaySeconds";

const TIMING_MIN: Record<TimingField, number> = {
	soundDelaySeconds: MIN_SOUND_DELAY_SECONDS,
	soundDurationSeconds: MIN_SOUND_DURATION_SECONDS,
	advanceDelaySeconds: MIN_DELAY_SECONDS,
};

/**
 * A timing edit from an input. Out of bounds or not finite: unchanged, no message,
 * like the delay inputs. In bounds: the new settings, or unchanged with the reason
 * when the sound would outlast the advance delay.
 */
export function editTiming(
	settings: Settings,
	field: TimingField,
	value: number,
): { settings: Settings; rejected: string | null } {
	if (
		!Number.isFinite(value) ||
		value < TIMING_MIN[field] ||
		value > MAX_DELAY_SECONDS
	) {
		return { settings, rejected: null };
	}
	const result = setTimings(settings, { [field]: value });
	if (!result.ok) return { settings, rejected: result.reason };
	return { settings: result.settings, rejected: null };
}
