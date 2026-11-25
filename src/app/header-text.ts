import type { Settings } from "../core/settings";
import { DEFAULT_TEMPO, type Song } from "../core/song";
import { chosenTune } from "./song-form";

/** "♩ = N" for a tempo in quarter notes per minute, rounded to a whole number. */
export function tempoText(quartersPerMinute: number): string {
	return `♩ = ${Math.round(quartersPerMinute)}`;
}

/**
 * The title and tempo the header shows, each null when it shows nothing. The
 * title needs Song mode and a titled song; the tempo needs a song and Song
 * mode (either practice) or the song playing, and falls back to the default
 * tempo. Flashcards show neither. Nothing shows while Settings is open.
 */
export function headerSong(
	settings: Settings,
	song: Song | null,
	open: boolean,
	playing = false,
): { title: string | null; tempo: string | null } {
	if (open) return { title: null, tempo: null };
	return {
		title: settings.mode === "song" && song?.title ? song.title : null,
		tempo:
			(settings.mode === "song" || playing) && song !== null
				? tempoText(song.tempo ?? DEFAULT_TEMPO)
				: null,
	};
}

export const PLAY_SONG_TEXT = "Play song";
export const STOP_TEXT = "Stop";

/**
 * The header's Play song button: absent while Settings is open, outside Song
 * mode, a valid song or Web Audio; "Stop" while the song plays; greyed out
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
	if (open || settings.mode !== "song" || song === null || !webAudio)
		return null;
	return {
		icon: playing ? "■" : "▶",
		text: playing ? STOP_TEXT : PLAY_SONG_TEXT,
		disabled: !playing && phase === "playing",
	};
}

/** Each tune's title, or "Tune N" (its position) when it has none, in text order. */
export function tuneLabels(tunes: Song[]): string[] {
	return tunes.map((tune, i) => tune.title ?? `Tune ${i + 1}`);
}

/**
 * The header's tune list: null while Settings is open, outside Song mode or
 * with fewer than two tunes; greyed out while a timed run is counting in,
 * playing or listening past the end. `selected` is the chosen tune's 0-based
 * index.
 */
export function tuneChoice({
	settings,
	tunes,
	open,
	phase,
}: {
	settings: Settings;
	tunes: Song[];
	open: boolean;
	phase: "ready" | "playing" | "summary" | undefined;
}): { labels: string[]; selected: number; disabled: boolean } | null {
	if (open || settings.mode !== "song" || tunes.length < 2) return null;
	const chosen = chosenTune(tunes, settings.songTune);
	return {
		labels: tuneLabels(tunes),
		selected: Math.max(0, chosen === null ? 0 : tunes.indexOf(chosen)),
		disabled: phase === "playing",
	};
}
