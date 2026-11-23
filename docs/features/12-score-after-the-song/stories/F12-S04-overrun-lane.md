# F12-S04: The overrun lane

- **Feature:** `../design.md`
- **Modules:** `src/app` (`SongOverlay.tsx`, `lane.ts`, `trace.ts`, text), possibly `src/render/staff`, `src/core/analysis`, `docs/architecture/`
- **Depends on:** F12-S03; the analysis line needs F11-S03

## Story

As a player who finished after the song's end, I want to see what I played past the end and how far over I went, so that I can tell when I fell behind the tempo.

## Acceptance criteria

Each item must be checkable and numbered so progress checklists can refer to it. Do not edit these once work starts; raise a change instead.
- **AC1:** Given scoring after the song and sounding readings after the last note's end, then a short extra lane, labelled "after the end", is drawn under the last line, starting at the last note's end, on the same time-to-x scale as the last line's lane.
- **AC2:** Given that lane, then each sounding reading (passing the judge's checks) draws a trace at its offset in cents from its nearest note, in the lane's usual colours and band lines, and silence leaves it empty.
- **AC3:** Given an overrun wider than the last line, then the lane is cut at the line's width and says how much more there was, such as "+3.2 s".
- **AC4:** Given no sounding reading after the last note, then no overrun lane is drawn.
- **AC5:** Given an overrun, then the analysis has the line "You played N s past the end" (N to one decimal), measured from the last note's end to the last sounding reading's end, shown next to the tempo drift line. With no overrun, no line.
- **AC6:** Given an overrun, then no coverage, timing, separation or tuning figure changes.
- **AC7:** Given a tap on the start prompt, then the overrun lane and line are removed with the rest.
- **AC8:** Given the page is scrolled to the end, then the overrun lane can be scrolled clear of the pinned bar.
- **AC9:** Given the change, then `make verify` passes, and the `app` (and, if changed, `staff` and `analysis`) module docs describe the overrun lane and line.

## Notes

- The coverage core leaves readings after the last note out of every segment, so the overrun trace is built in the app (or the analysis module) from the readings F12-S03 passes on.

## Test approach

Unit tests for the overrun trace points and the cut at the line width, and for the analysis line (none, short, long). By hand with `make dev`: hold the last note 2 s past the end, play a few extra notes after the end, and check the lane and line; a run with no overrun shows neither.
