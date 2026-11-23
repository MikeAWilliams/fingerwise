import type { Timeline } from "../core/coverage";
import type { Bar } from "../core/song";
import { rowMap, type SongLayout } from "../render/staff";

/** Beats closer than this count as the same time, as `songBars` counts them. */
const BEAT_EPSILON = 1e-3;

/** One stretch of a row's lane: a note or a rest, or the part of one on this row. */
export interface LaneSegment {
	/** An index into the layout's rows. */
	row: number;
	x0: number;
	x1: number;
	kind: "note" | "rest";
	/** False for a note or rest too short to grade, drawn lighter. */
	graded: boolean;
	/** A note's index in the song; a rest's place among the rests. */
	index: number;
}

/**
 * The lane's segments for the lines on show: a note or rest spanning its
 * written length on every row it reaches, so a note tied over a bar line is one
 * continuous segment and a note over a line break has one on each row. The
 * count-in bar has none. `tempo` is quarter notes per minute, to turn the
 * timeline's ms into the layout's beats.
 */
export function laneSegments(
	timeline: Timeline,
	lines: readonly Bar[][],
	layout: SongLayout,
	tempo: number,
): LaneSegment[] {
	const beats = (ms: number) => (ms * tempo) / 60000;
	const items = [
		...timeline.notes.map((n) => ({
			kind: "note" as const,
			index: n.index,
			start: beats(n.startMs),
			end: beats(n.endMs),
			graded: n.graded,
		})),
		...timeline.rests.map((r, index) => ({
			kind: "rest" as const,
			index,
			start: beats(r.startMs),
			end: beats(r.endMs),
			graded: r.graded,
		})),
	];
	const segments: LaneSegment[] = [];
	layout.rows.forEach((row, r) => {
		const bars = lines[row.line] ?? [];
		const first = bars[0];
		const last = bars[bars.length - 1];
		if (!first || !last) return;
		const from = first.start;
		const to =
			last.start + last.items.reduce((sum, item) => sum + item.beats, 0);
		const map = rowMap(row.stops);
		for (const item of items) {
			if (item.end <= from + BEAT_EPSILON || item.start >= to - BEAT_EPSILON)
				continue;
			const { x0, x1 } = map.span(
				Math.max(item.start, from),
				Math.min(item.end, to),
			);
			segments.push({
				row: r,
				x0,
				x1,
				kind: item.kind,
				graded: item.graded,
				index: item.index,
			});
		}
	});
	return segments;
}
