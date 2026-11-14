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
const MARGIN = 10;
/** Room on the right for the arrow that points back up to the next line. */
const ARROW_SPACE = 24;

/** The colour of every note but the one to play. */
export const GREY = "#a0a0a0";
const GREY_STYLE = { fillStyle: GREY, strokeStyle: GREY };

/** How a played note came out; the same colours as the card's verdict. */
export type NoteMark = "correct" | "incorrect";
const MARK_COLOURS: Record<NoteMark, string> = {
	correct: "#17692e",
	incorrect: "#b3261e",
};

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

function buildRest(
	beats: number,
	clef: "treble" | "bass",
	grey = true,
): StaveNote {
	const duration = noteDuration(beats);
	const rest = new StaveNote({
		keys: [clef === "bass" ? "d/3" : "b/4"],
		duration: `${duration}r`,
		clef,
	});
	if (duration.endsWith("d")) Dot.buildAndAttach([rest], { all: true });
	if (grey) rest.setStyle(GREY_STYLE);
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
 * Draw the line of music holding note `current` and the line after it inside
 * `element`, replacing its contents. That note is black, everything else grey;
 * a `current` that is no note (-1, during the count-in) shows the first line
 * all grey. Each line starts with the clef and key signature.
 *
 * The first line starts with a bar of rests, one per count-in beat. Rest
 * `countBeat` is black while that beat clicks; null leaves them all grey.
 *
 * A note in `marks` takes its mark's colour instead, the one to play included,
 * so how each note went shows where it is written.
 *
 * Lines never move: line n is drawn in row n mod 2, so the eye reads down to
 * the lower row and finds it where it was. Once the lower row is playing, the
 * upper row holds the next line, and an arrow at the lower row's end points up
 * to it.
 */
export function drawSongLines(
	element: HTMLDivElement,
	lines: readonly Bar[][],
	current: number,
	options: StaffOptions,
	meter: Meter,
	barsPerLine: number,
	countBeat: number | null = null,
	marks: ReadonlyMap<number, NoteMark> = new Map(),
): void {
	const first = lineOfNote(lines, current);
	const shown = lines.slice(first, first + 2);
	// Clef and key signature take the same room on every line; measure it once.
	const clefLayout = noteLayout(options.lowest, options);
	const prefix =
		buildStave(clefLayout, 0, 0, 1000).getNoteStartX() -
		new Stave(0, 0, 1000).getNoteStartX();
	const width = prefix + barsPerLine * BAR_WIDTH + 2 * MARGIN + ARROW_SPACE;
	const height = 2 * LINE_HEIGHT + MARGIN;

	element.replaceChildren();
	const renderer = new Renderer(element, Renderer.Backends.SVG);
	renderer.resize(width, height);
	const ctx = renderer.getContext() as SVGContext;
	ctx.setViewBox(0, 0, width, height);

	const barBeats = (meter.beats * 4) / meter.unit;
	const groups = Beam.getDefaultBeamGroups(`${meter.beats}/${meter.unit}`);
	// The pieces of the note to play; a beam over any of them stays black.
	const playing = new Set<unknown>();
	const count = countInBeats(meter);
	const countBar: Bar = {
		start: -count.beats * count.quarters,
		items: Array.from({ length: count.beats }, () => ({
			kind: "rest" as const,
			beats: count.quarters,
		})),
	};

	/** The style of note `index`'s head, stem and ties; null leaves it black. */
	const styleOf = (index: number) => {
		const mark = marks.get(index);
		if (mark) {
			const colour = MARK_COLOURS[mark];
			return { fillStyle: colour, strokeStyle: colour };
		}
		return index === current ? null : GREY_STYLE;
	};

	const rowOf = (lineIndex: number) => lineIndex % 2;
	shown.forEach((line, i) => {
		const lineIndex = first + i;
		const y = rowOf(lineIndex) * LINE_HEIGHT;
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
			x += barWidth;

			const notes: StaveNote[] = [];
			for (const [k, item] of bar.items.entries()) {
				for (const beats of splitBeats(item.beats)) {
					if (item.kind === "rest") {
						const lit = counting && k === countBeat;
						notes.push(buildRest(beats, clefLayout.clef, !lit));
						continue;
					}
					const note = buildNote(noteLayout(item.pitch, options), beats);
					const style = styleOf(item.index);
					if (style) note.setStyle(style);
					if (item.index === current) playing.add(note);
					notes.push(note);
					const list = pieces.get(item.index) ?? [];
					list.push(note);
					pieces.set(item.index, list);
				}
			}
			if (notes.length === 0) return;
			const beams = Beam.generateBeams(notes, { groups });
			Formatter.FormatAndDraw(ctx, stave, notes);
			for (const beam of beams) {
				if (!beam.getNotes().some((n) => playing.has(n)))
					beam.setStyle(GREY_STYLE);
				beam.setContext(ctx).draw();
			}
		});

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
			const style = styleOf(index);
			if (style) t.setStyle(style);
			t.setContext(ctx).draw();
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
}

/** A grey arrow at `x` from the middle of the lower row's staff up to the upper row's. */
function drawUpArrow(ctx: SVGContext, x: number): void {
	const top = new Stave(0, 0, 10).getYForLine(2);
	const bottom = new Stave(0, LINE_HEIGHT, 10).getYForLine(2);
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
