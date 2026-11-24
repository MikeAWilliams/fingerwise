# song

`src/core/song/index.ts`

## Purpose

A tune as an ordered list of notes (pitch, start and length in beats), with its tempo and meter, the pure timing maths on them, and a check that it fits an instrument. It knows nothing of ABC, clef, staff, audio or UI; where the pitches come from is the caller's business (see [abc](abc.md) once built). Built in [F05-S01](../../features/05-songs/stories/F05-S01-song-order-in-drill.md); rhythm added in [F08-S01](../../features/08-timed-play-along/stories/F08-S01-song-rhythm-from-abc.md) as [ADR 0008](../decisions/0008-songs-keep-rhythm.md) records.

## Public interface

- `class SongError extends Error`: thrown for an empty song or a bad number (below).
- `interface SongNote { pitch; start; beats; slurred? }`: `start` and `beats` are in quarter-note beats, `start` counted from the first note's start. `slurred` means slurred to the next played note; `createSong` stores it as a boolean (a missing one is false). `playbackSchedule` reads it.
- `interface Meter { beats; unit }`: the top and bottom numbers.
- `interface Song { notes; pitches; tempo; meter; firstBar; title? }`: `title` is the tune's display text, never read by the core; `firstBar` is the beats from the first note to the first bar line, shorter than a bar for a pickup and a whole bar otherwise; `pitches` is derived from `notes` for code that ignores rhythm (the card flow's `songSource`, `songOutOfRange`); `tempo` is quarter notes per minute, or `null` when the tune gives none.
- `DEFAULT_TEMPO = 90` and `DEFAULT_METER = { beats: 4, unit: 4 }`: what a tune without `Q:` or `M:` is played with. The song itself keeps `tempo: null`; callers pass the default.
- `createSong(notes, { tempo, meter, firstBar?, title? }): Song`: holds copies; `title` is stored only when given; `firstBar` defaults to a whole bar and `slurred` to false. Throws `SongError` for an empty list, a tempo that is not finite and positive (when not null), a note length, meter number or first bar that is not finite and positive, or starts that decrease.
- `barBeats(meter): number`: quarter-note beats in one bar (4/4 is 4, 6/8 is 3).
- `songBars(song): Bar[]`: the song cut at its bar lines, for the timed song's staff. `Bar { start; items }`, each item a `{ kind: "note", index, pitch, beats, tied }` piece or a `{ kind: "rest", beats }`. The first bar is `firstBar` long, the rest a whole bar; the gap between one note's end and the next note's start becomes a rest; a note over a bar line is split into pieces, each but the last `tied`; the last bar ends with the last note. Times within 0.001 beat count as equal, since abcjs rounds its starts.
- `songLines(song, barsPerLine): Bar[][]`: `songBars` grouped into lines; the last line may be shorter.
- `songSlotsMs(song, fallbackTempo): number[]`: each note's slot in ms, from its start to the next note's start (so a rest's time goes to the note before it); the last note's slot is its own length. Uses `song.tempo ?? fallbackTempo`. Not rounded.
- The scoring constants, in one block to tune in the live check ([ADR 0011](../decisions/0011-release-allowance.md)): `EDGE_GRACE_MS = 40` (moved here from [coverage](coverage.md), which re-exports it, so the grace and the release floor are one number and `song` imports nothing from `coverage`), `RELEASE_SHARE = 0.25` and `RELEASE_CAP_QUARTERS = 0.5`.
- `noteReleasesMs(song, tempo): number[]` (F15-S01): each note's release in ms, the time at the end of its written length it may spend silent. 0 for a note that is *joined* (`slurred`, not the last, and the next note starts at its written end within the beat epsilon, the same private `joinedToNext` test `playbackSchedule` uses); otherwise `max(EDGE_GRACE_MS, min(RELEASE_SHARE × written, RELEASE_CAP_QUARTERS × 60000 / tempo))`. A note before a rest, the last note and a plain join all have one; a tied note is one long note. `tempo` is explicit, so callers pass the tempo the timeline uses. Not rounded.
- `JOIN_GAP_MS` (50) and `interface PlaybackTone { pitch; startMs; lengthMs; endMs }`; `playbackSchedule(song, fallbackTempo): PlaybackTone[]` (F13-S01): one tone per note, in order, with the written pitch and `startMs` from the first note's start; `endMs` is the note's written end. A note is *joined* when it is `slurred`, not the last, and the next note starts at its written end (within the beat epsilon): it sounds its full written length. Every other note (a plain join, the last note, a note before a rest even when slurred) ends `min(JOIN_GAP_MS, written / 4)` ms before its written end. Uses `song.tempo ?? fallbackTempo`. Not rounded.
- `countIn(meter, tempo): { beats, beatMs }`: 6/8, 9/8 and 12/8 give 2, 3 or 4 dotted-quarter beats (1.5 quarter notes each); every other meter gives its top number of beats of its bottom note value (3/4 is three quarters, 2/2 two halves, 3/8 three eighths). `countInBeats(meter): { beats, quarters }` gives the same beats and each one's length in quarter notes, without a tempo.
- `songOutOfRange(song, instrument): { index, pitch, side }[]`: every pitch outside the instrument's written range, in song order, with its index and `side` `"below"` or `"above"`. Empty for a song that fits.

## Dependencies

`src/core/pitch` and `src/core/instrument` only. The [drill](drill.md) does not import it; the card flow passes `song.pitches` to the drill's `nextInOrder`.

## Tests

- `tests/core/song.test.ts`: `noteReleasesMs` (the design's table at ♩ = 60, 75, 100, 140 and 180 from a sixteenth to a whole note, the named figures, a slurred note, a slurred note before a rest, a plain join, the last note, a tied length, the constants); order kept, starts, lengths, tempo and meter kept, the list copied, empty and bad numbers throw `SongError`; `songSlotsMs` (equal quarters, mixed lengths, a rest, the last note, the fallback tempo) and `countIn` (4/4, 3/4, 2/2, 6/8, 9/8, 12/8, 3/8 at 90 and 120); `playbackSchedule` (equal quarters, mixed lengths, a slur and the note after it, a rest after a slurred note, the last note slurred by flag, a sixteenth at 160, the fallback tempo); `barBeats`, the first bar's default and check, `songBars` (whole bars, a rest, a tie over a bar line, a pickup) and `songLines`; the range check against the alto C (below, above, both, nothing, order and indexes); the source imports exactly `../pitch` and `../instrument` and contains no `Math.random`.
- `tests/core/core-imports.test.ts`: covers this folder too (relative imports, no browser globals).
