import { describe, expect, test } from "vitest";
import alto from "../../data/instruments/ocarina-12-taiwanese.json";
import {
	applyDelayInput,
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
