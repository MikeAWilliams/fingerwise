import type { Instrument } from "../instrument";
import type { Pitch } from "../pitch";

export class SongError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "SongError";
	}
}

/** A note to play: its pitch, where it starts and how long it is, in quarter-note beats. */
export interface SongNote {
	readonly pitch: Pitch;
	/** Counted from the first note's start. */
	readonly start: number;
	readonly beats: number;
	/** Slurred to the next played note: the two sound as one. A missing flag means not slurred. */
	readonly slurred?: boolean;
}

/** A time signature: the top and bottom numbers. */
export interface Meter {
	readonly beats: number;
	readonly unit: number;
}

/** Quarter notes per minute used when a tune has no tempo. */
export const DEFAULT_TEMPO = 90;

/** The meter used when a tune has none. */
export const DEFAULT_METER: Meter = { beats: 4, unit: 4 };

/** A tune as the notes to play, in order, with its tempo and meter. */
export interface Song {
	readonly notes: readonly SongNote[];
	/** The pitches of `notes`, for code that ignores rhythm. */
	readonly pitches: readonly Pitch[];
	/** Quarter notes per minute, or null when the tune gives none. */
	readonly tempo: number | null;
	readonly meter: Meter;
	/**
	 * Beats from the first note's start to the first bar line: shorter than a
	 * bar for a pickup, a whole bar when the first note starts one.
	 */
	readonly firstBar: number;
	/** The tune's title, for display only; nothing in the core reads it. */
	readonly title?: string;
}

/** A pitch outside the instrument's written range. */
export interface OutOfRange {
	index: number;
	pitch: Pitch;
	side: "below" | "above";
}

function positive(n: number): boolean {
	return Number.isFinite(n) && n > 0;
}

/** Quarter-note beats in one bar of `meter`. */
export function barBeats(meter: Meter): number {
	return (meter.beats * 4) / meter.unit;
}

/**
 * Throws `SongError` for an empty list, a tempo, length, meter number or first
 * bar that is not finite and positive, or starts that decrease. The first bar
 * defaults to a whole bar, the title is kept only when given and a note's `slurred` to false. The list is copied.
 */
export function createSong(
	notes: readonly SongNote[],
	{
		tempo,
		meter,
		firstBar,
		title,
	}: { tempo: number | null; meter: Meter; firstBar?: number; title?: string },
): Song {
	if (notes.length === 0) throw new SongError("a song needs at least one note");
	if (tempo !== null && !positive(tempo))
		throw new SongError("the tempo must be a positive number");
	if (!positive(meter.beats) || !positive(meter.unit))
		throw new SongError("the meter numbers must be positive");
	if (firstBar !== undefined && !positive(firstBar))
		throw new SongError("the first bar must be a positive length");
	let previous = Number.NEGATIVE_INFINITY;
	for (const note of notes) {
		if (!positive(note.beats))
			throw new SongError("a note's length must be a positive number");
		if (!Number.isFinite(note.start) || note.start < previous)
			throw new SongError("note starts must not decrease");
		previous = note.start;
	}
	const copy = notes.map((n) => ({ ...n, slurred: n.slurred ?? false }));
	return {
		notes: copy,
		pitches: copy.map((n) => n.pitch),
		tempo,
		meter: { ...meter },
		firstBar: firstBar ?? barBeats(meter),
		...(title === undefined ? {} : { title }),
	};
}

/**
 * Each note's slot in ms: from its start to the next note's start, so a rest's
 * time goes to the note before it; the last note's slot is its own length.
 * `fallbackTempo` applies when the song has no tempo. Not rounded.
 */
export function songSlotsMs(song: Song, fallbackTempo: number): number[] {
	const tempo = song.tempo ?? fallbackTempo;
	return song.notes.map((note, i) => {
		const next = song.notes[i + 1];
		const beats = next ? next.start - note.start : note.beats;
		return (beats * 60000) / tempo;
	});
}

/**
 * The count-in before a timed song: how many clicks and how long each is.
 * 6/8, 9/8 and 12/8 count dotted quarters; other meters count their bottom note.
 */
export function countIn(
	meter: Meter,
	tempo: number,
): { beats: number; beatMs: number } {
	const { beats, quarters } = countInBeats(meter);
	return { beats, beatMs: (quarters * 60000) / tempo };
}

/** The count-in's beats per bar and each beat's length in quarter notes, whatever the tempo. */
export function countInBeats(meter: Meter): {
	beats: number;
	quarters: number;
} {
	const compound = meter.unit === 8 && [6, 9, 12].includes(meter.beats);
	return {
		beats: compound ? meter.beats / 3 : meter.beats,
		quarters: compound ? 1.5 : 4 / meter.unit,
	};
}

