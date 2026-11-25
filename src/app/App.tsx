import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import licenseUrl from "../../data/fonts/OFL.txt?url";
import ocarinaJson from "../../data/instruments/ocarina-12-taiwanese.json";
import defaultsJson from "../../data/settings/defaults.json";
import { parseAbc } from "../abc";
import { createClicker } from "../audio/click";
import {
	browserAudioFactory,
	createAudio,
	outputLatencySeconds,
} from "../audio/context";
import { browserListenerEnv, createListener } from "../audio/listener";
import { createTonePlayer, createToneScheduler } from "../audio/tone";
import { buildTimeline, type Segment, type Timeline } from "../core/coverage";
import { buildPool } from "../core/drill";
import { loadInstrument, soundingPitch } from "../core/instrument";
import {
	createToneTracker,
	createToneWatch,
	DEFAULT_THRESHOLDS,
	frequencyBand,
	gradeTone,
	judge,
} from "../core/judge";
import type { Pitch } from "../core/pitch";
import {
	applyGrade,
	needOf,
	type ProgressGrade,
	type Scores,
} from "../core/progress";
import {
	metronomeApplies,
	parseDefaults,
	type Settings,
	scoringAfterApplies,
	singleNoteApplies,
	smartSamplingApplies,
	tempoApplies,
} from "../core/settings";
import {
	DEFAULT_TEMPO,
	type Song,
	type SongNote,
	songLines,
} from "../core/song";
import type { StaffOptions } from "../render/staff";
import { type FontStatus, fontFamilyFor } from "../render/tab";
import { lanesShown } from "./after-song";
import { Card } from "./Card";
import {
	type CardListen,
	type CardState,
	createCardFlow,
	needSource,
	randomSource,
} from "./card-flow";
import { fontUrl, loadFont } from "./font";
import { headerSong, playButton, tuneChoice } from "./header-text";
import {
	LISTENING_PAST_END,
	PLAYING_SONG,
	SCORING_AFTER,
	summaryText,
	tuningText,
} from "./judge-text";
import { overrunTrace } from "./overrun";
import { createPlaybackFlow, type PlaybackState } from "./playback-flow";
import { playbackView } from "./playback-view";
import { loadProgress, resetProgress, saveProgress } from "./progress-store";
import { Settings as SettingsView } from "./Settings";
import { cardPhase } from "./scroll-lock";
import { browserStorage, loadSettings, saveSettings } from "./settings-store";
import {
	createSingleNoteFlow,
	type SingleNoteListen,
	type SingleNoteState,
} from "./single-note-flow";
import { singleNoteView } from "./single-note-view";
import {
	chooseTune,
	chosenTune,
	NO_SONG,
	type SongState,
	songStateFrom,
} from "./song-form";
import {
	createTimedFlow,
	type TimedFlow,
	type TimedListen,
	type TimedState,
} from "./timed-flow";
import { toneSegment } from "./trace";

const instrument = loadInstrument(ocarinaJson);
const DEFAULT_SETTINGS = parseDefaults(defaultsJson, instrument);

function poolFor(settings: Settings): Pitch[] {
	return buildPool(instrument, {
		lowest: settings.lowest,
		highest: settings.highest,
		includeSharps: settings.includeSharps,
	});
}

const STAFF_OPTIONS: StaffOptions = {
	clef: instrument.defaultClef,
	accidentals: "sharps",
	keySignature: "C",
	lowest: instrument.lowest,
	highest: instrument.highest,
};

