import { keepTempoApplies, type Settings } from "../core/settings";
import { DEFAULT_TEMPO, type Song } from "../core/song";

/** "♩ = N" for a tempo in quarter notes per minute, rounded to a whole number. */
export function tempoText(quartersPerMinute: number): string {
	return `♩ = ${Math.round(quartersPerMinute)}`;
}

/**
 * The title and tempo the header shows, each null when it shows nothing. The
 * title needs use song and a titled song; the tempo needs keep tempo and a
 * song, and falls back to the default tempo. Nothing shows while Settings is open.
 */
export function headerSong(
	settings: Settings,
	song: Song | null,
	open: boolean,
): { title: string | null; tempo: string | null } {
	if (open) return { title: null, tempo: null };
	return {
		title: settings.useSong && song?.title ? song.title : null,
		tempo:
			keepTempoApplies(settings) && song !== null
				? tempoText(song.tempo ?? DEFAULT_TEMPO)
				: null,
	};
}
