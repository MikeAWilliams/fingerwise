export type FontStatus = "loading" | "loaded" | "failed";

export interface TabFont {
	family: string;
	status: FontStatus;
}

export type TabView =
	| { kind: "glyph"; text: string; fontFamily: string }
	| { kind: "placeholder"; message: string };

/** The CSS family name the font file is registered under: its file name without the extension. */
export function fontFamilyFor(fileName: string): string {
	const dot = fileName.lastIndexOf(".");
	return dot > 0 ? fileName.slice(0, dot) : fileName;
}

/** What to show for a fingering: the glyph as given once the font is loaded, otherwise a placeholder. */
export function tabView(glyph: string, font: TabFont): TabView {
	switch (font.status) {
		case "loaded":
			return { kind: "glyph", text: glyph, fontFamily: font.family };
		case "loading":
			return { kind: "placeholder", message: "Loading fingering…" };
		case "failed":
			return { kind: "placeholder", message: "Fingering font could not load" };
	}
}
