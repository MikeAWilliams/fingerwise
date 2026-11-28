import { describe, expect, test } from "vitest";
import alto from "../../data/instruments/ocarina-12-taiwanese.json";
import {
	createReadoutThrottle,
	END_OF_SONG,
	HEARING_NOTHING,
	hearingText,
	READOUT_INTERVAL_MS,
	RETRY_RIGHT,
	summaryText,
	tuningText,
} from "../../src/app/judge-text";
import type { CoverageResult } from "../../src/core/coverage";
import { loadInstrument, soundingPitch } from "../../src/core/instrument";
import type { Reading } from "../../src/core/judge";
import { type Pitch, parsePitch, toFrequency } from "../../src/core/pitch";

const instrument = loadInstrument(alto);

/** The frequency the alto sounds for written `name`, `cents` off. */
function heard(name: string, cents = 0): number {
	const written = parsePitch(name) as Pitch;
	return toFrequency(soundingPitch(instrument, written)) * 2 ** (cents / 1200);
}

const reading = (frequency: number | null, over: Partial<Reading> = {}) => ({
	time: 0,
	frequency,
	clarity: 0.98,
	level: -30,
	...over,
});

describe("hearingText (F09-S06 AC7)", () => {
	test("names the written note and its offset", () => {
		expect(hearingText(instrument, reading(heard("D4")))).toBe("Hearing D4 0¢");
	});

	test("a sharp and a flat offset keep their signs", () => {
		expect(hearingText(instrument, reading(heard("D4", 23)))).toBe(
			"Hearing D4 +23¢",
		);
		expect(hearingText(instrument, reading(heard("C4", -31)))).toBe(
			"Hearing C4 -31¢",
		);
	});

	test("a reading further off is named by its nearest written note", () => {
		expect(hearingText(instrument, reading(heard("D4", 62)))).toBe(
			"Hearing D♯4 -38¢",
		);
	});

	test("a reading that fails the checks is nothing", () => {
		expect(hearingText(instrument, reading(null))).toBe(HEARING_NOTHING);
		expect(hearingText(instrument, reading(heard("D4"), { level: -70 }))).toBe(
			HEARING_NOTHING,
		);
		expect(
			hearingText(instrument, reading(heard("D4"), { clarity: 0.3 })),
		).toBe(HEARING_NOTHING);
		// Far above the instrument's band.
		expect(hearingText(instrument, reading(9000))).toBe(HEARING_NOTHING);
		expect(HEARING_NOTHING).toBe("Hearing nothing");
	});
});

describe("createReadoutThrottle (F09-S06 AC7)", () => {
	test("allows the first change, then one every 100 ms", () => {
		expect(READOUT_INTERVAL_MS).toBe(100);
		const allowed = createReadoutThrottle();
		expect(allowed(1000)).toBe(true);
		expect(allowed(1099)).toBe(false);
		expect(allowed(1100)).toBe(true);
		expect(allowed(1199)).toBe(false);
		expect(allowed(1250)).toBe(true);
	});

	test("a refused change does not move the clock", () => {
		const allowed = createReadoutThrottle();
		allowed(0);
		expect(allowed(60)).toBe(false);
		expect(allowed(99)).toBe(false);
		expect(allowed(100)).toBe(true);
	});

	test("each throttle has its own clock", () => {
		const a = createReadoutThrottle();
		const b = createReadoutThrottle();
		expect(a(0)).toBe(true);
		expect(b(0)).toBe(true);
	});
});

/** A coverage result with everything present: 82% covered, 64% in tune, over ten notes. */
function result(over: Partial<CoverageResult> = {}): CoverageResult {
	return {
		coverage: 0.82,
		inTune: 0.64,
		graded: 10,
		tooShort: 2,
		tooShortRests: 0,
		timing: {
			startedLate: { faults: 1, withEdge: 8 },
			startedEarly: { faults: 0, withEdge: 8 },
			endedEarly: { faults: 1, withEdge: 20 },
			endedLate: { faults: 4, withEdge: 20 },
		},
		separation: { notSeparated: 1, plainJoins: 10 },
		tuning: [],
		items: [],
		timingFaults: [],
		notSeparatedJoins: [],
		...over,
	};
}

