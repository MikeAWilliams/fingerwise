import { describe, expect, test } from "vitest";
import { type FontEnv, fontUrl, loadFont } from "../../src/app/font";

function fakeEnv(load: () => Promise<unknown>) {
	const added: unknown[] = [];
	const created: { family: string; source: string }[] = [];
	class FakeFontFace {
		constructor(family: string, source: string) {
			created.push({ family, source });
		}
		load = load;
	}
	const env = {
		FontFace: FakeFontFace,
		fonts: { add: (face: unknown) => added.push(face) },
	} as unknown as FontEnv;
	return { env, added, created };
}

describe("loadFont", () => {
	test("adds the face and resolves loaded", async () => {
		const { env, added, created } = fakeEnv(() => Promise.resolve());
		await expect(loadFont("Fam", "/x/f.ttf", env)).resolves.toBe("loaded");
		expect(added).toHaveLength(1);
		expect(created).toEqual([{ family: "Fam", source: 'url("/x/f.ttf")' }]);
	});

	test("resolves failed when the font cannot load", async () => {
		const { env } = fakeEnv(() => Promise.reject(new Error("network")));
		await expect(loadFont("Fam", "/x/f.ttf", env)).resolves.toBe("failed");
	});
});

describe("fontUrl", () => {
	test("finds the bundled font by file name", () => {
		expect(fontUrl("Open-12-Hole-Ocarina-1.ttf")).toContain(
			"Open-12-Hole-Ocarina-1",
		);
	});

	test("throws for an unknown name", () => {
		expect(() => fontUrl("Nope.ttf")).toThrow("Nope.ttf");
	});
});
