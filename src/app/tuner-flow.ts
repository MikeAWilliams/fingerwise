import type { ListenResult, PitchReading } from "../audio/listener";
import type { Reading, ToneWatch } from "../core/judge";
import type { Pitch } from "../core/pitch";
import type { Listening } from "./card-flow";
import { createReadoutThrottle } from "./judge-text";

/** The note the tuner shows, in written pitch, with how far off it is. */
export interface TunerNote {
	pitch: Pitch;
	cents: number;
}

/** What Tuner shows. */
export interface TunerState {
	/** Where the microphone stream stands. */
	listening: Listening;
	/** The note being played; null when none. */
	note: TunerNote | null;
	/** The note is the last tone's result, kept until the next tone starts. */
	held: boolean;
}

/** What the flow needs to listen. */
export interface TunerListen {
	listener: {
		start(onReading: (reading: PitchReading) => void): Promise<ListenResult>;
		stop(): void;
	};
	watch: Pick<ToneWatch, "reset" | "push" | "tone">;
	/** The clock the listener's reading times use, in ms. */
	now(): number;
	/** The note to show while a tone sounds, in written pitch; null for none. */
	follow(readings: readonly Reading[]): TunerNote | null;
	/** The note to hold once a tone ends, in written pitch; null for none. */
	hold(readings: readonly Reading[]): TunerNote | null;
}

export interface TunerFlowOptions {
	listen: TunerListen;
	onChange: (state: TunerState) => void;
}

export interface TunerFlow {
	/** Open the microphone. */
	start(): void;
	/** A gesture while the microphone is locked opens it; otherwise nothing. */
	step(): void;
	/** Release the microphone. */
	stop(): void;
}

/**
 * Tuner: the microphone is open and the note played is shown. A tone starts
 * once the tone watch sees it settle; while it sounds the note and its
 * offset follow the readings, changing at most every `READOUT_INTERVAL_MS`.
 * When it ends the median offset is held until the next tone starts. There is
 * no timer, no tone played, no grading and nothing is stored.
 */
export function createTunerFlow({
	listen,
	onChange,
}: TunerFlowOptions): TunerFlow {
	let stopped = false;
	let listening: Listening = "opening";
	let note: TunerNote | null = null;
	let held = false;
	let mayShow = createReadoutThrottle();

	function show() {
		onChange({ listening, note, held });
	}

	function onReading(reading: PitchReading) {
		if (stopped || listening !== "running") return;
		try {
			const event = listen.watch.push(reading);
			if (event?.kind === "end") {
				note = listen.hold(event.readings);
				held = true;
				show();
				return;
			}
			const tone = listen.watch.tone();
			if (tone === null) return;
			if (event?.kind === "start") {
				// A new tone clears the hold and follows from its first readings.
				mayShow = createReadoutThrottle();
				mayShow(reading.time);
			} else if (!mayShow(reading.time)) return;
			note = listen.follow(tone.readings);
			held = false;
			show();
		} catch {
			// A failing watch or helper leaves what is shown as it is.
		}
	}

	function open() {
		let started: Promise<ListenResult>;
		try {
			started = Promise.resolve(listen.listener.start(onReading));
		} catch {
			started = Promise.resolve({
				status: "unavailable",
				reason: "unsupported",
			});
		}
		started
			.catch(
				(): ListenResult => ({ status: "unavailable", reason: "unsupported" }),
			)
			.then(settle);
	}

	function settle(result: ListenResult) {
		if (stopped) return;
		listening = result.status;
		if (listening === "running") {
			try {
				listen.watch.reset(listen.now());
			} catch {
				// A watch that fails shows no note.
			}
		}
		show();
	}

	return {
		start() {
			listening = "opening";
			note = null;
			held = false;
			show();
			open();
		},
		step() {
			if (stopped || listening !== "locked") return;
			listening = "opening";
			show();
			open();
		},
		stop() {
			stopped = true;
			try {
				listen.listener.stop();
			} catch {
				// Nothing more can be done; the flow is over.
			}
		},
	};
}
