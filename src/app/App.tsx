import { useEffect, useState } from "preact/hooks";
import licenseUrl from "../../data/fonts/OFL.txt?url";
import ocarinaJson from "../../data/instruments/ocarina-12-taiwanese.json";
import { loadInstrument } from "../core/instrument";
import { type Pitch, parsePitch } from "../core/pitch";
import type { StaffOptions } from "../render/staff";
import { type FontStatus, fontFamilyFor } from "../render/tab";
import { Card } from "./Card";
import { fontUrl, loadFont } from "./font";

const instrument = loadInstrument(ocarinaJson);
// Fixed for now; F01-S04 replaces it with a random pick.
const PITCH = parsePitch("C5") as Pitch;
const STAFF_OPTIONS: StaffOptions = {
	clef: instrument.defaultClef,
	accidentals: "sharps",
	keySignature: "C",
	lowest: instrument.lowest,
	highest: instrument.highest,
};

const FONT_FAMILY = fontFamilyFor(instrument.tablatureFont);

export function App() {
	const [fontStatus, setFontStatus] = useState<FontStatus>("loading");
	useEffect(() => {
		loadFont(FONT_FAMILY, fontUrl(instrument.tablatureFont), {
			FontFace,
			fonts: document.fonts,
		}).then(setFontStatus);
	}, []);
	return (
		<main>
			<h1>fingerwise</h1>
			<Card
				pitch={PITCH}
				instrument={instrument}
				staffOptions={STAFF_OPTIONS}
				font={{ family: FONT_FAMILY, status: fontStatus }}
			/>
			<footer>
				Fingering font: Open 12 Hole Ocarina 1 © 2016 Mathias Panzenböck,
				licensed under the <a href={licenseUrl}>SIL Open Font License 1.1</a>.
			</footer>
		</main>
	);
}
