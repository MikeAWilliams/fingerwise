import { describe, expect, test } from "vitest";
import { lanesShown } from "../../src/app/after-song";
import type { TimedPhase } from "../../src/app/timed-flow";
import type { CoverageResult } from "../../src/core/coverage";

const PHASES: TimedPhase[] = ["ready", "count-in", "playing", "summary"];
const result = (graded: number) => ({ graded }) as CoverageResult;

describe("lanesShown (F12-S02 AC2, AC5, AC9)", () => {
	test("with live feedback the lanes are always shown", () => {
		for (const phase of PHASES) {
			for (const summary of [null, result(0), result(3)]) {
				expect(lanesShown(false, phase, summary)).toBe(true);
			}
		}
	});

	test("after the song they show only in the summary with something graded", () => {
		for (const phase of PHASES) {
			expect(lanesShown(true, phase, result(3))).toBe(phase === "summary");
			expect(lanesShown(true, phase, null)).toBe(false);
			expect(lanesShown(true, phase, result(0))).toBe(false);
		}
	});
});
