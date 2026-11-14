import type { ListenResult, PitchReading } from "../audio/listener";
import {
	drawPitch,
	drawWeighted,
	nextInOrder,
	type RandomSource,
} from "../core/drill";
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
	/**
	 * Null while the card is hidden. A card waiting for the correct note (see
	 * `wait`) stays hidden and may carry a passing `incorrect` verdict, which clears
	 * after `WRONG_VERDICT_MS`.
	 */
	verdict: Verdict | null;
	listening: Listening;
}

/** What the flow needs to sound a card's note: when, and how to start and stop it. */
export interface CardTone {
	/** Time from the reveal to `play`; 0 plays inside the reveal itself. */
	delayMs: number;
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

/**
 * The notes of a song in order, looping after the last. It keeps its own
 * position, so a repeated note is shown again; each flow builds a new one and
 * so starts at the first note. It draws nothing at random.
 */
export function songSource(pitches: readonly Pitch[]): PitchSource {
	let index: number | null = null;
	return () => {
		const next = nextInOrder(pitches, index);
		index = next.index;
		return next.pitch;
	};
}

/** How long a wrong-note verdict shows on a waiting card before it clears. */
export const WRONG_VERDICT_MS = 1000;

export interface CardFlowOptions {
	next: PitchSource;
	delayMs: number;
	/** How long a revealed card waits before the next one; null turns auto-advance off. */
	advanceDelayMs: number | null;
	/** Plays the revealed card's note; null or absent keeps the flow silent. */
	tone?: CardTone | null;
	/** Judges each card before its reveal; null or absent turns judging off. */
	listen?: CardListen | null;
	/**
	 * Wait for the correct note: while listening runs with its window open, an
	 * incorrect tone shows its verdict briefly instead of revealing the card, and
	 * the reveal delay and taps do not reveal it. Needs `listen`; false by default.
	 */
	wait?: boolean;
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
	tone = null,
	listen = null,
	wait = false,
	onGraded = null,
	onChange,
}: CardFlowOptions): CardFlow {
	let state: CardState | null = null;
	let cancelTimer: (() => void) | null = null;
	let cancelSound: (() => void) | null = null;
	// Clears a wrong verdict; apart from `cancelTimer` so the reveal delay still runs.
	let cancelMiss: (() => void) | null = null;
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

	function cancelClear() {
		cancelMiss?.();
		cancelMiss = null;
	}

	/** True while the card is hidden and only the correct note moves it on. */
	function waiting(): boolean {
		return (
			wait &&
			listen !== null &&
			state !== null &&
			!state.revealed &&
			state.listening === "running" &&
			windowOpen
		);
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
		cancelClear();
		windowOpen = false;
		if (state === null || state.revealed) return;
		const graded = listen !== null && state.listening === "running";
		show({ ...state, revealed: true, verdict });
		const shown = state.pitch;
		if (graded) grade(shown, verdict);
		if (tone) {
			if (tone.delayMs === 0) playTone(shown);
			else cancelSound = startRevealTimer(tone.delayMs, () => playTone(shown));
		}
		if (advanceDelayMs !== null) {
			cancelTimer = startRevealTimer(advanceDelayMs, () => deal(shown));
		}
	}

	// While waiting, the reveal delay does nothing (the hint, F07-S02).
	function timedReveal() {
		if (waiting()) return;
		reveal();
	}

	function startRevealDelay() {
		cancelTimer = startRevealTimer(delayMs, timedReveal);
	}

	function openWindow(active: CardListen) {
		try {
			active.tracker.reset(active.now());
			windowOpen = true;
		} catch {
			windowOpen = false;
		}
	}

	function onReading(reading: PitchReading) {
		if (!listen || !windowOpen || state === null || state.revealed) return;
		try {
			const hz = listen.tracker.push(reading);
			if (hz === null) return;
			const grade = listen.grade(state.pitch, hz);
			if (grade === "incorrect" && waiting()) {
				const shown = state;
				show({ ...shown, verdict: { grade, frequency: hz } });
				listen.tracker.reset(listen.now());
				cancelClear();
				cancelMiss = startRevealTimer(WRONG_VERDICT_MS, () => {
					cancelMiss = null;
					// Reveal, deal and stop cancel this timer, so the card is still the same.
					show({ ...shown, verdict: null });
				});
				return;
			}
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
		cancelClear();
		cancelTone();
		windowOpen = false;
		dealt++;
		const pitch = next(previous);
		if (!listen) {
			show({ pitch, revealed: false, verdict: null, listening: "off" });
			startRevealDelay();
			return;
		}
		if (unavailable) {
			show({ pitch, revealed: false, verdict: null, listening: "unavailable" });
			startRevealDelay();
			return;
		}
		if (streamRunning) {
			show({ pitch, revealed: false, verdict: null, listening: "running" });
			openWindow(listen);
			startRevealDelay();
			return;
		}
		// The reveal delay and the window wait until the stream runs or fails.
		show({ pitch, revealed: false, verdict: null, listening: "opening" });
		openStream(listen);
	}

	return {
		start: () => deal(null),
		step() {
			if (state === null) return;
			if (state.revealed) deal(state.pitch);
			else if (!waiting()) reveal();
		},
		stop() {
			stopped = true;
			dealt++;
			windowOpen = false;
			cancel();
			cancelClear();
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
