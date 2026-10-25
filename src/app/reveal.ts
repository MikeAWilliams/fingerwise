/** Calls `onReveal` once after `delayMs`. Returns a function that cancels it. */
export function startRevealTimer(
	delayMs: number,
	onReveal: () => void,
): () => void {
	const id = setTimeout(onReveal, delayMs);
	return () => clearTimeout(id);
}
