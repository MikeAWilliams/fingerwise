import type {
	AbcElement,
	AbcTune,
	AbcTunebook,
} from "abcjs/src/api/abc_tunebook.js";
import type { Instrument } from "../core/instrument";
import { formatPitch, type Pitch } from "../core/pitch";
import { MAX_SONG_CHARS } from "../core/settings";
import { createSong, type Song, songOutOfRange } from "../core/song";

export const MAX_ABC_CHARS = MAX_SONG_CHARS;
export const MAX_ABC_NOTES = 500;

/** Warnings and offenders listed before the rest are summed up. */
const MAX_LISTED = 10;

const FORBIDDEN_DECORATION = /^(d\.?[cs]\.?|dacapo|dacoda|fine|coda|segno)/i;

export interface AbcProblem {
	message: string;
	/** 1-based. */
	line: number;
	/** 1-based, counting written notes in text order (a chord is one, rests and grace notes are not). */
	note?: number;
	/** 1-based, within the line. */
	column?: number;
}

export type AbcResult =
	| { ok: true; song: Song; notes: number; converted: number }
	| { ok: false; problems: AbcProblem[] };

let loaded: Promise<AbcTunebook> | undefined;

// abcjs is CommonJS: Vitest hands over its exports, Vite wraps them in `default`.
function loadAbcjs(): Promise<AbcTunebook> {
	loaded ??= import("abcjs/src/api/abc_tunebook.js").then(
		(mod) => mod.default ?? (mod as unknown as AbcTunebook),
	);
	return loaded;
}

/** Line and column (both 1-based) of a character offset. */
export function locate(
	text: string,
	startChar: number,
): { line: number; column: number } {
	let line = 1;
	let lineStart = 0;
	for (let i = 0; i < startChar && i < text.length; i++) {
		if (text[i] === "\n") {
			line++;
			lineStart = i + 1;
		}
	}
	return { line, column: startChar - lineStart + 1 };
}

function noteElements(tune: AbcTune): AbcElement[] {
	const notes: AbcElement[] = [];
	for (const line of tune.lines) {
		for (const staff of line.staff ?? []) {
			for (const voice of staff.voices) {
				for (const el of voice) {
					if (el.el_type === "note" && el.rest === undefined && el.pitches) {
						notes.push(el);
					}
				}
			}
		}
	}
	return notes.sort((a, b) => (a.startChar ?? 0) - (b.startChar ?? 0));
}

function stripMarkup(html: string): string {
	return html
		.replace(/<[^>]*>/g, "")
		.replace(/&nbsp;/g, " ")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&amp;/g, "&")
		.trim();
}

/** abcjs warns as `Music Line:5:3: message`, with the line counted in the whole text. */
function warningProblem(warning: string): AbcProblem {
	const plain = stripMarkup(warning);
	const match = /^[^:]*:(\d+):(\d+):\s*([\s\S]*)$/.exec(plain);
	if (!match) return { message: plain, line: 1 };
	return {
		message: match[3] as string,
		line: Number(match[1]),
		column: Number(match[2]),
	};
}

function letterOf(name: string): string {
	return (/[A-Ga-g]/.exec(name)?.[0] ?? "").toUpperCase();
}

function structuralProblems(
	tune: AbcTune,
	positionOf: (startChar: number | undefined) => AbcProblem,
): { startChar: number; problem: AbcProblem }[] {
	const found: { startChar: number; problem: AbcProblem }[] = [];
	const add = (startChar: number | undefined, message: string) => {
		found.push({
			startChar: startChar ?? 0,
			problem: { ...positionOf(startChar), message },
		});
	};

	const notes = noteElements(tune);
	for (const el of notes) {
		if ((el.pitches?.length ?? 0) > 1) {
			add(el.startChar, "Chords are not supported; write one note at a time");
		}
		if (el.gracenotes) {
			add(el.startChar, "Grace notes are not supported; remove them");
		}
	}

	let secondVoice: number | undefined;
	let several = false;
	for (const line of tune.lines) {
		(line.staff ?? []).forEach((staff, s) => {
			staff.voices.forEach((voice, v) => {
				if (s === 0 && v === 0) return;
				several = true;
				const at = voice.find((el) => el.startChar !== undefined)?.startChar;
				if (
					at !== undefined &&
					(secondVoice === undefined || at < secondVoice)
				) {
					secondVoice = at;
				}
			});
		});
	}
	if (several) {
		add(secondVoice, "Only one voice is supported; keep a single melody line");
	}

	for (const line of tune.lines) {
		for (const staff of line.staff ?? []) {
			for (const voice of staff.voices) {
				for (const el of voice) {
					const bad = el.decoration?.find((d) => FORBIDDEN_DECORATION.test(d));
					if (bad) {
						add(
							el.startChar,
							`"${bad}" is not supported; write the repeat out in full`,
						);
					}
				}
			}
		}
	}

	return found.sort((a, b) => a.startChar - b.startChar);
}

