# settings

`src/core/settings/index.ts`

## Purpose

The player's settings (range, sharps flag, reveal delay, auto-advance and its delay, play note with its delay and duration) as validated data, plus the sharps snapping rule and the sound sum rule. It knows nothing of the defaults file or of storage; the app reads those and passes the values in.

## Public interface

- `interface Settings { lowest: Pitch; highest: Pitch; includeSharps: boolean; delaySeconds: number; autoAdvance: boolean; advanceDelaySeconds: number; soundEnabled: boolean; soundDelaySeconds: number; soundDurationSeconds: number }`. `soundEnabled` is play note; `soundDelaySeconds` is how long after the reveal the note starts and `soundDurationSeconds` how long it sounds. `delaySeconds` is the reveal delay; `advanceDelaySeconds` is how long a revealed card waits before the next one appears when `autoAdvance` is on.
- `interface SettingsJson`: the serialized form shared by the defaults file and storage. Pitches are note names (`A3`, `C♯5`), like the instrument JSON.
- `toSettingsJson(settings): SettingsJson`.
- `MIN_DELAY_SECONDS` (0.5), `MAX_DELAY_SECONDS` (30); the reveal and advance delays use these bounds. `MIN_SOUND_DELAY_SECONDS` (0) and `MIN_SOUND_DURATION_SECONDS` (0.5) are the sound minimums; both sound values share the maximum of 30.
- `type SettingsResult`: `{ ok: true, settings } | { ok: false, reason }`. `SharpsResult` is an alias of it.
- `class SettingsError`.
- `snapToNaturals(lowest, highest)`: a sharp low bound moves up a semitone, a sharp high bound moves down; `null` when `lowest >= highest` results.
- `setIncludeSharps(settings, on)`: `{ ok: true, settings }` or `{ ok: false, reason }`. On keeps the bounds; off snaps, and is blocked when snapping leaves no range.
- `canTurnSharpsOff(settings): boolean`.
- **Sound sum rule:** with play note and auto-advance both on, the sound delay plus the sound duration must not exceed the advance delay (the tone ends before the next card). Helpers: `soundRuleApplies(s)`, `soundFits(s)` (the sum compared with a 1e-9 tolerance, so 0.5 + 1.5 against 2 passes), `breaksSoundRule(s)` and `soundTooLongReason(s)` (`"Sound delay plus duration (2 s) is longer than the advance delay (1 s)"`).
- `canTurnSoundOn(s)`, `canTurnAutoAdvanceOn(s)`, `setSoundEnabled(s, on)` and `setAutoAdvance(s, on)`: turning on is `{ ok: false, reason: soundTooLongReason }` when the result would break the rule; turning off always succeeds.
- `setTimings(s, patch)`: `patch` is a partial of `soundDelaySeconds`, `soundDurationSeconds` and `advanceDelaySeconds`. Returns `{ ok: false, reason: "The sound delay plus the sound duration must not exceed the advance delay." }` when the result breaks the rule, otherwise the new settings. No rule applies while play note or auto-advance is off.
- `validateSettings(raw, instrument, defaults): Settings`: never throws. Order:
  1. Each field alone: a non-object, a missing or wrongly typed field, a pitch name `parsePitch` rejects, a non-boolean `autoAdvance` or `soundEnabled`, a delay (reveal or advance) not finite in [0.5, 30], a sound delay not finite in [0, 30] or a sound duration not finite in [0.5, 30] resets to its default.
  2. Each bound is clamped into the instrument's written range.
  3. `lowest >= highest` resets both bounds to the defaults.
  4. With sharps off, the bounds are snapped; if that is blocked, the bounds and the flag reset to the defaults.
  5. If the result breaks the sound sum rule, the sound delay, sound duration and advance delay all reset to the defaults; every other field is kept.
- `parseDefaults(raw, instrument): Settings`: strict. Throws `SettingsError` naming the field when anything is missing, wrong, out of range, or would be changed by validation. That includes `autoAdvance`, `advanceDelaySeconds`, `soundEnabled`, `soundDelaySeconds` and `soundDurationSeconds`, and a file that breaks the sound sum rule.

## Dependencies

`../pitch` and `../instrument` only. No JSON import, no storage, no framework or browser API.

## Tests

- `tests/core/settings.test.ts`: every rule and edge case above against the alto C instrument (the sound fields' bounds and wrong types, the sum rule at equal and one step over, the toggles, `setTimings`, strict parse), and that the source has no `.json` import.
- `tests/core/core-imports.test.ts` covers this module's imports and globals.
