import type {
	AbcElement,
	AbcTune,
	AbcTunebook,
} from "abcjs/src/api/abc_tunebook.js";
import type { Instrument } from "../core/instrument";
import { formatPitch, type Pitch } from "../core/pitch";
import { MAX_SONG_CHARS } from "../core/settings";
import {
	barBeats,
	createSong,
	DEFAULT_METER,
	type Meter,
	type Song,
	type SongNote,
	songOutOfRange,
} from "../core/song";

export const MAX_ABC_CHARS = MAX_SONG_CHARS;
export const MAX_ABC_NOTES = 500;

/** Warnings and offenders listed before the rest are summed up. */
const MAX_LISTED = 10;

const FORBIDDEN_DECORATION = /^(d\.?[cs]\.?|dacapo|dacoda|fine|coda|segno)/i;

/** The kinds of problem a failing tune can have, in the order a replaced tune's title names them (F17-S02). */
export const PROBLEM_KINDS = [
	"chords",
	"grace notes",
	"second voice",
	"unmatched slur",
	"D.C. or D.S.",
	"ABC errors",
	"no notes",
	"too many notes",
	"out of range",
	"unreadable",
] as const;

export type ProblemKind = (typeof PROBLEM_KINDS)[number];

export interface AbcProblem {
	message: string;
	/** 1-based. */
	line: number;
	/** 1-based, counting written notes in text order (a chord is one, rests and grace notes are not). */
	note?: number;
	/** 1-based, within the line. */
	column?: number;
	/** 1-based position of the tune in the text; set only when the text holds two or more tunes. */
	tune?: number;
	/** What sort of problem this is; unset on the character-limit problem and the "and N more" line. */
	kind?: ProblemKind;
}

/** One tune that passed, with its counts. */
export interface ParsedTune {
	song: Song;
	notes: number;
	converted: number;
}

/** A tune left out of a file: only its `X:` and `T:` lines are in the text. It has no song. */
export interface DroppedTune {
	dropped: true;
	/** The `T:` text, possibly empty. */
	title: string;
}

export function isDroppedTune(t: object): t is DroppedTune {
	return "dropped" in t;
}

export type AbcResult =
	/** `tunes` follows the text, is never empty and has at least one tune that passed. */
	| { ok: true; tunes: (ParsedTune | DroppedTune)[] }
	| { ok: false; problems: AbcProblem[] };

/**
 * The title of a dropped tune, or null. Only the tune's own text counts (up to
 * its first blank line, where abcjs ends a tune), and it must be exactly an
 * `X:` line then a `T:` line.
 */
export function droppedTitle(tuneText: string): string | null {
	const own = (tuneText.split(/\n[ \t]*\n/)[0] ?? "").trimEnd();
	const match = /^X:[^\n]*\nT:([^\n]*)$/.exec(own);
	return match ? (match[1] as string).trim() : null;
}

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

/**
 * abcjs rescales the notes after a mid-tune `Q:` (header line or inline) by the
 * tempo ratio, which would break the written lengths, so drop those elements
 * before the audio sequence is built. The first `Q:` is read from the tune's
 * meta text instead.
 */
function removeTempoElements(tune: AbcTune): void {
	for (const line of tune.lines) {
		for (const staff of line.staff ?? []) {
			for (const voice of staff.voices) {
				for (let i = voice.length - 1; i >= 0; i--) {
					if (voice[i]?.el_type === "tempo") voice.splice(i, 1);
				}
			}
		}
	}
}

/** The first header `T:` line, trimmed, or undefined when there is none or it is blank. */
function titleOf(tune: AbcTune): string | undefined {
	const title = tune.metaText?.title?.trim();
	return title === "" ? undefined : title;
}

/** Quarter notes per minute from the first `Q:`, or null when there is none or no rate. */
function tempoOf(tune: AbcTune): number | null {
	const tempo = tune.metaText?.tempo;
	if (tempo?.bpm === undefined) return null;
	const whole = (tempo.duration ?? []).reduce((sum, d) => sum + d, 0);
	const quarters = tempo.bpm * whole * 4;
	return Number.isFinite(quarters) && quarters > 0 ? quarters : null;
}

/**
 * Where the first bar line falls, in quarter-note beats from the start of the
 * tune: the played length of the notes and rests before it, or null when the
 * tune has no bar line.
 */
