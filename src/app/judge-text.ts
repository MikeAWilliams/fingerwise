// Texts about judging shared by the card and the settings view.

export const JUDGE_HELP =
	"The microphone is open while you drill with this on. Only the time before each reveal is analysed, and no audio is stored or sent.";

export const JUDGE_UNAVAILABLE =
	"Judging is unavailable (microphone blocked or missing).";

export const LISTEN_PROMPT = "Tap or press a key to start listening";

export const START_PROMPT = "Tap or press a key to start";

export const END_OF_SONG = "End of song";

/** What a timed song's summary says: the score over graded notes, or the plain end when none were graded. */
export function summaryText(summary: {
	correct: number;
	graded: number;
}): string {
	return summary.graded === 0
		? END_OF_SONG
		: `${summary.correct} of ${summary.graded} correct`;
}
