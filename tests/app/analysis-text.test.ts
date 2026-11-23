import { describe, expect, test } from "vitest";
import {
	breakdownText,
	habitLines,
	lengthName,
	NO_SPOT,
	offsetPhrase,
	restText,
	spotLines,
} from "../../src/app/analysis-text";
import type { Breakdown, Habits } from "../../src/core/analysis";

const breakdown = (over: Partial<Breakdown> = {}): Breakdown => ({
	inTune: 0.45,
	outOfTune: 0.12,
	silentBefore: 0.11,
	silentAfter: 0.16,
	silentMiddle: 0.04,
	wrong: 0.12,
	notPlayed: 0,
	...over,
});

const habits = (over: Partial<Habits> = {}): Habits => ({
	start: null,
	length: null,
	byLength: [],
	gap: null,
	drift: null,
	...over,
});

describe("breakdownText (AC2)", () => {
	test("the two right-note shares first, then losses largest first, leaving out 0%", () => {
		expect(breakdownText(breakdown())).toBe(
			"45% in tune · 12% out of tune · 16% silent after it stopped · 12% wrong note · 11% silent before the note started · 4% silent in the middle",
		);
	});

	test("a share that rounds to 0% is left out, one that rounds to 1% stays", () => {
		const text = breakdownText(
			breakdown({
				inTune: 0.9,
				outOfTune: 0.004,
				wrong: 0.005,
				silentBefore: 0.091,
				silentAfter: 0,
				silentMiddle: 0,
			}),
		);
		expect(text).toBe(
			"90% in tune · 9% silent before the note started · 1% wrong note",
		);
	});

	test("names not played, and all seven can show", () => {
		const all = breakdownText({
			inTune: 0.3,
			outOfTune: 0.2,
			silentBefore: 0.1,
			silentAfter: 0.1,
			silentMiddle: 0.1,
			wrong: 0.1,
			notPlayed: 0.1,
		});
		expect(all.split(" · ")).toHaveLength(7);
		expect(all).toContain("10% not played");
	});
});

describe("restText (AC2)", () => {
	test("a share, or nothing with no graded rests", () => {
		expect(restText(0.123)).toBe("Sound during rests: 12%");
		expect(restText(0)).toBe("Sound during rests: 0%");
		expect(restText(null)).toBeNull();
	});
});

describe("offsetPhrase", () => {
	test("rounds to 10 ms, late or early, and on time at 0", () => {
		expect(offsetPhrase(112)).toBe("about 110 ms late");
		expect(offsetPhrase(-96)).toBe("about 100 ms early");
		expect(offsetPhrase(4)).toBe("on time");
		expect(offsetPhrase(-4)).toBe("on time");
		expect(offsetPhrase(5)).toBe("about 10 ms late");
	});
});

describe("lengthName", () => {
	test("names the usual lengths and falls back to beats", () => {
		expect(lengthName(4)).toBe("whole notes");
		expect(lengthName(3)).toBe("dotted half notes");
		expect(lengthName(2)).toBe("half notes");
		expect(lengthName(1.5)).toBe("dotted quarter notes");
		expect(lengthName(1)).toBe("quarter notes");
		expect(lengthName(0.75)).toBe("dotted eighth notes");
		expect(lengthName(0.5)).toBe("eighth notes");
		expect(lengthName(0.25)).toBe("sixteenth notes");
		expect(lengthName(5)).toBe("notes of 5 beats");
		expect(lengthName(1.25)).toBe("notes of 1.25 beats");
	});
});

describe("habitLines (AC3)", () => {
	test("each present habit is one line, with per-length figures", () => {
		const lines = habitLines(
			habits({
				start: 112,
				length: 0.7,
				byLength: [
					{ beats: 2, share: 0.72 },
					{ beats: 1, share: 0.68 },
				],
				gap: 204,
			}),
		);
		expect(lines).toEqual([
			"Notes start about 110 ms late",
			"Notes sound for about 70% of their length (half notes 72%, quarter notes 68%)",
			"Gaps between notes are about 200 ms",
		]);
	});

	test("early starts, on time, and no per-length figures", () => {
		expect(habitLines(habits({ start: -48 }))).toEqual([
			"Notes start about 50 ms early",
		]);
		expect(habitLines(habits({ start: 3 }))).toEqual(["Notes start on time"]);
		expect(habitLines(habits({ length: 0.5 }))).toEqual([
			"Notes sound for about 50% of their length",
		]);
	});

	test("absent habits are left out", () => {
		expect(habitLines(habits())).toEqual([]);
	});

	test("drift in both directions", () => {
		expect(habitLines(habits({ drift: { first: 50, last: 400 } }))).toEqual([
			"Notes started about 50 ms late in the first bars and about 400 ms late by the end: you slowed down",
		]);
		expect(habitLines(habits({ drift: { first: 20, last: -140 } }))).toEqual([
			"Notes started about 20 ms late in the first bars and about 140 ms early by the end: you rushed",
		]);
		expect(
			habitLines(habits({ drift: { first: -2, last: 120 } }))[0],
		).toContain("Notes started on time in the first bars");
	});
});

describe("spotLines (AC4)", () => {
	test("each spot as a line, in the order given", () => {
		const spot = (firstBar: number, coverage: number, elsewhere: number) => ({
			firstBar,
			lastBar: firstBar + 1,
			startBeat: 0,
			endBeat: 8,
			coverage,
			elsewhere,
			p: 0.001,
		});
		expect(
			spotLines({
				tested: true,
				spots: [spot(3, 0.41, 0.72), spot(9, 0.5, 0.7)],
			}),
		).toEqual([
			"Bars 3–4: 41% covered, 72% elsewhere",
			"Bars 9–10: 50% covered, 70% elsewhere",
		]);
	});

	test("none after testing says so; too short says nothing", () => {
		expect(spotLines({ tested: true, spots: [] })).toEqual([NO_SPOT]);
		expect(NO_SPOT).toBe(
			"No two bars stand out: the losses are spread through the song.",
		);
		expect(spotLines({ tested: false, spots: [] })).toEqual([]);
	});
});