function firstBarLineOf(tune: AbcTune): number | null {
	let whole = 0;
	let triplet = 1;
	for (const line of tune.lines) {
		for (const el of line.staff?.[0]?.voices[0] ?? []) {
			if (el.el_type === "bar") return whole * 4;
			if (el.el_type !== "note" || typeof el.duration !== "number") continue;
			if (el.tripletMultiplier !== undefined) triplet = el.tripletMultiplier;
			whole += el.duration * triplet;
			if (el.endTriplet) triplet = 1;
		}
	}
	return null;
}

/**
 * Beats from the first note to the first bar line after it. With no bar line
 * the first note is taken to start a bar.
 */
function firstBarOf(tune: AbcTune, origin: number, meter: Meter): number {
	const bar = barBeats(meter);
	const line = firstBarLineOf(tune);
	if (line === null) return bar;
	const ahead = (((line - origin) % bar) + bar) % bar;
	return ahead > 1e-3 && bar - ahead > 1e-3 ? ahead : bar;
}

/** The first `M:` as a meter; 2/2 for cut time; 4/4 for anything else (no `M:`, `M:none`, `M:C`, `2+3/8`). */
function meterOf(tune: AbcTune): Meter {
	const meter = tune.getMeter();
	if (meter.type === "cut_time") return { beats: 2, unit: 2 };
	if (meter.type !== "specified") return DEFAULT_METER;
	const first = meter.value?.[0];
	if (
		first === undefined ||
		!/^\d+$/.test(first.num) ||
		!/^\d+$/.test(first.den)
	)
		return DEFAULT_METER;
	const beats = Number(first.num);
	const unit = Number(first.den);
	return beats > 0 && unit > 0 ? { beats, unit } : DEFAULT_METER;
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

/**
 * abcjs warns as `Music Line:5:3: message`, with the line counted from the
 * start of the tune's own text; `lineOffset` turns it into a line of the whole text.
 */
function warningProblem(
	warning: string,
	lineOffset: number,
	startLine: number,
): AbcProblem {
	// abcjs underlines the offending character in a copy of the line; name it instead.
	const unknown =
		/^([^:]*:\d+:\d+:)\s*Unknown character ignored:[\s\S]*?<span[^>]*>([^<]*)<\/span>/.exec(
			warning,
		);
	const plain = unknown
		? `${unknown[1]} Unknown character "${unknown[2]}" ignored`
		: stripMarkup(warning);
	const match = /^[^:]*:(\d+):(\d+):\s*([\s\S]*)$/.exec(plain);
	if (!match) return { message: plain, line: startLine, kind: "ABC errors" };
	return {
		message: match[3] as string,
		line: Math.max(1, Number(match[1]) + lineOffset),
		column: Number(match[2]),
		kind: "ABC errors",
	};
}

/**
 * Slur depth after each written note (same order as `notes`), counting every
 * `startSlur` and `endSlur` entry, dotted slurs included. A close with nothing
 * open and a slur still open at the end are problems; abcjs warns of neither.
 */
function slurDepths(notes: AbcElement[]): {
	after: number[];
	problems: { startChar: number | undefined; message: string }[];
} {
	const after: number[] = [];
	const problems: { startChar: number | undefined; message: string }[] = [];
	const open: (number | undefined)[] = [];
	for (const el of notes) {
		for (let n = el.pitches?.[0]?.startSlur?.length ?? 0; n > 0; n--) {
			open.push(el.startChar);
		}
		for (let n = el.pitches?.[0]?.endSlur?.length ?? 0; n > 0; n--) {
			if (open.length === 0) {
				problems.push({
					startChar: el.startChar,
					message: "Slur closed here was never opened",
				});
			} else open.pop();
		}
		after.push(open.length);
	}
	if (open.length > 0) {
		problems.push({
			startChar: open[open.length - 1],
			message: "Slur opened here is never closed",
		});
	}
	return { after, problems };
}

/**
 * Whether each event is slurred to the next one: the depth after its written
 * note (or after the last note of a tied group) is above zero, the next event
 * is the written note that follows the group, and no rest lies between them.
 */
function slurredFlags(
	events: { startChar: number | undefined; start: number; duration: number }[],
	notes: AbcElement[],
): boolean[] {
	const index = new Map<number, number>();
	notes.forEach((el, i) => {
		if (el.startChar !== undefined) index.set(el.startChar, i);
	});
	const { after } = slurDepths(notes);
	return events.map((e, i) => {
		const next = events[i + 1];
		if (!next || e.startChar === undefined || next.startChar === undefined)
			return false;
		const first = index.get(e.startChar);
		const following = index.get(next.startChar);
		if (first === undefined || following === undefined) return false;
		// The group ends at the written note just before the next event's; a jump back or into another ending finds none.
		const last = following - 1;
		if (last < first) return false;
		for (let j = first; j < last; j++) {
			if (!notes[j]?.pitches?.[0]?.startTie) return false;
		}
		if ((after[last] ?? 0) <= 0) return false;
		return Math.abs(next.start - (e.start + e.duration)) <= 1e-3;
	});
}

function letterOf(name: string): string {
	return (/[A-Ga-g]/.exec(name)?.[0] ?? "").toUpperCase();
}

function structuralProblems(
	tune: AbcTune,
	positionOf: (startChar: number | undefined) => AbcProblem,
): { startChar: number; problem: AbcProblem }[] {
	const found: { startChar: number; problem: AbcProblem }[] = [];
	const add = (
		startChar: number | undefined,
		message: string,
		kind: ProblemKind,
	) => {
		found.push({
			startChar: startChar ?? 0,
			problem: { ...positionOf(startChar), message, kind },
		});
	};

	const notes = noteElements(tune);
	for (const { startChar, message } of slurDepths(notes).problems) {
		add(startChar, message, "unmatched slur");
	}
	for (const el of notes) {
		if ((el.pitches?.length ?? 0) > 1) {
			add(
				el.startChar,
				"Chords are not supported; write one note at a time",
				"chords",
			);
		}
		if (el.gracenotes) {
			add(
				el.startChar,
				"Grace notes are not supported; remove them",
				"grace notes",
			);
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
		add(
			secondVoice,
			"Only one voice is supported; keep a single melody line",
			"second voice",
		);
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
							"D.C. or D.S.",
						);
					}
				}
			}
		}
	}

	return found.sort((a, b) => a.startChar - b.startChar);
}

