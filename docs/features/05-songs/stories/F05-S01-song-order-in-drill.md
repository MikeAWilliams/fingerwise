# F05-S01: Song type and song order in the drill

- **Feature:** `../design.md`
- **Modules:** `src/core/song`, `src/core/drill`, `docs/architecture/`
- **Depends on:** none

## Story

As the drill, I want a song to be an ordered list of pitches and a way to take the next one, so that cards can follow a tune without the drill knowing where it came from.

## Acceptance criteria

Each item must be checkable and numbered so progress checklists can refer to it. Do not edit these once work starts; raise a change instead.
- **AC1:** Given a list of pitches, then `createSong` returns a song that holds them in order; given an empty list it throws a `SongError`.
- **AC2:** Given a song and an instrument, then `songOutOfRange` returns every pitch with its index that lies outside the instrument's written range, in song order, and nothing for a song that fits.
- **AC3:** Given a song's pitches as a plain list and the index of the previous card (or none), then the drill's next-in-order function returns the first pitch for none, the following pitch otherwise, and the first pitch again after the last.
- **AC4:** Given a song with repeated adjacent pitches, then each is returned in turn (the repeat is not skipped).
- **AC5:** Given a one-note song, then every call returns that note.
- **AC6:** Given the change, then `make verify` passes, `src/core/song` imports only `../pitch` and `../instrument`, `src/core/drill` still imports exactly `../pitch` and `../instrument` (not `../song`), neither uses a browser API or `Math.random`, the drill-layers test still passes, and `modules/drill.md` and a new `modules/song.md` document it.

## Notes

- The song knows nothing of ABC, clef, staff, audio or UI.
- The function works on an index so the card flow can keep its own position; the position is not saved.
- The drill's function takes `readonly Pitch[]`, not a `Song`; the card flow passes the song's pitches. This keeps the drill's imports unchanged.

## Test approach

Unit tests for the order, the loop, repeats, the one-note song, an empty song and the range check against the alto C.
