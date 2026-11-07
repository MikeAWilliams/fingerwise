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
	soundEnabled: true,
	soundDelaySeconds: 0.5,
	soundDurationSeconds: 1.5,
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
		soundEnabled: false,
		soundDelaySeconds: 2,
		soundDurationSeconds: 4,
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
		soundEnabled: false,
		soundDelaySeconds: 2,
		soundDurationSeconds: 4,
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
		soundEnabled: true,
		soundDelaySeconds: 0.5,
		soundDurationSeconds: 1.5,
	});
});

test("settings saved before sound keep their fields and get sound on, 0.5 s, 1.5 s", () => {
	const { storage } = fakeStorage({
		[SETTINGS_KEY]: JSON.stringify({
			lowest: "C4",
			highest: "E5",
			includeSharps: false,
			delaySeconds: 1.3,
			autoAdvance: true,
			advanceDelaySeconds: 6,
		}),
	});
	expect(loadSettings(storage, instrument, DEFAULTS)).toEqual({
		lowest: pitch("C4"),
		highest: pitch("E5"),
		includeSharps: false,
		delaySeconds: 1.3,
		autoAdvance: true,
		advanceDelaySeconds: 6,
		soundEnabled: true,
		soundDelaySeconds: 0.5,
		soundDurationSeconds: 1.5,
	});
});

test("settings saved before sound with a 1 s advance delay reset the three timings", () => {
	const { storage } = fakeStorage({
		[SETTINGS_KEY]: JSON.stringify({
			lowest: "C4",
			highest: "E5",
			includeSharps: false,
			delaySeconds: 1.3,
			autoAdvance: true,
			advanceDelaySeconds: 1,
		}),
	});
	expect(loadSettings(storage, instrument, DEFAULTS)).toEqual({
		lowest: pitch("C4"),
		highest: pitch("E5"),
		includeSharps: false,
		delaySeconds: 1.3,
		autoAdvance: true,
		advanceDelaySeconds: 3,
		soundEnabled: true,
		soundDelaySeconds: 0.5,
		soundDurationSeconds: 1.5,
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
