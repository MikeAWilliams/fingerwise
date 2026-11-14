import { describe, expect, test } from "vitest";
import alto from "../../data/instruments/ocarina-12-taiwanese.json";
import { loadInstrument } from "../../src/core/instrument";
import { formatPitch, type Pitch, parsePitch } from "../../src/core/pitch";
import {
	breaksSoundRule,
	canTurnAutoAdvanceOn,
	canTurnSharpsOff,
	canTurnSoundOn,
	isValidTolerance,
	MAX_TOLERANCE_CENTS,
	MIN_TOLERANCE_CENTS,
	parseDefaults,
	type Settings,
	SettingsError,
	setAutoAdvance,
	setIncludeSharps,
	setSoundEnabled,
	setTimings,
	snapToNaturals,
	soundFits,
	soundTooLongReason,
	toSettingsJson,
	validateSettings,
} from "../../src/core/settings";
import source from "../../src/core/settings/index.ts?raw";

const instrument = loadInstrument(alto);

function pitch(name: string): Pitch {
	const p = parsePitch(name);
	if (p === null) throw new Error(`bad pitch ${name}`);
	return p;
}

function settings(
	lowest: string,
	highest: string,
	includeSharps = true,
	delaySeconds = 3,
	autoAdvance = true,
	advanceDelaySeconds = 3,
): Settings {
	return {
		lowest: pitch(lowest),
		highest: pitch(highest),
		includeSharps,
		delaySeconds,
		autoAdvance,
		advanceDelaySeconds,
		soundEnabled: false,
		soundDelaySeconds: 0.5,
		soundDurationSeconds: 1.5,
		judgeEnabled: false,
		toleranceCents: 40,
	};
}

const DEFAULTS = settings("A3", "F5");

function json(over: Record<string, unknown> = {}): Record<string, unknown> {
	return {
		lowest: "A3",
		highest: "F5",
		includeSharps: true,
		delaySeconds: 3,
		autoAdvance: true,
		advanceDelaySeconds: 3,
		soundEnabled: false,
		soundDelaySeconds: 0.5,
		soundDurationSeconds: 1.5,
		judgeEnabled: false,
		toleranceCents: 40,
		...over,
	};
}

