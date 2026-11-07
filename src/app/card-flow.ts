import { drawPitch, type RandomSource } from "../core/drill";
import type { Pitch } from "../core/pitch";
import { startRevealTimer } from "./reveal";

export interface CardState {
	pitch: Pitch;
	revealed: boolean;
}

/** What the flow needs to sound a card's note: when, and how to start and stop it. */
export interface CardTone {
	/** Time from the reveal to `play`; 0 plays inside the reveal itself. */
	delayMs: number;
	play(pitch: Pitch): void;
	stop(): void;
}

export interface CardFlowOptions {
	pool: readonly Pitch[];
	random: RandomSource;
	delayMs: number;
	/** How long a revealed card waits before the next one; null turns auto-advance off. */
	advanceDelayMs: number | null;
	/** Plays the revealed card's note; null or absent keeps the flow silent. */
	tone?: CardTone | null;
	onChange: (state: CardState) => void;
}

export interface CardFlow {
	/** Draw the first card and start its timer. */
	start(): void;
	/** Reveal the card if hidden, otherwise show the next one. Exactly one per call. */
	step(): void;
	/** Cancel any pending reveal or advance. */
	stop(): void;
}

export function createCardFlow({
	pool,
	random,
	delayMs,
	advanceDelayMs,
	tone = null,
	onChange,
}: CardFlowOptions): CardFlow {
	let state: CardState | null = null;
	let cancelTimer: (() => void) | null = null;
	let cancelSound: (() => void) | null = null;

	function cancel() {
		cancelTimer?.();
		cancelTimer = null;
	}

	function cancelTone() {
		cancelSound?.();
		cancelSound = null;
		if (!tone) return;
		try {
			tone.stop();
		} catch {
			// A tone that fails must not break the cards.
		}
	}

	function playTone(pitch: Pitch) {
		cancelSound = null;
		try {
			tone?.play(pitch);
		} catch {
			// A tone that fails must not break the cards.
		}
	}

	function show(next: CardState) {
		state = next;
		onChange(next);
	}

	function reveal() {
		cancel();
		if (state === null || state.revealed) return;
		show({ pitch: state.pitch, revealed: true });
		const shown = state.pitch;
		if (tone) {
			if (tone.delayMs === 0) playTone(shown);
			else cancelSound = startRevealTimer(tone.delayMs, () => playTone(shown));
		}
		if (advanceDelayMs !== null) {
			cancelTimer = startRevealTimer(advanceDelayMs, () => deal(shown));
		}
	}

	function deal(previous: Pitch | null) {
		cancel();
		cancelTone();
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
		stop() {
			cancel();
			cancelTone();
		},
	};
}
