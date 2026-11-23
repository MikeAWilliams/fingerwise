import {
	Beam,
	Dot,
	Formatter,
	Renderer,
	Stave,
	StaveNote,
	StaveTie,
	type SVGContext,
} from "vexflow/bravura";
import {
	type Bar,
	type BarItem,
	countInBeats,
	type Meter,
} from "../../core/song";
import type { Stop } from "./lane-map";
import {
	buildNote,
	buildStave,
	noteDuration,
	noteLayout,
	type StaffOptions,
} from "./layout";

/** Width of a whole bar, not counting the clef and key signature that start a line. */
export const BAR_WIDTH = 180;
/** A bar shorter than the meter (a pickup, the last bar) is drawn no narrower than this share of a whole one. */
const MIN_BAR_SHARE = 0.5;
/** The count-in bar's share of a whole bar's width. */
const COUNT_IN_SHARE = 0.5;
/** Height of one line: the staff plus room for ledger lines and stems. */
export const LINE_HEIGHT = 110;
/** Height of the lane under each staff, and the space between the staff and it. */
export const LANE_HEIGHT = 24;
export const LANE_GAP = 6;
/** One row: the staff, the gap and the lane. */
export const ROW_HEIGHT = LINE_HEIGHT + LANE_GAP + LANE_HEIGHT;
const MARGIN = 10;
/** Room on the right for the arrow that points back up to the next line. */
const ARROW_SPACE = 24;

/** The colour of every note but the one to play. */
export const GREY = "#a0a0a0";
const GREY_STYLE = { fillStyle: GREY, strokeStyle: GREY };
/** The colour of the note to play. */
export const BLACK = "#000000";

/** One drawn line of music and the lane under it. */
export interface RowLayout {
	/** The line's index in `songLines`. */
	line: number;
	/** The screen row, 0 above and 1 below: line n is in row n mod 2. */
	row: number;
	/** Vertical extent of the staff, in view-box units. */
	top: number;
	bottom: number;
	/** Where the lane sits under it. */
	laneTop: number;
	laneBottom: number;
	/** In order of x: the line's first note position, each note piece and rest, and each bar line. */
	stops: Stop[];
	/** The drawn elements of each note on this row, with its ties, by its index in the song. */
	notes: Map<number, SVGElement[]>;
}

/** What `drawSongLines` drew, for the lane and for recolouring without a redraw. */
export interface SongLayout {
	width: number;
	height: number;
	rows: RowLayout[];
	/** The count-in rests' elements, one list per rest. */
	countIn: SVGElement[][];
	/** Each beam's element and the notes it joins; a beam is black when one of them is. */
	beams: { element: SVGElement; notes: number[] }[];
}

/** Lengths one note (with at most one dot) can show, longest first. */
const NOTE_BEATS = [6, 4, 3, 2, 1.5, 1, 0.75, 0.5, 0.375, 0.25, 0.125];

/**
 * `beats` as note lengths to tie together, longest first. A length they cannot
 * add up to (a triplet) stays one note, drawn at the longest length that fits.
 */
export function splitBeats(beats: number): number[] {
	const parts: number[] = [];
	let left = beats;
	for (const b of NOTE_BEATS) {
		while (left >= b - 1e-3) {
			parts.push(b);
			left -= b;
		}
	}
	return left > 1e-3 || parts.length === 0 ? [beats] : parts;
}

function buildRest(beats: number, clef: "treble" | "bass"): StaveNote {
	const duration = noteDuration(beats);
	const rest = new StaveNote({
		keys: [clef === "bass" ? "d/3" : "b/4"],
		duration: `${duration}r`,
		clef,
	});
	if (duration.endsWith("d")) Dot.buildAndAttach([rest], { all: true });
	rest.setStyle(GREY_STYLE);
	return rest;
}

/** The line holding the start of note `index`, or the first line. */
export function lineOfNote(lines: readonly Bar[][], index: number): number {
	const found = lines.findIndex((line) =>
		line.some((bar) =>
			bar.items.some((item) => item.kind === "note" && item.index === index),
		),
	);
	return Math.max(0, found);
}

function lastItem(line: readonly Bar[] | undefined): BarItem | undefined {
	const items = line?.[line.length - 1]?.items;
	return items?.[items.length - 1];
}

/**
 * Draw the two lines of music from line `first` inside `element`, replacing its
 * contents, and return where everything is. Everything is drawn grey, each
 * line starting with the clef and key signature; `colourSong` then makes the
 * note to play black, so a change of note redraws nothing.
 *
 * The first line starts with a bar of rests, one per count-in beat.
 *
 * Lines never move: line n is drawn in row n mod 2, so the eye reads down to
 * the lower row and finds it where it was. Once the lower row is playing, the
 * upper row holds the next line, and an arrow at the lower row's end points up
 * to it. Under each staff is room for a lane, drawn by the caller.
 */
