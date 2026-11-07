# F04-S04: Judge settings

- **Feature:** `../design.md`
- **Modules:** `src/core/settings`, `src/app`, `data/settings/`, `docs/architecture/`
- **Depends on:** F03-S01, F03-S04

## Story

As a player, I want to turn microphone judging on and choose how strict it is, so that I can drill silently or have my playing graded.

## Acceptance criteria

Each item must be checkable and numbered so progress checklists can refer to it. Do not edit these once work starts; raise a change instead.
- **AC1:** Given `data/settings/defaults.json`, then it also holds judge (off) and tolerance in cents (default 40), and the strict defaults parse accepts it.
- **AC2:** Given stored or default settings where judge is missing or not a boolean, or the tolerance is missing or not a finite number within the allowed bounds (10 to 45), when validated, then that setting alone resets to its default and the other settings are kept.
- **AC3:** Given settings saved before this story, when the app loads, then they are kept and judge is off with the default tolerance.
- **AC4:** Given the settings view, then a "Microphone" section (F03-S01) offers a judge toggle and a tolerance input in cents limited to the allowed bounds. Changes are saved with the other settings under the same `localStorage` key.
- **AC5:** Given the Microphone section, then a help line under the judge toggle, always shown and not stored, explains that the microphone is open while drilling with judge on, that only the time before each reveal is analysed, and that audio is not stored or sent.
- **AC6:** Given the change, then `make verify` passes, the `settings` and `app` module docs describe what was built, and `data-formats.md` documents the new fields.

## Notes

- Mirrors F01-S08 and F03-S04: each field validated alone, strict defaults, lenient stored data.
- Nothing listens until S05; this story stores and edits the values. The "judging unavailable" notice belongs to S05 (its AC9), which is where unavailability is found.

## Test approach

Unit tests in `core/settings` for each rule and old saved data, and a form-logic test for the tolerance input. The view and the help line are checked by hand.
