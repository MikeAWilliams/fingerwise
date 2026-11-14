import type { Pitch } from "../core/pitch";
import { countIn, DEFAULT_TEMPO, type Song, songSlotsMs } from "../core/song";
import type { Verdict } from "./card-flow";

/** Time between the start tap and the first click, so a resuming audio context is running by then. */
export const LEAD_SECONDS = 0.1;

/** Seconds of slack when checking a boundary against the clock, for rounding in the sums. */
const CLOCK_EPSILON = 1e-9;

/**
 * Where a timed song stands: `ready` shows the first note and waits for a tap,
 * `count-in` clicks one bar, `playing` runs the slots, `summary` follows the last.
 */
export type TimedPhase = "ready" | "count-in" | "playing" | "summary";

/** What the song's play-through came to; nothing is graded until the flow listens. */
export interface TimedSummary {
	correct: number;
	graded: number;
}

export interface TimedState {
	/** The note on the staff: the first one before and during the count-in, the last one in the summary. */
	pitch: Pitch;
	phase: TimedPhase;
	/** The judge's answer for the note playing; null until the flow listens. */
	verdict: Verdict | null;
	/** The summary once the last slot ends, otherwise null. */
	summary: TimedSummary | null;
}

export interface TimedFlowOptions {
	song: Song;
	/** The clock the flow keeps time on, in seconds: the audio clock, or the page clock without audio. */
	clock: { now(): number };
	/** Plays clicks on that clock; null keeps the flow silent but in time. */
	clicker: { click(atSeconds: number): void; stop(): void } | null;
	onChange: (state: TimedState) => void;
}

export interface TimedFlow {
	/** Show the first note and wait for a tap. */
	start(): void;
	/** Start the count-in from `ready` or `summary`; does nothing while a song plays. */
	step(): void;
	/** Cancel the timer and every click. */
	stop(): void;
}

export function createTimedFlow(options: TimedFlowOptions): TimedFlow {
	const { song, clock, clicker, onChange } = options;
	const notes = song.notes;
	const last = notes.length - 1;
	const tempo = song.tempo ?? DEFAULT_TEMPO;
	const slotsMs = songSlotsMs(song, DEFAULT_TEMPO);
	const bar = countIn(song.meter, tempo);

	let phase: TimedPhase = "ready";
	let timer: ReturnType<typeof setTimeout> | null = null;
	let stopped = false;

	function emit(index: number, summary: TimedSummary | null = null): void {
		if (stopped) return;
		onChange({
			pitch: (notes[index] ?? notes[0])?.pitch as Pitch,
			phase,
			verdict: null,
			summary,
		});
	}

	function cancel(): void {
		if (timer !== null) clearTimeout(timer);
		timer = null;
	}

	/** Run `action` once the clock reaches `at`; a clock that lags the timer re-arms it. */
	function at(time: number, action: () => void): void {
		const fire = () => {
			timer = null;
			if (stopped) return;
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

	function begin(): void {
		cancel();
		clicker?.stop();
		const t0 = clock.now() + LEAD_SECONDS;
		for (let i = 0; i < bar.beats; i++) {
			clicker?.click(t0 + (i * bar.beatMs) / 1000);
		}
		const firstSlot = t0 + (bar.beats * bar.beatMs) / 1000;
		phase = "count-in";
		emit(0);

		// Each boundary is the first slot's start plus the summed slots so far,
		// never a delay added to the last one, so rounding cannot build up.
		let elapsedMs = 0;
		const boundaries = slotsMs.map((ms) => {
			elapsedMs += ms;
			return firstSlot + elapsedMs / 1000;
		});
		const show = (index: number): void => {
			if (index > last) {
				phase = "summary";
				emit(last, { correct: 0, graded: 0 });
				return;
			}
			phase = "playing";
			emit(index);
			at(boundaries[index] as number, () => show(index + 1));
		};
		at(firstSlot, () => show(0));
	}

	return {
		start() {
			stopped = false;
			phase = "ready";
			emit(0);
		},
		step() {
			if (stopped) return;
			if (phase === "ready" || phase === "summary") begin();
		},
		stop() {
			stopped = true;
			cancel();
			clicker?.stop();
		},
	};
}
