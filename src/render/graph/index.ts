import { formatPitch, type Pitch } from "../../core/pitch";

/** Cents shown either side of the expected pitch: two semitones. */
export const SPAN_CENTS = 200;
/** Space kept at each end of the axis, in the caller's units, for labels and arrows. */
export const SIDE_MARGIN = 24;

export interface GraphTick {
	x: number;
	label: string;
}

export interface PitchGraph {
	/** One tick per semitone from two below to two above the expected pitch. */
	ticks: GraphTick[];
	expectedX: number;
	/** The played pitch, clamped to the axis; `pinned` names the edge it went past. */
	played: { x: number; pinned: "left" | "right" | null };
	/** Signed offset of the played pitch from the expected one, such as `+23¢`. */
	offsetLabel: string;
}

/** Rounded signed cents, such as `+23¢`, `-7¢` or `0¢`. */
export function formatCents(cents: number): string {
	const rounded = Math.round(cents);
	if (rounded === 0) return "0¢";
	return `${rounded > 0 ? "+" : "-"}${Math.abs(rounded)}¢`;
}

/**
 * Positions for a cents axis `width` wide around `expected`. Pass written
 * pitches so the tick labels agree with the staff; `cents` is the played
 * pitch's offset from `expected`.
 */
export function pitchGraph(
	expected: Pitch,
	cents: number,
	width: number,
): PitchGraph {
	const inner = width - 2 * SIDE_MARGIN;
	const xOf = (c: number) =>
		SIDE_MARGIN + ((c + SPAN_CENTS) / (2 * SPAN_CENTS)) * inner;
	const ticks: GraphTick[] = [];
	for (let k = -2; k <= 2; k++) {
		ticks.push({
			x: xOf(k * 100),
			label: formatPitch((expected + k) as Pitch),
		});
	}
	const pinned =
		cents < -SPAN_CENTS ? "left" : cents > SPAN_CENTS ? "right" : null;
	const clamped = Math.min(SPAN_CENTS, Math.max(-SPAN_CENTS, cents));
	return {
		ticks,
		expectedX: xOf(0),
		played: { x: xOf(clamped), pinned },
		offsetLabel: formatCents(cents),
	};
}
