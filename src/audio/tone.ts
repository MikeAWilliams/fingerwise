import { type Pitch, toFrequency } from "../core/pitch";
import type {
	Audio,
	AudioContextLike,
	GainLike,
	OscillatorLike,
} from "./context";

export const FADE_SECONDS = 0.02;
export const PEAK_GAIN = 0.3;

export interface TonePlayer {
	/** Play a sine tone at `pitch` for `seconds`, replacing any tone sounding. */
	play(pitch: Pitch, seconds: number): void;
	/** Fade out and stop the current tone; does nothing when there is none. */
	stop(): void;
	/** Ask the audio context to resume; call from a user gesture. */
	unlock(): void;
}

export interface ToneScheduler {
	/**
	 * Schedule a sine tone at `pitch` to start at `atSeconds` on the audio
	 * clock and last `seconds`. Tones may overlap.
	 */
	schedule(pitch: Pitch, atSeconds: number, seconds: number): void;
	/** Stop every scheduled tone: sounding ones fade out, pending ones never sound. */
	stop(): void;
}

interface Tone {
	osc: OscillatorLike;
	gain: GainLike;
	/** When the tone starts, on the audio clock. */
	start: number;
}

/** Start a sine tone at `pitch` from `t0` for `seconds`, with the fade in and out. */
function startTone(
	ctx: AudioContextLike,
	pitch: Pitch,
	t0: number,
	seconds: number,
): Tone {
	const osc = ctx.createOscillator();
	const gainNode = ctx.createGain();
	osc.type = "sine";
	osc.frequency.value = toFrequency(pitch);
	osc.connect(gainNode);
	gainNode.connect(ctx.destination);
	const fade = Math.min(FADE_SECONDS, seconds / 2);
	const { gain } = gainNode;
	gain.setValueAtTime(0, t0);
	gain.linearRampToValueAtTime(PEAK_GAIN, t0 + fade);
	gain.setValueAtTime(PEAK_GAIN, t0 + seconds - fade);
	gain.linearRampToValueAtTime(0, t0 + seconds);
	osc.start(t0);
	osc.stop(t0 + seconds);
	return { osc, gain: gainNode, start: t0 };
}

/** Fade a sounding tone out over `FADE_SECONDS` from now and stop it. */
function fadeOut(ctx: AudioContextLike, tone: Tone): void {
	const now = ctx.currentTime;
	const { gain } = tone.gain;
	gain.cancelScheduledValues(now);
	gain.setValueAtTime(gain.value, now);
	gain.linearRampToValueAtTime(0, now + FADE_SECONDS);
	tone.osc.stop(now + FADE_SECONDS);
}

export function createTonePlayer(audio: Audio): TonePlayer {
	let current: Tone | null = null;

	function stop(): void {
		const tone = current;
		current = null;
		const ctx = audio.context();
		if (!tone || !ctx) return;
		try {
			fadeOut(ctx, tone);
		} catch {
			// A tone that cannot be faded just ends where it was scheduled to.
		}
	}

	function play(pitch: Pitch, seconds: number): void {
		const ctx = audio.context();
		if (!ctx) return;
		// A locked context gets nothing until a gesture asks it to resume.
		if (ctx.state !== "running" && !audio.unlockRequested) return;
		stop();
		try {
			const tone = startTone(ctx, pitch, ctx.currentTime, seconds);
			tone.osc.onended = () => {
				if (current === tone) current = null;
			};
			current = tone;
		} catch {
			current = null;
		}
	}

	return { play, stop, unlock: () => audio.unlock() };
}

/**
 * Schedules many tones on the audio clock for a song. It keeps no current
 * tone, so tones overlap where a slur meets the next note, and it shares the
 * context but none of the tone player's state.
 */
export function createToneScheduler(audio: Audio): ToneScheduler {
	const pending = new Set<Tone>();

	function schedule(pitch: Pitch, atSeconds: number, seconds: number): void {
		const ctx = audio.context();
		if (!ctx) return;
		// A locked context gets nothing until a gesture asks it to resume.
		if (ctx.state !== "running" && !audio.unlockRequested) return;
		try {
			const tone = startTone(ctx, pitch, atSeconds, seconds);
			tone.osc.onended = () => {
				pending.delete(tone);
			};
			pending.add(tone);
		} catch {
			// A tone that cannot be scheduled is left out.
		}
	}

	function stop(): void {
		const tones = [...pending];
		pending.clear();
		const ctx = audio.context();
		if (!ctx) return;
		for (const tone of tones) {
			try {
				if (tone.start > ctx.currentTime) tone.osc.stop(ctx.currentTime);
				else fadeOut(ctx, tone);
			} catch {
				// A tone that cannot be stopped just ends where it was scheduled to.
			}
		}
	}

	return { schedule, stop };
}
