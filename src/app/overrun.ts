/**
 * Watches the readings of a timed song for silence, in song time (F12-S03).
 * A reading covers the time until the next one, as in coverage, so the silence
 * runs from the first non-sounding reading after the last sounding one to the
 * newest reading.
 */
export interface SilenceWatch {
	/** A reading at `timeMs` of song time, and whether it was sounding (passed the judge's checks). */
	push(timeMs: number, sounding: boolean): void;
	/** Song time silent so far: 0 with no readings or while the newest one sounds; from the first reading when nothing has sounded. */
	silentMs(): number;
}

export function createSilenceWatch(): SilenceWatch {
	let silentSince: number | null = null;
	let newest: number | null = null;
	return {
		push(timeMs, sounding) {
			newest = timeMs;
			if (sounding) silentSince = null;
			else if (silentSince === null) silentSince = timeMs;
		},
		silentMs() {
			if (silentSince === null || newest === null) return 0;
			return Math.max(0, newest - silentSince);
		},
	};
}
