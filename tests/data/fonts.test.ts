import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import alto from "../../data/instruments/ocarina-12-taiwanese.json";

const FONTS = new URL("../../data/fonts/", import.meta.url);
const INSTRUMENTS = new URL("../../data/instruments/", import.meta.url);

describe("bundled fonts", () => {
	test("every instrument's tablature font exists in data/fonts", () => {
		const files = readdirSync(INSTRUMENTS).filter((f) => f.endsWith(".json"));
		expect(files.length).toBeGreaterThan(0);
		for (const file of files) {
			const def = JSON.parse(readFileSync(new URL(file, INSTRUMENTS), "utf8"));
			expect(existsSync(new URL(def.tablature.font, FONTS)), file).toBe(true);
		}
	});

	test("the alto C font is the unmodified upstream file", () => {
		const bytes = readFileSync(new URL(alto.tablature.font, FONTS));
		expect(createHash("sha256").update(bytes).digest("hex")).toBe(
			"7049715f632becb65c906d9265d082443e51b2b787fa090da292be3d8d91ef29",
		);
	});

	test("OFL.txt holds the copyright line and the OFL 1.1 text", () => {
		const text = readFileSync(new URL("OFL.txt", FONTS), "utf8");
		expect(text).toContain(
			"Copyright (c) 2016, Mathias Panzenböck <grosser.meister.morti@gmx.net>.",
		);
		expect(text).toContain("SIL OPEN FONT LICENSE Version 1.1");
	});
});
