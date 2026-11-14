import { type Instrument, soundingPitch } from "../core/instrument";
import { centsFrom, nearestPitch } from "../core/judge";
import { formatPitch, type Pitch } from "../core/pitch";
import { formatCents } from "../render/graph";

export interface JudgedNote {
	/** Written pitch nearest to what was heard. */
	pitch: Pitch;
	/** Offset from that pitch, in [-50, 50]. */
	cents: number;
	/** Such as `C♯5 +23¢`. */
	label: string;
}

/** The heard frequency as the nearest written note and its offset, to agree with the staff. */
export function judgedNote(instrument: Instrument, hz: number): JudgedNote {
	const heard = nearestPitch(hz);
	const pitch = (heard.pitch - instrument.transposition) as Pitch;
	return {
		pitch,
		cents: heard.cents,
		label: `${formatPitch(pitch)} ${formatCents(heard.cents)}`,
	};
}

/** Cents from the card's sounding pitch to the heard frequency, for the graph. */
export function playedOffset(
	instrument: Instrument,
	writtenExpected: Pitch,
	hz: number,
): number {
	return centsFrom(hz, soundingPitch(instrument, writtenExpected));
}

/** The graph's text alternative, such as "Played C♯5, 23 cents sharp of C5". */
export function graphLabel(
	played: Pitch,
	cents: number,
	expected: Pitch,
): string {
	const rounded = Math.round(Math.abs(cents));
	const where =
		rounded === 0
			? "in tune with"
			: `${rounded} ${rounded === 1 ? "cent" : "cents"} ${cents > 0 ? "sharp" : "flat"} of`;
	return `Played ${formatPitch(played)}, ${where} ${formatPitch(expected)}`;
}
