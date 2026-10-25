// Fixed until F01-S05 makes it a setting.
export const REVEAL_DELAY_MS = 3000;

/** Calls `onReveal` once after `delayMs`. Returns a function that cancels it. */
export function startRevealTimer(
	delayMs: number,
	onReveal: () => void,
): () => void {
	const id = setTimeout(onReveal, delayMs);
	return () => clearTimeout(id);
}
