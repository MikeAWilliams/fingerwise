import { Accidental, StaveNote } from "vexflow/bravura";
import type { ClefName } from "../../core/instrument";
import { formatPitch, type Pitch } from "../../core/pitch";

export interface StaffOptions {
	clef: ClefName;
	accidentals: "sharps";
	keySignature: "C";
	lowest: Pitch;
	highest: Pitch;
}

export interface NoteLayout {
	key: string;
	accidental: "#" | null;
	clef: "treble" | "bass";
	annotation: "8vb" | undefined;
}

export class StaffRangeError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "StaffRangeError";
	}
}

const NAME_PATTERN = /^([A-G])(♯?)([0-9])$/;

/** Where `pitch` sits on the staff described by `options`. Throws `StaffRangeError` outside its range. */
export function noteLayout(pitch: Pitch, options: StaffOptions): NoteLayout {
	const name = formatPitch(pitch);
	if (pitch < options.lowest || pitch > options.highest) {
		throw new StaffRangeError(
			`${name} is outside the staff range ${formatPitch(options.lowest)}..${formatPitch(options.highest)}`,
		);
	}
	const match = NAME_PATTERN.exec(name) as RegExpExecArray;
	const letter = (match[1] as string).toLowerCase();
	const sharp = match[2] ? "#" : "";
	const octave = Number(match[3]);

	if (options.clef === "treble-8vb") {
		return {
			key: `${letter}${sharp}/${octave + 1}`,
			accidental: sharp ? "#" : null,
			clef: "treble",
			annotation: "8vb",
		};
	}
	return {
		key: `${letter}${sharp}/${octave}`,
		accidental: sharp ? "#" : null,
		clef: options.clef,
		annotation: undefined,
	};
}

export function buildNote(layout: NoteLayout): StaveNote {
	const note = new StaveNote({
		keys: [layout.key],
		duration: "w",
		clef: layout.clef,
	});
	if (layout.accidental) note.addModifier(new Accidental(layout.accidental));
	return note;
}

/** Number of ledger lines the note needs (staff lines are 1 = bottom to 5 = top). */
export function ledgerLines(note: StaveNote): number {
	const line = (note.getKeyProps()[0] as { line: number }).line;
	if (line < 1) return Math.floor(1 - line);
	if (line > 5) return Math.floor(line - 5);
	return 0;
}
