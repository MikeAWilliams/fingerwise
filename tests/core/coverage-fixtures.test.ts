import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import alto from "../../data/instruments/ocarina-12-taiwanese.json";
import { detectPitch, rmsDb } from "../../src/audio/detector";
import {
	buildTimeline,
	type CoverageOptions,
	createCoverageRun,
	type Segment,
} from "../../src/core/coverage";
import { loadInstrument, soundingPitch } from "../../src/core/instrument";
import { DEFAULT_THRESHOLDS } from "../../src/core/judge";
import { type Pitch, parsePitch } from "../../src/core/pitch";
import { createSong, DEFAULT_METER } from "../../src/core/song";

/*
 * The clips are the user's own playing (see tests/fixtures/audio/README.md),
 * read as the app's listener reads the microphone: 2048 samples every 800,
 * plus 128-sample level blocks.
 */

const instrument = loadInstrument(alto);
const WINDOW = 2048;
const HOP = 800;
const BLOCK = 128;

/** 16-bit mono PCM WAV: the samples and the rate. */
function readWav(name: string): { rate: number; samples: Float32Array } {
	const bytes = readFileSync(
		new URL(`../fixtures/audio/${name}`, import.meta.url),
	);
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	let at = 12;
	let rate = 0;
	while (at + 8 <= bytes.length) {
		const id = String.fromCharCode(...bytes.subarray(at, at + 4));
		const size = view.getUint32(at + 4, true);
		if (id === "fmt ") {
			expect(view.getUint16(at + 8 + 2, true)).toBe(1);
			expect(view.getUint16(at + 8 + 14, true)).toBe(16);
			rate = view.getUint32(at + 8 + 4, true);
		}
		if (id === "data") {
			const samples = new Float32Array(size / 2);
			for (let i = 0; i < samples.length; i++) {
				samples[i] = view.getInt16(at + 8 + 2 * i, true) / 32768;
			}
			return { rate, samples };
		}
		at += 8 + size;
	}
	throw new Error(`no data in ${name}`);
}

interface Clip {
	file: string;
	/** Seconds into the clip: the first note's start, each join, the last note's end. */
	bounds: number[];
	/** Written pitches. */
	notes: string[];
	slurred?: boolean;
}

const options: CoverageOptions = {
	toleranceCents: 25,
	checks: DEFAULT_THRESHOLDS,
	sounding: (written) => soundingPitch(instrument, written),
};

function pitchOf(name: string): Pitch {
	const p = parsePitch(name);
	if (p === null) throw new Error(`bad pitch ${name}`);
	return p;
}

/** Runs a clip as the app would: song time 0 is the first note's start. */
function run(clip: Clip, slurred = false) {
	const { rate, samples } = readWav(clip.file);
	const origin = clip.bounds[0] as number;
	const song = createSong(
		clip.notes.map((name, i) => ({
			pitch: pitchOf(name),
			start: (clip.bounds[i] as number) - origin,
			beats: (clip.bounds[i + 1] as number) - (clip.bounds[i] as number),
			slurred: slurred && i < clip.notes.length - 1,
		})),
		{ tempo: null, meter: DEFAULT_METER },
	);
	// ♩ = 60, so a beat is a second.
	const coverage = createCoverageRun(buildTimeline(song, 60), options);
	const buffer = new Float32Array(WINDOW);
	let nextBlock = BLOCK;
	for (let end = WINDOW; end <= samples.length; end += HOP) {
		const blocks = [];
		for (; nextBlock <= end; nextBlock += BLOCK) {
			blocks.push({
				time: (nextBlock / rate - origin) * 1000,
				level: rmsDb(samples.subarray(nextBlock - BLOCK, nextBlock)),
			});
		}
		coverage.pushEnvelope(blocks);
		buffer.set(samples.subarray(end - WINDOW, end));
		const { frequency, clarity } = detectPitch(buffer, rate);
		coverage.pushReading({
			time: (end / rate - origin) * 1000,
			frequency,
			clarity,
			level: rmsDb(buffer),
		});
	}
	const result = coverage.finish();
	return { result, segments: coverage.progress().segments as Segment[] };
}

// Note times measured from each clip's level and pitch, as listed in the README.
const REPEAT: Clip = {
	file: "tongued-repeat.wav",
	bounds: [0.0, 0.865, 2.74, 3.4],
	notes: ["C4", "C4", "C4"],
};
const HELD: Clip = {
	file: "held.wav",
	bounds: [0.0, 1.0, 2.0],
	notes: ["C4", "C4"],
};
const TONGUED: Clip = {
	file: "tongued-scale.wav",
	bounds: [0.17, 0.925, 1.79, 2.625, 3.4],
	notes: ["C4", "D4", "E4", "F4"],
};
const SLURRED: Clip = {
	file: "slurred-scale.wav",
	bounds: [0.11, 0.41, 1.19, 1.97, 2.54],
	notes: ["C4", "D4", "E4", "F4"],
};

/** The segments on one note: song index `index`, between its bounds. */
function onNote(segments: Segment[], clip: Clip, index: number): Segment[] {
	const origin = clip.bounds[0] as number;
	const from = ((clip.bounds[index] as number) - origin) * 1000;
	const to = ((clip.bounds[index + 1] as number) - origin) * 1000;
	return segments.filter(
		(s) => s.on === "note" && s.startMs >= from - 1 && s.endMs <= to + 1,
	);
}

const cents = (segments: Segment[]) =>
	segments.flatMap((s) => s.points.map((p) => p.cents));

