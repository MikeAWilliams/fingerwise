import type { ListenResult, PitchReading } from "../audio/listener";
import { drawPitch, drawWeighted, type RandomSource } from "../core/drill";
import type { Grade, ToneTracker } from "../core/judge";
import type { Pitch } from "../core/pitch";
import { drawWeight, type ProgressGrade, type Scores } from "../core/progress";
import { startRevealTimer } from "./reveal";

/** The judge's answer for a revealed card; `none` when nothing was heard or judging is off. */
export type Verdict = { grade: Grade; frequency: number } | { grade: "none" };

/**
 * Where listening stands: `off` without judging, `opening` while the stream
 * starts, `locked` before the first gesture, `running` once it streams, and
 * `unavailable` when it failed for this flow.
 */
export type Listening =
	| "off"
	| "opening"
	| "locked"
	| "running"
	| "unavailable";

export interface CardState {
	pitch: Pitch;
	revealed: boolean;
	/** Null while the card is hidden. */
	verdict: Verdict | null;
	listening: Listening;
	/**
	 * After a miss with auto-advance off: `listening` while the card waits for its
	 * note to be played right, `right` once it was (the verdict then says so).
	 * Null outside a retry.
	 */
	retry: "listening" | "right" | null;
}

/** What the flow needs to sound a card's note: when, and how to start and stop it. */
export interface CardTone {
	/** Time from the reveal to `play`; 0 plays inside the reveal itself. */
	delayMs: number;
	/** How long the note sounds once it starts. */
	durationMs: number;
	play(pitch: Pitch): void;
	stop(): void;
}

/** What the flow needs to judge a card from the microphone. */
export interface CardListen {
	listener: {
		start(onReading: (reading: PitchReading) => void): Promise<ListenResult>;
		stop(): void;
	};
	tracker: Pick<ToneTracker, "reset" | "push">;
	/** Grades a heard frequency against the card's written pitch. */
	grade(pitch: Pitch, hz: number): Grade;
	/** The clock the listener's reading times use, in ms. */
	now(): number;
}

/** Where the next card's pitch comes from; `previous` is the card just shown, or null at the start. */
export type PitchSource = (previous: Pitch | null) => Pitch;

/** Random cards from `pool`, never the same twice in a row (unless the pool is one pitch). */
export function randomSource(
	pool: readonly Pitch[],
	random: RandomSource,
): PitchSource {
	return (previous) => drawPitch(pool, previous, random);
}

/**
 * Random cards from `pool` weighted by need, never the same twice in a row (unless
 * the pool is one pitch). `scores` is read on every draw, so a grade applied since
 * the last card counts.
 */
export function needSource(
	pool: readonly Pitch[],
	scores: () => Scores,
	random: RandomSource,
): PitchSource {
	return (previous) =>
		drawWeighted(pool, previous, (p) => drawWeight(scores(), p), random);
}

export interface CardFlowOptions {
	next: PitchSource;
	delayMs: number;
	/** How long a revealed card waits before the next one; null turns auto-advance off. */
	advanceDelayMs: number | null;
	/**
	 * With auto-advance off: how long a card played right waits before the next
	 * one, and the retry applies to a missed card judged by the microphone. Null
	 * or absent leaves a revealed card waiting for a tap.
	 */
	retryAdvanceMs?: number | null;
	/** Plays the revealed card's note; null or absent keeps the flow silent. */
	tone?: CardTone | null;
	/** Judges each card before its reveal; null or absent turns judging off. */
	listen?: CardListen | null;
	/**
	 * Called once for a card revealed while the stream runs: `correct` for a correct
	 * verdict, `miss` for an incorrect one or none. Not called in any other state.
	 */
	onGraded?: ((pitch: Pitch, grade: ProgressGrade) => void) | null;
	onChange: (state: CardState) => void;
}

export interface CardFlow {
	/** Draw the first card and start its timer. */
	start(): void;
	/** Reveal the card if hidden, otherwise show the next one. Exactly one per call. */
	step(): void;
	/** Cancel any pending reveal or advance, and stop listening. */
	stop(): void;
}

const NONE: Verdict = { grade: "none" };

