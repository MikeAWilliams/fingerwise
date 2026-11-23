# F10-S02: Every line drawn

- **Feature:** `../design.md`
- **Modules:** `src/render/staff`, `src/app`, `docs/architecture/`
- **Depends on:** none

## Story

As a player following a song in time, I want the whole song drawn as sheet music, one line under another, with every line's lane kept as I play, so that I can read ahead and see afterwards how each line went.

## Acceptance criteria

Each item must be checkable and numbered so progress checklists can refer to it. Do not edit these once work starts; raise a change instead.
- **AC1:** Given keep tempo applies, then every line of the song is drawn at once, one under another, each with its clef and key signature and a lane under it. The count-in bar starts the first line, at the top. **Bars per line** still sets the bars on a line.
- **AC2:** Given a song is playing, then no row is reused or redrawn when play moves to the next line, and there is no arrow pointing up to the next line. The staff is drawn once per song and redrawn only when what it shows changes (the song, bars per line, the instrument's range).
- **AC3:** Given the drawn layout, then it has one row per line of the song, each with its vertical position, so the app can find where any line sits.
- **AC4:** Given play reaches a line break, then the playhead moves to the start of the next row; on the last row it waits at the end as in F09.
- **AC5:** Given play has moved past a row, then that row keeps its fill and fault marks. When the summary shows, every row shows its fill and marks.
- **AC6:** Given a song is playing, then each animation frame updates only the current row and, just after a line break, the row before it until its open fill settles. Rows that are finished or not yet reached are not touched each frame.
- **AC7:** Given the song starts again, then every row's lane is cleared to its neutral segments.
- **AC8:** Given the window is resized or the phone rotated during a song, then the song carries on and every row keeps its lane, fill and marks.
- **AC9:** Given judging is off, then every row's lane is neutral and never fills, as in F09.
- **AC10:** Given the note to play, then it is black and every other note, rest and tie is grey on every row, as before.
- **AC11:** Given phone and desktop widths (360x640, 640x360, 768x1024, 1024x768), then the lines stack with no overlap and no sideways scroll, and the card grows with the song instead of keeping a fixed two-row height.
- **AC12:** Given random cards and untimed song cards, then nothing changes.
- **AC13:** Given the change, then `make verify` passes, and the `staff` and `app` module docs describe the whole-song layout and the per-frame rows, with F08's two-row scheme removed from them.

## Notes

- The page still scrolls by hand in this story; following the song is F10-S04 and the lock is F10-S05. The prompt, readout, summary and legend stay where they are until F10-S03.
- A tie or slur over a line break still has a segment on each row (F09).
- The choice of rows to update each frame is [decided in the design](../design.md#risks-and-open-questions).

## Test approach

Unit tests for the layout's rows (count, order, positions) from a several-line song, for the playhead's row at a line break, and for which rows a frame updates (current only, and the row before it just after a break). Checked by hand with `make dev` at the widths above on a tune of at least six lines, with judging on and off, and with a rotation mid-song; also a 100-bar tune for drawing time and smoothness.
