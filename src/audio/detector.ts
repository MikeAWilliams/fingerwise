// Hand-written YIN (de Cheveigné and Kawahara 2002), ADR 0005. The only place
// audio samples are analysed; nothing is kept between calls.

export const YIN_THRESHOLD = 0.15;

export interface DetectorRange {
	minHz: number;
	maxHz: number;
}

export interface Detection {
	frequency: number | null;
	clarity: number;
}

const DEFAULT_RANGE: DetectorRange = { minHz: 200, maxHz: 3000 };
const NOTHING: Detection = { frequency: null, clarity: 0 };

/** The pitch of one window of samples; clarity is `1 - d'(τ)` clamped to [0, 1]. Never throws or returns NaN. */
export function detectPitch(
	samples: Float32Array,
	sampleRate: number,
	range: DetectorRange = DEFAULT_RANGE,
): Detection {
	const minLag = Math.max(2, Math.floor(sampleRate / range.maxHz));
	const maxLag = Math.ceil(sampleRate / range.minHz);
	const width = samples.length - maxLag - 1;
	if (width <= 0 || minLag >= maxLag) return NOTHING;

	// Difference function d(τ) for τ in 1..maxLag+1 (one past, for interpolation).
	const diff = new Float64Array(maxLag + 2);
	for (let tau = 1; tau <= maxLag + 1; tau++) {
		let sum = 0;
		for (let j = 0; j < width; j++) {
			const delta = (samples[j] as number) - (samples[j + tau] as number);
			sum += delta * delta;
		}
		diff[tau] = sum;
	}

	// Cumulative mean normalized difference d'(τ).
	const cmnd = new Float64Array(maxLag + 2);
	cmnd[0] = 1;
	let running = 0;
	for (let tau = 1; tau <= maxLag + 1; tau++) {
		running += diff[tau] as number;
		cmnd[tau] = running > 0 ? ((diff[tau] as number) * tau) / running : 1;
	}
	if (running === 0) return NOTHING;

	// First dip under the threshold, followed down to its local minimum;
	// otherwise the lowest value in the range.
	let best = -1;
	for (let tau = minLag; tau <= maxLag; tau++) {
		if ((cmnd[tau] as number) < YIN_THRESHOLD) {
			while (
				tau + 1 <= maxLag &&
				(cmnd[tau + 1] as number) < (cmnd[tau] as number)
			)
				tau++;
			best = tau;
			break;
		}
	}
	if (best < 0) {
		best = minLag;
		for (let tau = minLag + 1; tau <= maxLag; tau++) {
			if ((cmnd[tau] as number) < (cmnd[best] as number)) best = tau;
		}
	}

	const clarity = Math.min(1, Math.max(0, 1 - (cmnd[best] as number)));
	const lag = best + parabolicShift(cmnd, best);
	const frequency = sampleRate / lag;
	return Number.isFinite(frequency) && frequency > 0
		? { frequency, clarity }
		: { frequency: null, clarity: 0 };
}

/** Offset of the parabola's vertex through τ-1, τ, τ+1, in [-0.5, 0.5]. */
function parabolicShift(values: Float64Array, tau: number): number {
	const a = values[tau - 1] as number;
	const b = values[tau] as number;
	const c = values[tau + 1] as number;
	const denom = a - 2 * b + c;
	if (denom <= 0) return 0;
	const shift = (a - c) / (2 * denom);
	return Math.max(-0.5, Math.min(0.5, shift));
}

/** RMS level in dBFS; `-Infinity` for silence or an empty buffer. */
export function rmsDb(samples: Float32Array): number {
	if (samples.length === 0) return Number.NEGATIVE_INFINITY;
	let sum = 0;
	for (const s of samples) sum += s * s;
	const rms = Math.sqrt(sum / samples.length);
	return rms > 0 ? 20 * Math.log10(rms) : Number.NEGATIVE_INFINITY;
}
