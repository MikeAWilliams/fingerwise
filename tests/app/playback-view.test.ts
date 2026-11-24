import { describe, expect, test } from "vitest";
import { PLAYING_SONG } from "../../src/app/judge-text";
import type { PlaybackState } from "../../src/app/playback-flow";
import { playbackView } from "../../src/app/playback-view";
import type { Timeline } from "../../src/core/coverage";
import { DEFAULT_METER } from "../../src/core/song";

const base = {
	lines: [],
	meter: DEFAULT_METER,
	barsPerLine: 2,
	timeline: { notes: [], joins: [] } as unknown as Timeline,
	tempo: 100,
};
const clocks = { now: () => 5, outputLatency: () => 0.02 };

describe("playbackView (F13-S03)", () => {
	test("the sounding note, the playhead from the origin and no lanes (AC2, AC3, AC4)", () => {
		const state: PlaybackState = { phase: "playing", index: 3, origin: 12.5 };
		const view = playbackView(base, state, clocks);
		expect(view).toMatchObject({
			lines: base.lines,
			meter: DEFAULT_METER,
			barsPerLine: 2,
			timeline: base.timeline,
			tempo: 100,
			current: 3,
			countBeat: null,
			lanes: false,
			fill: null,
			after: false,
			scored: null,
			spots: [],
			overrun: null,
		});
		expect(view.playhead.running).toBe(true);
		expect(view.playhead.origin).toBe(12.5);
		expect(view.playhead.now()).toBe(5);
		expect(view.playhead.outputLatency()).toBe(0.02);
	});

	test("the count-in lights the first note and a rest none (AC2)", () => {
		const count: PlaybackState = { phase: "count-in", index: 0, origin: 3 };
		expect(playbackView(base, count, clocks).current).toBe(0);
		const rest: PlaybackState = { phase: "playing", index: -1, origin: 3 };
		expect(playbackView(base, rest, clocks).current).toBe(-1);
	});

	test("the quiet line is Playing the song (AC6)", () => {
		expect(PLAYING_SONG).toBe("Playing the song");
	});
});
