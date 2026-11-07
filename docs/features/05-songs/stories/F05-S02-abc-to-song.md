# F05-S02: ABC to song

- **Feature:** `../design.md`
- **Modules:** the ABC adapter (outside `src/core`), `package.json`, `docs/architecture/`
- **Depends on:** F05-S01

## Story

As the settings, I want ABC text turned into a song or a clear list of problems, so that a pasted tune can be checked and used.

## Acceptance criteria

Each item must be checkable and numbered so progress checklists can refer to it. Do not edit these once work starts; raise a change instead.
- **AC1:** Given the adapter, then it runs under the Vitest setup (Node, no DOM), reads pitches from abcjs's audio sequence (`parseOnly`, then `setUpAudio`) as [ADR 0006](../../../architecture/decisions/0006-abcjs-for-songs.md) records, and abcjs, pinned to an exact version, is the only new dependency.
- **AC2:** Given ABC with a key signature and notes in several octaves (`C` is C4, `c` is C5, `C,` is C3), then the song holds the right written pitches.
- **AC3:** Given a key signature with sharps or flats, and an accidental in a bar, then later notes of that pitch in the same bar carry it and the next bar goes back to the key signature. A natural sign cancels. Tested with at least three tunes written out by hand.
- **AC4:** Given flats (in the key or marked), then they become the equivalent sharps (B♭ is A♯), E♯ and B♯ become F and C, double sharps and flats become their plain note, and the result reports how many notes were converted (a note whose sharp spelling has a different letter from the written note).
- **AC5:** Given repeat signs and first and second endings, then the song plays them out as written.
- **AC6:** Given rests, slurs, decorations, chord symbols, lyrics, dynamics and triplets, then the pitches are unchanged and no error is reported. Given a tie, including one across a bar line, then the tied notes are one note in the song. Note lengths and meter are read and not kept.
- **AC7:** Given a chord, a second voice, a grace note, more than one tune, no notes, a D.C., D.S., Fine, coda or segno mark, or text over the limits (about 500 notes, 10,000 characters), then the result is a list of problems and no song. Each problem has a plain message and the line and note number (or character) it is about.
- **AC8:** Given a song with notes outside the instrument's written range, then the result lists each offender with its pitch, position and which side of the range it is on.
- **AC9:** Given text abcjs warns about (for example plain prose, which abcjs reads leniently as notes), or that makes it throw, then the result is a problem with the warning's line and column in plain text (no markup), never an exception or a song.
- **AC10:** Given the change, then abcjs is imported only from `abcjs/src/api/abc_tunebook.js` (ADR 0006), and only by a dynamic import, so it is a separate chunk without the renderer, synth or editor that is not loaded at start-up unless a song is in use. The chunk is still in the service worker's precache.
- **AC11:** Given the change, then the abcjs chunk size and the precache growth are measured in the app build and reported to the user, alongside the spike's figures (about 211 kB minified, 61 kB gzip). `make verify` passes, and a module doc describes the adapter and the supported subset.

## Notes

- `src/core` may not import a library ([CLAUDE.md](../../../../CLAUDE.md#rules)); the adapter lives elsewhere and returns the `Song` type from S01.
- Pitches stay in written pitch. No transposition is applied at import ([ADR 0003](../../../architecture/decisions/0003-written-pitch-and-transposition.md)).
- The [spike](../../../research/abcjs-parsing-spike.md) settled what abcjs does by itself and what the adapter must catch from the parse tree (chords, grace notes and voices are flattened in the sequence; D.C. and D.S. are not played out; prose parses with warnings). The user agreed to abcjs on 2026-11-07.
- The deep import has no types; the adapter declares the few fields it reads.
- Because of the dynamic import, the adapter's entry point is async.

## Test approach

Unit tests with ABC strings: each rule above, plus a hand-written tune per key family, a mode (`K:Ddor`), malformed text, plain prose, and the limits.
