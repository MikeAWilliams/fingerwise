import preact from "@preact/preset-vite";
import { defineConfig } from "vitest/config";

// `base` is the GitHub Pages path (https://<user>.github.io/fingerwise/).
export default defineConfig({
	base: "/fingerwise/",
	plugins: [preact()],
	test: {
		include: ["tests/**/*.test.ts", "src/**/*.test.ts"],
	},
});
