import { describe, expect, test } from "vitest";
import { fontFamilyFor, tabView } from "../../src/render/tab";

describe("tabView", () => {
	test("shows the glyph in the font family once loaded", () => {
		expect(
			tabView("P", { family: "Open-12-Hole-Ocarina-1", status: "loaded" }),
		).toEqual({
			kind: "glyph",
			text: "P",
			fontFamily: "Open-12-Hole-Ocarina-1",
		});
	});

	test("passes a multi-character glyph string through untouched", () => {
		const view = tabView(" aB♯ ", { family: "f", status: "loaded" });
		expect(view).toEqual({ kind: "glyph", text: " aB♯ ", fontFamily: "f" });
	});

	test("shows a loading placeholder while the font loads", () => {
		expect(tabView("P", { family: "f", status: "loading" })).toEqual({
			kind: "placeholder",
			message: "Loading fingering…",
		});
	});

	test("shows a failure placeholder when the font could not load", () => {
		expect(tabView("P", { family: "f", status: "failed" })).toEqual({
			kind: "placeholder",
			message: "Fingering font could not load",
		});
	});
});

describe("fontFamilyFor", () => {
	test("strips the .ttf extension", () => {
		expect(fontFamilyFor("Open-12-Hole-Ocarina-1.ttf")).toBe(
			"Open-12-Hole-Ocarina-1",
		);
	});

	test("leaves a name without an extension alone", () => {
		expect(fontFamilyFor("Plain")).toBe("Plain");
	});
});