/** Turn ABC text into a song of written pitches, or a list of problems. */
export async function parseAbc(
	rawText: string,
	instrument: Instrument,
): Promise<AbcResult> {
	if (rawText.length > MAX_ABC_CHARS) {
		return {
			ok: false,
			problems: [
				{
					message: `The text is longer than ${MAX_ABC_CHARS} characters`,
					line: 1,
				},
			],
		};
	}
	// Offsets abcjs reports are into this text, so locate against it too.
	const text = rawText.replace(/\r\n?/g, "\n");

	let tunes: AbcTune[];
	try {
		tunes = (await loadAbcjs()).parseOnly(text);
	} catch (error) {
		return { ok: false, problems: [thrownProblem(error)] };
	}

	if (tunes.length > 1) {
		const second = [...text.matchAll(/^X:/gm)][1];
		return {
			ok: false,
			problems: [
				{
					message: "Only one tune is supported; paste a single tune",
					line:
						second?.index === undefined ? 1 : locate(text, second.index).line,
				},
			],
		};
	}
	const tune = tunes[0];
	if (!tune) {
		return { ok: false, problems: [{ message: "No notes found", line: 1 }] };
	}

	const notes = noteElements(tune);
	const numberAt = new Map<number, number>();
	notes.forEach((el, i) => {
		if (el.startChar !== undefined) numberAt.set(el.startChar, i + 1);
	});
	const positionOf = (startChar: number | undefined): AbcProblem => {
		if (startChar === undefined) return { message: "", line: 1 };
		const { line, column } = locate(text, startChar);
		const note = numberAt.get(startChar);
		return note === undefined
			? { message: "", line, column }
			: { message: "", line, column, note };
	};

	const found = [
		...(tune.warnings ?? []).map((w) => warningProblem(w)),
		...structuralProblems(tune, positionOf).map((f) => f.problem),
	];
	if (found.length > 0) return { ok: false, problems: summed(found) };

	let events: { pitch: Pitch; startChar: number | undefined }[];
	try {
		const tracks = tune
			.setUpAudio({ chordsOff: true })
			.tracks.map((track) =>
				track.filter((e) => e.cmd === "note" && e.pitch !== undefined),
			)
			.filter((track) => track.length > 0);
		if (tracks.length > 1) {
			return {
				ok: false,
				problems: [
					{
						message: "Only one voice is supported; keep a single melody line",
						line: 1,
					},
				],
			};
		}
		events = (tracks[0] ?? []).map((e) => ({
			pitch: e.pitch as Pitch,
			startChar: e.startChar,
		}));
	} catch (error) {
		return { ok: false, problems: [thrownProblem(error)] };
	}

	if (events.length === 0) {
		return { ok: false, problems: [{ message: "No notes found", line: 1 }] };
	}
	if (events.length > MAX_ABC_NOTES) {
		const over = events[MAX_ABC_NOTES] as { startChar: number | undefined };
		return {
			ok: false,
			problems: [
				{
					...positionOf(over.startChar),
					message: `The song is longer than ${MAX_ABC_NOTES} notes, counting repeats`,
				},
			],
		};
	}

	const song = createSong(events.map((e) => e.pitch));
	const offenders = songOutOfRange(song, instrument);
	if (offenders.length > 0) {
		const range = `${formatPitch(instrument.lowest)} to ${formatPitch(instrument.highest)}`;
		return {
			ok: false,
			problems: summed(
				offenders.map(({ index, pitch, side }) => ({
					...positionOf(events[index]?.startChar),
					message: `${formatPitch(pitch)} is ${side} the written range (${range})`,
				})),
			),
		};
	}

	const writtenAt = new Map<number, AbcElement>();
	for (const el of notes) {
		if (el.startChar !== undefined) writtenAt.set(el.startChar, el);
	}
	let converted = 0;
	for (const e of events) {
		const written =
			e.startChar === undefined ? undefined : writtenAt.get(e.startChar);
		const name = written?.pitches?.[0]?.name;
		if (name !== undefined && letterOf(name) !== formatPitch(e.pitch)[0]) {
			converted++;
		}
	}

	return { ok: true, song, notes: events.length, converted };
}

function thrownProblem(error: unknown): AbcProblem {
	const reason = error instanceof Error ? error.message : String(error);
	return { message: `The text could not be read: ${reason}`, line: 1 };
}

function summed(problems: AbcProblem[]): AbcProblem[] {
	if (problems.length <= MAX_LISTED) return problems;
	const rest = problems.length - MAX_LISTED;
	return [
		...problems.slice(0, MAX_LISTED),
		{
			message: `and ${rest} more problem${rest === 1 ? "" : "s"}`,
			line: (problems[MAX_LISTED] as AbcProblem).line,
		},
	];
}
