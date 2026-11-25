import type { ListenResult, PitchReading } from "../audio/listener";
import type { Reading, ToneOutcome, ToneWatch } from "../core/judge";
import type { Listening } from "./card-flow";
import { PLAY_WHOLE_VALUE } from "./judge-text";
import { startRevealTimer } from "./reveal";

/** Where Single note practice stands. */
export interface SingleNoteState {
	/** The current note's index in the song; the last note's once ended. */
	index: number;
	/** The current note's fingering shows. */
	fingering: boolean;
	/** The head moved on from the last note; a tap starts again. */
	ended: boolean;
	/** The pinned bar's message (a right tone that was too short); null for none. */
	message: string | null;
	/** `off` without a microphone; otherwise where the stream stands. */
	listening: Listening;
}

/** What the flow needs to judge each note from the microphone. */
export interface SingleNoteListen {
	listener: {
		start(onReading: (reading: PitchReading) => void): Promise<ListenResult>;
		stop(): void;
	};
	watch: Pick<ToneWatch, "reset" | "push" | "tone">;
	/** Grades a finished tone against the song note at `index`. */
	grade(index: number, readings: readonly Reading[]): ToneOutcome;
	/** The clock the listener's reading times use, in ms. */
	now(): number;
}

export interface SingleNoteFlowOptions {
	/** How many notes the song has; rests are not among them. */
	count: number;
	/** From a note becoming current until its fingering shows. */
	fingeringDelayMs: number;
	/** With the microphone off: from the fingering showing until the next note. Unused while listening. */
	advanceDelayMs: number;
	/** Judges each note; null or absent turns the microphone off. */
	listen?: SingleNoteListen | null;
	onChange: (state: SingleNoteState) => void;
}

export interface SingleNoteFlow {
	/** Make the first note current and start its fingering timer (and its listening). */
	start(): void;
	/** Show the fingering if hidden, otherwise move on; after the end, start again. Exactly one per call. */
	step(): void;
	/** Cancel any pending timer and release the microphone. */
	stop(): void;
	/** The tone sounding now, for the live trace; null when none or not listening. */
	tone(): { startMs: number; readings: readonly Reading[] } | null;
}

/**
 * Single note practice: the head rests on one note.
 *
 * With the microphone off (or while its stream is opening, locked or
 * unavailable), the fingering shows after the fingering delay and the next note
 * follows after the advance delay. A tap shows the fingering, then moves on.
 *
 * While the stream runs, the current note listens from the moment it becomes
 * current (with the watch's hold-off). A tone that ends with enough time within
 * the tolerance moves on; one that was right but too short sets a message; a
 * wrong one shows the fingering. Every end clears the trace and the note keeps
 * listening. The fingering delay still runs, but the advance delay does not.
 * Taps work as without the microphone.
 *
 * Notes are the song's notes, so a rest is never current and a tied note is
 * one. No tone is played.
 */
export function createSingleNoteFlow({
	count,
	fingeringDelayMs,
	advanceDelayMs,
	listen = null,
	onChange,
}: SingleNoteFlowOptions): SingleNoteFlow {
	let state: SingleNoteState | null = null;
	let cancelTimer: (() => void) | null = null;
	let stopped = false;
	let streamRunning = false;
	let unavailable = false;
	let opening = false;

	function cancel() {
		cancelTimer?.();
		cancelTimer = null;
	}

	function show(next: SingleNoteState) {
		state = next;
		onChange(next);
	}

	/** The stream runs and the note is listening for a tone. */
	function listening(): boolean {
		return listen !== null && streamRunning && !unavailable;
	}

	function currentListening(): Listening {
		if (listen === null) return "off";
		if (unavailable) return "unavailable";
		return streamRunning ? "running" : "opening";
	}

	function resetWatch() {
		if (!listen) return;
		try {
			listen.watch.reset(listen.now());
		} catch {
			// A watch that fails leaves the note to its timers and taps.
		}
	}

	function showFingering() {
		cancel();
		if (state === null || state.ended) return;
		show({ ...state, fingering: true });
		// While listening the advance delay plays no part.
		if (!listening()) cancelTimer = startRevealTimer(advanceDelayMs, moveOn);
	}

	function goTo(index: number) {
		cancel();
		show({
			index,
			fingering: false,
			ended: false,
			message: null,
			listening: currentListening(),
		});
		cancelTimer = startRevealTimer(fingeringDelayMs, showFingering);
		if (listening()) resetWatch();
		else if (listen && !unavailable && !opening) openStream(listen);
	}

	function moveOn() {
		cancel();
		if (state === null) return;
		if (state.index + 1 >= count) {
			show({ ...state, fingering: false, ended: true, message: null });
			return;
		}
		goTo(state.index + 1);
	}

	function onReading(reading: PitchReading) {
		if (!listen || !listening() || state === null || state.ended) return;
		try {
			const event = listen.watch.push(reading);
			if (event === null) return;
			if (event.kind === "start") {
				if (state.message !== null) show({ ...state, message: null });
				return;
			}
			const outcome = listen.grade(state.index, event.readings);
			if (outcome === "passed") moveOn();
			else if (outcome === "too-short") {
				show({ ...state, message: PLAY_WHOLE_VALUE });
			} else if (!state.fingering) {
				showFingering();
			}
		} catch {
			// A failing judge leaves the note to its timers and taps.
		}
	}

	function openStream(active: SingleNoteListen) {
		opening = true;
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
			.then((result) => settle(result));
	}

	function settle(result: ListenResult) {
		opening = false;
		if (stopped) return;
		if (result.status === "running") streamRunning = true;
		if (result.status === "unavailable") unavailable = true;
		if (state === null) return;
		show({ ...state, listening: result.status });
		if (result.status !== "running" || state.ended) return;
		// The current note begins listening; the advance delay no longer applies.
		resetWatch();
		if (state.fingering) cancel();
	}

	return {
		start() {
			cancel();
			if (count > 0) goTo(0);
		},
		step() {
			if (state === null) return;
			if (state.ended) goTo(0);
			else if (!state.fingering) showFingering();
			else moveOn();
		},
		stop() {
			stopped = true;
			cancel();
			if (!listen) return;
			try {
				listen.listener.stop();
			} catch {
				// Nothing more can be done; the flow is over.
			}
		},
		tone() {
			if (!listen || !listening()) return null;
			try {
				return listen.watch.tone();
			} catch {
				return null;
			}
		},
	};
}
