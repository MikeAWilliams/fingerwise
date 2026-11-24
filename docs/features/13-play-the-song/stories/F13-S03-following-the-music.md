# F13-S03: Following the music

- **Feature:** `../design.md`
- **Modules:** `src/app` (`Card.tsx`, `SongOverlay.tsx`, `playhead.ts`, `follow.ts`, `scroll-lock.ts`, text), `docs/architecture/`
- **Depends on:** F13-S02

## Story

As a player, I want to see the music follow along while the song plays, with the sounding note marked and a playhead moving through it, so that I can connect what I hear to what is written.

## Acceptance criteria

Each item must be checkable and numbered so progress checklists can refer to it. Do not edit these once work starts; raise a change instead.
- **AC1:** Given playback, with keep tempo on or off, then the screen shows the tune's lines of music as in a timed run (F10), even in untimed song practice.
- **AC2:** Given playback, then the note whose tone is sounding is black and every other note, rest and tie grey; during the count-in the first note is black.
- **AC3:** Given playback, then a playhead moves through the music in time with the sound, placed as in a live-feedback run.
- **AC4:** Given playback, then there are no lanes, traces, fault marks, live readout or legend.
- **AC5:** Given playback, then the page follows the song line by line and scrolling is locked, as in a timed run.
- **AC6:** Given playback, then the pinned bar shows one quiet line, "Playing the song".
- **AC7:** Given playback ends or is stopped, then the screen returns as in F13-S02 AC5: the start prompt on the first line with keep tempo on, or the first song card with keep tempo off, and scrolling unlocks.
- **AC8:** Given the change, then `make verify` passes, and the `app` module doc describes the playback view.

## Notes

- The playhead and following already exist for timed runs; this story drives them from the playback flow, in either mode.

## Test approach

Unit tests for the sounding note and playhead place on a fake clock, and for the scroll lock during playback. By hand with `make dev`: play a tune of several lines with keep tempo on and off, and check the black note and playhead stay with the sound.
