import type { ListenResult, PitchReading } from "../audio/listener";
import {
	buildTimeline,
	type CoverageOptions,
	type CoverageResult,
	type CoverageRun,
	createCoverageRun,
	type Progress,
} from "../core/coverage";
import type { Pitch } from "../core/pitch";
import {
	countIn,
	DEFAULT_TEMPO,
	type Song,
	type SongNote,
	songSlotsMs,
} from "../core/song";
import type { Listening } from "./card-flow";

/** Time between the start tap and the first click, so a resuming audio context is running by then. */
export const LEAD_SECONDS = 0.1;

/**
 * How much later than the audio clock a sound reaches the readings: the key-tap
 * measurement of the microphone path (about 55 ms on Linux with a headset),
 * before the output latency is added. To be tuned on desktop and Android.
 */
export const INPUT_ALLOWANCE_MS = 55;

/** The scoring lag when the browser does not report `outputLatency`. */
export const FALLBACK_LAG_MS = 100;

/**
 * How long after it is played a note reaches the scoring: the input allowance
 * plus the output latency (seconds, as the context reports it), or the fixed
 * fallback when that is not known.
 */
export function scoringLagMs(outputLatency: number | null): number {
	return outputLatency === null
		? FALLBACK_LAG_MS
		: INPUT_ALLOWANCE_MS + outputLatency * 1000;
}

/** How far past a slot's end metronome clicks are scheduled ahead, in seconds, so timer jitter cannot make one late. */
export const METRONOME_LOOKAHEAD_SECONDS = 1;

/** Seconds of slack when checking a boundary against the clock, for rounding in the sums. */
const CLOCK_EPSILON = 1e-9;

/**
 * Where a timed song stands: `ready` shows the first note and waits for a tap,
 * `count-in` clicks one bar, `playing` runs the slots, `summary` follows the last.
 */
export type TimedPhase = "ready" | "count-in" | "playing" | "summary";

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
	/** Where listening stands; `off` without judging. */
	listening: Listening;
	/** The flow clock's seconds at the first note's start, song time 0; null until the count-in starts. */
	origin: number | null;
	/**
	 * The coverage result one scoring lag after the last slot ends; null before
	 * that, and in the summary when nothing was scored.
	 */
	summary: CoverageResult | null;
}

/** What the flow needs to score a timed song from the microphone. */
export interface TimedListen {
	listener: {
		start(onReading: (reading: PitchReading) => void): Promise<ListenResult>;
		stop(): void;
	};
	coverage: CoverageOptions;
}

export interface TimedFlowOptions {
	song: Song;
	/** The clock the flow keeps time on, in seconds: the audio clock, or the page clock without audio. */
	clock: { now(): number };
	/** Plays clicks on that clock; null keeps the flow silent but in time. */
	clicker: { click(atSeconds: number): void; stop(): void } | null;
	/** Click on every beat while the song plays, continuing the count-in's grid; false by default. */
	metronome?: boolean;
	/** Scores the song from the microphone; null or absent turns judging off. */
	listen?: TimedListen | null;
	/** The audio context's output latency in seconds, read once as the song starts; null when not reported. */
	outputLatency?: () => number | null;
	onChange: (state: TimedState) => void;
}

export interface TimedFlow {
	/** Show the first note and wait for a tap. */
	start(): void;
	/** Start the count-in from `ready` or `summary`; does nothing while a song plays. */
	step(): void;
	/** Cancel the timer and every click. */
	stop(): void;
	/** The scoring so far, for drawing it live; null when nothing is scored (judging off, a stream not running) and after the summary. */
	progress(): Progress | null;
	/** The newest reading from the microphone, or null when there is none. */
	reading(): PitchReading | null;
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
	let origin: number | null = null;
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
	let latest: PitchReading | null = null;
	// The song's scoring while it plays and until its summary; null when nothing is scored.
	let scoring: {
		run: CoverageRun;
		/** The audio clock's seconds at the first slot's start: song time 0. */
		firstSlot: number;
		lagMs: number;
	} | null = null;

	function emit(index: number, summary: CoverageResult | null = null): void {
		if (stopped) return;
		const note = (notes[index] ?? notes[0]) as SongNote;
		onChange({
			index: notes[index] ? index : 0,
			pitch: note.pitch,
			beats: note.beats,
			phase,
			countBeat,
			listening,
			origin,
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

	/** Places a reading and its level blocks in song time and feeds them to the scoring. */
	function onReading(reading: PitchReading): void {
		latest = reading;
		const current = scoring;
		if (!current || reading.audioTime === undefined) return;
		const audioTime = reading.audioTime;
		if (!Number.isFinite(audioTime)) return;
		const songTime = (audioSeconds: number) =>
			(audioSeconds - current.firstSlot) * 1000 - current.lagMs;
		try {
			current.run.pushEnvelope(
				(reading.envelope ?? []).map((block) => ({
					time: songTime(block.time),
					level: block.level,
				})),
			);
			current.run.pushReading({
				time: songTime(audioTime),
				frequency: reading.frequency,
				clarity: reading.clarity,
				level: reading.level,
			});
		} catch {
			// A scoring that fails leaves the song playing in time and unscored.
			scoring = null;
		}
	}

	/** The output latency, read as the song starts; null when it is not reported or cannot be read. */
	function readOutputLatency(): number | null {
		try {
			return options.outputLatency?.() ?? null;
		} catch {
			return null;
		}
	}

	/** The count-in, then the slots. */
	function run(): void {
		cancel();
		clicker?.stop();
		const t0 = clock.now() + LEAD_SECONDS;
		for (let i = 0; i < bar.beats; i++) {
			clicker?.click(t0 + (i * bar.beatMs) / 1000);
		}
		const firstSlot = t0 + (bar.beats * bar.beatMs) / 1000;
		// Readings count from here, for the whole song, count-in included.
		scoring = null;
		if (listen && listening === "running") {
			try {
				scoring = {
					run: createCoverageRun(buildTimeline(song, tempo), listen.coverage),
					firstSlot,
					lagMs: scoringLagMs(readOutputLatency()),
				};
			} catch {
				// A scoring that cannot start leaves the song unscored.
			}
		}
		origin = firstSlot;
		phase = "count-in";
		countBeat = null;
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
		// The last note's sound reaches the scoring one lag after its slot ends.
		const summarise = (): void => {
			let summary: CoverageResult | null = null;
			try {
				summary = scoring?.run.finish() ?? null;
			} catch {
				// A scoring that fails to finish leaves nothing to report.
			}
			scoring = null;
			phase = "summary";
			emit(last, summary);
		};
		const show = (index: number): void => {
			phase = "playing";
			countBeat = null;
			scheduleBeats(
				(boundaries[index] as number) + METRONOME_LOOKAHEAD_SECONDS,
			);
			emit(index);
			at(boundaries[index] as number, () => {
				if (index < last) show(index + 1);
				else if (scoring) at(songEnd + scoring.lagMs / 1000, summarise);
				else summarise();
			});
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
			origin = null;
			countBeat = null;
			emit(0);
		},
		step() {
			if (stopped || opening) return;
			if (phase === "ready" || phase === "summary") begin();
		},
		progress: () => scoring?.run.progress() ?? null,
		reading: () => latest,
		stop() {
			stopped = true;
			attempt++;
			scoring = null;
			latest = null;
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
