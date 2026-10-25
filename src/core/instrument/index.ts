import {
	formatPitch,
	type Pitch,
	parsePitch,
	pitchesInRange,
	transpose,
} from "../pitch";

export type FingeringStyle = "taiwanese" | "japanese";
export type ClefName = "treble" | "treble-8vb" | "bass";

const FINGERING_STYLES: readonly string[] = ["taiwanese", "japanese"];
const CLEF_NAMES: readonly string[] = ["treble", "treble-8vb", "bass"];

export interface Instrument {
	name: string;
	family: string;
	holes: number;
	fingeringStyle: FingeringStyle;
	defaultClef: ClefName;
	lowest: Pitch;
	highest: Pitch;
	transposition: number;
	tablatureFont: string;
	glyphs: ReadonlyMap<Pitch, string>;
}

export class InstrumentError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "InstrumentError";
	}
}

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function object(value: unknown, path: string): Record<string, unknown> {
	if (!isObject(value)) throw new InstrumentError(`${path} must be an object`);
	return value;
}

function text(value: unknown, path: string): string {
	if (typeof value !== "string" || value === "") {
		throw new InstrumentError(`${path} must be a non-empty string`);
	}
	return value;
}

function oneOf<T extends string>(
	value: unknown,
	allowed: readonly string[],
	path: string,
): T {
	if (typeof value !== "string" || !allowed.includes(value)) {
		throw new InstrumentError(`${path} must be one of ${allowed.join(", ")}`);
	}
	return value as T;
}

function pitchField(value: unknown, path: string): Pitch {
	const pitch = typeof value === "string" ? parsePitch(value) : null;
	if (pitch === null)
		throw new InstrumentError(`${path} must be a note name such as A3`);
	return pitch;
}

/** Validate parsed instrument JSON. Throws `InstrumentError` naming the offending field or pitch. */
export function loadInstrument(raw: unknown): Instrument {
	const root = object(raw, "instrument");

	const name = text(root.name, "name");
	const family = text(root.family, "family");
	const holes = root.holes;
	if (typeof holes !== "number" || !Number.isInteger(holes) || holes <= 0) {
		throw new InstrumentError("holes must be a positive integer");
	}
	const fingeringStyle = oneOf<FingeringStyle>(
		root.fingeringStyle,
		FINGERING_STYLES,
		"fingeringStyle",
	);
	const defaultClef = oneOf<ClefName>(
		root.defaultClef,
		CLEF_NAMES,
		"defaultClef",
	);
	const transposition = root.transposition;
	if (typeof transposition !== "number" || !Number.isInteger(transposition)) {
		throw new InstrumentError("transposition must be an integer (semitones)");
	}

	const range = object(root.writtenRange, "writtenRange");
	const lowest = pitchField(range.lowest, "writtenRange.lowest");
	const highest = pitchField(range.highest, "writtenRange.highest");

	const tablature = object(root.tablature, "tablature");
	const tablatureFont = text(tablature.font, "tablature.font");
	const rawGlyphs = object(tablature.glyphs, "tablature.glyphs");

	if (lowest >= highest) {
		throw new InstrumentError(
			"writtenRange.lowest must be below writtenRange.highest",
		);
	}

	const glyphs = new Map<Pitch, string>();
	for (const [key, glyph] of Object.entries(rawGlyphs)) {
		const pitch = parsePitch(key);
		if (pitch === null || formatPitch(pitch) !== key) {
			throw new InstrumentError(
				`tablature.glyphs key ${key} is not a canonical note name`,
			);
		}
		if (pitch < lowest || pitch > highest) {
			throw new InstrumentError(
				`tablature.glyphs key ${key} is outside the written range`,
			);
		}
		glyphs.set(pitch, text(glyph, `tablature.glyphs.${key}`));
	}
	for (const pitch of pitchesInRange(lowest, highest)) {
		if (!glyphs.has(pitch)) {
			throw new InstrumentError(
				`tablature.glyphs has no glyph for ${formatPitch(pitch)}`,
			);
		}
	}

	return {
		name,
		family,
		holes,
		fingeringStyle,
		defaultClef,
		lowest,
		highest,
		transposition,
		tablatureFont,
		glyphs,
	};
}

export function glyphFor(
	instrument: Instrument,
	written: Pitch,
): string | undefined {
	return instrument.glyphs.get(written);
}

export function soundingPitch(instrument: Instrument, written: Pitch): Pitch {
	return transpose(written, instrument.transposition);
}
