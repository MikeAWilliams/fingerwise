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

/**
 * Throws `SongError` for an empty list, a tempo, length or meter number that is
 * not finite and positive, or starts that decrease. The list is copied.
 */
export function createSong(
	notes: readonly SongNote[],
	{ tempo, meter }: { tempo: number | null; meter: Meter },
): Song {
	if (notes.length === 0) throw new SongError("a song needs at least one note");
	if (tempo !== null && !positive(tempo))
		throw new SongError("the tempo must be a positive number");
	if (!positive(meter.beats) || !positive(meter.unit))
		throw new SongError("the meter numbers must be positive");
	let previous = Number.NEGATIVE_INFINITY;
	for (const note of notes) {
		if (!positive(note.beats))
			throw new SongError("a note's length must be a positive number");
		if (!Number.isFinite(note.start) || note.start < previous)
			throw new SongError("note starts must not decrease");
		previous = note.start;
	}
	const copy = notes.map((n) => ({ ...n }));
	return {
		notes: copy,
		pitches: copy.map((n) => n.pitch),
		tempo,
		meter: { ...meter },
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
	const compound = meter.unit === 8 && [6, 9, 12].includes(meter.beats);
	const beats = compound ? meter.beats / 3 : meter.beats;
	const quarters = compound ? 1.5 : 4 / meter.unit;
	return { beats, beatMs: (quarters * 60000) / tempo };
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