describe("validateSettings", () => {
	test("valid input comes back unchanged", () => {
		const input = settings("C4", "E5", true, 1.3);
		expect(
			validateSettings(toSettingsJson(input), instrument, DEFAULTS),
		).toEqual(input);
	});

	test("clamps bounds into the written range", () => {
		const result = validateSettings(
			json({ lowest: "C3", highest: "A5" }),
			instrument,
			DEFAULTS,
		);
		expect(formatPitch(result.lowest)).toBe("A3");
		expect(formatPitch(result.highest)).toBe("F5");
	});

	test("low equal to or above high resets both bounds", () => {
		for (const [lowest, highest] of [
			["D4", "D4"],
			["E5", "C4"],
		]) {
			const result = validateSettings(json({ lowest, highest }), instrument, {
				...DEFAULTS,
				delaySeconds: 3,
			});
			expect(result).toEqual(DEFAULTS);
		}
	});

	test("a clamped bound that meets the other resets both", () => {
		const result = validateSettings(
			json({ lowest: "C6", highest: "D6" }),
			instrument,
			DEFAULTS,
		);
		expect(result).toEqual(DEFAULTS);
	});

	test("delay edges", () => {
		const delay = (d: unknown) =>
			validateSettings(json({ delaySeconds: d }), instrument, DEFAULTS)
				.delaySeconds;
		expect(delay(0.4)).toBe(3);
		expect(delay(0.5)).toBe(0.5);
		expect(delay(30)).toBe(30);
		expect(delay(30.5)).toBe(3);
		expect(delay(Number.NaN)).toBe(3);
		expect(delay(Number.POSITIVE_INFINITY)).toBe(3);
		expect(delay("5")).toBe(3);
		expect(delay(undefined)).toBe(3);
	});

	test("advance delay edges", () => {
		const delay = (d: unknown) =>
			validateSettings(json({ advanceDelaySeconds: d }), instrument, DEFAULTS)
				.advanceDelaySeconds;
		expect(delay(0.4)).toBe(3);
		expect(delay(0.5)).toBe(0.5);
		expect(delay(30)).toBe(30);
		expect(delay(30.5)).toBe(3);
		expect(delay(Number.NaN)).toBe(3);
		expect(delay(Number.POSITIVE_INFINITY)).toBe(3);
		expect(delay("5")).toBe(3);
		expect(delay(undefined)).toBe(3);
	});

	test("an invalid autoAdvance or advance delay resets alone", () => {
		const defaults = { ...DEFAULTS, autoAdvance: true, advanceDelaySeconds: 3 };
		for (const bad of [undefined, "yes", 1]) {
			const result = validateSettings(
				json({
					lowest: "C4",
					delaySeconds: 1.5,
					autoAdvance: bad,
					advanceDelaySeconds: 7,
				}),
				instrument,
				defaults,
			);
			expect(result.autoAdvance).toBe(true);
			expect(result.advanceDelaySeconds).toBe(7);
			expect(result.lowest).toBe(pitch("C4"));
			expect(result.delaySeconds).toBe(1.5);
		}
		const off = validateSettings(
			json({ autoAdvance: false, advanceDelaySeconds: "x", delaySeconds: 2 }),
			instrument,
			defaults,
		);
		expect(off.autoAdvance).toBe(false);
		expect(off.advanceDelaySeconds).toBe(3);
		expect(off.delaySeconds).toBe(2);
	});

	test("missing fields reset one at a time", () => {
		const result = validateSettings(
			{ lowest: "C4", includeSharps: false },
			instrument,
			DEFAULTS,
		);
		expect(formatPitch(result.lowest)).toBe("C4");
		expect(formatPitch(result.highest)).toBe("F5");
		expect(result.includeSharps).toBe(false);
		expect(result.delaySeconds).toBe(3);
		expect(result.autoAdvance).toBe(true);
		expect(result.advanceDelaySeconds).toBe(3);
	});

	test("non-object input gives the defaults", () => {
		for (const raw of [null, undefined, 5, "x"]) {
			expect(validateSettings(raw, instrument, DEFAULTS)).toEqual(DEFAULTS);
		}
	});

	test("bad pitch names and wrong types reset that field", () => {
		const result = validateSettings(
			json({ lowest: "H9", highest: 12, includeSharps: "yes" }),
			instrument,
			DEFAULTS,
		);
		expect(result).toEqual(DEFAULTS);
	});

	test("sharps off snaps a sharp low, a sharp high, and both", () => {
		const snap = (lowest: string, highest: string) => {
			const r = validateSettings(
				json({ lowest, highest, includeSharps: false }),
				instrument,
				DEFAULTS,
			);
			return [formatPitch(r.lowest), formatPitch(r.highest)];
		};
		expect(snap("C♯4", "E5")).toEqual(["D4", "E5"]);
		expect(snap("C4", "D♯5")).toEqual(["C4", "D5"]);
		expect(snap("A♯3", "D♯5")).toEqual(["B3", "D5"]);
	});

	test("blocked snap resets bounds and sharps flag to the defaults", () => {
		const result = validateSettings(
			json({ lowest: "C♯4", highest: "D♯4", includeSharps: false }),
			instrument,
			DEFAULTS,
		);
		expect(result.lowest).toBe(DEFAULTS.lowest);
		expect(result.highest).toBe(DEFAULTS.highest);
		expect(result.includeSharps).toBe(true);
	});
});

