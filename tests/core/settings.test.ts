import { describe, expect, test } from "vitest";
import alto from "../../data/instruments/ocarina-12-taiwanese.json";
import { loadInstrument } from "../../src/core/instrument";
import { formatPitch, type Pitch, parsePitch } from "../../src/core/pitch";
import {
	canTurnSharpsOff,
	parseDefaults,
	type Settings,
	SettingsError,
	setIncludeSharps,
	snapToNaturals,
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
): Settings {
	return {
		lowest: pitch(lowest),
		highest: pitch(highest),
		includeSharps,
		delaySeconds,
	};
}

const DEFAULTS = settings("A3", "F5");

function json(over: Record<string, unknown> = {}): Record<string, unknown> {
	return {
		lowest: "A3",
		highest: "F5",
		includeSharps: true,
		delaySeconds: 3,
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

test("the module does not import JSON", () => {
	expect(source).not.toMatch(/\.json["']/);
});
