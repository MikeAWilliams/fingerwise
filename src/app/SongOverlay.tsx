import { useEffect, useRef } from "preact/hooks";
import type { SongLayout } from "../render/staff";
import type { LaneSegment } from "./lane";
import { playheadBeat, playheadPlace } from "./playhead";

/** What the playhead follows: the clocks, and whether the song is running. */
export interface PlayheadSource {
	/** The song is in its count-in or playing: the playhead moves. */
	running: boolean;
	/** The clock's seconds at the first note's start; null before the count-in. */
	origin: number | null;
	/** The clock the song keeps time on: the audio clock, or the page clock without audio. */
	now(): number;
	/** The output latency in seconds, or null when not reported. */
	outputLatency(): number | null;
}

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
 * Over the staff, with the staff's view box: the lane under each row and the
 * playhead. It is not drawn by VexFlow, so it changes without redrawing the
 * staff. Graded segments are a neutral colour and ungraded ones lighter.
 *
 * The playhead is one line moved by an animation-frame loop that runs while the
 * song is running and is cancelled when it stops or the overlay goes away. The
 * loop sets the line's attributes directly: no Preact state, no redraw.
 */
export function SongOverlay({
	layout,
	segments,
	tempo,
	playhead,
}: {
	layout: SongLayout;
	segments: readonly LaneSegment[];
	/** Quarter notes per minute. */
	tempo: number;
	playhead: PlayheadSource;
}) {
	const line = useRef<SVGLineElement>(null);
	const { running, origin, now, outputLatency } = playhead;
	useEffect(() => {
		const el = line.current;
		if (!el || !running || origin === null) return;
		let frame = 0;
		const move = () => {
			const beat = playheadBeat(now(), outputLatency(), origin, tempo);
			const place = playheadPlace(beat, layout.rows);
			const row = place && layout.rows[place.row];
			if (place && row) {
				const x = String(place.x);
				el.setAttribute("x1", x);
				el.setAttribute("x2", x);
				el.setAttribute("y1", String(row.top));
				el.setAttribute("y2", String(row.laneBottom));
				el.removeAttribute("visibility");
			}
			frame = requestAnimationFrame(move);
		};
		frame = requestAnimationFrame(move);
		return () => cancelAnimationFrame(frame);
	}, [layout, running, origin, tempo, now, outputLatency]);
	return (
		<svg
			class="song-overlay"
			viewBox={`0 0 ${layout.width} ${layout.height}`}
			aria-hidden="true"
		>
			<path class="lane-graded" d={lanePath(layout, segments, true)} />
			<path class="lane-ungraded" d={lanePath(layout, segments, false)} />
			<line class="playhead" ref={line} visibility="hidden" />
		</svg>
	);
}
