import preact from "@preact/preset-vite";
import { defineConfig } from "vitest/config";

// `base` is the GitHub Pages path (https://<user>.github.io/fingerwise/).
export default defineConfig({
	base: "/fingerwise/",
	plugins: [preact()],
	build: {
		// Emit the font and its license as files, never as data URIs.
		assetsInlineLimit: (file) =>
			file.includes("/data/fonts/") ? false : undefined,
	},
	test: {
		include: ["tests/**/*.test.ts", "src/**/*.test.ts"],
	},
});