const audioFactory = browserAudioFactory();
/** Playing the song needs Web Audio; without it the button is not shown. */
const WEB_AUDIO = audioFactory !== null;
const audio = createAudio(audioFactory);
const player = createTonePlayer(audio);
const listener = createListener(audio, browserListenerEnv());
const clicker = createClicker(audio);
/** The song's tones, apart from the card's single tone. */
const scheduler = createToneScheduler(audio);
/** Playback's own clicker, so the drill flow's cleanup cannot cut its clicks. */
const playbackClicker = createClicker(audio);
/** The audio clock, or the page clock when there is no audio context (the song then runs silent but in time). */
const timedClock = { now: () => clicker.now() ?? performance.now() / 1000 };
const BAND = frequencyBand(instrument);
/** The checks a sounding reading passes, for the overrun's trace. */
const CHECKS = { ...DEFAULT_THRESHOLDS, band: BAND };
/** The playhead's clocks: stable functions, so its frame loop restarts only with the song. */
const playheadNow = () => timedClock.now();
const playheadLatency = () => outputLatencySeconds(audio);
/** The timed flow now running, for the overlay to read its scoring and readings; stable functions, so its frame loop restarts only with the song. */
let activeTimed: TimedFlow | null = null;
const fillProgress = () => activeTimed?.progress() ?? null;
/** The Single note flow's live trace of the tone now sounding, for the overlay; null when none runs. */
let activeSingleTrace: (() => Segment | null) | null = null;
const toneTrace = () => activeSingleTrace?.() ?? null;
const fillReading = () => activeTimed?.reading() ?? null;

function listenFor(settings: Settings): CardListen | null {
	if (!settings.judgeEnabled) return null;
	return {
		listener,
		tracker: createToneTracker({ ...DEFAULT_THRESHOLDS, band: BAND }),
		grade: (p, hz) =>
			judge(soundingPitch(instrument, p), hz, settings.toleranceCents),
		// The same clock as the requestAnimationFrame timestamps on readings.
		now: () => performance.now(),
	};
}

function timedListenFor(settings: Settings): TimedListen | null {
	if (!settings.judgeEnabled) return null;
	return {
		listener,
		coverage: {
			toleranceCents: settings.toleranceCents,
			checks: { ...DEFAULT_THRESHOLDS, band: BAND },
			sounding: (p) => soundingPitch(instrument, p),
		},
	};
}

/** Judges each Single note from the microphone: the tone rule against the note's sounding pitch and written length. */
function singleListenFor(
	settings: Settings,
	song: Song,
	timeline: Timeline,
): SingleNoteListen | null {
	if (!settings.judgeEnabled) return null;
	return {
		listener,
		watch: createToneWatch(CHECKS),
		grade: (index, readings) => {
			const note = timeline.notes[index];
			const written = song.notes[index];
			if (!note || !written) return "wrong";
			return gradeTone(readings, {
				expected: soundingPitch(instrument, written.pitch),
				toleranceCents: settings.toleranceCents,
				lengthMs: note.endMs - note.startMs,
				checks: CHECKS,
			});
		},
		// The same clock as the requestAnimationFrame timestamps on readings.
		now: () => performance.now(),
	};
}

function pageVisible(): boolean {
	return document.visibilityState !== "hidden";
}

const FONT_FAMILY = fontFamilyFor(instrument.tablatureFont);

