import type { Instrument } from "../instrument";
import { formatPitch, isNatural, type Pitch, parsePitch } from "../pitch";

export interface Settings {
	lowest: Pitch;
	highest: Pitch;
	includeSharps: boolean;
	delaySeconds: number;
	autoAdvance: boolean;
	advanceDelaySeconds: number;
	soundEnabled: boolean;
	soundDelaySeconds: number;
	soundDurationSeconds: number;
	judgeEnabled: boolean;
	toleranceCents: number;
}

/** Serialized form shared by the defaults file and storage; pitches are note names. */
export interface SettingsJson {
	lowest: string;
	highest: string;
	includeSharps: boolean;
	delaySeconds: number;
	autoAdvance: boolean;
	advanceDelaySeconds: number;
	soundEnabled: boolean;
	soundDelaySeconds: number;
	soundDurationSeconds: number;
	judgeEnabled: boolean;
	toleranceCents: number;
}

export const MIN_DELAY_SECONDS = 0.5;
export const MAX_DELAY_SECONDS = 30;
export const MIN_SOUND_DELAY_SECONDS = 0;
export const MIN_SOUND_DURATION_SECONDS = 0.5;
export const MIN_TOLERANCE_CENTS = 10;
export const MAX_TOLERANCE_CENTS = 45;

export class SettingsError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "SettingsError";
	}
}

export type SettingsResult =
	| { ok: true; settings: Settings }
	| { ok: false; reason: string };

export type SharpsResult = SettingsResult;

export function toSettingsJson(settings: Settings): SettingsJson {
	return {
		lowest: formatPitch(settings.lowest),
		highest: formatPitch(settings.highest),
		includeSharps: settings.includeSharps,
		delaySeconds: settings.delaySeconds,
		autoAdvance: settings.autoAdvance,
		advanceDelaySeconds: settings.advanceDelaySeconds,
		soundEnabled: settings.soundEnabled,
		soundDelaySeconds: settings.soundDelaySeconds,
		soundDurationSeconds: settings.soundDurationSeconds,
		judgeEnabled: settings.judgeEnabled,
		toleranceCents: settings.toleranceCents,
	};
}

/** Move a sharp low bound up and a sharp high bound down to a natural. Null when no range is left. */
export function snapToNaturals(
	lowest: Pitch,
	highest: Pitch,
): { lowest: Pitch; highest: Pitch } | null {
	const low = (isNatural(lowest) ? lowest : lowest + 1) as Pitch;
	const high = (isNatural(highest) ? highest : highest - 1) as Pitch;
	return low < high ? { lowest: low, highest: high } : null;
}

export function canTurnSharpsOff(settings: Settings): boolean {
	return snapToNaturals(settings.lowest, settings.highest) !== null;
}

export function setIncludeSharps(
	settings: Settings,
	on: boolean,
): SharpsResult {
	if (on) return { ok: true, settings: { ...settings, includeSharps: true } };
	const snapped = snapToNaturals(settings.lowest, settings.highest);
	if (snapped === null) {
		return {
			ok: false,
			reason: "Turning sharps off would leave no notes in the range.",
		};
	}
	return {
		ok: true,
		settings: { ...settings, ...snapped, includeSharps: false },
	};
}

/** The sum rule only holds a sound inside the advance wait when both are on. */
export function soundRuleApplies(s: Settings): boolean {
	return s.soundEnabled && s.autoAdvance;
}

/** Sound delay plus duration fits in the advance delay (compared with a tolerance for half seconds). */
export function soundFits(s: Settings): boolean {
	return (
		s.soundDelaySeconds + s.soundDurationSeconds <= s.advanceDelaySeconds + 1e-9
	);
}

export function breaksSoundRule(s: Settings): boolean {
	return soundRuleApplies(s) && !soundFits(s);
}

export function soundTooLongReason(s: Settings): string {
	const total = s.soundDelaySeconds + s.soundDurationSeconds;
	return `Sound delay plus duration (${total} s) is longer than the advance delay (${s.advanceDelaySeconds} s)`;
}

export function canTurnSoundOn(s: Settings): boolean {
	return !breaksSoundRule({ ...s, soundEnabled: true });
}

export function canTurnAutoAdvanceOn(s: Settings): boolean {
	return !breaksSoundRule({ ...s, autoAdvance: true });
}

