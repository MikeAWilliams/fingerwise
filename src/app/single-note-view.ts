import type { PlaybackBase } from "./playback-view";
import type { SongView } from "./Staff";
import type { SingleNoteState } from "./single-note-flow";

/**
 * The song's lines as Single note shows them: the current note black, the
 * play head fixed at its start with no clock and a fingering strip under every
 * lane. Lanes are on; nothing
 * is scored, so there is no fill, no spots and no overrun.
 */
export function singleNoteView(
	base: PlaybackBase,
	state: SingleNoteState,
): SongView {
	return {
		...base,
		current: state.ended ? -1 : state.index,
		countBeat: null,
		head: state.ended ? null : state.index,
		strip: true,
		// The fingering's text needs the instrument and font, so `Card` fills it in
		// from the note's pitch while `state.fingering` is on.
		fingering: null,
		playhead: {
			running: false,
			origin: null,
			now: () => 0,
			outputLatency: () => null,
		},
		lanes: true,
		fill: null,
		after: false,
		scored: null,
		spots: [],
		overrun: null,
	};
}
