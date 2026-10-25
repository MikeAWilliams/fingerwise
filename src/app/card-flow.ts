import { drawPitch, type RandomSource } from "../core/drill";
import type { Pitch } from "../core/pitch";
import { startRevealTimer } from "./reveal";

export interface CardState {
	pitch: Pitch;
	revealed: boolean;
}

export interface CardFlowOptions {
	pool: readonly Pitch[];
	random: RandomSource;
	delayMs: number;
	onChange: (state: CardState) => void;
}

export interface CardFlow {
	/** Draw the first card and start its timer. */
	start(): void;
	/** Reveal the card if hidden, otherwise show the next one. Exactly one per call. */
	step(): void;
	/** Cancel any pending reveal. */
	stop(): void;
}

export function createCardFlow({
	pool,
	random,
	delayMs,
	onChange,
}: CardFlowOptions): CardFlow {
	let state: CardState | null = null;
	let cancelTimer: (() => void) | null = null;

	function cancel() {
		cancelTimer?.();
		cancelTimer = null;
	}

	function show(next: CardState) {
		state = next;
		onChange(next);
	}

	function reveal() {
		cancel();
		if (state === null || state.revealed) return;
		show({ pitch: state.pitch, revealed: true });
	}

	function deal(previous: Pitch | null) {
		cancel();
		show({ pitch: drawPitch(pool, previous, random), revealed: false });
		cancelTimer = startRevealTimer(delayMs, reveal);
	}

	return {
		start: () => deal(null),
		step() {
			if (state === null) return;
			if (state.revealed) deal(state.pitch);
			else reveal();
		},
		stop: cancel,
	};
}
