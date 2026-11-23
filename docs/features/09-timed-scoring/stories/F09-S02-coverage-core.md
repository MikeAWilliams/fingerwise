# F09-S02: Coverage core

- **Feature:** `../design.md`
- **Modules:** new `src/core/coverage`, possibly `src/core/judge`, `docs/architecture/`
- **Depends on:** F09-S01

## Story

As a player, I want each note scored by how much of it I played on the right note, in tune and on time, so that the score shows how I really played rather than right or wrong.

## Acceptance criteria

Each item must be checkable and numbered so progress checklists can refer to it. Do not edit these once work starts; raise a change instead.
- **AC1:** Given a song and a tempo, then the core builds the song's timeline in ms: each note over its written length (not its slot), each rest between one note's end and the next note's start, and each join between neighbouring notes as plain or slurred (from F09-S01).
- **AC2:** Given readings placed in song time, then each is classified as in the [design](../design.md#classifying-readings): right note when it passes the judge's clarity, level and band checks and its nearest note is the expected pitch (in tune within the tolerance, out of tune otherwise, keeping its cents offset); wrong when it passes the checks and its nearest note is another one, the same other note for at least the wrong-run length of readings in a row (readings that jump between different wrong notes, as in a release, are not confirmed); silent otherwise. Each reading covers the time until the next one.
- **AC3:** Given a note, then its coverage is the share of its written length filled with right-note readings, leaving out the edge grace at each edge. At a slurred join the grace forgives only the previous pitch, not silence.
- **AC4:** Given a rest, then its coverage is the share filled with silence, leaving out the edge grace at each edge.
- **AC5:** Given a note or rest shorter than the minimum graded length (both edge graces plus the minimum scored span), then it is not graded and is counted as too short to grade.
- **AC6:** Given a finished run, then song coverage is the mean over graded notes and rests, each counting equally; a note's in-tune share is its in-tune time over its right-note time, and the song's in-tune figure is the mean over notes with any right-note time.
- **AC7:** Given a note with right-note time, then its start edge is its first right-note reading and its end edge its last, even when silence breaks the note in between. It reports started late when the start edge is more than the timing tolerance after the note's start; started early when the expected pitch sounds continuously from more than the tolerance before the note's start up to it; ended early when the end edge is more than the tolerance before the note's end; ended late when the expected pitch sounds continuously to more than the tolerance after the note's end. A note with no right-note time has no edges and is left out of all four. At a plain join between two notes of the same pitch with no gap, neither the first note's end nor the second note's start is an edge, so neither is counted for those two faults. Each song figure is a percentage of the notes that have that edge.
- **AC8:** Given a plain join (including two notes of the same pitch), then it is separated when, within the timing tolerance of the written join, the level envelope falls at least the gap dip below its median over the surrounding 100 ms and then recovers, or the readings there are silent. The song figure is the percentage of plain joins not separated. Slurred joins are not checked for separation.
- **AC9:** Given a finished run, then the tuning list gives up to three written pitches whose average offset is furthest outside the tolerance, worst first. The average uses every reading within ±150 cents of the expected pitch while notes of that pitch are due. Pitches within the tolerance are left out.
- **AC10:** Given readings arriving in order during a run, then the core can report, at any time, the classified segments and faults so far, so a display can draw them live without recomputing the whole song.
- **AC11:** Given the constants (edge grace 40 ms, wrong-run 3 readings, timing tolerance 60 ms, gap dip 10 dB, minimum scored span 50 ms, right-note band ±50 cents), then they are named and in one place, to be tuned in the live check.
- **AC12:** Given the four spike recordings in `samples/` (`tonged-repeat.wav`, `held.wav`, `tonged-scale.wav`, `slurred-scale.wav`), then short clips trimmed from them (a few hundred KB each, 16-bit mono WAV) are committed in `tests/fixtures/` with a README saying what each holds and that it is the user's own playing, read by the tests without a new dependency, and run through the app's detector framing: the tongued joins are separated, the held note and slurred joins are not, and the sagging and semitone-flat notes are classified as the spike found.
- **AC13:** Given the module, then it imports only `src/core` modules, uses no clock, timer or browser API, and knows nothing of staff, audio or UI; the core import tests cover it.
- **AC14:** Given the change, then `make verify` passes and a new `coverage` module doc describes it.

## Notes

- The judge's per-reading checks (gates, band, tolerance) may be exported for reuse; the tone tracker is unchanged.
- The envelope's form (block times and levels) is settled with F09-S03; this story takes it as input.
- Rules come from [ADR 0009](../../../architecture/decisions/0009-timed-songs-scored-by-coverage.md); the numbers are starting values.

## Test approach

Unit tests with generated readings and envelopes in song time: a note played fully, half, not at all; a sagging note going amber then out of the band; a wrong note confirmed and a one-reading blip not; release and attack slivers inside the graces; each timing fault at and just past the tolerance; a tongued and a held same-pitch join; a slurred join with and without a break; a rest kept silent and overheld; a note too short to grade; the tuning list order and cut-off; equal weighting. The fixture tests (AC12) frame the clips as the listener does (2048 samples every 800, plus 128-sample envelope blocks) with `detectPitch` and `rmsDb`; `samples/` is untracked, so the clips are trimmed from the local copy on the feature branch.
