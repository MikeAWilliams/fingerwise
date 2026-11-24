import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { createClockTimer } from "../../src/app/clock-timer";

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(0);
});

afterEach(() => {
	vi.useRealTimers();
});

const now = () => Date.now() / 1000;

describe("createClockTimer (F13-S02)", () => {
	test("fires at the time", () => {
		const timer = createClockTimer({ now });
		const fired = vi.fn();
		timer.at(2, fired);
		vi.advanceTimersByTime(1999);
		expect(fired).not.toHaveBeenCalled();
		vi.advanceTimersByTime(1);
		expect(fired).toHaveBeenCalledTimes(1);
	});

	test("re-arms while the clock lags the timer", () => {
		let clockNow = 0;
		const timer = createClockTimer({ now: () => clockNow });
		const fired = vi.fn();
		timer.at(1, fired);
		vi.advanceTimersByTime(10000);
		expect(fired).not.toHaveBeenCalled();
		clockNow = 0.999;
		vi.advanceTimersByTime(10000);
		expect(fired).not.toHaveBeenCalled();
		clockNow = 1;
		vi.advanceTimersByTime(10000);
		expect(fired).toHaveBeenCalledTimes(1);
	});

	test("a second at replaces the first", () => {
		const timer = createClockTimer({ now });
		const first = vi.fn();
		const second = vi.fn();
		timer.at(1, first);
		timer.at(2, second);
		vi.advanceTimersByTime(5000);
		expect(first).not.toHaveBeenCalled();
		expect(second).toHaveBeenCalledTimes(1);
	});

	test("an action may arm the next one", () => {
		const timer = createClockTimer({ now });
		const order: number[] = [];
		timer.at(1, () => {
			order.push(1);
			timer.at(2, () => order.push(2));
		});
		vi.advanceTimersByTime(5000);
		expect(order).toEqual([1, 2]);
	});

	test("cancel drops the waiting action, and cancelling twice is harmless", () => {
		const timer = createClockTimer({ now });
		const fired = vi.fn();
		timer.at(1, fired);
		timer.cancel();
		timer.cancel();
		vi.advanceTimersByTime(5000);
		expect(fired).not.toHaveBeenCalled();
	});
});
