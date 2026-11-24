# F13-S01: The playback schedule

- **Feature:** `../design.md`
- **Modules:** `src/core/song`, `src/audio`, `docs/architecture/`
- **Depends on:** none

## Story

As a player, I want the app to know when each note of a song starts and stops when played as an ocarina player would tongue it, and to be able to schedule those tones on the audio clock, so that the song can be played back in time.

## Acceptance criteria

Each item must be checkable and numbered so progress checklists can refer to it. Do not edit these once work starts; raise a change instead.
- **AC1:** Given a song and a tempo, when the playback schedule is built, then there is one tone per song note, in order, each with the note's written pitch, a start in ms from the first note's start (its `start` in beats at the tempo) and a length in ms.
- **AC2:** Given a note whose join to the next note is plain (not slurred), then its tone ends a gap before its written end: the join gap constant (50 ms), or less when the note is so short that the gap would take more than a quarter of it.
- **AC3:** Given a note slurred to the next, then its tone lasts its full written length, with no gap.
- **AC4:** Given the last note, then its tone ends the gap before its written end, as at a plain join.
- **AC5:** Given a note followed by a rest, then its tone ends at its written end less the gap, and nothing sounds during the rest.
- **AC6:** Given a song with no `Q:`, then the caller's fallback tempo is used, as with `songSlotsMs`.
- **AC7:** Given the schedule code, then it lives in `src/core/song`, imports only what that module already may, and knows nothing of audio, ABC or the UI.
- **AC8:** Given the audio module, when several tones are scheduled, each at a pitch, a start time on the audio clock and a length, then each plays a sine tone at its start with the F03 fade in and out, and tones may overlap where a slurred note meets the next.
- **AC9:** Given scheduled tones, when they are stopped, then every pending and sounding tone stops at once and nothing more sounds.
- **AC10:** Given the audio module's lock rule, then scheduled tones follow it, and every Web Audio call failing still throws nothing.
- **AC11:** Given the change, then `make verify` passes, and the `song` and `audio` module docs describe the new functions.

## Notes

- The written pitch is turned into the sounding pitch by the caller with the instrument's transposition, as F03 does ([ADR 0003](../../../architecture/decisions/0003-written-pitch-and-transposition.md)).
- Whether scheduling lives in the existing tone player or beside it is for the breakdown; the single-tone `play` and `stop` used by cards must keep working as now.

## Test approach

Unit tests on the schedule: equal quarters, mixed lengths, a slur, a rest, the last note, a very short note, the fallback tempo. Audio tests on the fake context: start and stop times and envelopes of several scheduled tones, overlap at a slur, stop all, the lock rule, failures.
