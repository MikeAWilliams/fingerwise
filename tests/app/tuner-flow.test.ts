import { describe, expect, test } from "vitest";
import { createTunerFlow, type TunerState } from "../../src/app/tuner-flow";
import type { ListenResult, PitchReading } from "../../src/audio/listener";

type Deferred = (result: ListenResult) => void;

function setup(first: ListenResult | "pending" = { status: "running" }) {
	const states: TunerState[] = [];
	const calls: string[] = [];
	const pending: Deferred[] = [];
	let next: ListenResult | "pending" = first;
	const listener = {
		start(_onReading: (reading: PitchReading) => void) {
			calls.push("start");
			if (next !== "pending") return Promise.resolve(next);
			return new Promise<ListenResult>((resolve) => pending.push(resolve));
		},
		stop() {
			calls.push("stop");
		},
	};
	const flow = createTunerFlow({
		listen: { listener, now: () => 0 },
		onChange: (s) => states.push(s),
	});
	return {
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
				now: () => 0,
			},
			onChange: (s) => states.push(s),
		});
		flow.start();
		await settled();
		expect(states[states.length - 1]?.listening).toBe("unavailable");
	});
});
