import {
	centsFrom,
	judge,
	nearestPitch,
	passesChecks,
	type Reading,
	type StabilityOptions,
} from "../judge";
import type { Pitch } from "../pitch";
import type { Song } from "../song";

// Starting values, to be tuned in the live check (ADR 0009).
/** Left out at each edge of a note or rest, so a release or the previous pitch blurring in is not counted. */
export const EDGE_GRACE_MS = 40;
/** Readings in a row on the same other note before they count as wrong. */
export const WRONG_RUN = 3;
/** How far an edge may be from the written time before it is a timing fault, and how far from a join a gap may be. */
export const TIMING_TOLERANCE_MS = 60;
/** How far below its surroundings a level must fall to be a gap between notes. */
export const GAP_DIP_DB = 10;
/** The surroundings of a level block, for its median: this long in all, centred on it. */
export const GAP_MEDIAN_WINDOW_MS = 100;
/** The least a note or rest may have left, after both graces, to be graded. */
export const MIN_SCORED_SPAN_MS = 50;
/** A reading this close to the expected pitch is the right note, in tune or not. */
export const RIGHT_NOTE_BAND_CENTS = 50;
/** The pitch trace and the tuning list count readings this close to the expected pitch. */
export const TRACE_SPAN_CENTS = 150;
/** A note or rest shorter than this is drawn and not graded. */
export const MIN_GRADED_MS = 2 * EDGE_GRACE_MS + MIN_SCORED_SPAN_MS;

/** How many tuning offsets the list names. */
const TUNING_LIST_LENGTH = 3;
/** Beats closer than this count as the same time, as abcjs rounds its starts. */
const BEAT_EPSILON = 1e-3;
/** Absorbs floating-point error in lengths that came from beats and a tempo. */
const MS_EPSILON = 1e-6;
/** A note or rest is final once readings are this far past its end: room for the late edge and the level check. */
const FINAL_DELAY_MS = TIMING_TOLERANCE_MS + GAP_MEDIAN_WINDOW_MS;

/** A detector reading placed in song time: ms from the first note's start, negative in the count-in. */
export type CoverageReading = Reading;

/** The RMS level of one short block of samples. `time` is the block's end, in song time. */
export interface EnvelopeBlock {
	time: number;
	level: number;
}

export interface CoverageOptions {
	/** In tune when a right-note reading is within this many cents. */
	toleranceCents: number;
	checks: StabilityOptions;
	/** The pitch the instrument sounds for a written pitch. */
	sounding(written: Pitch): Pitch;
}

export interface TimelineNote {
	index: number;
	written: Pitch;
	startMs: number;
	/** The end of the note's written length, not of its slot. */
	endMs: number;
	graded: boolean;
}

export interface TimelineRest {
	startMs: number;
	endMs: number;
	graded: boolean;
}

/** Where two notes with no rest between them meet. */
export interface TimelineJoin {
	/** Song indexes of the two notes. */
	before: number;
	after: number;
	atMs: number;
	kind: "plain" | "slurred";
}

export interface Timeline {
	notes: readonly TimelineNote[];
	rests: readonly TimelineRest[];
	joins: readonly TimelineJoin[];
}

/** The song's notes, the rests between them and the joins of neighbouring notes, in ms at `tempo` (quarter notes per minute). */
export function buildTimeline(song: Song, tempo: number): Timeline {
	const ms = (beats: number) => (beats * 60000) / tempo;
	const notes: TimelineNote[] = [];
	const rests: TimelineRest[] = [];
	const joins: TimelineJoin[] = [];
	song.notes.forEach((note, i) => {
		const length = ms(note.beats);
		notes.push({
			index: i,
			written: note.pitch,
			startMs: ms(note.start),
			endMs: ms(note.start + note.beats),
			graded: length >= MIN_GRADED_MS - MS_EPSILON,
		});
		const next = song.notes[i + 1];
		if (!next) return;
		const end = note.start + note.beats;
		if (next.start - end > BEAT_EPSILON) {
			const startMs = ms(end);
			const endMs = ms(next.start);
			rests.push({
				startMs,
				endMs,
				graded: endMs - startMs >= MIN_GRADED_MS - MS_EPSILON,
			});
		} else {
			joins.push({
				before: i,
				after: i + 1,
				atMs: ms(next.start),
				kind: note.slurred ? "slurred" : "plain",
			});
		}
	});
	return { notes, rests, joins };
}

