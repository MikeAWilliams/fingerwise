import { Formatter, Renderer, type SVGContext } from "vexflow/bravura";
import type { Pitch } from "../../core/pitch";
import { buildNote, buildStave, noteLayout, type StaffOptions } from "./layout";

export {
	beatRangeOnRows,
	type RowMap,
	type RowPart,
	rowMap,
	type Stop,
} from "./lane-map";
export {
	buildNote,
	buildStave,
	type KeySignature,
	ledgerLines,
	type NoteLayout,
	noteDuration,
	noteLayout,
	type StaffOptions,
	StaffRangeError,
} from "./layout";
export {
	colourSong,
	drawSongLines,
	GREY,
	LANE_GAP,
	LANE_HEIGHT,
	ROW_HEIGHT,
	ROW_SPACING,
	type RowFrame,
	type RowLayout,
	rowFrame,
	rowHeight,
	type SongLayout,
	STRIP_HEIGHT,
	STRIP_OVERLAP,
	songHeight,
	splitBeats,
} from "./song-lines";

const WIDTH = 220;
const HEIGHT = 150;

/**
 * Draw `pitch` as a note `beats` quarter notes long (a whole note by default) on
 * a one-note staff inside `element`, replacing its contents. A null pitch draws
 * the stave (clef and key) with no note.
 */
export function drawStaff(
	element: HTMLDivElement,
	pitch: Pitch | null,
	options: StaffOptions,
	beats = 4,
): void {
	// With no note, lay out the instrument's lowest pitch only to get the clef and key.
	const layout = noteLayout(pitch ?? options.lowest, options);
	element.replaceChildren();
	const renderer = new Renderer(element, Renderer.Backends.SVG);
	renderer.resize(WIDTH, HEIGHT);
	const ctx = renderer.getContext() as SVGContext;
	ctx.setViewBox(0, 0, WIDTH, HEIGHT);

	const stave = buildStave(layout, 10, 30, WIDTH - 20);
	stave.setContext(ctx).draw();

	if (pitch === null) return;
	Formatter.FormatAndDraw(ctx, stave, [buildNote(layout, beats)]);
}
