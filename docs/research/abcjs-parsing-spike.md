# Parsing ABC with abcjs (F05 spike)

- **Date:** 2026-11-07
- **Question:** can abcjs turn a pasted tune into written pitches under the Vitest setup (no DOM), what does it get right by itself, and what does it cost in the bundle? See the [F05 design](../features/05-songs/design.md).
- **Outcome:** yes, through `parseOnly` followed by the tune's `setUpAudio()`, from a deep import that leaves the renderer out ([ADR 0006](../architecture/decisions/0006-abcjs-for-songs.md)).
- **Version tried:** abcjs 6.7.2, in a scratch project outside the repo, with Bun, Vitest 5 (`environment: "node"`) and Vite 8.

## Findings

### It runs without a DOM

`parseOnly(text)` and `tune.setUpAudio({})` both run under Vitest in the Node environment (`window` undefined), from the package root and from the deep import below. No browser global is touched and no audio context is needed.

### The parse tree alone is not enough

`parseOnly` returns a tree of staff positions, not pitches:
- Each note has a diatonic staff position and only the accidental written on it.
- The key signature is reported separately and not applied.
- Accidentals are not carried through the bar.
- Repeats and endings are left as bar types (`bar_left_repeat`, `startEnding: "1"`), not played out.

Building pitches from the tree means writing ABC's accidental and repeat rules by hand.

### The audio sequence does the work

`tune.setUpAudio({})` returns tracks of MIDI note events, which abcjs builds for its own playback. Checked by hand:

| Input | Result |
| --- | --- |
| `K:F` then `B` | 70 (B♭4): the key signature is applied |
| `^c c` in one bar | 73, 73: the accidental carries through the bar |
| `=B B` after a `K:F` bar | 71, 71: a natural cancels and carries |
| `^c C c c' \| c` | 73, 60, 73, 84, 72: the accidental applies to that octave only and ends at the bar line |
| `^c4- \| c4 c4` | 73, 72: a tie joins two written notes into one, and the next bar is natural again |
| `\|: c d e f :\|1 g4 :\|2 a4 \|]` | c d e f g c d e f a: repeats and first and second endings are played out |
| `_e ^e ^B` | 75, 77, 72: E♯ and B♯ come out as F and C |
| `^^f __b` | 79, 81: double sharps and flats |
| `K:Ddor`, `K:D exp _b` | modes and explicit key signatures are applied |
| rests, slurs, `!f!`, `~`, `.`, `"Am"`, `w:` lyrics, triplets | ignored; the pitches are unchanged |
| CRLF line endings, trailing blank lines | accepted |

Each event keeps the `startChar` of its note, so a position in the text (line and column, or note number) can be reported for each pitch.

A MIDI number maps straight to the app's pitch spelled in sharps. So "flats become sharps" and "E♯ and B♯ become F and C" need no code. The count of converted notes is found by comparing each event with its note in the parse tree (found by `startChar`): a note is converted when the sharp spelling of its MIDI number has a different letter from the written note (B♭ to A♯, E♯ to F, a double sharp or flat).

### What the sequence hides, and must be caught from the parse tree

| Case | In the sequence | How to detect |
| --- | --- | --- |
| Chord `[CEG]` | three separate notes | a note element with more than one pitch |
| Grace note `{g}A` | an extra note | a note element with `gracenotes` |
| Second voice `V:2` | a second track | more than one staff or voice in the tree, or more than one track |
| Two tunes (`X:1` … `X:2`) | only the first is sequenced | `parseOnly` returns more than one tune |
| `!D.C.!`, `!D.S.!`, `!fine!`, `!coda!`, `!segno!` | **not** played out; the tune is read straight through | the note's `decoration` list |
| Text that is not ABC (`hello world`) | **parsed leniently** into notes (`e`, `d`) | the tune's `warnings` list is not empty |
| Empty text | no tracks | no note events |

abcjs never threw on any input tried. Its warnings are HTML strings carrying a line and column (`Music Line:1:1: …`). The adapter reports them with that position, stripped of markup.

### Bundle size

Measured with Vite 8 production builds of a page that loads abcjs by a dynamic import, calls `parseOnly` and `setUpAudio`:

| Import | Chunk (minified) | Gzip | Contains |
| --- | --- | --- | --- |
| `import("abcjs")` (package root) | 509 kB | 149 kB | everything: parser, SVG renderer, synth, editor |
| `import("abcjs/src/api/abc_tunebook.js")` | 211 kB | 61 kB | the parser, tune object, sequencer and flattener, and some drawing helpers the tune object needs |

For comparison, the app's current main chunk is about 747 kB minified, 399 kB gzip (mostly VexFlow).

- The package has no `exports` map, so the deep path resolves. It is not a documented API, so it may move in any release; hence the exact version pin in [ADR 0006](../architecture/decisions/0006-abcjs-for-songs.md).
- The package's types describe the root only, so the adapter types the deep import itself.

## Not established

- The precache growth of the real app build and the final chunk size. [F05-S02](../features/05-songs/stories/F05-S02-abc-to-song.md) measures and reports both.
- Behavior on very long tunes (the 10,000-character limit) and the time to parse on a phone.
- Unusual ABC: `%%propagate-accidentals` directives, `K:` with clefs, `I:` fields and multi-tune books beyond the two-tune case. The adapter's tests cover what the validator promises; anything else is whatever abcjs does.
