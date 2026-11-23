import type { CoverageResult } from "../core/coverage";
import type { TimedPhase } from "./timed-flow";

/**
 * Whether a timed song's lanes (with their trace, fault marks and the legend)
 * are on show. With live feedback they always are. Scoring after the song
 * shows them only in the summary, and only when something was graded: a song
 * that ends with nothing graded has no lanes to draw.
 */
export function lanesShown(
	after: boolean,
	phase: TimedPhase,
	summary: CoverageResult | null,
): boolean {
	if (!after) return true;
	return phase === "summary" && summary !== null && summary.graded > 0;
}
