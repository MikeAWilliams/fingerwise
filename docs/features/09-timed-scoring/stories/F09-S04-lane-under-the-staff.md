# F09-S04: Lane under the staff

- **Feature:** `../design.md`
- **Modules:** `src/render/staff`, `src/app`, `docs/architecture/`
- **Depends on:** F09-S01

## Story

As a player following a song in time, I want to see how long each note and rest lasts on a lane under the music, so that I know how long to hold each one.

## Acceptance criteria

Each item must be checkable and numbered so progress checklists can refer to it. Do not edit these once work starts; raise a change instead.
- **AC1:** Given the song lines are drawn, then the staff module also returns their layout: for each row, its vertical extent and the lane's position, and the x of every note, rest and bar line drawn on it, with the song time each stands for. The drawing itself is unchanged apart from the room made for the lane.
- **AC2:** Given the layout, then a time-to-x map for a row is piecewise linear between those positions, so a note's segment starts at its own x and ends where the next note, rest or bar line begins. A line's map starts at its first note, after the clef and key signature.
- **AC3:** Given a timed song is shown (judging on or off), then a lane is drawn under each staff row with one segment per note and per rest, spanning its written length, in a neutral colour. Notes and rests too short to grade have a lighter segment.
- **AC4:** Given a note tied or slurred over a line break, then it has a segment on each row.
- **AC5:** Given the lane, then it is drawn in an overlay over the staff, not by VexFlow, so it can be updated without redrawing the staff; the staff is redrawn only when the rows change.
- **AC6:** Given phone and desktop widths (360x640, 640x360, 768x1024, 1024x768), then the lane sits under its staff with no overlap and no sideways scroll, and the card's height does not jump when the rows change.
- **AC7:** Given random cards and untimed song cards, then nothing changes.
- **AC8:** Given the change, then `make verify` passes, and the `staff` and `app` module docs describe the layout, the map and the lane.

## Notes

- Notes are not spaced by time, so the lane's segments are not proportional to their lengths across a line; within a segment, x is linear in time.
- The count-in bar has no lane segments.

## Test approach

Unit tests for the time-to-x map from a hand-built layout (a note, a rest, a bar line, a line start). The layout is checked by hand with `make dev` at the widths above, with a tune that has a rest, a tie over a bar line and a tie over a line break.
