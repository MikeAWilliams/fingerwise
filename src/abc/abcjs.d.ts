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
	}

	export interface AbcTune {
		warnings?: string[];
		lines: AbcLine[];
		setUpAudio(options: object): { tracks: AbcNoteEvent[][] };
	}

	export interface AbcTunebook {
		parseOnly(text: string): AbcTune[];
	}

	const tunebook: AbcTunebook & { default?: AbcTunebook };
	export default tunebook;
}
