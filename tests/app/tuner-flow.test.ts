import { describe, expect, test } from "vitest";
import {
	createTunerFlow,
	type TunerListen,
	type TunerState,
} from "../../src/app/tuner-flow";
import type { ListenResult, PitchReading } from "../../src/audio/listener";
import {
	createToneWatch,
	DEFAULT_THRESHOLDS,
	type Reading,
} from "../../src/core/judge";
import type { Pitch } from "../../src/core/pitch";

type Deferred = (result: ListenResult) => void;

const STEP = 16.7;
const C4 = 60 as Pitch;

/** A real watch with no hold-off, and fakes that show how many readings the note was made from. */
function tunerRules(): Pick<TunerListen, "watch" | "follow" | "hold" | "now"> {
	return {
		watch: createToneWatch({ ...DEFAULT_THRESHOLDS, holdOffMs: 0 }),
		now: () => 0,
		follow: (readings) => ({ pitch: C4, cents: readings.length }),
		hold: () => ({ pitch: C4, cents: -99 }),
	};
}

function setup(first: ListenResult | "pending" = { status: "running" }) {
	const states: TunerState[] = [];
	const calls: string[] = [];
	let feed: (reading: PitchReading) => void = () => {};
	const pending: Deferred[] = [];
	let next: ListenResult | "pending" = first;
	const listener = {
		start(onReading: (reading: PitchReading) => void) {
			feed = onReading;
			calls.push("start");
			if (next !== "pending") return Promise.resolve(next);
			return new Promise<ListenResult>((resolve) => pending.push(resolve));
		},
		stop() {
			calls.push("stop");
		},
	};
	const flow = createTunerFlow({
		listen: { listener, ...tunerRules() },
		onChange: (s) => states.push(s),
	});
	return {
		feed: (r: Reading) => feed(r as PitchReading),
		flow,
		states,
		calls,
		pending,
		setNext(r: ListenResult | "pending") {
			next = r;
		},
		last: () => states[states.length - 1] as TunerState,
	};
}

const settled = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("createTunerFlow (F19-S01)", () => {
	test("AC4: start shows opening, then running, with no note", async () => {
		const t = setup();
		t.flow.start();
		expect(t.last()).toEqual({ listening: "opening", note: null, held: false });
		await settled();
		expect(t.last()).toEqual({ listening: "running", note: null, held: false });
	});

	test("AC5: locked, then a step opens the stream", async () => {
		const t = setup({ status: "locked" });
		t.flow.start();
		await settled();
		expect(t.last().listening).toBe("locked");
		t.setNext({ status: "running" });
		t.flow.step();
		await settled();
		expect(t.last().listening).toBe("running");
		expect(t.calls).toEqual(["start", "start"]);
	});

	test("AC5: unavailable stays so, and a step does nothing", async () => {
		const t = setup({ status: "unavailable", reason: "denied" });
		t.flow.start();
		await settled();
		expect(t.last().listening).toBe("unavailable");
		t.flow.step();
		await settled();
		expect(t.last().listening).toBe("unavailable");
		expect(t.calls).toEqual(["start"]);
	});

	test("a step while running does nothing", async () => {
		const t = setup();
		t.flow.start();
		await settled();
		const count = t.states.length;
		t.flow.step();
		await settled();
		expect(t.states.length).toBe(count);
		expect(t.calls).toEqual(["start"]);
	});

	test("AC6: stop releases the listener", async () => {
		const t = setup();
		t.flow.start();
		await settled();
		t.flow.stop();
		expect(t.calls).toEqual(["start", "stop"]);
	});

	test("AC6: a result after stop is ignored", async () => {
		const t = setup("pending");
		t.flow.start();
		t.flow.stop();
		const count = t.states.length;
		t.pending[0]?.({ status: "running" });
		await settled();
		expect(t.states.length).toBe(count);
	});

	test("AC7: the listener sees only start and stop", async () => {
		const t = setup({ status: "locked" });
		t.flow.start();
		await settled();
		t.flow.step();
		await settled();
		t.flow.stop();
		expect(t.calls.every((c) => c === "start" || c === "stop")).toBe(true);
	});

	test("a listener that throws or rejects is unavailable", async () => {
		const states: TunerState[] = [];
		const flow = createTunerFlow({
			listen: {
				listener: {
					start: () => {
						throw new Error("no");
					},
					stop() {},
				},
				...tunerRules(),
			},
			onChange: (s) => states.push(s),
		});
		flow.start();
		await settled();
		expect(states[states.length - 1]?.listening).toBe("unavailable");
	});

	function reading(time: number, hz: number | null): Reading {
		return { time, frequency: hz, clarity: 0.98, level: -30 };
	}

	/** Silence, then `count` sounding frames from `from`. */
	function feedSilence(
		t: ReturnType<typeof setup>,
		from: number,
		count: number,
	) {
		for (let i = 0; i < count; i++) t.feed(reading(from + i * STEP, null));
		return from + count * STEP;
	}
	function feedTone(t: ReturnType<typeof setup>, from: number, count: number) {
		for (let i = 0; i < count; i++) t.feed(reading(from + i * STEP, 440));
		return from + count * STEP;
	}

	test("AC1: nothing is shown before a tone starts", async () => {
		const t = setup();
		t.flow.start();
		await settled();
		const count = t.states.length;
		let time = feedSilence(t, 0, 5);
		// 150 ms of sound is shorter than the settle time.
		time = feedTone(t, time, 9);
		expect(t.states.length).toBe(count);
		expect(t.last().note).toBeNull();
	});

	test("AC7: a start shows the note, from the tone's readings", async () => {
		const t = setup();
		t.flow.start();
		await settled();
		let time = feedSilence(t, 0, 5);
		time = feedTone(t, time, 13);
		expect(t.last().note).not.toBeNull();
		expect(t.last().held).toBe(false);
	});

	test("AC3: live updates come no more often than every 100 ms", async () => {
		const t = setup();
		t.flow.start();
		await settled();
		let time = feedSilence(t, 0, 5);
		time = feedTone(t, time, 13);
		const before = t.states.length;
		// A second of sound: at most 10 updates.
		time = feedTone(t, time, 60);
		const updates = t.states.length - before;
		expect(updates).toBeGreaterThan(5);
		expect(updates).toBeLessThanOrEqual(10);
		expect(t.last().held).toBe(false);
	});

	test("AC5: an end shows the hold at once and keeps it through silence", async () => {
		const t = setup();
		t.flow.start();
		await settled();
		let time = feedSilence(t, 0, 5);
		time = feedTone(t, time, 20);
		time = feedSilence(t, time, 15);
		expect(t.last()).toEqual({
			listening: "running",
			note: { pitch: C4, cents: -99 },
			held: true,
		});
		const count = t.states.length;
		time = feedSilence(t, time, 30);
		expect(t.states.length).toBe(count);
	});

	test("AC7: a new tone after a hold follows again", async () => {
		const t = setup();
		t.flow.start();
		await settled();
		let time = feedSilence(t, 0, 5);
		time = feedTone(t, time, 20);
		time = feedSilence(t, time, 15);
		expect(t.last().held).toBe(true);
		time = feedTone(t, time, 13);
		expect(t.last().held).toBe(false);
		expect(t.last().note?.cents).not.toBe(-99);
	});

	test("readings after stop change nothing", async () => {
		const t = setup();
		t.flow.start();
		await settled();
		t.flow.stop();
		const count = t.states.length;
		let time = feedSilence(t, 0, 5);
		time = feedTone(t, time, 20);
		expect(t.states.length).toBe(count);
	});
});
