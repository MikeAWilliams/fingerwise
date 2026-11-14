# song

`src/core/song/index.ts`

## Purpose

A tune as an ordered list of pitches, and a check that it fits an instrument. It knows nothing of ABC, clef, staff, audio or UI; where the pitches come from is the caller's business (see [abc](abc.md) once built). Built in [F05-S01](../../features/05-songs/stories/F05-S01-song-order-in-drill.md).

## Public interface

- `class SongError extends Error`: thrown for an empty song.
- `interface Song { readonly pitches: readonly Pitch[] }`.
- `createSong(pitches): Song`: holds a copy of the list, in order. Throws `SongError` when it is empty.
- `songOutOfRange(song, instrument): { index, pitch, side }[]`: every pitch outside the instrument's written range, in song order, with its index and `side` `"below"` or `"above"`. Empty for a song that fits.

## Dependencies

`src/core/pitch` and `src/core/instrument` only. The [drill](drill.md) does not import it; the card flow passes `song.pitches` to the drill's `nextInOrder`.

## Tests

- `tests/core/song.test.ts`: order kept, the list copied, empty throws `SongError`; the range check against the alto C (below, above, both, nothing, order and indexes); the source imports exactly `../pitch` and `../instrument` and contains no `Math.random`.
- `tests/core/core-imports.test.ts`: covers this folder too (relative imports, no browser globals).
