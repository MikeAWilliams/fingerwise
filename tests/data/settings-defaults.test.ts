import { expect, test } from "vitest";
import alto from "../../data/instruments/ocarina-12-taiwanese.json";
import defaults from "../../data/settings/defaults.json";
import { loadInstrument } from "../../src/core/instrument";
import { formatPitch } from "../../src/core/pitch";
import { parseDefaults } from "../../src/core/settings";

test("the defaults file is valid for the alto C and holds A3 to F5, sharps, 3 s, auto-advance on, 3 s", () => {
	const settings = parseDefaults(defaults, loadInstrument(alto));
	expect(formatPitch(settings.lowest)).toBe("A3");
	expect(formatPitch(settings.highest)).toBe("F5");
	expect(settings.includeSharps).toBe(true);
	expect(settings.delaySeconds).toBe(3);
	expect(settings.autoAdvance).toBe(true);
	expect(settings.advanceDelaySeconds).toBe(3);
});