/** Beats closer than this count as the same time, as abcjs rounds its starts. */
const BEAT_EPSILON = 1e-3;

/** The most a plain join shortens a tone, in ms, so repeated notes are heard apart. */
export const JOIN_GAP_MS = 50;

/** One tone of the song played back: when it starts and how long it sounds, in ms. */
export interface PlaybackTone {
	/** The written pitch; the caller applies the instrument's transposition. */
	readonly pitch: Pitch;
	/** From the first note's start. */
	readonly startMs: number;
	readonly lengthMs: number;
	/** The note's written end: its start plus its written length. */
	readonly endMs: number;
}

/**
 * One tone per note, as an ocarina player tongues it: a note slurred to a
 * note that starts at its written end sounds its full length, and every other
 * note ends `JOIN_GAP_MS` early (less for a very short note, at most a quarter
 * of it), so repeats are heard apart and nothing sounds in a rest.
 * `fallbackTempo` applies when the song has no tempo. Not rounded.
 */
export function playbackSchedule(
	song: Song,
	fallbackTempo: number,
): PlaybackTone[] {
	const tempo = song.tempo ?? fallbackTempo;
	return song.notes.map((note, i) => {
		const next = song.notes[i + 1];
		const writtenMs = (note.beats * 60000) / tempo;
		const joined =
			note.slurred === true &&
			next !== undefined &&
			Math.abs(next.start - (note.start + note.beats)) < BEAT_EPSILON;
		return {
			pitch: note.pitch,
			startMs: (note.start * 60000) / tempo,
			lengthMs: joined
				? writtenMs
				: writtenMs - Math.min(JOIN_GAP_MS, writtenMs / 4),
			endMs: ((note.start + note.beats) * 60000) / tempo,
		};
	});
}

/** Part of a bar: a note, or the piece of one that falls in this bar, or a rest. */
export type BarItem =
	| {
			kind: "note";
			/** The note's index in the song. */
			index: number;
			pitch: Pitch;
			beats: number;
			/** The note goes on past this piece, into the next bar. */
			tied: boolean;
	  }
	| { kind: "rest"; beats: number };

export interface Bar {
	/** Where the bar starts, in beats from the first note's start. */
	readonly start: number;
	readonly items: readonly BarItem[];
}

/**
 * The song cut into bars at its bar lines: the first bar is `firstBar` long, the
 * rest a whole bar each. A note over a bar line is split into tied pieces, and
 * the time between notes becomes rests. The last bar ends with the last note.
 */
export function songBars(song: Song): Bar[] {
	const bar = barBeats(song.meter);
	const lastNote = song.notes[song.notes.length - 1] as SongNote;
	const end = lastNote.start + lastNote.beats;
	const bars: Bar[] = [];
	let next = 0;
	for (let start = 0; start < end - BEAT_EPSILON; ) {
		const stop = Math.min(bars.length === 0 ? song.firstBar : start + bar, end);
		const items: BarItem[] = [];
		let at = start;
		const rest = (until: number) => {
			if (until - at > BEAT_EPSILON)
				items.push({ kind: "rest", beats: until - at });
			at = Math.max(at, until);
		};
		// The note that started in an earlier bar and goes on into this one.
		const from = next > 0 ? next - 1 : 0;
		for (let i = from; i < song.notes.length; i++) {
			const note = song.notes[i] as SongNote;
			const noteEnd = note.start + note.beats;
			if (note.start >= stop - BEAT_EPSILON) break;
			if (noteEnd <= at + BEAT_EPSILON) continue;
			rest(note.start);
			const pieceEnd = Math.min(noteEnd, stop);
			items.push({
				kind: "note",
				index: i,
				pitch: note.pitch,
				beats: pieceEnd - at,
				tied: noteEnd > stop + BEAT_EPSILON,
			});
			at = pieceEnd;
			next = i + 1;
		}
		rest(stop);
		bars.push({ start, items });
		start = stop;
	}
	return bars;
}

/** The song's bars in lines of `barsPerLine` (the last line may be shorter). */
export function songLines(song: Song, barsPerLine: number): Bar[][] {
	const bars = songBars(song);
	const lines: Bar[][] = [];
	for (let i = 0; i < bars.length; i += barsPerLine) {
		lines.push(bars.slice(i, i + barsPerLine));
	}
	return lines;
}

/** Every note outside the instrument's written range, in song order. Empty when the song fits. */
export function songOutOfRange(
	song: Song,
	instrument: Instrument,
): OutOfRange[] {
	const result: OutOfRange[] = [];
	song.pitches.forEach((pitch, index) => {
		if (pitch < instrument.lowest) result.push({ index, pitch, side: "below" });
		else if (pitch > instrument.highest)
			result.push({ index, pitch, side: "above" });
	});
	return result;
}
