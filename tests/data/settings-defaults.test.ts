import { expect, test } from "vitest";
import alto from "../../data/instruments/ocarina-12-taiwanese.json";
import defaults from "../../data/settings/defaults.json";
import { parseAbc } from "../../src/abc";
import { loadInstrument } from "../../src/core/instrument";
import { formatPitch } from "../../src/core/pitch";
import { parseDefaults } from "../../src/core/settings";

test("the defaults file is valid for the alto C and holds A3 to F5, sharps, 3 s, auto-advance on, 3 s, sound on, 0.5 s, 1.5 s, judge off, smart sampling off, 40 cents, use song off, keep tempo off, metronome off, scoring live and the example song", () => {
	const settings = parseDefaults(defaults, loadInstrument(alto));
	expect(formatPitch(settings.lowest)).toBe("A3");
	expect(formatPitch(settings.highest)).toBe("F5");
	expect(settings.includeSharps).toBe(true);
	expect(settings.delaySeconds).toBe(3);
	expect(settings.autoAdvance).toBe(true);
	expect(settings.advanceDelaySeconds).toBe(3);
	expect(settings.soundEnabled).toBe(true);
	expect(settings.soundDelaySeconds).toBe(0.5);
	expect(settings.soundDurationSeconds).toBe(1.5);
	expect(settings.judgeEnabled).toBe(false);
	expect(settings.smartSampling).toBe(false);
	expect(settings.toleranceCents).toBe(40);
	expect(settings.mode).toBe("flashcards");
	expect(settings.practice).toBe("single");
	expect(settings.fingeringDelaySeconds).toBe(3);
	expect(settings.singleAdvanceDelaySeconds).toBe(3);
	expect(settings.metronome).toBe(false);
	expect(settings.scoring).toBe("live");
	expect(settings.songTune).toBe(1);
	expect(settings.songTempo).toBeNull();
	expect(settings.songAbc).not.toBe("");
	expect(settings.songAbc.startsWith("T: Mary Had a Little Lamb")).toBe(true);
});

test("the default song parses with no problems for the alto C", async () => {
	const result = await parseAbc(defaults.songAbc, loadInstrument(alto));
	expect(result).toMatchObject({
		ok: true,
		tunes: [{ notes: 26, converted: 0 }],
	});
});
