import { useEffect, useRef } from "preact/hooks";
import type { Pitch } from "../core/pitch";
import type { Bar, Meter } from "../core/song";
import { drawSongLines, drawStaff, type StaffOptions } from "../render/staff";

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
	/** The index in the song of the note to play. */
	current: number;
}

/** The line holding the note to play and the line after it. */
export function SongStaff({
	view,
	options,
}: {
	view: SongView;
	options: StaffOptions;
}) {
	const ref = useRef<HTMLDivElement>(null);
	const { lines, meter, barsPerLine, current } = view;
	useEffect(() => {
		if (ref.current)
			drawSongLines(ref.current, lines, current, options, meter, barsPerLine);
	}, [lines, current, options, meter, barsPerLine]);
	return <div class="song-staff" ref={ref} />;
}
