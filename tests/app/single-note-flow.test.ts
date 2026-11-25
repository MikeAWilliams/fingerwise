import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { PLAY_WHOLE_VALUE } from "../../src/app/judge-text";
import {
	createSingleNoteFlow,
	type SingleNoteState,
} from "../../src/app/single-note-flow";
import type { ListenResult, PitchReading } from "../../src/audio/listener";
import type { Reading, ToneEvent, ToneOutcome } from "../../src/core/judge";
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
			message: null,
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
			message: null,
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

describe("createSingleNoteFlow listening (F16-S03)", () => {
	const RUNNING: ListenResult = { status: "running" };

	class FakeListener {
		starts = 0;
		stops = 0;
		onReading: ((r: PitchReading) => void) | null = null;
		auto: ListenResult | null = RUNNING;
		pending: ((r: ListenResult) => void)[] = [];
		start(onReading: (r: PitchReading) => void): Promise<ListenResult> {
			this.starts++;
			this.onReading = onReading;
			if (this.auto) return Promise.resolve(this.auto);
			return new Promise((resolve) => this.pending.push(resolve));
		}
		stop() {
			this.stops++;
		}
	}

	/** A watch the test drives: events are pushed into it by hand. */
	function fakeWatch() {
		const resets: number[] = [];
		let next: ToneEvent | null = null;
		let current: { startMs: number; readings: Reading[] } | null = null;
		return {
			resets,
			emit(event: ToneEvent | null) {
				next = event;
			},
			setTone(t: { startMs: number; readings: Reading[] } | null) {
				current = t;
			},
			watch: {
				reset: (ms: number) => {
					resets.push(ms);
				},
				push: () => {
					const e = next;
					next = null;
					return e;
				},
				tone: () => current,
			},
		};
	}

	function setup(
		over: {
			count?: number;
			auto?: ListenResult | null;
			outcome?: ToneOutcome;
		} = {},
	) {
		const listener = new FakeListener();
		if (over.auto !== undefined) listener.auto = over.auto;
		const w = fakeWatch();
		const graded: { index: number; readings: readonly Reading[] }[] = [];
		let outcome: ToneOutcome = over.outcome ?? "passed";
		const flow = createSingleNoteFlow({
			count: over.count ?? 3,
			fingeringDelayMs: FINGERING,
			advanceDelayMs: ADVANCE,
			listen: {
				listener,
				watch: w.watch,
				grade: (index, readings) => {
					graded.push({ index, readings });
					return outcome;
				},
				now: () => Date.now(),
			},
			onChange: (s) => states.push(s),
		});
		return {
			flow,
			listener,
			w,
			graded,
			setOutcome: (o: ToneOutcome) => {
				outcome = o;
			},
			/** A tone starts, then ends with `readings`, as the watch would report. */
			start() {
				w.emit({ kind: "start", startMs: 0 });
				listener.onReading?.(reading());
			},
			end(readings: Reading[] = [reading()]) {
				w.emit({ kind: "end", readings });
				listener.onReading?.(reading());
			},
		};
	}

	const reading = (): Reading => ({
		time: 0,
		frequency: 440,
		clarity: 0.98,
		level: -30,
	});
	async function settle() {
		for (let k = 0; k < 5; k++) await Promise.resolve();
	}

	test("AC1: the current note listens from the moment it becomes current", async () => {
		vi.setSystemTime(1000);
		const t = setup();
		t.flow.start();
		await settle();
		expect(last()).toMatchObject({ index: 0, listening: "running" });
		expect(t.listener.starts).toBe(1);
		// The stream running starts the current note's listening.
		expect(t.w.resets).toEqual([1000]);
		vi.setSystemTime(2000);
		t.start();
		t.end();
		await settle();
		expect(last().index).toBe(1);
		expect(t.w.resets).toEqual([1000, 2000]);
		// The stream is opened once for the flow.
		expect(t.listener.starts).toBe(1);
	});

	test("AC4: a passed tone moves to the next note", async () => {
		const t = setup({ outcome: "passed" });
		t.flow.start();
		await settle();
		t.start();
		t.end();
		expect(last()).toMatchObject({ index: 1, fingering: false, message: null });
		expect(t.graded).toHaveLength(1);
		expect(t.graded[0]?.index).toBe(0);
	});

	test("AC5: a right tone that was too short asks for the whole value, until the next tone starts", async () => {
		const t = setup({ outcome: "too-short" });
		t.flow.start();
		await settle();
		t.start();
		t.end();
		expect(last()).toMatchObject({
			index: 0,
			fingering: false,
			message: PLAY_WHOLE_VALUE,
		});
		// The note keeps listening, and the message stays through time.
		vi.advanceTimersByTime(1000);
		expect(last().message).toBe(PLAY_WHOLE_VALUE);
		t.start();
		expect(last().message).toBeNull();
	});

	test("AC6: a wrong tone shows the fingering, which stays; the note keeps listening", async () => {
		const t = setup({ outcome: "wrong" });
		t.flow.start();
		await settle();
		t.start();
		t.end();
		expect(last()).toMatchObject({ index: 0, fingering: true });
		// No advance delay: the fingering stays until the head moves on.
		vi.advanceTimersByTime(FINGERING + ADVANCE * 5);
		expect(last()).toMatchObject({ index: 0, fingering: true });
		t.setOutcome("passed");
		t.start();
		t.end();
		expect(last()).toMatchObject({ index: 1, fingering: false });
	});

	test("AC7: the fingering shows after its delay and the note keeps listening; the advance delay plays no part", async () => {
		const t = setup();
		t.flow.start();
		await settle();
		vi.advanceTimersByTime(FINGERING - 1);
		expect(last().fingering).toBe(false);
		vi.advanceTimersByTime(1);
		expect(last()).toMatchObject({ index: 0, fingering: true });
		vi.advanceTimersByTime(ADVANCE * 10);
		expect(last()).toMatchObject({ index: 0, fingering: true });
		t.start();
		t.end();
		expect(last().index).toBe(1);
	});

	test("AC8: taps work as without the microphone", async () => {
		const t = setup();
		t.flow.start();
		await settle();
		t.flow.step();
		expect(last()).toMatchObject({ index: 0, fingering: true });
		vi.advanceTimersByTime(ADVANCE * 4);
		expect(last()).toMatchObject({ index: 0, fingering: true });
		t.flow.step();
		expect(last()).toMatchObject({ index: 1, fingering: false });
	});

	test("every end, whatever the outcome, leaves the trace to clear (tone() is the watch's)", async () => {
		const t = setup();
		t.flow.start();
		await settle();
		t.w.setTone({ startMs: 5, readings: [reading()] });
		expect(t.flow.tone()?.startMs).toBe(5);
		t.w.setTone(null);
		expect(t.flow.tone()).toBeNull();
	});

	test("AC9: after a passed note the next note starts a fresh watch, so a held pitch needs a stop", async () => {
		const t = setup();
		t.flow.start();
		await settle();
		t.start();
		t.end();
		expect(t.w.resets).toHaveLength(2);
	});

	test("the last note passed ends the song", async () => {
		const t = setup({ count: 1 });
		t.flow.start();
		await settle();
		t.start();
		t.end();
		expect(last()).toMatchObject({ ended: true });
		// Readings after the end are ignored.
		t.start();
		t.end();
		expect(last().ended).toBe(true);
		expect(t.graded).toHaveLength(1);
	});

	test("AC11: while opening, the S02 timers apply, and the note listens once it runs", async () => {
		const t = setup({ auto: null });
		t.flow.start();
		await settle();
		expect(last().listening).toBe("opening");
		vi.advanceTimersByTime(FINGERING);
		expect(last().fingering).toBe(true);
		// The advance timer runs while the stream is not running.
		vi.advanceTimersByTime(ADVANCE - 1);
		expect(last().index).toBe(0);
		// The stream starts: the current note listens and the advance is dropped.
		t.listener.pending[0]?.({ status: "running" });
		await settle();
		expect(last()).toMatchObject({
			index: 0,
			fingering: true,
			listening: "running",
		});
		vi.advanceTimersByTime(ADVANCE * 5);
		expect(last().index).toBe(0);
		t.start();
		t.end();
		expect(last().index).toBe(1);
	});

	test("AC11: a locked stream behaves as with judging off, and is tried again at the next note", async () => {
		const t = setup({ auto: { status: "locked" } });
		t.flow.start();
		await settle();
		expect(last().listening).toBe("locked");
		vi.advanceTimersByTime(FINGERING + ADVANCE);
		expect(last()).toMatchObject({ index: 1, fingering: false });
		await settle();
		expect(t.listener.starts).toBe(2);
		// A tone is not judged while locked.
		t.start();
		t.end();
		expect(t.graded).toHaveLength(0);
	});

	test("AC11: an unavailable stream behaves as with judging off for the rest of the flow", async () => {
		const t = setup({ auto: { status: "unavailable", reason: "denied" } });
		t.flow.start();
		await settle();
		expect(last().listening).toBe("unavailable");
		vi.advanceTimersByTime(FINGERING + ADVANCE);
		expect(last().index).toBe(1);
		await settle();
		expect(t.listener.starts).toBe(1);
		expect(last().listening).toBe("unavailable");
		t.start();
		t.end();
		expect(t.graded).toHaveLength(0);
		expect(t.flow.tone()).toBeNull();
	});

	test("stop releases the microphone and a late result does nothing", async () => {
		const t = setup({ auto: null });
		t.flow.start();
		await settle();
		t.flow.stop();
		expect(t.listener.stops).toBe(1);
		const count = states.length;
		t.listener.pending[0]?.({ status: "running" });
		await settle();
		expect(states).toHaveLength(count);
	});

	test("a throwing watch or grade leaves the note to its timers and taps", async () => {
		const t = setup();
		t.flow.start();
		await settle();
		t.w.watch.push = () => {
			throw new Error("boom");
		};
		t.listener.onReading?.(reading());
		expect(last().index).toBe(0);
		t.flow.step();
		expect(last()).toMatchObject({ fingering: true });
	});
});
