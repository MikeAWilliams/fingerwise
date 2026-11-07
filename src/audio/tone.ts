import { type Pitch, toFrequency } from "../core/pitch";
import type { Audio, GainLike, OscillatorLike } from "./context";

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

interface Tone {
	osc: OscillatorLike;
	gain: GainLike;
}

export function createTonePlayer(audio: Audio): TonePlayer {
	let current: Tone | null = null;

	function stop(): void {
		const tone = current;
		current = null;
		const ctx = audio.context();
		if (!tone || !ctx) return;
		try {
			const now = ctx.currentTime;
			const { gain } = tone.gain;
			gain.cancelScheduledValues(now);
			gain.setValueAtTime(gain.value, now);
			gain.linearRampToValueAtTime(0, now + FADE_SECONDS);
			tone.osc.stop(now + FADE_SECONDS);
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
			const osc = ctx.createOscillator();
			const gainNode = ctx.createGain();
			osc.type = "sine";
			osc.frequency.value = toFrequency(pitch);
			osc.connect(gainNode);
			gainNode.connect(ctx.destination);
			const t0 = ctx.currentTime;
			const fade = Math.min(FADE_SECONDS, seconds / 2);
			const { gain } = gainNode;
			gain.setValueAtTime(0, t0);
			gain.linearRampToValueAtTime(PEAK_GAIN, t0 + fade);
			gain.setValueAtTime(PEAK_GAIN, t0 + seconds - fade);
			gain.linearRampToValueAtTime(0, t0 + seconds);
			const tone: Tone = { osc, gain: gainNode };
			osc.onended = () => {
				if (current === tone) current = null;
			};
			osc.start(t0);
			osc.stop(t0 + seconds);
			current = tone;
		} catch {
			current = null;
		}
	}

	return { play, stop, unlock: () => audio.unlock() };
}
