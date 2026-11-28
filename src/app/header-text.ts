import { type DroppedTune, isDroppedTune } from "../abc";
import { MIN_GRADED_MS } from "../core/coverage";
import type { Settings } from "../core/settings";
import { DEFAULT_TEMPO, type Song } from "../core/song";
import { chosenTune } from "./song-form";

/** "♩ = N" for a tempo in quarter notes per minute, rounded to a whole number. */
export function tempoText(quartersPerMinute: number): string {
	return `♩ = ${Math.round(quartersPerMinute)}`;
}

/**
 * The title the header shows, or null: it needs Song mode and a titled song.
 * Flashcards show none, and nothing shows while Settings is open. The tempo is
 * the header's tempo list (`tempoChoice`).
 */
export function headerSong(
	settings: Settings,
	song: Song | null,
	open: boolean,
): { title: string | null } {
	if (open) return { title: null };
	return {
		title: settings.mode === "song" && song?.title ? song.title : null,
	};
}

/** The tune's own tempo: its `Q:` line, or the default. */
export function tuneTempo(song: Song): number {
	return song.tempo ?? DEFAULT_TEMPO;
}

/** Two tempos are the same entry when they differ by no more than this. */
const TEMPO_EPSILON = 1e-9;
const TEMPO_STEP = 5;
const TEMPO_FLOOR = 30;

export interface TempoEntry {
	value: number;
	label: string;
	/** The tune's own tempo. */
	own: boolean;
}

/**
 * The tempos the header's list offers: every multiple of 5 from half the tune's
 * tempo (rounded up, at least 30) to 1.5 times it (rounded down), none above
 * the tempo where the shortest note lasts `MIN_GRADED_MS`, and the tune's own
 * tempo in its place, marked "(tune)" and kept even past the cap.
 */
export function tempoEntries(song: Song): TempoEntry[] {
	const own = tuneTempo(song);
	const shortest = song.notes.reduce(
		(least, note) => Math.min(least, note.beats),
		Number.POSITIVE_INFINITY,
	);
	const cap = (shortest * 60000) / MIN_GRADED_MS;
	const from = Math.max(
		TEMPO_FLOOR,
		Math.ceil(own / 2 / TEMPO_STEP - TEMPO_EPSILON) * TEMPO_STEP,
	);
	const to = Math.floor((1.5 * own) / TEMPO_STEP + TEMPO_EPSILON) * TEMPO_STEP;
	const entries: TempoEntry[] = [];
	for (let n = from; n <= to; n += TEMPO_STEP) {
		if (n > cap + TEMPO_EPSILON) break;
		if (Math.abs(n - own) <= TEMPO_EPSILON) continue;
		entries.push({ value: n, label: tempoText(n), own: false });
	}
	const at = entries.findIndex((e) => e.value > own);
	entries.splice(at < 0 ? entries.length : at, 0, {
		value: own,
		label: `${tempoText(own)} (tune)`,
		own: true,
	});
	return entries;
}

/** The tempo in use: the saved one when it is an entry of the tune's list, else the tune's own. */
export function chosenTempo(song: Song, songTempo: number | null): number {
	if (songTempo === null) return tuneTempo(song);
	const hit = tempoEntries(song).find(
		(e) => Math.abs(e.value - songTempo) <= TEMPO_EPSILON,
	);
	return hit ? hit.value : tuneTempo(song);
}

/** The song with the tempo played: itself when that is its own, else a copy with `tempo` replaced. */
export function withTempo<T extends Song | null>(
	song: T,
	tempo: number | null,
): T {
	if (song === null || tempo === null || tempo === tuneTempo(song)) return song;
	return { ...song, tempo };
}

/**
 * The header's tempo list: null while Settings is open, outside Song mode or
 * with no song; greyed out while a timed run is counting in, playing or
 * listening past the end. `selected` is the chosen entry's index.
 */
export function tempoChoice({
	settings,
	song,
	open,
	phase,
}: {
	settings: Settings;
	song: Song | null;
	open: boolean;
	phase: "ready" | "playing" | "summary" | undefined;
}): { entries: TempoEntry[]; selected: number; disabled: boolean } | null {
	if (open || settings.mode !== "song" || song === null) return null;
	const entries = tempoEntries(song);
	const value = chosenTempo(song, settings.songTempo);
	return {
		entries,
		selected: Math.max(
			0,
			entries.findIndex((e) => e.value === value),
		),
		disabled: phase === "playing",
	};
}

/** The settings with the tempo at this entry chosen (null for the tune's own); null when it already is. */
export function chooseTempo(
	settings: Settings,
	song: Song,
	index: number,
): Settings | null {
	const entries = tempoEntries(song);
	const entry = entries[index];
	if (!entry) return null;
	const current = chosenTempo(song, settings.songTempo);
	if (Math.abs(entry.value - current) <= TEMPO_EPSILON) return null;
	return { ...settings, songTempo: entry.own ? null : entry.value };
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
export function tuneLabels(tunes: (Song | DroppedTune)[]): string[] {
	return tunes.map((tune, i) =>
		isDroppedTune(tune)
			? tune.title || `Tune ${i + 1}`
			: (tune.title ?? `Tune ${i + 1}`),
	);
}

/**
 * The header's tune list: null while Settings is open, outside Song mode or
 * with fewer than two tunes; greyed out while a timed run is counting in,
 * playing or listening past the end. `selected` is the chosen tune's 0-based
 * index; `dropped` flags the entries that cannot be chosen.
 */
export function tuneChoice({
	settings,
	tunes,
	open,
	phase,
}: {
	settings: Settings;
	tunes: (Song | DroppedTune)[];
	open: boolean;
	phase: "ready" | "playing" | "summary" | undefined;
}): {
	labels: string[];
	dropped: boolean[];
	selected: number;
	disabled: boolean;
} | null {
	if (open || settings.mode !== "song" || tunes.length < 2) return null;
	const chosen = chosenTune(tunes, settings.songTune);
	return {
		labels: tuneLabels(tunes),
		dropped: tunes.map(isDroppedTune),
		selected: Math.max(0, chosen === null ? 0 : tunes.indexOf(chosen)),
		disabled: phase === "playing",
	};
}
