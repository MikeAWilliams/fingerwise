# F19-S01: Tuner mode and listening

- **Feature:** `../design.md`
- **Modules:** `src/core/settings`, `src/app` (`App.tsx`, `Settings.tsx`, `settings-form.ts`, a new tuner flow, `Card.tsx`, `judge-text.ts`), `docs/architecture/`
- **Depends on:** none

## Story

As a player, I want a Tuner mode that listens to me, so that I can play freely without a card or a song.

## Acceptance criteria

Each item must be checkable and numbered so progress checklists can refer to it. Do not edit these once work starts; raise a change instead.
- **AC1:** Given Settings, then the Mode list offers Flashcards, Song and Tuner, in that order.
- **AC2:** Given the mode is Tuner, then only the Microphone section is shown, without the judge checkbox and with the tolerance. Switching to another mode and back keeps every other section's values.
- **AC3:** Given the mode is Tuner and Settings is closed, then the header shows the app name and the Settings button only, with no title, tune list, tempo or Play song.
- **AC4:** Given the mode is Tuner, Settings closed and the page visible, then the microphone is opened, whatever the judge checkbox says, and the reveal area shows "Play a note" with an empty staff.
- **AC5:** Given the microphone is locked, then the area shows "Tap or press a key to start listening", and a tap or key opens it. Given it is unavailable, then the area shows `JUDGE_UNAVAILABLE`.
- **AC6:** Given Tuner, when Settings is opened or the page is hidden, then the microphone is released, and it reopens when Settings closes or the page shows again.
- **AC7:** Given Tuner, then no tone is played, nothing is graded and no progress is stored.
- **AC8:** Given a stored `mode` of `"tuner"`, then it loads as Tuner. `parseDefaults` accepts it. `smartSamplingApplies`, `tempoApplies`, `singleNoteApplies`, `metronomeApplies` and `scoringAfterApplies` are false for it.
- **AC9:** Given the change, then `make verify` passes, and the `settings` and `app` module docs and the glossary's Mode entry describe Tuner.

## Notes

- [ADR 0014](../../../architecture/decisions/0014-tuner-mode.md) adds the mode. The rest of [ADR 0012](../../../architecture/decisions/0012-two-practice-modes.md) stands.
- Listening follows the existing Flashcards rules: the stream is keyed on Settings being closed and the page being visible.

## Test approach

Settings tests for the new mode value (strict parse, round trip, the "applies" truth tables). Settings view tests for the sections shown. Flow tests with a fake listener for open, locked, unavailable, Settings opening and the page hiding. By hand with `make dev`: switch to Tuner, check the header and the prompt, deny and then allow the microphone.
