import type {
	AnalyserLike,
	Audio,
	AudioContextLike,
	SourceLike,
	StreamLike,
} from "./context";
import { detectPitch, rmsDb } from "./detector";

export const WINDOW_SIZE = 2048;

/** The browser's processing is off: it can fade a steady tone or move the noise gate. */
export const MIC_CONSTRAINTS = {
	audio: {
		echoCancellation: false,
		noiseSuppression: false,
		autoGainControl: false,
	},
} as const;

export type MicConstraints = typeof MIC_CONSTRAINTS;

/** One reading per animation frame. `time` is the frame timestamp in ms, `level` the RMS in dBFS. */
export interface PitchReading {
	time: number;
	frequency: number | null;
	clarity: number;
	level: number;
}

export type UnavailableReason = "denied" | "no-device" | "unsupported";

export type ListenResult =
	| { status: "running" }
	| { status: "locked" }
	| { status: "unavailable"; reason: UnavailableReason };

export interface ListenerEnv {
	getUserMedia: ((constraints: MicConstraints) => Promise<StreamLike>) | null;
	requestFrame(callback: (timeMs: number) => void): number;
	cancelFrame(id: number): void;
}

export interface Listener {
	/** Open the microphone and call `onReading` once per frame. Never throws or rejects. */
	start(onReading: (reading: PitchReading) => void): Promise<ListenResult>;
	/** Stop the readings and release the microphone; does nothing when stopped. */
	stop(): void;
}

interface Session {
	stream: StreamLike;
	source: SourceLike;
	analyser: AnalyserLike;
	frame: number | null;
}

const LOCKED: ListenResult = { status: "locked" };

function unavailable(reason: UnavailableReason): ListenResult {
	return { status: "unavailable", reason };
}

function reasonFor(error: unknown): UnavailableReason {
	const name = (error as { name?: unknown } | null)?.name;
	if (name === "NotAllowedError" || name === "SecurityError") return "denied";
	if (
		name === "NotFoundError" ||
		name === "OverconstrainedError" ||
		name === "NotReadableError"
	)
		return "no-device";
	return "unsupported";
}

function release(stream: StreamLike): void {
	try {
		for (const track of stream.getTracks()) {
			try {
				track.stop();
			} catch {
				// Keep releasing the other tracks.
			}
		}
	} catch {
		// Nothing more can be done for a stream without tracks.
	}
}

export function createListener(audio: Audio, env: ListenerEnv): Listener {
	// Bumped by `stop()`, so a start that resolves later knows it was cancelled.
	let generation = 0;
	let pending: Promise<ListenResult> | null = null;
	let session: Session | null = null;
	let onReading: (reading: PitchReading) => void = () => {};

	function loop(ctx: AudioContextLike, current: Session): void {
		const buffer = new Float32Array(WINDOW_SIZE);
		const frame = (time: number) => {
			if (session !== current) return;
			try {
				current.analyser.getFloatTimeDomainData(buffer);
				const { frequency, clarity } = detectPitch(buffer, ctx.sampleRate);
				const reading = { time, frequency, clarity, level: rmsDb(buffer) };
				try {
					onReading(reading);
				} catch {
					// A failing consumer does not stop the stream.
				}
			} catch {
				// A frame that cannot be read is skipped.
			}
			if (session === current) current.frame = env.requestFrame(frame);
		};
		current.frame = env.requestFrame(frame);
	}

	async function open(mine: number): Promise<ListenResult> {
		const ctx = audio.context();
		const getUserMedia = env.getUserMedia;
		if (!ctx || !getUserMedia) return unavailable("unsupported");
		// Same lock rule as the tone player: nothing before the first gesture.
		if (ctx.state !== "running" && !audio.unlockRequested) return LOCKED;

		let stream: StreamLike;
		try {
			stream = await getUserMedia(MIC_CONSTRAINTS);
		} catch (error) {
			return unavailable(reasonFor(error));
		}
		if (mine !== generation) {
			release(stream);
			return LOCKED;
		}

		try {
			const source = ctx.createMediaStreamSource(stream);
			const analyser = ctx.createAnalyser();
			analyser.fftSize = WINDOW_SIZE;
			// Never connected to the destination: the microphone is not played back.
			source.connect(analyser);
			session = { stream, source, analyser, frame: null };
			loop(ctx, session);
			return { status: "running" };
		} catch {
			session = null;
			release(stream);
			return unavailable("unsupported");
		}
	}

	function start(
		callback: (reading: PitchReading) => void,
	): Promise<ListenResult> {
		onReading = callback;
		if (pending) return pending;
		const mine = generation;
		const result = open(mine).catch(() => unavailable("unsupported"));
		pending = result;
		// Only a running stream keeps its result; anything else lets a later start retry.
		result.then((r) => {
			if (pending === result && r.status !== "running") pending = null;
		});
		return result;
	}

	function stop(): void {
		generation++;
		pending = null;
		const current = session;
		session = null;
		onReading = () => {};
		if (!current) return;
		try {
			if (current.frame !== null) env.cancelFrame(current.frame);
		} catch {
			// The loop also checks the session, so it ends anyway.
		}
		try {
			current.source.disconnect();
		} catch {
			// Releasing the tracks below is what matters.
		}
		try {
			current.analyser.disconnect();
		} catch {
			// As above.
		}
		release(current.stream);
	}

	return { start, stop };
}

/** The browser's microphone and animation frames; `getUserMedia` is null when absent. */
export function browserListenerEnv(): ListenerEnv {
	const devices = (
		globalThis as {
			navigator?: {
				mediaDevices?: {
					getUserMedia?: (c: MicConstraints) => Promise<StreamLike>;
				};
			};
		}
	).navigator?.mediaDevices;
	const getUserMedia = devices?.getUserMedia
		? (c: MicConstraints) =>
				(
					devices.getUserMedia as (c: MicConstraints) => Promise<StreamLike>
				).call(devices, c)
		: null;
	return {
		getUserMedia,
		requestFrame: (callback) => globalThis.requestAnimationFrame(callback),
		cancelFrame: (id) => globalThis.cancelAnimationFrame(id),
	};
}
