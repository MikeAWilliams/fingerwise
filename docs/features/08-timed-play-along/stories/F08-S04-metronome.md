# F08-S04: Metronome

- **Feature:** `../design.md`
- **Modules:** `src/core/settings`, `src/app`, `data/settings`, `docs/architecture/`
- **Depends on:** F08-S03

## Story

As a player playing a song in time, I want an optional click on every beat, so that I can hold the tempo through long notes and rests.

## Acceptance criteria

Each item must be checkable and numbered so progress checklists can refer to it. Do not edit these once work starts; raise a change instead.
- **AC1:** Given `data/settings/defaults.json`, then `metronome` is `false` and the strict defaults parse requires it. Given stored settings without it or with a non-boolean, then it loads as `false` and every other setting is kept.
- **AC2:** Given the Song section, then a metronome toggle is shown, enabled only while keep tempo is enabled and on; otherwise it is disabled, keeps its value and does nothing.
- **AC3:** Given metronome on and a timed song playing, then the F08-S02 click plays on every beat from the first slot's start until the last slot's end, with the count-in's beat (F08-S01), continuing its grid without a gap or a doubled click.
- **AC4:** Given metronome off, then only the count-in clicks, as in F08-S02.
- **AC5:** Given the summary, a stop or a restart, then no further metronome clicks sound until the next count-in ends.
- **AC6:** Given the change, then `make verify` passes, and the `settings` and `app` module docs and `data-formats.md` describe the metronome.

## Notes

- If the live check shows that clicks in the microphone stop held notes from settling (see the design's Risks), stop and report; this story may be dropped or reworked without affecting S01 to S03.
- A pickup starts after the full count-in bar, so with a pickup the clicks do not fall on the tune's bar lines. That is accepted.

## Test approach

Settings unit tests for the field. Card-flow tests with a fake audio clock: clicks scheduled per beat for 4/4 and 6/8, none with it off, none after the summary or a stop. By hand with an ocarina: grading with the metronome on matches grading with it off on the same tune.
