import type {
	AnalyserLike,
	Audio,
	AudioContextLike,
	SourceLike,
	StreamLike,
} from "./context";
import { detectPitch, rmsDb } from "./detector";

export const WINDOW_SIZE = 2048;

/** Samples in one block of the fine level envelope: 2.7 ms at 48 kHz. */
export const ENVELOPE_BLOCK = 128;

/** The browser's processing is off: it can fade a steady tone or move the noise gate. */
export const MIC_CONSTRAINTS = {
	audio: {
		echoCancellation: false,
		noiseSuppression: false,
		autoGainControl: false,
	},
} as const;

export type MicConstraints = typeof MIC_CONSTRAINTS;

/** The RMS in dBFS of one block of samples; `time` is the block's end on the audio clock, in seconds. */
export interface EnvelopeBlock {
	time: number;
	level: number;
}

/**
 * One reading per animation frame. `time` is the frame timestamp in ms, `level`
 * the RMS in dBFS. `audioTime` is the audio context's clock in seconds when the
 * analyser was read, which is the newest sample's time. `envelope` holds the
 * level of each 128-sample block of the samples new since the last frame (none
 * on the first frame), oldest first.
 */
export interface PitchReading {
	time: number;
	/** Always set by the listener; optional so a card's tests and fakes need not give them. */
	audioTime?: number;
	frequency: number | null;
	clarity: number;
	level: number;
	envelope?: EnvelopeBlock[];
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
	/** The audio clock at the last frame, or null before the first. */
	lastAudioTime: number | null;
	/** Samples read but not yet in a whole block: the newest ones, kept for the next frame. */
	carry: number;
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

/**
 * The blocks of the unread samples at the tail of `buffer` (which ends at
 * `audioTime`). Unread are those new since the last frame, as the clock counts
 * them, and the carry from the last frame, at most one window: a longer gap
 * leaves a hole. Updates the session's clock and carry.
 */
function envelopeOf(
	buffer: Float32Array,
	audioTime: number,
	rate: number,
	current: Session,
): EnvelopeBlock[] {
	const last = current.lastAudioTime;
	current.lastAudioTime = audioTime;
	if (last === null) return [];
	const fresh = Math.max(0, Math.round((audioTime - last) * rate));
	const unread = Math.min(WINDOW_SIZE, current.carry + fresh);
	const count = Math.floor(unread / ENVELOPE_BLOCK);
	current.carry = unread - count * ENVELOPE_BLOCK;
	const blocks: EnvelopeBlock[] = [];
	for (let j = 0; j < count; j++) {
		const from = buffer.length - unread + j * ENVELOPE_BLOCK;
		blocks.push({
			time: audioTime - (unread - (j + 1) * ENVELOPE_BLOCK) / rate,
			level: rmsDb(buffer.subarray(from, from + ENVELOPE_BLOCK)),
		});
	}
	return blocks;
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
				// Read right after the samples: the same audio thread, so the same moment.
				const audioTime = ctx.currentTime;
				const { frequency, clarity } = detectPitch(buffer, ctx.sampleRate);
				const reading = {
					time,
					audioTime,
					frequency,
					clarity,
					level: rmsDb(buffer),
					envelope: envelopeOf(buffer, audioTime, ctx.sampleRate, current),
				};
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
			session = {
				stream,
				source,
				analyser,
				frame: null,
				lastAudioTime: null,
				carry: 0,
			};
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
