import { describe, expect, test } from "vitest";
import alto from "../../data/instruments/ocarina-12-taiwanese.json";
import {
	applyAdvanceDelayInput,
	applyDelayInput,
	applyToleranceInput,
	cardsSummary,
	editTiming,
	highestOptions,
	lowestOptions,
	micSummary,
	soundSummary,
} from "../../src/app/settings-form";
import { loadInstrument } from "../../src/core/instrument";
import {
	formatPitch,
	isNatural,
	type Pitch,
	parsePitch,
} from "../../src/core/pitch";
import type { Settings } from "../../src/core/settings";

const instrument = loadInstrument(alto);

function settings(
	lowest: string,
	highest: string,
	includeSharps = true,
): Settings {
	return {
		lowest: parsePitch(lowest) as Pitch,
		highest: parsePitch(highest) as Pitch,
		includeSharps,
		delaySeconds: 3,
		autoAdvance: true,
		advanceDelaySeconds: 3,
		soundEnabled: false,
		soundDelaySeconds: 0.5,
		soundDurationSeconds: 1.5,
		judgeEnabled: false,
		toleranceCents: 40,
	};
}

const names = (ps: Pitch[]) => ps.map(formatPitch);

describe("pickers", () => {
	test("the full range is on offer around the default bounds", () => {
		const s = settings("A3", "F5");
		expect(lowestOptions(instrument, s)[0]).toBe(instrument.lowest);
		expect(names(lowestOptions(instrument, s)).at(-1)).toBe("E5");
		expect(names(highestOptions(instrument, s))[0]).toBe("A♯3");
		expect(highestOptions(instrument, s).at(-1)).toBe(instrument.highest);
		expect(lowestOptions(instrument, s)).toHaveLength(
			instrument.highest - instrument.lowest,
		);
	});

	test("lowest excludes the highest and everything above it", () => {
		const options = names(lowestOptions(instrument, settings("A3", "C4")));
		expect(options).toEqual(["A3", "A♯3", "B3"]);
	});

	test("highest excludes the lowest and everything below it", () => {
		const options = names(highestOptions(instrument, settings("D5", "F5")));
		expect(options).toEqual(["D♯5", "E5", "F5"]);
	});

	test("sharps off offers naturals only", () => {
		const s = settings("C4", "E5", false);
		for (const p of [
			...lowestOptions(instrument, s),
			...highestOptions(instrument, s),
		]) {
			expect(isNatural(p)).toBe(true);
		}
		expect(names(lowestOptions(instrument, s)).slice(0, 3)).toEqual([
			"A3",
			"B3",
			"C4",
		]);
	});
});

describe("applyDelayInput", () => {
	const start = settings("A3", "F5");
	test("accepts 0.5 and 30", () => {
		expect(applyDelayInput(start, 0.5).delaySeconds).toBe(0.5);
		expect(applyDelayInput(start, 30).delaySeconds).toBe(30);
	});
	test("rejects 0.4, 30.5 and NaN by returning the settings unchanged", () => {
		for (const v of [0.4, 30.5, Number.NaN]) {
			expect(applyDelayInput(start, v)).toBe(start);
		}
	});
});

describe("applyAdvanceDelayInput", () => {
	const start = settings("A3", "F5");
	test("accepts 0.5 and 30 and leaves the reveal delay alone", () => {
		for (const v of [0.5, 30]) {
			const result = applyAdvanceDelayInput(start, v);
			expect(result.advanceDelaySeconds).toBe(v);
			expect(result.delaySeconds).toBe(start.delaySeconds);
		}
	});
	test("rejects 0.4, 30.5 and NaN by returning the settings unchanged", () => {
		for (const v of [0.4, 30.5, Number.NaN]) {
			expect(applyAdvanceDelayInput(start, v)).toBe(start);
		}
	});
});

