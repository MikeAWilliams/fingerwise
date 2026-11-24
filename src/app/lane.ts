import type { Timeline } from "../core/coverage";
import type { Bar } from "../core/song";
import { rowMap, type SongLayout } from "../render/staff";
import type { LaneRow } from "./trace";

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
	/** This segment holds the start of the note or rest, not a continuation from the row before. */
	starts: boolean;
	/** This segment holds its end (a note's release start), not a carry on to the row after. */
	ends: boolean;
}

/** Where a note's written end falls: on the row that holds it. */
export interface NoteEnd {
	/** A note's index in the song. */
	index: number;
	row: number;
	x: number;
}

/** A stretch of the song in beats: an item's range, the row's range and the item's x span on that row. */
interface RowSpan<T> {
	item: T;
	row: number;
	x0: number;
	x1: number;
	starts: boolean;
	ends: boolean;
}

/**
 * Each item on every row whose range holds some of `[start, end]`, with its x
 * span there, in row order. `starts` and `ends` say whether this row holds the
 * item's start and end.
 */
function onRows<T extends { start: number; end: number }>(
	items: readonly T[],
	lines: readonly Bar[][],
	layout: SongLayout,
): RowSpan<T>[] {
	const out: RowSpan<T>[] = [];
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
			out.push({
				item,
				row: r,
				x0,
				x1,
				starts: item.start >= from - BEAT_EPSILON,
				ends: item.end <= to + BEAT_EPSILON,
			});
		}
	});
	return out;
}

/**
 * The lane's segments for every line of the song: a rest spanning its written
 * length, and a note from its start to where its release starts (its written
 * end when slurred into the next note), on every row it reaches, so a note tied
 * over a bar line is one continuous segment and a note over a line break has
 * one on each row. A row that holds only a note's release gets none. The
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
			end: beats(n.endMs - n.releaseMs),
			graded: n.graded,
		})),
		...timeline.rests.map((r, index) => ({
			kind: "rest" as const,
			index,
			start: beats(r.startMs),
			end: beats(r.endMs),
			graded: r.graded,
		})),
	].filter((item) => item.end > item.start);
	return onRows(items, lines, layout).map(
		({ item, row, x0, x1, starts, ends }) => ({
			row,
			x0,
			x1,
			kind: item.kind,
			graded: item.graded,
			index: item.index,
			starts,
			ends,
		}),
	);
}

/**
 * Each note's written end, on the row that holds it, so marks that sit there
 * (ended late, not separated) have a place even where no segment reaches it.
 * `tempo` is as for `laneSegments`.
 */
export function laneNoteEnds(
	timeline: Timeline,
	lines: readonly Bar[][],
	layout: SongLayout,
	tempo: number,
): NoteEnd[] {
	const beats = (ms: number) => (ms * tempo) / 60000;
	const notes = timeline.notes.map((n) => ({
		index: n.index,
		start: beats(n.startMs),
		end: beats(n.endMs),
	}));
	return onRows(notes, lines, layout)
		.filter((span) => span.ends)
		.map(({ item, row, x1 }) => ({ index: item.index, row, x: x1 }));
}

/** What the fill needs of each row: its beats, its map and its lane. */
export function laneRows(
	lines: readonly Bar[][],
	layout: SongLayout,
): LaneRow[] {
	return layout.rows.map((row) => {
		const bars = lines[row.line] ?? [];
		const first = bars[0];
		const last = bars[bars.length - 1];
		return {
			from: first?.start ?? 0,
			to: last
				? last.start + last.items.reduce((sum, item) => sum + item.beats, 0)
				: 0,
			map: rowMap(row.stops),
			laneTop: row.laneTop,
			laneBottom: row.laneBottom,
		};
	});
}
