import {
	type Progress,
	RIGHT_NOTE_BAND_CENTS,
	type Segment,
	type TimelineNote,
	TRACE_SPAN_CENTS,
} from "../core/coverage";
import {
	centsFrom,
	passesChecks,
	type Reading,
	type StabilityOptions,
} from "../core/judge";
import type { Pitch } from "../core/pitch";
import type { RowMap } from "../render/staff";
import type { LaneSegment, NoteEnd } from "./lane";
import { faultMarks, marksPaths } from "./marks";

export type TraceColour = "green" | "amber" | "red";
export const TRACE_COLOURS: readonly TraceColour[] = ["green", "amber", "red"];

/** How thick the trace's line is, in view-box units. */
export const TRACE_THICKNESS = 3;
/** How tall the band is that fills a rest, centred in the lane. */
export const REST_BAND = 8;

/** Beats closer than this count as the same time. */
const BEAT_EPSILON = 1e-3;
/** Absorbs floating-point error at the tolerance. */
const EPSILON_CENTS = 1e-6;

/**
 * The y of a reading's offset in the lane: centred when in tune, `laneTop` at
 * `+TRACE_SPAN_CENTS` (sharp upwards), `laneBottom` at minus, linear between
 * and clamped to the edges beyond.
 */
export function traceY(
	cents: number,
	laneTop: number,
	laneBottom: number,
): number {
	const clamped = Math.max(
		-TRACE_SPAN_CENTS,
		Math.min(TRACE_SPAN_CENTS, cents),
	);
	const half = (laneBottom - laneTop) / 2;
	return laneTop + half - (clamped / TRACE_SPAN_CENTS) * half;
}

/** Green within the tolerance, amber from there to the right-note band, red beyond. */
export function traceColour(cents: number, tolerance: number): TraceColour {
	const off = Math.abs(cents);
	if (off <= tolerance + EPSILON_CENTS) return "green";
	return off <= RIGHT_NOTE_BAND_CENTS + EPSILON_CENTS ? "amber" : "red";
}

/** One lane row's place in song time and on screen. */
export interface LaneRow {
	/** Beats from the first note's start where the row's line begins and ends. */
	from: number;
	to: number;
	map: RowMap;
	laneTop: number;
	laneBottom: number;
}

/** The path data of each colour on one row: filled rectangles. */
export type RowPaths = Record<TraceColour, string>;

export function emptyPaths(): RowPaths {
	return { green: "", amber: "", red: "" };
}

/**
 * The rows a frame must touch, sorted: the playhead's row, and every row an
 * open segment reaches by its beat range (a stretch over a line break has
 * fill on both rows). Finished and not-yet-reached rows are left alone.
 */
export function rowsToUpdate(
	rows: readonly LaneRow[],
	playheadRow: number | null,
	open: readonly Segment[],
	tempo: number,
): number[] {
	const touched = new Set<number>();
	if (playheadRow !== null && playheadRow >= 0 && playheadRow < rows.length)
		touched.add(playheadRow);
	for (const segment of open) {
		const b0 = (segment.startMs * tempo) / 60000;
		const b1 = (segment.endMs * tempo) / 60000;
		rows.forEach((row, r) => {
			const lo = Math.max(b0, row.from);
			const hi = Math.min(b1, row.to);
			if (hi - lo > BEAT_EPSILON / 100) touched.add(r);
		});
	}
	return [...touched].sort((a, b) => a - b);
}

const round = (n: number) => Math.round(n * 10) / 10;

/**
 * The fill for `segments`, one path string per colour per row (`rows` order).
 * On a note each sounding reading is a short thick line from its time to the
 * next reading's, at its offset's height and in its offset's colour; a reading
 * further off than the span is pinned to an edge and red. Silence on a note
 * draws nothing. On a rest, silence is a green band across the lane's middle
 * and sound a red one. Notes and rests too short to grade are never filled. A
 * stretch over a line break is drawn on each row it reaches.
 */
