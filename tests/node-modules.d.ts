// Only what the tests use, so tests can read files without adding @types/node.
declare module "node:fs" {
	export function existsSync(path: URL): boolean;
	export function readdirSync(path: URL): string[];
	export function readFileSync(path: URL): Uint8Array;
	export function readFileSync(path: URL, encoding: "utf8"): string;
	export function readFileSync(path: string, encoding: "utf8"): string;
	export function mkdtempSync(prefix: string): string;
	export function rmSync(
		path: string,
		options: { recursive: true; force: true },
	): void;
}

declare module "node:crypto" {
	export function createHash(algorithm: "sha256"): {
		update(data: Uint8Array): { digest(encoding: "hex"): string };
	};
}

declare module "node:os" {
	export function tmpdir(): string;
}

declare module "node:path" {
	export function join(...parts: string[]): string;
}
