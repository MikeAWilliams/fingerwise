import { describe, expect, test } from "vitest";

// AC6: the drill engine must not reach clef, staff, render or app code,
// directly or through another module.
const sources = import.meta.glob("/src/**/*.{ts,tsx}", {
	query: "?raw",
	import: "default",
	eager: true,
}) as Record<string, string>;

const DRILL = "/src/core/drill/";
const EXTENSIONS = ["", ".ts", ".tsx", "/index.ts", "/index.tsx"];

function specifiers(text: string): string[] {
	return [
		...text.matchAll(/from\s+["']([^"']+)["']/g),
		...text.matchAll(/import\s+["']([^"']+)["']/g),
		...text.matchAll(/import\(\s*["']([^"']+)["']\s*\)/g),
	].map((m) => m[1] as string);
}

/** `spec` relative to the folder of `file`, with `.` and `..` collapsed. */
function join(file: string, spec: string): string {
	const parts = file.split("/").slice(0, -1);
	for (const part of spec.split("/")) {
		if (part === "..") parts.pop();
		else if (part !== ".") parts.push(part);
	}
	return parts.join("/");
}

/** The source file `spec` names, or the bare joined path if there is none. */
function resolve(
	file: string,
	spec: string,
	known: Record<string, string>,
): string {
	const base = join(file, spec);
	return EXTENSIONS.map((ext) => base + ext).find((p) => p in known) ?? base;
}

function forbidden(target: string): boolean {
	return (
		target.startsWith("/src/render/") ||
		target.startsWith("/src/app/") ||
		/clef|staff/i.test(target) ||
		/^(vexflow|preact)(\/|$)/.test(target)
	);
}

/** Every forbidden path or bare specifier reached from `entry` by following relative imports. */
function forbiddenImports(
	entry: string,
	known: Record<string, string>,
): string[] {
	const found = new Set<string>();
	const seen = new Set<string>([entry]);
	const queue = [entry];
	for (let file = queue.shift(); file !== undefined; file = queue.shift()) {
		for (const spec of specifiers(known[file] ?? "")) {
			const target = spec.startsWith(".") ? resolve(file, spec, known) : spec;
			if (forbidden(target)) found.add(target);
			if (target in known && !seen.has(target)) {
				seen.add(target);
				queue.push(target);
			}
		}
	}
	return [...found].sort();
}

function drillFiles(known: Record<string, string>): string[] {
	return Object.keys(known).filter((path) => path.startsWith(DRILL));
}

describe("real drill sources (AC6)", () => {
	test("the glob finds drill files", () => {
		expect(drillFiles(sources).length).toBeGreaterThan(0);
	});

	test("no drill file reaches clef, staff, render or app", () => {
		for (const file of drillFiles(sources)) {
			expect(forbiddenImports(file, sources), file).toEqual([]);
		}
	});
});

describe("the check can fail (AC6)", () => {
	const entry = "/src/core/drill/index.ts";

	test.each([
		['import { drawStaff } from "../../render/staff";', "/src/render/staff"],
		['import { App } from "../../app/App";', "/src/app/App"],
		['import type { Clef } from "../clef";', "/src/core/clef"],
		['import { Stave } from "vexflow/bravura";', "vexflow/bravura"],
		['import { h } from "preact";', "preact"],
	])("%s is reported", (line, expected) => {
		expect(forbiddenImports(entry, { [entry]: line })).toEqual([expected]);
	});

	test("an import resolved to a real file is reported by its path", () => {
		const known = {
			[entry]: 'import { tabView } from "../../render/tab";',
			"/src/render/tab/index.ts": "export const tabView = 1;",
		};
		expect(forbiddenImports(entry, known)).toEqual([
			"/src/render/tab/index.ts",
		]);
	});

	test("render reached only through a second core file is reported", () => {
		const known = {
			[entry]: 'import { pitchName } from "../names";',
			"/src/core/names/index.ts":
				'import { buildNote } from "../../render/notes";',
			"/src/render/notes.ts": "export const buildNote = 1;",
		};
		expect(forbiddenImports(entry, known)).toEqual(["/src/render/notes.ts"]);
	});

	test("allowed core imports are not reported", () => {
		const known = {
			[entry]: 'import { parsePitch } from "../pitch";',
			"/src/core/pitch/index.ts": "export const parsePitch = 1;",
		};
		expect(forbiddenImports(entry, known)).toEqual([]);
	});
});
