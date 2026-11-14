import { glyphFor, type Instrument } from "../core/instrument";
import { formatPitch, type Pitch } from "../core/pitch";
import type { StaffOptions } from "../render/staff";
import { type TabFont, tabView } from "../render/tab";
import type { Listening, Verdict } from "./card-flow";
import { JUDGE_UNAVAILABLE, LISTEN_PROMPT } from "./judge-text";
import { PitchGraph } from "./PitchGraph";
import { Staff } from "./Staff";
import { graphLabel, judgedNote, playedOffset } from "./verdict";

interface CardProps {
	pitch: Pitch;
	revealed: boolean;
	listening?: Listening;
	/** Judge on: the reveal area is taller and shows the verdict. */
	judging?: boolean;
	verdict?: Verdict | null;
	instrument: Instrument;
	staffOptions: StaffOptions;
	font: TabFont;
}

export function Card({
	pitch,
	revealed,
	listening = "off",
	judging = false,
	verdict = null,
	instrument,
	staffOptions,
	font,
}: CardProps) {
	const glyph = glyphFor(instrument, pitch);
	const view = glyph === undefined ? null : tabView(glyph, font);
	return (
		<div class="card">
			<div class="card-staff">
				<Staff pitch={pitch} options={staffOptions} />
			</div>
			<div class={judging ? "card-reveal judging" : "card-reveal"}>
				{!revealed && listening === "locked" && (
					<p class="card-status">{LISTEN_PROMPT}</p>
				)}
				{!revealed && listening === "unavailable" && (
					<p class="card-status">{JUDGE_UNAVAILABLE}</p>
				)}
				{revealed && (
					<>
						<div class="card-name">{formatPitch(pitch)}</div>
						{view?.kind === "glyph" && (
							<div
								class="card-glyph"
								style={{ fontFamily: `"${view.fontFamily}"` }}
							>
								{view.text}
							</div>
						)}
						{view?.kind === "placeholder" && (
							<div class="card-glyph card-placeholder">{view.message}</div>
						)}
						{judging && verdict && listening !== "unavailable" && (
							<VerdictView
								verdict={verdict}
								pitch={pitch}
								instrument={instrument}
							/>
						)}
					</>
				)}
			</div>
		</div>
	);
}

const VERDICT_TEXT = {
	correct: { icon: "✓", label: "Correct" },
	incorrect: { icon: "✗", label: "Incorrect" },
	none: { icon: "–", label: "Nothing heard" },
} as const;

function VerdictView({
	verdict,
	pitch,
	instrument,
}: {
	verdict: Verdict;
	pitch: Pitch;
	instrument: Instrument;
}) {
	const { icon, label } = VERDICT_TEXT[verdict.grade];
	const heard =
		verdict.grade === "none"
			? null
			: {
					note: judgedNote(instrument, verdict.frequency),
					cents: playedOffset(instrument, pitch, verdict.frequency),
				};
	return (
		<>
			<div class={`card-verdict verdict-${verdict.grade}`}>
				<span class="card-verdict-icon" aria-hidden="true">
					{icon}
				</span>{" "}
				{label}
				{heard && <span class="card-judged">{heard.note.label}</span>}
			</div>
			{heard && (
				<PitchGraph
					expected={pitch}
					cents={heard.cents}
					playedName={formatPitch(heard.note.pitch)}
					label={graphLabel(heard.note.pitch, heard.cents, pitch)}
				/>
			)}
		</>
	);
}
