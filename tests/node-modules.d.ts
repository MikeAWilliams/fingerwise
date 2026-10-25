// Only what tests/data/fonts.test.ts uses, so tests can read files without adding @types/node.
declare module "node:fs" {
	export function existsSync(path: URL): boolean;
	export function readdirSync(path: URL): string[];
	export function readFileSync(path: URL): Uint8Array;
	export function readFileSync(path: URL, encoding: "utf8"): string;
}

declare module "node:crypto" {
	export function createHash(algorithm: "sha256"): {
		update(data: Uint8Array): { digest(encoding: "hex"): string };
	};
}
