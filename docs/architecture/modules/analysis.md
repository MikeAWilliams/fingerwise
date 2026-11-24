# analysis

`src/core/analysis/index.ts`

## Purpose

Explains a finished timed song's score: where the graded note time went (the breakdown), the player's typical habits, and the practice spots. Pure: it reads a coverage run's finished segments, result and timeline, and the song, and returns plain numbers. No clock, timer or browser API. Built in [F11](../../features/11-score-analysis/design.md): [S01](../../features/11-score-analysis/stories/F11-S01-breakdown-and-habits.md), [S02](../../features/11-score-analysis/stories/F11-S02-practice-spots.md).

## Public interface

Constants (one block at the top): `PER_LENGTH_MIN = 3`, `DRIFT_MIN_NOTES = 3`, `SPAN_BARS = 2`, `MAX_SPOTS = 2`, `SPOT_ALPHA = 0.05`, `MIN_BARS = 3`, `EXACT_BUDGET = 2e6`.

- `AnalysisInput { song, tempo, timeline, segments, result }`: the song and tempo the timeline was built from, the finished segments (`progress().segments` after `finish()`) and the `CoverageResult`.
- `analyse(input): Analysis | null`: null when `result.graded === 0`, or when no note was graded (only rests), since there is then no note time to divide. Otherwise `{ breakdown, restSound, habits, practice }`.
- `Breakdown { inTune, outOfTune, silentBefore, silentAfter, silentMiddle, wrong, notPlayed }`: shares 0 to 1 of graded note time, adding to 1.
- `restSound`: the time of graded rests with sound (`ItemScore.soundedMs`) over their graced time; null with no graded rest.
- `Habits { start, length, byLength, gap, drift }`; every figure null (or empty) when it has no data.
- `practiceSpots(input): { tested, spots }` with `Spot { firstBar, lastBar, startBeat, endBeat, coverage, elsewhere, p }`; `analyse` returns it as `practice`. Bars count from 1 over `songBars`; `startBeat` is the first bar's start and `endBeat` the next bar's start or the song's end (for the shading).
- `mannWhitneyLower(span, rest)`, `mannWhitneyExact`, `mannWhitneyNormal`: the rank test and its two paths.
- `median(values)`, `theilSen(points)`: the helpers, exported for tests.

## Rules

