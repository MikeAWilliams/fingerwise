import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { REVEAL_DELAY_MS, startRevealTimer } from "../../src/app/reveal";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

test("the delay is 3 seconds", () => {
	expect(REVEAL_DELAY_MS).toBe(3000);
});

test("reveals once, only when the delay has elapsed", () => {
	const onReveal = vi.fn();
	startRevealTimer(REVEAL_DELAY_MS, onReveal);
	vi.advanceTimersByTime(2999);
	expect(onReveal).not.toHaveBeenCalled();
	vi.advanceTimersByTime(1);
	expect(onReveal).toHaveBeenCalledTimes(1);
	vi.advanceTimersByTime(10_000);
	expect(onReveal).toHaveBeenCalledTimes(1);
});

test("cancelling before the delay prevents the reveal", () => {
	const onReveal = vi.fn();
	const cancel = startRevealTimer(REVEAL_DELAY_MS, onReveal);
	vi.advanceTimersByTime(1000);
	cancel();
	vi.advanceTimersByTime(10_000);
	expect(onReveal).not.toHaveBeenCalled();
});