export type Classified =
	| { kind: "right"; inTune: boolean; cents: number }
	/** Passes the checks but is not the expected note: wrong once it lasts `WRONG_RUN` readings. */
	| { kind: "pending"; nearest: Pitch; cents: number }
	| { kind: "silent" };

/**
 * One reading against the expected sounding pitch (null on a rest). `cents` is
 * the offset from the expected pitch, or from the nearest note on a rest.
 */
export function classify(
	reading: CoverageReading,
	expected: Pitch | null,
	options: CoverageOptions,
): Classified {
	if (!passesChecks(reading, options.checks)) return { kind: "silent" };
	const hz = reading.frequency as number;
	if (expected === null) {
		const near = nearestPitch(hz);
		return { kind: "pending", nearest: near.pitch, cents: near.cents };
	}
	const cents = centsFrom(hz, expected);
	if (Math.abs(cents) <= RIGHT_NOTE_BAND_CENTS) {
		return {
			kind: "right",
			inTune: judge(expected, hz, options.toleranceCents) === "correct",
			cents,
		};
	}
	return { kind: "pending", nearest: nearestPitch(hz).pitch, cents };
}

export type SegmentKind = "right-in-tune" | "right-out" | "wrong" | "silent";

/** A run of readings of one class inside one note or rest. */
export interface Segment {
	startMs: number;
	endMs: number;
	kind: SegmentKind;
	on: "note" | "rest";
	/** False in a note or rest too short to grade: it is drawn and never filled. */
	graded: boolean;
	/** One per sounding reading (right or confirmed wrong): its offset in cents from the expected pitch. */
	points: { timeMs: number; cents: number }[];
}

export interface TimingFault {
	/** Song index of the note. */
	index: number;
	edge: "start" | "end";
	kind: "late" | "early";
}

export interface JoinFault {
	before: number;
	after: number;
	atMs: number;
}

export interface Progress {
	/** Segments of finished notes and rests. The same array grows and nothing in it changes. */
	segments: readonly Segment[];
	/** Segments of the notes and rests still open, from the readings so far. They can change on the next push. */
	open: readonly Segment[];
	/** Found as each note is finished; the same array grows. */
	timingFaults: readonly TimingFault[];
	notSeparated: readonly JoinFault[];
}

export interface ItemScore {
	kind: "note" | "rest";
	/** The song index of a note; a rest's place among the rests. */
	index: number;
	startMs: number;
	endMs: number;
	graded: boolean;
	/** The share of the scored span filled; null when not graded. */
	coverage: number | null;
	/** A note's in-tune share of its right-note time; null with none or when not graded. */
	inTune: number | null;
	/** A graded note has an edge where it has right-note time, except at a join with no gap to see. */
	startEdge: boolean;
	endEdge: boolean;
}

export interface Figure {
	faults: number;
	/** The graded notes that have the edge. */
	withEdge: number;
}

export interface CoverageResult {
	/** Mean over graded notes and rests, 0 to 1; null when none was graded. */
	coverage: number | null;
	/** Mean of each note's in-tune share over notes with right-note time; null when none. */
	inTune: number | null;
	/** Graded notes and rests. */
	graded: number;
	/** Notes too short to grade. */
	tooShort: number;
	tooShortRests: number;
	timing: {
		startedLate: Figure;
		startedEarly: Figure;
		endedEarly: Figure;
		endedLate: Figure;
	};
	separation: { notSeparated: number; plainJoins: number };
	/** Up to three written pitches whose average offset is outside the tolerance, worst first. */
	tuning: { pitch: Pitch; cents: number }[];
	items: readonly ItemScore[];
	timingFaults: readonly TimingFault[];
	notSeparatedJoins: readonly JoinFault[];
}

export interface CoverageRun {
	/** Readings must come in time order. */
	pushReading(reading: CoverageReading): void;
	/** Level blocks, in time order. */
	pushEnvelope(blocks: readonly EnvelopeBlock[]): void;
	progress(): Progress;
	/** Settles every reading and scores what is left. Later pushes are ignored. */
	finish(): CoverageResult;
}

