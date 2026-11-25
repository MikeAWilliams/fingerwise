import { describe, expect, test } from "vitest";
import { laneNoteEnds, laneSegments } from "../../src/app/lane";
import { buildTimeline } from "../../src/core/coverage";
import type { Pitch } from "../../src/core/pitch";
import { createSong, DEFAULT_METER, songLines } from "../../src/core/song";
import type { RowLayout, SongLayout, Stop } from "../../src/render/staff";

const C = 60 as Pitch;
const D = 62 as Pitch;

/** At ♩ = 60 a beat is a second. */
function timelineOf(notes: [Pitch, number, number, boolean?][]) {
	const song = createSong(
		notes.map(([pitch, start, beats, slurred]) => ({
			pitch,
			start,
			beats,
			slurred,
		})),
		{ tempo: 60, meter: DEFAULT_METER },
	);
	return { song, timeline: buildTimeline(song, 60) };
}

function row(line: number, stops: Stop[]): RowLayout {
	return {
		line,
		top: 0,
		bottom: 0,
		laneTop: 0,
		laneBottom: 0,
		stripTop: 0,
		stripBottom: 0,
		stops,
		notes: new Map(),
	};
}

const layoutOf = (...rows: RowLayout[]): SongLayout => ({
	width: 0,
	height: 0,
	rows,
	countIn: [],
	beams: [],
});

describe("laneSegments (AC3, AC4; F15-S03 AC1 to AC3, AC6)", () => {
	test("a note spans from its x to where its release starts, a rest the whole gap", () => {
		const { song, timeline } = timelineOf([
			[C, 0, 1],
			[D, 2, 1],
		]);
		const lines = songLines(song, 2);
		const layout = layoutOf(
			row(0, [
				{ x: -60, beat: -4 },
				{ x: -20, beat: -2 },
				{ x: 10, beat: 0 },
				{ x: 20, beat: 0 },
				{ x: 40, beat: 1 },
				{ x: 60, beat: 2 },
				{ x: 80, beat: 3 },
			]),
		);
		expect(laneSegments(timeline, lines, layout, 60)).toEqual([
			{
				row: 0,
				x0: 20,
				x1: 35,
				kind: "note",
				graded: true,
				index: 0,
				starts: true,
				ends: true,
			},
			{
				row: 0,
				x0: 60,
				x1: 75,
				kind: "note",
				graded: true,
				index: 1,
				starts: true,
				ends: true,
			},
			{
				row: 0,
				x0: 40,
				x1: 60,
				kind: "rest",
				graded: true,
				index: 0,
				starts: true,
				ends: true,
			},
		]);
	});

	test("the count-in has no segment", () => {
		const { song, timeline } = timelineOf([[C, 0, 1]]);
		const layout = layoutOf(
			row(0, [
				{ x: 0, beat: -4 },
				{ x: 10, beat: -4 },
				{ x: 50, beat: 0 },
				{ x: 60, beat: 0 },
				{ x: 90, beat: 1 },
			]),
		);
		const segments = laneSegments(timeline, songLines(song, 2), layout, 60);
		expect(segments).toHaveLength(1);
		expect(segments[0]).toMatchObject({ x0: 60, x1: 82.5 });
	});

	test("a note tied over a bar line is one continuous segment", () => {
		const { song, timeline } = timelineOf([
			[C, 0, 1],
			[D, 3, 2],
		]);
		const lines = songLines(song, 2);
		expect(lines).toHaveLength(1);
		const layout = layoutOf(
			row(0, [
				{ x: 10, beat: 0 },
				{ x: 20, beat: 0 },
				{ x: 40, beat: 1 },
				{ x: 60, beat: 1 },
				{ x: 100, beat: 3 },
				{ x: 120, beat: 4 },
				{ x: 140, beat: 4 },
				{ x: 170, beat: 5 },
			]),
		);
		const note = laneSegments(timeline, lines, layout, 60).filter(
			(s) => s.kind === "note" && s.index === 1,
		);
		expect(note).toEqual([
			{
				row: 0,
				x0: 100,
				x1: 155,
				kind: "note",
				graded: true,
				index: 1,
				starts: true,
				ends: true,
			},
		]);
	});

	test("a note tied over a line break has a segment on each row", () => {
		const { song, timeline } = timelineOf([[D, 3, 2]]);
		// One bar a line: the note starts in line 0 and ends in line 1.
		const lines = songLines(song, 1);
		expect(lines).toHaveLength(2);
		const layout = layoutOf(
			row(0, [
				{ x: 10, beat: 0 },
				{ x: 40, beat: 0 },
				{ x: 100, beat: 3 },
				{ x: 120, beat: 4 },
			]),
			row(1, [
				{ x: 10, beat: 4 },
				{ x: 30, beat: 4 },
				{ x: 90, beat: 5 },
			]),
		);
		const notes = laneSegments(timeline, lines, layout, 60).filter(
			(s) => s.kind === "note",
		);
		expect(notes).toEqual([
			{
				row: 0,
				x0: 100,
				x1: 120,
				kind: "note",
				graded: true,
				index: 0,
				starts: true,
				ends: false,
			},
			{
				row: 1,
				x0: 30,
				x1: 60,
				kind: "note",
				graded: true,
				index: 0,
				starts: false,
				ends: true,
			},
		]);
	});

	test("a note over two line breaks has a segment on each of three rows (F10-S02 AC1)", () => {
		const { song, timeline } = timelineOf([[C, 0, 9]]);
		const lines = songLines(song, 1);
		const layout = layoutOf(
			row(0, [
				{ x: 10, beat: 0 },
				{ x: 40, beat: 0 },
				{ x: 120, beat: 4 },
			]),
			row(1, [
				{ x: 10, beat: 4 },
				{ x: 30, beat: 4 },
				{ x: 110, beat: 8 },
			]),
			row(2, [
				{ x: 10, beat: 8 },
				{ x: 30, beat: 8 },
				{ x: 70, beat: 12 },
			]),
		);
		const notes = laneSegments(timeline, lines, layout, 60).filter(
			(s) => s.kind === "note",
		);
		expect(notes.map((s) => s.row)).toEqual([0, 1, 2]);
		expect(notes.map((s) => [s.starts, s.ends])).toEqual([
			[true, false],
			[false, false],
			[false, true],
		]);
	});

	test("a note or rest too short to grade is marked", () => {
		const { song, timeline } = timelineOf([
			[C, 0, 1],
			[D, 1, 0.1],
			[C, 1.2, 1],
		]);
		const layout = layoutOf(
			row(0, [
				{ x: 10, beat: 0 },
				{ x: 20, beat: 0 },
				{ x: 50, beat: 1 },
				{ x: 60, beat: 1.1 },
				{ x: 70, beat: 1.2 },
				{ x: 100, beat: 2.2 },
			]),
		);
		const segments = laneSegments(timeline, songLines(song, 2), layout, 60);
		expect(segments.map((s) => [s.kind, s.index, s.graded]).sort()).toEqual([
			["note", 0, true],
			["note", 1, false],
			["note", 2, true],
			["rest", 0, false],
		]);
	});
});

