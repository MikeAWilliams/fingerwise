import { describe, expect, test } from "vitest";
import { formatSeconds, sectionOpen } from "../../src/app/section";

describe("sectionOpen", () => {
	test.each([
		[false, false, false],
		[true, false, true],
		[false, true, true],
		[true, true, true],
	])("requested %s, message %s gives %s", (requested, message, expected) => {
		expect(sectionOpen(requested, message)).toBe(expected);
	});
});

describe("formatSeconds", () => {
	test("whole seconds", () => {
		expect(formatSeconds(3)).toBe("3 s");
	});

	test("half seconds", () => {
		expect(formatSeconds(0.5)).toBe("0.5 s");
		expect(formatSeconds(2.5)).toBe("2.5 s");
	});
});
