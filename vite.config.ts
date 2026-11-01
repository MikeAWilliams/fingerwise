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
			// A new worker waits and takes over on a later launch: no prompt, no reload (ADR 0004).
			workbox: {
				globPatterns: ["**/*.{js,css,html,ttf,txt,png,svg,webmanifest}"],
				cleanupOutdatedCaches: true,
				skipWaiting: false,
				clientsClaim: false,
				navigateFallback: "/fingerwise/index.html",
			},
			devOptions: { enabled: false },
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
