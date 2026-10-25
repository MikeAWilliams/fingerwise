import { expect, test } from "vitest";
import alto from "../../data/instruments/ocarina-12-taiwanese.json";
import {
	loadSettings,
	SETTINGS_KEY,
	type SettingsStorage,
	saveSettings,
} from "../../src/app/settings-store";
import { loadInstrument } from "../../src/core/instrument";
import { type Pitch, parsePitch } from "../../src/core/pitch";
import type { Settings } from "../../src/core/settings";

const instrument = loadInstrument(alto);

function pitch(name: string): Pitch {
	return parsePitch(name) as Pitch;
}

const DEFAULTS: Settings = {
	lowest: pitch("A3"),
	highest: pitch("F5"),
	includeSharps: true,
	delaySeconds: 3,
	autoAdvance: true,
	advanceDelaySeconds: 3,
};

function fakeStorage(initial: Record<string, string> = {}) {
	const data = new Map(Object.entries(initial));
	const storage: SettingsStorage = {
		getItem: (key) => data.get(key) ?? null,
		setItem: (key, value) => {
			data.set(key, value);
		},
	};
	return { storage, data };
}

test("saved settings load back unchanged", () => {
	const { storage, data } = fakeStorage();
	const settings: Settings = {
		lowest: pitch("C4"),
		highest: pitch("E5"),
		includeSharps: false,
		delaySeconds: 1.3,
		autoAdvance: false,
		advanceDelaySeconds: 5,
	};
	saveSettings(storage, settings);
	expect([...data.keys()]).toEqual([SETTINGS_KEY]);
	expect(JSON.parse(data.get(SETTINGS_KEY) as string)).toEqual({
		lowest: "C4",
		highest: "E5",
		includeSharps: false,
		delaySeconds: 1.3,
		autoAdvance: false,
		advanceDelaySeconds: 5,
	});
	expect(loadSettings(storage, instrument, DEFAULTS)).toEqual(settings);
});

test("a missing key gives the defaults", () => {
	expect(loadSettings(fakeStorage().storage, instrument, DEFAULTS)).toEqual(
		DEFAULTS,
	);
});

test("unparseable JSON gives the defaults", () => {
	const { storage } = fakeStorage({ [SETTINGS_KEY]: "{nope" });
	expect(loadSettings(storage, instrument, DEFAULTS)).toEqual(DEFAULTS);
});

test("valid JSON with invalid fields is validated per field", () => {
	const { storage } = fakeStorage({
		[SETTINGS_KEY]: JSON.stringify({
			lowest: "C4",
			highest: "Q9",
			includeSharps: true,
			delaySeconds: 99,
		}),
	});
	const result = loadSettings(storage, instrument, DEFAULTS);
	expect(result.lowest).toBe(pitch("C4"));
	expect(result.highest).toBe(DEFAULTS.highest);
	expect(result.delaySeconds).toBe(3);
});

test("settings saved before auto-advance load with its defaults", () => {
	const { storage } = fakeStorage({
		[SETTINGS_KEY]: JSON.stringify({
			lowest: "C4",
			highest: "E5",
			includeSharps: false,
			delaySeconds: 1.3,
		}),
	});
	expect(loadSettings(storage, instrument, DEFAULTS)).toEqual({
		lowest: pitch("C4"),
		highest: pitch("E5"),
		includeSharps: false,
		delaySeconds: 1.3,
		autoAdvance: true,
		advanceDelaySeconds: 3,
	});
});

test("a throwing getItem gives the defaults", () => {
	const storage: SettingsStorage = {
		getItem: () => {
			throw new Error("blocked");
		},
		setItem: () => {},
	};
	expect(loadSettings(storage, instrument, DEFAULTS)).toEqual(DEFAULTS);
});

test("a throwing setItem is swallowed", () => {
	const storage: SettingsStorage = {
		getItem: () => null,
		setItem: () => {
			throw new Error("quota");
		},
	};
	expect(() => saveSettings(storage, DEFAULTS)).not.toThrow();
});

test("null storage loads the defaults and saves nothing", () => {
	expect(loadSettings(null, instrument, DEFAULTS)).toEqual(DEFAULTS);
	expect(() => saveSettings(null, DEFAULTS)).not.toThrow();
});
