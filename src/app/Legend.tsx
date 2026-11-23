import { MARK_LABELS, type MarkShape, markPath } from "./marks";

/** The icon's box, in the lane's units: a mark centred in 16 by 6. */
const ICON_WIDTH = 16;
const ICON_HEIGHT = 6;

/**
 * A key to the lane's fault marks, each drawn with the same code as the lane,
 * so the two cannot drift apart. The card shows it under a timed song's staff
 * while judging is on.
 */
export function Legend() {
	return (
		<ul class="lane-legend" aria-label="Marks in the lane">
			{(Object.keys(MARK_LABELS) as MarkShape[]).map((shape) => (
				<li key={shape}>
					<svg
						class="lane-legend-icon"
						viewBox={`0 0 ${ICON_WIDTH} ${ICON_HEIGHT}`}
						aria-hidden="true"
					>
						<path
							class="lane-marks"
							d={markPath({ row: 0, x: ICON_WIDTH / 2, shape }, 0, ICON_HEIGHT)}
						/>
					</svg>
					{MARK_LABELS[shape]}
				</li>
			))}
		</ul>
	);
}
