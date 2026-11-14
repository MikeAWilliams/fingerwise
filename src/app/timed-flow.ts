import type { ListenResult, PitchReading } from "../audio/listener";
import type { Pitch } from "../core/pitch";
import {
	countIn,
	DEFAULT_TEMPO,
	type Song,
	type SongNote,
	songSlotsMs,
} from "../core/song";
import type { CardListen, Listening, Verdict } from "./card-flow";

/** Time between the start tap and the first click, so a resuming audio context is running by then. */
export const LEAD_SECONDS = 0.1;

/**
 * How long after a slot starts a tone must hold before it is judged. Provisional:
 * to be tuned in the live check with an ocarina (F08-S03).
 */
export const TIMED_HOLD_OFF_MS = 0;

/**
 * A slot shorter than this is shown in time but not listened to, as a tone
 * cannot settle in it. Provisional, like `TIMED_HOLD_OFF_MS`.
 */
export const MIN_GRADED_SLOT_MS = 300;

/** How far past a slot's end metronome clicks are scheduled ahead, in seconds, so timer jitter cannot make one late. */
export const METRONOME_LOOKAHEAD_SECONDS = 1;

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
	/** The index in the song of the note on the staff. */
	index: number;
	/** The note on the staff: the first one before and during the count-in, the last one in the summary. */
	pitch: Pitch;
	/** That note's length in quarter-note beats. */
	beats: number;
	phase: TimedPhase;
	/** The count-in's beat sounding, from 0; null outside the count-in. */
	countBeat: number | null;
	/** The judge's answer for the note playing; null when none has been heard or it is not listened to. */
	verdict: Verdict | null;
	/** Where listening stands; `off` without judging. */
	listening: Listening;
	/** The summary once the last slot ends, otherwise null. */
	summary: TimedSummary | null;
}

export interface TimedFlowOptions {
	song: Song;
	/** The clock the flow keeps time on, in seconds: the audio clock, or the page clock without audio. */
	clock: { now(): number };
	/** Plays clicks on that clock; null keeps the flow silent but in time. */
	clicker: { click(atSeconds: number): void; stop(): void } | null;
	/** Click on every beat while the song plays, continuing the count-in's grid; false by default. */
	metronome?: boolean;
	/** Judges each slot from the microphone; null or absent turns judging off. */
	listen?: CardListen | null;
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
	const listen = options.listen ?? null;
	const metronome = options.metronome ?? false;
	const notes = song.notes;
	const last = notes.length - 1;
	const tempo = song.tempo ?? DEFAULT_TEMPO;
	const slotsMs = songSlotsMs(song, DEFAULT_TEMPO);
	const bar = countIn(song.meter, tempo);

	let phase: TimedPhase = "ready";
	let countBeat: number | null = null;
	let timer: ReturnType<typeof setTimeout> | null = null;
	let stopped = false;

	let listening: Listening = listen ? "locked" : "off";
	let streamRunning = false;
	let unavailable = false;
	/** True from the start tap until the stream's start settles. */
	let opening = false;
	// Bumped on every start of the stream and on stop, so a late result knows it is stale.
	let attempt = 0;
	// The slot being listened to: whether the window is open, and what it has heard.
	let windowOpen = false;
	let slotGraded = false;
	let slotCorrect = false;
	let verdict: Verdict | null = null;
	let correct = 0;
	let graded = 0;
	// The note on the staff, for judging a reading against.
	let currentIndex = 0;
	let currentPitch = notes[0]?.pitch as Pitch;

