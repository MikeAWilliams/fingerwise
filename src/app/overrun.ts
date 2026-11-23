import { type CoverageReading, RIGHT_NOTE_BAND_CENTS } from "../core/coverage";
import {
	nearestPitch,
	passesChecks,
	type StabilityOptions,
} from "../core/judge";
import {
	emptyPaths,
	type LaneRow,
	type RowPaths,
	TRACE_THICKNESS,
	traceColour,
	traceY,
} from "./trace";

/**
 * Watches the readings of a timed song for silence, in song time (F12-S03).
 * A reading covers the time until the next one, as in coverage, so the silence
 * runs from the first non-sounding reading after the last sounding one to the
 * newest reading.
 */
export interface SilenceWatch {
	/** A reading at `timeMs` of song time, and whether it was sounding (passed the judge's checks). */
	push(timeMs: number, sounding: boolean): void;
	/** Song time silent so far: 0 with no readings or while the newest one sounds; from the first reading when nothing has sounded. */
	silentMs(): number;
}

export function createSilenceWatch(): SilenceWatch {
	let silentSince: number | null = null;
	let newest: number | null = null;
	return {
		push(timeMs, sounding) {
			newest = timeMs;
			if (sounding) silentSince = null;
			else if (silentSince === null) silentSince = timeMs;
		},
		silentMs() {
			if (silentSince === null || newest === null) return 0;
			return Math.max(0, newest - silentSince);
		},
	};
}

/** One sounding reading after the last note: when it began and ended (ms after the last note's end) and how far it was from its nearest note. */
export interface OverrunPoint {
	timeMs: number;
	/** When the next reading came, or this one's own time when it is the last reading. */
	endMs: number;
	cents: number;
}

export interface OverrunTrace {
	points: OverrunPoint[];
	/** The last point's end: how far past the last note the playing reached. */
	endMs: number;
}

/**
 * The trace of what was played after the last note (F12-S04): the readings that
 * pass the checks, in ms after `startMs` (the last note's end), each at its
 * offset in cents from the nearest note. A reading lasts until the next one's
 * time. Null when nothing sounded.
 */
export function overrunTrace(
	readings: readonly CoverageReading[],
	checks: StabilityOptions,
	startMs: number,
): OverrunTrace | null {
	const points: OverrunPoint[] = [];
	readings.forEach((reading, i) => {
		if (!passesChecks(reading, checks)) return;
		const next = readings[i + 1];
		const timeMs = reading.time - startMs;
		points.push({
			timeMs,
			endMs: next ? next.time - startMs : timeMs,
			cents: nearestPitch(reading.frequency as number).cents,
		});
	});
	const last = points[points.length - 1];
	return last ? { points, endMs: last.endMs } : null;
}

/** The label band above the lane and the gaps around the lane, in view-box units. */
export const OVERRUN_LABEL_SIZE = 11;
const LANE_GAP = 4;

/** The overrun lane's figures in the overlay's view box. */
export interface OverrunLane {
	/** The lane's left edge: the last row's first stop. */
	x0: number;
	/** The lane's right edge: where the trace ends, or the row's last stop when it is cut. */
	x1: number;
	top: number;
	bottom: number;
	/** The baseline of the label text, in the band above the lane. */
	labelY: number;
	/** The right edge the "+N s" text lines up with: the row's last stop. */
	moreX: number;
	/** The view-box height to add under the song's own. */
	extraHeight: number;
	paths: RowPaths;
	/** The guide lines at the tolerance and the right-note band, both ways. */
	guides: string;
	/** The ms of the trace past the visible span; null when it fits. */
	more: number | null;
}

const round = (n: number) => Math.round(n * 10) / 10;

/**
 * Where the overrun lane goes and what it holds: under `layoutHeight`, left
 * aligned with the last row's lane, at that row's average scale (its width over
 * its time), starting at the last note's end. Points past the row's width are
 * cut there and `more` says by how much.
 */
export function overrunLane(
	lastRow: LaneRow,
	layoutHeight: number,
	trace: OverrunTrace,
	tempo: number,
	tolerance: number,
): OverrunLane {
	const { x0, x1: spanX1 } = lastRow.map.span(lastRow.from, lastRow.to);
	const rowMs = ((lastRow.to - lastRow.from) * 60000) / tempo;
	const scale = rowMs > 0 ? (spanX1 - x0) / rowMs : 0;
	const width = spanX1 - x0;
	const laneHeight = lastRow.laneBottom - lastRow.laneTop;
	const labelY = layoutHeight + LANE_GAP + OVERRUN_LABEL_SIZE;
	const top = labelY + LANE_GAP;
	const bottom = top + laneHeight;
	const reach = Math.min(trace.endMs * scale, width);
	const paths = emptyPaths();
	for (const point of trace.points) {
		const a = point.timeMs * scale;
		if (a >= width) continue;
		const b = Math.max(a, Math.min(point.endMs * scale, width));
		const mid = Math.min(
			Math.max(traceY(point.cents, top, bottom), top + TRACE_THICKNESS / 2),
			bottom - TRACE_THICKNESS / 2,
		);
		const y0 = round(mid - TRACE_THICKNESS / 2);
		const y1 = round(mid + TRACE_THICKNESS / 2);
		const left = round(x0 + a);
		const right = round(x0 + b);
		paths[traceColour(point.cents, tolerance)] +=
			`M${left} ${y0}H${right}V${y1}H${left}Z`;
	}
	let guides = "";
	for (const cents of [tolerance, RIGHT_NOTE_BAND_CENTS]) {
		for (const sign of [1, -1]) {
			guides += `M${x0} ${traceY(sign * cents, top, bottom)}H${x0 + reach}`;
		}
	}
	return {
		x0,
		x1: x0 + reach,
		top,
		bottom,
		labelY,
		moreX: spanX1,
		extraHeight: bottom + LANE_GAP - layoutHeight,
		paths,
		guides,
		more:
			scale > 0 && trace.endMs * scale > width
				? trace.endMs - width / scale
				: null,
	};
}
