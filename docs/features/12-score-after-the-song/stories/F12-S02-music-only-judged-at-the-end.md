# F12-S02: Music only, judged at the end

- **Feature:** `../design.md`
- **Modules:** `src/app` (`timed-flow.ts`, `SongOverlay.tsx`, `Card.tsx`, text), `docs/architecture/`
- **Depends on:** F12-S01

## Story

As a player, I want to play a timed song from the music alone, with no playhead or filling lanes, and see the whole result when the song ends, so that I can practise playing it straight through like a performance.

## Acceptance criteria

Each item must be checkable and numbered so progress checklists can refer to it. Do not edit these once work starts; raise a change instead.
- **AC1:** Given scoring after the song applies, when the song is started, then the count-in, the metronome (when on), the music, the black current note and the page following the song work as with live feedback.
- **AC2:** Given the same, while counting in and playing, then there is no playhead, no lane (not even empty ones), no trace, no fault marks and no live readout. The legend is not shown.
- **AC3:** Given the same, while playing, then the pinned bar shows one quiet line, "Scoring after the song".
- **AC4:** Given the same, then the microphone is read and placed in song time exactly as with live feedback (same scoring lag, same coverage options), and nothing but the readings and level blocks is kept, in memory, for the run. No audio is kept and nothing is stored.
- **AC5:** Given the run ends (in this story, one lag after the last slot as now; F12-S03 changes when), then every line's lane, trace and fault marks appear at once, with the summary and tuning list, and the F11 analysis when F11 is built.
- **AC6:** Given the same readings, then the result, segments and faults are identical to those a live feedback run would give.
- **AC7:** Given the summary, then as now: the view stays on the last line, scrolling unlocks, and a tap starts again with everything cleared and the lanes hidden again.
- **AC8:** Given the song is stopped before the end (Settings, judging off, the page hidden), then the readings are dropped and nothing is judged or drawn; showing the drill again shows the start prompt.
- **AC9:** Given nothing graded or the microphone unavailable, then the end is as with live feedback ("End of song" or the F09 behaviour), with no lanes drawn.
- **AC10:** Given scoring live feedback, then nothing changes.
- **AC11:** Given the change, then `make verify` passes, and the `app` module doc describes the mode.

## Notes

- Feeding the coverage run during play without drawing, or keeping the readings and feeding it at the end, are both fine if AC6 holds; choose in the breakdown.
- The row drawing at the end reuses the settled-fill drawing from F10 (each row's settled paths written once).

## Test approach

Timed-flow tests on a fake audio clock: no progress reported to the overlay during play in after-the-song mode, the same result as live for the same delayed readings, a stop dropping the readings, restart. Overlay tests for hidden lanes during play and all rows at the end. By hand with `make dev` and an ocarina: a full run in each mode, the metronome on and off, a stop mid-song.