	function emit(index: number, summary: TimedSummary | null = null): void {
		if (stopped) return;
		const note = (notes[index] ?? notes[0]) as SongNote;
		onChange({
			index: notes[index] ? index : 0,
			pitch: note.pitch,
			beats: note.beats,
			phase,
			countBeat,
			verdict,
			listening,
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

	/** Close the slot's window: it counts as graded only if it opened and nothing failed. */
	function closeSlot(): void {
		if (slotGraded) {
			graded++;
			if (slotCorrect) correct++;
		}
		windowOpen = false;
		slotGraded = false;
		slotCorrect = false;
		verdict = null;
	}

	/** Open the listening window for a slot, when the stream runs and the slot is long enough. */
	function openSlot(index: number): void {
		windowOpen = false;
		slotGraded = false;
		slotCorrect = false;
		verdict = null;
		if (!listen || listening !== "running") return;
		if ((slotsMs[index] as number) < MIN_GRADED_SLOT_MS) return;
		try {
			listen.tracker.reset(listen.now());
			windowOpen = true;
			slotGraded = true;
		} catch {
			// A tracker that fails leaves the slot ungraded.
		}
	}

	function onReading(reading: PitchReading): void {
		if (!listen || !windowOpen || slotCorrect || phase !== "playing") return;
		try {
			const hz = listen.tracker.push(reading);
			if (hz === null) return;
			const pitch = currentPitch;
			const grade = listen.grade(pitch, hz);
			verdict = { grade, frequency: hz };
			if (grade === "correct") slotCorrect = true;
			else listen.tracker.reset(listen.now());
			emit(currentIndex);
		} catch {
			// A failing judge leaves the slot ungraded.
			windowOpen = false;
			slotGraded = false;
			slotCorrect = false;
		}
	}

	/** The count-in, then the slots. */
	function run(): void {
		cancel();
		clicker?.stop();
		correct = 0;
		graded = 0;
		verdict = null;
		const t0 = clock.now() + LEAD_SECONDS;
		for (let i = 0; i < bar.beats; i++) {
			clicker?.click(t0 + (i * bar.beatMs) / 1000);
		}
		const firstSlot = t0 + (bar.beats * bar.beatMs) / 1000;
		phase = "count-in";
		countBeat = null;
		currentIndex = 0;
		currentPitch = notes[0]?.pitch as Pitch;
		emit(0);

		// Each boundary is the first slot's start plus the summed slots so far,
		// never a delay added to the last one, so rounding cannot build up.
		let elapsedMs = 0;
		const boundaries = slotsMs.map((ms) => {
			elapsedMs += ms;
			return firstSlot + elapsedMs / 1000;
		});
		const songEnd = boundaries[last] as number;
		// The metronome keeps the count-in's grid: beats from the first slot's start,
		// every `beatMs`, up to but not including the end. A batch at a time.
		let nextBeat = 0;
		const scheduleBeats = (upTo: number): void => {
			if (!metronome) return;
			for (;;) {
				const time = firstSlot + (nextBeat * bar.beatMs) / 1000;
				if (time >= songEnd - CLOCK_EPSILON || time > upTo) return;
				clicker?.click(time);
				nextBeat++;
			}
		};
		scheduleBeats((boundaries[0] as number) + METRONOME_LOOKAHEAD_SECONDS);
		const show = (index: number): void => {
			closeSlot();
			if (index > last) {
				phase = "summary";
				emit(last, { correct, graded });
				return;
			}
			phase = "playing";
			countBeat = null;
			currentIndex = index;
			currentPitch = notes[index]?.pitch as Pitch;
			openSlot(index);
			scheduleBeats(
				(boundaries[index] as number) + METRONOME_LOOKAHEAD_SECONDS,
			);
			emit(index);
			at(boundaries[index] as number, () => show(index + 1));
		};
		// Each count-in beat shows on its click; the beat after the last is the first slot.
		const tick = (beat: number): void => {
			if (beat === bar.beats) {
				show(0);
				return;
			}
			countBeat = beat;
			emit(0);
			at(t0 + ((beat + 1) * bar.beatMs) / 1000, () => tick(beat + 1));
		};
		at(t0, () => tick(0));
	}

	/** The first tap opens the stream, if judging; the count-in starts when that settles, whatever it says. */
	function begin(): void {
		if (!listen || streamRunning || unavailable) {
			run();
			return;
		}
		opening = true;
		listening = "opening";
		emit(0);
		const mine = ++attempt;
		let started: Promise<ListenResult>;
		try {
			started = Promise.resolve(listen.listener.start(onReading));
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
			.then((result) => {
				if (stopped || mine !== attempt) return;
				opening = false;
				listening = result.status;
				if (result.status === "running") streamRunning = true;
				if (result.status === "unavailable") unavailable = true;
				run();
			});
	}

	return {
		start() {
			stopped = false;
			phase = "ready";
			countBeat = null;
			emit(0);
		},
		step() {
			if (stopped || opening) return;
			if (phase === "ready" || phase === "summary") begin();
		},
		stop() {
			stopped = true;
			attempt++;
			windowOpen = false;
			cancel();
			clicker?.stop();
			if (!listen) return;
			try {
				listen.listener.stop();
			} catch {
				// Nothing more can be done; the flow is over.
			}
		},
	};
}
