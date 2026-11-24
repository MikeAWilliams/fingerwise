/** Seconds of slack when checking a boundary against the clock, for rounding in the sums. */
export const CLOCK_EPSILON = 1e-9;

export interface ClockTimer {
	/**
	 * Run `action` once the clock reaches `time`, in the clock's seconds,
	 * replacing any action still waiting. A timer that fires before the clock
	 * gets there is re-armed.
	 */
	at(time: number, action: () => void): void;
	/** Drop the action waiting, if any. */
	cancel(): void;
}

/** One timer slot driven by a clock that may lag `setTimeout`. */
export function createClockTimer(clock: { now(): number }): ClockTimer {
	let timer: ReturnType<typeof setTimeout> | null = null;

	function cancel(): void {
		if (timer !== null) clearTimeout(timer);
		timer = null;
	}

	function at(time: number, action: () => void): void {
		cancel();
		const fire = () => {
			timer = null;
			if (clock.now() < time - CLOCK_EPSILON) {
				arm();
				return;
			}
			action();
		};
		const arm = () => {
			const wait = Math.max(
				0,
				Math.ceil((time - clock.now()) * 1000 - CLOCK_EPSILON * 1000),
			);
			timer = setTimeout(fire, wait);
		};
		arm();
	}

	return { at, cancel };
}
