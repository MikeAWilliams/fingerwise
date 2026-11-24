# F15-S03: Lane shows the release

- **Feature:** `../design.md`
- **Modules:** `src/app` (`lane.ts`, `marks.ts`, `SongOverlay.tsx`), `docs/architecture/`
- **Depends on:** F15-S01

## Story

As a player, I want the lane to show how long each note is expected to sound, so that I can see the room I have to tongue or breathe before the next note.

## Acceptance criteria

Each item must be checkable and numbered so progress checklists can refer to it. Do not edit these once work starts; raise a change instead.
- **AC1:** Given a timed song, then each note with a release has its lane segment from its start to where its release starts, so it is shorter than its written length. Nothing neutral is drawn in the release. This holds for graded notes (neutral grey) and ungraded ones (the lighter style).
- **AC2:** Given a note slurred into the next note, then its segment runs its full written length, as today. Rest segments are unchanged.
- **AC3:** Given a note across a line break, then the part after its release start is drawn on no row. A row that would hold only release gets no segment for that note.
- **AC4:** Given sound in a note's release, then its pitch trace is drawn there as anywhere else in the note.
- **AC5:** Given an "ended early" fault, then its mark sits at the end of the shortened segment. Given an "ended late" fault, then its mark sits at the note's written end. Given a not-separated join, then its mark sits at the written join. Start marks are unchanged.
- **AC6:** Given judging off with keep tempo on, then the lane shows the shortened segments too.
- **AC7:** Given the change, then `make verify` passes, and the `app` module doc describes the lane's segments and the mark positions.

## Notes

- The lane reads each note's release from the timeline (F15-S01 AC3), at the same tempo the timeline was built with.
- A mark whose edge falls on no row still gives no mark, as today.
- The legend is unchanged.

## Test approach

`lane.test.ts`: a plain-join note, a note before a rest, the last note, a slurred note, an ungraded note, a note across a line break with its release on either row. `marks.test.ts`: each end mark and the not-separated mark at its new position. By hand at the closing check: a timed song at a slow and a fast tempo, with live feedback and with scoring after the song.
