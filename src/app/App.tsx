import { useEffect, useRef, useState } from "preact/hooks";
import licenseUrl from "../../data/fonts/OFL.txt?url";
import ocarinaJson from "../../data/instruments/ocarina-12-taiwanese.json";
import defaultsJson from "../../data/settings/defaults.json";
import { parseAbc } from "../abc";
import { browserAudioFactory, createAudio } from "../audio/context";
import { browserListenerEnv, createListener } from "../audio/listener";
import { createTonePlayer } from "../audio/tone";
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
	parseDefaults,
	type Settings,
	smartSamplingApplies,
} from "../core/settings";
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
import { loadProgress, resetProgress, saveProgress } from "./progress-store";
import { Settings as SettingsView } from "./Settings";
import { browserStorage, loadSettings, saveSettings } from "./settings-store";
import { NO_SONG, type SongState, songStateFrom } from "./song-form";

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
const BAND = frequencyBand(instrument);

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
	const visibleKey = settings.judgeEnabled ? visible : true;
	const song = songState.song;
	useEffect(() => {
		if (!settings.judgeEnabled) setJudgeUnavailable(false);
		if (open || !visibleKey) return;
		// With use song on, the song is still parsing until `song` arrives; load
		// turns use song off for a text that fails. No flow and no card meanwhile.
		const smart = smartSamplingApplies(settings);
		let next: PitchSource;
		if (settings.useSong) {
			if (song === null) {
				setCard(null);
				return;
			}
			next = songSource(song.pitches);
		} else {
			const pool = poolFor(settings);
			next = smart
				? needSource(pool, () => scoresRef.current as Scores, Math.random)
				: randomSource(pool, Math.random);
		}
		const onChange = (state: CardState) => {
			setCard(state);
			if (state.listening === "unavailable") setJudgeUnavailable(true);
			else if (state.listening === "running") setJudgeUnavailable(false);
		};
		const onGraded = (pitch: Pitch, grade: ProgressGrade) => {
			const scores = applyGrade(scoresRef.current as Scores, pitch, grade);
			scoresRef.current = scores;
			saveProgress(browserStorage(), instrument, scores);
			setScoreTick((t) => t + 1);
		};
		const flow = createCardFlow({
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
			onGraded: smart ? onGraded : null,
			onChange,
		});
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
			flow.step();
		};
		document.addEventListener("click", onClick);
		window.addEventListener("keydown", onKeyDown);
		flow.start();
		return () => {
			document.removeEventListener("click", onClick);
			window.removeEventListener("keydown", onKeyDown);
			flow.stop();
		};
	}, [settings, open, visibleKey, song]);
	return (
		<main>
			<header class="app-header">
				<h1>fingerwise</h1>
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
			{!open && card && (
				<Card
					pitch={card.pitch}
					revealed={card.revealed}
					listening={card.listening}
					judging={settings.judgeEnabled}
					verdict={card.verdict}
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
