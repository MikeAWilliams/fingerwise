# F15-S04: Playback stops at the release

- **Feature:** `../design.md`
- **Modules:** `src/core/song`, `docs/architecture/`
- **Depends on:** F15-S01

## Story

As a player, I want Play song to stop each note where the lane's expected time ends, so that I hear how the app expects me to tongue and breathe.

## Acceptance criteria

Each item must be checkable and numbered so progress checklists can refer to it. Do not edit these once work starts; raise a change instead.
- **AC1:** Given a song played back, then each tone that is not slurred into a note starting at its written end sounds for its written length less its release. At ♩ = 75 a quarter note sounds 600 ms and a half note 1200 ms.
- **AC2:** Given a note slurred into a note that starts at its written end, then its tone sounds its full written length. A tied note is one tone over its whole tied length.
- **AC3:** Given a note before a rest, or the last note, then its tone also stops where its release starts.
- **AC4:** Given the change, then no other join gap applies: the fixed `JOIN_GAP_MS` is gone.
- **AC5:** Given any note, then its tone ends where its lane segment ends (F15-S03), because both use the same release.
- **AC6:** Given the change, then `make verify` passes, and the `song` module doc describes the playback schedule with the release.

## Notes

- This replaces F13's join rule of a [50 ms gap, less for a very short note](../../13-play-the-song/design.md#behavior) (decided 2026-11-24).
- The floor of the release is 40 ms, so a very short note's tone is cut by 40 ms. For the shortest graded note (130 ms) the tone is 90 ms.
- The playhead, count-in, metronome and sounding-note colour are unchanged.

## Test approach

Song tests for `playbackSchedule`: quarters, halves and wholes at ♩ = 75 and a fast tempo, a slurred join, a slur before a rest, a tie, a note before a rest, the last note, a very short note. By hand at the closing check: Play song on the example song, listening for the longer breaths on the half notes.
