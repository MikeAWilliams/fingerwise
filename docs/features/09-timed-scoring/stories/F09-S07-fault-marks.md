# F09-S07: Fault marks

- **Feature:** `../design.md`
- **Modules:** `src/app`, `docs/architecture/`
- **Depends on:** F09-S06

## Story

As a player playing a song in time with judging on, I want to see where I came in late or early, cut a note short, held it over, or failed to separate two notes, so that I know what to fix in my timing and tonguing.

## Acceptance criteria

Each item must be checkable and numbered so progress checklists can refer to it. Do not edit these once work starts; raise a change instead.
- **AC1:** Given the coverage core reports a timing fault on a note, then a mark is drawn at that edge of the note's lane segment once the fill reaches it: one mark for started late, started early, ended early or ended late.
- **AC2:** Given the four timing marks, then each is told apart by shape and position (which edge, and a pointer showing early or late), not by colour alone.
- **AC3:** Given a plain join reported as not separated, then a distinct mark is drawn at the join, including between two notes of the same pitch. Slurred joins never get it.
- **AC4:** Given a note with no right-note time, then it has no timing marks.
- **AC5:** Given marks, then they appear live as the fill reaches them, and go with their row when it is replaced.
- **AC6:** Given phone width (360x640), then marks stay legible and do not cover the trace's centre line.
- **AC7:** Given the change, then `make verify` passes and the `app` module doc describes the marks.

## Notes

- A late change from one note to the next marks both the end of one and the start of the next; that is accepted ([design](../design.md#timing)).

## Test approach

Unit tests for which marks a set of reported faults produces and where. By hand with an ocarina: come in late, cut a note short, hold one into the next, and play two same-pitch notes without tonguing; check each mark and its legibility at phone width.
