import { describe, expect, test } from "vitest";
import type { PlaybackState } from "../../src/app/playback-flow";
import { playbackView } from "../../src/app/playback-view";
import type { SingleNoteState } from "../../src/app/single-note-flow";
import { singleNoteView } from "../../src/app/single-note-view";
import { buildTimeline } from "../../src/core/coverage";
import type { Pitch } from "../../src/core/pitch";
import { createSong, DEFAULT_METER, songLines } from "../../src/core/song";

const song = createSong(
	[
		{ pitch: 60 as Pitch, start: 0, beats: 1 },
		{ pitch: 62 as Pitch, start: 2, beats: 1 },
	],
	{ tempo: 90, meter: DEFAULT_METER },
);
const base = {
	lines: songLines(song, 2),
	meter: song.meter,
	barsPerLine: 2,
	timeline: buildTimeline(song, 90),
	tempo: 90,
};
const state = (over: Partial<SingleNoteState> = {}): SingleNoteState => ({
	index: 1,
	fingering: false,
	ended: false,
	listening: "off",
	...over,
});

describe("singleNoteView (F16-S02)", () => {
	test("AC1, AC2: the current note, the fixed head on it and a strip", () => {
		const view = singleNoteView(base, state());
		expect(view).toMatchObject({
			current: 1,
			head: 1,
			strip: true,
			countBeat: null,
			lanes: true,
			after: false,
			fill: null,
			scored: null,
			spots: [],
			overrun: null,
		});
		expect(view.playhead.running).toBe(false);
	});

	test("AC3: it keeps the song's lines, meter, timeline and tempo", () => {
		const view = singleNoteView(base, state());
		expect(view).toMatchObject(base);
	});

	test("AC8: at the end no note is black and there is no head", () => {
		const view = singleNoteView(base, state({ ended: true }));
		expect(view.current).toBe(-1);
		expect(view.head).toBeNull();
		expect(view.strip).toBe(true);
	});

	test("the fingering is filled in by the card, not here", () => {
		expect(
			singleNoteView(base, state({ fingering: true })).fingering,
		).toBeNull();
	});

	test("AC3: playback and the Tempo view have no strip or head", () => {
		const playing: PlaybackState = { index: 0, origin: 1 } as PlaybackState;
		const view = playbackView(base, playing, {
			now: () => 0,
			outputLatency: () => null,
		});
		expect(view.strip).toBeUndefined();
		expect(view.head).toBeUndefined();
	});
});
