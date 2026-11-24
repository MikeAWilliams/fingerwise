import { useRef, useState } from "preact/hooks";
import { type AbcProblem, parseAbc } from "../abc";
import type { Instrument } from "../core/instrument";
import { formatPitch, type Pitch } from "../core/pitch";
import {
	canTurnAutoAdvanceOn,
	canTurnSharpsOff,
	canTurnSoundOn,
	keepTempoApplies,
	MAX_BARS_PER_LINE,
	MAX_DELAY_SECONDS,
	MAX_TOLERANCE_CENTS,
	MIN_BARS_PER_LINE,
	MIN_DELAY_SECONDS,
	MIN_SOUND_DELAY_SECONDS,
	MIN_SOUND_DURATION_SECONDS,
	MIN_TOLERANCE_CENTS,
	type Scoring,
	type Settings as SettingsValue,
	setAutoAdvance,
	setIncludeSharps,
	setSoundEnabled,
	soundTooLongReason,
} from "../core/settings";
import { JUDGE_HELP, JUDGE_UNAVAILABLE } from "./judge-text";
import { Section } from "./Section";
import {
	applyBarsPerLineInput,
	applyDelayInput,
	applyScoringInput,
	applyToleranceInput,
	cardsSummary,
	editTiming,
	highestOptions,
	lowestOptions,
	micSummary,
	RESET_CONFIRM,
	SCORING_LABELS,
	SONG_IN_USE,
	scoringEnabled,
	smartSamplingDisabled,
	smartSamplingNote,
	soundSummary,
	type TimingField,
} from "./settings-form";
import {
	applySongText,
	canUseSong,
	chosenTune,
	isEmptySong,
	NO_TEMPO_NOTE,
	problemLine,
	SONG_EXAMPLE,
	type SongState,
	songSectionSummary,
} from "./song-form";

interface SettingsProps {
	instrument: Instrument;
	settings: SettingsValue;
	onChange: (settings: SettingsValue) => void;
	onClose: () => void;
	/** The microphone was denied or missing; shown in, and opens, the Microphone section. */
	judgeUnavailable?: boolean;
	/** The song the app holds and the problems of the saved text, from the load-time parse. */
	songState: SongState;
	/** The player confirmed the reset: clear the scores. Settings are not touched. */
	onResetProgress: () => void;
	/** A passing or emptied text replaces the app's song; a failing text does not call it. */
	onSong: (state: SongState) => void;
}

