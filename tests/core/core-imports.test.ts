import { expect, test } from "vitest";

const sources = import.meta.glob("/src/core/**/*.ts", {
	query: "?raw",
	import: "default",
	eager: true,
}) as Record<string, string>;

const BROWSER_GLOBALS = [
	"window",
	"document",
	"localStorage",
	"sessionStorage",
	"navigator",
	"fetch",
];

test("the glob finds core files", () => {
	expect(Object.keys(sources).length).toBeGreaterThan(0);
});

test("core imports only relative modules", () => {
	for (const [file, text] of Object.entries(sources)) {
		const specifiers = [
			...text.matchAll(/from\s+["']([^"']+)["']/g),
			...text.matchAll(/import\(\s*["']([^"']+)["']\s*\)/g),
		].map((m) => m[1] as string);
		for (const spec of specifiers) {
			expect(spec.startsWith("."), `${file} imports ${spec}`).toBe(true);
		}
	}
});

test("core does not reference browser globals", () => {
	for (const [file, text] of Object.entries(sources)) {
		for (const name of BROWSER_GLOBALS) {
			expect(
				new RegExp(`\\b${name}\\b`).test(text),
				`${file} uses ${name}`,
			).toBe(false);
		}
	}
});