export function drawSongLines(
	element: HTMLDivElement,
	lines: readonly Bar[][],
	first: number,
	options: StaffOptions,
	meter: Meter,
	barsPerLine: number,
): SongLayout {
	const shown = lines.slice(first, first + 2);
	// Clef and key signature take the same room on every line; measure it once.
	const clefLayout = noteLayout(options.lowest, options);
	const prefix =
		buildStave(clefLayout, 0, 0, 1000).getNoteStartX() -
		new Stave(0, 0, 1000).getNoteStartX();
	const width = prefix + barsPerLine * BAR_WIDTH + 2 * MARGIN + ARROW_SPACE;
	const height = 2 * ROW_HEIGHT + MARGIN;

	element.replaceChildren();
	const renderer = new Renderer(element, Renderer.Backends.SVG);
	renderer.resize(width, height);
	const ctx = renderer.getContext() as SVGContext;
	ctx.setViewBox(0, 0, width, height);

	const barBeats = (meter.beats * 4) / meter.unit;
	const groups = Beam.getDefaultBeamGroups(`${meter.beats}/${meter.unit}`);
	const count = countInBeats(meter);
	const countBar: Bar = {
		start: -count.beats * count.quarters,
		items: Array.from({ length: count.beats }, () => ({
			kind: "rest" as const,
			beats: count.quarters,
		})),
	};

	const rowOf = (lineIndex: number) => lineIndex % 2;
	const layout: SongLayout = {
		width,
		height,
		rows: [],
		countIn: [],
		beams: [],
	};
	/** Resolved after drawing: the elements exist only then. */
	const countRests: StaveNote[][] = [];
	const beamed: { beam: Beam; notes: number[] }[] = [];
	const rowNotes: { note: StaveNote; index: number; row: RowLayout }[] = [];
	const tied: { tie: StaveTie; index: number; row: RowLayout }[] = [];

	shown.forEach((line, i) => {
		const lineIndex = first + i;
		const y = rowOf(lineIndex) * ROW_HEIGHT;
		const row: RowLayout = {
			line: lineIndex,
			row: rowOf(lineIndex),
			top: y,
			bottom: y + LINE_HEIGHT,
			laneTop: y + LINE_HEIGHT + LANE_GAP,
			laneBottom: y + ROW_HEIGHT,
			stops: [],
			notes: new Map(),
		};
		layout.rows.push(row);
		// Each note's pieces on this line, in order, for the ties between them.
		const pieces = new Map<number, StaveNote[]>();
		const withCount = lineIndex === 0;
		const bars = withCount ? [countBar, ...line] : line;
		const shares = bars.map((bar, b) => {
			if (withCount && b === 0) return COUNT_IN_SHARE;
			const length = bar.items.reduce((sum, item) => sum + item.beats, 0);
			return Math.max(MIN_BAR_SHARE, Math.min(1, length / barBeats));
		});
		// The count-in bar squeezes the first line's bars to fit the width.
		const total = shares.reduce((sum, share) => sum + share, 0);
		const fit = Math.min(1, barsPerLine / total);
		// The notes and rests with their beats, whose x is known once a bar is formatted.
		const placed: { note: StaveNote; beat: number }[] = [];
		const barLines: Stop[] = [];
		let lineStart: Stop | null = null;
		let x = MARGIN;
		bars.forEach((bar, b) => {
			const counting = withCount && b === 0;
			const barWidth =
				(shares[b] as number) * fit * BAR_WIDTH + (b === 0 ? prefix : 0);
			const stave =
				b === 0
					? buildStave(clefLayout, x, y, barWidth)
					: new Stave(x, y, barWidth);
			stave.setContext(ctx).draw();
			if (b === 0) lineStart = { x: stave.getNoteStartX(), beat: bar.start };
			x += barWidth;

			const notes: StaveNote[] = [];
			let at = bar.start;
			for (const [k, item] of bar.items.entries()) {
				for (const beats of splitBeats(item.beats)) {
					let note: StaveNote;
					if (item.kind === "rest") {
						note = buildRest(beats, clefLayout.clef);
						if (counting) {
							const list = countRests[k] ?? [];
							list.push(note);
							countRests[k] = list;
						}
					} else {
						note = buildNote(noteLayout(item.pitch, options), beats);
						note.setStyle(GREY_STYLE);
						rowNotes.push({ note, index: item.index, row });
						const list = pieces.get(item.index) ?? [];
						list.push(note);
						pieces.set(item.index, list);
					}
					notes.push(note);
					placed.push({ note, beat: at });
					at += beats;
				}
			}
			barLines.push({
				x,
				beat: bar.start + bar.items.reduce((sum, item) => sum + item.beats, 0),
			});
			if (notes.length === 0) return;
			const beams = Beam.generateBeams(notes, { groups });
			Formatter.FormatAndDraw(ctx, stave, notes);
			for (const beam of beams) {
				beam.setStyle(GREY_STYLE);
				beam.setContext(ctx).draw();
				const indices = rowNotes
					.filter((r) => beam.getNotes().includes(r.note))
					.map((r) => r.index);
				beamed.push({ beam, notes: indices });
			}
		});

		if (lineStart) row.stops.push(lineStart);
		for (const { note, beat } of placed) {
			row.stops.push({ x: note.getAbsoluteX(), beat });
		}
		row.stops.push(...barLines);
		row.stops.sort((a, b) => a.x - b.x || a.beat - b.beat);

		const tie = (
			index: number,
			firstNote: StaveNote | null,
			lastNote: StaveNote | null,
		) => {
			const t = new StaveTie({
				firstNote,
				lastNote,
				firstIndexes: [0],
				lastIndexes: [0],
			});
			t.setStyle(GREY_STYLE);
			t.setContext(ctx).draw();
			tied.push({ tie: t, index, row });
		};
		for (const [index, list] of pieces) {
			for (let i = 1; i < list.length; i++) {
				tie(index, list[i - 1] as StaveNote, list[i] as StaveNote);
			}
		}
		// A note tied over the line break gets half a tie on each line.
		const end = lastItem(line);
		if (end?.kind === "note" && end.tied) {
			const list = pieces.get(end.index) ?? [];
			tie(end.index, list[list.length - 1] ?? null, null);
		}
		const before = lastItem(lines[lineIndex - 1]);
		if (before?.kind === "note" && before.tied) {
			const list = pieces.get(before.index) ?? [];
			tie(before.index, null, list[0] ?? null);
		}
	});

	if (rowOf(first) === 1 && shown.length > 1) {
		drawUpArrow(ctx, width - MARGIN - ARROW_SPACE / 2);
	}

	// The elements exist now that everything is drawn.
	const addElement = (
		row: RowLayout,
		index: number,
		el: SVGElement | undefined,
	) => {
		if (!el) return;
		const list = row.notes.get(index) ?? [];
		list.push(el);
		row.notes.set(index, list);
	};
	for (const { note, index, row } of rowNotes) {
		addElement(row, index, note.getSVGElement());
	}
	for (const { tie, index, row } of tied) {
		addElement(row, index, tie.getSVGElement());
	}
	for (const { beam, notes } of beamed) {
		const el = beam.getSVGElement();
		if (el) layout.beams.push({ element: el, notes });
	}
	layout.countIn = countRests.map((list) =>
		list.flatMap((note) => note.getSVGElement() ?? []),
	);
	return layout;
}

