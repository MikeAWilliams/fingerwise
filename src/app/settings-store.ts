import type { Instrument } from "../core/instrument";
import {
	type Settings,
	toSettingsJson,
	validateSettings,
} from "../core/settings";

export const SETTINGS_KEY = "fingerwise.settings";

export type SettingsStorage = Pick<Storage, "getItem" | "setItem">;

/** `window.localStorage`, or null when it is absent or blocked. */
export function browserStorage(): SettingsStorage | null {
	try {
		return window.localStorage ?? null;
	} catch {
		return null;
	}
}

/** Stored settings, validated; the defaults when storage is missing, empty, unreadable or unparseable. Never throws. */
export function loadSettings(
	storage: SettingsStorage | null,
	instrument: Instrument,
	defaults: Settings,
): Settings {
	if (storage === null) return defaults;
	try {
		const text = storage.getItem(SETTINGS_KEY);
		if (text === null) return defaults;
		return validateSettings(JSON.parse(text), instrument, defaults);
	} catch {
		return defaults;
	}
}

/** Write the settings under one key. Does nothing without storage; a failed write is ignored. */
export function saveSettings(
	storage: SettingsStorage | null,
	settings: Settings,
): void {
	if (storage === null) return;
	try {
		storage.setItem(SETTINGS_KEY, JSON.stringify(toSettingsJson(settings)));
	} catch {
		// Quota or blocked storage: the app keeps running with in-memory settings.
	}
}
