// Only the fields the adapter reads from abcjs's tune object. The package
// types describe its root entry, not this deep import (ADR 0006).
declare module "abcjs/src/api/abc_tunebook.js" {
	export interface AbcPitch {
		name: string;
	}

	export interface AbcElement {
		el_type: string;
		startChar?: number;
		pitches?: AbcPitch[];
		rest?: unknown;
		gracenotes?: unknown[];
		decoration?: string[];
		/**
		 * A note's or rest's written length in whole notes; for `el_type: "tempo"`,
		 * the beat length as parts to add up.
		 */
		duration?: number | number[];
		bpm?: number;
		/** On a triplet's first note: the factor its written lengths are played at. */
		tripletMultiplier?: number;
		/** On a triplet's last note. */
		endTriplet?: boolean;
	}

	export interface AbcStaff {
		voices: AbcElement[][];
	}

	export interface AbcLine {
		staff?: AbcStaff[];
	}

	export interface AbcNoteEvent {
		cmd: string;
		pitch?: number;
		style?: string;
		startChar?: number;
		/** Whole-note units from the start of the tune: an eighth is 0.125. */
		start?: number;
		duration?: number;
	}

	export interface AbcMeter {
		type: string;
		value?: { num: string; den: string }[];
	}

	export interface AbcTune {
		warnings?: string[];
		lines: AbcLine[];
		metaText: { tempo?: { duration?: number[]; bpm?: number } };
		getMeter(): AbcMeter;
		setUpAudio(options: object): { tracks: AbcNoteEvent[][] };
	}

	export interface AbcTunebook {
		parseOnly(text: string): AbcTune[];
	}

	const tunebook: AbcTunebook & { default?: AbcTunebook };
	export default tunebook;
}
