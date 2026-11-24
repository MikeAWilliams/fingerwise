import type { ListenResult, PitchReading } from "../audio/listener";
import { type Analysis, analyse } from "../core/analysis";
import {
	buildTimeline,
	type CoverageOptions,
	type CoverageReading,
	type CoverageResult,
	type CoverageRun,
	createCoverageRun,
	type Progress,
	type Timeline,
} from "../core/coverage";
import { passesChecks } from "../core/judge";
import type { Pitch } from "../core/pitch";
import {
	countIn,
	DEFAULT_TEMPO,
	type Song,
	type SongNote,
	songSlotsMs,
} from "../core/song";
import type { Listening } from "./card-flow";
import { CLOCK_EPSILON, createClockTimer } from "./clock-timer";
import { createSilenceWatch, type SilenceWatch } from "./overrun";

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

/**
 * Scoring after the song listens past the last note until the player has been
 * silent this long, in song time (F12-S03).
 */
export const OVERRUN_SILENCE_MS = 1000;
/** The longest the listening goes on past the last slot's end plus the scoring lag, when the sound never stops. */
export const OVERRUN_CAP_MS = 10000;

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
	/** Why the score is what it is, with the summary; null in every other state, and when nothing was graded. */
	analysis: Analysis | null;
	/**
	 * The finished scoring (segments and faults) with the summary, for drawing
	 * every lane at once; null in every other state, and when nothing was scored.
	 */
	scored: Progress | null;
	/** Scoring after the song, from the last slot's end until the summary: the player is still being listened to. */
	overrun: boolean;
	/** The readings after the last note, in song time, kept for the overrun lane; set only with the summary in `after`, empty otherwise. */
	overrunReadings: readonly CoverageReading[];
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
	/**
	 * Scoring after the song: `progress()` reports nothing during the song, so
	 * nothing is drawn as it plays; the finished scoring comes with the summary.
	 * The microphone is read and scored exactly as in live feedback. False by default.
	 */
	after?: boolean;
	onChange: (state: TimedState) => void;
}

export interface TimedFlow {
	/** Show the first note and wait for a tap. */
	start(): void;
	/** Start the count-in from `ready` or `summary`; does nothing while a song plays. */
	step(): void;
	/** Cancel the timer and every click. */
	stop(): void;
	/** The scoring so far, for drawing it live; null when nothing is scored (judging off, a stream not running), after the summary, and always when scoring after the song. */
	progress(): Progress | null;
	/** The newest reading from the microphone, or null when there is none. */
	reading(): PitchReading | null;
}

