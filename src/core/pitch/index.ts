// Pitch is a MIDI note number (C4 = 60, A4 = 69). Names use sharps only.
export type Pitch = number & { readonly __brand: "Pitch" };

const NAMES = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
const NAME_PATTERN = /^([A-G])(♯?)([0-9])$/;
const SEMITONE_OF_LETTER: Record<string, number> = {
	C: 0,
	D: 2,
	E: 4,
	F: 5,
	G: 7,
	A: 9,
	B: 11,
};
const MAX_MIDI = 127;

function isMidi(n: number): boolean {
	return Number.isInteger(n) && n >= 0 && n <= MAX_MIDI;
}

/** Parse a name such as `A3` or `C♯5`. Returns null if it is not a canonical sharps-only name. */
export function parsePitch(name: string): Pitch | null {
	const match = NAME_PATTERN.exec(name);
	if (!match) return null;
	const [, letter, sharp, octave] = match;
	const natural = SEMITONE_OF_LETTER[letter as string] as number;
	const semitone = natural + (sharp ? 1 : 0);
	// B♯ and E♯ are not canonical sharps-only names.
	if (semitone >= 12 || NAMES[semitone] !== `${letter}${sharp}`) return null;
	const midi = (Number(octave) + 1) * 12 + semitone;
	return isMidi(midi) ? (midi as Pitch) : null;
}

/** Inverse of `parsePitch`, e.g. `C♯5`. */
export function formatPitch(p: Pitch): string {
	return `${NAMES[p % 12]}${Math.floor(p / 12) - 1}`;
}

export function transpose(p: Pitch, semitones: number): Pitch {
	return (p + semitones) as Pitch;
}

/** Every semitone from `lowest` to `highest`, inclusive, ascending. */
export function pitchesInRange(lowest: Pitch, highest: Pitch): Pitch[] {
	const result: Pitch[] = [];
	for (let p = lowest; p <= highest; p++) result.push(p as Pitch);
	return result;
}
