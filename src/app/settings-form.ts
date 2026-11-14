import type { Instrument } from "../core/instrument";
import {
	formatPitch,
	isNatural,
	type Pitch,
	pitchesInRange,
} from "../core/pitch";
import {
	isValidTolerance,
	MAX_DELAY_SECONDS,
	MIN_DELAY_SECONDS,
	MIN_SOUND_DELAY_SECONDS,
	MIN_SOUND_DURATION_SECONDS,
	type Settings,
	setTimings,
} from "../core/settings";
import { formatSeconds } from "./section";

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

/** The settings with `value` as the tolerance, or unchanged when it is not a finite number from 10 to 45. */
export function applyToleranceInput(
	settings: Settings,
	value: number,
): Settings {
	if (!isValidTolerance(value)) return settings;
	return { ...settings, toleranceCents: value };
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
