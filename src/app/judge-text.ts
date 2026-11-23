// Texts about judging shared by the card and the settings view.

import type { CoverageResult } from "../core/coverage";

export const JUDGE_HELP =
	"The microphone is open while you drill with this on. Only the time before each reveal is analysed, and no audio is stored or sent.";

export const JUDGE_UNAVAILABLE =
	"Judging is unavailable (microphone blocked or missing).";

export const LISTEN_PROMPT = "Tap or press a key to start listening";

export const START_PROMPT = "Tap or press a key to start";

export const END_OF_SONG = "End of song";

/** What a timed song's summary says: the share covered, or the plain end when nothing was graded or scored. */
export function summaryText(result: CoverageResult | null): string {
	return result === null || result.coverage === null
		? END_OF_SONG
		: `${Math.round(result.coverage * 100)}% covered`;
}