describe("sharps toggle", () => {
	test("off snaps the bounds", () => {
		const result = setIncludeSharps(settings("C♯4", "D♯5"), false);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.settings).toEqual(settings("D4", "D5", false));
		}
	});

	test("blocked when no range is left, and says why", () => {
		const start = settings("C♯4", "D♯4");
		expect(canTurnSharpsOff(start)).toBe(false);
		const result = setIncludeSharps(start, false);
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.reason).not.toBe("");
		expect(snapToNaturals(start.lowest, start.highest)).toBeNull();
	});

	test("on again keeps the bounds", () => {
		const off = settings("D4", "D5", false);
		const result = setIncludeSharps(off, true);
		expect(result).toEqual({
			ok: true,
			settings: { ...off, includeSharps: true },
		});
	});

	test("naturals can be turned off unchanged", () => {
		expect(canTurnSharpsOff(settings("C4", "E4"))).toBe(true);
	});
});

describe("parseDefaults", () => {
	test("accepts the expected defaults", () => {
		expect(parseDefaults(json(), instrument)).toEqual(DEFAULTS);
	});

	test("throws SettingsError for each kind of bad input", () => {
		const bad: [unknown, string][] = [
			[null, "object"],
			[[], "object"],
			[json({ lowest: undefined }), "lowest"],
			[json({ highest: "Z1" }), "highest"],
			[json({ includeSharps: 1 }), "includeSharps"],
			[json({ delaySeconds: 0.4 }), "delaySeconds"],
			[json({ delaySeconds: "3" }), "delaySeconds"],
			[json({ autoAdvance: undefined }), "autoAdvance"],
			[json({ autoAdvance: "true" }), "autoAdvance"],
			[json({ advanceDelaySeconds: undefined }), "advanceDelaySeconds"],
			[json({ advanceDelaySeconds: 0.4 }), "advanceDelaySeconds"],
			[json({ advanceDelaySeconds: 31 }), "advanceDelaySeconds"],
			[json({ advanceDelaySeconds: "3" }), "advanceDelaySeconds"],
			[json({ lowest: "C3" }), "lowest"],
			[json({ highest: "A5" }), "highest"],
			[json({ lowest: "E5", highest: "C4" }), "below"],
			[json({ lowest: "C♯4", includeSharps: false }), "naturals"],
		];
		for (const [raw, fragment] of bad) {
			expect(() => parseDefaults(raw, instrument)).toThrow(SettingsError);
			expect(() => parseDefaults(raw, instrument)).toThrow(fragment);
		}
	});
});

/** Sound on, 0.5 s delay, 1.5 s long, inside a 3 s advance delay. */
function withSound(over: Partial<Settings> = {}): Settings {
	return { ...DEFAULTS, soundEnabled: true, ...over };
}

function soundJson(over: Record<string, unknown> = {}) {
	return json({ soundEnabled: true, ...over });
}

