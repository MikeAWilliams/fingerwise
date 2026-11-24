import defaultsJson from "../../data/settings/defaults.json";
import type { AbcProblem, AbcResult } from "../abc";
import { type Settings, scoringAfterApplies } from "../core/settings";
import { DEFAULT_TEMPO, type Song } from "../core/song";

/** What the app holds of the player's song, apart from the saved text. */
export interface SongState {
	/** The tunes of the last good text, in text order; empty when none passes. */
	tunes: Song[];
	/** The validator's summary of that text, such as "21 notes, 2 flats converted to sharps". */
	summary: string | null;
	/** Problems with the saved text, from the load-time parse. */
	problems: AbcProblem[];
}

export const NO_SONG: SongState = { tunes: [], summary: null, problems: [] };

function plural(n: number, one: string, many: string): string {
	return `${n} ${n === 1 ? one : many}`;
}

/** The chosen tune: the one at the 1-based position, else the first, else none. */
export function chosenTune(tunes: Song[], position: number): Song | null {
	return tunes[position - 1] ?? tunes[0] ?? null;
}

/**
 * "21 notes, 2 flats converted to sharps"; "1 note, 1 flat converted to a sharp";
 * with several tunes, "3 tunes, 40 notes".
 */
export function songSummary(
	notes: number,
	converted: number,
	tunes = 1,
): string {
	const count =
		(tunes > 1 ? `${plural(tunes, "tune", "tunes")}, ` : "") +
		plural(notes, "note", "notes");
	if (converted === 0) return count;
	const what =
		converted === 1
			? "1 flat converted to a sharp"
			: `${converted} flats converted to sharps`;
	return `${count}, ${what}`;
}

/** "Line 3, note 7: message", or with a column, or the line alone; "Tune 3, line 12, note 7: ..." in a text of several tunes. */
export function problemLine(problem: AbcProblem): string {
	const where =
		problem.note !== undefined
			? `Line ${problem.line}, note ${problem.note}`
			: problem.column !== undefined
				? `Line ${problem.line}, column ${problem.column}`
				: `Line ${problem.line}`;
	const lead =
		problem.tune === undefined
			? where
			: `Tune ${problem.tune}, ${where.charAt(0).toLowerCase()}${where.slice(1)}`;
	return `${lead}: ${problem.message}`;
}

function summaryOf(result: Extract<AbcResult, { ok: true }>): string {
	let notes = 0;
	let converted = 0;
	for (const tune of result.tunes) {
		notes += tune.notes;
		converted += tune.converted;
	}
	return songSummary(notes, converted, result.tunes.length);
}

/** The validator's words for a result: one summary line, or one line per problem. */
export function songStatus(result: AbcResult): {
	ok: boolean;
	lines: string[];
} {
	if (result.ok) {
		return { ok: true, lines: [summaryOf(result)] };
	}
	return { ok: false, lines: result.problems.map(problemLine) };
}

/** Shown in the Song section while the held song has no `Q:` line. */
export const NO_TEMPO_NOTE = `No tempo in the tune, using ♩ = ${DEFAULT_TEMPO}`;

/** The state a passing result gives. */
export function songStateFrom(result: AbcResult): SongState {
	if (!result.ok) return { ...NO_SONG, problems: result.problems };
	return {
		tunes: result.tunes.map((t) => t.song),
		summary: summaryOf(result),
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
 * The effect of the text in the box. A passing text is saved, and keeps the
 * chosen tune when the text still has that many tunes (tune 1 otherwise). A failing text
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
			settings: { ...settings, songAbc: "", songTune: 1, useSong: false },
			state: NO_SONG,
			problems: [],
		};
	}
	if (result?.ok) {
		return {
			settings: {
				...settings,
				songAbc: text,
				songTune:
					result.tunes.length >= settings.songTune ? settings.songTune : 1,
			},
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

/** The settings with the tune at this 1-based position chosen; null when it already is. */
export function chooseTune(
	settings: Settings,
	position: number,
): Settings | null {
	return position === settings.songTune
		? null
		: { ...settings, songTune: position };
}

/** Whether the use song toggle may be turned on: only while a valid song is held. */
export function canUseSong(song: Song | null): boolean {
	return song !== null;
}

/** One line of the Song section's values, shown while it is closed. */
export function songSectionSummary(settings: Settings): string {
	if (!settings.useSong) return "off";
	if (!settings.keepTempo) return "on";
	return scoringAfterApplies(settings)
		? "on, keep tempo, scored after the song"
		: "on, keep tempo";
}

/** The default song, also shown greyed in the empty box so the format is clear. */
export const SONG_EXAMPLE: string = defaultsJson.songAbc;
