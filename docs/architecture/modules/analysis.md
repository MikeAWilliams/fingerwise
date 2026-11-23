# analysis

`src/core/analysis/index.ts`

## Purpose

Explains a finished timed song's score: where the graded note time went (the breakdown), the player's typical habits, and (from F11-S02) the practice spots. Pure: it reads a coverage run's finished segments, result and timeline, and the song, and returns plain numbers. No clock, timer or browser API. Built in [F11](../../features/11-score-analysis/design.md): [S01](../../features/11-score-analysis/stories/F11-S01-breakdown-and-habits.md).

## Public interface

Constants (one block at the top): `PER_LENGTH_MIN = 3`, `DRIFT_MIN_NOTES = 3`.

- `AnalysisInput { song, tempo, timeline, segments, result }`: the song and tempo the timeline was built from, the finished segments (`progress().segments` after `finish()`) and the `CoverageResult`.
- `analyse(input): Analysis | null`: null when `result.graded === 0`, or when no note was graded (only rests), since there is then no note time to divide. Otherwise `{ breakdown, restSound, habits }`.
- `Breakdown { inTune, outOfTune, silentBefore, silentAfter, silentMiddle, wrong, notPlayed }`: shares 0 to 1 of graded note time, adding to 1.
- `restSound`: the time of graded rests with sound (`ItemScore.soundedMs`) over their graced time; null with no graded rest.
- `Habits { start, length, byLength, gap, drift }`; every figure null (or empty) when it has no data.
- `median(values)`, `theilSen(points)`: the helpers, exported for tests.

## Rules

- **Breakdown.** A graded note's scored span is `[start + EDGE_GRACE_MS, end - EDGE_GRACE_MS]`, with no cut at a side that has a slurred join, as coverage has it. Its `note` segments are assigned by time. `right-in-tune` and `right-out` time inside the span is in tune and out of tune, `wrong` is wrong note. Silent time, and any span time no segment covers, is before, in the middle or after the note's first and last right segments, or not played when the note has no right segment. Shares are the sums over all graded notes divided by the total span time. Pending readings are silent in the segments, so a blip counts as silence.
- **Rest sound.** Rests are not in the breakdown. Segments cannot tell a pending reading from silence, so the figure comes from coverage's `soundedMs`.
- **Start.** The median of `soundStartMs - startMs` over graded notes that have one (positive is late). `soundStartMs` is the start of the unbroken run of the right pitch into the first right reading, so early starts and rushing give negative offsets.
- **Length.** The median of (last right segment's end - start) over the written length, over graded notes with a right reading. `byLength` has the same per written length (`beats` rounded to 1e-3) that has at least `PER_LENGTH_MIN` notes, longest first.
- **Gap.** The median over plain joins between graded notes that both have a right reading of the next note's first right segment start less the earlier note's last right segment end. Both ends are clipped to their notes, so a next note that starts early shows a longer gap than the player left. Slurred joins are left out.
- **Drift.** With at least `DRIFT_MIN_NOTES` start offsets, a Theil–Sen line of offset against written start (the median of pairwise slopes, pairs with equal start skipped; intercept the median of `offset - slope * start`). The fitted offsets at the first and last such note are returned only when they differ by more than `TIMING_TOLERANCE_MS`, else null. Slowing down or rushing follows from the sign.

## Large drift (design risk)

Offsets exist only for notes with a right reading. A synthetic player who falls 50 ms further behind on each of 16 quarter notes at ♩ = 80 (750 ms by the last note, 200 ms of sound per note) gives a fit of about 0 ms at the first note and 723 ms at the last: the slowdown is seen and slightly understated, because the last note, a whole slot behind, has no right reading and drops out. Once a player is more than about half a note behind, further notes are heard against the wrong written note, so drift much beyond a quarter note is understated more. F12's overrun lane is meant to show the rest.

## Dependencies

`src/core/coverage` and `src/core/song` only.

## Tests

`tests/core/analysis.test.ts`: readings generated in song time and run through a real `createCoverageRun`. The breakdown for a note played fully, late, stopping early, with a dropout, never played, with a confirmed wrong run, wrong throughout and out of tune, shares adding to 1, a slurred join; rests with and without sound; median at odd and even counts and Theil–Sen; start (late, early, none), length and per-length at two and three notes, gaps over plain and slurred joins; drift with a steady slowdown, a steady rush, none, one outlier and fewer than three notes; the large-drift fit above; nothing graded; the imports and the absence of clocks.