describe("sound fields", () => {
	const SOUND_DEFAULTS = withSound();

	test("each field resets alone", () => {
		const check = (over: Record<string, unknown>, field: keyof Settings) => {
			const result = validateSettings(
				soundJson({ lowest: "C4", delaySeconds: 1.5, ...over }),
				instrument,
				SOUND_DEFAULTS,
			);
			expect(result[field]).toBe(SOUND_DEFAULTS[field]);
			expect(result.lowest).toBe(pitch("C4"));
			expect(result.delaySeconds).toBe(1.5);
		};
		for (const bad of [undefined, "yes", 1]) {
			check({ soundEnabled: bad }, "soundEnabled");
		}
		for (const bad of [-0.1, 30.5, Number.NaN, Number.POSITIVE_INFINITY, "1"]) {
			check({ soundDelaySeconds: bad }, "soundDelaySeconds");
		}
		for (const bad of [0.4, 30.5, Number.NaN, Number.POSITIVE_INFINITY, "1"]) {
			check({ soundDurationSeconds: bad }, "soundDurationSeconds");
		}
	});

	test("bounds: delay 0 to 30, duration 0.5 to 30", () => {
		const read = (over: Record<string, unknown>) =>
			validateSettings(
				soundJson({ soundEnabled: false, ...over }),
				instrument,
				SOUND_DEFAULTS,
			);
		expect(read({ soundDelaySeconds: 0 }).soundDelaySeconds).toBe(0);
		expect(read({ soundDelaySeconds: 30 }).soundDelaySeconds).toBe(30);
		expect(read({ soundDurationSeconds: 0.5 }).soundDurationSeconds).toBe(0.5);
		expect(read({ soundDurationSeconds: 30 }).soundDurationSeconds).toBe(30);
	});

	test("a sum equal to the advance delay is kept", () => {
		const input = soundJson({
			soundDelaySeconds: 0.5,
			soundDurationSeconds: 1.5,
			advanceDelaySeconds: 2,
		});
		const result = validateSettings(input, instrument, SOUND_DEFAULTS);
		expect(result.advanceDelaySeconds).toBe(2);
		expect(result.soundDurationSeconds).toBe(1.5);
	});

	test("one half second over resets the three timings and keeps the rest", () => {
		const result = validateSettings(
			soundJson({
				lowest: "C4",
				delaySeconds: 1.5,
				soundDelaySeconds: 1,
				soundDurationSeconds: 1.5,
				advanceDelaySeconds: 2,
			}),
			instrument,
			SOUND_DEFAULTS,
		);
		expect(result.soundDelaySeconds).toBe(0.5);
		expect(result.soundDurationSeconds).toBe(1.5);
		expect(result.advanceDelaySeconds).toBe(3);
		expect(result.lowest).toBe(pitch("C4"));
		expect(result.delaySeconds).toBe(1.5);
		expect(result.soundEnabled).toBe(true);
	});

	test("no reset with play note off or auto-advance off", () => {
		const long = {
			soundDelaySeconds: 5,
			soundDurationSeconds: 5,
			advanceDelaySeconds: 1,
		};
		for (const off of [{ soundEnabled: false }, { autoAdvance: false }]) {
			const result = validateSettings(
				soundJson({ ...long, ...off }),
				instrument,
				SOUND_DEFAULTS,
			);
			expect(result).toMatchObject({ ...long, ...off });
		}
	});
});

describe("sound rule helpers", () => {
	test("soundFits tolerates half seconds and rejects one step over", () => {
		expect(soundFits(withSound({ advanceDelaySeconds: 2 }))).toBe(true);
		expect(soundFits(withSound({ advanceDelaySeconds: 1.5 }))).toBe(false);
	});

	test("breaksSoundRule needs both sound and auto-advance", () => {
		const long = withSound({ advanceDelaySeconds: 1 });
		expect(breaksSoundRule(long)).toBe(true);
		expect(breaksSoundRule({ ...long, soundEnabled: false })).toBe(false);
		expect(breaksSoundRule({ ...long, autoAdvance: false })).toBe(false);
	});

	test("the reason names the values", () => {
		expect(soundTooLongReason(withSound({ advanceDelaySeconds: 1 }))).toBe(
			"Sound delay plus duration (2 s) is longer than the advance delay (1 s)",
		);
	});
});

