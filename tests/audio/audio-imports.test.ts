import { expect, test } from "vitest";

const audioSources = import.meta.glob("/src/audio/**/*.ts", {
	query: "?raw",
	import: "default",
	eager: true,
}) as Record<string, string>;

const coreSources = import.meta.glob("/src/core/**/*.ts", {
	query: "?raw",
	import: "default",
	eager: true,
}) as Record<string, string>;

function specifiers(text: string): string[] {
	return [
		...text.matchAll(/from\s+["']([^"']+)["']/g),
		...text.matchAll(/import\(\s*["']([^"']+)["']\s*\)/g),
	].map((m) => m[1] as string);
}

test("the globs find files", () => {
	expect(Object.keys(audioSources).length).toBeGreaterThan(0);
	expect(Object.keys(coreSources).length).toBeGreaterThan(0);
});

test("audio imports only relative paths, and from core only pitch", () => {
	for (const [file, text] of Object.entries(audioSources)) {
		for (const spec of specifiers(text)) {
			expect(spec.startsWith("."), `${file} imports ${spec}`).toBe(true);
			if (spec.includes("core")) {
				expect(spec, `${file} imports ${spec}`).toMatch(/^\.\.\/core\/pitch$/);
			}
		}
	}
});

test("core does not import audio", () => {
	for (const [file, text] of Object.entries(coreSources)) {
		for (const spec of specifiers(text)) {
			expect(spec, `${file} imports ${spec}`).not.toContain("audio");
		}
	}
});