export function Settings({
	instrument,
	settings,
	onChange,
	onClose,
	judgeUnavailable = false,
	songState,
	onSong,
	onResetProgress,
}: SettingsProps) {
	// The box starts from the saved text, so reopening drops a failing one.
	const [draft, setDraft] = useState(settings.songAbc);
	const [songProblems, setSongProblems] = useState<AbcProblem[]>(
		songState.problems,
	);
	const [songSummary, setSongSummary] = useState<string | null>(
		songState.summary,
	);
	const chosen = chosenTune(songState.tunes, settings.songTune);
	const latest = useRef(settings);
	latest.current = settings;
	const edits = useRef(0);
	const editSong = (typed: string) => {
		// An emptied box loads the example at once, so there is always a song.
		const text = isEmptySong(typed) ? SONG_EXAMPLE : typed;
		setDraft(text);
		const id = ++edits.current;
		const apply = (result: Awaited<ReturnType<typeof parseAbc>> | null) => {
			// A result for an older edit is ignored.
			if (id !== edits.current) return;
			const edit = applySongText(latest.current, text, result);
			setSongProblems(edit.problems);
			if (edit.state !== undefined) {
				setSongSummary(edit.state.summary);
				onChange(edit.settings);
				onSong(edit.state);
			}
		};
		parseAbc(text, instrument).then(apply);
	};

	const [rejection, setRejection] = useState<{
		field: TimingField;
		message: string;
	} | null>(null);
	const sharpsLocked = settings.includeSharps && !canTurnSharpsOff(settings);
	const blocked = sharpsLocked
		? setIncludeSharps(settings, false)
		: { ok: true as const };
	const autoAdvanceLocked =
		!settings.autoAdvance && !canTurnAutoAdvanceOn(settings);
	const soundLocked = !settings.soundEnabled && !canTurnSoundOn(settings);
	const rejectionFor = (field: TimingField) =>
		rejection?.field === field ? rejection.message : null;
	const advanceRejection = rejectionFor("advanceDelaySeconds");
	const soundRejection =
		rejectionFor("soundDelaySeconds") ?? rejectionFor("soundDurationSeconds");
	const edit = (field: TimingField, value: number) => {
		const result = editTiming(settings, field, value);
		if (result.rejected !== null) {
			setRejection({ field, message: result.rejected });
		} else if (result.settings !== settings) {
			setRejection(null);
			onChange(result.settings);
		}
	};
	return (
		<section class="settings">
			<h2>Settings</h2>
			<Section
				title="Cards"
				summary={cardsSummary(settings)}
				hasMessage={
					!blocked.ok || autoAdvanceLocked || advanceRejection !== null
				}
				initiallyOpen
			>
				{settings.useSong && <p class="settings-note">{SONG_IN_USE}</p>}
				<label>
					Lowest note
					<select
						disabled={settings.useSong}
						value={settings.lowest}
						onChange={(e) =>
							onChange({
								...settings,
								lowest: Number(e.currentTarget.value) as Pitch,
							})
						}
					>
						{lowestOptions(instrument, settings).map((p) => (
							<option key={p} value={p}>
								{formatPitch(p)}
							</option>
						))}
					</select>
				</label>
				<label>
					Highest note
					<select
						disabled={settings.useSong}
						value={settings.highest}
						onChange={(e) =>
							onChange({
								...settings,
								highest: Number(e.currentTarget.value) as Pitch,
							})
						}
					>
						{highestOptions(instrument, settings).map((p) => (
							<option key={p} value={p}>
								{formatPitch(p)}
							</option>
						))}
					</select>
				</label>
				<label>
					<input
						type="checkbox"
						checked={settings.includeSharps}
						disabled={sharpsLocked || settings.useSong}
						onChange={(e) => {
							const result = setIncludeSharps(
								settings,
								e.currentTarget.checked,
							);
							if (result.ok) onChange(result.settings);
						}}
					/>
					Include sharps
				</label>
				{!blocked.ok && <p class="settings-note">{blocked.reason}</p>}
				<label>
					Reveal delay (seconds)
					<input
						type="number"
						min={MIN_DELAY_SECONDS}
						max={MAX_DELAY_SECONDS}
						step="0.5"
						value={settings.delaySeconds}
						onInput={(e) =>
							onChange(applyDelayInput(settings, e.currentTarget.valueAsNumber))
						}
					/>
				</label>
				<label>
					<input
						type="checkbox"
						checked={settings.autoAdvance}
						disabled={autoAdvanceLocked}
						onChange={(e) => {
							const result = setAutoAdvance(settings, e.currentTarget.checked);
							if (result.ok) onChange(result.settings);
						}}
					/>
					Auto-advance
				</label>
				{autoAdvanceLocked && (
					<p class="settings-note">
						{soundTooLongReason({ ...settings, autoAdvance: true })}
					</p>
				)}
				<label>
					Advance delay (seconds)
					<input
						type="number"
						min={MIN_DELAY_SECONDS}
						max={MAX_DELAY_SECONDS}
						step="0.5"
						value={settings.advanceDelaySeconds}
						onInput={(e) =>
							edit("advanceDelaySeconds", e.currentTarget.valueAsNumber)
						}
					/>
				</label>
				{advanceRejection && <p class="settings-note">{advanceRejection}</p>}
				<label>
					<input
						type="checkbox"
						checked={settings.smartSampling}
						disabled={smartSamplingDisabled(settings)}
						onChange={(e) =>
							onChange({ ...settings, smartSampling: e.currentTarget.checked })
						}
					/>
					Use smart sampling
				</label>
				{smartSamplingNote(settings) !== null && (
					<p class="settings-note">{smartSamplingNote(settings)}</p>
				)}
				<button
					type="button"
					onClick={() => {
						if (window.confirm(RESET_CONFIRM)) onResetProgress();
					}}
				>
					Reset progress
				</button>
			</Section>
			<Section
				title="Sound"
				summary={soundSummary(settings)}
				hasMessage={soundLocked || soundRejection !== null}
			>
				<label>
					<input
						type="checkbox"
						checked={settings.soundEnabled}
						disabled={soundLocked}
						onChange={(e) => {
							const result = setSoundEnabled(settings, e.currentTarget.checked);
							if (result.ok) onChange(result.settings);
						}}
					/>
					Play note
				</label>
				{soundLocked && (
					<p class="settings-note">
						{soundTooLongReason({ ...settings, soundEnabled: true })}
					</p>
				)}
				<label>
					Sound delay (seconds)
					<input
						type="number"
						min={MIN_SOUND_DELAY_SECONDS}
						max={MAX_DELAY_SECONDS}
						step="0.5"
						value={settings.soundDelaySeconds}
						disabled={!settings.soundEnabled}
						onInput={(e) =>
							edit("soundDelaySeconds", e.currentTarget.valueAsNumber)
						}
					/>
				</label>
				{rejectionFor("soundDelaySeconds") && (
					<p class="settings-note">{rejectionFor("soundDelaySeconds")}</p>
				)}
				<label>
					Sound duration (seconds)
					<input
						type="number"
						min={MIN_SOUND_DURATION_SECONDS}
						max={MAX_DELAY_SECONDS}
						step="0.5"
						value={settings.soundDurationSeconds}
						disabled={!settings.soundEnabled}
						onInput={(e) =>
							edit("soundDurationSeconds", e.currentTarget.valueAsNumber)
						}
					/>
				</label>
				{rejectionFor("soundDurationSeconds") && (
					<p class="settings-note">{rejectionFor("soundDurationSeconds")}</p>
				)}
			</Section>
			<Section
				title="Microphone"
				summary={micSummary(settings)}
				hasMessage={judgeUnavailable}
			>
				<label>
					<input
						type="checkbox"
						checked={settings.judgeEnabled}
						onChange={(e) =>
							onChange({ ...settings, judgeEnabled: e.currentTarget.checked })
						}
					/>
					Judge my playing
				</label>
				<p class="settings-note">{JUDGE_HELP}</p>
				{judgeUnavailable && <p class="settings-note">{JUDGE_UNAVAILABLE}</p>}
				<label>
					Tolerance (¢)
					<input
						type="number"
						min={MIN_TOLERANCE_CENTS}
						max={MAX_TOLERANCE_CENTS}
						step="1"
						value={settings.toleranceCents}
						onInput={(e) =>
							onChange(
								applyToleranceInput(settings, e.currentTarget.valueAsNumber),
							)
						}
					/>
				</label>
			</Section>
			<Section
				title="Song"
				summary={songSectionSummary(settings)}
				hasMessage={songProblems.length > 0}
			>
				<label class="settings-song-text">
					Tune in ABC notation
					<textarea
						rows={8}
						value={draft}
						placeholder={SONG_EXAMPLE}
						spellcheck={false}
						autocapitalize="off"
						onInput={(e) => editSong(e.currentTarget.value)}
					/>
				</label>
				<p class="settings-note">
					Paste one tune with one voice and no chords. Flats are shown as
					sharps. Write and check a tune in the{" "}
					<a
						href="https://editor.drawthedots.com/"
						target="_blank"
						rel="noopener noreferrer"
					>
						online ABC editor
					</a>
					.
				</p>
				<div role="status" aria-live="polite" class="settings-song-status">
					{songProblems.length > 0 ? (
						<ul>
							{songProblems.map((problem) => (
								<li key={problemLine(problem)}>{problemLine(problem)}</li>
							))}
						</ul>
					) : (
						songSummary !== null && <p class="settings-note">{songSummary}</p>
					)}
					{chosen?.tempo === null && (
						<p class="settings-note">{NO_TEMPO_NOTE}</p>
					)}
				</div>
				<label>
					<input
						type="checkbox"
						checked={settings.useSong}
						disabled={!canUseSong(chosen)}
						onChange={(e) =>
							onChange({ ...settings, useSong: e.currentTarget.checked })
						}
					/>
					Use song
				</label>
				<label>
					<input
						type="checkbox"
						checked={settings.keepTempo}
						disabled={!settings.useSong}
						onChange={(e) =>
							onChange({ ...settings, keepTempo: e.currentTarget.checked })
						}
					/>
					Keep tempo
				</label>
				<label>
					<input
						type="checkbox"
						checked={settings.metronome}
						disabled={!keepTempoApplies(settings)}
						onChange={(e) =>
							onChange({ ...settings, metronome: e.currentTarget.checked })
						}
					/>
					Metronome
				</label>
				<label>
					Scoring
					<select
						value={settings.scoring}
						disabled={!scoringEnabled(settings)}
						onChange={(e) =>
							onChange(applyScoringInput(settings, e.currentTarget.value))
						}
					>
						{(Object.keys(SCORING_LABELS) as Scoring[]).map((value) => (
							<option key={value} value={value}>
								{SCORING_LABELS[value]}
							</option>
						))}
					</select>
				</label>
				<label>
					Bars per line
					<input
						type="number"
						min={MIN_BARS_PER_LINE}
						max={MAX_BARS_PER_LINE}
						step="1"
						value={settings.barsPerLine}
						disabled={!keepTempoApplies(settings)}
						onInput={(e) =>
							onChange(
								applyBarsPerLineInput(settings, e.currentTarget.valueAsNumber),
							)
						}
					/>
				</label>
			</Section>
			<div class="settings-footer">
				<button type="button" onClick={onClose}>
					Close
				</button>
			</div>
		</section>
	);
}
