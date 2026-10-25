import type { Instrument } from "../core/instrument";
import { isNatural, type Pitch, pitchesInRange } from "../core/pitch";
import {
	MAX_DELAY_SECONDS,
	MIN_DELAY_SECONDS,
	type Settings,
} from "../core/settings";

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
