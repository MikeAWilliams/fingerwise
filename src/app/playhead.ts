import type { Timeline } from "../core/coverage";
import type { RowLayout } from "../render/staff";
import { rowMap } from "../render/staff";

/**
 * The song time the player hears, in beats from the first note's start
 * (negative during the count-in): the clock, less the output latency when it is
 * known, less the origin, at `tempo` quarter notes per minute. Without an audio
 * context the clock is the page clock and there is no latency to take off.
 */
export function playheadBeat(
	clockNow: number,
	outputLatency: number | null,
	origin: number,
	tempo: number,
): number {
	return ((clockNow - (outputLatency ?? 0) - origin) * tempo) / 60;
}

/**
 * Which row the playhead is on and its x, from every row of the song. A row holds
 * the beats from its first stop up to its last (its end bar line); a beat at
 * that end is on the next row, at its first note, so the playhead jumps to the
 * next row's start. Before the first row it waits at its start
 * and past the last it waits at its end. `row` is an index into `rows`.
 */
export function playheadPlace(
	beat: number,
	rows: readonly RowLayout[],
): { row: number; x: number } | null {
	if (rows.length === 0) return null;
	let row = rows.findIndex((r) => {
		const end = r.stops[r.stops.length - 1];
		return end !== undefined && beat < end.beat;
	});
	if (row < 0) row = rows.length - 1;
	// Where a bar line and the next bar's first note share a beat, keep only the note, so the
	// playhead glides over the bar line instead of jumping across it when the beat arrives.
	const stops = (rows[row] as RowLayout).stops.filter(
		(stop, i, all) => all[i + 1]?.beat !== stop.beat,
	);
	if (stops.length === 0) return null;
	return { row, x: rowMap(stops).beatToX(beat) };
}

/**
 * Where Single note's fixed play head sits: at the start of song note `index`,
 * placed as the moving playhead is at that beat. A note that starts a new row
 * is on that row, at its first note. Null for an index that is no note or a
 * song with no rows.
 */
export function headPlace(
	index: number,
	timeline: Timeline,
	tempo: number,
	rows: readonly RowLayout[],
): { row: number; x: number } | null {
	const note = timeline.notes[index];
	if (!note) return null;
	return playheadPlace((note.startMs * tempo) / 60000, rows);
}

/**
 * What the song overlay does with the last run's drawing: "run" while the song
 * runs, "keep" once it stopped with an origin (the summary keeps its fill,
 * marks and stopped playhead), and "clear" with no origin, which is a fresh flow
 * in ready, as a tune change gives.
 */
export function overlayRun(
	running: boolean,
	origin: number | null,
): "run" | "keep" | "clear" {
	if (origin === null) return "clear";
	return running ? "run" : "keep";
}
