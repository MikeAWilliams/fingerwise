# F12-S03: Listening past the end

- **Feature:** `../design.md`
- **Modules:** `src/app` (`timed-flow.ts`, text), `docs/architecture/`
- **Depends on:** F12-S02

## Story

As a player who may fall behind the tempo, I want the app to keep listening until I have finished playing, so that I am not cut off at the last beat and everything I played is there to review.

## Acceptance criteria

Each item must be checkable and numbered so progress checklists can refer to it. Do not edit these once work starts; raise a change instead.
- **AC1:** Given scoring after the song applies, then listening does not end one lag after the last slot. It ends when both hold: the last slot has ended plus the scoring lag, and the readings have been silent, as the coverage core classifies silence (failing the judge's checks), for 1 s of song time.
- **AC2:** Given sound that never stops (room noise, a held note), then listening ends anyway 10 s after the last slot ends, plus the scoring lag.
- **AC3:** Given the player was already silent for 1 s at the last slot's end, then the end comes one lag after the last slot, as now.
- **AC4:** Given the metronome is on, then no click sounds after the song's last beat, during the overrun included.
- **AC5:** Given the last slot has ended and listening goes on, then the pinned bar says "Listening… stop playing to see your score" until the end.
- **AC6:** Given the end, then readings after the last note are passed on with the result for the overrun lane (F12-S04), and the coverage result is the same as it would be without them.
- **AC7:** Given a stop during the overrun (Settings, judging off, the page hidden), then as in F12-S02 AC8 nothing is judged.
- **AC8:** Given scoring live feedback, then the end is unchanged.
- **AC9:** Given the change, then `make verify` passes, and the `app` module doc describes the stop rule and its constants.

## Notes

- The 1 s and 10 s are code constants in one place.
- Silence counts in song time from the readings, so a stalled frame loop cannot end the run early.

## Test approach

Timed-flow tests on a fake audio clock: silent at the end (ends at one lag), playing 2 s past the end then silent (ends 1 s after the sound stops), a short silence under 1 s then more sound (does not end), endless sound (ends at the cap), no clicks after the last beat, the overrun message, a stop during the overrun, live mode unchanged. By hand with `make dev`: play the last note long and hear that nothing is cut.