describe("tongued playing (AC12)", () => {
	test("the tongued joins of one repeated note are separated", () => {
		const { result } = run(REPEAT);
		expect(result.separation).toEqual({ notSeparated: 0, plainJoins: 2 });
	});

	test("the tongued joins of a scale are separated", () => {
		const { result } = run(TONGUED);
		expect(result.separation).toEqual({ notSeparated: 0, plainJoins: 3 });
	});

	test("sagging notes: within 50 cents flat is right and out of tune, beyond it is wrong", () => {
		const { segments } = run(REPEAT);
		const out = segments.filter((s) => s.kind === "right-out");
		const wrong = segments.filter((s) => s.kind === "wrong");
		expect(out.length).toBeGreaterThan(0);
		expect(wrong.length).toBeGreaterThan(0);
		for (const c of cents(out)) {
			expect(Math.abs(c)).toBeGreaterThan(options.toleranceCents);
			expect(Math.abs(c)).toBeLessThanOrEqual(50);
		}
		// The sag is flat, and what is wrong is beyond the right-note band.
		for (const c of cents(wrong)) expect(c).toBeLessThan(-50);
		// The note's tuning is also reported.
		const flat = run(REPEAT).result.tuning;
		expect(flat.length).toBeGreaterThan(0);
		expect(flat[0]?.cents).toBeLessThan(-options.toleranceCents);
	});

	test("a note played well scores high, a note played sharp beyond the band is wrong", () => {
		const { result, segments } = run(TONGUED);
		expect(result.items[0]?.coverage).toBeGreaterThan(0.6);
		expect(result.items[3]?.coverage).toBeGreaterThan(0.8);
		const d = onNote(segments, TONGUED, 1);
		expect(d.some((s) => s.kind === "wrong")).toBe(true);
		expect(result.items[1]?.coverage).toBeLessThan(0.2);
		for (const c of cents(d.filter((s) => s.kind === "wrong"))) {
			expect(c).toBeGreaterThan(50);
		}
	});
});

describe("held and slurred playing (AC12)", () => {
	test("a held note made into two same-pitch notes is not separated and has no edge at the join", () => {
		const { result } = run(HELD);
		expect(result.separation).toEqual({ notSeparated: 1, plainJoins: 1 });
		expect(result.items[0]).toMatchObject({ startEdge: true, endEdge: false });
		expect(result.items[1]).toMatchObject({ startEdge: false, endEdge: true });
		expect(result.timingFaults).toEqual([]);
		expect(result.coverage).toBeGreaterThan(0.95);
	});

	test("the slurred joins are not separated", () => {
		const asPlain = run(SLURRED).result;
		expect(asPlain.separation).toEqual({ notSeparated: 3, plainJoins: 3 });
		const asSlurred = run(SLURRED, true).result;
		expect(asSlurred.separation).toEqual({ notSeparated: 0, plainJoins: 0 });
	});

	test("the notes played about a semitone flat are confirmed wrong", () => {
		const { result, segments } = run(SLURRED, true);
		for (const index of [0, 1, 2]) {
			const wrong = onNote(segments, SLURRED, index).filter(
				(s) => s.kind === "wrong",
			);
			expect(wrong.length, `note ${index}`).toBeGreaterThan(0);
			for (const c of cents(wrong)) expect(c).toBeLessThan(-50);
			expect(result.items[index]?.coverage).toBeLessThan(0.35);
		}
		expect(result.tuning.length).toBeGreaterThan(0);
	});
});

/*
 * F15-S01 AC10. "Today" is what these clips scored before the release
 * allowance, recorded with the same harness.
 */
describe("release allowance on the clips (F15-S01 AC10)", () => {
	const faults = (clip: Clip, slurred = false) =>
		run(clip, slurred).result.timingFaults.map(
			(f) => `${f.index} ${f.edge} ${f.kind}`,
		);

	test("the held note is still not separated", () => {
		const { result } = run(HELD);
		expect(result.separation).toEqual({ notSeparated: 1, plainJoins: 1 });
		expect(result.coverage).toBeCloseTo(0.9985507, 2);
	});

	test("the slurred scale scores as today, played as plain and as slurred", () => {
		const plain = run(SLURRED).result;
		expect(plain.coverage).toBeCloseTo(0.237483, 2);
		expect(plain.separation).toEqual({ notSeparated: 3, plainJoins: 3 });
		expect(faults(SLURRED)).toEqual([
			"0 start late",
			"1 start late",
			"1 end early",
			"2 start late",
		]);
		const slurred = run(SLURRED, true).result;
		expect(slurred.coverage).toBeCloseTo(0.2654048, 2);
		expect(slurred.separation).toEqual({ notSeparated: 0, plainJoins: 0 });
		expect(faults(SLURRED, true)).toEqual(faults(SLURRED));
	});

	test("the tongued scale scores as today", () => {
		const { result } = run(TONGUED);
		expect(Math.abs((result.coverage as number) - 0.6266779)).toBeLessThan(
			0.005,
		);
		expect(result.separation).toEqual({ notSeparated: 0, plainJoins: 3 });
		expect(faults(TONGUED)).toEqual([
			"1 start late",
			"1 end early",
			"2 start late",
		]);
	});

	test("the tongued repeat scores at least as high and fewer notes end early", () => {
		const { result } = run(REPEAT);
		expect(result.coverage as number).toBeGreaterThanOrEqual(0.516276);
		expect(result.timing.endedEarly.faults).toBeLessThan(2);
	});
});
