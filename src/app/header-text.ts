import { keepTempoApplies, type Settings } from "../core/settings";
import { DEFAULT_TEMPO, type Song } from "../core/song";

/** "♩ = N" for a tempo in quarter notes per minute, rounded to a whole number. */
export function tempoText(quartersPerMinute: number): string {
	return `♩ = ${Math.round(quartersPerMinute)}`;
}

/**
 * The title and tempo the header shows, each null when it shows nothing. The
 * title needs use song and a titled song; the tempo needs keep tempo and a
 * song, and falls back to the default tempo; while the song plays, the tempo
 * shows even without keep tempo. Nothing shows while Settings is open.
 */
export function headerSong(
	settings: Settings,
	song: Song | null,
	open: boolean,
	playing = false,
): { title: string | null; tempo: string | null } {
	if (open) return { title: null, tempo: null };
	return {
		title: settings.useSong && song?.title ? song.title : null,
		tempo:
			(keepTempoApplies(settings) || playing) && song !== null
				? tempoText(song.tempo ?? DEFAULT_TEMPO)
				: null,
	};
}

export const PLAY_SONG_TEXT = "Play song";
export const STOP_TEXT = "Stop";

/**
 * The header's Play song button: absent while Settings is open, without use
 * song, a valid song or Web Audio; "Stop" while the song plays; greyed out
 * while a timed run is counting in, playing or listening past the end. Play
 * note does not matter.
 */
export function playButton({
	settings,
	song,
	open,
	webAudio,
	playing,
	phase,
}: {
	settings: Settings;
	song: Song | null;
	open: boolean;
	webAudio: boolean;
	playing: boolean;
	phase: "ready" | "playing" | "summary" | undefined;
}): { icon: string; text: string; disabled: boolean } | null {
	if (open || !settings.useSong || song === null || !webAudio) return null;
	return {
		icon: playing ? "■" : "▶",
		text: playing ? STOP_TEXT : PLAY_SONG_TEXT,
		disabled: !playing && phase === "playing",
	};
}
