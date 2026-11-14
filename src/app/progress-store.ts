import type { Instrument } from "../core/instrument";
import {
	emptyScores,
	fromProgressJson,
	type Scores,
	toProgressJson,
} from "../core/progress";
import type { SettingsStorage } from "./settings-store";

export const PROGRESS_KEY = "fingerwise.progress";

/** The whole stored object: instrument name to that instrument's scores. */
function readStore(storage: SettingsStorage): Record<string, unknown> {
	try {
		const text = storage.getItem(PROGRESS_KEY);
		if (text === null) return {};
		const value: unknown = JSON.parse(text);
		if (typeof value !== "object" || value === null || Array.isArray(value)) {
			return {};
		}
		return value as Record<string, unknown>;
	} catch {
		return {};
	}
}

/** The instrument's stored scores; none when storage is missing, empty, unreadable or unparseable. Never throws. */
export function loadProgress(
	storage: SettingsStorage | null,
	instrument: Instrument,
): Scores {
	if (storage === null) return emptyScores();
	return fromProgressJson(readStore(storage)[instrument.name], instrument);
}

/** Write the instrument's scores, leaving other instruments' entries as stored. Does nothing without storage; a failed write is ignored. */
export function saveProgress(
	storage: SettingsStorage | null,
	instrument: Instrument,
	scores: Scores,
): void {
	if (storage === null) return;
	try {
		const store = readStore(storage);
		store[instrument.name] = toProgressJson(scores);
		storage.setItem(PROGRESS_KEY, JSON.stringify(store));
	} catch {
		// Quota or blocked storage: the app keeps running with in-memory scores.
	}
}
