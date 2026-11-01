import { Formatter, Renderer, type SVGContext } from "vexflow/bravura";
import type { Pitch } from "../../core/pitch";
import { buildNote, buildStave, noteLayout, type StaffOptions } from "./layout";

export {
	buildNote,
	buildStave,
	type KeySignature,
	ledgerLines,
	type NoteLayout,
	noteLayout,
	type StaffOptions,
	StaffRangeError,
} from "./layout";

const WIDTH = 220;
const HEIGHT = 150;

/** Draw `pitch` as a whole note on a one-note staff inside `element`, replacing its contents. */
export function drawStaff(
	element: HTMLDivElement,
	pitch: Pitch,
	options: StaffOptions,
): void {
	const layout = noteLayout(pitch, options);
	element.replaceChildren();
	const renderer = new Renderer(element, Renderer.Backends.SVG);
	renderer.resize(WIDTH, HEIGHT);
	const ctx = renderer.getContext() as SVGContext;
	ctx.setViewBox(0, 0, WIDTH, HEIGHT);

	const stave = buildStave(layout, 10, 30, WIDTH - 20);
	stave.setContext(ctx).draw();

	Formatter.FormatAndDraw(ctx, stave, [buildNote(layout)]);
}
