import {
	type CoverageResult,
	EDGE_GRACE_MS,
	type ItemScore,
	type Segment,
	TIMING_TOLERANCE_MS,
	type Timeline,
} from "../coverage";
import type { Song } from "../song";

/** A written length needs this many graded notes with a right reading to have its own length figure. */
export const PER_LENGTH_MIN = 3;
/** Tempo drift needs this many notes with a start offset. */
export const DRIFT_MIN_NOTES = 3;

/** Beats are rounded to this to tell lengths apart. */
const BEATS_ROUND = 1e3;

export interface AnalysisInput {
	song: Song;
	/** Quarter notes per minute, as the timeline was built with. */
	tempo: number;
	timeline: Timeline;
	/** The finished segments of the run (`progress().segments` after `finish()`). */
	segments: readonly Segment[];
	result: CoverageResult;
}

/** Shares of graded note time, each 0 to 1, adding up to 1. */
export interface Breakdown {
	inTune: number;
	outOfTune: number;
	silentBefore: number;
	silentAfter: number;
	silentMiddle: number;
	wrong: number;
	notPlayed: number;
}

export interface Drift {
	/** The fitted start offset in ms at the first and last note with one; positive is late. */
	first: number;
	last: number;
}

export interface Habits {
	/** Median start offset in ms (positive is late), null with no note that has one. */
	start: number | null;
	/** Median share of the written length a note sounds, from its start to its last right reading. */
	length: number | null;
	/** The same per written length with enough notes, longest first. */
	byLength: { beats: number; share: number }[];
	/** Median ms from a note's last right reading to the next one's first, over plain joins. */
	gap: number | null;
	/** Present only when the fitted offset changes by more than `TIMING_TOLERANCE_MS`. */
	drift: Drift | null;
}

export interface Analysis {
	breakdown: Breakdown;
	/** The share of graded rest time with sound in it; null with no graded rest. */
	restSound: number | null;
	habits: Habits;
}

