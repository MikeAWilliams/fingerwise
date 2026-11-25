import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
	createSingleNoteFlow,
	type SingleNoteState,
} from "../../src/app/single-note-flow";
import type { Pitch } from "../../src/core/pitch";
import { createSong, DEFAULT_METER } from "../../src/core/song";

const FINGERING = 3000;
const ADVANCE = 2000;

let states: SingleNoteState[];
const last = () => states[states.length - 1] as SingleNoteState;

function make(count = 3) {
	const flow = createSingleNoteFlow({
		count,
		fingeringDelayMs: FINGERING,
		advanceDelayMs: ADVANCE,
		onChange: (s) => states.push(s),
	});
	flow.start();
	return flow;
}

beforeEach(() => {
	vi.useFakeTimers();
	states = [];
});

afterEach(() => {
	vi.useRealTimers();
});

describe("createSingleNoteFlow (F16-S02)", () => {
	test("AC1: starts on the first note with no fingering and listening off", () => {
		make();
		expect(last()).toEqual({
			index: 0,
			fingering: false,
			ended: false,
			listening: "off",
		});
	});

	test("AC4: the fingering shows after its delay, then the next note after the advance delay", () => {
		make();
		vi.advanceTimersByTime(FINGERING - 1);
		expect(last().fingering).toBe(false);
		vi.advanceTimersByTime(1);
		expect(last()).toMatchObject({ index: 0, fingering: true });
		vi.advanceTimersByTime(ADVANCE - 1);
		expect(last()).toMatchObject({ index: 0, fingering: true });
		vi.advanceTimersByTime(1);
		expect(last()).toMatchObject({ index: 1, fingering: false });
	});

	test("AC4: the new note's fingering delay starts from zero", () => {
		make();
		vi.advanceTimersByTime(FINGERING + ADVANCE);
		expect(last().index).toBe(1);
		vi.advanceTimersByTime(FINGERING - 1);
		expect(last().fingering).toBe(false);
		vi.advanceTimersByTime(1);
		expect(last()).toMatchObject({ index: 1, fingering: true });
	});

	test("AC5: a tap with no fingering shows it at once and starts the advance delay", () => {
		const flow = make();
		vi.advanceTimersByTime(1000);
		flow.step();
		expect(last()).toMatchObject({ index: 0, fingering: true });
		// The fingering timer is gone: only the advance delay runs now.
		vi.advanceTimersByTime(ADVANCE - 1);
		expect(last()).toMatchObject({ index: 0, fingering: true });
		vi.advanceTimersByTime(1);
		expect(last()).toMatchObject({ index: 1, fingering: false });
	});

	test("AC5: a tap while the fingering shows moves on at once, and the old advance never fires", () => {
		const flow = make();
		vi.advanceTimersByTime(FINGERING);
		flow.step();
		expect(last()).toMatchObject({ index: 1, fingering: false });
		const count = states.length;
		vi.advanceTimersByTime(ADVANCE);
		// Nothing new until the new note's own fingering delay is out.
		expect(states).toHaveLength(count);
		vi.advanceTimersByTime(FINGERING - ADVANCE);
		expect(last()).toMatchObject({ index: 1, fingering: true });
	});

	test("one tap does one thing", () => {
		const flow = make();
		const count = states.length;
		flow.step();
		expect(states).toHaveLength(count + 1);
		flow.step();
		expect(states).toHaveLength(count + 2);
		expect(last()).toMatchObject({ index: 1, fingering: false });
	});

	test("AC8: after the last note the flow ends, with no timer left", () => {
		const flow = make(2);
		flow.step();
		flow.step();
		flow.step();
		flow.step();
		expect(last()).toMatchObject({ index: 1, ended: true, fingering: false });
		const count = states.length;
		vi.advanceTimersByTime((FINGERING + ADVANCE) * 3);
		expect(states).toHaveLength(count);
	});

	test("AC8: the advance delay can end it too", () => {
		make(1);
		vi.advanceTimersByTime(FINGERING + ADVANCE);
		expect(last()).toMatchObject({ index: 0, ended: true });
	});

	test("AC8: a tap after the end starts again from the first note", () => {
		const flow = make(2);
		vi.advanceTimersByTime((FINGERING + ADVANCE) * 2);
		expect(last().ended).toBe(true);
		flow.step();
		expect(last()).toEqual({
			index: 0,
			fingering: false,
			ended: false,
			listening: "off",
		});
		vi.advanceTimersByTime(FINGERING);
		expect(last()).toMatchObject({ index: 0, fingering: true });
	});

	test("stop cancels the pending timer", () => {
		const flow = make();
		flow.stop();
		const count = states.length;
		vi.advanceTimersByTime(FINGERING + ADVANCE);
		expect(states).toHaveLength(count);
	});

	test("a song with no notes shows nothing", () => {
		make(0);
		expect(states).toHaveLength(0);
	});

	test("AC6: rests are passed over and a tied note is one note", () => {
		// C, a rest, D tied into D, then E: notes 0, 1 and 2.
		const p = (n: number) => n as Pitch;
		const song = createSong(
			[
				{ pitch: p(60), start: 0, beats: 1 },
				{ pitch: p(62), start: 2, beats: 3 },
				{ pitch: p(64), start: 5, beats: 1 },
			],
			{ tempo: 60, meter: DEFAULT_METER },
		);
		expect(song.notes).toHaveLength(3);
		const flow = make(song.notes.length);
		flow.step();
		flow.step();
		expect(last()).toMatchObject({ index: 1 });
		flow.step();
		flow.step();
		expect(last()).toMatchObject({ index: 2 });
		flow.step();
		flow.step();
		expect(last()).toMatchObject({ ended: true });
	});
});
