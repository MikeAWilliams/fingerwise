// The one audio context of the app. Web Audio is described by the few
// structural types used here, so a fake can stand in for it in Node tests and a
// real `AudioContext` satisfies them.

export interface AudioParamLike {
	value: number;
	setValueAtTime(value: number, time: number): unknown;
	linearRampToValueAtTime(value: number, time: number): unknown;
	cancelScheduledValues(time: number): unknown;
}

export interface GainLike {
	gain: AudioParamLike;
	connect(destination: unknown): unknown;
}

export interface OscillatorLike {
	type: string;
	frequency: AudioParamLike;
	onended: ((...args: never[]) => void) | null;
	connect(destination: unknown): unknown;
	start(when?: number): void;
	stop(when?: number): void;
}

export interface AnalyserLike {
	fftSize: number;
	getFloatTimeDomainData(array: Float32Array<ArrayBuffer>): void;
	disconnect(): void;
}

/** A microphone stream: only its tracks are used, to release it. */
export interface StreamLike {
	getTracks(): { stop(): void }[];
}

export interface SourceLike {
	connect(destination: unknown): unknown;
	disconnect(): void;
}

export interface AudioContextLike {
	readonly state: string;
	readonly currentTime: number;
	readonly sampleRate: number;
	readonly destination: unknown;
	resume(): Promise<void>;
	createOscillator(): OscillatorLike;
	createGain(): GainLike;
	createAnalyser(): AnalyserLike;
	createMediaStreamSource(stream: StreamLike): SourceLike;
}

export interface Audio {
	/** The shared context, created on first call; null when unavailable. */
	context(): AudioContextLike | null;
	/** Ask a suspended context to resume. Call from a user gesture. Never throws. */
	unlock(): void;
	/** True once `unlock()` has been called. */
	readonly unlockRequested: boolean;
}

export function createAudio(create: (() => AudioContextLike) | null): Audio {
	let ctx: AudioContextLike | null = null;
	let created = false;
	let unlockRequested = false;

	function context(): AudioContextLike | null {
		if (!created) {
			created = true;
			try {
				ctx = create ? create() : null;
			} catch {
				ctx = null;
			}
		}
		return ctx;
	}

	return {
		context,
		unlock() {
			unlockRequested = true;
			const c = context();
			if (!c || c.state !== "suspended") return;
			try {
				c.resume().catch(() => {});
			} catch {
				// A context that cannot resume just stays silent.
			}
		},
		get unlockRequested() {
			return unlockRequested;
		},
	};
}

/** A factory for the browser's `AudioContext`, or null when there is none. */
export function browserAudioFactory(): (() => AudioContextLike) | null {
	const Ctor = (globalThis as { AudioContext?: new () => AudioContextLike })
		.AudioContext;
	return Ctor ? () => new Ctor() : null;
}