describe("sound toggles", () => {
	const longSoundOff = withSound({
		soundEnabled: false,
		advanceDelaySeconds: 1,
	});
	const longAdvanceOff = withSound({
		autoAdvance: false,
		advanceDelaySeconds: 1,
	});

	test("play note is blocked when it would break the rule", () => {
		expect(canTurnSoundOn(longSoundOff)).toBe(false);
		expect(setSoundEnabled(longSoundOff, true)).toEqual({
			ok: false,
			reason:
				"Sound delay plus duration (2 s) is longer than the advance delay (1 s)",
		});
	});

	test("play note is allowed when the values fit, and off always works", () => {
		const fits = withSound({ soundEnabled: false });
		expect(canTurnSoundOn(fits)).toBe(true);
		expect(setSoundEnabled(fits, true)).toEqual({
			ok: true,
			settings: { ...fits, soundEnabled: true },
		});
		expect(setSoundEnabled(withSound(), false)).toMatchObject({ ok: true });
	});

	test("play note is allowed with auto-advance off, whatever the values", () => {
		const s = withSound({
			soundEnabled: false,
			autoAdvance: false,
			advanceDelaySeconds: 1,
		});
		expect(canTurnSoundOn(s)).toBe(true);
	});

	test("auto-advance is blocked when it would break the rule", () => {
		expect(canTurnAutoAdvanceOn(longAdvanceOff)).toBe(false);
		const result = setAutoAdvance(longAdvanceOff, true);
		expect(result).toMatchObject({ ok: false });
		expect(result.ok === false && result.reason).toContain("(2 s)");
	});

	test("auto-advance is allowed when it fits, and off always works", () => {
		const fits = withSound({ autoAdvance: false });
		expect(setAutoAdvance(fits, true)).toMatchObject({ ok: true });
		expect(setAutoAdvance(longSoundOff, false)).toMatchObject({ ok: true });
		expect(
			setAutoAdvance(
				withSound({ soundEnabled: false, advanceDelaySeconds: 1 }),
				true,
			),
		).toMatchObject({ ok: true });
	});
});

describe("setTimings", () => {
	const reason =
		"The sound delay plus the sound duration must not exceed the advance delay.";

	test("accepts an edit that fits, including a sum equal to the advance delay", () => {
		const s = withSound();
		expect(setTimings(s, { advanceDelaySeconds: 2 })).toEqual({
			ok: true,
			settings: { ...s, advanceDelaySeconds: 2 },
		});
	});

	test("rejects an edit of each field that goes over", () => {
		const s = withSound({ advanceDelaySeconds: 2 });
		expect(setTimings(s, { advanceDelaySeconds: 1.5 })).toEqual({
			ok: false,
			reason,
		});
		expect(setTimings(s, { soundDurationSeconds: 2 })).toEqual({
			ok: false,
			reason,
		});
		expect(setTimings(s, { soundDelaySeconds: 1 })).toEqual({
			ok: false,
			reason,
		});
	});

	test("is free with play note off or auto-advance off", () => {
		for (const off of [{ soundEnabled: false }, { autoAdvance: false }]) {
			const s = withSound({ advanceDelaySeconds: 2, ...off });
			expect(setTimings(s, { advanceDelaySeconds: 0.5 })).toMatchObject({
				ok: true,
			});
			expect(setTimings(s, { soundDurationSeconds: 30 })).toMatchObject({
				ok: true,
			});
		}
	});
});

describe("sound in the defaults file", () => {
	test("accepts a valid sound block", () => {
		expect(parseDefaults(soundJson(), instrument)).toEqual(withSound());
	});

	test("rejects each bad field", () => {
		const bad: [Record<string, unknown>, string][] = [
			[{ soundEnabled: undefined }, "soundEnabled"],
			[{ soundEnabled: "true" }, "soundEnabled"],
			[{ soundDelaySeconds: undefined }, "soundDelaySeconds"],
			[{ soundDelaySeconds: -0.5 }, "soundDelaySeconds"],
			[{ soundDelaySeconds: 31 }, "soundDelaySeconds"],
			[{ soundDurationSeconds: 0.4 }, "soundDurationSeconds"],
			[{ soundDurationSeconds: 31 }, "soundDurationSeconds"],
			[{ soundDurationSeconds: "1" }, "soundDurationSeconds"],
		];
		for (const [over, fragment] of bad) {
			expect(() => parseDefaults(soundJson(over), instrument)).toThrow(
				SettingsError,
			);
			expect(() => parseDefaults(soundJson(over), instrument)).toThrow(
				fragment,
			);
		}
	});

	test("rejects a file that breaks the sum rule", () => {
		const over = { advanceDelaySeconds: 1 };
		expect(() => parseDefaults(soundJson(over), instrument)).toThrow(
			SettingsError,
		);
		expect(() => parseDefaults(soundJson(over), instrument)).toThrow("(2 s)");
	});

	test("toSettingsJson includes the sound fields", () => {
		expect(toSettingsJson(withSound())).toMatchObject({
			soundEnabled: true,
			soundDelaySeconds: 0.5,
			soundDurationSeconds: 1.5,
		});
	});
});

