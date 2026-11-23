import type { RefObject } from "preact";
import { useEffect, useRef } from "preact/hooks";
import type { Analysis as AnalysisResult } from "../core/analysis";
import { glyphFor, type Instrument } from "../core/instrument";
import { formatPitch, type Pitch } from "../core/pitch";
import type { StaffOptions } from "../render/staff";
import { type TabFont, tabView } from "../render/tab";
import { ANALYSIS_ID, Analysis } from "./Analysis";
import type { Listening, Verdict } from "./card-flow";
import { JUDGE_UNAVAILABLE, LISTEN_PROMPT, START_PROMPT } from "./judge-text";
import { Legend } from "./Legend";
import { PitchGraph } from "./PitchGraph";
import { SongStaff, type SongView, Staff } from "./Staff";
import { scrollLockApplies, setScrollLock } from "./scroll-lock";
import { jumpTo } from "./scroll-to";
import { graphLabel, judgedNote, playedOffset } from "./verdict";

interface CardProps {
	pitch: Pitch;
	/** The note's length in quarter-note beats, for a timed song; a whole note when absent. */
	beats?: number;
	revealed: boolean;
	listening?: Listening;
	/** Judge on: the reveal area is taller and shows the verdict. */
	judging?: boolean;
	verdict?: Verdict | null;
	/** Show the note name and glyph on a card that is not revealed. */
	hint?: boolean;
	/** Smart sampling need score (0 to 1), shown on reveal. */
	need?: number | null;
	/**
	 * A timed song's card: the staff keeps the note, and the reveal area holds
	 * only the start prompt or the summary, never a letter or tablature.
	 */
	timed?: "ready" | "playing" | "summary";
	timedSummary?: string;
	/** The line after the summary: the pitches furthest off; absent when none is. */
	timedTuning?: string | null;
	/** The analysis of a finished timed song; shown under the music in the summary, with a link to it. */
	timedAnalysis?: AnalysisResult | null;
	/** A timed song with its stream running: the reveal area has room for what is heard now. */
	readout?: boolean;
	/** A timed song's lines of music; the staff shows them instead of one note. */
	song?: SongView;
	/** The app's header, whose height a timed song's page keeps clear when it scrolls. */
	header?: RefObject<HTMLElement | null>;
	instrument: Instrument;
	staffOptions: StaffOptions;
	font: TabFont;
}

export function Card({
	pitch,
	beats,
	revealed,
	listening = "off",
	judging = false,
	verdict = null,
	hint = false,
	need = null,
	timed,
	timedSummary,
	timedTuning = null,
	timedAnalysis = null,
	readout = false,
	song,
	header,
	instrument,
	staffOptions,
	font,
}: CardProps) {
	const glyph = glyphFor(instrument, pitch);
	const view = glyph === undefined ? null : tabView(glyph, font);
	// Its text is set each frame by the song overlay, not by Preact.
	const heard = useRef<HTMLParagraphElement>(null);
	// The song's bar, which the page follows around (F10-S04).
	const bar = useRef<HTMLDivElement>(null);
	// Scrolling by hand is locked while a timed song plays. The cleanup lifts it
	// whenever the card goes away (Settings, judging off, leaving the drill) or
	// the phase changes, so every way out clears the same class.
	const isSong = song !== undefined;
	useEffect(() => {
		setScrollLock(document.documentElement, isSong && scrollLockApplies(timed));
		return () => setScrollLock(document.documentElement, false);
	}, [isSong, timed]);
	const showAnalysis = timed === "summary" && timedAnalysis !== null;
	if (song) {
		return (
			<div class="card card-song">
				<div class="card-staff">
					<SongStaff
						view={song}
						options={staffOptions}
						readout={heard}
						phase={timed}
						header={header}
						bar={bar}
					/>
				</div>
				{showAnalysis && timedAnalysis && <Analysis analysis={timedAnalysis} />}
				<div class="song-bar" ref={bar}>
					{timed === "ready" && <p class="card-status">{START_PROMPT}</p>}
					{timed === "summary" && <p class="card-status">{timedSummary}</p>}
					{timed === "summary" && timedTuning && (
						<p class="card-status">{timedTuning}</p>
					)}
					{showAnalysis && (
						<a
							href={`#${ANALYSIS_ID}`}
							class="analysis-link"
							onClick={(event) => jumpTo(event, ANALYSIS_ID)}
						>
							Analysis ↓
						</a>
					)}
					{readout && <p class="card-status card-readout" ref={heard} />}
					{judging && <Legend />}
				</div>
			</div>
		);
	}
	return (
		<div class="card">
			<div class="card-staff">
				<Staff pitch={pitch} options={staffOptions} beats={beats} />
			</div>
			<div
				class={`${judging ? "card-reveal judging" : "card-reveal"}${hint && !revealed ? " card-hint" : ""}`}
			>
				{timed === "ready" && <p class="card-status">{START_PROMPT}</p>}
				{timed === "summary" && <p class="card-status">{timedSummary}</p>}
				{timed === "summary" && timedTuning && (
					<p class="card-status">{timedTuning}</p>
				)}
				{readout && <p class="card-status card-readout" ref={heard} />}
				{!revealed && listening === "locked" && (
					<p class="card-status">{LISTEN_PROMPT}</p>
				)}
				{!revealed && listening === "unavailable" && (
					<p class="card-status">{JUDGE_UNAVAILABLE}</p>
				)}
				{(revealed || hint) && (
					<>
						<div class="card-name">{formatPitch(pitch)}</div>
						{need !== null && (
							<div class="card-need">Priority {need.toFixed(2)}</div>
						)}
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
					</>
				)}
				{judging && verdict && listening !== "unavailable" && (
					<VerdictView
						verdict={verdict}
						pitch={pitch}
						instrument={instrument}
						graph={timed === undefined}
					/>
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
	graph,
}: {
	verdict: Verdict;
	pitch: Pitch;
	instrument: Instrument;
	/** Draw the pitch graph; a timed song has no room for it. */
	graph: boolean;
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
			{heard && graph && (
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
