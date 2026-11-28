import defaultsJson from "../../data/settings/defaults.json";
import {
	type AbcProblem,
	type AbcResult,
	type DroppedTune,
	isDroppedTune,
	MAX_ABC_CHARS,
} from "../abc";
import type { Settings } from "../core/settings";
import { DEFAULT_TEMPO, type Song } from "../core/song";

/** What the app holds of the player's song, apart from the saved text. */
export interface SongState {
	/** The tunes of the last good text, in text order (dropped tunes in their places); empty when none passes. */
	tunes: (Song | DroppedTune)[];
	/** The validator's summary of that text, such as "21 notes, 2 flats converted to sharps". */
	summary: string | null;
	/** Problems with the saved text, from the load-time parse. */
	problems: AbcProblem[];
}

export const NO_SONG: SongState = { tunes: [], summary: null, problems: [] };

/** Shown after a file was loaded but its last tunes did not fit (F17-S02). */
export function fileCutMessage(loaded: number, total: number): string {
	return `The file was too long: tunes 1 to ${loaded} of ${total} were loaded.`;
}

export const NO_TUNE_IN_FILE = "No tune in the file could be loaded.";
export const FIRST_TUNE_TOO_LONG = `The first tune is longer than ${MAX_ABC_CHARS.toLocaleString("en-US")} characters.`;
export const FILE_UNREADABLE = "The file could not be read.";

function plural(n: number, one: string, many: string): string {
	return `${n} ${n === 1 ? one : many}`;
}

/** The 1-based position of the first tune that passed, or 1 when none did. */
export function firstPassing(tunes: (Song | DroppedTune)[]): number {
	const i = tunes.findIndex((t) => !isDroppedTune(t));
	return i < 0 ? 1 : i + 1;
}

/**
 * The 1-based position that is chosen: the saved one when the text has that
 * many tunes, else 1 (ADR 0010); a dropped tune cannot be chosen, so then the
 * first tune that passed.
 */
export function tunePosition(
	tunes: (Song | DroppedTune)[],
	position: number,
): number {
	const at = position >= 1 && position <= tunes.length ? position : 1;
	const tune = tunes[at - 1];
	return tune !== undefined && isDroppedTune(tune) ? firstPassing(tunes) : at;
}

/** The chosen tune: the one at `tunePosition`, or none when there are no tunes. */
export function chosenTune(
	tunes: (Song | DroppedTune)[],
	position: number,
): Song | null {
	const tune = tunes[tunePosition(tunes, position) - 1];
	return tune === undefined || isDroppedTune(tune) ? null : tune;
}

/**
 * "21 notes, 2 flats converted to sharps"; "1 note, 1 flat converted to a sharp";
 * with several tunes, "3 tunes, 40 notes"; with dropped ones, "3 tunes (1 not loaded), 40 notes".
 */
export function songSummary(
	notes: number,
	converted: number,
	tunes = 1,
	dropped = 0,
): string {
	const count =
		(tunes > 1
			? `${plural(tunes, "tune", "tunes")}${dropped > 0 ? ` (${dropped} not loaded)` : ""}, `
			: "") + plural(notes, "note", "notes");
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
	let dropped = 0;
	for (const tune of result.tunes) {
		if (isDroppedTune(tune)) {
			dropped++;
			continue;
		}
		notes += tune.notes;
		converted += tune.converted;
	}
	return songSummary(notes, converted, result.tunes.length, dropped);
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
		tunes: result.tunes.map((t) => (isDroppedTune(t) ? t : t.song)),
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
 * changes nothing but the problems shown. An empty text clears the song
 * and leaves the mode alone; `result` is not looked at then (it may be null).
 */
export function applySongText(
	settings: Settings,
	text: string,
	result: AbcResult | null,
): SongEdit {
	if (isEmptySong(text)) {
		return {
			settings: { ...settings, songAbc: "", songTune: 1, songTempo: null },
			state: NO_SONG,
			problems: [],
		};
	}
	if (result?.ok) {
		const state = songStateFrom(result);
		return {
			settings: {
				...settings,
				songAbc: text,
				songTune: tunePosition(state.tunes, settings.songTune),
				songTempo: null,
			},
			state,
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
		: { ...settings, songTune: position, songTempo: null };
}

/** One line of the Song section's values, shown while it is closed: the song's summary and bars per line. */
export function songSectionSummary(
	settings: Settings,
	state: SongState,
): string {
	const bars = plural(settings.barsPerLine, "bar", "bars");
	return state.summary === null
		? `no song, ${bars} per line`
		: `${state.summary}, ${bars} per line`;
}

/** The default song, also shown greyed in the empty box so the format is clear. */
export const SONG_EXAMPLE: string = defaultsJson.songAbc;
