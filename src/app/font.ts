const fontUrls = import.meta.glob("../../data/fonts/*.ttf", {
	query: "?url",
	import: "default",
	eager: true,
}) as Record<string, string>;

/** The built URL of the bundled font file named by the instrument definition. Throws if there is none. */
export function fontUrl(fileName: string): string {
	for (const [path, url] of Object.entries(fontUrls)) {
		if (path.slice(path.lastIndexOf("/") + 1) === fileName) return url;
	}
	throw new Error(`font file not found in data/fonts: ${fileName}`);
}

export interface FontEnv {
	FontFace: typeof FontFace;
	fonts: FontFaceSet;
}

/** Registers the font under `family` and waits for it. Resolves `"failed"` instead of rejecting. */
export async function loadFont(
	family: string,
	url: string,
	env: FontEnv,
): Promise<"loaded" | "failed"> {
	try {
		const face = new env.FontFace(family, `url(${JSON.stringify(url)})`);
		env.fonts.add(face);
		await face.load();
		return "loaded";
	} catch {
		return "failed";
	}
}
