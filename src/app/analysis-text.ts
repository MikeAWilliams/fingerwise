// Texts for the analysis section under a timed song's music (F11).

import type { Breakdown, Habits, Practice } from "../core/analysis";

/** The practice-spot line when spans were tested and none stood out. */
export const NO_SPOT =
	"No two bars stand out: the losses are spread through the song.";

/** Times are rounded to this many ms. */
const TIME_STEP_MS = 10;

const percent = (share: number) => `${Math.round(share * 100)}%`;

/** The two shares of right-note time, in this order, then the losses by size. */
const RIGHT_NOTE: [keyof Breakdown, string][] = [
	["inTune", "in tune"],
	["outOfTune", "out of tune"],
];
const LOSSES: [keyof Breakdown, string][] = [
	["silentBefore", "silent before the note started"],
	["silentAfter", "silent after it stopped"],
	["silentMiddle", "silent in the middle"],
	["wrong", "wrong note"],
	["notPlayed", "not played"],
];

/** "45% in tune · 12% out of tune · 16% silent after it stopped · …": parts that round to 0% are left out. */
export function breakdownText(breakdown: Breakdown): string {
	const losses = [...LOSSES].sort((a, b) => breakdown[b[0]] - breakdown[a[0]]);
	return [...RIGHT_NOTE, ...losses]
		.filter(([key]) => Math.round(breakdown[key] * 100) > 0)
		.map(([key, name]) => `${percent(breakdown[key])} ${name}`)
		.join(" · ");
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
