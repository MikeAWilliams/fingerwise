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
import { createTonePlayer } from "../audio/tone";
import { buildTimeline } from "../core/coverage";
import { buildPool } from "../core/drill";
import { loadInstrument, soundingPitch } from "../core/instrument";
import {
	createToneTracker,
	DEFAULT_THRESHOLDS,
	frequencyBand,
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
	keepTempoApplies,
	metronomeApplies,
	parseDefaults,
	type Settings,
	smartSamplingApplies,
} from "../core/settings";
import { DEFAULT_TEMPO, songLines } from "../core/song";
import type { StaffOptions } from "../render/staff";
import { type FontStatus, fontFamilyFor } from "../render/tab";
import { Card } from "./Card";
import {
	type CardListen,
	type CardState,
	createCardFlow,
	needSource,
	type PitchSource,
	randomSource,
	songSource,
} from "./card-flow";
import { fontUrl, loadFont } from "./font";
import { headerSong } from "./header-text";
import { summaryText, tuningText } from "./judge-text";
import { loadProgress, resetProgress, saveProgress } from "./progress-store";
import { Settings as SettingsView } from "./Settings";
import { cardPhase } from "./scroll-lock";
import { browserStorage, loadSettings, saveSettings } from "./settings-store";
import { NO_SONG, type SongState, songStateFrom } from "./song-form";
import {
	createTimedFlow,
	type TimedFlow,
	type TimedListen,
	type TimedState,
} from "./timed-flow";

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

const audio = createAudio(browserAudioFactory());
const player = createTonePlayer(audio);
const listener = createListener(audio, browserListenerEnv());
const clicker = createClicker(audio);
/** The audio clock, or the page clock when there is no audio context (the song then runs silent but in time). */
const timedClock = { now: () => clicker.now() ?? performance.now() / 1000 };
const BAND = frequencyBand(instrument);
/** The playhead's clocks: stable functions, so its frame loop restarts only with the song. */
const playheadNow = () => timedClock.now();
const playheadLatency = () => outputLatencySeconds(audio);
/** The timed flow now running, for the overlay to read its scoring and readings; stable functions, so its frame loop restarts only with the song. */
let activeTimed: TimedFlow | null = null;
const fillProgress = () => activeTimed?.progress() ?? null;
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
	// The song note's length for the card; undefined (a whole note) without a song.
	const [cardBeats, setCardBeats] = useState<number | undefined>(undefined);
	const [timed, setTimed] = useState<TimedState | null>(null);
	const [visible, setVisible] = useState(pageVisible);
	const [judgeUnavailable, setJudgeUnavailable] = useState(false);
	const changeSettings = (next: Settings) => {
		setSettings(next);
		saveSettings(browserStorage(), next);
	};
	// The saved song text is parsed once at load (abcjs loads only when there is
	// one). A text that no longer passes turns use song off but stays visible.
	useEffect(() => {
		const saved = settingsRef.current;
		if (saved.songAbc === "") {
			if (saved.useSong) changeSettings({ ...saved, useSong: false });
			return;
		}
		let current = true;
		parseAbc(saved.songAbc, instrument).then((result) => {
			if (!current || songEdited.current) return;
			setSongState(songStateFrom(result));
			if (!result.ok && settingsRef.current.useSong) {
				changeSettings({ ...settingsRef.current, useSong: false });
			}
		});
		return () => {
			current = false;
		};
	}, []);
	const openSettings = () => {
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
		const onVisibility = () => setVisible(pageVisible());
		document.addEventListener("visibilitychange", onVisibility);
		return () => document.removeEventListener("visibilitychange", onVisibility);
	}, []);
	// With judging on, a hidden page has no flow, so the microphone is released;
	// showing it again deals a fresh card. With judging off visibility is ignored.
	// A timed song stops when the page is hidden, whether or not it judges.
	const timedSong = keepTempoApplies(settings);
	const visibleKey = settings.judgeEnabled || timedSong ? visible : true;
	const song = songState.song;
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
		// With use song on, the song is still parsing until `song` arrives; load
		// turns use song off for a text that fails. No flow and no card meanwhile.
		const smart = smartSamplingApplies(settings);
		let next: PitchSource;
		let beats: number | undefined;
		if (settings.useSong) {
			if (song === null) {
				setCard(null);
				setTimed(null);
				return;
			}
			next = songSource(song.pitches, (index) => {
				beats = song.notes[index]?.beats;
			});
		} else {
			const pool = poolFor(settings);
			next = smart
				? needSource(pool, () => scoresRef.current as Scores, Math.random)
				: randomSource(pool, Math.random);
		}
		const onChange = (state: CardState) => {
			setCard(state);
			setCardBeats(beats);
			if (state.listening === "unavailable") setJudgeUnavailable(true);
			else if (state.listening === "running") setJudgeUnavailable(false);
		};
		const onGraded = (pitch: Pitch, grade: ProgressGrade) => {
			const scores = applyGrade(scoresRef.current as Scores, pitch, grade);
			scoresRef.current = scores;
			saveProgress(browserStorage(), instrument, scores);
			setScoreTick((t) => t + 1);
		};
		const flow =
			timedSong && song !== null
				? createTimedFlow({
						song,
						clock: timedClock,
						clicker,
						// Nothing is stored: no `onGraded`, so smart sampling is untouched.
						metronome: metronomeApplies(settings),
						listen: timedListenFor(settings),
						outputLatency: playheadLatency,
						onChange: (state) => {
							setTimed(state);
							if (state.listening === "unavailable") setJudgeUnavailable(true);
							else if (state.listening === "running")
								setJudgeUnavailable(false);
						},
					})
				: createCardFlow({
						next,
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
						wait: settings.useSong && settings.judgeEnabled,
						onGraded: smart ? onGraded : null,
						onChange,
					});
		// A card and a timed song never show together.
		if (timedSong) setCard(null);
		else setTimed(null);
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
		if (timedSong && song !== null) activeTimed = flow as TimedFlow;
		flow.start();
		return () => {
			if (activeTimed === flow) activeTimed = null;
			document.removeEventListener("click", onClick);
			window.removeEventListener("keydown", onKeyDown);
			flow.stop();
		};
	}, [settings, open, visibleKey, song]);
	const header = headerSong(settings, song, open);
	const headerRef = useRef<HTMLElement>(null);
	return (
		<main>
			<header class="app-header" ref={headerRef}>
				<h1>fingerwise</h1>
				{header.title !== null && (
					<span class="app-header-title" title={header.title}>
						{header.title}
					</span>
				)}
				{header.tempo !== null && (
					<span class="app-header-tempo">{header.tempo}</span>
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
			{!open && timedSong && timed && (
				<Card
					pitch={timed.pitch}
					beats={timed.beats}
					revealed={false}
					judging={settings.judgeEnabled}
					timed={cardPhase(timed)}
					timedSummary={summaryText(timed.summary)}
					timedTuning={tuningText(timed.summary?.tuning ?? [])}
					timedAnalysis={settings.judgeEnabled ? timed.analysis : null}
					readout={
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
			{!open && !timedSong && card && (
				<Card
					pitch={card.pitch}
					beats={cardBeats}
					revealed={card.revealed}
					listening={card.listening}
					judging={settings.judgeEnabled}
					verdict={card.verdict}
					hint={card.hint}
					need={
						smartSamplingApplies(settings) && !settings.useSong
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
