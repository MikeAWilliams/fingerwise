import { describe, expect, test } from "vitest";
import { type Pitch, parsePitch } from "../../src/core/pitch";
import {
	ALPHA,
	applyGrade,
	drawWeight,
	emptyScores,
	FLOOR,
	needOf,
	resetScores,
	type Scores,
} from "../../src/core/progress";
import progressSource from "../../src/core/progress/index.ts?raw";

function pitch(name: string): Pitch {
	const p = parsePitch(name);
	if (p === null) throw new Error(`bad pitch ${name}`);
	return p;
}

const C4 = pitch("C4");
const D4 = pitch("D4");

describe("needOf (AC1)", () => {
	test("a pitch with no entry needs 1", () => {
		expect(needOf(emptyScores(), C4)).toBe(1);
		expect(needOf(new Map([[D4, 0.2]]), C4)).toBe(1);
	});

	test("a stored need is returned", () => {
		expect(needOf(new Map([[C4, 0.2]]), C4)).toBe(0.2);
	});
});

describe("applyGrade (AC2)", () => {
	test("four correct grades from 1 give 0.7, 0.49, 0.343, 0.2401", () => {
		let scores: Scores = emptyScores();
		const seen: number[] = [];
		for (let i = 0; i < 4; i++) {
			scores = applyGrade(scores, C4, "correct");
			seen.push(needOf(scores, C4));
		}
		for (const [i, want] of [0.7, 0.49, 0.343, 0.2401].entries()) {
			expect(seen[i]).toBeCloseTo(want, 10);
		}
	});

	test("a miss from 0.08 gives 0.356", () => {
		const scores = applyGrade(new Map([[C4, 0.08]]), C4, "miss");
		expect(needOf(scores, C4)).toBeCloseTo(0.356, 10);
	});

	test("boundaries: correct at 0 stays 0, miss at 1 stays 1", () => {
		expect(needOf(applyGrade(new Map([[C4, 0]]), C4, "correct"), C4)).toBe(0);
		expect(needOf(applyGrade(emptyScores(), C4, "miss"), C4)).toBe(1);
	});

	test("other pitches are untouched", () => {
		const scores = applyGrade(new Map([[D4, 0.4]]), C4, "correct");
		expect(needOf(scores, D4)).toBe(0.4);
	});
});

describe("drawWeight (AC3)", () => {
	test("constants", () => {
		expect(ALPHA).toBe(0.3);
		expect(FLOOR).toBe(0.05);
	});

	test("is the need above the floor and the floor below it", () => {
		expect(drawWeight(new Map([[C4, 0.5]]), C4)).toBe(0.5);
		expect(drawWeight(new Map([[C4, 0.01]]), C4)).toBe(FLOOR);
		expect(drawWeight(new Map([[C4, 0]]), C4)).toBe(FLOOR);
		expect(drawWeight(emptyScores(), C4)).toBe(1);
	});
});

describe("resetScores (AC4, AC5)", () => {
	test("every pitch reads 1", () => {
		const scores = resetScores();
		expect(needOf(scores, C4)).toBe(1);
		expect(needOf(scores, D4)).toBe(1);
	});

	test("applyGrade and resetScores leave their input unchanged", () => {
		const input: Scores = new Map([[C4, 0.4]]);
		const graded = applyGrade(input, C4, "correct");
		resetScores();
		expect(graded).not.toBe(input);
		expect([...input]).toEqual([[C4, 0.4]]);
	});
});

describe("AC9: imports and purity", () => {
	test("imports only ../pitch", () => {
		const specifiers = [...progressSource.matchAll(/from\s+["']([^"']+)["']/g)]
			.map((m) => m[1])
			.sort();
		expect(specifiers).toEqual(["../pitch"]);
	});

	test("knows nothing of the judge and uses no randomness or clock", () => {
		for (const word of ["judge", "Math.random", "Date", "performance"]) {
			expect(progressSource).not.toContain(word);
		}
	});
});
