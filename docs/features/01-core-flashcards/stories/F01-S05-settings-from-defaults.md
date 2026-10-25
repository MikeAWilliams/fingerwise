# F01-S05: Settings read from a bundled defaults file

- **Feature:** `../design.md`
- **Modules:** `src/core/settings`, `src/app`, `data/settings/`
- **Depends on:** F01-S04

## Story

As a maintainer, I want the drill to take its range, sharps flag and delay from validated settings, so that the settings UI can be added later without changing the drill.

## Acceptance criteria

Each item must be checkable and numbered so progress checklists can refer to it. Do not edit these once work starts; raise a change instead.
- **AC1:** Given `data/settings/defaults.json`, then it holds the lowest and highest written pitch (A3 and F5), include sharps (on) and the delay (3 seconds), and the app imports it at build time.
- **AC2:** Given the app loads, then the drill uses the defaults file's range and sharps flag, and the reveal uses its delay. There is no settings button and no way to change them.
- **AC3:** Given settings and an instrument, when they are validated, then valid settings come back unchanged.
- **AC4:** Given a lowest or highest pitch outside the instrument's written range, when validated, then it is clamped to the nearest end of that range.
- **AC5:** Given a lowest pitch not below the highest (after clamping), when validated, then both bounds reset to the defaults.
- **AC6:** Given a delay that is not a finite number above zero, or any value of the wrong type or missing, when validated, then that setting resets to its default.
- **AC7:** Given a range and include sharps turned off, when the sharps toggle is evaluated, then a sharp low bound moves up and a sharp high bound moves down to the nearest natural, and the result is returned.
- **AC8:** Given turning sharps off would leave low equal to or above high, when evaluated, then the toggle is reported as blocked and the range is unchanged.
- **AC9:** Given sharps turned back on, then the bounds stay as they are.
- **AC10:** Given `src/core/settings`, then it imports no framework or browser API, and the defaults file and `localStorage` access are not in it.
- **AC11:** Given the change, then `make verify` passes and the `modules/` doc for `settings` describes what was built.

## Notes

- Reading and writing `localStorage` is F01-S06.
- Only the validation and snapping logic is built here. The pickers and the blocked-toggle message are F01-S06.
- The design leaves open whether an out-of-range value is clamped or reset; AC4 clamps, AC5 and AC6 reset.

## Test approach

Unit tests for every rule in `core/settings`, including each edge case in the design. The defaults are seen to take effect in the browser: checked by hand.
