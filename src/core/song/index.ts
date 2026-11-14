import type { Instrument } from "../instrument";
import type { Pitch } from "../pitch";

export class SongError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "SongError";
	}
}

/** A tune as the notes to play, in order. */
export interface Song {
	readonly pitches: readonly Pitch[];
}

/** A pitch outside the instrument's written range. */
export interface OutOfRange {
	index: number;
	pitch: Pitch;
	side: "below" | "above";
}

/** Throws `SongError` for an empty list. The list is copied. */
export function createSong(pitches: readonly Pitch[]): Song {
	if (pitches.length === 0)
		throw new SongError("a song needs at least one note");
	return { pitches: [...pitches] };
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
