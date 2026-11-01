import preact from "@preact/preset-vite";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vitest/config";
import { manifest } from "./pwa-manifest.ts";

// `base` is the GitHub Pages path (https://<user>.github.io/fingerwise/).
export default defineConfig({
	base: "/fingerwise/",
	plugins: [
		preact(),
		VitePWA({
			manifest,
			manifestFilename: "manifest.webmanifest",
			injectRegister: false,
			includeAssets: ["favicon.svg", "icons/apple-touch-icon.png"],
		}),
	],
	build: {
		// Emit the font and its license as files, never as data URIs.
		assetsInlineLimit: (file) =>
			file.includes("/data/fonts/") ? false : undefined,
	},
	test: {
		include: ["tests/**/*.test.ts", "src/**/*.test.ts"],
	},
});
