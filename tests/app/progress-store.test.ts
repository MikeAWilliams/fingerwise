import { describe, expect, test } from "vitest";
import alto from "../../data/instruments/ocarina-12-taiwanese.json";
import {
	loadProgress,
	PROGRESS_KEY,
	resetProgress,
	saveProgress,
} from "../../src/app/progress-store";
import {
	SETTINGS_KEY,
	type SettingsStorage,
} from "../../src/app/settings-store";
import { loadInstrument } from "../../src/core/instrument";
import { type Pitch, parsePitch } from "../../src/core/pitch";
import type { Scores } from "../../src/core/progress";

const instrument = loadInstrument(alto);

function pitch(name: string): Pitch {
	return parsePitch(name) as Pitch;
}

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

const SCORES: Scores = new Map([
	[pitch("C5"), 0.24],
	[pitch("C♯5"), 0.7],
]);

describe("progress store (F06-S03)", () => {
	test("saved scores load back unchanged, under their own key", () => {
		const { storage, data } = fakeStorage();
		saveProgress(storage, instrument, SCORES);
		expect([...data.keys()]).toEqual([PROGRESS_KEY]);
		expect(PROGRESS_KEY).not.toBe(SETTINGS_KEY);
		expect(JSON.parse(data.get(PROGRESS_KEY) as string)).toEqual({
			[instrument.name]: { C5: 0.24, "C♯5": 0.7 },
		});
		expect(loadProgress(storage, instrument)).toEqual(SCORES);
	});

	test("saving one instrument keeps another's entry as stored", () => {
		const other = { C4: 0.5, whatever: "kept as is" };
		const { storage, data } = fakeStorage({
			[PROGRESS_KEY]: JSON.stringify({ "6-hole pendant": other }),
		});
		saveProgress(storage, instrument, SCORES);
		const stored = JSON.parse(data.get(PROGRESS_KEY) as string);
		expect(stored["6-hole pendant"]).toEqual(other);
		expect(loadProgress(storage, instrument)).toEqual(SCORES);
	});

	test("a missing key, bad JSON or a non-object store gives no scores", () => {
		for (const text of [undefined, "{nope", "[]", "5", "null", '"x"']) {
			const { storage } = fakeStorage(
				text === undefined ? {} : { [PROGRESS_KEY]: text },
			);
			expect(loadProgress(storage, instrument).size).toBe(0);
		}
	});

	test("a store that cannot be read is replaced on save, not thrown on", () => {
		const { storage, data } = fakeStorage({ [PROGRESS_KEY]: "{nope" });
		saveProgress(storage, instrument, SCORES);
		expect(loadProgress(storage, instrument)).toEqual(SCORES);
		expect(JSON.parse(data.get(PROGRESS_KEY) as string)).toHaveProperty(
			instrument.name,
		);
	});

	test("bad entries in the instrument's scores are dropped on load", () => {
		const { storage } = fakeStorage({
			[PROGRESS_KEY]: JSON.stringify({
				[instrument.name]: { C5: 0.5, G2: 0.5, D5: 2 },
			}),
		});
		expect([...loadProgress(storage, instrument)]).toEqual([
			[pitch("C5"), 0.5],
		]);
	});

	test("a throwing getItem loads nothing and a save does not throw", () => {
		const storage: SettingsStorage = {
			getItem: () => {
				throw new Error("blocked");
			},
			setItem: () => {},
		};
		expect(loadProgress(storage, instrument).size).toBe(0);
		expect(() => saveProgress(storage, instrument, SCORES)).not.toThrow();
	});

	test("a throwing setItem is swallowed", () => {
		const storage: SettingsStorage = {
			getItem: () => null,
			setItem: () => {
				throw new Error("quota");
			},
		};
		expect(() => saveProgress(storage, instrument, SCORES)).not.toThrow();
	});

	test("null storage loads nothing and saves nothing", () => {
		expect(loadProgress(null, instrument).size).toBe(0);
		expect(() => saveProgress(null, instrument, SCORES)).not.toThrow();
	});
});

describe("reset progress (F06-S05)", () => {
	test("clears the current instrument and keeps another's entry", () => {
		const other = { C4: 0.5 };
		const { storage, data } = fakeStorage({
			[PROGRESS_KEY]: JSON.stringify({ "6-hole pendant": other }),
		});
		saveProgress(storage, instrument, SCORES);
		const scores = resetProgress(storage, instrument);
		expect(scores.size).toBe(0);
		expect(loadProgress(storage, instrument).size).toBe(0);
		expect(JSON.parse(data.get(PROGRESS_KEY) as string)).toEqual({
			"6-hole pendant": other,
			[instrument.name]: {},
		});
	});

	test("with null, throwing getItem or throwing setItem it returns empty scores and does not throw", () => {
		const throwing: SettingsStorage = {
			getItem: () => {
				throw new Error("blocked");
			},
			setItem: () => {
				throw new Error("quota");
			},
		};
		for (const storage of [null, throwing]) {
			expect(() => resetProgress(storage, instrument)).not.toThrow();
			expect(resetProgress(storage, instrument).size).toBe(0);
		}
	});
});
