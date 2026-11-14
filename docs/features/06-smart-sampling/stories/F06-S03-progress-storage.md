# F06-S03: Progress storage

- **Feature:** `../design.md`
- **Modules:** `src/core/progress`, `src/app` (storage), `docs/architecture/`
- **Depends on:** F06-S01

## Story

As a player, I want the app to remember how well I know each note between visits, so that smart sampling does not start from scratch every time.

## Acceptance criteria

Each item must be checkable and numbered so progress checklists can refer to it. Do not edit these once work starts; raise a change instead.
- **AC1:** Given scores for an instrument, when they are converted to their stored JSON and back, then every score is the same (round trip), and pitches are written as note names (`C♯5`), like the instrument JSON.
- **AC2:** Given stored JSON, when it is read for an instrument, then entries whose pitch name does not parse, is outside the instrument's written range, or whose value is not a finite number in [0, 1] are dropped and the rest kept; a value that is not an object gives no scores. Reading never throws.
- **AC3:** Given scores are kept per instrument, when one instrument's scores are saved, then another instrument's stored scores are left as they were.
- **AC4:** Given the app's progress store, then it uses its own `localStorage` key, separate from `fingerwise.settings`, with storage injected as in `settings-store.ts`.
- **AC5:** Given absent or blocked storage, a missing key, unparseable JSON or a throwing `getItem`, when progress loads, then it gives no scores (every pitch unseen); given a throwing `setItem` or null storage, saving does nothing and does not throw.
- **AC6:** Given the change, then `make verify` passes and `data-formats.md` (storage), `progress.md` and `app.md` describe the key, the shape and the fallbacks.

## Notes

- The shape is roughly `{ "<instrument name>": { "C5": 0.24 } }`; the breakdown settles the key and the exact shape.
- Scores for pitches outside the current range are kept: the range is not checked here, only the instrument's written range.
- No audio is ever stored; these are numbers derived from verdicts.

## Test approach

Unit tests with a fake in-memory storage: round trip, bad entries and bad top-level values, out-of-range pitches, two instruments, every failure in AC5.
