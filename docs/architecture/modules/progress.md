# progress

`src/core/progress/index.ts`

## Purpose

How much work each pitch needs, as a score from 0 (known) to 1 (needs work), and the weight a weighted draw gives it. It knows only pitches: no judge types, clock, randomness, storage or UI. Rules are in [ADR 0007](../decisions/0007-smart-sampling-by-need.md). Built in [F06-S01](../../features/06-smart-sampling/stories/F06-S01-need-scores-and-weighted-draw.md). Storage is in F06-S03 (below) and the app's [`progress-store.ts`](app.md).

## Public interface

- `ALPHA = 0.3`: how far one grade moves a need. `FLOOR = 0.05`: the smallest draw weight. Each defined once.
- `type ProgressGrade = "correct" | "miss"`: not the judge's `Grade`; the caller maps to it.
- `type Scores = ReadonlyMap<Pitch, number>`; `emptyScores()`.
- `needOf(scores, pitch)`: the stored need, or 1 when absent.
- `applyGrade(scores, pitch, grade)`: a new map with `n + ALPHA * (target - n)`, target 0 for `correct`, 1 for `miss`. The input is not modified.
- `resetScores()`: empty scores, so every pitch reads 1.
- `type ProgressJson = Record<string, number>`; `toProgressJson(scores)`: written pitch name (`C♯5`, via `formatPitch`) to need.
- `fromProgressJson(raw, instrument): Scores`: keeps an entry only when `parsePitch` accepts the name, the pitch lies within `instrument.lowest..highest`, and the value is a finite number from 0 to 1; drops the rest. A non-object, null or array gives no scores. Never throws. Scores for pitches outside the player's current range are kept; only the instrument's written range is checked.
- `drawWeight(scores, pitch)`: `max(need, FLOOR)`, for [`drawWeighted`](drill.md).

## Dependencies

`src/core/pitch`, and `src/core/instrument` for the `Instrument` type only. The [drill](drill.md) does not import it; the caller (`needSource` in `card-flow.ts`) passes `drawWeight` as the weight function.

## Tests

- `tests/core/progress.test.ts`: absent pitch is 1; the update sequences; boundaries at 0 and 1; the floor; reset; inputs left unchanged; the JSON round trip (sharps written `C♯5`), dropped entries (bad name, outside A3 to F5, `NaN`, negative, above 1, string value) and non-object tops; the source imports only `../pitch` and `../instrument` and mentions no judge, `Math.random`, `Date` or `performance`.
- `tests/core/core-imports.test.ts` covers this folder too.