export function setSoundEnabled(s: Settings, on: boolean): SettingsResult {
	const next = { ...s, soundEnabled: on };
	if (breaksSoundRule(next)) {
		return { ok: false, reason: soundTooLongReason(next) };
	}
	return { ok: true, settings: next };
}

export function setAutoAdvance(s: Settings, on: boolean): SettingsResult {
	const next = { ...s, autoAdvance: on };
	if (breaksSoundRule(next)) {
		return { ok: false, reason: soundTooLongReason(next) };
	}
	return { ok: true, settings: next };
}

export type TimingPatch = Partial<
	Pick<
		Settings,
		"soundDelaySeconds" | "soundDurationSeconds" | "advanceDelaySeconds"
	>
>;

/** Apply a timing edit, or reject it when the sound would outlast the advance delay. */
export function setTimings(s: Settings, patch: TimingPatch): SettingsResult {
	const next = { ...s, ...patch };
	if (breaksSoundRule(next)) {
		return {
			ok: false,
			reason:
				"The sound delay plus the sound duration must not exceed the advance delay.",
		};
	}
	return { ok: true, settings: next };
}

function isValidSoundDelay(value: unknown): value is number {
	return (
		typeof value === "number" &&
		Number.isFinite(value) &&
		value >= MIN_SOUND_DELAY_SECONDS &&
		value <= MAX_DELAY_SECONDS
	);
}

function isValidSoundDuration(value: unknown): value is number {
	return (
		typeof value === "number" &&
		Number.isFinite(value) &&
		value >= MIN_SOUND_DURATION_SECONDS &&
		value <= MAX_DELAY_SECONDS
	);
}

/** A finite number of cents from 10 to 45, so a tone nearer the next semitone is never correct. */
export function isValidTolerance(value: unknown): value is number {
	return (
		typeof value === "number" &&
		Number.isFinite(value) &&
		value >= MIN_TOLERANCE_CENTS &&
		value <= MAX_TOLERANCE_CENTS
	);
}

function isValidDelay(value: unknown): value is number {
	return (
		typeof value === "number" &&
		Number.isFinite(value) &&
		value >= MIN_DELAY_SECONDS &&
		value <= MAX_DELAY_SECONDS
	);
}

function pitchOrNull(value: unknown): Pitch | null {
	return typeof value === "string" ? parsePitch(value) : null;
}

function clamp(p: Pitch, instrument: Instrument): Pitch {
	return Math.min(Math.max(p, instrument.lowest), instrument.highest) as Pitch;
}

/** Make any input into usable settings; invalid parts fall back to `defaults`. Never throws. */
export function validateSettings(
	raw: unknown,
	instrument: Instrument,
	defaults: Settings,
): Settings {
	const obj =
		typeof raw === "object" && raw !== null
			? (raw as Record<string, unknown>)
			: {};

	let lowest = clamp(pitchOrNull(obj.lowest) ?? defaults.lowest, instrument);
	let highest = clamp(pitchOrNull(obj.highest) ?? defaults.highest, instrument);
	let includeSharps =
		typeof obj.includeSharps === "boolean"
			? obj.includeSharps
			: defaults.includeSharps;
	const delaySeconds = isValidDelay(obj.delaySeconds)
		? obj.delaySeconds
		: defaults.delaySeconds;
	const autoAdvance =
		typeof obj.autoAdvance === "boolean"
			? obj.autoAdvance
			: defaults.autoAdvance;
	const advanceDelaySeconds = isValidDelay(obj.advanceDelaySeconds)
		? obj.advanceDelaySeconds
		: defaults.advanceDelaySeconds;
	const soundEnabled =
		typeof obj.soundEnabled === "boolean"
			? obj.soundEnabled
			: defaults.soundEnabled;
	const soundDelaySeconds = isValidSoundDelay(obj.soundDelaySeconds)
		? obj.soundDelaySeconds
		: defaults.soundDelaySeconds;
	const soundDurationSeconds = isValidSoundDuration(obj.soundDurationSeconds)
		? obj.soundDurationSeconds
		: defaults.soundDurationSeconds;
	const judgeEnabled =
		typeof obj.judgeEnabled === "boolean"
			? obj.judgeEnabled
			: defaults.judgeEnabled;
	const toleranceCents = isValidTolerance(obj.toleranceCents)
		? obj.toleranceCents
		: defaults.toleranceCents;

	if (lowest >= highest) {
		lowest = defaults.lowest;
		highest = defaults.highest;
	}
	if (!includeSharps) {
		const snapped = snapToNaturals(lowest, highest);
		if (snapped === null) {
			lowest = defaults.lowest;
			highest = defaults.highest;
			includeSharps = defaults.includeSharps;
		} else {
			({ lowest, highest } = snapped);
		}
	}
	const result: Settings = {
		lowest,
		highest,
		includeSharps,
		delaySeconds,
		autoAdvance,
		advanceDelaySeconds,
		soundEnabled,
		soundDelaySeconds,
		soundDurationSeconds,
		judgeEnabled,
		toleranceCents,
	};
	if (!breaksSoundRule(result)) return result;
	return {
		...result,
		soundDelaySeconds: defaults.soundDelaySeconds,
		soundDurationSeconds: defaults.soundDurationSeconds,
		advanceDelaySeconds: defaults.advanceDelaySeconds,
	};
}