describe("cardsSummary", () => {
	test("default settings", () => {
		expect(cardsSummary(settings("A3", "F5"))).toBe(
			"A3 to F5, sharps, reveal 3 s, advance 3 s",
		);
	});
	test("sharps off says naturals", () => {
		expect(cardsSummary(settings("A3", "F5", false))).toBe(
			"A3 to F5, naturals, reveal 3 s, advance 3 s",
		);
	});
	test("auto-advance off says advance off", () => {
		const s = { ...settings("A3", "F5"), autoAdvance: false };
		expect(cardsSummary(s)).toBe("A3 to F5, sharps, reveal 3 s, advance off");
	});
	test("half-second delays", () => {
		const s = {
			...settings("C4", "E5"),
			delaySeconds: 0.5,
			advanceDelaySeconds: 2.5,
		};
		expect(cardsSummary(s)).toBe(
			"C4 to E5, sharps, reveal 0.5 s, advance 2.5 s",
		);
	});
});

describe("soundSummary", () => {
	test("on shows the delay and duration", () => {
		const s = { ...settings("A3", "F5"), soundEnabled: true };
		expect(soundSummary(s)).toBe("on, after 0.5 s, for 1.5 s");
	});
	test("off says off", () => {
		expect(soundSummary(settings("A3", "F5"))).toBe("off");
	});
});

describe("micSummary", () => {
	test("off says off", () => {
		expect(micSummary(settings("A3", "F5"))).toBe("off");
	});
	test("on shows the tolerance", () => {
		const s = { ...settings("A3", "F5"), judgeEnabled: true };
		expect(micSummary(s)).toBe("on, within 40¢");
		expect(micSummary({ ...s, toleranceCents: 12.5 })).toBe("on, within 12.5¢");
	});
});

describe("applyToleranceInput", () => {
	const base = settings("A3", "F5");
	test("accepts 10, 45 and values between, leaving the rest alone", () => {
		for (const v of [10, 25, 45]) {
			expect(applyToleranceInput(base, v)).toEqual({
				...base,
				toleranceCents: v,
			});
		}
	});
	test("rejects 9.9, 45.1, NaN and Infinity by returning the settings unchanged", () => {
		for (const v of [9.9, 45.1, Number.NaN, Infinity]) {
			expect(applyToleranceInput(base, v)).toBe(base);
		}
	});
});

describe("editTiming", () => {
	const on: Settings = { ...settings("A3", "F5"), soundEnabled: true };
	const reason =
		"The sound delay plus the sound duration must not exceed the advance delay.";

	test("out of bounds or not finite is unchanged with no message", () => {
		const cases: [Parameters<typeof editTiming>[1], number][] = [
			["soundDelaySeconds", -0.5],
			["soundDelaySeconds", 30.5],
			["soundDurationSeconds", 0.4],
			["soundDurationSeconds", 31],
			["advanceDelaySeconds", 0.4],
			["advanceDelaySeconds", Number.NaN],
		];
		for (const [field, value] of cases) {
			expect(editTiming(on, field, value)).toEqual({
				settings: on,
				rejected: null,
			});
		}
	});

	test("an edit of each field over the sum is rejected with the message", () => {
		const tight = { ...on, advanceDelaySeconds: 2 };
		for (const [field, value] of [
			["advanceDelaySeconds", 1.5],
			["soundDelaySeconds", 1],
			["soundDurationSeconds", 2],
		] as const) {
			expect(editTiming(tight, field, value)).toEqual({
				settings: tight,
				rejected: reason,
			});
		}
	});

	test("an edit with the sum equal to the advance delay is accepted", () => {
		const result = editTiming(on, "advanceDelaySeconds", 2);
		expect(result.rejected).toBeNull();
		expect(result.settings.advanceDelaySeconds).toBe(2);
	});

	test("edits are free with play note off and with auto-advance off", () => {
		for (const off of [{ soundEnabled: false }, { autoAdvance: false }]) {
			const s = { ...on, ...off };
			expect(editTiming(s, "advanceDelaySeconds", 0.5)).toMatchObject({
				rejected: null,
				settings: { advanceDelaySeconds: 0.5 },
			});
			expect(editTiming(s, "soundDurationSeconds", 30)).toMatchObject({
				rejected: null,
				settings: { soundDurationSeconds: 30 },
			});
		}
	});
});
