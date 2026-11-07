# F04-S04: Judge settings

- **Feature:** `../design.md`
- **Modules:** `src/core/settings`, `src/app`, `data/settings/`, `docs/architecture/`
- **Depends on:** F03-S01, F03-S04, F04-S01

## Story

As a player, I want to turn microphone judging on and choose how strict it is, so that I can drill silently or have my playing graded.

## Acceptance criteria

Each item must be checkable and numbered so progress checklists can refer to it. Do not edit these once work starts; raise a change instead.
- **AC1:** Given `data/settings/defaults.json`, then it also holds judge (off) and tolerance in cents (the default from the spike), and the strict defaults parse accepts it.
- **AC2:** Given stored or default settings where judge is missing or not a boolean, or the tolerance is missing or not a finite number within the allowed bounds (set by the spike, provisionally 10 to 100), when validated, then that setting alone resets to its default and the other settings are kept.
- **AC3:** Given settings saved before this story, when the app loads, then they are kept and judge is off with the default tolerance.
- **AC4:** Given the settings view, then a "Microphone" section (F03-S01) offers a judge toggle and a tolerance input in cents limited to the allowed bounds. Changes are saved with the other settings under the same `localStorage` key.
- **AC5:** Given the Microphone section, then the first time judge is turned on it explains that the microphone is used only while a card waits for its reveal and that audio is not stored or sent.
- **AC6:** Given the microphone is denied or missing when listening is needed, then the drill carries on as with judge off, and the card area shows a short notice that judging is unavailable and the Microphone section opens with the same notice. The setting stays on.
- **AC7:** Given the change, then `make verify` passes, the `settings` and `app` module docs describe what was built, and `data-formats.md` documents the new fields.

## Notes

- Mirrors F01-S08 and F03-S04: each field validated alone, strict defaults, lenient stored data.
- Nothing listens until S05; this story stores and edits the values and shows the notice when S05 reports `unavailable`.

## Test approach

Unit tests in `core/settings` for each rule and old saved data, and a form-logic test for the tolerance input. The view and notice are checked by hand.
