import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build } from "vite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

describe("service worker precache (S04-AC1)", () => {
	let outDir = "";
	let sw = "";

	beforeAll(async () => {
		outDir = mkdtempSync(join(tmpdir(), "fingerwise-build-"));
		await build({ logLevel: "silent", build: { outDir, emptyOutDir: true } });
		sw = readFileSync(join(outDir, "sw.js"), "utf8");
	}, 60_000);

	afterAll(() => {
		if (outDir) rmSync(outDir, { recursive: true, force: true });
	});

	it("precaches the font, its license, the icons and the manifest", () => {
		expect(sw).toMatch(/assets\/[^"']*\.ttf/);
		expect(sw).toMatch(/assets\/OFL-[^"']*\.txt/);
		for (const icon of [
			"icon-192.png",
			"icon-512.png",
			"icon-maskable-512.png",
		]) {
			expect(sw).toContain(`icons/${icon}`);
		}
		expect(sw).toContain("manifest.webmanifest");
	});

	it("precaches the page and the app bundle", () => {
		expect(sw).toContain("index.html");
		expect(sw).toMatch(/assets\/index-[^"']*\.js/);
	});

	it("does not skip waiting or claim clients on its own", () => {
		// Workbox's message handler is the only skipWaiting, and nothing sends it.
		expect(sw.match(/skipWaiting\(\)/g)).toHaveLength(1);
		expect(sw).toContain("SKIP_WAITING");
		expect(sw).not.toContain("clientsClaim");
	});
});
