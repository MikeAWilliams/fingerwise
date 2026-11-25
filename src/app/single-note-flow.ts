import { startRevealTimer } from "./reveal";

/** Where Single note practice stands. */
export interface SingleNoteState {
	/** The current note's index in the song; the last note's once ended. */
	index: number;
	/** The current note's fingering shows. */
	fingering: boolean;
	/** The head moved on from the last note; a tap starts again. */
	ended: boolean;
	/** The microphone is not used until F16-S03. */
	listening: "off";
}

export interface SingleNoteFlowOptions {
	/** How many notes the song has; rests are not among them. */
	count: number;
	/** From a note becoming current until its fingering shows. */
	fingeringDelayMs: number;
	/** From the fingering showing until the next note. */
	advanceDelayMs: number;
	onChange: (state: SingleNoteState) => void;
}

export interface SingleNoteFlow {
	/** Make the first note current and start its fingering timer. */
	start(): void;
	/** Show the fingering if hidden, otherwise move on; after the end, start again. Exactly one per call. */
	step(): void;
	/** Cancel any pending timer. */
	stop(): void;
}

/**
 * Single note practice with the microphone off: the head rests on one note,
 * its fingering shows after the fingering delay, and the next note follows
 * after the advance delay. A tap shows the fingering, then moves on. Notes are
 * the song's notes, so a rest is never current and a tied note is one. No tone
 * is played and nothing is graded.
 */
export function createSingleNoteFlow({
	count,
	fingeringDelayMs,
	advanceDelayMs,
	onChange,
}: SingleNoteFlowOptions): SingleNoteFlow {
	let state: SingleNoteState | null = null;
	let cancelTimer: (() => void) | null = null;

	function cancel() {
		cancelTimer?.();
		cancelTimer = null;
	}

	function show(next: SingleNoteState) {
		state = next;
		onChange(next);
	}

	function showFingering() {
		cancel();
		if (state === null || state.ended) return;
		show({ ...state, fingering: true });
		cancelTimer = startRevealTimer(advanceDelayMs, moveOn);
	}

	function goTo(index: number) {
		cancel();
		show({ index, fingering: false, ended: false, listening: "off" });
		cancelTimer = startRevealTimer(fingeringDelayMs, showFingering);
	}

	function moveOn() {
		cancel();
		if (state === null) return;
		if (state.index + 1 >= count) {
			show({ ...state, fingering: false, ended: true });
			return;
		}
		goTo(state.index + 1);
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
			cancel();
		},
	};
}
