import type { RefObject } from "preact";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import type { Spot } from "../core/analysis";
import type { Progress, Timeline } from "../core/coverage";
import type { Pitch } from "../core/pitch";
import type { Bar, Meter } from "../core/song";
import {
	beatRangeOnRows,
	colourSong,
	drawSongLines,
	drawStaff,
	ROW_HEIGHT,
	type SongLayout,
	type StaffOptions,
} from "../render/staff";
import { spotAnchorId } from "./analysis-text";
import { createScroller, followTop, type Scroller } from "./follow";
import { laneRows, laneSegments } from "./lane";
import { type OverrunTrace, overrunLane } from "./overrun";
import {
	type FillSource,
	type PlayheadSource,
	SongOverlay,
} from "./SongOverlay";

interface StaffProps {
	pitch: Pitch;
	options: StaffOptions;
	/** The note's length in quarter-note beats; a whole note when absent. */
	beats?: number;
}

export function Staff({ pitch, options, beats }: StaffProps) {
	const ref = useRef<HTMLDivElement>(null);
	useEffect(() => {
		if (ref.current) drawStaff(ref.current, pitch, options, beats);
	}, [pitch, options, beats]);
	return <div class="staff" ref={ref} />;
}

const NO_SPOTS: readonly Spot[] = [];

/** A timed song's lines of music, and the note to play in them. */
export interface SongView {
	lines: readonly Bar[][];
	meter: Meter;
	barsPerLine: number;
	/** The index in the song of the note to play; -1 during the count-in. */
	current: number;
	/** The count-in beat clicking, from 0; null when none is. */
	countBeat: number | null;
	/** The song's notes, rests and joins in ms, for the lane under the staff. */
	timeline: Timeline;
	/** Quarter notes per minute the timeline is at. */
	tempo: number;
	/** What the playhead follows. */
	playhead: PlayheadSource;
	/** What the live fill follows; null without judging. */
	fill: FillSource | null;
	/** What was played after the last note, for its own lane under the last line; null for none. */
	overrun?: OverrunTrace | null;
	/** Scoring after the song: the lanes, trace and marks stay hidden until `scored` arrives. */
	after: boolean;
	/** The finished scoring to draw at once; null unless the lanes are shown after the song. */
	scored: Progress | null;
	/** The practice spots to shade, in the summary only; none when absent. */
	spots?: readonly Spot[];
}

/**
 * Every line of the song, one under another, with the lane under each. The
 * staff is drawn once per song (and again only when the song, bars per line or
 * the instrument's range change); a change of note recolours what is drawn, and
 * a resize scales the SVG by CSS without redrawing it.
 */
