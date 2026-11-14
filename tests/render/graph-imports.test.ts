import { expect, test } from "vitest";

const sources = import.meta.glob("/src/render/graph/**/*.ts", {
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

test("the glob finds the graph", () => {
	expect(Object.keys(sources).length).toBeGreaterThan(0);
});

test("the graph imports only core pitch", () => {
	for (const [file, text] of Object.entries(sources)) {
		expect(specifiers(text), file).toEqual(["../../core/pitch"]);
	}
});

test("the graph knows nothing of app, audio, staff or the judge", () => {
	for (const [file, text] of Object.entries(sources)) {
		for (const spec of specifiers(text)) {
			expect(
				/app|audio|staff|judge|preact/.test(spec),
				`${file} imports ${spec}`,
			).toBe(false);
		}
	}
});