- **Breakdown.** A graded note's scored span is coverage's `scoredSpan`: from its start plus `EDGE_GRACE_MS` (no cut at a slurred start) to where its release starts ([ADR 0011](../decisions/0011-release-allowance.md); the written end at a slurred end). Then the release zone, up to `EDGE_GRACE_MS` before the written end, is walked too: right and wrong sound there counts in its row and adds to the total, and silence there adds nothing, so a note's in-tune plus out-of-tune time over its breakdown time is its coverage. Its `note` segments are assigned by time. `right-in-tune` and `right-out` time inside the span is in tune and out of tune, `wrong` is wrong note. Silent time, and any span time no segment covers, is before, in the middle or after the note's first and last right segments, or not played when the note has no right segment. Shares are the sums over all graded notes divided by the total span time. Pending readings are silent in the segments, so a blip counts as silence.
- **Rest sound.** Rests are not in the breakdown. Segments cannot tell a pending reading from silence, so the figure comes from coverage's `soundedMs`.
- **Start.** The median of `soundStartMs - startMs` over graded notes that have one (positive is late). `soundStartMs` is the start of the unbroken run of the right pitch into the first right reading, so early starts and rushing give negative offsets.
- **Length.** The median of (last right segment's end - start) over the written length, over graded notes with a right reading. `byLength` has the same per written length (`beats` rounded to 1e-3) that has at least `PER_LENGTH_MIN` notes, longest first.
- **Gap.** The median over plain joins between graded notes that both have a right reading of the next note's first right segment start less the earlier note's last right segment end. Both ends are clipped to their notes, so a next note that starts early shows a longer gap than the player left. Slurred joins are left out.
- **Drift.** With at least `DRIFT_MIN_NOTES` start offsets, a Theil–Sen line of offset against written start (the median of pairwise slopes, pairs with equal start skipped; intercept the median of `offset - slope * start`). The fitted offsets at the first and last such note are returned only when they differ by more than `TIMING_TOLERANCE_MS`, else null. Slowing down or rushing follows from the sign.
- **Practice spots.** The bars are `songBars(song)`, each starting at `bar.start * 60000 / tempo` ms. A graded note or rest (an entry of `result.items` with a coverage) belongs to the last bar that starts at or before its `startMs` (1e-6 ms slack). With fewer than `MIN_BARS` bars, `{ tested: false, spots: [] }`. Candidates are every `SPAN_BARS` bars in a row; one with no graded item inside, or none outside, is skipped. If none could be tested (all graded items in one span), `tested` is false too. K is the number tested. A candidate is a spot when its one-sided p (its coverages lower than the rest's) is below `SPOT_ALPHA / K`: **Bonferroni**, chosen over Holm for simplicity, since with at most two spots the difference is small. Candidates sort by p, then lower mean coverage, then the earlier bar, and are taken greedily without sharing a bar, up to `MAX_SPOTS`.
- **The rank test (AC7).** Mid-ranks over the pooled values, values within 1e-9 tied; the ranks are doubled so each is an integer. *Exact path:* the conditional permutation distribution given the pooled values, ties and all: a DP over the pooled doubled ranks counts the ways to choose the span's `m` items with each rank sum, capped at the observed sum, as floats; p is the count at or below the observed sum over C(N, m). Exact to float rounding (tested against brute force to 1e-12). *Normal path:* z = (W + 0.5 - m(N + 1) / 2) / σ with the tie-corrected variance σ² = m n / 12 · (N + 1 - Σ(t³ - t) / (N(N - 1))) and a 0.5 continuity correction, W the rank sum in whole ranks; p = Φ(z), computed to about 1e-13 (series, then a continued fraction in the tails); 1 when every value ties. The exact path is used when `N · m · (observed + 1) <= EXACT_BUDGET` (2e6, a few ms), else the normal one; an observed sum at or above the null mean m(N + 1) cannot be significant and takes the normal value. At m = 8, n = 40 the two agree within 0.01.

## Large drift (design risk)

Offsets exist only for notes with a right reading. A synthetic player who falls 50 ms further behind on each of 16 quarter notes at ♩ = 80 (750 ms by the last note, 200 ms of sound per note) gives a fit of about 0 ms at the first note and 723 ms at the last: the slowdown is seen and slightly understated, because the last note, a whole slot behind, has no right reading and drops out. Once a player is more than about half a note behind, further notes are heard against the wrong written note, so drift much beyond a quarter note is understated more. F12's overrun lane and "You played N s past the end" line show the rest; both are built in the app from the readings after the last note ([app](app.md)), and `analyse` is untouched.

## Dependencies

`src/core/coverage` and `src/core/song` only.

## Tests

`tests/core/analysis.test.ts`: readings generated in song time and run through a real `createCoverageRun`. The breakdown for a note played fully, late, stopping early, with a dropout, never played, with a confirmed wrong run, wrong throughout and out of tune, shares adding to 1, a slurred join; the release (a stop at the release start, sound and a wrong run returning in it, a full-length and a slurred note as before, in tune plus out of tune equal to coverage, habits against the written length); rests with and without sound; median at odd and even counts and Theil–Sen; start (late, early, none), length and per-length at two and three notes, gaps over plain and slurred joins; drift with a steady slowdown, a steady rush, none, one outlier and fewer than three notes; the large-drift fit above; nothing graded; practice spots (one bad span, with noise, a lone bad item, uniform scores, two far apart, two overlapping, a short song, a pickup bar, ties, ordering); the rank test against brute force, the published m = 3, n = 4 values, a hand-worked normal value and the budget switch; the imports and the absence of clocks.
