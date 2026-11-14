import type { Pitch } from "../core/pitch";
import { pitchGraph } from "../render/graph";

const WIDTH = 320;
const HEIGHT = 64;
const AXIS_Y = 34;

interface PitchGraphProps {
	/** The card's written pitch. */
	expected: Pitch;
	/** Cents from the expected pitch to the played one. */
	cents: number;
	/** The judged note's written name, shown by the played marker. */
	playedName: string;
	label: string;
}

/** Where the text above a marker starts, so it stays inside the graph near the edges. */
function anchorFor(x: number): "start" | "middle" | "end" {
	if (x < WIDTH * 0.2) return "start";
	if (x > WIDTH * 0.8) return "end";
	return "middle";
}

export function PitchGraph({
	expected,
	cents,
	playedName,
	label,
}: PitchGraphProps) {
	const g = pitchGraph(expected, cents, WIDTH);
	const { x, pinned } = g.played;
	const dir = pinned === "left" ? -1 : 1;
	return (
		<svg
			class="pitch-graph"
			viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
			role="img"
			aria-label={label}
		>
			<line
				class="pitch-graph-axis"
				x1={g.ticks[0]?.x}
				x2={g.ticks[g.ticks.length - 1]?.x}
				y1={AXIS_Y}
				y2={AXIS_Y}
			/>
			{g.ticks.map((t) => (
				<g key={t.label}>
					<line
						class="pitch-graph-axis"
						x1={t.x}
						x2={t.x}
						y1={AXIS_Y - 5}
						y2={AXIS_Y + 5}
					/>
					<text x={t.x} y={HEIGHT - 4} text-anchor="middle">
						{t.label}
					</text>
				</g>
			))}
			<line
				class="pitch-graph-expected"
				x1={g.expectedX}
				x2={g.expectedX}
				y1={AXIS_Y - 14}
				y2={AXIS_Y + 14}
			/>
			{pinned === null ? (
				<circle class="pitch-graph-played" cx={x} cy={AXIS_Y} r={6} />
			) : (
				<polygon
					class="pitch-graph-played"
					points={`${x + dir * 14},${AXIS_Y} ${x},${AXIS_Y - 8} ${x},${AXIS_Y + 8}`}
				/>
			)}
			<text x={x} y={14} text-anchor={anchorFor(x)}>
				{playedName} {g.offsetLabel}
			</text>
		</svg>
	);
}