export function segmentPaths(
	segments: readonly Segment[],
	rows: readonly LaneRow[],
	tempo: number,
	tolerance: number,
): RowPaths[] {
	const paths = rows.map(emptyPaths);
	const beats = (ms: number) => (ms * tempo) / 60000;
	const add = (
		startMs: number,
		endMs: number,
		colour: TraceColour,
		/** The line's centre y in a row, and its thickness. */
		centre: (row: LaneRow) => number,
		thickness: number,
	) => {
		const b0 = beats(startMs);
		const b1 = beats(endMs);
		rows.forEach((row, r) => {
			const lo = Math.max(b0, row.from);
			const hi = Math.min(b1, row.to);
			if (hi - lo <= BEAT_EPSILON / 100 || lo > row.to || hi < row.from) return;
			const { x0, x1 } = row.map.span(lo, hi);
			// Kept inside the lane, so a pinned line does not poke out of it.
			const mid = Math.min(
				Math.max(centre(row), row.laneTop + thickness / 2),
				row.laneBottom - thickness / 2,
			);
			const y0 = round(mid - thickness / 2);
			const y1 = round(mid + thickness / 2);
			const a = round(x0);
			const b = round(Math.max(x0, x1));
			(paths[r] as RowPaths)[colour] += `M${a} ${y0}H${b}V${y1}H${a}Z`;
		});
	};
	for (const segment of segments) {
		if (!segment.graded) continue;
		if (segment.on === "rest") {
			if (segment.kind !== "silent" && segment.kind !== "wrong") continue;
			add(
				segment.startMs,
				segment.endMs,
				segment.kind === "silent" ? "green" : "red",
				(row) => (row.laneTop + row.laneBottom) / 2,
				REST_BAND,
			);
			continue;
		}
		segment.points.forEach((point, i) => {
			const next = segment.points[i + 1];
			add(
				point.timeMs,
				next ? next.timeMs : segment.endMs,
				traceColour(point.cents, tolerance),
				(row) => traceY(point.cents, row.laneTop, row.laneBottom),
				TRACE_THICKNESS,
			);
		});
	}
	return paths;
}

/**
 * Every row's fill and fault marks for a finished scoring, built at once: the
 * same paths the frame loop writes when it is fed these segments and faults
 * over time. `fill` is per row (`segmentPaths`), `marks` one path string per row.
 */
export function settledPaths(
	scored: Pick<Progress, "segments" | "timingFaults" | "notSeparated">,
	segments: readonly LaneSegment[],
	ends: readonly NoteEnd[],
	rows: readonly LaneRow[],
	tempo: number,
	tolerance: number,
): { fill: RowPaths[]; marks: string[] } {
	return {
		fill: segmentPaths(scored.segments, rows, tempo, tolerance),
		marks: marksPaths(
			faultMarks(scored.timingFaults, scored.notSeparated, segments, ends),
			rows,
		),
	};
}

/**
 * The length a Single note tone is graded against: the note's lane segment,
 * from its start to where its release starts (its written length for a note
 * slurred into the next). This is the grey box the player sees.
 */
export function tonePassLengthMs(note: TimelineNote): number {
	return note.endMs - note.releaseMs - note.startMs;
}

/**
 * The trace of a tone sounding now in Single note, as a coverage segment on
 * `note`. The tone's time axis starts at its own start, not at a clock:
 * a reading at `time` is placed at `note.startMs + (time - tone.startMs)`. Only
 * readings that pass `checks` become points, each with its offset in cents from
 * the `sounding` pitch. Nothing is placed past the note's written end, so a
 * tone held longer draws nothing more. Null without a tone, or when nothing of
 * it is inside the note.
 */
export function toneSegment(
	tone: { startMs: number; readings: readonly Reading[] } | null,
	note: TimelineNote,
	sounding: Pitch,
	checks: StabilityOptions,
): Segment | null {
	if (tone === null || tone.readings.length === 0) return null;
	const at = (time: number) => note.startMs + (time - tone.startMs);
	const points: { timeMs: number; cents: number }[] = [];
	let endMs = note.startMs;
	for (const reading of tone.readings) {
		const timeMs = at(reading.time);
		if (timeMs >= note.endMs) break;
		endMs = timeMs;
		if (passesChecks(reading, checks)) {
			points.push({
				timeMs,
				cents: centsFrom(reading.frequency as number, sounding),
			});
		}
	}
	const last = tone.readings[tone.readings.length - 1] as Reading;
	// A tone still inside the note ends at its newest reading; one past the end at the written end.
	if (at(last.time) >= note.endMs) endMs = note.endMs;
	if (points.length === 0) return null;
	return {
		startMs: note.startMs,
		endMs,
		kind: "right-in-tune",
		on: "note",
		graded: true,
		points,
	};
}
