import type { Pitch } from "../core/pitch";
import {
	countIn,
	DEFAULT_TEMPO,
	type PlaybackTone,
	playbackSchedule,
	type Song,
} from "../core/song";
import { CLOCK_EPSILON, createClockTimer } from "./clock-timer";
import { LEAD_SECONDS, METRONOME_LOOKAHEAD_SECONDS } from "./timed-flow";

/** Where the song's playback stands: one bar of count-in, then the notes. */
export interface PlaybackState {
	phase: "count-in" | "playing";
	/** The sounding note's index: 0 through the count-in, -1 during a written rest. */
	index: number;
	/** The flow clock's seconds at the first note's start, song time 0. */
	origin: number;
}

/** Beats closer than this count as touching, as in the song module. */
const BEAT_EPSILON = 1e-3;

/**
 * When the sounding note changes, in ms from the first note's start and in
 * time order: each note's index at its start, and -1 at the written end of a
 * note followed by a rest, until the next note starts. Repeated and slurred
 * notes change at the next start with no -1 between.
 */
export function soundingChanges(
	song: Song,
	tempo: number,
): { atMs: number; index: number }[] {
	const changes: { atMs: number; index: number }[] = [];
	song.notes.forEach((note, i) => {
		changes.push({ atMs: (note.start * 60000) / tempo, index: i });
		const next = song.notes[i + 1];
		const end = note.start + note.beats;
		if (next && next.start - end > BEAT_EPSILON) {
			changes.push({ atMs: (end * 60000) / tempo, index: -1 });
		}
	});
	return changes;
}

export interface PlaybackFlowOptions {
	song: Song;
	/** The clock the flow keeps time on, in seconds: the audio clock, or the page clock without audio. */
	clock: { now(): number };
	/** Plays clicks on that clock; null keeps the flow silent but in time. */
	clicker: { click(atSeconds: number): void; stop(): void } | null;
	/** Plays the song's tones on that clock; null keeps the flow silent but in time. */
	tones: {
		schedule(pitch: Pitch, atSeconds: number, seconds: number): void;
		stop(): void;
	} | null;
	/** The sounding pitch for a written one. */
	sounding: (written: Pitch) => Pitch;
	/** Click on every beat while the song plays, continuing the count-in's grid. */
	metronome: boolean;
	onChange: (state: PlaybackState) => void;
	/** Called once, at the last note's written end. */
	onEnd: () => void;
}

export interface PlaybackFlow {
	/** Click the count-in bar, then play the song. */
	start(): void;
	/** Stop every click and tone at once; nothing more is emitted or ended. */
	stop(): void;
}

export function createPlaybackFlow(options: PlaybackFlowOptions): PlaybackFlow {
	const { song, clock, clicker, tones, sounding, metronome } = options;
	const timer = createClockTimer(clock);
	let stopped = false;

	function start(): void {
		stopped = false;
		const tempo = song.tempo ?? DEFAULT_TEMPO;
		const bar = countIn(song.meter, tempo);
		const t0 = clock.now() + LEAD_SECONDS;
		for (let i = 0; i < bar.beats; i++) {
			clicker?.click(t0 + (i * bar.beatMs) / 1000);
		}
		// A pickup still gets the whole bar of count-in.
		const firstSlot = t0 + (bar.beats * bar.beatMs) / 1000;
		const schedule: PlaybackTone[] = playbackSchedule(song, DEFAULT_TEMPO);
		const last = schedule[schedule.length - 1] as PlaybackTone;
		const songEnd = firstSlot + last.endMs / 1000;
		const startOf = (tone: PlaybackTone) => firstSlot + tone.startMs / 1000;

		let nextTone = 0;
		let nextBeat = 0;
		/** Schedule the tones and beats that fall up to `upTo`, a batch at a time. */
		const scheduleUpTo = (upTo: number): void => {
			for (; nextTone < schedule.length; nextTone++) {
				const tone = schedule[nextTone] as PlaybackTone;
				if (startOf(tone) > upTo) break;
				tones?.schedule(
					sounding(tone.pitch),
					startOf(tone),
					tone.lengthMs / 1000,
				);
			}
			if (!metronome) return;
			for (;;) {
				const time = firstSlot + (nextBeat * bar.beatMs) / 1000;
				if (time >= songEnd - CLOCK_EPSILON || time > upTo) return;
				clicker?.click(time);
				nextBeat++;
			}
		};

		const guard = (action: () => void) => () => {
			if (!stopped) action();
		};
		const changes = soundingChanges(song, tempo);
		const change = (k: number): void => {
			const { index } = changes[k] as { atMs: number; index: number };
			// Batches go out at note starts.
			const tone = schedule[index];
			if (tone) scheduleUpTo(startOf(tone) + METRONOME_LOOKAHEAD_SECONDS);
			options.onChange({ phase: "playing", index, origin: firstSlot });
			const next = changes[k + 1];
			if (next) {
				timer.at(
					firstSlot + next.atMs / 1000,
					guard(() => change(k + 1)),
				);
			} else {
				timer.at(songEnd, guard(options.onEnd));
			}
		};

		options.onChange({ phase: "count-in", index: 0, origin: firstSlot });
		scheduleUpTo(firstSlot + METRONOME_LOOKAHEAD_SECONDS);
		timer.at(
			firstSlot + (changes[0] as { atMs: number }).atMs / 1000,
			guard(() => change(0)),
		);
	}

	return {
		start,
		stop() {
			stopped = true;
			timer.cancel();
			clicker?.stop();
			tones?.stop();
		},
	};
}
