# F15-S02: Analysis uses the release

- **Feature:** `../design.md`
- **Modules:** `src/core/analysis`, `docs/architecture/`
- **Depends on:** F15-S01

## Story

As a player, I want "Where the note time went" to count my note time the way the score does, so that the table and the score agree.

## Acceptance criteria

Each item must be checkable and numbered so progress checklists can refer to it. Do not edit these once work starts; raise a change instead.
- **AC1:** Given a graded note with a release, then its time in the breakdown is its scored span (from its start less the edge grace to where its release starts), plus the time in its release where a right or confirmed wrong note sounds. Silence in the release is not in the breakdown.
- **AC2:** Given a graded note played on the right note until its release starts, then silent to its end, then it adds nothing to "silent after the note stopped", and all its breakdown time is on the right note.
- **AC3:** Given right-note sound in a note's release, then that time is in tune or out of tune by its readings. Given a confirmed wrong note there, then that time is wrong note.
- **AC4:** Given a graded note played on the right note for its full written length, or a note slurred into the next, then its breakdown is what it is today.
- **AC5:** Given any finished run, then the breakdown's shares add up to 1, and for each graded note with no slurred join its in-tune plus out-of-tune time over its breakdown time equals its coverage.
- **AC6:** Given a finished run, then the playing habits (start, length, per-length, gap, drift), the rest sound figure and the practice spots are worked out as today.
- **AC7:** Given the change, then `make verify` passes, and the `analysis` module doc describes the breakdown's span with the release.

## Notes

- Silence in the release is left out, not given its own row (decided 2026-11-24, see the [design](../design.md#score-analysis)).
- Coverage and the analysis must share one span rule, not two copies of it. Use the release the timeline carries (F15-S01 AC3).
- Practice spots read coverage, so they follow F15-S01 without a change here.

## Test approach

Analysis tests through a real `createCoverageRun`, as today: a stop at the release, sound returning in the release, a wrong run in the release, a full-length note, a slurred join, shares adding to 1, and each note's in-tune and out-of-tune time against its coverage. By hand at the closing check: the table after a tongued run.