export function App() {
	const [fontStatus, setFontStatus] = useState<FontStatus>("loading");
	useEffect(() => {
		loadFont(FONT_FAMILY, fontUrl(instrument.tablatureFont), {
			FontFace,
			fonts: document.fonts,
		}).then(setFontStatus);
	}, []);
	const [settings, setSettings] = useState<Settings>(() =>
		loadSettings(browserStorage(), instrument, DEFAULT_SETTINGS),
	);
	// A ref, not state: a grade must not re-run the flow effect, which deals a new card.
	const scoresRef = useRef<Scores | null>(null);
	if (scoresRef.current === null) {
		scoresRef.current = loadProgress(browserStorage(), instrument);
	}
	// Bumped after each grade so the revealed card re-renders with the new score.
	const [, setScoreTick] = useState(0);
	const settingsRef = useRef(settings);
	settingsRef.current = settings;
	const songEdited = useRef(false);
	const [songState, setSongState] = useState<SongState>(NO_SONG);
	const [open, setOpen] = useState(false);
	const [card, setCard] = useState<CardState | null>(null);
	const [single, setSingle] = useState<SingleNoteState | null>(null);
	const [timed, setTimed] = useState<TimedState | null>(null);
	const [visible, setVisible] = useState(pageVisible);
	// The Play song button: the song is playing, and where its playback stands.
	const [playing, setPlaying] = useState(false);
	const [playback, setPlayback] = useState<PlaybackState | null>(null);
	const [judgeUnavailable, setJudgeUnavailable] = useState(false);
	const changeSettings = (next: Settings) => {
		setPlaying(false);
		setSettings(next);
		saveSettings(browserStorage(), next);
	};
	// The saved song text is parsed once at load (abcjs loads only when there is
	// one). A text that no longer passes leaves no song, and Settings shows the problems.
	useEffect(() => {
		const saved = settingsRef.current;
		if (saved.songAbc === "") return;
		let current = true;
		parseAbc(saved.songAbc, instrument).then((result) => {
			if (!current || songEdited.current) return;
			setSongState(songStateFrom(result));
			if (result.ok && settingsRef.current.songTune > result.tunes.length) {
				changeSettings({ ...settingsRef.current, songTune: 1 });
			}
		});
		return () => {
			current = false;
		};
	}, []);
	const openSettings = () => {
		setPlaying(false);
		setCard(null);
		setOpen(true);
	};
	useEffect(() => {
		// Capture on window, so the unlock runs before the flow's own handlers on
		// the same gesture and a tone started by that gesture is heard.
		const unlock = () => player.unlock();
		const events = ["click", "keydown", "touchend"] as const;
		for (const type of events)
			window.addEventListener(type, unlock, { capture: true });
		return () => {
			for (const type of events)
				window.removeEventListener(type, unlock, { capture: true });
		};
	}, []);
	useEffect(() => {
		const onVisibility = () => {
			setVisible(pageVisible());
			if (!pageVisible()) setPlaying(false);
		};
		document.addEventListener("visibilitychange", onVisibility);
		return () => document.removeEventListener("visibilitychange", onVisibility);
	}, []);
	// With judging on, a hidden page has no flow, so the microphone is released;
	// showing it again deals a fresh card. With judging off visibility is ignored.
	// A timed song stops when the page is hidden, whether or not it judges.
	const timedSong = tempoApplies(settings);
	// Scoring after the song: no live lanes, playhead or readout; the result comes at the end.
	const after = scoringAfterApplies(settings);
	const singleNote = singleNoteApplies(settings);
	const visibleKey =
		settings.judgeEnabled || settings.mode === "song" ? visible : true;
	const song = chosenTune(songState.tunes, settings.songTune);
	const barsPerLine = settings.barsPerLine;
	const lines = useMemo(
		() => (song === null ? [] : songLines(song, barsPerLine)),
		[song, barsPerLine],
	);
	const songTempo = song?.tempo ?? DEFAULT_TEMPO;
	const timeline = useMemo(
		() => (song === null ? null : buildTimeline(song, songTempo)),
		[song, songTempo],
	);
	// Waiting for the tap or counting in: no note is lit yet.
	const counting = timed?.phase === "ready" || timed?.phase === "count-in";
	useEffect(() => {
		if (!settings.judgeEnabled) setJudgeUnavailable(false);
		if (open || !visibleKey) return;
		// While the song plays no card or timed flow runs: its cleanup stops the
		// flow and releases the microphone, and a finished run's state goes too.
		if (playing) {
			setCard(null);
			setTimed(null);
			setSingle(null);
			return;
		}
		// In Song mode the song is still parsing until `song` arrives, and stays
		// absent for a text that fails. No flow and no card meanwhile.
		if (settings.mode === "song" && song === null) {
			setCard(null);
			setTimed(null);
			setSingle(null);
			return;
		}
		const onGraded = (pitch: Pitch, grade: ProgressGrade) => {
			const scores = applyGrade(scoresRef.current as Scores, pitch, grade);
			scoresRef.current = scores;
			saveProgress(browserStorage(), instrument, scores);
			setScoreTick((t) => t + 1);
		};
		let flow: { start(): void; step(): void; stop(): void };
		if (singleNote && song !== null) {
			// One note at a time with no clock; with judging on the microphone decides.
			const built = buildTimeline(song, song.tempo ?? DEFAULT_TEMPO);
			let currentNote = 0;
			const single = createSingleNoteFlow({
				count: song.notes.length,
				fingeringDelayMs: settings.fingeringDelaySeconds * 1000,
				advanceDelayMs: settings.singleAdvanceDelaySeconds * 1000,
				listen: singleListenFor(settings, song, built),
				onChange: (state) => {
					currentNote = state.index;
					setSingle(state);
					if (state.listening === "unavailable") setJudgeUnavailable(true);
					else if (state.listening === "running") setJudgeUnavailable(false);
				},
			});
			flow = single;
			activeSingleTrace = () => {
				const note = built.notes[currentNote];
				const written = song.notes[currentNote];
				if (!note || !written) return null;
				return toneSegment(
					single.tone(),
					note,
					soundingPitch(instrument, written.pitch),
					CHECKS,
				);
			};
			setCard(null);
			setTimed(null);
		} else if (timedSong && song !== null) {
			flow = createTimedFlow({
				song,
				clock: timedClock,
				clicker,
				// Nothing is stored: no `onGraded`, so smart sampling is untouched.
				metronome: metronomeApplies(settings),
				after: scoringAfterApplies(settings),
				listen: timedListenFor(settings),
				outputLatency: playheadLatency,
				onChange: (state) => {
					setTimed(state);
					if (state.listening === "unavailable") setJudgeUnavailable(true);
					else if (state.listening === "running") setJudgeUnavailable(false);
				},
			});
			setCard(null);
			setSingle(null);
		} else {
			// Flashcards: always a random draw from the pool, whatever song is saved.
			const smart = smartSamplingApplies(settings);
			const pool = poolFor(settings);
			flow = createCardFlow({
				next: smart
					? needSource(pool, () => scoresRef.current as Scores, Math.random)
					: randomSource(pool, Math.random),
				delayMs: settings.delaySeconds * 1000,
				advanceDelayMs: settings.autoAdvance
					? settings.advanceDelaySeconds * 1000
					: null,
				tone: settings.soundEnabled
					? {
							delayMs: settings.soundDelaySeconds * 1000,
							play: (p) =>
								player.play(
									soundingPitch(instrument, p),
									settings.soundDurationSeconds,
								),
							stop: () => player.stop(),
						}
					: null,
				listen: listenFor(settings),
				onGraded: smart ? onGraded : null,
				onChange: (state: CardState) => {
					setCard(state);
					if (state.listening === "unavailable") setJudgeUnavailable(true);
					else if (state.listening === "running") setJudgeUnavailable(false);
				},
			});
			setTimed(null);
			setSingle(null);
		}
		const onClick = (event: MouseEvent) => {
			if (
				event.target instanceof Element &&
				event.target.closest("a, button, input, select, label")
			)
				return;
			flow.step();
		};
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.repeat || event.ctrlKey || event.metaKey || event.altKey)
				return;
			// Enter on the focused "Analysis ↓" link, or a key in a field, is not a start.
			if (
				event.target instanceof Element &&
				event.target.closest("a, button, input, select, label")
			)
				return;
			flow.step();
		};
		document.addEventListener("click", onClick);
		window.addEventListener("keydown", onKeyDown);
		if (timedSong && !singleNote && song !== null)
			activeTimed = flow as TimedFlow;
		flow.start();
		return () => {
			if (activeTimed === flow) activeTimed = null;
			activeSingleTrace = null;
			document.removeEventListener("click", onClick);
			window.removeEventListener("keydown", onKeyDown);
			flow.stop();
		};
	}, [settings, open, visibleKey, song, playing]);
	// The song played from the header: a count-in, then its tones on the audio clock.
	useEffect(() => {
		if (!playing || open || song === null || settings.mode !== "song") return;
		const flow = createPlaybackFlow({
			song,
			clock: timedClock,
			clicker: playbackClicker,
			tones: scheduler,
			sounding: (p) => soundingPitch(instrument, p),
			metronome: metronomeApplies(settings),
			onChange: setPlayback,
			onEnd: () => setPlaying(false),
		});
		flow.start();
		return () => {
			flow.stop();
			setPlayback(null);
		};
	}, [playing, open, song, settings]);
	const lanes = timed ? lanesShown(after, timed.phase, timed.summary) : true;
	// What was played after the last note, only in the summary with scoring after the song; a restart empties the readings.
	const lastNoteEndMs = timeline?.notes[timeline.notes.length - 1]?.endMs ?? 0;
	const overrunReadings = timed?.overrunReadings;
	const overrunPhase = timed?.phase;
	const overrun = useMemo(
		() =>
			after && lanes && overrunPhase === "summary" && overrunReadings
				? overrunTrace(overrunReadings, CHECKS, lastNoteEndMs)
				: null,
		[after, lanes, overrunPhase, overrunReadings, lastNoteEndMs],
	);
	const header = headerSong(settings, song, open, playing);
	const play = playButton({
		settings,
		song,
		open,
		webAudio: WEB_AUDIO,
		playing,
		phase: timed ? cardPhase(timed) : undefined,
	});
	const choice = tuneChoice({
		settings,
		tunes: songState.tunes,
		open,
		phase: timed ? cardPhase(timed) : undefined,
	});
	const headerRef = useRef<HTMLElement>(null);
	return (
		<main>
			<header class="app-header" ref={headerRef}>
				<h1>fingerwise</h1>
				{choice !== null ? (
					<select
						class="app-header-tunes"
						aria-label="Tune"
						disabled={choice.disabled}
						value={String(choice.selected)}
						onChange={(e) => {
							const next = chooseTune(
								settings,
								Number(e.currentTarget.value) + 1,
							);
							if (next) changeSettings(next);
						}}
					>
						{choice.labels.map((label, i) => (
							// Position is the identity: titles can repeat.
							<option key={i} value={String(i)}>
								{label}
							</option>
						))}
					</select>
				) : (
					header.title !== null && (
						<span class="app-header-title" title={header.title}>
							{header.title}
						</span>
					)
				)}
				{header.tempo !== null && (
					<span class="app-header-tempo">{header.tempo}</span>
				)}
				{play !== null && (
					<button
						type="button"
						class="app-header-play"
						disabled={play.disabled}
						aria-label={play.text}
						onClick={() => setPlaying((p) => !p)}
					>
						<span aria-hidden="true">{play.icon}</span>
						<span class="app-header-play-text"> {play.text}</span>
					</button>
				)}
				{!open && (
					<button type="button" onClick={openSettings}>
						Settings
					</button>
				)}
			</header>
			{open && (
				<SettingsView
					instrument={instrument}
					settings={settings}
					onChange={changeSettings}
					onClose={() => setOpen(false)}
					judgeUnavailable={judgeUnavailable}
					songState={songState}
					onResetProgress={() => {
						scoresRef.current = resetProgress(browserStorage(), instrument);
					}}
					onSong={(state) => {
						songEdited.current = true;
						setSongState(state);
					}}
				/>
			)}
			{!open && playing && playback && song !== null && timeline !== null && (
				<Card
					pitch={(song.notes[0] as SongNote).pitch}
					revealed={false}
					judging={false}
					timed="playing"
					timedNote={PLAYING_SONG}
					legend={false}
					readout={false}
					song={playbackView(
						{
							lines,
							meter: song.meter,
							barsPerLine,
							timeline,
							tempo: songTempo,
						},
						playback,
						{ now: playheadNow, outputLatency: playheadLatency },
					)}
					header={headerRef}
					instrument={instrument}
					staffOptions={STAFF_OPTIONS}
					font={{ family: FONT_FAMILY, status: fontStatus }}
				/>
			)}
			{!open &&
				!playing &&
				singleNote &&
				single &&
				song !== null &&
				timeline !== null && (
					<Card
						pitch={
							(song.notes[single.index] ?? (song.notes[0] as SongNote)).pitch
						}
						revealed={false}
						judging={settings.judgeEnabled}
						legend={settings.judgeEnabled}
						single={{
							ended: single.ended,
							fingering: single.fingering,
							message: single.message,
						}}
						song={singleNoteView(
							{
								lines,
								meter: song.meter,
								barsPerLine,
								timeline,
								tempo: songTempo,
							},
							single,
							settings.judgeEnabled
								? { trace: toneTrace, tolerance: settings.toleranceCents }
								: null,
						)}
						header={headerRef}
						instrument={instrument}
						staffOptions={STAFF_OPTIONS}
						font={{ family: FONT_FAMILY, status: fontStatus }}
					/>
				)}
			{!open && !playing && timedSong && timed && (
				<Card
					pitch={timed.pitch}
					beats={timed.beats}
					revealed={false}
					judging={settings.judgeEnabled}
					timed={cardPhase(timed)}
					timedSummary={summaryText(timed.summary)}
					timedTuning={tuningText(timed.summary?.tuning ?? [])}
					timedAnalysis={settings.judgeEnabled ? timed.analysis : null}
					timedOverrunMs={overrun?.endMs ?? null}
					timedNote={
						after ? (timed.overrun ? LISTENING_PAST_END : SCORING_AFTER) : null
					}
					legend={settings.judgeEnabled && lanes}
					readout={
						!after &&
						timed.listening === "running" &&
						(timed.phase === "count-in" || timed.phase === "playing")
					}
					song={
						song === null || timeline === null
							? undefined
							: {
									lines,
									meter: song.meter,
									barsPerLine,
									// Before the first slot the first rest is lit, then each beat's.
									current: counting ? -1 : timed.index,
									countBeat: counting ? (timed.countBeat ?? 0) : null,
									timeline,
									tempo: songTempo,
									playhead: {
										running:
											timed.phase === "count-in" || timed.phase === "playing",
										origin: timed.origin,
										now: playheadNow,
										outputLatency: playheadLatency,
									},
									// The shading goes with the summary: a restart empties it.
									spots:
										settings.judgeEnabled && timed.phase === "summary"
											? (timed.analysis?.practice.spots ?? [])
											: [],
									after,
									scored: after && lanes ? timed.scored : null,
									overrun,
									fill: settings.judgeEnabled
										? {
												progress: fillProgress,
												reading: fillReading,
												tolerance: settings.toleranceCents,
												instrument,
											}
										: null,
								}
					}
					header={headerRef}
					instrument={instrument}
					staffOptions={STAFF_OPTIONS}
					font={{ family: FONT_FAMILY, status: fontStatus }}
				/>
			)}
			{!open && !playing && !timedSong && card && (
				<Card
					pitch={card.pitch}
					revealed={card.revealed}
					listening={card.listening}
					judging={settings.judgeEnabled}
					verdict={card.verdict}
					need={
						smartSamplingApplies(settings)
							? needOf(scoresRef.current as Scores, card.pitch)
							: null
					}
					instrument={instrument}
					staffOptions={STAFF_OPTIONS}
					font={{ family: FONT_FAMILY, status: fontStatus }}
				/>
			)}
			<footer>
				Fingering font: Open 12 Hole Ocarina 1 © 2016 Mathias Panzenböck,
				licensed under the <a href={licenseUrl}>SIL Open Font License 1.1</a>.
			</footer>
		</main>
	);
}
