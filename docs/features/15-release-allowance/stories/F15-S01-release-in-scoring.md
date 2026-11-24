# F15-S01: Release in the scoring

- **Feature:** `../design.md`
- **Modules:** `src/core/song`, `src/core/coverage`, `docs/architecture/`
- **Depends on:** none

## Story

As a player, I want a short stop to tongue the next note or to breathe not to count against me, so that my score shows cut notes and wrong notes, not good articulation.

## Acceptance criteria

Each item must be checkable and numbered so progress checklists can refer to it. Do not edit these once work starts; raise a change instead.
- **AC1:** Given a song and its tempo, then each note whose end is not slurred into the next note has a release of 25% of its written length, at most half a quarter note at the tempo, and at least the edge grace (40 ms). At ♩ = 75 a quarter note gets 200 ms and a half and a whole note 400 ms, at ♩ = 100 a sixteenth gets 40 ms, and at ♩ = 140 an eighth gets about 54 ms.
- **AC2:** Given a note slurred into a note that starts at its written end, then it has no release, and its end is scored as today. Given a note before a rest, or the last note, then it has a release. Given a tied note, then its release follows its whole tied length.
- **AC3:** Given the timeline built from a song and its tempo, then each note carries its release in ms.
- **AC4:** Given a graded note played on the right note for its full written length, then its coverage, in-tune share and timing faults are what they are today.
- **AC5:** Given a graded note played on the right note from its start until its release starts, then silent to its end, then its coverage is 100% and it has no "ended early" fault.
- **AC6:** Given a graded note played on the right note from its start, then silent for part of its release, then the right note again, then the time sounding in the release counts as covered. Given a confirmed wrong note in the release, then that time counts against the note's coverage. Given silence or pending readings in the release, then that time counts neither way.
- **AC7:** Given a graded note whose right-note sound stops before its release starts, then it is "ended early" only when the stop is more than the timing tolerance before the release start: not marked at the tolerance, and marked just past it. "Ended late" is judged from the written end as today.
- **AC8:** Given a plain join, then it is separated when a gap (silent readings or a level dip, as today) shows anywhere from the join less the earlier note's release less the timing tolerance, to the join plus the timing tolerance. A gap that opens during the earlier note's release counts. A gap before that window does not count. A note held through a same-pitch join is still not separated.
- **AC9:** Given a slurred join, a rest or a note's start edge, then coverage, separation and timing are judged as today. Which notes and rests are graded is unchanged.
- **AC10:** Given the clips in `tests/fixtures/audio/`, then `held.wav` is still not separated, `slurred-scale.wav` and `tongued-scale.wav` score as today, and in `tongued-repeat.wav` the song's coverage is at least today's and fewer notes end early.
- **AC11:** Given the change, then `make verify` passes, and the `song` and `coverage` module docs describe the release, its constants and the changed rules.

## Notes

- [ADR 0011](../../../architecture/decisions/0011-release-allowance.md) records the rules. The rest of [ADR 0009](../../../architecture/decisions/0009-timed-songs-scored-by-coverage.md) stands.
- The release zone ends at the edge grace before the written end. Where the release equals the grace (40 ms), the zone is empty and the note scores as today.
- "Half a quarter note" is `30000 / tempo` ms, the tune's tempo being ♩ = per [ADR 0008](../../../architecture/decisions/0008-songs-keep-rhythm.md).
- The release rule lives in the song core because F15-S04's playback uses it too. The floor equals `EDGE_GRACE_MS`. Keep `song` free of any import from `coverage`.
- The constants (share 25%, cap half a quarter note) sit with the other scoring constants, to tune in the live check.
- Only the user's own clips are used as fixtures.

## Test approach

Song tests for the release over a range of lengths and tempos, slurred ends, a note before a rest, the last note and ties. Coverage tests with generated readings in song time: a full note, a stop at the release, a stop inside it, sound returning in it, a wrong run in it, "ended early" at the tolerance and just past it from the release start, a gap in the release, a gap before the window, a held same-pitch join, a slurred join; at ♩ = 75 and a fast tempo where the cap binds. The fixture tests for AC10. By hand at the closing check: a slow song played tongued, and the same with clipped notes.
