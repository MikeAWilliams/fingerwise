import type { SongLayout } from "../render/staff";
import type { LaneSegment } from "./lane";

/** The gap between neighbouring segments, so each shows as its own, in view-box units. */
const SEGMENT_GAP = 1;

/** One rectangle per segment, as a single path. */
function lanePath(
	layout: SongLayout,
	segments: readonly LaneSegment[],
	graded: boolean,
): string {
	let d = "";
	for (const s of segments) {
		const row = layout.rows[s.row];
		if (!row || s.graded !== graded) continue;
		const x0 = s.x0 + SEGMENT_GAP / 2;
		const x1 = Math.max(x0, s.x1 - SEGMENT_GAP / 2);
		d += `M${x0} ${row.laneTop}H${x1}V${row.laneBottom}H${x0}Z`;
	}
	return d;
}

/**
 * Over the staff, with the staff's view box: the lane under each row. It is not
 * drawn by VexFlow, so it changes without redrawing the staff. Graded segments
 * are a neutral colour and ungraded ones lighter.
 */
export function SongOverlay({
	layout,
	segments,
}: {
	layout: SongLayout;
	segments: readonly LaneSegment[];
}) {
	return (
		<svg
			class="song-overlay"
			viewBox={`0 0 ${layout.width} ${layout.height}`}
			aria-hidden="true"
		>
			<path class="lane-graded" d={lanePath(layout, segments, true)} />
			<path class="lane-ungraded" d={lanePath(layout, segments, false)} />
		</svg>
	);
}
