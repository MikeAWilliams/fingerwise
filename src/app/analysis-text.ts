// Texts for the analysis section under a timed song's music (F11).

import type { Breakdown, Habits, Practice } from "../core/analysis";

/** The practice-spot line when spans were tested and none stood out. */
export const NO_SPOT =
	"No two bars stand out: the losses are spread through the song.";

/** The id of the anchor at the first row of practice spot `index`, which its analysis line links to. */
export const spotAnchorId = (index: number) => `practice-spot-${index}`;

/** The label drawn over a shaded spot, such as "Practice: bars 3–4". */
export const spotLabel = (firstBar: number, lastBar: number) =>
	`Practice: bars ${firstBar}–${lastBar}`;

/** Times are rounded to this many ms. */
const TIME_STEP_MS = 10;

const percent = (share: number) => `${Math.round(share * 100)}%`;

/** The breakdown table's heading and its column of shares (F11-S05). */
export const BREAKDOWN_TITLE = "Where the note time went";
export const BREAKDOWN_COLUMN = "Share of all note time";

/** The breakdown's groups and the rows under them, in the table's fixed order. A group with one share has no rows under it. */
const GROUPS: { name: string; parts: [keyof Breakdown, string][] }[] = [
	{
		name: "On the right note",
		parts: [
			["inTune", "in tune"],
			["outOfTune", "out of tune"],
		],
	},
	{
		name: "Silent",
		parts: [
			["silentBefore", "before the note started"],
			["silentMiddle", "in the middle of the note"],
			["silentAfter", "after the note stopped"],
		],
	},
	{ name: "Wrong note", parts: [["wrong", ""]] },
	{ name: "Not played", parts: [["notPlayed", ""]] },
];

/** One row of the breakdown table: a group, or a row under one. */
export interface BreakdownRow {
	label: string;
	/** A whole percentage. */
	percent: number;
	group: boolean;
}

/**
 * Whole numbers for `values` that add up to `total`, by largest remainder:
 * each is floored, then the ones with the largest remainders get one more.
 * `values` must add up to `total` within rounding.
 */
export function roundToTotal(values: number[], total: number): number[] {
	// The slack keeps a value like 19.999999999999996 from flooring to 19.
	const floor = (v: number) => Math.floor(v + 1e-9);
	const floors = values.map(floor);
	let left = total - floors.reduce((sum, f) => sum + f, 0);
	const order = values
		.map((v, i) => ({ i, rest: v - floor(v) }))
		.sort((a, b) => b.rest - a.rest || a.i - b.i);
	for (const { i } of order) {
		if (left <= 0) break;
		floors[i] = (floors[i] as number) + 1;
		left--;
	}
	return floors;
}

/**
 * The breakdown as table rows, every row every time in a fixed order, 0%
 * included. Groups add up to 100% and the rows under a group to the group.
 */
export function breakdownRows(breakdown: Breakdown): BreakdownRow[] {
	const all = GROUPS.flatMap((g) => g.parts).reduce(
		(sum, [key]) => sum + breakdown[key],
		0,
	);
	const scale = all > 0 ? 100 / all : 0;
	const shares = GROUPS.map((g) =>
		g.parts.map(([key]) => breakdown[key] * scale),
	);
	const sums = shares.map((parts) => parts.reduce((sum, v) => sum + v, 0));
	const groupPercents = all > 0 ? roundToTotal(sums, 100) : sums.map(() => 0);
	return GROUPS.flatMap((g, i) => {
		const percent = groupPercents[i] as number;
		const head = { label: g.name, percent, group: true };
		if (g.parts.length === 1) return [head];
		const parts = roundToTotal(shares[i] as number[], percent);
		return [
			head,
			...g.parts.map(([, label], j) => ({
				label,
				percent: parts[j] as number,
				group: false,
			})),
		];
	});
}

/** "Sound during rests: 12%", or null with no graded rest. */
export function restText(restSound: number | null): string | null {
	return restSound === null
		? null
		: `Sound during rests: ${percent(restSound)}`;
}

const roundMs = (ms: number) => Math.round(ms / TIME_STEP_MS) * TIME_STEP_MS;

/** "about 110 ms late", "about 40 ms early", or "on time" when it rounds to 0. */
export function offsetPhrase(ms: number): string {
	const rounded = roundMs(ms);
	if (rounded === 0) return "on time";
	return `about ${Math.abs(rounded)} ms ${rounded > 0 ? "late" : "early"}`;
}

const LENGTH_NAMES = new Map<number, string>([
	[4, "whole notes"],
	[3, "dotted half notes"],
	[2, "half notes"],
	[1.5, "dotted quarter notes"],
	[1, "quarter notes"],
	[0.75, "dotted eighth notes"],
	[0.5, "eighth notes"],
	[0.25, "sixteenth notes"],
]);

/** "half notes" for 2 beats; "notes of 5 beats" for a length with no name. */
export function lengthName(beats: number): string {
	return (
		LENGTH_NAMES.get(beats) ??
		`notes of ${Number(beats.toFixed(3))} ${beats === 1 ? "beat" : "beats"}`
	);
}

/** The habits that are present, one plain line each, in the order start, length, gap, drift. */
export function habitLines(habits: Habits): string[] {
	const lines: string[] = [];
	if (habits.start !== null) {
		lines.push(`Notes start ${offsetPhrase(habits.start)}`);
	}
	if (habits.length !== null) {
		const each = habits.byLength.map(
			(l) => `${lengthName(l.beats)} ${percent(l.share)}`,
		);
		lines.push(
			`Notes sound for about ${percent(habits.length)} of their length${
				each.length > 0 ? ` (${each.join(", ")})` : ""
			}`,
		);
	}
	if (habits.gap !== null) {
		lines.push(`Gaps between notes are about ${roundMs(habits.gap)} ms`);
	}
	if (habits.drift !== null) {
		const { first, last } = habits.drift;
		lines.push(
			`Notes started ${offsetPhrase(first)} in the first bars and ${offsetPhrase(last)} by the end: you ${
				last > first ? "slowed down" : "rushed"
			}`,
		);
	}
	return lines;
}

/** "Bars 3–4: 41% covered, 72% elsewhere" per spot, or NO_SPOT when tested with none, or nothing when not tested. */
export function spotLines(practice: Practice): string[] {
	if (!practice.tested) return [];
	if (practice.spots.length === 0) return [NO_SPOT];
	return practice.spots.map(
		(s) =>
			`Bars ${s.firstBar}–${s.lastBar}: ${percent(s.coverage)} covered, ${percent(s.elsewhere)} elsewhere`,
	);
}
