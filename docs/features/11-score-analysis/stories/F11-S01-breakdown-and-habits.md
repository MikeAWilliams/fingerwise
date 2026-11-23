# F11-S01: Breakdown and habits

- **Feature:** `../design.md`
- **Modules:** new `src/core/analysis`, `docs/architecture/`
- **Depends on:** none (uses the coverage core from F09-S02)

## Story

As a player who has just played a song in time, I want to know where my score went and what my playing habits were, so that I know what to change rather than only how well I did.

## Acceptance criteria

Each item must be checkable and numbered so progress checklists can refer to it. Do not edit these once work starts; raise a change instead.
- **AC1:** Given a finished coverage run (its segments and result) and its timeline, then the analysis gives the [breakdown](../design.md#behavior) of graded note time, each part's edge graces left out as coverage leaves them out, into seven shares: in tune, out of tune, silent before the note started, silent after it stopped, silent in the middle, wrong note and not played. The shares add up to 1 (within rounding).
- **AC2:** Given a note with right readings, then its silent time before the first right reading is "before", after the last is "after", and between them is "in the middle". Given a note with no right reading, then all its silent time is "not played" and its wrong time is "wrong note".
- **AC3:** Given graded rests, then the analysis gives the share of graded rest time with sound in it (wrong or pending readings). Given no graded rests, then that figure is absent, not 0.
- **AC4:** Given graded notes with a right reading, then the start habit is the median of each note's first right reading less its written start, in ms, signed (positive is late).
- **AC5:** Given the same notes, then the length habit is the median of (last right reading's end less written start) over written length. Given at least three graded notes with a right reading of one written length, then that length has its own median too; lengths with fewer have none.
- **AC6:** Given plain joins where both notes have a right reading, then the gap habit is the median of the next note's first right reading less the earlier note's last right reading's end, in ms. Slurred joins are left out. Given no such joins, then it is absent.
- **AC7:** Given at least three notes with a start offset, then tempo drift is a robust line fit (Theil–Sen: the median of pairwise slopes) of start offset against written start. It is reported, with the fitted offsets at the first and last such note, only when their difference is larger than `TIMING_TOLERANCE_MS`, as slowing down (later) or rushing (earlier). Otherwise, or with fewer notes, it is absent.
- **AC8:** Given a run with nothing graded, then the analysis is null.
- **AC9:** Given the module, then it is pure: it imports only core modules (coverage, song, pitch as needed), no framework, browser API, clock or timer, and the core import test covers it.
- **AC10:** Given the change, then `make verify` passes, and a new `analysis` module doc describes the interface and rules and is linked from the modules index.

## Notes

- Same readings and scoring lag as the score: nothing here changes a coverage figure.
- Median of an even count is the mean of the two middle values.
- The F11 design's worked example (45 / 12 / 11 / 16 / 4 / 12%) came from an offline run on the user's recording; it is a sanity check, not a test value.

## Test approach

Unit tests on generated readings in song time, as `tests/core/coverage.test.ts` does: a note played fully, one starting late, one stopping early, one with a dropout in the middle, one never played, one with a confirmed wrong run, out-of-tune readings, a rest with sound; the shares adding to 1; each habit with odd and even counts; per-length figures at two and three notes; gaps over plain and slurred joins; drift with a steady slowdown, a steady rush, no drift, one outlier that Theil–Sen ignores, and fewer than three notes; nothing graded.