/** The middle value; the mean of the middle two at an even count. */
export function median(values: readonly number[]): number {
	const sorted = [...values].sort((a, b) => a - b);
	const mid = sorted.length >> 1;
	return sorted.length % 2 === 1
		? (sorted[mid] as number)
		: ((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2;
}

/** The Theil–Sen line through the points: the median of pairwise slopes, and the median intercept. Points with equal x give no slope. */
export function theilSen(points: readonly { x: number; y: number }[]): {
	slope: number;
	intercept: number;
} | null {
	const slopes: number[] = [];
	for (let i = 0; i < points.length; i++) {
		for (let j = i + 1; j < points.length; j++) {
			const a = points[i] as { x: number; y: number };
			const b = points[j] as { x: number; y: number };
			if (a.x !== b.x) slopes.push((b.y - a.y) / (b.x - a.x));
		}
	}
	if (slopes.length === 0) return null;
	const slope = median(slopes);
	return {
		slope,
		intercept: median(points.map((p) => p.y - slope * p.x)),
	};
}

interface NoteSounds {
	/** Start of the first and end of the last right segment, or null with none. */
	firstRight: number | null;
	lastRightEnd: number | null;
	segments: Segment[];
}

/** Groups the graded notes' segments by note, in song index. */
function soundsByNote(
	timeline: Timeline,
	segments: readonly Segment[],
): Map<number, NoteSounds> {
	const byNote = new Map<number, NoteSounds>();
	const notes = timeline.notes.filter((n) => n.graded);
	for (const segment of segments) {
		if (segment.on !== "note" || !segment.graded) continue;
		const mid = (segment.startMs + segment.endMs) / 2;
		const note = notes.find((n) => mid >= n.startMs && mid < n.endMs);
		if (!note) continue;
		let sounds = byNote.get(note.index);
		if (!sounds) {
			sounds = { firstRight: null, lastRightEnd: null, segments: [] };
			byNote.set(note.index, sounds);
		}
		sounds.segments.push(segment);
		if (segment.kind.startsWith("right")) {
			if (sounds.firstRight === null) sounds.firstRight = segment.startMs;
			sounds.lastRightEnd = segment.endMs;
		}
	}
	return byNote;
}

function breakdownOf(
	timeline: Timeline,
	sounds: Map<number, NoteSounds>,
): Breakdown {
	const sums = {
		inTune: 0,
		outOfTune: 0,
		silentBefore: 0,
		silentAfter: 0,
		silentMiddle: 0,
		wrong: 0,
		notPlayed: 0,
	};
	let total = 0;
	for (const note of timeline.notes) {
		if (!note.graded) continue;
		const slurredStart = timeline.joins.some(
			(j) => j.after === note.index && j.kind === "slurred",
		);
		const slurredEnd = timeline.joins.some(
			(j) => j.before === note.index && j.kind === "slurred",
		);
		const a = note.startMs + (slurredStart ? 0 : EDGE_GRACE_MS);
		const b = note.endMs - (slurredEnd ? 0 : EDGE_GRACE_MS);
		total += b - a;
		const mine = sounds.get(note.index);
		const firstRight = mine?.firstRight ?? null;
		const lastRightEnd = mine?.lastRightEnd ?? null;
		/** Silent time of a piece, by where it falls relative to the right readings. */
		const silent = (from: number, to: number) => {
			const length = to - from;
			if (firstRight === null || lastRightEnd === null) {
				sums.notPlayed += length;
			} else if ((from + to) / 2 < firstRight) {
				sums.silentBefore += length;
			} else if ((from + to) / 2 > lastRightEnd) {
				sums.silentAfter += length;
			} else {
				sums.silentMiddle += length;
			}
		};
		// Walk the span left to right: segments in order, with silence in any hole.
		let at = a;
		const ordered = [...(mine?.segments ?? [])].sort(
			(x, y) => x.startMs - y.startMs,
		);
		for (const segment of ordered) {
			const start = Math.max(segment.startMs, a, at);
			const to = Math.min(segment.endMs, b);
			if (to <= start) continue;
			if (start > at) silent(at, start);
			const length = to - start;
			if (segment.kind === "right-in-tune") sums.inTune += length;
			else if (segment.kind === "right-out") sums.outOfTune += length;
			else if (segment.kind === "wrong") sums.wrong += length;
			else silent(start, to);
			at = to;
		}
		if (b > at) silent(at, b);
	}
	const share = (ms: number) => (total > 0 ? ms / total : 0);
	return {
		inTune: share(sums.inTune),
		outOfTune: share(sums.outOfTune),
		silentBefore: share(sums.silentBefore),
		silentAfter: share(sums.silentAfter),
		silentMiddle: share(sums.silentMiddle),
		wrong: share(sums.wrong),
		notPlayed: share(sums.notPlayed),
	};
}

function restSoundOf(items: readonly ItemScore[]): number | null {
	let sounded = 0;
	let span = 0;
	for (const item of items) {
		if (item.kind !== "rest" || !item.graded || item.soundedMs === null) {
			continue;
		}
		sounded += item.soundedMs;
		span += item.endMs - item.startMs - 2 * EDGE_GRACE_MS;
	}
	return span > 0 ? sounded / span : null;
}

function habitsOf(
	input: AnalysisInput,
	sounds: Map<number, NoteSounds>,
): Habits {
	const { song, timeline, result } = input;
	const notes = result.items.filter(
		(i): i is ItemScore => i.kind === "note" && i.graded,
	);
	const offsets: { x: number; y: number }[] = [];
	for (const item of notes) {
		if (item.soundStartMs !== null) {
			offsets.push({ x: item.startMs, y: item.soundStartMs - item.startMs });
		}
	}

	const lengths: { beats: number; share: number }[] = [];
	for (const item of notes) {
		const mine = sounds.get(item.index);
		if (!mine || mine.lastRightEnd === null) continue;
		const beats = song.notes[item.index]?.beats;
		if (beats === undefined) continue;
		lengths.push({
			beats: Math.round(beats * BEATS_ROUND) / BEATS_ROUND,
			share: (mine.lastRightEnd - item.startMs) / (item.endMs - item.startMs),
		});
	}
	const groups = new Map<number, number[]>();
	for (const { beats, share } of lengths) {
		groups.set(beats, [...(groups.get(beats) ?? []), share]);
	}
	const byLength = [...groups]
		.filter(([, shares]) => shares.length >= PER_LENGTH_MIN)
		.map(([beats, shares]) => ({ beats, share: median(shares) }))
		.sort((a, b) => b.beats - a.beats);

	const gaps: number[] = [];
	for (const join of timeline.joins) {
		if (join.kind !== "plain") continue;
		const before = sounds.get(join.before);
		const after = sounds.get(join.after);
		if (!before || !after) continue;
		if (before.lastRightEnd === null || after.firstRight === null) continue;
		gaps.push(after.firstRight - before.lastRightEnd);
	}

	let drift: Drift | null = null;
	if (offsets.length >= DRIFT_MIN_NOTES) {
		const fit = theilSen(offsets);
		if (fit) {
			const xs = offsets.map((p) => p.x);
			const at = (x: number) => fit.intercept + fit.slope * x;
			const first = at(Math.min(...xs));
			const last = at(Math.max(...xs));
			if (Math.abs(last - first) > TIMING_TOLERANCE_MS) {
				drift = { first, last };
			}
		}
	}

	return {
		start: offsets.length > 0 ? median(offsets.map((p) => p.y)) : null,
		length: lengths.length > 0 ? median(lengths.map((l) => l.share)) : null,
		byLength,
		gap: gaps.length > 0 ? median(gaps) : null,
		drift,
	};
}

/** Why the score is what it is. Null when nothing was graded. */
export function analyse(input: AnalysisInput): Analysis | null {
	if (input.result.graded === 0) return null;
	// Only graded rests: there is no note time to divide.
	if (!input.timeline.notes.some((n) => n.graded)) return null;
	const sounds = soundsByNote(input.timeline, input.segments);
	return {
		breakdown: breakdownOf(input.timeline, sounds),
		restSound: restSoundOf(input.result.items),
		habits: habitsOf(input, sounds),
	};
}
