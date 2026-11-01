import type { ManifestOptions } from "vite-plugin-pwa";

// The base path must match `base` in vite.config.ts.
export const manifest: Partial<ManifestOptions> = {
	name: "fingerwise",
	short_name: "fingerwise",
	start_url: "/fingerwise/",
	scope: "/fingerwise/",
	display: "standalone",
	theme_color: "#2b2b2b",
	background_color: "#2b2b2b",
	icons: [
		{ src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
		{ src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
		{
			src: "icons/icon-maskable-512.png",
			sizes: "512x512",
			type: "image/png",
			purpose: "maskable",
		},
	],
};
