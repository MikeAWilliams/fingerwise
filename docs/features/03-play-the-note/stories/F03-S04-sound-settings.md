# F03-S04: Sound settings

- **Feature:** `../design.md`
- **Modules:** `src/core/settings`, `src/app`, `data/settings/`, `docs/architecture/`
- **Depends on:** F01-S08, F03-S01

## Story

As a player, I want to choose whether the note plays, when it starts after the reveal and how long it lasts, so that the sound fits the way I drill.

## Acceptance criteria

Each item must be checkable and numbered so progress checklists can refer to it. Do not edit these once work starts; raise a change instead.
- **AC1:** Given `data/settings/defaults.json`, then it also holds play note (on), sound delay (0.5 seconds) and sound duration (1.5 seconds), and the strict defaults parse accepts it.
- **AC2:** Given stored or default settings where play note is missing or not a boolean, the sound delay is missing or not a finite number from 0 to 30 inclusive, or the sound duration is missing or not a finite number from 0.5 to 30 inclusive, when validated, then that setting alone resets to its default and the other settings are kept.
- **AC3:** Given settings where sound delay + sound duration exceeds the advance delay, when validated, then the sound delay, sound duration and advance delay all reset to their defaults, and every other setting is kept. The strict defaults parse rejects such a file.
- **AC4:** Given settings saved before this story (no sound fields), when the app loads, then the saved range, sharps flag, delays and auto-advance are kept and play note is on with a 0.5 second delay and 1.5 second duration, unless that breaks the AC3 rule, in which case AC3 applies.
- **AC5:** Given the settings view, then a "Sound" section (F03-S01) offers a play note toggle, a sound delay input in seconds limited to 0 to 30 and a sound duration input limited to 0.5 to 30 (min, max and step 0.5 on the inputs). Changes are saved with the other settings under the same `localStorage` key.
- **AC6:** Given an edit to the sound delay, sound duration or advance delay that would make delay + duration exceed the advance delay, when the player makes it, then the old value stays and the view shows a message that the sound delay plus the sound duration must not exceed the advance delay. The message goes away once a valid edit is made or the view closes.
- **AC7:** Given play note is off, then the sound delay and duration inputs stay enabled and the AC6 rule still applies.
- **AC8:** Given the change, then `make verify` passes, the `modules/` docs for `settings` and `app` describe what was built, and `data-formats.md` documents the new fields of the defaults file and the stored key.

## Notes

- Mirrors F01-S08: same validation order (each field alone first, then the cross-field rule), same strict-versus-lenient split between `parseDefaults` and `validateSettings`.
- The sum rule is checked in the settings logic, not the view; the view only reports the rejection, like the sharps toggle in F01.
- This story only stores and edits the values. Nothing plays until F03-S05.
- Floating point: compare the sum to the advance delay with care for half-second steps (for example 0.5 + 1.5 against 2).

## Test approach

Unit tests in `core/settings` for each rule and edge (bounds, sum equal to the advance delay allowed, one step over rejected, old stored data) and a form-logic test for the rejected edits. Storage tests for old saved data. The view is checked by hand in the browser.
