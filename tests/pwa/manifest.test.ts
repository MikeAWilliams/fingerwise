import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { manifest } from "../../pwa-manifest.ts";

const indexHtml = readFileSync(
	new URL("../../index.html", import.meta.url),
	"utf8",
);

describe("manifest (S03-AC1)", () => {
	it("names the app and scopes it to the base path", () => {
		expect(manifest.name).toBe("fingerwise");
		expect(manifest.short_name).toBeTruthy();
		expect(manifest.start_url).toBe("/fingerwise/");
		expect(manifest.scope).toBe("/fingerwise/");
	});

	it("is standalone, colored and has no fixed orientation", () => {
		expect(manifest.display).toBe("standalone");
		expect(manifest.theme_color).toMatch(/^#[0-9a-f]{6}$/i);
		expect(manifest.background_color).toMatch(/^#[0-9a-f]{6}$/i);
		expect(manifest).not.toHaveProperty("orientation");
	});
});

describe("manifest icons (S03-AC2)", () => {
	const icons = manifest.icons ?? [];

	it("lists 192, 512 and 512 maskable PNGs", () => {
		const find = (sizes: string, purpose?: string) =>
			icons.find((i) => i.sizes === sizes && i.purpose === purpose);
		expect(find("192x192")?.type).toBe("image/png");
		expect(find("512x512")?.type).toBe("image/png");
		expect(find("512x512", "maskable")?.type).toBe("image/png");
		expect(icons).toHaveLength(3);
	});

	it("has every listed file under public/", () => {
		for (const icon of icons) {
			expect(
				existsSync(new URL(`../../public/${icon.src}`, import.meta.url)),
			).toBe(true);
		}
	});
});

describe("index.html tags (S03-AC4)", () => {
	it("has the theme color and the iOS home-screen tags", () => {
		expect(indexHtml).toContain('<meta name="theme-color"');
		expect(indexHtml).toMatch(
			/<link rel="apple-touch-icon" sizes="180x180" href="[^"]*apple-touch-icon\.png"/,
		);
		expect(indexHtml).toContain(
			'<meta name="apple-mobile-web-app-capable" content="yes"',
		);
		expect(indexHtml).toContain('<meta name="apple-mobile-web-app-title"');
		expect(indexHtml).toContain(
			'<meta name="apple-mobile-web-app-status-bar-style"',
		);
	});

	it("has the apple-touch-icon file", () => {
		expect(
			existsSync(
				new URL("../../public/icons/apple-touch-icon.png", import.meta.url),
			),
		).toBe(true);
	});
});
