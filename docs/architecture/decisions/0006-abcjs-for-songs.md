# 0006: abcjs reads songs, through its audio sequence

- **Status:** accepted
- **Date:** 2026-11-07

## Context
Feature 5 lets the player paste one tune in ABC notation and drill its notes in order ([F05 design](../../features/05-songs/design.md)). The user agreed to abcjs on 2026-11-07. A spike checked whether it runs without a DOM, what it gets right by itself and what it costs in the bundle; the findings are in the [research note](../../research/abcjs-parsing-spike.md).

## Decision
- **Dependency:** abcjs, pinned to an **exact** version (6.7.2 when added), as VexFlow is pinned. A version bump is a deliberate change that reruns the adapter's tests.
- **Entry:** a dynamic import of `abcjs/src/api/abc_tunebook.js`, which holds `parseOnly` and the tune object without the SVG renderer, synth and editor. It is a separate chunk, about 211 kB minified and 61 kB gzip (the package root is 509 kB and 149 kB). It is loaded only when the Song section opens or a saved song is in use, and is still in the service worker's precache.
- **Pitches come from the audio sequence:** the adapter calls `parseOnly`, then the tune's `setUpAudio()`, and reads the MIDI note numbers from the single track. abcjs thereby applies the key signature, accidentals carried through the bar (per octave), ties (a tied note is one note), and repeats with first and second endings. A MIDI number maps straight to the app's pitch spelled in sharps.
- **The parse tree is used only to reject and to explain:** chords, grace notes, a second voice, more than one tune, D.C./D.S./Fine/coda/segno marks, any parser warning, and no notes are problems with a position. The tree also supplies each note's written letter, so the validator can count flats converted to sharps.
- **Where:** an ABC adapter outside `src/core` (which may not import a library), returning the `Song` type from `src/core/song` or a list of problems. Its entry point is async because of the dynamic import.

## Alternatives considered
- **Package root import:** the public entry and safe with a caret range, but 2.4 times larger, almost all of it renderer, synth and editor the app does not use.
- **Building pitches from the parse tree:** keeps abcjs to its documented parse output, but means rewriting the key signature, carried accidental and repeat rules, the part the F05 design named as most likely to be wrong. abcjs's sequence already does it, and its own playback depends on it.
- **An own ABC parser for the subset:** no dependency, but ABC's headers, keys, modes, decorations and repeats are much more than the subset of pitches the drill needs.

## Consequences
- The deep path is not a documented API and may move in any release; the exact pin and the adapter's tests guard it. The package's types cover only the root, so the adapter declares the few fields it reads.
- Some drawing helpers come along with the tune object; that is accepted.
- abcjs is lenient (plain text parses into notes with warnings), so the validator must treat every warning as a problem.
- D.C., D.S. and similar marks are rejected, not played out; the player writes the repeat out in the editor.
- [F05-S02](../../features/05-songs/stories/F05-S02-abc-to-song.md) measures the real chunk and precache growth in the app build and reports them; a large difference from the numbers here goes back to the user.