describe("summaryText (F09-S08 AC1, AC2, AC4)", () => {
	test("shows coverage, in tune, the four timing figures, separation and the too-short count", () => {
		expect(summaryText(result())).toBe(
			"82% covered · 64% in tune · started late 13%, early 0% · ended early 5%, late 20% · not separated 10% · 2 notes too short to grade",
		);
	});

	test("rounds each percentage", () => {
		expect(summaryText(result({ coverage: 0.824 }))).toMatch(/^82% covered/);
		expect(summaryText(result({ coverage: 0.825 }))).toMatch(/^83% covered/);
		expect(summaryText(result({ coverage: 1, inTune: 0 }))).toMatch(
			/^100% covered · 0% in tune/,
		);
	});

	test("leaves out the in-tune figure when no note was played right", () => {
		expect(summaryText(result({ inTune: null }))).not.toContain("in tune");
	});

	test("leaves out a timing pair with no note that has the edge, but not one that is 0%", () => {
		const timing = {
			startedLate: { faults: 0, withEdge: 0 },
			startedEarly: { faults: 0, withEdge: 0 },
			endedEarly: { faults: 0, withEdge: 5 },
			endedLate: { faults: 0, withEdge: 5 },
		};
		const text = summaryText(result({ timing }));
		expect(text).not.toContain("started");
		expect(text).toContain("ended early 0%, late 0%");
		const none = summaryText(
			result({
				timing: {
					startedLate: { faults: 0, withEdge: 0 },
					startedEarly: { faults: 0, withEdge: 0 },
					endedEarly: { faults: 0, withEdge: 0 },
					endedLate: { faults: 0, withEdge: 0 },
				},
			}),
		);
		expect(none).not.toContain("started");
		expect(none).not.toContain("ended");
	});

	test("leaves out separation when there are no plain joins, but shows 0%", () => {
		expect(
			summaryText(result({ separation: { notSeparated: 0, plainJoins: 0 } })),
		).not.toContain("separated");
		expect(
			summaryText(result({ separation: { notSeparated: 0, plainJoins: 4 } })),
		).toContain("not separated 0%");
	});

	test("says '1 note' for one too-short note, 'notes' for more, and nothing for none", () => {
		expect(summaryText(result({ tooShort: 1 }))).toMatch(
			/1 note too short to grade$/,
		);
		expect(summaryText(result({ tooShort: 3 }))).toMatch(
			/3 notes too short to grade$/,
		);
		expect(summaryText(result({ tooShort: 0 }))).not.toContain("too short");
	});

	test("a run with only coverage is just that", () => {
		expect(
			summaryText(
				result({
					inTune: null,
					tooShort: 0,
					separation: { notSeparated: 0, plainJoins: 0 },
					timing: {
						startedLate: { faults: 0, withEdge: 0 },
						startedEarly: { faults: 0, withEdge: 0 },
						endedEarly: { faults: 0, withEdge: 0 },
						endedLate: { faults: 0, withEdge: 0 },
					},
				}),
			),
		).toBe("82% covered");
	});

	test("is the end of the song with nothing graded or no scoring", () => {
		expect(summaryText(result({ coverage: null, inTune: null }))).toBe(
			END_OF_SONG,
		);
		expect(summaryText(null)).toBe(END_OF_SONG);
		expect(END_OF_SONG).toBe("End of song");
	});
});

describe("tuningText (F09-S08 AC3)", () => {
	const d4 = parsePitch("D4") as Pitch;
	const e5 = parsePitch("E5") as Pitch;
	const c4 = parsePitch("C4") as Pitch;
	const g4 = parsePitch("G4") as Pitch;

	test("lists the pitches in the order given, with signed cents and a true minus", () => {
		expect(
			tuningText([
				{ pitch: d4, cents: 70 },
				{ pitch: e5, cents: 40.4 },
				{ pitch: c4, cents: -35 },
			]),
		).toBe("Furthest off: D4 +70¢ · E5 +40¢ · C4 −35¢");
	});

	test("rounds the offset", () => {
		expect(tuningText([{ pitch: d4, cents: -34.6 }])).toBe(
			"Furthest off: D4 −35¢",
		);
		expect(tuningText([{ pitch: d4, cents: 25.5 }])).toBe(
			"Furthest off: D4 +26¢",
		);
	});

	test("names at most three", () => {
		const four = [d4, e5, c4, g4].map((pitch) => ({ pitch, cents: 30 }));
		expect(tuningText(four)?.split(" · ")).toHaveLength(3);
	});

	test("is null with none outside the tolerance", () => {
		expect(tuningText([])).toBeNull();
	});
});

test("RETRY_RIGHT is the verdict line for a missed card played right (F18-S03 AC2)", () => {
	expect(RETRY_RIGHT).toBe("Right, counted as a miss");
});