export function createCardFlow({
	next,
	delayMs,
	advanceDelayMs,
	retryAdvanceMs = null,
	tone = null,
	listen = null,
	onGraded = null,
	onChange,
}: CardFlowOptions): CardFlow {
	let state: CardState | null = null;
	let cancelTimer: (() => void) | null = null;
	let cancelSound: (() => void) | null = null;
	// Bumped on every deal and on stop, so a late listener result knows its card is gone.
	let dealt = 0;
	let stopped = false;
	let streamRunning = false;
	let unavailable = false;
	let windowOpen = false;

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

	function grade(pitch: Pitch, verdict: Verdict) {
		try {
			onGraded?.(pitch, verdict.grade === "correct" ? "correct" : "miss");
		} catch {
			// Progress that fails to save must not break the cards.
		}
	}

	function reveal(verdict: Verdict = NONE) {
		cancel();
		windowOpen = false;
		if (state === null || state.revealed) return;
		const graded = listen !== null && state.listening === "running";
		const retrying =
			graded && retryAdvanceMs !== null && verdict.grade !== "correct";
		show({
			...state,
			revealed: true,
			verdict,
			retry: retrying ? "listening" : null,
		});
		const shown = state.pitch;
		if (graded) grade(shown, verdict);
		if (tone) {
			if (tone.delayMs === 0) playTone(shown);
			else cancelSound = startRevealTimer(tone.delayMs, () => playTone(shown));
		}
		if (advanceDelayMs !== null) {
			cancelTimer = startRevealTimer(advanceDelayMs, () => deal(shown));
			return;
		}
		if (!graded || retryAdvanceMs === null || listen === null) return;
		const toneEnd = tone ? tone.delayMs + tone.durationMs : 0;
		if (verdict.grade === "correct") {
			// Played right first time: on after the advance delay, never before the tone ends.
			cancelTimer = startRevealTimer(Math.max(retryAdvanceMs, toneEnd), () =>
				deal(shown),
			);
			return;
		}
		// A miss: listen again once the tone has ended; the tracker's hold-off drops its tail.
		const active = listen;
		cancelTimer = startRevealTimer(toneEnd, () => {
			cancelTimer = null;
			openWindow(active);
		});
	}

	function startRevealDelay() {
		cancelTimer = startRevealTimer(delayMs, reveal);
	}

	function openWindow(active: CardListen) {
		try {
			active.tracker.reset(active.now());
			windowOpen = true;
		} catch {
			windowOpen = false;
		}
	}

	function onRetryReading(
		active: CardListen,
		current: CardState,
		reading: PitchReading,
	) {
		try {
			const hz = active.tracker.push(reading);
			if (hz === null) return;
			const grade = active.grade(current.pitch, hz);
			if (grade === "correct") {
				windowOpen = false;
				show({
					...current,
					verdict: { grade, frequency: hz },
					retry: "right",
				});
				cancel();
				const shown = current.pitch;
				cancelTimer = startRevealTimer(retryAdvanceMs ?? 0, () => deal(shown));
				return;
			}
			show({ ...current, verdict: { grade, frequency: hz } });
			// One tone is reported per reset, so reset for the next wrong or right note.
			active.tracker.reset(active.now());
		} catch {
			// A failing judge closes the window; the card waits for a tap.
			windowOpen = false;
		}
	}

	function onReading(reading: PitchReading) {
		if (!listen || !windowOpen || state === null) return;
		if (state.revealed) {
			if (state.retry === "listening") {
				onRetryReading(listen, state, reading);
			}
			return;
		}
		try {
			const hz = listen.tracker.push(reading);
			if (hz === null) return;
			const grade = listen.grade(state.pitch, hz);
			reveal({ grade, frequency: hz });
		} catch {
			// A failing judge leaves the card to its reveal timer.
			windowOpen = false;
		}
	}

	function settle(mine: number, result: ListenResult) {
		if (stopped) return;
		if (result.status === "running") streamRunning = true;
		if (result.status === "unavailable") unavailable = true;
		if (mine !== dealt || state === null || !listen) return;
		show({ ...state, listening: result.status });
		// A step while opening already revealed this card.
		if (state.revealed) return;
		if (result.status === "running") openWindow(listen);
		startRevealDelay();
	}

	function openStream(active: CardListen) {
		const mine = dealt;
		let started: Promise<ListenResult>;
		try {
			started = Promise.resolve(active.listener.start(onReading));
		} catch {
			started = Promise.resolve({
				status: "unavailable",
				reason: "unsupported",
			});
		}
		started
			.catch(
				(): ListenResult => ({ status: "unavailable", reason: "unsupported" }),
			)
			.then((result) => settle(mine, result));
	}

	function deal(previous: Pitch | null) {
		cancel();
		cancelTone();
		windowOpen = false;
		dealt++;
		const pitch = next(previous);
		if (!listen) {
			show({
				pitch,
				revealed: false,
				verdict: null,
				retry: null,
				listening: "off",
			});
			startRevealDelay();
			return;
		}
		if (unavailable) {
			show({
				pitch,
				revealed: false,
				verdict: null,
				retry: null,
				listening: "unavailable",
			});
			startRevealDelay();
			return;
		}
		if (streamRunning) {
			show({
				pitch,
				revealed: false,
				verdict: null,
				retry: null,
				listening: "running",
			});
			openWindow(listen);
			startRevealDelay();
			return;
		}
		// The reveal delay and the window wait until the stream runs or fails.
		show({
			pitch,
			revealed: false,
			verdict: null,
			retry: null,
			listening: "opening",
		});
		openStream(listen);
	}

	return {
		start: () => deal(null),
		step() {
			if (state === null) return;
			if (state.revealed) deal(state.pitch);
			else reveal();
		},
		stop() {
			stopped = true;
			dealt++;
			windowOpen = false;
			cancel();
			cancelTone();
			if (!listen) return;
			try {
				listen.listener.stop();
			} catch {
				// Nothing more can be done; the flow is over.
			}
		},
	};
}
