import type { Analysis as AnalysisResult } from "../core/analysis";
import {
	breakdownText,
	habitLines,
	restText,
	spotAnchorId,
	spotLines,
} from "./analysis-text";
import { jumpTo } from "./scroll-to";

/** The id of the section, which the "Analysis ↓" link jumps to. */
export const ANALYSIS_ID = "song-analysis";

/** Why the score is what it is: where it went, the player's habits and the spots worth practising. Plain text, under the last line of music. */
export function Analysis({ analysis }: { analysis: AnalysisResult }) {
	const rests = restText(analysis.restSound);
	const habits = habitLines(analysis.habits);
	const spots = spotLines(analysis.practice);
	return (
		<section
			id={ANALYSIS_ID}
			class="song-analysis"
			aria-labelledby="song-analysis-title"
		>
			<h2 id="song-analysis-title">Analysis</h2>
			<h3>Where the score went</h3>
			<p>{breakdownText(analysis.breakdown)}</p>
			{rests && <p>{rests}</p>}
			{habits.length > 0 && (
				<>
					<h3>Playing habits</h3>
					<ul>
						{habits.map((line) => (
							<li key={line}>{line}</li>
						))}
					</ul>
				</>
			)}
			{spots.length > 0 && (
				<>
					<h3>Practice spots</h3>
					<ul>
						{spots.map((line, i) => (
							<li key={line}>
								{analysis.practice.spots.length > 0 ? (
									<a
										href={`#${spotAnchorId(i)}`}
										onClick={(event) => jumpTo(event, spotAnchorId(i))}
									>
										{line}
									</a>
								) : (
									line
								)}
							</li>
						))}
					</ul>
				</>
			)}
		</section>
	);
}
