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
import { type Settings, toSettingsJson } from "../../src/core/settings";

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
	judgeEnabled: false,
	smartSampling: false,
	toleranceCents: 40,
	useSong: false,
	keepTempo: false,
	metronome: false,
	songAbc: "",
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
		judgeEnabled: true,
		smartSampling: true,
		toleranceCents: 25.5,
		useSong: false,
		keepTempo: false,
		metronome: false,
		songAbc: "",
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
		judgeEnabled: true,
		smartSampling: true,
		toleranceCents: 25.5,
		useSong: false,
		keepTempo: false,
		metronome: false,
		songAbc: "",
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
		judgeEnabled: false,
		smartSampling: false,
		toleranceCents: 40,
		useSong: false,
		keepTempo: false,
		metronome: false,
		songAbc: "",
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
		judgeEnabled: false,
		smartSampling: false,
		toleranceCents: 40,
		useSong: false,
		keepTempo: false,
		metronome: false,
		songAbc: "",
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
		judgeEnabled: false,
		smartSampling: false,
		toleranceCents: 40,
		useSong: false,
		keepTempo: false,
		metronome: false,
		songAbc: "",
	});
});

test("settings saved before judging keep their fields and get judge off, 40 cents", () => {
	const saved = {
		lowest: "C4",
		highest: "E5",
		includeSharps: false,
		delaySeconds: 1.3,
		autoAdvance: false,
		advanceDelaySeconds: 6,
		soundEnabled: false,
		soundDelaySeconds: 2,
		soundDurationSeconds: 4,
	};
	const { storage } = fakeStorage({ [SETTINGS_KEY]: JSON.stringify(saved) });
	expect(loadSettings(storage, instrument, DEFAULTS)).toEqual({
		...saved,
		lowest: pitch("C4"),
		highest: pitch("E5"),
		judgeEnabled: false,
		smartSampling: false,
		toleranceCents: 40,
		useSong: false,
		keepTempo: false,
		metronome: false,
		songAbc: "",
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

test("a song and its switch save and load back", () => {
	const { storage, data } = fakeStorage();
	const settings: Settings = {
		...DEFAULTS,
		useSong: true,
		keepTempo: false,
		metronome: false,
		songAbc: "X:1\nK:C\nC D E|",
	};
	saveSettings(storage, settings);
	expect(JSON.parse(data.get(SETTINGS_KEY) as string)).toMatchObject({
		useSong: true,
		keepTempo: false,
		metronome: false,
		songAbc: "X:1\nK:C\nC D E|",
	});
	expect(loadSettings(storage, instrument, DEFAULTS)).toEqual(settings);
});

test("settings saved before songs load with use song off and no text", () => {
	const old = {
		lowest: "C4",
		highest: "E5",
		includeSharps: true,
		delaySeconds: 4,
		autoAdvance: false,
		advanceDelaySeconds: 3,
		soundEnabled: false,
		soundDelaySeconds: 0.5,
		soundDurationSeconds: 1.5,
		judgeEnabled: true,
		toleranceCents: 30,
	};
	const { storage } = fakeStorage({ [SETTINGS_KEY]: JSON.stringify(old) });
	expect(loadSettings(storage, instrument, DEFAULTS)).toMatchObject({
		lowest: pitch("C4"),
		delaySeconds: 4,
		judgeEnabled: true,
		toleranceCents: 30,
		useSong: false,
		keepTempo: false,
		metronome: false,
		songAbc: "",
	});
});

test("settings saved before smart sampling load with it off and keep their fields", () => {
	const old = {
		lowest: "C4",
		highest: "E5",
		includeSharps: true,
		delaySeconds: 4,
		autoAdvance: false,
		advanceDelaySeconds: 3,
		soundEnabled: false,
		soundDelaySeconds: 0.5,
		soundDurationSeconds: 1.5,
		judgeEnabled: true,
		toleranceCents: 30,
		useSong: false,
		keepTempo: false,
		metronome: false,
		songAbc: "",
	};
	const { storage } = fakeStorage({ [SETTINGS_KEY]: JSON.stringify(old) });
	expect(loadSettings(storage, instrument, DEFAULTS)).toMatchObject({
		delaySeconds: 4,
		judgeEnabled: true,
		toleranceCents: 30,
		smartSampling: false,
	});
});

test("keep tempo saves and loads back", () => {
	const { storage, data } = fakeStorage();
	const settings: Settings = { ...DEFAULTS, useSong: true, keepTempo: true };
	saveSettings(storage, settings);
	expect(JSON.parse(data.get(SETTINGS_KEY) as string)).toMatchObject({
		keepTempo: true,
		metronome: false,
	});
	expect(loadSettings(storage, instrument, DEFAULTS)).toEqual(settings);
});

test("settings saved before keep tempo load with it off and keep their fields", () => {
	const { keepTempo, ...old } = {
		...toSettingsJson({ ...DEFAULTS, delaySeconds: 4, useSong: true }),
	};
	const { storage } = fakeStorage({ [SETTINGS_KEY]: JSON.stringify(old) });
	expect(loadSettings(storage, instrument, DEFAULTS)).toEqual({
		...DEFAULTS,
		delaySeconds: 4,
		useSong: true,
		keepTempo: false,
		metronome: false,
	});
});

test("a non-boolean keep tempo resets alone", () => {
	const bad = {
		...toSettingsJson({ ...DEFAULTS, delaySeconds: 4 }),
		keepTempo: "yes",
	};
	const { storage } = fakeStorage({ [SETTINGS_KEY]: JSON.stringify(bad) });
	expect(loadSettings(storage, instrument, DEFAULTS)).toEqual({
		...DEFAULTS,
		delaySeconds: 4,
		keepTempo: false,
		metronome: false,
	});
});

test("metronome saves and loads back", () => {
	const { storage, data } = fakeStorage();
	const settings: Settings = {
		...DEFAULTS,
		useSong: true,
		keepTempo: true,
		metronome: true,
	};
	saveSettings(storage, settings);
	expect(JSON.parse(data.get(SETTINGS_KEY) as string)).toMatchObject({
		metronome: true,
	});
	expect(loadSettings(storage, instrument, DEFAULTS)).toEqual(settings);
});

test("settings saved before the metronome load with it off and keep their fields", () => {
	const { metronome, ...old } = toSettingsJson({
		...DEFAULTS,
		delaySeconds: 4,
		keepTempo: true,
	});
	const { storage } = fakeStorage({ [SETTINGS_KEY]: JSON.stringify(old) });
	expect(loadSettings(storage, instrument, DEFAULTS)).toEqual({
		...DEFAULTS,
		delaySeconds: 4,
		keepTempo: true,
		metronome: false,
	});
});

test("a non-boolean metronome resets alone", () => {
	const bad = {
		...toSettingsJson({ ...DEFAULTS, delaySeconds: 4 }),
		metronome: "yes",
	};
	const { storage } = fakeStorage({ [SETTINGS_KEY]: JSON.stringify(bad) });
	expect(loadSettings(storage, instrument, DEFAULTS)).toEqual({
		...DEFAULTS,
		delaySeconds: 4,
		metronome: false,
	});
});
