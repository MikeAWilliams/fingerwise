import {
	type CoverageResult,
	EDGE_GRACE_MS,
	type ItemScore,
	type Segment,
	TIMING_TOLERANCE_MS,
	type Timeline,
} from "../coverage";
import { type Song, songBars } from "../song";

/** A written length needs this many graded notes with a right reading to have its own length figure. */
export const PER_LENGTH_MIN = 3;
/** Tempo drift needs this many notes with a start offset. */
export const DRIFT_MIN_NOTES = 3;

/** A practice spot spans this many bars in a row. */
export const SPAN_BARS = 2;
/** At most this many spots are reported. */
export const MAX_SPOTS = 2;
/** Significance level of the one-sided rank test, before the correction for the number of spans tried. */
export const SPOT_ALPHA = 0.05;
/** A song needs this many bars to have candidates. */
export const MIN_BARS = 3;
/** The exact p-value costs about `N * m * cap` additions; above this the normal approximation is used. */
export const EXACT_BUDGET = 2e6;

/** Values closer than this are tied in the rank test. */
const TIE_EPSILON = 1e-9;
/** Absorbs floating-point error when placing an item in a bar. */
const MS_EPSILON = 1e-6;
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

/** A span of bars that went clearly worse than the rest. */
export interface Spot {
	/** Bar numbers counted from 1 over `songBars`, so a pickup bar is bar 1. */
	firstBar: number;
	lastBar: number;
	/** Beats from the first note's start: the first bar's start, and the next bar's start or the song's end. */
	startBeat: number;
	endBeat: number;
	/** Mean coverage of the graded notes and rests in the span, and outside it. */
	coverage: number;
	elsewhere: number;
	/** The corrected-for threshold is `SPOT_ALPHA` over the number of spans tried. */
	p: number;
}

export interface Practice {
	/** False when the song is too short, or nothing could be compared. */
	tested: boolean;
	spots: Spot[];
}

export interface Analysis {
	breakdown: Breakdown;
	/** The share of graded rest time with sound in it; null with no graded rest. */
	restSound: number | null;
	habits: Habits;
	practice: Practice;
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
		practice: practiceSpots(input),
	};
}

/** The standard normal CDF, to about 1e-13: a series for the middle, a continued fraction in the tails. */
function normalCdf(z: number): number {
	if (z > 8) return 1;
	if (z < -8) return 0;
	const x = Math.abs(z) / Math.SQRT2;
	let erfc: number;
	if (x < 2.5) {
		let term = x;
		let total = x;
		for (let n = 1; n < 80; n++) {
			term *= (-x * x) / n;
			total += term / (2 * n + 1);
		}
		erfc = 1 - (2 / Math.sqrt(Math.PI)) * total;
	} else {
		let fraction = x;
		for (let k = 60; k >= 1; k--) fraction = x + k / 2 / fraction;
		erfc = Math.exp(-x * x) / Math.sqrt(Math.PI) / fraction;
	}
	return z < 0 ? erfc / 2 : 1 - erfc / 2;
}

interface Ranked {
	/** Twice the mid-rank of each span value, so every rank is an integer. */
	doubled: number[];
	/** The same for every pooled value, in order. */
	all: number[];
	/** Sizes of the groups of tied values, for the variance. */
	ties: number[];
}

/** Ranks `span` then `rest` pooled, values within `TIE_EPSILON` tied; returns the doubled mid-ranks of the span. */
function rank(span: readonly number[], rest: readonly number[]): Ranked {
	const pooled = [
		...span.map((value) => ({ value, own: true })),
		...rest.map((value) => ({ value, own: false })),
	].sort((a, b) => a.value - b.value);
	const doubled: number[] = [];
	const all: number[] = [];
	const ties: number[] = [];
	for (let i = 0; i < pooled.length; ) {
		let j = i;
		while (
			j + 1 < pooled.length &&
			(pooled[j + 1] as { value: number }).value -
				(pooled[i] as { value: number }).value <=
				TIE_EPSILON
		) {
			j++;
		}
		// Positions i + 1 to j + 1: the mid-rank is their mean, doubled it is their sum.
		for (let k = i; k <= j; k++) {
			all.push(i + 1 + j + 1);
			if ((pooled[k] as { own: boolean }).own) doubled.push(i + 1 + j + 1);
		}
		ties.push(j - i + 1);
		i = j + 1;
	}
	return { doubled, all, ties };
}

/**
 * The one-sided p-value of `span` being lower than `rest` by the normal
 * approximation: tie-corrected variance and a 0.5 continuity correction. 1
 * when every value is tied.
 */
export function mannWhitneyNormal(
	span: readonly number[],
	rest: readonly number[],
): number {
	const m = span.length;
	const n = rest.length;
	if (m === 0 || n === 0) return 1;
	const total = m + n;
	const { doubled, ties } = rank(span, rest);
	const w = doubled.reduce((a, b) => a + b, 0) / 2;
	const mean = (m * (total + 1)) / 2;
	const tieSum = ties.reduce((a, t) => a + t * t * t - t, 0);
	const variance =
		((m * n) / 12) * (total + 1 - tieSum / (total * (total - 1)));
	if (!(variance > 0)) return 1;
	return normalCdf((w + 0.5 - mean) / Math.sqrt(variance));
}

