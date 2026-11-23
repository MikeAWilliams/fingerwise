import { describe, expect, test } from "vitest";
import { laneSegments } from "../../src/app/lane";
import { buildTimeline } from "../../src/core/coverage";
import type { Pitch } from "../../src/core/pitch";
import { createSong, DEFAULT_METER, songLines } from "../../src/core/song";
import type { RowLayout, SongLayout, Stop } from "../../src/render/staff";

const C = 60 as Pitch;
const D = 62 as Pitch;

/** At ♩ = 60 a beat is a second. */
function timelineOf(notes: [Pitch, number, number][]) {
	const song = createSong(
		notes.map(([pitch, start, beats]) => ({ pitch, start, beats })),
		{ tempo: 60, meter: DEFAULT_METER },
	);
	return { song, timeline: buildTimeline(song, 60) };
}

function row(line: number, stops: Stop[]): RowLayout {
	return {
		line,
		row: line % 2,
		top: 0,
		bottom: 0,
		laneTop: 0,
		laneBottom: 0,
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

describe("laneSegments (AC3, AC4)", () => {
	test("a note and a rest each span from their own x to where the next begins", () => {
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
				x1: 40,
				kind: "note",
				graded: true,
				index: 0,
				starts: true,
				ends: true,
			},
			{
				row: 0,
				x0: 60,
				x1: 80,
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
		expect(segments[0]).toMatchObject({ x0: 60, x1: 90 });
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
				x1: 170,
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
				x1: 90,
				kind: "note",
				graded: true,
				index: 0,
				starts: false,
				ends: true,
			},
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
