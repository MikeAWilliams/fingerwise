# drill

`src/core/drill/index.ts`

## Purpose

Decides which pitch comes next. It knows only pitches and instrument definitions, never clef, staff, audio or UI, and takes its randomness as an injected parameter, so it is deterministic under test.

## Public interface

- `type RandomSource = () => number`: a value in `[0, 1)`, like `Math.random`.
- `class DrillError extends Error`: thrown for a bad range, an empty pool or an empty draw.
- `interface PoolOptions { lowest, highest, includeSharps }`.
- `fullRange(instrument): { lowest, highest }`: the instrument's written range.
- `buildPool(instrument, options): Pitch[]`: every pitch from `lowest` to `highest`, ascending, keeping only naturals (see [`isNatural`](pitch.md)) when `includeSharps` is false. Throws `DrillError` if `lowest > highest`, if either bound is outside the instrument's written range, or if the pool is empty.
- `drawPitch(pool, previous, random): Pitch`: uniform over the pool minus `previous`, via `Math.floor(random() * candidates.length)`. A pool of one returns that pitch even when it is `previous`. An empty pool throws `DrillError`. The module never calls `Math.random`.

## Dependencies

`src/core/pitch` and `src/core/instrument` only.

## Tests

- `tests/core/drill.test.ts`: pool contents for the full range and sub-ranges, with and without sharps; bound and empty-pool errors; every candidate reachable under a stepping random; the previous pitch never drawn; the one-pitch pool; the module's imports are exactly `../pitch` and `../instrument` and it contains no `Math.random`.
- `tests/core/core-imports.test.ts`: covers this folder too (relative imports, no browser globals).
