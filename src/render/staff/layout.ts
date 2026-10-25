import { Accidental, Stave, StaveNote } from "vexflow/bravura";
import type { ClefName } from "../../core/instrument";
import { formatPitch, type Pitch } from "../../core/pitch";

/** VexFlow key spec names. Sharp keys only, since pitches are spelled with sharps. */
export type KeySignature = "C" | "G" | "D" | "A" | "E" | "B" | "F#";

/** The letters each key sharps. */
const SHARPED_LETTERS: Record<KeySignature, readonly string[]> = {
	C: [],
	G: ["f"],
	D: ["f", "c"],
	A: ["f", "c", "g"],
	E: ["f", "c", "g", "d"],
	B: ["f", "c", "g", "d", "a"],
	"F#": ["f", "c", "g", "d", "a", "e"],
};

export interface StaffOptions {
	clef: ClefName;
	accidentals: "sharps";
	keySignature: KeySignature;
	lowest: Pitch;
	highest: Pitch;
}

export interface NoteLayout {
	key: string;
	accidental: "#" | "n" | null;
	clef: "treble" | "bass";
	annotation: "8vb" | undefined;
	keySignature: KeySignature;
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
	const { keySignature } = options;
	// Only what differs from the key signature is drawn on the note.
	const keySharps = SHARPED_LETTERS[keySignature].includes(letter);
	const accidental = sharp ? (keySharps ? null : "#") : keySharps ? "n" : null;

	if (options.clef === "treble-8vb") {
		return {
			key: `${letter}${sharp}/${octave + 1}`,
			accidental,
			clef: "treble",
			annotation: "8vb",
			keySignature,
		};
	}
	return {
		key: `${letter}${sharp}/${octave}`,
		accidental,
		clef: options.clef,
		annotation: undefined,
		keySignature,
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

/** A stave with the layout's clef and, unless the key is C, its key signature. */
export function buildStave(
	layout: NoteLayout,
	x: number,
	y: number,
	width: number,
): Stave {
	const stave = new Stave(x, y, width);
	stave.addClef(layout.clef, "default", layout.annotation);
	if (layout.keySignature !== "C") stave.addKeySignature(layout.keySignature);
	return stave;
}

/** Number of ledger lines the note needs (staff lines are 1 = bottom to 5 = top). */
export function ledgerLines(note: StaveNote): number {
	const line = (note.getKeyProps()[0] as { line: number }).line;
	if (line < 1) return Math.floor(1 - line);
	if (line > 5) return Math.floor(line - 5);
	return 0;
}
