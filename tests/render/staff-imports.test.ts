import { expect, test } from "vitest";

const renderSources = import.meta.glob("/src/render/staff/**/*.ts", {
	query: "?raw",
	import: "default",
	eager: true,
}) as Record<string, string>;

const tabSources = import.meta.glob("/src/render/tab/**/*.ts", {
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
	expect(Object.keys(renderSources).length).toBeGreaterThan(0);
	expect(Object.keys(tabSources).length).toBeGreaterThan(0);
	expect(Object.keys(coreSources).length).toBeGreaterThan(0);
});

test("the staff module does not import the app", () => {
	for (const [file, text] of Object.entries(renderSources)) {
		for (const spec of specifiers(text)) {
			expect(/app\/|\/app/.test(spec), `${file} imports ${spec}`).toBe(false);
		}
	}
});

test("the tab module does not import the app", () => {
	for (const [file, text] of Object.entries(tabSources)) {
		for (const spec of specifiers(text)) {
			expect(/app\/|\/app/.test(spec), `${file} imports ${spec}`).toBe(false);
		}
	}
});

test("core does not import render", () => {
	for (const [file, text] of Object.entries(coreSources)) {
		for (const spec of specifiers(text)) {
			expect(spec.includes("render"), `${file} imports ${spec}`).toBe(false);
		}
	}
});