export function SongStaff({
	view,
	options,
	readout,
	phase,
	header,
	bar,
}: {
	view: SongView;
	options: StaffOptions;
	/** The card's timed phase: ready sends the page back to the first line. */
	phase?: "ready" | "playing" | "summary";
	/** The sticky header and the song's bar, whose heights the page keeps clear. */
	header?: RefObject<HTMLElement | null>;
	bar?: RefObject<HTMLElement | null>;
	/** Where the live readout's text goes, when it is on show. */
	readout?: RefObject<HTMLElement | null>;
}) {
	const box = useRef<HTMLDivElement>(null);
	const music = useRef<HTMLDivElement>(null);
	const [layout, setLayout] = useState<SongLayout | null>(null);
	const {
		lines,
		meter,
		barsPerLine,
		current,
		countBeat,
		timeline,
		tempo,
		playhead,
		fill,
		after,
		scored,
		overrun = null,
		spots = NO_SPOTS,
	} = view;
	// What the effects read when they run, without making them redraw.
	const now = useRef({ current, countBeat });
	now.current = { current, countBeat };
	useEffect(() => {
		if (!music.current) return;
		const drawn = drawSongLines(
			music.current,
			lines,
			options,
			meter,
			barsPerLine,
		);
		// The card grows with the song: the box takes the whole drawing's proportions.
		if (box.current) {
			box.current.style.aspectRatio = `${drawn.width} / ${drawn.height}`;
			// One row's proportions, for the CSS cap on the staff's width.
			box.current.style.setProperty(
				"--row-aspect",
				String(drawn.width / ROW_HEIGHT),
			);
		}
		colourSong(drawn, now.current.current, now.current.countBeat);
		setLayout(drawn);
	}, [lines, options, meter, barsPerLine]);
	useEffect(() => {
		if (layout) colourSong(layout, current, countBeat);
	}, [layout, current, countBeat]);
	// Following the song: one scroller over the window, and the last row it was sent to.
	const scroller = useRef<Scroller | null>(null);
	const lastRow = useRef<number | null>(null);
	const layoutRef = useRef(layout);
	layoutRef.current = layout;
	const running = useRef(playhead.running);
	running.current = playhead.running;
	useEffect(() => {
		const made = createScroller({
			scrollY: () => window.scrollY,
			scrollTo: (top) => window.scrollTo({ top, left: 0, behavior: "instant" }),
			now: () => performance.now(),
			frame: (callback) => requestAnimationFrame(callback),
			cancelFrame: (handle) => cancelAnimationFrame(handle),
		});
		scroller.current = made;
		return () => {
			made.dispose();
			scroller.current = null;
		};
	}, []);
	/** Send the page to `row`, measured afresh from the layout. */
	const follow = (row: number, smooth: boolean) => {
		const drawn = layoutRef.current;
		const el = box.current;
		const place = drawn?.rows[row];
		if (!drawn || !el || !place || !scroller.current) return;
		const rowTop =
			el.getBoundingClientRect().top +
			window.scrollY +
			(place.top * el.clientWidth) / drawn.width;
		const root = document.documentElement;
		const top = followTop({
			rowTop,
			viewport: window.innerHeight,
			header: header?.current?.offsetHeight ?? 0,
			bar: bar?.current?.offsetHeight ?? 0,
			maxScroll: root.scrollHeight - window.innerHeight,
		});
		const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
		scroller.current.to(top, smooth && !reduced.matches);
	};
	const onRow = (row: number) => {
		lastRow.current = row;
		follow(row, true);
	};
	const followRef = useRef(follow);
	followRef.current = follow;
	useEffect(() => {
		const onResize = () => {
			if (running.current && lastRow.current !== null)
				followRef.current(lastRow.current, false);
		};
		window.addEventListener("resize", onResize);
		return () => window.removeEventListener("resize", onResize);
	}, []);
	// The first line at the top, with the start prompt, whenever the song is ready to start.
	useEffect(() => {
		if (phase !== "ready") return;
		lastRow.current = null;
		scroller.current?.to(0, false);
	}, [phase]);
	const segments = useMemo(
		() => (layout ? laneSegments(timeline, lines, layout, tempo) : []),
		[layout, timeline, lines, tempo],
	);
	const rows = useMemo(
		() => (layout ? laneRows(lines, layout) : []),
		[layout, lines],
	);
	const tolerance = fill?.tolerance;
	// The overrun's own short lane under the last line.
	const lane = useMemo(() => {
		const lastRow = rows[rows.length - 1];
		if (!overrun || !layout || !lastRow || tolerance === undefined) return null;
		return overrunLane(lastRow, layout.height, overrun, tempo, tolerance);
	}, [overrun, layout, rows, tempo, tolerance]);
	const extraHeight = lane?.extraHeight ?? 0;
	// Room for it: the box grows with the lane, the music above stays where it is.
	useEffect(() => {
		if (!layout || !box.current) return;
		box.current.style.aspectRatio = `${layout.width} / ${layout.height + extraHeight}`;
	}, [layout, extraHeight]);
	return (
		<div class="song-staff" ref={box}>
			<div class="song-staff-music" ref={music} />
			{layout && (
				<SongOverlay
					layout={layout}
					segments={segments}
					rows={rows}
					tempo={tempo}
					playhead={playhead}
					fill={fill}
					after={after}
					scored={scored}
					readout={readout}
					overrun={lane}
					onRow={onRow}
					spots={spots}
				/>
			)}
			{layout &&
				spots.map((spot, i) => {
					const first = beatRangeOnRows(
						layout.rows,
						spot.startBeat,
						spot.endBeat,
					)[0];
					const row = first && layout.rows[first.row];
					if (!row) return null;
					return (
						<div
							key={spot.firstBar}
							id={spotAnchorId(i)}
							class="practice-spot-anchor"
							style={{ top: `${(row.top / layout.height) * 100}%` }}
						/>
					);
				})}
		</div>
	);
}
