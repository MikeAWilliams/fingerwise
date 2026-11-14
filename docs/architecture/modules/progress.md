# progress

`src/core/progress/index.ts`

## Purpose

How much work each pitch needs, as a score from 0 (known) to 1 (needs work), and the weight a weighted draw gives it. It knows only pitches: no judge types, clock, randomness, storage or UI. Rules are in [ADR 0007](../decisions/0007-smart-sampling-by-need.md). Built in [F06-S01](../../features/06-smart-sampling/stories/F06-S01-need-scores-and-weighted-draw.md). Storage shape follows in F06-S03.

## Public interface

- `ALPHA = 0.3`: how far one grade moves a need. `FLOOR = 0.05`: the smallest draw weight. Each defined once.
- `type ProgressGrade = "correct" | "miss"`: not the judge's `Grade`; the caller maps to it.
- `type Scores = ReadonlyMap<Pitch, number>`; `emptyScores()`.
- `needOf(scores, pitch)`: the stored need, or 1 when absent.
- `applyGrade(scores, pitch, grade)`: a new map with `n + ALPHA * (target - n)`, target 0 for `correct`, 1 for `miss`. The input is not modified.
- `resetScores()`: empty scores, so every pitch reads 1.
- `drawWeight(scores, pitch)`: `max(need, FLOOR)`, for [`drawWeighted`](drill.md).

## Dependencies

`src/core/pitch` only (the `Pitch` type). The [drill](drill.md) does not import it; the caller passes `drawWeight` as the weight function.

## Tests

- `tests/core/progress.test.ts`: absent pitch is 1; the update sequences; boundaries at 0 and 1; the floor; reset; inputs left unchanged; the source imports only `../pitch` and mentions no judge, `Math.random`, `Date` or `performance`.
- `tests/core/core-imports.test.ts` covers this folder too.
