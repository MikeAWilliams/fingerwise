import type { RefObject } from "preact";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import type { Timeline } from "../core/coverage";
import type { Pitch } from "../core/pitch";
import type { Bar, Meter } from "../core/song";
import {
	colourSong,
	drawSongLines,
	drawStaff,
	type SongLayout,
	type StaffOptions,
} from "../render/staff";
import { laneRows, laneSegments } from "./lane";
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
}: {
	view: SongView;
	options: StaffOptions;
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
		if (box.current)
			box.current.style.aspectRatio = `${drawn.width} / ${drawn.height}`;
		colourSong(drawn, now.current.current, now.current.countBeat);
		setLayout(drawn);
	}, [lines, options, meter, barsPerLine]);
	useEffect(() => {
		if (layout) colourSong(layout, current, countBeat);
	}, [layout, current, countBeat]);
	const segments = useMemo(
		() => (layout ? laneSegments(timeline, lines, layout, tempo) : []),
		[layout, timeline, lines, tempo],
	);
	const rows = useMemo(
		() => (layout ? laneRows(lines, layout) : []),
		[layout, lines],
	);
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
					readout={readout}
				/>
			)}
		</div>
	);
}
