import type { Instrument } from "../instrument";
import { formatPitch, isNatural, type Pitch, parsePitch } from "../pitch";

export interface Settings {
	lowest: Pitch;
	highest: Pitch;
	includeSharps: boolean;
	delaySeconds: number;
}

/** Serialized form shared by the defaults file and storage; pitches are note names. */
export interface SettingsJson {
	lowest: string;
	highest: string;
	includeSharps: boolean;
	delaySeconds: number;
}

export const MIN_DELAY_SECONDS = 0.5;
export const MAX_DELAY_SECONDS = 30;

export class SettingsError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "SettingsError";
	}
}

export type SharpsResult =
	| { ok: true; settings: Settings }
	| { ok: false; reason: string };

export function toSettingsJson(settings: Settings): SettingsJson {
	return {
		lowest: formatPitch(settings.lowest),
		highest: formatPitch(settings.highest),
		includeSharps: settings.includeSharps,
		delaySeconds: settings.delaySeconds,
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
	return { lowest, highest, includeSharps, delaySeconds };
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
	return {
		lowest,
		highest,
		includeSharps: obj.includeSharps,
		delaySeconds: obj.delaySeconds,
	};
}