export function createTimedFlow(options: TimedFlowOptions): TimedFlow {
	const { song, clock, clicker, onChange } = options;
	const listen = options.listen ?? null;
	const metronome = options.metronome ?? false;
	const after = options.after ?? false;
	const notes = song.notes;
	const last = notes.length - 1;
	const tempo = song.tempo ?? DEFAULT_TEMPO;
	const slotsMs = songSlotsMs(song, DEFAULT_TEMPO);
	const bar = countIn(song.meter, tempo);

	let phase: TimedPhase = "ready";
	let origin: number | null = null;
	let countBeat: number | null = null;
	const timer = createClockTimer(clock);
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
		timeline: Timeline;
		/** The audio clock's seconds at the first slot's start: song time 0. */
		firstSlot: number;
		lagMs: number;
		/** Every reading in song time, for the silence that ends the song in `after`. */
		watch: SilenceWatch;
		/** In `after`, the readings past the last slot's end: not fed to the run, kept for the overrun lane. */
		kept: CoverageReading[];
	} | null = null;
	let overrun = false;
	// While waiting for silence past the end: called after each reading.
	let overrunCheck: (() => void) | null = null;
	/** The song time of the last slot's end, in ms from the first slot's start. */
	const lastEndMs = slotsMs.reduce((sum, ms) => sum + ms, 0);

	function emit(
		index: number,
		result: {
			summary?: CoverageResult | null;
			analysis?: Analysis | null;
			scored?: Progress | null;
			overrunReadings?: readonly CoverageReading[];
		} = {},
	): void {
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
			summary: result.summary ?? null,
			analysis: result.analysis ?? null,
			scored: result.scored ?? null,
			overrun,
			overrunReadings: result.overrunReadings ?? [],
		});
	}

	const cancel = timer.cancel;

	/** Run `action` once the clock reaches `time`, unless the flow has stopped. */
	function at(time: number, action: () => void): void {
		timer.at(time, () => {
			if (!stopped) action();
		});
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
		const placed: CoverageReading = {
			time: songTime(audioTime),
			frequency: reading.frequency,
			clarity: reading.clarity,
			level: reading.level,
		};
		try {
			if (after) {
				current.watch.push(
					placed.time,
					passesChecks(placed, (listen as TimedListen).coverage.checks),
				);
				// What comes after the last note is for the overrun lane, not the result.
				if (placed.time > lastEndMs) current.kept.push(placed);
			}
			const inSong = !after || placed.time <= lastEndMs;
			current.run.pushEnvelope(
				(reading.envelope ?? [])
					.map((block) => ({
						time: songTime(block.time),
						level: block.level,
					}))
					.filter((block) => !after || block.time <= lastEndMs),
			);
			if (inSong) current.run.pushReading(placed);
		} catch {
			// A scoring that fails leaves the song playing in time and unscored.
			scoring = null;
		}
		overrunCheck?.();
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
		overrun = false;
		overrunCheck = null;
		if (listen && listening === "running") {
			try {
				const timeline = buildTimeline(song, tempo);
				scoring = {
					run: createCoverageRun(timeline, listen.coverage),
					timeline,
					firstSlot,
					lagMs: scoringLagMs(readOutputLatency()),
					watch: createSilenceWatch(),
					kept: [],
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
		let ended = false;
		const summarise = (): void => {
			if (ended) return;
			ended = true;
			overrunCheck = null;
			cancel();
			let summary: CoverageResult | null = null;
			let analysis: Analysis | null = null;
			let scored: Progress | null = null;
			const current = scoring;
			try {
				summary = current?.run.finish() ?? null;
			} catch {
				// A scoring that fails to finish leaves nothing to report.
			}
			if (current && summary) {
				try {
					scored = current.run.progress();
					analysis = analyse({
						song,
						tempo,
						timeline: current.timeline,
						segments: scored.segments,
						result: summary,
					});
				} catch {
					// An analysis that fails leaves the summary alone.
				}
			}
			const overrunReadings = after && current ? current.kept : [];
			scoring = null;
			overrun = false;
			phase = "summary";
			emit(last, { summary, analysis, scored, overrunReadings });
		};
		const show = (index: number): void => {
			phase = "playing";
			countBeat = null;
			scheduleBeats(
				(boundaries[index] as number) + METRONOME_LOOKAHEAD_SECONDS,
			);
			emit(index);
			at(boundaries[index] as number, () => {
				if (index < last) {
					show(index + 1);
					return;
				}
				const current = scoring;
				if (!current) {
					summarise();
					return;
				}
				const lagEnd = songEnd + current.lagMs / 1000;
				if (!after) {
					at(lagEnd, summarise);
					return;
				}
				// Scoring after the song keeps listening until the player stops.
				overrun = true;
				emit(index);
				at(lagEnd, () => {
					if (!scoring || scoring.watch.silentMs() >= OVERRUN_SILENCE_MS) {
						summarise();
						return;
					}
					overrunCheck = () => {
						if (scoring && scoring.watch.silentMs() >= OVERRUN_SILENCE_MS) {
							summarise();
						}
					};
					at(lagEnd + OVERRUN_CAP_MS / 1000, summarise);
				});
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
			overrun = false;
			emit(0);
		},
		step() {
			if (stopped || opening) return;
			if (phase === "ready" || phase === "summary") begin();
		},
		progress: () => (after ? null : (scoring?.run.progress() ?? null)),
		reading: () => latest,
		stop() {
			stopped = true;
			attempt++;
			scoring = null;
			overrun = false;
			overrunCheck = null;
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
