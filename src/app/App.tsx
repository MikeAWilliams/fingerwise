import { useEffect, useState } from "preact/hooks";
import licenseUrl from "../../data/fonts/OFL.txt?url";
import ocarinaJson from "../../data/instruments/ocarina-12-taiwanese.json";
import { buildPool, fullRange } from "../core/drill";
import { loadInstrument } from "../core/instrument";
import type { Pitch } from "../core/pitch";
import type { StaffOptions } from "../render/staff";
import { type FontStatus, fontFamilyFor } from "../render/tab";
import { Card } from "./Card";
import { type CardState, createCardFlow } from "./card-flow";
import { fontUrl, loadFont } from "./font";
import { REVEAL_DELAY_MS } from "./reveal";

const instrument = loadInstrument(ocarinaJson);
// Full written range with sharps; fixed until F01-S05 adds settings.
const POOL: Pitch[] = buildPool(instrument, {
	...fullRange(instrument),
	includeSharps: true,
});
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
	const [card, setCard] = useState<CardState | null>(null);
	useEffect(() => {
		const flow = createCardFlow({
			pool: POOL,
			random: Math.random,
			delayMs: REVEAL_DELAY_MS,
			onChange: setCard,
		});
		const onClick = (event: MouseEvent) => {
			if (event.target instanceof Element && event.target.closest("a")) return;
			flow.step();
		};
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.repeat || event.ctrlKey || event.metaKey || event.altKey)
				return;
			flow.step();
		};
		document.addEventListener("click", onClick);
		window.addEventListener("keydown", onKeyDown);
		flow.start();
		return () => {
			document.removeEventListener("click", onClick);
			window.removeEventListener("keydown", onKeyDown);
			flow.stop();
		};
	}, []);
	return (
		<main>
			<h1>fingerwise</h1>
			{card && (
				<Card
					pitch={card.pitch}
					revealed={card.revealed}
					instrument={instrument}
					staffOptions={STAFF_OPTIONS}
					font={{ family: FONT_FAMILY, status: fontStatus }}
				/>
			)}
			<footer>
				Fingering font: Open 12 Hole Ocarina 1 © 2016 Mathias Panzenböck,
				licensed under the <a href={licenseUrl}>SIL Open Font License 1.1</a>.
			</footer>
		</main>
	);
}