type TuneReading =
	| { ok: true; parsed: ParsedTune }
	| { ok: false; problems: AbcProblem[] };

/**
 * One tune, read as a single tune is. `lineOffset` turns abcjs's warning lines
 * (counted from the tune's own text) into lines of the whole text; `startLine`
 * is the line of the tune's `X:`, where a problem with no note to point at goes.
 * The problems carry no tune and are not cut to the list length. With
 * `collectAll` (the file loader, F17-S02) a failing tune is read to the end, so
 * its problems name every kind found; the first problems otherwise end the reading.
 */
function readTune(
	text: string,
	tune: AbcTune,
	instrument: Instrument,
	lineOffset: number,
	startLine: number,
	collectAll = false,
): TuneReading {
	const notes = noteElements(tune);
	const numberAt = new Map<number, number>();
	notes.forEach((el, i) => {
		if (el.startChar !== undefined) numberAt.set(el.startChar, i + 1);
	});
	const positionOf = (startChar: number | undefined): AbcProblem => {
		if (startChar === undefined) return { message: "", line: startLine };
		const { line, column } = locate(text, startChar);
		const note = numberAt.get(startChar);
		return note === undefined
			? { message: "", line, column }
			: { message: "", line, column, note };
	};

	const found: AbcProblem[] = [
		...(tune.warnings ?? []).map((w) =>
			warningProblem(w, lineOffset, startLine),
		),
		...structuralProblems(tune, positionOf).map((f) => f.problem),
	];
	if (found.length > 0 && !collectAll) return { ok: false, problems: found };

	let events: {
		pitch: Pitch;
		startChar: number | undefined;
		start: number;
		duration: number;
	}[];
	try {
		removeTempoElements(tune);
		const tracks = tune
			.setUpAudio({ chordsOff: true })
			.tracks.map((track) =>
				track.filter((e) => e.cmd === "note" && e.pitch !== undefined),
			)
			.filter((track) => track.length > 0);
		if (tracks.length > 1) {
			const voice: AbcProblem = {
				message: "Only one voice is supported; keep a single melody line",
				line: startLine,
				kind: "second voice",
			};
			if (!collectAll) return { ok: false, problems: [voice] };
			found.push(voice);
		}
		events = tracks.flat().map((e) => ({
			pitch: e.pitch as Pitch,
			startChar: e.startChar,
			start: (e.start ?? 0) * 4,
			duration: (e.duration ?? 0) * 4,
		}));
	} catch (error) {
		// Another problem already explains why the tune does not play.
		return {
			ok: false,
			problems: found.length > 0 ? found : [thrownProblem(error, startLine)],
		};
	}

	const rangeProblem = (
		e: { pitch: Pitch; startChar: number | undefined },
		side: "below" | "above",
	): AbcProblem => ({
		...positionOf(e.startChar),
		message: `${formatPitch(e.pitch)} is ${side} the written range (${formatPitch(instrument.lowest)} to ${formatPitch(instrument.highest)})`,
		kind: "out of range",
	});

	if (events.length === 0) {
		return {
			ok: false,
			problems: [
				...found,
				{ message: "No notes found", line: startLine, kind: "no notes" },
			],
		};
	}
	if (events.length > MAX_ABC_NOTES) {
		const over = events[MAX_ABC_NOTES] as { startChar: number | undefined };
		found.push({
			...positionOf(over.startChar),
			message: `The song is longer than ${MAX_ABC_NOTES} notes, counting repeats`,
			kind: "too many notes",
		});
		if (!collectAll) return { ok: false, problems: found };
	}
	if (collectAll) {
		// Checked on the pitches, without `createSong`, so a tune with chords still has its range checked.
		for (const e of events) {
			const side =
				e.pitch < instrument.lowest
					? "below"
					: e.pitch > instrument.highest
						? "above"
						: null;
			if (side !== null) found.push(rangeProblem(e, side));
		}
		if (found.length > 0) return { ok: false, problems: found };
	}
	let song: Song;
	try {
		const origin = (events[0] as { start: number }).start;
		const slurred = slurredFlags(events, notes);
		const songNotes: SongNote[] = events.map((e, i) => ({
			pitch: e.pitch,
			start: e.start - origin,
			beats: e.duration,
			slurred: slurred[i] ?? false,
		}));
		const meter = meterOf(tune);
		song = createSong(songNotes, {
			tempo: tempoOf(tune),
			meter,
			firstBar: firstBarOf(tune, origin, meter),
			title: titleOf(tune),
		});
	} catch (error) {
		return { ok: false, problems: [thrownProblem(error, startLine)] };
	}
	const offenders = songOutOfRange(song, instrument);
	if (offenders.length > 0) {
		return {
			ok: false,
			problems: offenders.map(({ index, pitch, side }) =>
				rangeProblem({ pitch, startChar: events[index]?.startChar }, side),
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

	return { ok: true, parsed: { song, notes: events.length, converted } };
}

/** Turn ABC text into the song of each of its tunes, or a list of problems. */
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
	let book: { header: string; tunes: { startPos: number; pure: string }[] };
	try {
		const abcjs = await loadAbcjs();
		tunes = abcjs.parseOnly(text);
		book = new abcjs.TuneBook(text);
	} catch (error) {
		return { ok: false, problems: [thrownProblem(error, 1)] };
	}
	if (tunes.length === 0) {
		return {
			ok: false,
			problems: [{ message: "No notes found", line: 1, kind: "no notes" }],
		};
	}

	// abcjs counts a warning's line from the tune's own text, which starts with
	// the `%%` lines found before the first `X:`.
	const several = tunes.length > 1;
	const directiveLines = book.header.split("\n").filter((l) => l !== "").length;
	const aligned = book.tunes.length === tunes.length;
	const problems: AbcProblem[] = [];
	const parsed: (ParsedTune | DroppedTune)[] = [];
	tunes.forEach((tune, i) => {
		const title = aligned
			? droppedTitle((book.tunes[i] as { pure: string }).pure)
			: null;
		if (title !== null) {
			parsed.push({ dropped: true, title });
			return;
		}
		const startLine = aligned
			? locate(text, (book.tunes[i] as { startPos: number }).startPos).line
			: 1;
		const lineOffset = aligned ? startLine - 1 - directiveLines : 0;
		const reading = readTune(
			text,
			tune,
			instrument,
			lineOffset,
			several ? startLine : 1,
		);
		if (reading.ok) parsed.push(reading.parsed);
		else {
			for (const problem of reading.problems) {
				problems.push(several ? { ...problem, tune: i + 1 } : problem);
			}
		}
	});
	if (problems.length > 0) return { ok: false, problems: summed(problems) };
	if (parsed.every(isDroppedTune)) {
		return {
			ok: false,
			problems: [{ message: "No notes found", line: 1, kind: "no notes" }],
		};
	}
	return { ok: true, tunes: parsed };
}

function thrownProblem(error: unknown, line: number): AbcProblem {
	const reason = error instanceof Error ? error.message : String(error);
	return {
		message: `The text could not be read: ${reason}`,
		line,
		kind: "unreadable",
	};
}

function summed(problems: AbcProblem[]): AbcProblem[] {
	if (problems.length <= MAX_LISTED) return problems;
	const rest = problems.length - MAX_LISTED;
	const next = problems[MAX_LISTED] as AbcProblem;
	return [
		...problems.slice(0, MAX_LISTED),
		{
			message: `and ${rest} more problem${rest === 1 ? "" : "s"}`,
			line: next.line,
			...(next.tune === undefined ? {} : { tune: next.tune }),
		},
	];
}

export type FileLoad =
	| {
			ok: true;
			/** The text for the box: LF line endings, failing tunes replaced, cut to the limit. */
			text: string;
			/** Tunes kept, replaced ones included. */
			loaded: number;
			/** Tunes in the file. */
			total: number;
			/** Whether tunes at the end of the file were left off to fit the limit. */
			cut: boolean;
	  }
	| { ok: false; reason: "no-tune" | "first-too-long" };

/** The kinds a failing tune's problems have, each once, in `PROBLEM_KINDS` order. */
function kindsOf(problems: AbcProblem[]): ProblemKind[] {
	const kinds = PROBLEM_KINDS.filter((kind) =>
		problems.some((p) => p.kind === kind),
	);
	return kinds.length > 0 ? kinds : ["unreadable"];
}

/**
 * Read one tune chunk of a file on its own: null when it passes, else the
 * kinds of every problem found.
 */
function chunkKinds(
	abcjs: AbcTunebook,
	directives: string,
	tunePart: string,
	instrument: Instrument,
): ProblemKind[] | null {
	const text = directives + tunePart;
	try {
		const tune = abcjs.parseOnly(text)[0];
		if (tune === undefined) return ["no notes"];
		const reading = readTune(text, tune, instrument, 0, 1, true);
		return reading.ok ? null : kindsOf(reading.problems);
	} catch {
		return ["unreadable"];
	}
}

/**
 * The text a song file gives for the box (F17-S02, ADR 0013). The file is split
 * as abcjs splits it, on `\nX:`: the header before the first `X:`, then one
 * chunk per tune that runs to just before the next `X:`, so prose between tunes
 * stays with the tune before it. Tunes that pass are kept as written; one that
 * fails has its tune part replaced by its `X:` line and a `T:` line naming the
 * kinds of problem. Chunks are appended while the text fits `MAX_ABC_CHARS`;
 * the first that does not ends the reading.
 */
export async function loadAbcFile(
	rawText: string,
	instrument: Instrument,
): Promise<FileLoad> {
	const text = rawText.replace(/\r\n?/g, "\n");
	const parts = text.split("\nX:");
	const startsWithTune = (parts[0] as string).startsWith("X:");
	const noX = parts.length === 1 && !startsWithTune;
	// A file with no `X:` at all is read as one tune, as typed text may be.
	const header = startsWithTune || noX ? null : (parts[0] as string);
	const chunks = noX
		? [text]
		: parts
				.slice(startsWithTune ? 0 : 1)
				.map((part, i) => (startsWithTune && i === 0 ? part : `X:${part}`));
	// Of the header, abcjs gives each tune only its `%%` lines.
	const directives = (header ?? "")
		.split("\n")
		.filter((l) => l.startsWith("%%"))
		.map((l) => `${l}\n`)
		.join("");

	let abcjs: AbcTunebook;
	try {
		abcjs = await loadAbcjs();
	} catch {
		return { ok: false, reason: "no-tune" };
	}

	const kept: string[] = [];
	let length = header === null ? 0 : header.length + 1;
	let passing = 0;
	let cut = false;
	for (const [i, chunk] of chunks.entries()) {
		const blank = chunk.search(/\n[ \t]*\n/);
		const tunePart = blank < 0 ? chunk : chunk.slice(0, blank);
		const rest = blank < 0 ? "" : chunk.slice(blank);
		let out = chunk;
		let passes = false;
		if (droppedTitle(tunePart) === null) {
			const kinds = chunkKinds(abcjs, directives, tunePart, instrument);
			if (kinds === null) passes = true;
			else {
				const xLine = /^X:[^\n]*/.exec(tunePart)?.[0] ?? "X:1";
				const title =
					/^T:(.*)$/m.exec(tunePart)?.[1]?.trim() || `Tune ${i + 1}`;
				out = `${xLine}\nT:${title} (not loaded: ${kinds.join(", ")})${rest}`;
			}
		}
		const next = length + (kept.length > 0 ? 1 : 0) + out.length;
		if (next > MAX_ABC_CHARS) {
			if (kept.length === 0) return { ok: false, reason: "first-too-long" };
			cut = true;
			break;
		}
		kept.push(out);
		length = next;
		if (passes) passing++;
	}
	if (passing === 0) return { ok: false, reason: "no-tune" };
	return {
		ok: true,
		text: (header === null ? "" : `${header}\n`) + kept.join("\n"),
		loaded: kept.length,
		total: chunks.length,
		cut,
	};
}