/**
 * The exact one-sided p-value of `span` being lower, from the permutation
 * distribution of its doubled rank sum given the pooled values (ties and all);
 * null when the work would exceed `EXACT_BUDGET`.
 */
export function mannWhitneyExact(
	span: readonly number[],
	rest: readonly number[],
): number | null {
	const m = span.length;
	const total = m + rest.length;
	if (m === 0 || rest.length === 0) return 1;
	const { doubled, all } = rank(span, rest);
	const observed = doubled.reduce((a, b) => a + b, 0);
	if (total * m * (observed + 1) > EXACT_BUDGET) return null;
	// ways[j][s]: the ways to pick j items with doubled rank sum s, for s up to the observed sum.
	const ways = Array.from(
		{ length: m + 1 },
		() => new Float64Array(observed + 1),
	);
	(ways[0] as Float64Array)[0] = 1;
	all.forEach((d, i) => {
		for (let j = Math.min(i + 1, m); j >= 1; j--) {
			const to = ways[j] as Float64Array;
			const from = ways[j - 1] as Float64Array;
			for (let s = observed; s >= d; s--)
				to[s] = (to[s] as number) + (from[s - d] as number);
		}
	});
	let choose = 1;
	for (let i = 1; i <= m; i++) choose = (choose * (total - m + i)) / i;
	let count = 0;
	for (const c of ways[m] as Float64Array) count += c;
	return Math.min(1, count / choose);
}

/**
 * The one-sided p-value of `span` being lower than `rest`, with mid-ranks for
 * ties: exact when the work is within `EXACT_BUDGET`, else the normal
 * approximation. An observed rank sum at or above the null mean cannot be
 * significant and takes the normal value.
 */
export function mannWhitneyLower(
	span: readonly number[],
	rest: readonly number[],
): number {
	const m = span.length;
	const n = rest.length;
	if (m === 0 || n === 0) return 1;
	const observed = rank(span, rest).doubled.reduce((a, b) => a + b, 0);
	if (observed >= m * (m + n + 1)) return mannWhitneyNormal(span, rest);
	return mannWhitneyExact(span, rest) ?? mannWhitneyNormal(span, rest);
}

const mean = (values: readonly number[]) =>
	values.reduce((a, b) => a + b, 0) / values.length;

/** Spans of `SPAN_BARS` bars whose coverages are significantly lower than the rest of the song's. */
export function practiceSpots(
	input: Pick<AnalysisInput, "song" | "tempo"> & {
		result: Pick<CoverageResult, "items">;
	},
): Practice {
	const bars = songBars(input.song);
	if (bars.length < MIN_BARS) return { tested: false, spots: [] };
	const starts = bars.map((bar) => (bar.start * 60000) / input.tempo);
	const byBar: number[][] = bars.map(() => []);
	for (const item of input.result.items) {
		if (!item.graded || item.coverage === null) continue;
		let bar = 0;
		for (let b = 0; b < starts.length; b++) {
			if ((starts[b] as number) <= item.startMs + MS_EPSILON) bar = b;
		}
		(byBar[bar] as number[]).push(item.coverage);
	}

	const last = input.song.notes[input.song.notes.length - 1];
	const songEnd = last ? last.start + last.beats : 0;
	const candidates: (Spot & { first: number })[] = [];
	let tested = 0;
	for (let first = 0; first + SPAN_BARS <= bars.length; first++) {
		const inside: number[] = [];
		const outside: number[] = [];
		byBar.forEach((values, b) => {
			(b >= first && b < first + SPAN_BARS ? inside : outside).push(...values);
		});
		if (inside.length === 0 || outside.length === 0) continue;
		tested++;
		candidates.push({
			first,
			firstBar: first + 1,
			lastBar: first + SPAN_BARS,
			startBeat: (bars[first] as { start: number }).start,
			endBeat: bars[first + SPAN_BARS]?.start ?? songEnd,
			coverage: mean(inside),
			elsewhere: mean(outside),
			p: mannWhitneyLower(inside, outside),
		});
	}
	if (tested === 0) return { tested: false, spots: [] };

	const ordered = candidates
		.filter((c) => c.p < SPOT_ALPHA / tested)
		.sort((a, b) => a.p - b.p || a.coverage - b.coverage || a.first - b.first);
	const spots: Spot[] = [];
	const taken = new Set<number>();
	for (const { first, ...spot } of ordered) {
		if (spots.length === MAX_SPOTS) break;
		const used = Array.from({ length: SPAN_BARS }, (_, i) => first + i);
		if (used.some((b) => taken.has(b))) continue;
		for (const b of used) taken.add(b);
		spots.push(spot);
	}
	return { tested: true, spots };
}
