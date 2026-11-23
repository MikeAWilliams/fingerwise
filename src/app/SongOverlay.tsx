import type { RefObject } from "preact";
import { useEffect, useRef } from "preact/hooks";
import { type Progress, RIGHT_NOTE_BAND_CENTS } from "../core/coverage";
import type { Instrument } from "../core/instrument";
import type { Reading } from "../core/judge";
import type { SongLayout } from "../render/staff";
import {
	createReadoutThrottle,
	HEARING_NOTHING,
	hearingText,
} from "./judge-text";
import type { LaneSegment } from "./lane";
import { playheadBeat, playheadPlace } from "./playhead";
import {
	emptyPaths,
	type LaneRow,
	type RowPaths,
	segmentPaths,
	TRACE_COLOURS,
	traceY,
} from "./trace";

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

/** What the live fill and readout follow. */
export interface FillSource {
	/** The scoring so far; null when nothing is scored. */
	progress(): Progress | null;
	/** The newest reading from the microphone. */
	reading(): Reading | null;
	/** The tolerance setting in cents: the trace is green within it. */
	tolerance: number;
	instrument: Instrument;
}

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

/** Index of a fill path: per row, a settled and an open path for each colour. */
const fillIndex = (row: number, colour: number, open: number) =>
	row * TRACE_COLOURS.length * 2 + colour * 2 + open;

/** The faint lines at the tolerance and at the right-note band, both ways, across each row. */
function guidePath(layout: SongLayout, tolerance: number): string {
	let d = "";
	for (const row of layout.rows) {
		const first = row.stops[0];
		const last = row.stops[row.stops.length - 1];
		if (!first || !last) continue;
		for (const cents of [tolerance, RIGHT_NOTE_BAND_CENTS]) {
			for (const sign of [1, -1]) {
				const y = traceY(sign * cents, row.laneTop, row.laneBottom);
				d += `M${first.x} ${y}H${last.x}`;
			}
		}
	}
	return d;
}

/**
 * Over the staff, with the staff's view box: the lane under each row, the
 * playhead and the live fill. It is not drawn by VexFlow, so it changes without
 * redrawing the staff. Graded segments are a neutral colour and ungraded ones
 * lighter.
 *
 * One animation-frame loop runs while the song is running and is cancelled when
 * it stops, when the rows change (it restarts) or when the overlay goes away.
 * Each frame it sets the playhead line's attributes, appends the segments the
 * scoring has finished to the fill's settled paths (one per colour per row),
 * redraws the few still open, and updates the readout's text node. It holds no
 * Preact state, so a frame redraws neither the staff nor the component.
 */
export function SongOverlay({
	layout,
	segments,
	rows,
	tempo,
	playhead,
	fill,
	readout,
}: {
	layout: SongLayout;
	segments: readonly LaneSegment[];
	rows: readonly LaneRow[];
	/** Quarter notes per minute. */
	tempo: number;
	playhead: PlayheadSource;
	/** Null without scoring (judging off): the lane never fills. */
	fill: FillSource | null;
	/** Where the readout's text goes, when it is on show. */
	readout?: RefObject<HTMLElement | null>;
}) {
	const line = useRef<SVGLineElement>(null);
	const paths = useRef<(SVGPathElement | null)[]>([]);
	const { running, origin, now, outputLatency } = playhead;
	const progress = fill?.progress;
	const reading = fill?.reading;
	const tolerance = fill?.tolerance;
	const instrument = fill?.instrument;
	useEffect(() => {
		const el = line.current;
		if (!el || !running || origin === null) return;
		const set = (row: number, colour: number, open: number, d: string) =>
			paths.current[fillIndex(row, colour, open)]?.setAttribute("d", d);
		const clear = () => {
			for (const path of paths.current) path?.setAttribute("d", "");
		};
		clear();
		let frame = 0;
		// What the settled paths hold: which array of segments, how many, and their path data.
		let from: unknown = null;
		let consumed = 0;
		let settled: RowPaths[] = rows.map(emptyPaths);
		let openD: string[] = [];
		const throttle = createReadoutThrottle();
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
			const scored = progress?.();
			if (scored && tolerance !== undefined) {
				if (scored.segments !== from) {
					// A new run, or the first look: start the settled paths afresh.
					from = scored.segments;
					consumed = 0;
					settled = rows.map(emptyPaths);
					clear();
					openD = [];
				}
				if (scored.segments.length > consumed) {
					const fresh = segmentPaths(
						scored.segments.slice(consumed),
						rows,
						tempo,
						tolerance,
					);
					consumed = scored.segments.length;
					fresh.forEach((add, r) => {
						TRACE_COLOURS.forEach((colour, c) => {
							const have = settled[r] as RowPaths;
							have[colour] += add[colour];
							set(r, c, 0, have[colour]);
						});
					});
				}
				const open = segmentPaths(scored.open, rows, tempo, tolerance);
				open.forEach((now, r) => {
					TRACE_COLOURS.forEach((colour, c) => {
						const key = r * TRACE_COLOURS.length + c;
						if (openD[key] === now[colour]) return;
						openD[key] = now[colour];
						set(r, c, 1, now[colour]);
					});
				});
			}
			const node = readout?.current;
			if (node && reading && instrument) {
				const heard = reading();
				const text = heard ? hearingText(instrument, heard) : HEARING_NOTHING;
				if (text !== node.textContent && throttle(performance.now())) {
					node.textContent = text;
				}
			}
			frame = requestAnimationFrame(move);
		};
		frame = requestAnimationFrame(move);
		return () => cancelAnimationFrame(frame);
	}, [
		layout,
		rows,
		running,
		origin,
		tempo,
		now,
		outputLatency,
		progress,
		reading,
		tolerance,
		instrument,
		readout,
	]);
	return (
		<svg
			class="song-overlay"
			viewBox={`0 0 ${layout.width} ${layout.height}`}
			aria-hidden="true"
		>
			<path class="lane-graded" d={lanePath(layout, segments, true)} />
			<path class="lane-ungraded" d={lanePath(layout, segments, false)} />
			{tolerance !== undefined && (
				<path class="lane-guides" d={guidePath(layout, tolerance)} />
			)}
			{rows.map((_, r) =>
				TRACE_COLOURS.map((colour, c) =>
					[0, 1].map((open) => {
						const index = fillIndex(r, c, open);
						return (
							<path
								key={index}
								class={`fill-${colour}`}
								ref={(el) => {
									paths.current[index] = el;
								}}
							/>
						);
					}),
				),
			)}
			<line class="playhead" ref={line} visibility="hidden" />
		</svg>
	);
}
