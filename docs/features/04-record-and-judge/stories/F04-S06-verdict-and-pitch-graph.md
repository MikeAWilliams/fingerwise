# F04-S06: Verdict, judged note and pitch graph

- **Feature:** `../design.md`
- **Modules:** `src/app`, `src/render` (graph), `docs/architecture/`
- **Depends on:** F04-S05

## Story

As a player, I want the reveal to tell me whether I was right, which note I played and how far off I was, so that I can correct my breath and fingering.

## Acceptance criteria

Each item must be checkable and numbered so progress checklists can refer to it. Do not edit these once work starts; raise a change instead.
- **AC1:** Given a revealed card with a `correct` verdict, then the reveal shows a correct state in a verdict color and an icon with an accessible text label.
- **AC2:** Given an `incorrect` verdict, then it shows an incorrect state in a different color and a different icon with its label; the two states are distinguishable without color.
- **AC3:** Given a `none` verdict, then it shows a neutral "nothing heard" state, and no judged note and no graph.
- **AC4:** Given a verdict with a heard frequency, then the judged note is shown by name and offset in written pitch, for example `C♯5 +23¢` (sounding pitch minus the instrument's transposition, signed cents, nearest note).
- **AC5:** Given a verdict with a heard frequency, then a graph shows a horizontal cents axis spanning two semitones either side of the expected note, with a tick and note name at each semitone, a marker for the expected pitch, a marker for the played pitch, and the signed offset in cents between them.
- **AC6:** Given a played pitch between two semitone ticks (for example midway between C5 and C♯5), then its marker sits between those ticks in proportion to its cents.
- **AC7:** Given a played pitch beyond the axis, then its marker is pinned to the edge with an arrow, and its note name still shows.
- **AC8:** Given a card with judge off, then none of this is shown and the reveal looks as after F03.
- **AC9:** Given revealing a judged card, then the staff does not move, the reveal area keeps its fixed height, and the graph fits at 360 px wide and at tablet sizes without sideways scroll (F02-S02).
- **AC10:** Given the graph and verdict, then they have text alternatives for screen readers and are readable in light and dark color schemes if the app supports both.
- **AC11:** Given the change, then `make verify` passes and the `app` (and `render`, if added) module docs describe what was built.

## Notes

- Layout and positions come from pure functions (cents to x position, ticks, clamping) that are unit tested; the SVG or markup is thin.
- Whether the graph lives in `src/render` or `src/app` is decided in the breakdown; the graph knows only pitch, cents and positions, not the staff or the clef.
- Tolerance may be drawn on the axis as a band around the expected marker; optional, not required.

## Test approach

Unit tests for the geometry (tick positions, midway, clamping, sign of the offset, name and offset formatting). The look, colors, icons and layout are checked by hand in the browser at 360x640, 640x360 and tablet sizes.
