import type { JoinFault, TimingFault } from "../core/coverage";
import type { LaneSegment } from "./lane";

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
const CROSS_HALF = 2.5;
const BAR_WIDTH = 1.5;

/**
 * Where each reported fault is drawn, on the rows on show. A timing fault sits
 * at the start or end edge of its note's segment on the row that holds that
 * edge; a not-separated join sits at the join, which is the end of the note
 * before it (or the start of the note after, when only that row is on show). A
 * fault whose edge is on a row that is not on show gives no mark.
 */
export function faultMarks(
	faults: readonly TimingFault[],
	joins: readonly JoinFault[],
	segments: readonly LaneSegment[],
): Mark[] {
	const marks: Mark[] = [];
	const noteSegment = (index: number, holds: "starts" | "ends") =>
		segments.find((s) => s.kind === "note" && s.index === index && s[holds]);
	for (const fault of faults) {
		const segment = noteSegment(
			fault.index,
			fault.edge === "start" ? "starts" : "ends",
		);
		if (!segment) continue;
		marks.push({
			row: segment.row,
			x: fault.edge === "start" ? segment.x0 : segment.x1,
			shape: `${fault.edge}-${fault.kind}`,
		});
	}
	for (const join of joins) {
		const before = noteSegment(join.before, "ends");
		const after = noteSegment(join.after, "starts");
		if (before)
			marks.push({ row: before.row, x: before.x1, shape: "not-separated" });
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
 * a short vertical bar with a cross over it in the lane's bottom quarter.
 */
export function markPath(
	mark: Mark,
	laneTop: number,
	laneBottom: number,
): string {
	const { x, shape } = mark;
	if (shape === "not-separated") {
		const top = laneBottom - MARK_HEIGHT;
		const mid = laneBottom - MARK_HEIGHT / 2;
		return (
			`M${n(x - BAR_WIDTH / 2)} ${n(top)}H${n(x + BAR_WIDTH / 2)}V${n(laneBottom)}H${n(x - BAR_WIDTH / 2)}Z` +
			`M${n(x - CROSS_HALF)} ${n(mid - CROSS_HALF)}L${n(x + CROSS_HALF)} ${n(mid + CROSS_HALF)}` +
			`M${n(x - CROSS_HALF)} ${n(mid + CROSS_HALF)}L${n(x + CROSS_HALF)} ${n(mid - CROSS_HALF)}`
		);
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
