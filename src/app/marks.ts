import type { JoinFault, TimingFault } from "../core/coverage";
import type { LaneSegment, NoteEnd } from "./lane";

/**
 * Which mark: the four timing faults, told apart by which edge of the note they
 * sit at and which way their pointer faces (left for early, right for late),
 * and a join that was not separated.
 */
export type MarkShape =
	| "start-early"
	| "start-late"
	| "end-early"
	| "end-late"
	| "not-separated";

/** What each mark means, in the order the legend lists them. */
export const MARK_LABELS: Record<MarkShape, string> = {
	"start-late": "Started late",
	"start-early": "Started early",
	"end-early": "Ended early",
	"end-late": "Ended late",
	"not-separated": "Not separated",
};

export interface Mark {
	/** An index into the layout's rows. */
	row: number;
	x: number;
	shape: MarkShape;
}

/** The marks' size, in view-box units: a quarter of the 24-unit lane. */
export const MARK_HEIGHT = 6;
const TICK_WIDTH = 1.5;
const POINTER_WIDTH = 4;
/** Half the width of the not-separated slur. */
const SLUR_HALF = 3.5;

/**
 * Where each reported fault is drawn, on every row. A start fault sits at the
 * start of its note's segment; an ended-early fault at the end of the segment,
 * where the release starts; an ended-late fault at the note's written end,
 * which `ends` gives even where no segment reaches it. A not-separated join sits
 * at the written join: the written end of the note before it, or the start of
 * the note after when only that row has it. A fault whose edge is on no row
 * gives no mark.
 */
export function faultMarks(
	faults: readonly TimingFault[],
	joins: readonly JoinFault[],
	segments: readonly LaneSegment[],
	ends: readonly NoteEnd[],
): Mark[] {
	const marks: Mark[] = [];
	const noteSegment = (index: number, holds: "starts" | "ends") =>
		segments.find((s) => s.kind === "note" && s.index === index && s[holds]);
	const writtenEnd = (index: number) => ends.find((e) => e.index === index);
	for (const fault of faults) {
		const shape: MarkShape = `${fault.edge}-${fault.kind}`;
		if (fault.edge === "start") {
			const segment = noteSegment(fault.index, "starts");
			if (segment) marks.push({ row: segment.row, x: segment.x0, shape });
		} else if (fault.kind === "early") {
			const segment = noteSegment(fault.index, "ends");
			if (segment) marks.push({ row: segment.row, x: segment.x1, shape });
		} else {
			const end = writtenEnd(fault.index);
			if (end) marks.push({ row: end.row, x: end.x, shape });
		}
	}
	for (const join of joins) {
		const before = writtenEnd(join.before);
		const after = noteSegment(join.after, "starts");
		if (before)
			marks.push({ row: before.row, x: before.x, shape: "not-separated" });
		else if (after)
			marks.push({ row: after.row, x: after.x0, shape: "not-separated" });
	}
	return marks;
}

const n = (value: number) => Math.round(value * 10) / 10;

/**
 * The path data of one mark in a lane from `laneTop` to `laneBottom`, for a path
 * that is both filled and stroked. A timing mark is a tick at the edge with a
 * triangle on the inside of the note pointing left (early) or right (late), in
 * the lane's top quarter above the trace's centre line. A not-separated mark is
 * a thin slur (a crescent) under the join in the lane's bottom quarter.
 */
export function markPath(
	mark: Mark,
	laneTop: number,
	laneBottom: number,
): string {
	const { x, shape } = mark;
	if (shape === "not-separated") {
		// A thin crescent like a slur or tie under the join: the notes run together.
		const ends = laneBottom - MARK_HEIGHT + 1;
		const left = n(x - SLUR_HALF);
		const right = n(x + SLUR_HALF);
		return `M${left} ${n(ends)}Q${n(x)} ${n(laneBottom)} ${right} ${n(ends)}Q${n(x)} ${n(laneBottom - 2)} ${left} ${n(ends)}Z`;
	}
	const bottom = laneTop + MARK_HEIGHT;
	const mid = laneTop + MARK_HEIGHT / 2;
	const atStart = shape.startsWith("start");
	const late = shape.endsWith("late");
	// The tick sits on the edge; the pointer is inside the note, beside it.
	const tickLeft = atStart ? x : x - TICK_WIDTH;
	const tick = `M${n(tickLeft)} ${n(laneTop)}H${n(tickLeft + TICK_WIDTH)}V${n(bottom)}H${n(tickLeft)}Z`;
	const left = atStart ? x + TICK_WIDTH : x - TICK_WIDTH - POINTER_WIDTH;
	const right = left + POINTER_WIDTH;
	// Late points right, early left: the flat side is the one it points away from.
	const flat = late ? left : right;
	const tip = late ? right : left;
	const pointer = `M${n(flat)} ${n(laneTop)}L${n(tip)} ${n(mid)}L${n(flat)} ${n(bottom)}Z`;
	return tick + pointer;
}

/** The path data for each row's marks, one string per row of `rows`. */
export function marksPaths(
	marks: readonly Mark[],
	rows: readonly { laneTop: number; laneBottom: number }[],
): string[] {
	const paths = rows.map(() => "");
	for (const mark of marks) {
		const row = rows[mark.row];
		if (row) paths[mark.row] += markPath(mark, row.laneTop, row.laneBottom);
	}
	return paths;
}
