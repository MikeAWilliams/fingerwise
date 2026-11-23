// Pure: no VexFlow, so the map can be tested and used without drawing.

/** Where a note, rest or bar line sits on a row: its x and its beat from the first note's start (negative in the count-in). */
export interface Stop {
	x: number;
	beat: number;
}

export interface RowMap {
	/**
	 * The x for a beat: piecewise linear between the stops, clamped to the row.
	 * At a beat several stops share (a bar line and the note after it) it is
	 * the last one, the note's own x.
	 */
	beatToX(beat: number): number;
	/**
	 * The x range of a stretch of time: it starts at its own x and ends where
	 * the next note, rest or bar line begins, which at a shared beat is the
	 * first stop there (the bar line).
	 */
	span(startBeat: number, endBeat: number): { x0: number; x1: number };
}

/** The map of a row from its stops, which are in order of x with beats that do not decrease. At least one stop. */
export function rowMap(stops: readonly Stop[]): RowMap {
	const first = stops[0] as Stop;
	const last = stops[stops.length - 1] as Stop;

	/** The x for `beat`; `latest` picks the last stop at a shared beat, otherwise the first. */
	function xAt(beat: number, latest: boolean): number {
		if (beat <= first.beat) return latest ? lastAt(first.beat).x : first.x;
		if (beat >= last.beat) return latest ? last.x : firstAt(last.beat).x;
		let lo = 0;
		// The last stop at or before the beat.
		for (let i = 0; i < stops.length; i++) {
			if ((stops[i] as Stop).beat <= beat) lo = i;
			else break;
		}
		const from = stops[lo] as Stop;
		const to = stops[lo + 1] as Stop;
		if (from.beat === beat) return latest ? from.x : firstAt(beat).x;
		return (
			from.x + ((to.x - from.x) * (beat - from.beat)) / (to.beat - from.beat)
		);
	}

	function firstAt(beat: number): Stop {
		return stops.find((s) => s.beat === beat) as Stop;
	}

	function lastAt(beat: number): Stop {
		let found = first;
		for (const s of stops) if (s.beat === beat) found = s;
		return found;
	}

	return {
		beatToX: (beat) => xAt(beat, true),
		span: (startBeat, endBeat) => ({
			x0: xAt(startBeat, true),
			x1: xAt(endBeat, false),
		}),
	};
}

/** Beats closer than this count as the same, as the song module's bars do. */
const BEAT_EPSILON = 1e-3;

/** A part of a beat range on one row: the row's index and its x range. */
export interface RowPart {
	row: number;
	x0: number;
	x1: number;
}

/**
 * The parts of the beat range `[startBeat, endBeat]` on each row it overlaps,
 * rows given by their stops. A part starts at the first stop at or after
 * `startBeat` (a bar line, or the line's start when the row begins inside the
 * range) and ends at the first stop at `endBeat` (the closing bar line), or at
 * the row's last stop when the range runs on to the next row.
 */
export function beatRangeOnRows(
	rows: readonly { stops: readonly Stop[] }[],
	startBeat: number,
	endBeat: number,
): RowPart[] {
	const parts: RowPart[] = [];
	rows.forEach((row, index) => {
		const first = row.stops[0];
		const last = row.stops[row.stops.length - 1];
		if (!first || !last) return;
		if (startBeat > last.beat - BEAT_EPSILON) return;
		if (endBeat < first.beat + BEAT_EPSILON) return;
		const from = row.stops.find((s) => s.beat >= startBeat - BEAT_EPSILON);
		const to = row.stops.find((s) => s.beat >= endBeat - BEAT_EPSILON);
		parts.push({ row: index, x0: (from ?? first).x, x1: (to ?? last).x });
	});
	return parts;
}
