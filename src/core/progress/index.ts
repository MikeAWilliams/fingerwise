import type { Instrument } from "../instrument";
import { formatPitch, type Pitch, parsePitch } from "../pitch";

/** How far one grade moves a need towards its target. */
export const ALPHA = 0.3;

/** The smallest draw weight, so a well-known pitch still comes up. */
export const FLOOR = 0.05;

/** What progress learns from a card: a card's result reduced to two cases. */
export type ProgressGrade = "correct" | "miss";

/** Need per pitch, 0 (known) to 1 (needs work). A pitch with no entry needs 1. */
export type Scores = ReadonlyMap<Pitch, number>;

export function emptyScores(): Scores {
	return new Map();
}

/** The stored need of `pitch`, or 1 when it has none. */
export function needOf(scores: Scores, pitch: Pitch): number {
	return scores.get(pitch) ?? 1;
}

/** A new set of scores with `pitch` moved towards 0 for `correct`, towards 1 for `miss`. */
export function applyGrade(
	scores: Scores,
	pitch: Pitch,
	grade: ProgressGrade,
): Scores {
	const need = needOf(scores, pitch);
	const target = grade === "correct" ? 0 : 1;
	const next = new Map(scores);
	next.set(pitch, need + ALPHA * (target - need));
	return next;
}

/** Scores where every pitch needs 1 again. */
export function resetScores(): Scores {
	return emptyScores();
}

/** The weight of `pitch` in a weighted draw: its need, never below `FLOOR`. */
export function drawWeight(scores: Scores, pitch: Pitch): number {
	return Math.max(needOf(scores, pitch), FLOOR);
}

/** Stored form: written pitch name (`C♯5`) to need. */
export type ProgressJson = Record<string, number>;

export function toProgressJson(scores: Scores): ProgressJson {
	const json: ProgressJson = {};
	for (const [pitch, need] of scores) json[formatPitch(pitch)] = need;
	return json;
}

/**
 * Scores from stored JSON. Entries whose name does not parse, lies outside the
 * instrument's written range, or whose value is not a finite number from 0 to 1
 * are dropped. Anything that is not an object gives no scores. Never throws.
 */
export function fromProgressJson(raw: unknown, instrument: Instrument): Scores {
	if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
		return emptyScores();
	}
	const scores = new Map<Pitch, number>();
	for (const [name, need] of Object.entries(raw)) {
		const pitch = parsePitch(name);
		if (
			pitch === null ||
			pitch < instrument.lowest ||
			pitch > instrument.highest ||
			typeof need !== "number" ||
			!Number.isFinite(need) ||
			need < 0 ||
			need > 1
		) {
			continue;
		}
		scores.set(pitch, need);
	}
	return scores;
}
