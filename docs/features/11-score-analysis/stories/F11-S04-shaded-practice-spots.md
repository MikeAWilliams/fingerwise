# F11-S04: Shaded practice spots

- **Feature:** `../design.md`
- **Modules:** `src/render/staff`, `src/app`, `docs/architecture/`
- **Depends on:** F11-S03

## Story

As a player reviewing a song after playing it, I want the practice spots marked on the music itself, so that I can find them while scrolling through the lanes.

## Acceptance criteria

Each item must be checkable and numbered so progress checklists can refer to it. Do not edit these once work starts; raise a change instead.
- **AC1:** Given the analysis has practice spots, then each spot's two bars are shaded behind the staff and its lane, from the first bar's start to the second bar's end, in a colour that does not hide notes, the trace or fault marks.
- **AC2:** Given a spot that crosses a line break, then each row shades its own part.
- **AC3:** Given a shaded spot, then it carries a small label with its bar numbers, such as "Practice: bars 3–4", readable over the staff, and the analysis line for that spot links to it (scrolls to its first row).
- **AC4:** Given no spots, then nothing is shaded.
- **AC5:** Given a tap on the start prompt, then the shading is removed with the lanes.
- **AC6:** Given a resize or rotation after the summary, then the shading stays over the right bars.
- **AC7:** Given the change, then `make verify` passes, and the `staff` and `app` module docs describe the shading.

## Notes

- Bar positions come from the `SongLayout` the staff already returns (bar lines in each row's `stops`).
- The staff is not redrawn to shade: the shading is drawn in the overlay or added to the drawn SVG, decided in the breakdown.

## Test approach

Unit tests for the x-ranges of a bar span from a layout: within one row, across a line break, the last bar. By hand with `make dev` after a run with a deliberately fluffed passage: shading, label, link, restart, resize.
