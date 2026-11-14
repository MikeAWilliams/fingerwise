import type {
	Audio,
	AudioContextLike,
	BufferLike,
	BufferSourceLike,
} from "./context";

export const CLICK_SECONDS = 0.015;
export const CLICK_GAIN = 0.5;

export interface Clicker {
	/** The audio clock in seconds, or null when there is no context. */
	now(): number | null;
	/** Play a click starting at `atSeconds` on the audio clock. */
	click(atSeconds: number): void;
	/** Stop every click sounding or still waiting to start. */
	stop(): void;
}

/** A burst of noise that dies away; a fixed generator, so every click sounds the same. */
function fillBurst(data: Float32Array): void {
	let seed = 1;
	for (let i = 0; i < data.length; i++) {
		seed = (seed * 1664525 + 1013904223) >>> 0;
		const noise = seed / 0x80000000 - 1;
		data[i] = noise * (1 - i / data.length) ** 2;
	}
}

export function createClicker(audio: Audio): Clicker {
	const pending = new Set<BufferSourceLike>();
	let burst: { ctx: AudioContextLike; buffer: BufferLike } | null = null;

	function burstFor(ctx: AudioContextLike): BufferLike {
		if (burst?.ctx === ctx) return burst.buffer;
		const length = Math.max(1, Math.round(CLICK_SECONDS * ctx.sampleRate));
		const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
		fillBurst(buffer.getChannelData(0));
		burst = { ctx, buffer };
		return buffer;
	}

	return {
		now() {
			try {
				return audio.context()?.currentTime ?? null;
			} catch {
				return null;
			}
		},
		click(atSeconds) {
			const ctx = audio.context();
			if (!ctx) return;
			// A locked context gets nothing until a gesture asks it to resume.
			if (ctx.state !== "running" && !audio.unlockRequested) return;
			try {
				const source = ctx.createBufferSource();
				const gainNode = ctx.createGain();
				source.buffer = burstFor(ctx);
				gainNode.gain.value = CLICK_GAIN;
				source.connect(gainNode);
				gainNode.connect(ctx.destination);
				source.onended = () => {
					pending.delete(source);
				};
				source.start(atSeconds);
				pending.add(source);
			} catch {
				// A click that cannot be scheduled is just missed.
			}
		},
		stop() {
			const sources = [...pending];
			pending.clear();
			for (const source of sources) {
				try {
					source.stop();
				} catch {
					// Already ended.
				}
			}
		},
	};
}
