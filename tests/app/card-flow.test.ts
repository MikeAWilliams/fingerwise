import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { type CardState, createCardFlow } from "../../src/app/card-flow";
import type { Pitch } from "../../src/core/pitch";

const POOL = [60, 62, 64, 65] as Pitch[];
const DELAY = 3000;

let states: CardState[];

function setup() {
	let i = 0;
	// Cycles 0, 1/3, 2/3: with a previous pitch removed, three candidates.
	const random = () => (i++ % 3) / 3;
	const flow = createCardFlow({
		pool: POOL,
		random,
		delayMs: DELAY,
		onChange: (s) => states.push(s),
	});
	flow.start();
	return flow;
}

const last = () => states[states.length - 1] as CardState;

beforeEach(() => {
	vi.useFakeTimers();
	states = [];
});

afterEach(() => {
	vi.useRealTimers();
});

describe("createCardFlow", () => {
	test("start shows an unrevealed card and reveals after the delay", () => {
		setup();
		expect(last().revealed).toBe(false);
		vi.advanceTimersByTime(DELAY - 1);
		expect(last().revealed).toBe(false);
		vi.advanceTimersByTime(1);
		expect(last().revealed).toBe(true);
	});

	test("AC6: step before the delay reveals at once and the timer stops", () => {
		const flow = setup();
		const first = last().pitch;
		vi.advanceTimersByTime(1000);
		flow.step();
		expect(last()).toEqual({ pitch: first, revealed: true });
		const count = states.length;
		vi.advanceTimersByTime(DELAY * 2);
		expect(states).toHaveLength(count);
	});

	test("AC7: step when revealed shows a new unrevealed card with a fresh timer", () => {
		const flow = setup();
		const first = last().pitch;
		vi.advanceTimersByTime(DELAY);
		flow.step();
		expect(last().revealed).toBe(false);
		expect(last().pitch).not.toBe(first);
		vi.advanceTimersByTime(DELAY - 1);
		expect(last().revealed).toBe(false);
		vi.advanceTimersByTime(1);
		expect(last().revealed).toBe(true);
	});

	test("AC7: the timer of a card revealed early does not shorten the next card's delay", () => {
		const flow = setup();
		vi.advanceTimersByTime(2000);
		flow.step();
		flow.step();
		vi.advanceTimersByTime(DELAY - 1);
		expect(last().revealed).toBe(false);
		vi.advanceTimersByTime(1);
		expect(last().revealed).toBe(true);
	});

	test("AC8: one step from unrevealed only reveals", () => {
		const flow = setup();
		const first = last().pitch;
		const count = states.length;
		flow.step();
		expect(states).toHaveLength(count + 1);
		expect(last()).toEqual({ pitch: first, revealed: true });
	});

	test("AC8: one step from revealed only advances", () => {
		const flow = setup();
		const first = last().pitch;
		flow.step();
		const count = states.length;
		flow.step();
		expect(states).toHaveLength(count + 1);
		expect(last().revealed).toBe(false);
		expect(last().pitch).not.toBe(first);
	});

	test("stop prevents a pending reveal", () => {
		const flow = setup();
		const count = states.length;
		flow.stop();
		vi.advanceTimersByTime(DELAY * 2);
		expect(states).toHaveLength(count);
	});
});
