# settings

`src/core/settings/index.ts`

## Purpose

The player's settings (range, sharps flag, reveal delay, auto-advance and its delay) as validated data, plus the sharps snapping rule. It knows nothing of the defaults file or of storage; the app reads those and passes the values in.

## Public interface

- `interface Settings { lowest: Pitch; highest: Pitch; includeSharps: boolean; delaySeconds: number; autoAdvance: boolean; advanceDelaySeconds: number }`. `delaySeconds` is the reveal delay; `advanceDelaySeconds` is how long a revealed card waits before the next one appears when `autoAdvance` is on.
- `interface SettingsJson`: the serialized form shared by the defaults file and storage. Pitches are note names (`A3`, `C♯5`), like the instrument JSON.
- `toSettingsJson(settings): SettingsJson`.
- `MIN_DELAY_SECONDS` (0.5), `MAX_DELAY_SECONDS` (30); both delays use these bounds.
- `class SettingsError`.
- `snapToNaturals(lowest, highest)`: a sharp low bound moves up a semitone, a sharp high bound moves down; `null` when `lowest >= highest` results.
- `setIncludeSharps(settings, on)`: `{ ok: true, settings }` or `{ ok: false, reason }`. On keeps the bounds; off snaps, and is blocked when snapping leaves no range.
- `canTurnSharpsOff(settings): boolean`.
- `validateSettings(raw, instrument, defaults): Settings`: never throws. Order:
  1. Each field alone: a non-object, a missing or wrongly typed field, a pitch name `parsePitch` rejects, a non-boolean `autoAdvance`, or a delay (reveal or advance) not finite in [0.5, 30] resets to its default.
  2. Each bound is clamped into the instrument's written range.
  3. `lowest >= highest` resets both bounds to the defaults.
  4. With sharps off, the bounds are snapped; if that is blocked, the bounds and the flag reset to the defaults.
- `parseDefaults(raw, instrument): Settings`: strict. Throws `SettingsError` naming the field when anything is missing, wrong, out of range, or would be changed by validation. That includes `autoAdvance` and `advanceDelaySeconds`.

## Dependencies

`../pitch` and `../instrument` only. No JSON import, no storage, no framework or browser API.

## Tests

- `tests/core/settings.test.ts`: every rule and edge case above against the alto C instrument, and that the source has no `.json` import.
- `tests/core/core-imports.test.ts` covers this module's imports and globals.
