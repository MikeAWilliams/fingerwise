import type { Analysis as AnalysisResult } from "../core/analysis";
import {
	BREAKDOWN_COLUMN,
	BREAKDOWN_TITLE,
	breakdownRows,
	habitLines,
	restText,
	spotAnchorId,
	spotLines,
} from "./analysis-text";
import { jumpTo } from "./scroll-to";

/** The id of the section, which the "Analysis ↓" link jumps to. */
export const ANALYSIS_ID = "song-analysis";
/** The id of its heading, which takes focus from the link and whose place decides whether the link shows. */
export const ANALYSIS_TITLE_ID = "song-analysis-title";

/** Why the score is what it is: where it went, the player's habits and the spots worth practising. Plain text, under the last line of music. */
export function Analysis({ analysis }: { analysis: AnalysisResult }) {
	const rests = restText(analysis.restSound);
	const habits = habitLines(analysis.habits);
	const spots = spotLines(analysis.practice);
	return (
		<section
			id={ANALYSIS_ID}
			class="song-analysis"
			aria-labelledby={ANALYSIS_TITLE_ID}
		>
			<h2 id={ANALYSIS_TITLE_ID} tabIndex={-1}>
				Analysis
			</h2>
			<h3 id="song-breakdown-title">{BREAKDOWN_TITLE}</h3>
			<table class="breakdown" aria-labelledby="song-breakdown-title">
				<thead>
					<tr>
						<td />
						<th scope="col">{BREAKDOWN_COLUMN}</th>
					</tr>
				</thead>
				<tbody>
					{breakdownRows(analysis.breakdown).map((row) => (
						<tr
							key={row.label}
							class={row.group ? "breakdown-group" : undefined}
						>
							<th scope="row">{row.label}</th>
							<td>{row.percent}%</td>
						</tr>
					))}
				</tbody>
			</table>
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