/** Sets the colour of every part of `element` that has one: a note's head, stem and dots, a tie, a beam. */
function paint(element: SVGElement, colour: string): void {
	for (const el of [element, ...element.querySelectorAll("*")]) {
		for (const attribute of ["fill", "stroke"]) {
			const value = el.getAttribute(attribute);
			if (value !== null && value !== "none")
				el.setAttribute(attribute, colour);
		}
	}
}

/**
 * Colours a drawn layout without redrawing it: note `current`'s pieces, ties and
 * beams black and everything else grey. A `current` that is no note (-1, during
 * the count-in) leaves all notes grey, and count-in rest `countBeat` is black
 * while that beat clicks (null leaves them all grey).
 */
export function colourSong(
	layout: SongLayout,
	current: number,
	countBeat: number | null,
): void {
	for (const row of layout.rows) {
		for (const [index, elements] of row.notes) {
			for (const el of elements) paint(el, index === current ? BLACK : GREY);
		}
	}
	for (const { element, notes } of layout.beams) {
		paint(element, notes.includes(current) ? BLACK : GREY);
	}
	layout.countIn.forEach((elements, k) => {
		for (const el of elements) paint(el, k === countBeat ? BLACK : GREY);
	});
}

/** A grey arrow at `x` from the middle of the lower row's staff up to the upper row's. */
function drawUpArrow(ctx: SVGContext, x: number): void {
	const top = new Stave(0, 0, 10).getYForLine(2);
	const bottom = new Stave(0, ROW_HEIGHT, 10).getYForLine(2);
	const head = 6;
	ctx.save();
	ctx.setStrokeStyle(GREY).setFillStyle(GREY).setLineWidth(2);
	ctx
		.beginPath()
		.moveTo(x, bottom)
		.lineTo(x, top + head)
		.stroke();
	ctx
		.beginPath()
		.moveTo(x, top)
		.lineTo(x - head, top + head * 1.5)
		.lineTo(x + head, top + head * 1.5)
		.closePath()
		.fill();
	ctx.restore();
}
