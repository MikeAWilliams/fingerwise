import type { ListenResult, PitchReading } from "../audio/listener";
import type { Pitch } from "../core/pitch";
import type { Listening } from "./card-flow";

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
	/** The clock the listener's reading times use, in ms. */
	now(): number;
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
 * Tuner: the microphone is open and the note played is shown. There is no
 * timer, no tone, no grading and nothing is stored.
 */
export function createTunerFlow({
	listen,
	onChange,
}: TunerFlowOptions): TunerFlow {
	let stopped = false;
	let listening: Listening = "opening";

	function show() {
		onChange({ listening, note: null, held: false });
	}

	function onReading(_reading: PitchReading) {
		// S02 shows the note from the readings.
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
		show();
	}

	return {
		start() {
			listening = "opening";
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
