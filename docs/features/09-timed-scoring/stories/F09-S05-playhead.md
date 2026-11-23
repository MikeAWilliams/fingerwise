# F09-S05: Playhead

- **Feature:** `../design.md`
- **Modules:** `src/app`, `docs/architecture/`
- **Depends on:** F09-S04

## Story

As a player following a song in time, I want a line that moves through the music as it plays, so that I always know where I am.

## Acceptance criteria

Each item must be checkable and numbered so progress checklists can refer to it. Do not edit these once work starts; raise a change instead.
- **AC1:** Given a timed song is playing (judging on or off), then a vertical playhead crosses the current staff row and its lane at the time the player hears: the audio clock less the context's reported `outputLatency` (none when not reported).
- **AC2:** Given the playhead's time, then its x comes from the row's time-to-x map (F09-S04), so it is at each note's x when that note is due.
- **AC3:** Given the count-in, then the playhead runs through the count-in bar's rests in time with the clicks.
- **AC4:** Given the playhead reaches the end of a row, then it jumps to the start of the next line's first note on the other row; rows stay fixed as in F08.
- **AC5:** Given the playhead moves, then it is updated every animation frame outside Preact state, and the staff is not redrawn for it.
- **AC6:** Given the summary shows, or the song stops (Settings, judging toggled, page hidden), then the playhead stops and its frame loop is cancelled. A restart starts it again from the count-in.
- **AC7:** Given the audio clock is unavailable (the page-clock fallback of F08), then the playhead follows that clock.
- **AC8:** Given the playhead, then it is not the only sign of the current place: the shown note is still black.
- **AC9:** Given the change, then `make verify` passes and the `app` module doc describes the playhead.

## Notes

- The playhead is not pulled back by the scoring lag; the fill (F09-S06) trails it.
- Its speed changes visually where notes are spaced widely or closely.

## Test approach

Unit tests for the playhead's time from a fake clock and latency, and its row and x from a hand-built layout, including the count-in and a row jump. By hand with `make dev`: the playhead meets each note as its click sounds at ♩ = 60 and ♩ = 120, jumps rows cleanly, stops at the summary and on Settings, and runs with judging off.