describe("judge fields", () => {
	test("bounds are 10 to 45", () => {
		expect(MIN_TOLERANCE_CENTS).toBe(10);
		expect(MAX_TOLERANCE_CENTS).toBe(45);
		for (const v of [10, 10.5, 40, 45]) expect(isValidTolerance(v)).toBe(true);
		for (const v of [9.9, 45.1, Number.NaN, Infinity, -Infinity, "40", null]) {
			expect(isValidTolerance(v)).toBe(false);
		}
	});

	test("valid values are kept", () => {
		for (const toleranceCents of [10, 25.5, 45]) {
			const result = validateSettings(
				json({ judgeEnabled: true, toleranceCents }),
				instrument,
				DEFAULTS,
			);
			expect(result.judgeEnabled).toBe(true);
			expect(result.toleranceCents).toBe(toleranceCents);
		}
	});

	test("a bad judge flag resets alone", () => {
		for (const judgeEnabled of [undefined, "true", 1, null]) {
			const result = validateSettings(
				json({ judgeEnabled, toleranceCents: 20, delaySeconds: 5 }),
				instrument,
				DEFAULTS,
			);
			expect(result).toEqual({
				...DEFAULTS,
				delaySeconds: 5,
				toleranceCents: 20,
			});
		}
	});

	test("a bad tolerance resets alone", () => {
		for (const toleranceCents of [
			undefined,
			"40",
			Number.NaN,
			Infinity,
			-Infinity,
			9.9,
			45.1,
		]) {
			const result = validateSettings(
				json({ judgeEnabled: true, toleranceCents, delaySeconds: 5 }),
				instrument,
				DEFAULTS,
			);
			expect(result).toEqual({
				...DEFAULTS,
				delaySeconds: 5,
				judgeEnabled: true,
			});
		}
	});

	test("old data without the fields gets judge off and 40 cents", () => {
		const {
			judgeEnabled: _j,
			toleranceCents: _t,
			...old
		} = json({
			delaySeconds: 5,
		});
		const result = validateSettings(old, instrument, DEFAULTS);
		expect(result).toEqual({ ...DEFAULTS, delaySeconds: 5 });
	});

	test("the defaults file must hold both fields", () => {
		const bad: [Record<string, unknown>, string][] = [
			[{ judgeEnabled: undefined }, "judgeEnabled"],
			[{ judgeEnabled: "false" }, "judgeEnabled"],
			[{ toleranceCents: undefined }, "toleranceCents"],
			[{ toleranceCents: 9.9 }, "toleranceCents"],
			[{ toleranceCents: 45.1 }, "toleranceCents"],
			[{ toleranceCents: "40" }, "toleranceCents"],
		];
		for (const [over, fragment] of bad) {
			expect(() => parseDefaults(json(over), instrument)).toThrow(
				SettingsError,
			);
			expect(() => parseDefaults(json(over), instrument)).toThrow(fragment);
		}
	});

	test("toSettingsJson includes the judge fields", () => {
		expect(
			toSettingsJson({ ...DEFAULTS, judgeEnabled: true, toleranceCents: 15 }),
		).toMatchObject({ judgeEnabled: true, toleranceCents: 15 });
	});
});

test("the module does not import JSON", () => {
	expect(source).not.toMatch(/\.json["']/);
});
