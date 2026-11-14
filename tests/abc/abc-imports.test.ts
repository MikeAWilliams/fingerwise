import { expect, test } from "vitest";

const sources = import.meta.glob("/src/**/*.{ts,tsx}", {
	query: "?raw",
	import: "default",
	eager: true,
}) as Record<string, string>;

/** Type-only imports are erased at build time, so they do not load abcjs. */
function runtimeText(text: string): string {
	return text.replace(/import\s+type\b[^;]*;/g, "");
}

test("the glob finds source files", () => {
	expect(Object.keys(sources).length).toBeGreaterThan(0);
});

test("abcjs is imported once, dynamically, from the deep path in the adapter", () => {
	const mentions = Object.entries(sources).flatMap(([file, text]) =>
		[
			...runtimeText(text).matchAll(
				/(?:from\s+|import\(\s*)["']abcjs[^"']*["']/g,
			),
		].map((m) => ({ file, statement: m[0] })),
	);
	expect(mentions).toEqual([
		{
			file: "/src/abc/index.ts",
			statement: 'import("abcjs/src/api/abc_tunebook.js"',
		},
	]);
});

test("no static import of abcjs", () => {
	for (const [file, text] of Object.entries(sources)) {
		expect(
			/^\s*import[^;]*from\s+["']abcjs/m.test(runtimeText(text)),
			file,
		).toBe(false);
	}
});