interface Item {
	kind: "note" | "rest";
	index: number;
	startMs: number;
	endMs: number;
	graded: boolean;
	/** The expected sounding pitch of a note. */
	expected: Pitch | null;
	written: Pitch | null;
	/** The first and last entries placed in this item, or -1. */
	first: number;
	last: number;
}

interface Entry {
	time: number;
	/** Until the next reading's time; the newest reading's own time until another comes. */
	end: number;
	passes: boolean;
	frequency: number | null;
	item: number;
	kind: SegmentKind;
	/** Set while the reading passes the checks but is not the expected note. */
	other: Pitch | null;
	cents: number;
}

interface JoinState {
	join: TimelineJoin;
	separated: boolean | null;
}

function median(values: number[]): number {
	const sorted = [...values].sort((a, b) => a - b);
	const mid = sorted.length >> 1;
	return sorted.length % 2 === 1
		? (sorted[mid] as number)
		: ((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2;
}

/** The first index whose `time` is at least `time`. */
function lowerBound(list: readonly { time: number }[], time: number): number {
	let lo = 0;
	let hi = list.length;
	while (lo < hi) {
		const mid = (lo + hi) >> 1;
		if ((list[mid] as { time: number }).time < time) lo = mid + 1;
		else hi = mid;
	}
	return lo;
}

function overlap(a0: number, a1: number, b0: number, b1: number): number {
	return Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));
}

