import type { RefObject } from "preact";
import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
import type { Analysis as AnalysisResult } from "../core/analysis";
import { glyphFor, type Instrument } from "../core/instrument";
import { formatPitch, type Pitch } from "../core/pitch";
import type { StaffOptions } from "../render/staff";
import { type TabFont, tabView } from "../render/tab";
import { ANALYSIS_ID, ANALYSIS_TITLE_ID, Analysis } from "./Analysis";
import type { Listening, Verdict } from "./card-flow";
import {
	END_OF_SONG,
	JUDGE_UNAVAILABLE,
	LISTEN_PROMPT,
	PLAY_A_NOTE,
	START_PROMPT,
} from "./judge-text";
import { Legend } from "./Legend";
import { PitchGraph } from "./PitchGraph";
import { SongStaff, type SongView, Staff } from "./Staff";
import { scrollLockApplies, setScrollLock } from "./scroll-lock";
import { isBelowView, jumpTo } from "./scroll-to";
import type { TunerNote, TunerState } from "./tuner-flow";
import { graphLabel, judgedNote, playedOffset, tunerVerdict } from "./verdict";

interface CardProps {
	pitch: Pitch;
	/** The note's length in quarter-note beats, for a timed song; a whole note when absent. */
	beats?: number;
	revealed: boolean;
	listening?: Listening;
	/** Judge on: the reveal area is taller and shows the verdict. */
	judging?: boolean;
	verdict?: Verdict | null;
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
	/** How far past the last note the playing reached, in ms, for the analysis line; null for none (F12-S04). */
	timedOverrunMs?: number | null;
	/** A quiet line in the song's bar while it plays (scoring after the song); null for none. */
	timedNote?: string | null;
	/** Show the legend under a timed song's staff: judging is on and the lanes are. */
	legend?: boolean;
	/** A timed song with its stream running: the reveal area has room for what is heard now. */
	readout?: boolean;
	/** A timed song's lines of music; the staff shows them instead of one note. */
	song?: SongView;
	/**
	 * Single note (F16-S02): the song card with no clock. `fingering` shows the
	 * current note's letter and tablature in the strip; `ended` shows "End of song"
	 * in the bar. There is no start prompt and the page is never locked.
	 */
	single?: { ended: boolean; fingering: boolean; message?: string | null };
	/** Tuner: the staff shows the note played and the reveal area its prompts. */
	tuner?: TunerState;
	/** Tuner: the offset the verdict calls in tune. */
	toleranceCents?: number;
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
	need = null,
	timed,
	timedSummary,
	timedTuning = null,
	timedAnalysis = null,
	timedOverrunMs = null,
	timedNote = null,
	legend = false,
	readout = false,
	song,
	single,
	tuner,
	toleranceCents = 40,
	header,
	instrument,
	staffOptions,
	font,
}: CardProps) {
	// Tuner draws the tablature of the note played, which may be out of range.
	const glyph = glyphFor(instrument, tuner?.note?.pitch ?? pitch);
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
	const analysisBelow = useAnalysisBelow(showAnalysis, bar);
	if (song) {
		const shown: SongView =
			single?.fingering && !single.ended
				? {
						...song,
						fingering: { name: formatPitch(pitch), tab: view },
					}
				: song;
		return (
			<div class="card card-song">
				<div class="card-staff">
					<SongStaff
						view={shown}
						options={staffOptions}
						readout={heard}
						phase={timed}
						header={header}
						bar={bar}
					/>
				</div>
				{showAnalysis && timedAnalysis && (
					<Analysis analysis={timedAnalysis} overrunMs={timedOverrunMs} />
				)}
				<div class="song-bar" ref={bar}>
					{timed === "ready" && <p class="card-status">{START_PROMPT}</p>}
					{single?.ended && <p class="card-status">{END_OF_SONG}</p>}
					{single?.message && !single.ended && (
						<p class="card-status">{single.message}</p>
					)}
					{timed === "summary" && <p class="card-status">{timedSummary}</p>}
					{timed === "summary" && timedTuning && (
						<p class="card-status">{timedTuning}</p>
					)}
					{showAnalysis && analysisBelow && (
						<a
							href={`#${ANALYSIS_ID}`}
							class="analysis-link"
							onClick={(event) => jumpTo(event, ANALYSIS_ID, ANALYSIS_TITLE_ID)}
						>
							Analysis ↓
						</a>
					)}
					{timed === "playing" && timedNote && (
						<p class="card-status card-quiet">{timedNote}</p>
					)}
					{readout && <p class="card-status card-readout" ref={heard} />}
					{legend && <Legend />}
				</div>
			</div>
		);
	}
	if (tuner) {
		return (
			<div class="card">
				<div class="card-staff">
					<Staff pitch={tuner.note?.pitch ?? null} options={staffOptions} />
				</div>
				<div class="card-reveal judging">
					{tuner.listening === "locked" && (
						<p class="card-status">{LISTEN_PROMPT}</p>
					)}
					{tuner.listening === "unavailable" && (
						<p class="card-status">{JUDGE_UNAVAILABLE}</p>
					)}
					{tuner.listening !== "locked" &&
						tuner.listening !== "unavailable" &&
						(tuner.note === null ? (
							<p class="card-status">{PLAY_A_NOTE}</p>
						) : (
							<TunerReadout
								note={tuner.note}
								view={view}
								toleranceCents={toleranceCents}
							/>
						))}
				</div>
			</div>
		);
	}
	return (
		<div class="card">
			<div class="card-staff">
				<Staff pitch={pitch} options={staffOptions} beats={beats} />
			</div>
			<div class={judging ? "card-reveal judging" : "card-reveal"}>
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
				{revealed && (
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

/**
 * Whether the analysis heading is still below what can be seen, behind the
 * pinned bar or past the window's bottom, so the "Analysis ↓" link has
 * somewhere to go (F11-S05 AC5). Checked after each render, on scroll, on
 * resize and when the page's size changes; false while there is no analysis.
 */
function useAnalysisBelow(
	active: boolean,
	bar: RefObject<HTMLElement | null>,
): boolean {
	const [below, setBelow] = useState(false);
	useLayoutEffect(() => {
		if (!active) {
			setBelow(false);
			return;
		}
		const check = () => {
			const heading = document.getElementById(ANALYSIS_TITLE_ID);
			if (!heading) return;
			const visibleBottom =
				bar.current?.getBoundingClientRect().top ?? window.innerHeight;
			setBelow(
				isBelowView(heading.getBoundingClientRect().bottom, visibleBottom),
			);
		};
		check();
		window.addEventListener("scroll", check, { passive: true });
		window.addEventListener("resize", check);
		const resized =
			typeof ResizeObserver === "undefined" ? null : new ResizeObserver(check);
		resized?.observe(document.documentElement);
		return () => {
			window.removeEventListener("scroll", check);
			window.removeEventListener("resize", check);
			resized?.disconnect();
		};
	}, [active, bar]);
	return below;
}

/** Tuner's reveal area for a shown note: its name, tablature, verdict row and pitch graph. */
function TunerReadout({
	note,
	view,
	toleranceCents,
}: {
	note: TunerNote;
	view: ReturnType<typeof tabView> | null;
	toleranceCents: number;
}) {
	const verdict = tunerVerdict(note.cents, toleranceCents);
	const name = formatPitch(note.pitch);
	return (
		<>
			<div class="card-name">{name}</div>
			{view?.kind === "glyph" && (
				<div class="card-glyph" style={{ fontFamily: `"${view.fontFamily}"` }}>
					{view.text}
				</div>
			)}
			{view?.kind === "placeholder" && (
				<div class="card-glyph card-placeholder">{view.message}</div>
			)}
			<div
				class={`card-verdict ${verdict.inTune ? "verdict-correct" : "verdict-off"}`}
			>
				{verdict.inTune && (
					<>
						<span class="card-verdict-icon" aria-hidden="true">
							✓
						</span>{" "}
					</>
				)}
				{verdict.text}
			</div>
			<PitchGraph
				expected={note.pitch}
				cents={note.cents}
				playedName={name}
				label={`${name}, ${verdict.text}`}
			/>
		</>
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
