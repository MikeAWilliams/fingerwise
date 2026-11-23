import type { TimedState } from "./timed-flow";

/** The phase a timed song's card shows: the count-in and opening the microphone both count as playing. */
export function cardPhase(state: TimedState): "ready" | "playing" | "summary" {
	return state.phase === "count-in" || state.listening === "opening"
		? "playing"
		: state.phase;
}

/** Scrolling by hand is locked while a timed song is playing, and never otherwise. */
export function scrollLockApplies(
	phase: "ready" | "playing" | "summary" | undefined,
): boolean {
	return phase === "playing";
}

/** The class on the root element that locks scrolling. */
export const SCROLL_LOCK_CLASS = "scroll-locked";

/** The one place the lock is put on or lifted. */
export function setScrollLock(
	root: { classList: { toggle(name: string, force: boolean): unknown } },
	on: boolean,
): void {
	root.classList.toggle(SCROLL_LOCK_CLASS, on);
}
