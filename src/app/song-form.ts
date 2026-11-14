import defaultsJson from "../../data/settings/defaults.json";
import type { AbcProblem, AbcResult } from "../abc";
import type { Settings } from "../core/settings";
import { DEFAULT_TEMPO, type Song } from "../core/song";

/** What the app holds of the player's song, apart from the saved text. */
export interface SongState {
	/** The last good song; null when none passes. */
	song: Song | null;
	/** The validator's summary of that song, such as "21 notes, 2 flats converted to sharps". */
	summary: string | null;
	/** Problems with the saved text, from the load-time parse. */
	problems: AbcProblem[];
}

export const NO_SONG: SongState = { song: null, summary: null, problems: [] };

function plural(n: number, one: string, many: string): string {
	return `${n} ${n === 1 ? one : many}`;
}

/** "21 notes, 2 flats converted to sharps"; "1 note, 1 flat converted to a sharp". */
export function songSummary(notes: number, converted: number): string {
	const count = plural(notes, "note", "notes");
	if (converted === 0) return count;
	const what =
		converted === 1
			? "1 flat converted to a sharp"
			: `${converted} flats converted to sharps`;
	return `${count}, ${what}`;
}

/** "Line 3, note 7: message", or with a column, or the line alone. */
export function problemLine(problem: AbcProblem): string {
	const where =
		problem.note !== undefined
			? `Line ${problem.line}, note ${problem.note}`
			: problem.column !== undefined
				? `Line ${problem.line}, column ${problem.column}`
				: `Line ${problem.line}`;
	return `${where}: ${problem.message}`;
}

/** The validator's words for a result: one summary line, or one line per problem. */
export function songStatus(result: AbcResult): {
	ok: boolean;
	lines: string[];
} {
	if (result.ok) {
		return { ok: true, lines: [songSummary(result.notes, result.converted)] };
	}
	return { ok: false, lines: result.problems.map(problemLine) };
}

/** Shown in the Song section while the held song has no `Q:` line. */
export const NO_TEMPO_NOTE = `No tempo in the tune, using ♩ = ${DEFAULT_TEMPO}`;

/** The state a passing result gives. */
export function songStateFrom(result: AbcResult): SongState {
	if (!result.ok) return { ...NO_SONG, problems: result.problems };
	return {
		song: result.song,
		summary: songSummary(result.notes, result.converted),
		problems: [],
	};
}

/** True when the box holds nothing but whitespace. */
export function isEmptySong(text: string): boolean {
	return text.trim() === "";
}

export interface SongEdit {
	settings: Settings;
	/** The new state; undefined means keep the last good song. */
	state: SongState | undefined;
	/** What to show now: the problems of a failing text, none otherwise. */
	problems: AbcProblem[];
}

/**
 * The effect of the text in the box. A passing text is saved. A failing text
 * changes nothing but the problems shown. An empty text clears the song and
 * turns use song off; `result` is not looked at then (it may be null).
 */
export function applySongText(
	settings: Settings,
	text: string,
	result: AbcResult | null,
): SongEdit {
	if (isEmptySong(text)) {
		return {
			settings: { ...settings, songAbc: "", useSong: false },
			state: NO_SONG,
			problems: [],
		};
	}
	if (result?.ok) {
		return {
			settings: { ...settings, songAbc: text },
			state: songStateFrom(result),
			problems: [],
		};
	}
	return {
		settings,
		state: undefined,
		problems: result ? result.problems : [],
	};
}

/** Whether the use song toggle may be turned on: only while a valid song is held. */
export function canUseSong(song: Song | null): boolean {
	return song !== null;
}

/** One line of the Song section's values, shown while it is closed. */
export function songSectionSummary(settings: Settings): string {
	return settings.useSong ? "on" : "off";
}

/** The default song, also shown greyed in the empty box so the format is clear. */
export const SONG_EXAMPLE: string = defaultsJson.songAbc;
