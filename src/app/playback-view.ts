import type { Timeline } from "../core/coverage";
import type { Bar, Meter } from "../core/song";
import type { PlaybackState } from "./playback-flow";
import type { SongView } from "./Staff";

/** What a playback view takes from the song, which does not change while it plays. */
export interface PlaybackBase {
	lines: readonly Bar[][];
	meter: Meter;
	barsPerLine: number;
	timeline: Timeline;
	/** Quarter notes per minute the timeline is at. */
	tempo: number;
}

/**
 * The song's lines as the player is shown them while it is played: the
 * sounding note black, the playhead moving from the flow's origin, and nothing
 * of scoring (no lanes, fill, marks, spots or overrun).
 */
export function playbackView(
	base: PlaybackBase,
	state: PlaybackState,
	clocks: { now(): number; outputLatency(): number | null },
): SongView {
	return {
		...base,
		current: state.index,
		countBeat: null,
		playhead: { running: true, origin: state.origin, ...clocks },
		lanes: false,
		fill: null,
		after: false,
		scored: null,
		spots: [],
		overrun: null,
	};
}
