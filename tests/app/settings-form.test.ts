import { describe, expect, test } from "vitest";
import alto from "../../data/instruments/ocarina-12-taiwanese.json";
import {
	applyAdvanceDelayInput,
	applyDelayInput,
	cardsSummary,
	highestOptions,
	lowestOptions,
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
