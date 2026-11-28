# F18-S01: A song change clears the last run

- **Feature:** `../design.md`
- **Modules:** `src/app` (`App.tsx`, the song overlay and lanes), `docs/architecture/`
- **Depends on:** none

## Story

As a player, I want a new tune to start clean, so that feedback from the last song is never mistaken for feedback on this one.

## Acceptance criteria

Each item must be checkable and numbered so progress checklists can refer to it. Do not edit these once work starts; raise a change instead.
- **AC1:** Given Tempo practice with live feedback and a finished run (filled lanes, summary, tuning list, analysis, practice spot shading), when another tune is chosen in the header list, then the new tune shows with empty lanes, no summary, tuning list, analysis or shading, and the start prompt.
- **AC2:** Given Tempo practice with scoring after the song and a finished run (scored lanes and an overrun lane), when another tune is chosen, then none of them show and the start prompt does.
- **AC3:** Given Single note practice part way through a tune (a message, a trace or a fingering showing), when another tune is chosen, then none of them show and the new tune's first note is current.
- **AC4:** Given any of the states in AC1 to AC3, when the song text is changed in Settings (typed or loaded from a file) and Settings is closed, then the same holds.
- **AC5:** Given a finished run, when the same tune is chosen again (no change), then nothing is cleared.
- **AC6:** Given the change, then `make verify` passes, a test reproduces each leftover found before its fix, and the `app` module doc says what a song change clears.

## Notes

- The [app doc](../../../architecture/modules/app.md) already says a finished run's state goes with the old flow when the tune changes. What survives is drawn from outside that state. Find it before fixing it.
- F18-S02 relies on this: choosing a tempo clears the same things.

## Test approach

App tests for each leftover found, written to fail first. By hand with `make dev`: a tune book of two tunes, a run of the first in each practice and scoring, then choose the second; and the same after editing the text in Settings.
