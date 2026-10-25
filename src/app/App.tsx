import licenseUrl from "../../data/fonts/OFL.txt?url";
import ocarinaJson from "../../data/instruments/ocarina-12-taiwanese.json";
import { loadInstrument } from "../core/instrument";
import { type Pitch, parsePitch } from "../core/pitch";
import type { StaffOptions } from "../render/staff";
import { Staff } from "./Staff";

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

export function App() {
	return (
		<main>
			<h1>fingerwise</h1>
			<Staff pitch={PITCH} options={STAFF_OPTIONS} />
			<footer>
				Fingering font: Open 12 Hole Ocarina 1 © 2016 Mathias Panzenböck,
				licensed under the <a href={licenseUrl}>SIL Open Font License 1.1</a>.
			</footer>
		</main>
	);
}