/** Strict parse of the defaults file: throws `SettingsError` unless the file is valid as written. */
export function parseDefaults(raw: unknown, instrument: Instrument): Settings {
	if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
		throw new SettingsError("defaults must be an object");
	}
	const obj = raw as Record<string, unknown>;

	const lowest = pitchOrNull(obj.lowest);
	if (lowest === null)
		throw new SettingsError("lowest must be a note name such as A3");
	const highest = pitchOrNull(obj.highest);
	if (highest === null)
		throw new SettingsError("highest must be a note name such as F5");
	if (typeof obj.includeSharps !== "boolean") {
		throw new SettingsError("includeSharps must be true or false");
	}
	if (!isValidDelay(obj.delaySeconds)) {
		throw new SettingsError(
			`delaySeconds must be a number from ${MIN_DELAY_SECONDS} to ${MAX_DELAY_SECONDS}`,
		);
	}
	if (typeof obj.autoAdvance !== "boolean") {
		throw new SettingsError("autoAdvance must be true or false");
	}
	if (!isValidDelay(obj.advanceDelaySeconds)) {
		throw new SettingsError(
			`advanceDelaySeconds must be a number from ${MIN_DELAY_SECONDS} to ${MAX_DELAY_SECONDS}`,
		);
	}
	if (typeof obj.soundEnabled !== "boolean") {
		throw new SettingsError("soundEnabled must be true or false");
	}
	if (!isValidSoundDelay(obj.soundDelaySeconds)) {
		throw new SettingsError(
			`soundDelaySeconds must be a number from ${MIN_SOUND_DELAY_SECONDS} to ${MAX_DELAY_SECONDS}`,
		);
	}
	if (!isValidSoundDuration(obj.soundDurationSeconds)) {
		throw new SettingsError(
			`soundDurationSeconds must be a number from ${MIN_SOUND_DURATION_SECONDS} to ${MAX_DELAY_SECONDS}`,
		);
	}
	if (typeof obj.judgeEnabled !== "boolean") {
		throw new SettingsError("judgeEnabled must be true or false");
	}
	if (!isValidTolerance(obj.toleranceCents)) {
		throw new SettingsError(
			`toleranceCents must be a number from ${MIN_TOLERANCE_CENTS} to ${MAX_TOLERANCE_CENTS}`,
		);
	}

	for (const [field, p] of [
		["lowest", lowest],
		["highest", highest],
	] as const) {
		if (p < instrument.lowest || p > instrument.highest) {
			throw new SettingsError(
				`${field} is outside the instrument's written range`,
			);
		}
	}
	if (lowest >= highest) {
		throw new SettingsError("lowest must be below highest");
	}
	if (!obj.includeSharps && (!isNatural(lowest) || !isNatural(highest))) {
		throw new SettingsError(
			"lowest and highest must be naturals when includeSharps is false",
		);
	}
	const settings: Settings = {
		lowest,
		highest,
		includeSharps: obj.includeSharps,
		delaySeconds: obj.delaySeconds,
		autoAdvance: obj.autoAdvance,
		advanceDelaySeconds: obj.advanceDelaySeconds,
		soundEnabled: obj.soundEnabled,
		soundDelaySeconds: obj.soundDelaySeconds,
		soundDurationSeconds: obj.soundDurationSeconds,
		judgeEnabled: obj.judgeEnabled,
		toleranceCents: obj.toleranceCents,
	};
	if (breaksSoundRule(settings)) {
		throw new SettingsError(
			`sound delay plus duration must not exceed advanceDelaySeconds when soundEnabled and autoAdvance are on: ${soundTooLongReason(settings)}`,
		);
	}
	return settings;
}
