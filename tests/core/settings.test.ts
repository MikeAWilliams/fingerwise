import { describe, expect, test } from "vitest";
import alto from "../../data/instruments/ocarina-12-taiwanese.json";
import { loadInstrument } from "../../src/core/instrument";
import { formatPitch, type Pitch, parsePitch } from "../../src/core/pitch";
import {
	breaksSoundRule,
	canTurnAutoAdvanceOn,
	canTurnSharpsOff,
	canTurnSoundOn,
	isValidSongTune,
	isValidTolerance,
	MAX_SONG_CHARS,
	MAX_TOLERANCE_CENTS,
	MIN_TOLERANCE_CENTS,
	metronomeApplies,
	parseDefaults,
	type Settings,
	SettingsError,
	scoringAfterApplies,
	setAutoAdvance,
	setIncludeSharps,
	setSoundEnabled,
	setTimings,
	singleNoteApplies,
	smartSamplingApplies,
	snapToNaturals,
	soundFits,
	soundTooLongReason,
	tempoApplies,
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
		smartSampling: false,
		toleranceCents: 40,
		mode: "flashcards",
		practice: "single",
		fingeringDelaySeconds: 3,
		singleAdvanceDelaySeconds: 3,
		metronome: false,
		scoring: "live",
		barsPerLine: 2,
		songAbc: "",
		songTune: 1,
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
		smartSampling: false,
		toleranceCents: 40,
		mode: "flashcards",
		practice: "single",
		fingeringDelaySeconds: 3,
		singleAdvanceDelaySeconds: 3,
		metronome: false,
		scoring: "live",
		barsPerLine: 2,
		songAbc: "",
		songTune: 1,
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
				mode: "flashcards",
				practice: "single",
				fingeringDelaySeconds: 3,
				singleAdvanceDelaySeconds: 3,
				metronome: false,
				scoring: "live",
				songAbc: "",
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

describe("song fields", () => {
	const tune = "X:1\nK:C\nC D E|";

	test("the limit is 10,000 characters", () => {
		expect(MAX_SONG_CHARS).toBe(10000);
	});

	test("valid values are kept and round trip through the JSON form", () => {
		const input: Settings = { ...DEFAULTS, mode: "song", songAbc: tune };
		expect(toSettingsJson(input)).toMatchObject({
			mode: "song",
			practice: "single",
			fingeringDelaySeconds: 3,
			singleAdvanceDelaySeconds: 3,
			metronome: false,
			scoring: "live",
			songAbc: tune,
		});
		expect(
			validateSettings(toSettingsJson(input), instrument, DEFAULTS),
		).toEqual(input);
	});

	test("text at the limit is kept, over it resets", () => {
		const atLimit = "C".repeat(MAX_SONG_CHARS);
		expect(
			validateSettings(json({ songAbc: atLimit }), instrument, DEFAULTS)
				.songAbc,
		).toBe(atLimit);
		expect(
			validateSettings(json({ songAbc: `${atLimit}C` }), instrument, DEFAULTS)
				.songAbc,
		).toBe("");
	});

	test("a bad mode resets alone", () => {
		for (const mode of [undefined, "true", 1, null, "Song"]) {
			const result = validateSettings(
				json({ mode, songAbc: tune, delaySeconds: 5 }),
				instrument,
				DEFAULTS,
			);
			expect(result).toEqual({
				...DEFAULTS,
				delaySeconds: 5,
				mode: "flashcards",
				practice: "single",
				fingeringDelaySeconds: 3,
				singleAdvanceDelaySeconds: 3,
				metronome: false,
				scoring: "live",
				songAbc: tune,
			});
		}
	});

	test("a bad song text resets alone", () => {
		for (const songAbc of [undefined, 5, null, ["C"], "x".repeat(10001)]) {
			const result = validateSettings(
				json({ mode: "song", songAbc, delaySeconds: 5 }),
				instrument,
				DEFAULTS,
			);
			expect(result).toEqual({
				...DEFAULTS,
				delaySeconds: 5,
				mode: "song",
				practice: "single",
				fingeringDelaySeconds: 3,
				singleAdvanceDelaySeconds: 3,
				metronome: false,
				scoring: "live",
				songAbc: "",
			});
		}
	});

	test("old data without the fields keeps everything else", () => {
		const { songAbc, ...old } = json({ delaySeconds: 7 });
		expect(validateSettings(old, instrument, DEFAULTS)).toEqual({
			...DEFAULTS,
			delaySeconds: 7,
			mode: "flashcards",
			practice: "single",
			fingeringDelaySeconds: 3,
			singleAdvanceDelaySeconds: 3,
			metronome: false,
			scoring: "live",
			songAbc: "",
		});
	});

	test("text saved empty or never saved takes the defaults' song, other fields kept", () => {
		const withTune = { ...DEFAULTS, songAbc: tune };
		for (const songAbc of ["", undefined]) {
			expect(
				validateSettings(
					json({ mode: "song", songAbc, delaySeconds: 5 }),
					instrument,
					withTune,
				),
			).toEqual({
				...withTune,
				delaySeconds: 5,
				mode: "song",
				practice: "single",
				fingeringDelaySeconds: 3,
				singleAdvanceDelaySeconds: 3,
				metronome: false,
				scoring: "live",
				songAbc: tune,
			});
		}
		const { songAbc, ...old } = json({ delaySeconds: 7 });
		expect(validateSettings(old, instrument, withTune)).toEqual({
			...withTune,
			delaySeconds: 7,
		});
	});

	test("a non-empty stored text is kept over the defaults' song", () => {
		const withTune = { ...DEFAULTS, songAbc: tune };
		expect(
			validateSettings(json({ songAbc: "X:2\nK:C\nG|" }), instrument, withTune)
				.songAbc,
		).toBe("X:2\nK:C\nG|");
	});

	test("the strict parse accepts a song text and rejects a bad text", () => {
		expect(parseDefaults(json({ songAbc: tune }), instrument)).toMatchObject({
			mode: "flashcards",
			practice: "single",
			fingeringDelaySeconds: 3,
			singleAdvanceDelaySeconds: 3,
			metronome: false,
			scoring: "live",
			songAbc: tune,
		});
		expect(parseDefaults(json(), instrument)).toMatchObject({ songAbc: "" });
		const bad: [Record<string, unknown>, string][] = [
			[{ songAbc: undefined }, "songAbc"],
			[{ songAbc: 3 }, "songAbc"],
			[{ songAbc: "x".repeat(MAX_SONG_CHARS + 1) }, "songAbc"],
		];
		for (const [over, fragment] of bad) {
			expect(() => parseDefaults(json(over), instrument)).toThrow(
				SettingsError,
			);
			expect(() => parseDefaults(json(over), instrument)).toThrow(fragment);
		}
	});
});

test("the module does not import JSON", () => {
	expect(source).not.toMatch(/\.json["']/);
});

describe("smart sampling field (F06-S02)", () => {
	test("the defaults file must hold a boolean", () => {
		for (const smartSampling of [undefined, "false", 0, null]) {
			expect(() => parseDefaults(json({ smartSampling }), instrument)).toThrow(
				"smartSampling",
			);
		}
		expect(parseDefaults(json(), instrument).smartSampling).toBe(false);
	});

	test("a valid value is kept and round trips through the JSON form", () => {
		const input = { ...DEFAULTS, smartSampling: true };
		expect(toSettingsJson(input).smartSampling).toBe(true);
		expect(
			validateSettings(toSettingsJson(input), instrument, DEFAULTS),
		).toEqual(input);
	});

	test("old data without it gets false and keeps every other field", () => {
		const { smartSampling: _s, ...old } = json({ delaySeconds: 5 });
		expect(validateSettings(old, instrument, DEFAULTS)).toEqual({
			...DEFAULTS,
			delaySeconds: 5,
			smartSampling: false,
		});
	});

	test("a non-boolean value resets alone", () => {
		for (const smartSampling of ["true", 1, null]) {
			expect(
				validateSettings(
					json({ smartSampling, delaySeconds: 5 }),
					instrument,
					DEFAULTS,
				),
			).toEqual({ ...DEFAULTS, delaySeconds: 5, smartSampling: false });
		}
	});

	test("smartSamplingApplies needs the setting, judging and Flashcards; a song turns it off", () => {
		for (const smartSampling of [false, true]) {
			for (const judgeEnabled of [false, true]) {
				for (const mode of ["flashcards", "song"] as const) {
					expect(
						smartSamplingApplies({
							...DEFAULTS,
							smartSampling,
							judgeEnabled,
							mode,
						}),
					).toBe(smartSampling && judgeEnabled && mode === "flashcards");
				}
			}
		}
	});
});

describe("mode and practice (F16-S01)", () => {
	test("are Flashcards and Single note in the test defaults and round trip", () => {
		expect(DEFAULTS.mode).toBe("flashcards");
		expect(DEFAULTS.practice).toBe("single");
		const input: Settings = {
			...DEFAULTS,
			mode: "song",
			practice: "tempo",
			fingeringDelaySeconds: 5,
			singleAdvanceDelaySeconds: 7,
		};
		const out = toSettingsJson(input);
		expect(out).toMatchObject({
			mode: "song",
			practice: "tempo",
			fingeringDelaySeconds: 5,
			singleAdvanceDelaySeconds: 7,
		});
		expect(out).not.toHaveProperty("useSong");
		expect(out).not.toHaveProperty("keepTempo");
		expect(validateSettings(out, instrument, DEFAULTS)).toEqual(input);
	});

	test("each new field resets alone when bad", () => {
		const cases: [string, unknown[]][] = [
			["mode", [undefined, "Song", 1, null, true]],
			["practice", [undefined, "Tempo", 1, null, false]],
			["fingeringDelaySeconds", [undefined, 0.4, 31, "3", null, Number.NaN]],
			["singleAdvanceDelaySeconds", [undefined, 0.4, 31, "3", null]],
		];
		const other = {
			...DEFAULTS,
			mode: "song" as const,
			practice: "tempo" as const,
			fingeringDelaySeconds: 6,
			singleAdvanceDelaySeconds: 7,
		};
		for (const [field, bads] of cases) {
			for (const bad of bads) {
				const raw = { ...toSettingsJson(other), [field]: bad };
				expect(validateSettings(raw, instrument, DEFAULTS)).toEqual({
					...other,
					[field]: (DEFAULTS as unknown as Record<string, unknown>)[field],
				});
			}
		}
	});

	test("the delays keep their bounds", () => {
		for (const field of [
			"fingeringDelaySeconds",
			"singleAdvanceDelaySeconds",
		] as const) {
			for (const v of [0.5, 30]) {
				expect(
					validateSettings(json({ [field]: v }), instrument, DEFAULTS)[field],
				).toBe(v);
			}
		}
	});

	test("old data maps useSong and keepTempo (AC13)", () => {
		const old = (useSong: unknown, keepTempo: unknown) => {
			const {
				mode: _m,
				practice: _p,
				...rest
			} = json({ delaySeconds: 7, songAbc: "X:1\nK:C\nC|" });
			return validateSettings(
				{ ...rest, useSong, keepTempo },
				instrument,
				DEFAULTS,
			);
		};
		const keep = { delaySeconds: 7, songAbc: "X:1\nK:C\nC|" };
		expect(old(false, false)).toEqual({ ...DEFAULTS, ...keep });
		expect(old(true, false)).toEqual({ ...DEFAULTS, ...keep, mode: "song" });
		expect(old(true, true)).toEqual({
			...DEFAULTS,
			...keep,
			mode: "song",
			practice: "tempo",
		});
		// A hidden keep tempo carries over as a hidden Tempo practice.
		expect(old(false, true)).toEqual({
			...DEFAULTS,
			...keep,
			practice: "tempo",
		});
	});

	test("stored data with neither field loads Flashcards with Single note", () => {
		const { mode, practice, ...old } = json({ delaySeconds: 7 });
		expect(validateSettings(old, instrument, DEFAULTS)).toEqual({
			...DEFAULTS,
			delaySeconds: 7,
		});
	});

	test("the new fields win over old ones, and non-boolean old fields are ignored", () => {
		const raw = json({ mode: "flashcards", practice: "single" });
		expect(
			validateSettings(
				{ ...raw, useSong: true, keepTempo: true },
				instrument,
				DEFAULTS,
			),
		).toEqual(DEFAULTS);
		const { mode, practice, ...rest } = raw;
		expect(
			validateSettings(
				{ ...rest, useSong: "yes", keepTempo: 1 },
				instrument,
				DEFAULTS,
			),
		).toEqual(DEFAULTS);
	});

	test("the strict parse requires each new field", () => {
		const bad: [string, unknown[]][] = [
			["mode", [undefined, "Song", 1, null]],
			["practice", [undefined, "Tempo", 1, null]],
			["fingeringDelaySeconds", [undefined, 0.4, 31, "3", null]],
			["singleAdvanceDelaySeconds", [undefined, 0.4, 31, "3", null]],
		];
		for (const [field, values] of bad) {
			for (const v of values) {
				expect(() => parseDefaults(json({ [field]: v }), instrument)).toThrow(
					SettingsError,
				);
				expect(() => parseDefaults(json({ [field]: v }), instrument)).toThrow(
					field,
				);
			}
		}
		expect(
			parseDefaults(json({ mode: "song", practice: "tempo" }), instrument),
		).toMatchObject({ mode: "song", practice: "tempo" });
	});

	test("tempoApplies and singleNoteApplies follow the mode and practice", () => {
		for (const mode of ["flashcards", "song"] as const) {
			for (const practice of ["single", "tempo"] as const) {
				const s = { ...DEFAULTS, mode, practice };
				expect(tempoApplies(s)).toBe(mode === "song" && practice === "tempo");
				expect(singleNoteApplies(s)).toBe(
					mode === "song" && practice === "single",
				);
			}
		}
	});
});

describe("bars per line", () => {
	test("is 2 in the test defaults and round trips", () => {
		const input = { ...DEFAULTS, barsPerLine: 4 };
		expect(toSettingsJson(input)).toMatchObject({ barsPerLine: 4 });
		expect(
			validateSettings(toSettingsJson(input), instrument, DEFAULTS),
		).toEqual(input);
	});

	test("old data without it, or a bad value, takes the default alone", () => {
		const { barsPerLine, ...old } = json({ delaySeconds: 7 });
		expect(validateSettings(old, instrument, DEFAULTS)).toEqual({
			...DEFAULTS,
			delaySeconds: 7,
		});
		for (const bad of [0, 5, 1.5, "2", null]) {
			expect(
				validateSettings(json({ barsPerLine: bad }), instrument, DEFAULTS),
			).toEqual(DEFAULTS);
		}
	});

	test("the strict parse requires a whole number from 1 to 4", () => {
		expect(parseDefaults(json({ barsPerLine: 3 }), instrument)).toMatchObject({
			barsPerLine: 3,
		});
		for (const bad of [0, 5, 1.5, "2"]) {
			expect(() =>
				parseDefaults(json({ barsPerLine: bad }), instrument),
			).toThrow(/barsPerLine/);
		}
	});
});

describe("metronome (F08-S04 AC1)", () => {
	test("is off in the test defaults and round trips", () => {
		expect(DEFAULTS.metronome).toBe(false);
		const input: Settings = {
			...DEFAULTS,
			mode: "song",
			practice: "tempo",
			metronome: true,
		};
		expect(toSettingsJson(input)).toMatchObject({ metronome: true });
		expect(
			validateSettings(toSettingsJson(input), instrument, DEFAULTS),
		).toEqual(input);
	});

	test("old data without it loads false and keeps every other field", () => {
		const { metronome, ...old } = json({
			delaySeconds: 7,
			mode: "song",
			practice: "tempo",
		});
		expect(validateSettings(old, instrument, DEFAULTS)).toEqual({
			...DEFAULTS,
			delaySeconds: 7,
			mode: "song",
			practice: "tempo",
			metronome: false,
			scoring: "live",
		});
	});

	test("a non-boolean resets alone", () => {
		for (const metronome of ["true", 1, null]) {
			expect(
				validateSettings(
					json({ metronome, practice: "tempo", delaySeconds: 5 }),
					instrument,
					DEFAULTS,
				),
			).toEqual({
				...DEFAULTS,
				practice: "tempo",
				delaySeconds: 5,
				metronome: false,
				scoring: "live",
			});
		}
	});

	test("the strict parse requires a boolean", () => {
		expect(parseDefaults(json({ metronome: false }), instrument)).toMatchObject(
			{ metronome: false },
		);
		for (const metronome of [undefined, "no", 1, null]) {
			expect(() => parseDefaults(json({ metronome }), instrument)).toThrow(
				SettingsError,
			);
			expect(() => parseDefaults(json({ metronome }), instrument)).toThrow(
				"metronome",
			);
		}
	});

	test("metronomeApplies needs Song mode, Tempo and the metronome", () => {
		for (const mode of ["flashcards", "song"] as const) {
			for (const practice of ["single", "tempo"] as const) {
				for (const metronome of [false, true]) {
					expect(
						metronomeApplies({ ...DEFAULTS, mode, practice, metronome }),
					).toBe(mode === "song" && practice === "tempo" && metronome);
				}
			}
		}
	});
});

describe("scoring (F12-S01)", () => {
	test("is live in the test defaults and round trips", () => {
		expect(DEFAULTS.scoring).toBe("live");
		const input: Settings = { ...DEFAULTS, scoring: "after" };
		expect(toSettingsJson(input)).toMatchObject({ scoring: "after" });
		expect(
			validateSettings(toSettingsJson(input), instrument, DEFAULTS),
		).toEqual(input);
	});

	test("the strict parse needs live or after", () => {
		expect(parseDefaults(json({ scoring: "after" }), instrument)).toMatchObject(
			{ scoring: "after" },
		);
		for (const scoring of [undefined, "Live", 1, null, true]) {
			expect(() => parseDefaults(json({ scoring }), instrument)).toThrow(
				SettingsError,
			);
			expect(() => parseDefaults(json({ scoring }), instrument)).toThrow(
				"scoring",
			);
		}
	});

	test("old data without it loads live and keeps every other field", () => {
		const { scoring, ...old } = json({
			delaySeconds: 7,
			mode: "song",
			practice: "tempo",
		});
		expect(validateSettings(old, instrument, DEFAULTS)).toEqual({
			...DEFAULTS,
			delaySeconds: 7,
			mode: "song",
			practice: "tempo",
			scoring: "live",
		});
	});

	test("a bad stored value resets alone", () => {
		for (const scoring of ["Live", "both", 1, null, true]) {
			expect(
				validateSettings(
					json({ scoring, practice: "tempo", delaySeconds: 5 }),
					instrument,
					DEFAULTS,
				),
			).toEqual({
				...DEFAULTS,
				practice: "tempo",
				delaySeconds: 5,
				scoring: "live",
			});
		}
	});

	test("scoringAfterApplies needs Song mode, Tempo, judging and after", () => {
		for (const mode of ["flashcards", "song"] as const) {
			for (const practice of ["single", "tempo"] as const) {
				for (const judgeEnabled of [false, true]) {
					for (const scoring of ["live", "after"] as const) {
						expect(
							scoringAfterApplies({
								...DEFAULTS,
								mode,
								practice,
								judgeEnabled,
								scoring,
							}),
						).toBe(
							mode === "song" &&
								practice === "tempo" &&
								judgeEnabled &&
								scoring === "after",
						);
					}
				}
			}
		}
	});
});

describe("songTune (F14-S01)", () => {
	test("the defaults file chooses tune 1", () => {
		expect(DEFAULTS.songTune).toBe(1);
		expect(toSettingsJson(DEFAULTS).songTune).toBe(1);
	});

	test("a valid position is a whole number of at least 1", () => {
		for (const ok of [1, 2, 30]) expect(isValidSongTune(ok)).toBe(true);
		for (const bad of [0, -1, 1.5, "2", null, undefined, Number.NaN]) {
			expect(isValidSongTune(bad)).toBe(false);
		}
	});

	test("the strict parse rejects a missing or bad position", () => {
		expect(parseDefaults(json({ songTune: 3 }), instrument).songTune).toBe(3);
		for (const songTune of [undefined, 0, 1.5, "2", -1]) {
			expect(() => parseDefaults(json({ songTune }), instrument)).toThrow(
				"songTune must be a whole number of at least 1",
			);
		}
	});

	test("old data without the field keeps every other field", () => {
		const { songTune, ...old } = json({ delaySeconds: 7 });
		expect(validateSettings(old, instrument, DEFAULTS)).toEqual({
			...DEFAULTS,
			delaySeconds: 7,
			songTune: 1,
		});
	});

	test("each bad value resets alone", () => {
		const withTune = { ...DEFAULTS, songTune: 4 };
		for (const songTune of [0, 1.5, "2", -1, null, Number.NaN]) {
			expect(
				validateSettings(json({ songTune, delaySeconds: 5 }), instrument, {
					...withTune,
					songTune: 1,
				}),
			).toEqual({ ...DEFAULTS, delaySeconds: 5, songTune: 1 });
		}
	});

	test("a stored position is kept, and round-trips", () => {
		const chosen = { ...DEFAULTS, songTune: 3 };
		expect(toSettingsJson(chosen).songTune).toBe(3);
		expect(
			validateSettings(toSettingsJson(chosen), instrument, DEFAULTS),
		).toEqual(chosen);
	});
});