export function createCoverageRun(
	timeline: Timeline,
	options: CoverageOptions,
): CoverageRun {
	const { toleranceCents } = options;
	const items: Item[] = [
		...timeline.notes.map(
			(n): Item => ({
				kind: "note",
				index: n.index,
				startMs: n.startMs,
				endMs: n.endMs,
				graded: n.graded,
				expected: options.sounding(n.written),
				written: n.written,
				first: -1,
				last: -1,
			}),
		),
		...timeline.rests.map(
			(r, i): Item => ({
				kind: "rest",
				index: i,
				startMs: r.startMs,
				endMs: r.endMs,
				graded: r.graded,
				expected: null,
				written: null,
				first: -1,
				last: -1,
			}),
		),
	].sort((a, b) => a.startMs - b.startMs);

	const noteItem = new Map<number, number>();
	items.forEach((item, k) => {
		if (item.kind === "note") noteItem.set(item.index, k);
	});
	const joinAfter = new Map<number, JoinState>();
	const joinBefore = new Map<number, JoinState>();
	for (const join of timeline.joins) {
		const state: JoinState = { join, separated: null };
		joinAfter.set(join.before, state);
		joinBefore.set(join.after, state);
	}

	const entries: Entry[] = [];
	const blocks: EnvelopeBlock[] = [];
	const scores: (ItemScore | undefined)[] = [];
	const finalSegments: Segment[] = [];
	const timingFaults: TimingFault[] = [];
	const notSeparated: JoinFault[] = [];
	let cursor = 0;
	let finalCount = 0;
	let run: number[] = [];
	let finished: CoverageResult | null = null;

	/** The item due at `time`, or -1 before the first note and after the last. */
	function dueAt(time: number): number {
		while (cursor < items.length && time >= (items[cursor] as Item).endMs) {
			cursor++;
		}
		const item = items[cursor];
		return item && time >= item.startMs ? cursor : -1;
	}

	function matches(entry: Entry, expected: Pitch): boolean {
		return (
			entry.passes &&
			Math.abs(centsFrom(entry.frequency as number, expected)) <=
				RIGHT_NOTE_BAND_CENTS
		);
	}

	function pushReading(reading: CoverageReading): void {
		if (finished) return;
		const index = entries.length;
		const item = dueAt(reading.time);
		const expected = item < 0 ? null : (items[item] as Item).expected;
		const entry: Entry = {
			time: reading.time,
			end: reading.time,
			passes: false,
			frequency: null,
			item,
			kind: "silent",
			other: null,
			cents: 0,
		};
		const previous = entries[index - 1];
		if (previous) previous.end = reading.time;
		entries.push(entry);
		if (item < 0) {
			entry.passes = passesChecks(reading, options.checks);
			entry.frequency = entry.passes ? reading.frequency : null;
			run = [];
		} else {
			const c = classify(reading, expected, options);
			entry.passes = c.kind !== "silent";
			entry.frequency = entry.passes ? reading.frequency : null;
			if (c.kind === "right") {
				entry.kind = c.inTune ? "right-in-tune" : "right-out";
				entry.cents = c.cents;
				run = [];
			} else if (c.kind === "pending") {
				entry.other = c.nearest;
				entry.cents = c.cents;
				const last = run[run.length - 1];
				if (last === index - 1 && entries[last]?.other === c.nearest) {
					run.push(index);
				} else {
					run = [index];
				}
				if (run.length === WRONG_RUN) {
					for (const i of run) (entries[i] as Entry).kind = "wrong";
				} else if (run.length > WRONG_RUN) {
					entry.kind = "wrong";
				}
			} else {
				run = [];
			}
			const placed = items[item] as Item;
			if (placed.first < 0) placed.first = index;
			placed.last = index;
		}
		advance();
	}

	function pushEnvelope(more: readonly EnvelopeBlock[]): void {
		if (finished) return;
		for (const block of more) blocks.push(block);
	}

	/** Scores every item whose readings are final and whose surroundings have been seen. */
	function advance(): void {
		const idx = entries.length - (WRONG_RUN - 1);
		if (idx <= 0) return;
		const settledUntil = (entries[idx] as Entry).time;
		while (
			finalCount < items.length &&
			(items[finalCount] as Item).endMs + FINAL_DELAY_MS < settledUntil
		) {
			finalise(finalCount++);
		}
	}

	/** Whether a gap shows within the timing tolerance of the join: a reading that fails the checks, or a dip in the level that recovers. */
	function isSeparated(join: TimelineJoin): boolean {
		const lo = join.atMs - TIMING_TOLERANCE_MS;
		const hi = join.atMs + TIMING_TOLERANCE_MS;
		for (let i = lowerBound(entries, lo); i < entries.length; i++) {
			const e = entries[i] as Entry;
			if (e.time > hi) break;
			if (!e.passes) return true;
		}
		const half = GAP_MEDIAN_WINDOW_MS / 2;
		for (let i = lowerBound(blocks, lo); i < blocks.length; i++) {
			const block = blocks[i] as EnvelopeBlock;
			if (block.time > hi) break;
			const from = lowerBound(blocks, block.time - half);
			const levels: number[] = [];
			for (let j = from; j < blocks.length; j++) {
				const near = blocks[j] as EnvelopeBlock;
				if (near.time > block.time + half) break;
				levels.push(near.level);
			}
			const floor = median(levels) - GAP_DIP_DB;
			if (!(block.level <= floor)) continue;
			for (let j = i + 1; j < blocks.length; j++) {
				const later = blocks[j] as EnvelopeBlock;
				if (later.time > block.time + half) break;
				if (later.level > floor) return true;
			}
		}
		return false;
	}

	/** The item's entries as merged segments, runs of one class. */
	function segmentsOf(item: Item, k: number): Segment[] {
		const out: Segment[] = [];
		if (item.first < 0) return out;
		for (let i = item.first; i <= item.last; i++) {
			const e = entries[i] as Entry;
			if (e.item !== k) continue;
			const startMs = Math.max(e.time, item.startMs);
			const endMs = Math.min(e.end, item.endMs);
			if (endMs <= startMs) continue;
			const point =
				e.passes && (e.kind === "wrong" || e.kind.startsWith("right"))
					? { timeMs: e.time, cents: e.cents }
					: null;
			const tail = out[out.length - 1];
			if (tail && tail.kind === e.kind && tail.endMs === startMs) {
				tail.endMs = endMs;
				if (point) tail.points.push(point);
			} else {
				out.push({
					startMs,
					endMs,
					kind: e.kind,
					on: item.kind,
					graded: item.graded,
					points: point ? [point] : [],
				});
			}
		}
		return out;
	}

	function sameSoundingPitch(a: Item | undefined, b: Item): boolean {
		return a?.expected !== null && a?.expected === b.expected;
	}

	function finalise(k: number): void {
		const item = items[k] as Item;
		// The note's own edges need to know whether its end join is separated.
		const after = item.kind === "note" ? joinAfter.get(item.index) : undefined;
		if (after?.join.kind === "plain") {
			after.separated = isSeparated(after.join);
			if (!after.separated) {
				notSeparated.push({
					before: after.join.before,
					after: after.join.after,
					atMs: after.join.atMs,
				});
			}
		}
		scores[k] = scoreItem(item, k);
		for (const segment of segmentsOf(item, k)) finalSegments.push(segment);
	}

	/** Whether a note meets a same-pitch neighbour at a join where nothing shows the change. */
	function blindEdge(state: JoinState | undefined, item: Item, other: number) {
		if (!state) return false;
		const neighbour = items[noteItem.get(other) as number];
		if (!sameSoundingPitch(neighbour, item)) return false;
		return state.join.kind === "slurred" || state.separated === false;
	}

	/** The join before a note has been looked at when this runs: its first note finished earlier. */
	function scoreItem(item: Item, k: number): ItemScore {
		const base: ItemScore = {
			kind: item.kind,
			index: item.index,
			startMs: item.startMs,
			endMs: item.endMs,
			graded: item.graded,
			coverage: null,
			inTune: null,
			startEdge: false,
			endEdge: false,
		};
		if (!item.graded) return base;
		const before = item.kind === "note" ? joinBefore.get(item.index) : undefined;
		const after = item.kind === "note" ? joinAfter.get(item.index) : undefined;
		const slurredStart = before?.join.kind === "slurred";
		const slurredEnd = after?.join.kind === "slurred";
		const a = item.startMs + (slurredStart ? 0 : EDGE_GRACE_MS);
		const b = item.endMs - (slurredEnd ? 0 : EDGE_GRACE_MS);
		const span = b - a;
		const previous = before
			? (items[noteItem.get(before.join.before) as number] as Item)
			: undefined;
		const next = after
			? (items[noteItem.get(after.join.after) as number] as Item)
			: undefined;
		const previousPitch = previous?.expected ?? null;
		const nextPitch = next?.expected ?? null;

		let covered = 0;
		let right = 0;
		let inTune = 0;
		for (let i = lowerBound(entries, a) - 1; i < entries.length; i++) {
			const e = entries[i];
			if (!e) continue;
			if (e.time >= b) break;
			const ov = overlap(e.time, e.end, a, b);
			if (ov <= 0) continue;
			if (e.item === k) {
				if (item.kind === "rest") {
					if (e.kind === "silent") covered += ov;
				} else if (e.kind === "right-in-tune" || e.kind === "right-out") {
					covered += ov;
					right += ov;
					if (e.kind === "right-in-tune") inTune += ov;
					continue;
				}
			}
			if (item.kind !== "note") continue;
			// The grace at a slurred join forgives the neighbour's pitch, not silence.
			if (slurredStart && previousPitch !== null && matches(e, previousPitch)) {
				covered += overlap(e.time, e.end, a, a + EDGE_GRACE_MS);
			}
			if (slurredEnd && nextPitch !== null && matches(e, nextPitch)) {
				covered += overlap(e.time, e.end, b - EDGE_GRACE_MS, b);
			}
		}
		base.coverage = Math.min(1, covered / span);
		if (item.kind === "rest") return base;
		base.inTune = right > 0 ? inTune / right : null;

		// The edges are the first and last right-note readings, wherever silence falls between.
		let first = -1;
		let last = -1;
		for (let i = item.first; i >= 0 && i <= item.last; i++) {
			const e = entries[i] as Entry;
			if (e.item === k && e.kind.startsWith("right")) {
				if (first < 0) first = i;
				last = i;
			}
		}
		if (first < 0) return base;
		const expected = item.expected as Pitch;
		const blindStart = blindEdge(before, item, before?.join.before ?? -1);
		const blindEnd = blindEdge(after, item, after?.join.after ?? -1);
		const fault = (edge: "start" | "end", kind: "late" | "early") =>
			timingFaults.push({ index: item.index, edge, kind });
		if (!blindStart) {
			base.startEdge = true;
			const startEdge = (entries[first] as Entry).time;
			if (startEdge - item.startMs > TIMING_TOLERANCE_MS) {
				fault("start", "late");
			} else {
				// The right pitch already sounding before the note starts; a same-pitch neighbour's own sound is not.
				const own = sameSoundingPitch(
					items[noteItem.get(before?.join.before ?? -1) as number],
					item,
				);
				let runStart = startEdge;
				for (let j = first - 1; j >= 0; j--) {
					const e = entries[j] as Entry;
					if (!matches(e, expected) || (own && e.item !== k)) break;
					runStart = e.time;
				}
				if (item.startMs - runStart > TIMING_TOLERANCE_MS) {
					fault("start", "early");
				}
			}
		}
		if (!blindEnd) {
			base.endEdge = true;
			const endEdge = (entries[last] as Entry).end;
			if (item.endMs - endEdge > TIMING_TOLERANCE_MS) {
				fault("end", "early");
			} else {
				const own = sameSoundingPitch(
					items[noteItem.get(after?.join.after ?? -1) as number],
					item,
				);
				let runEnd = endEdge;
				for (let j = last + 1; j < entries.length; j++) {
					const e = entries[j] as Entry;
					if (!matches(e, expected) || (own && e.item !== k)) break;
					runEnd = e.end;
				}
				if (runEnd - item.endMs > TIMING_TOLERANCE_MS) fault("end", "late");
			}
		}
		return base;
	}

	function progress(): Progress {
		const open: Segment[] = [];
		const newest = entries[entries.length - 1];
		for (let k = finalCount; k < items.length && newest; k++) {
			const item = items[k] as Item;
			if (item.startMs > newest.time) break;
			open.push(...segmentsOf(item, k));
		}
		return { segments: finalSegments, open, timingFaults, notSeparated };
	}

	function tuningList(): { pitch: Pitch; cents: number }[] {
		const sums = new Map<Pitch, { total: number; count: number }>();
		for (const e of entries) {
			const item = items[e.item];
			if (!item || item.kind !== "note" || !e.passes) continue;
			if (Math.abs(e.cents) > TRACE_SPAN_CENTS) continue;
			const key = item.written as Pitch;
			const sum = sums.get(key) ?? { total: 0, count: 0 };
			sum.total += e.cents;
			sum.count++;
			sums.set(key, sum);
		}
		return [...sums]
			.map(([pitch, { total, count }]) => ({ pitch, cents: total / count }))
			.filter((t) => Math.abs(t.cents) > toleranceCents)
			.sort((a, b) => Math.abs(b.cents) - Math.abs(a.cents))
			.slice(0, TUNING_LIST_LENGTH);
	}

	function finish(): CoverageResult {
		if (finished) return finished;
		const lastEntry = entries[entries.length - 1];
		const before = entries[entries.length - 2];
		if (lastEntry && before) {
			lastEntry.end = lastEntry.time + (lastEntry.time - before.time);
		}
		while (finalCount < items.length) finalise(finalCount++);

		const done = scores as ItemScore[];
		const graded = done.filter((s) => s.graded);
		const noteScores = done.filter((s) => s.kind === "note");
		const tuned = graded.filter(
			(s) => s.kind === "note" && s.inTune !== null,
		);
		const mean = (values: number[]) =>
			values.length === 0
				? null
				: values.reduce((sum, v) => sum + v, 0) / values.length;
		const figure = (
			edge: "start" | "end",
			kind: "late" | "early",
		): Figure => ({
			faults: timingFaults.filter((f) => f.edge === edge && f.kind === kind)
				.length,
			withEdge: noteScores.filter((s) => (edge === "start" ? s.startEdge : s.endEdge))
				.length,
		});
		finished = {
			coverage: mean(graded.map((s) => s.coverage as number)),
			inTune: mean(tuned.map((s) => s.inTune as number)),
			graded: graded.length,
			tooShort: noteScores.filter((s) => !s.graded).length,
			tooShortRests: done.filter((s) => s.kind === "rest" && !s.graded).length,
			timing: {
				startedLate: figure("start", "late"),
				startedEarly: figure("start", "early"),
				endedEarly: figure("end", "early"),
				endedLate: figure("end", "late"),
			},
			separation: {
				notSeparated: notSeparated.length,
				plainJoins: timeline.joins.filter((j) => j.kind === "plain").length,
			},
			tuning: tuningList(),
			items: done,
			timingFaults,
			notSeparatedJoins: notSeparated,
		};
		return finished;
	}

	return { pushReading, pushEnvelope, progress, finish };
}