describe("the release in the lane (F15-S03)", () => {
	/** One bar a line, so a note over a bar line crosses a line break. */
	const twoRows = layoutOf(
		row(0, [
			{ x: 10, beat: 0 },
			{ x: 20, beat: 0 },
			{ x: 100, beat: 4 },
		]),
		row(1, [
			{ x: 10, beat: 4 },
			{ x: 20, beat: 4 },
			{ x: 100, beat: 8 },
		]),
	);

	test("a plain join, a note before a rest and the last note end at the release start (AC1)", () => {
		const { song, timeline } = timelineOf([
			[C, 0, 1],
			[D, 1, 1],
			[C, 3, 1],
		]);
		// ♩ = 60: a one-second note's release is 250 ms, a quarter beat.
		const layout = layoutOf(
			row(0, [
				{ x: 10, beat: 0 },
				{ x: 20, beat: 0 },
				{ x: 60, beat: 4 },
			]),
		);
		const notes = laneSegments(timeline, songLines(song, 2), layout, 60).filter(
			(s) => s.kind === "note",
		);
		expect(notes.map((s) => [s.index, s.x0, s.x1])).toEqual([
			[0, 20, 20 + 0.75 * 10],
			[1, 20 + 1 * 10, 20 + 1.75 * 10],
			[2, 20 + 3 * 10, 20 + 3.75 * 10],
		]);
	});

	test("a note slurred into the next keeps its full length (AC2)", () => {
		const { song, timeline } = timelineOf([
			[C, 0, 1, true],
			[D, 1, 1],
		]);
		const layout = layoutOf(
			row(0, [
				{ x: 10, beat: 0 },
				{ x: 20, beat: 0 },
				{ x: 60, beat: 4 },
			]),
		);
		const notes = laneSegments(timeline, songLines(song, 2), layout, 60).filter(
			(s) => s.kind === "note",
		);
		expect(notes.map((s) => [s.index, s.x0, s.x1])).toEqual([
			[0, 20, 30],
			[1, 30, 30 + 0.75 * 10],
		]);
	});

	test("an ungraded note is shortened the same way (AC1)", () => {
		// 100 ms: not graded; its release is the 40 ms floor.
		const { song, timeline } = timelineOf([
			[C, 0, 1],
			[D, 1, 0.1],
			[C, 1.2, 1],
		]);
		const layout = layoutOf(
			row(0, [
				{ x: 10, beat: 0 },
				{ x: 20, beat: 0 },
				{ x: 120, beat: 10 },
			]),
		);
		const short = laneSegments(timeline, songLines(song, 2), layout, 60).find(
			(s) => s.kind === "note" && s.index === 1,
		);
		expect(short).toMatchObject({ graded: false });
		expect(short?.x0).toBeCloseTo(30, 9);
		expect(short?.x1).toBeCloseTo(20 + (1.1 - 0.04) * 10, 9);
	});

	test("a note with its release start on the first row has no segment on the second (AC3)", () => {
		// 2.4 beats from beat 2: written end 4.4, release 0.5 beat, so the release starts at 3.9.
		const { song, timeline } = timelineOf([[C, 2, 2.4]]);
		const lines = songLines(song, 1);
		const notes = laneSegments(timeline, lines, twoRows, 60).filter(
			(s) => s.kind === "note",
		);
		expect(notes.map((s) => [s.row, s.starts, s.ends])).toEqual([
			[0, true, true],
		]);
		// Its written end is still on the second row.
		const ends = laneNoteEnds(timeline, lines, twoRows, 60);
		expect(ends).toHaveLength(1);
		expect(ends[0]).toMatchObject({ index: 0, row: 1 });
		expect(ends[0]?.x).toBeCloseTo(28, 9);
	});

	test("a note with its release start on the second row has a segment on both (AC3)", () => {
		const { song, timeline } = timelineOf([[C, 2, 2.8]]);
		const lines = songLines(song, 1);
		const notes = laneSegments(timeline, lines, twoRows, 60).filter(
			(s) => s.kind === "note",
		);
		expect(notes.map((s) => [s.row, s.starts, s.ends])).toEqual([
			[0, true, false],
			[1, false, true],
		]);
		expect(notes[1]?.x1).toBeCloseTo(20 + (0.3 / 4) * 80, 9);
		const ends = laneNoteEnds(timeline, lines, twoRows, 60);
		expect(ends).toHaveLength(1);
		expect(ends[0]?.row).toBe(1);
		expect(ends[0]?.x).toBeCloseTo(20 + (0.8 / 4) * 80, 9);
	});

	test("laneNoteEnds puts each note's written end on its row, a slurred note's at its segment end (AC5)", () => {
		const { song, timeline } = timelineOf([
			[C, 0, 1, true],
			[D, 1, 1],
		]);
		const layout = layoutOf(
			row(0, [
				{ x: 10, beat: 0 },
				{ x: 20, beat: 0 },
				{ x: 60, beat: 4 },
			]),
		);
		const lines = songLines(song, 2);
		const ends = laneNoteEnds(timeline, lines, layout, 60);
		expect(ends).toEqual([
			{ index: 0, row: 0, x: 30 },
			{ index: 1, row: 0, x: 40 },
		]);
		const slurred = laneSegments(timeline, lines, layout, 60).find(
			(s) => s.kind === "note" && s.index === 0,
		);
		expect(slurred?.x1).toBe(30);
	});

	test("judging off draws the same shortened segments: laneSegments is the only source, with no scoring argument (AC6)", () => {
		const { song, timeline } = timelineOf([[C, 0, 1]]);
		const layout = layoutOf(
			row(0, [
				{ x: 10, beat: 0 },
				{ x: 20, beat: 0 },
				{ x: 60, beat: 4 },
			]),
		);
		expect(laneSegments.length).toBe(4);
		const [segment] = laneSegments(timeline, songLines(song, 2), layout, 60);
		expect(segment?.x1).toBe(27.5);
	});
});
