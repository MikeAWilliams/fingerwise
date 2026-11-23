import { describe, expect, test } from "vitest";
import {
	breakdownRows,
	habitLines,
	lengthName,
	NO_SPOT,
	offsetPhrase,
	overrunText,
	restText,
	roundToTotal,
	spotAnchorId,
	spotLabel,
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

const table = (b: Breakdown) =>
	breakdownRows(b).map((r) => `${r.group ? "" : "  "}${r.label} ${r.percent}%`);

describe("breakdownRows (F11-S05 AC2, AC3)", () => {
	test("groups and the rows under them, in a fixed order", () => {
		expect(table(breakdown())).toEqual([
			"On the right note 57%",
			"  in tune 45%",
			"  out of tune 12%",
			"Silent 31%",
			"  before the note started 11%",
			"  in the middle of the note 4%",
			"  after the note stopped 16%",
			"Wrong note 12%",
			"Not played 0%",
		]);
	});

	test("every row shows, 0% included, whatever the sizes", () => {
		const rows = table(
			breakdown({
				inTune: 1,
				outOfTune: 0,
				silentBefore: 0,
				silentAfter: 0,
				silentMiddle: 0,
				wrong: 0,
			}),
		);
		expect(rows).toEqual([
			"On the right note 100%",
			"  in tune 100%",
			"  out of tune 0%",
			"Silent 0%",
			"  before the note started 0%",
			"  in the middle of the note 0%",
			"  after the note stopped 0%",
			"Wrong note 0%",
			"Not played 0%",
		]);
	});

	test("rounding adds up where plain rounding would not", () => {
		// Plain rounding: groups 33 + 33 + 33 + 0 = 99, and right-note rows 20 + 13 = 33.
		const b: Breakdown = {
			inTune: 0.2,
			outOfTune: 0.134,
			silentBefore: 0.111,
			silentMiddle: 0.111,
			silentAfter: 0.112,
			wrong: 0.332,
			notPlayed: 0,
		};
		// Groups 34 + 33 + 33 + 0 = 100; right note 20 + 14 = 34; silent 11 × 3 = 33.
		expect(table(b)).toEqual([
			"On the right note 34%",
			"  in tune 20%",
			"  out of tune 14%",
			"Silent 33%",
			"  before the note started 11%",
			"  in the middle of the note 11%",
			"  after the note stopped 11%",
			"Wrong note 33%",
			"Not played 0%",
		]);
	});

	test("shares that do not quite add to 1 are scaled first", () => {
		const rows = breakdownRows(breakdown({ notPlayed: 0.0000001 }));
		expect(rows.filter((r) => r.group).reduce((s, r) => s + r.percent, 0)).toBe(
			100,
		);
	});

	test("an all-zero breakdown gives 0% rows", () => {
		const zero = breakdownRows({
			inTune: 0,
			outOfTune: 0,
			silentBefore: 0,
			silentAfter: 0,
			silentMiddle: 0,
			wrong: 0,
			notPlayed: 0,
		});
		expect(zero.every((r) => r.percent === 0)).toBe(true);
		expect(zero).toHaveLength(9);
	});
});

describe("roundToTotal", () => {
	test("largest remainders take the leftover units", () => {
		expect(roundToTotal([33.4, 33.3, 33.3], 100)).toEqual([34, 33, 33]);
		expect(roundToTotal([7.4, 7.3, 7.3], 22)).toEqual([8, 7, 7]);
		expect(roundToTotal([0, 0], 0)).toEqual([0, 0]);
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

describe("spot label and anchor (F11-S04 AC3)", () => {
	test("the label names the bars with an en dash and each spot has its own anchor id", () => {
		expect(spotLabel(3, 4)).toBe("Practice: bars 3–4");
		expect(spotAnchorId(0)).toBe("practice-spot-0");
		expect(spotAnchorId(1)).not.toBe(spotAnchorId(0));
	});
});

describe("overrunText (F12-S04 AC5)", () => {
	test("a short overrun, a long one and the rounding", () => {
		expect(overrunText(300)).toBe("You played 0.3 s past the end");
		expect(overrunText(12400)).toBe("You played 12.4 s past the end");
		expect(overrunText(1249)).toBe("You played 1.2 s past the end");
		expect(overrunText(1251)).toBe("You played 1.3 s past the end");
	});
});
