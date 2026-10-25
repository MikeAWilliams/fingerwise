# F01-S02: Show a note on the staff

- **Feature:** `../design.md`
- **Modules:** `src/render/staff`, `src/app`
- **Depends on:** F01-S01

## Story

As a player, I want to see a note drawn on a treble staff, so that I can practice reading it.

## Acceptance criteria

Each item must be checkable and numbered so progress checklists can refer to it. Do not edit these once work starts; raise a change instead.
- **AC1:** Given the app loads, when the page renders, then one treble staff with one note is shown immediately, with no start screen. The pitch is fixed; the random pick comes in F01-S04.
- **AC2:** Given a natural pitch, when it is rendered, then the note sits on the correct line or space for treble clef (checked for E4, F5 and C5).
- **AC3:** Given a pitch with a sharp, when it is rendered, then an accidental is drawn on the note, with no key signature (C major).
- **AC4:** Given A3 (the bottom of the range), when it is rendered, then the ledger lines it needs are drawn.
- **AC5:** Given the staff renderer, when it is called, then the clef, accidental handling and range limits are parameters, and only treble is exercised by the app.
- **AC6:** Given the staff renderer, then it imports nothing from `src/app` and no code in `src/core` imports it.
- **AC7:** Given the change, then VexFlow is added as a dependency, `make verify` passes, and the `modules/` doc for `render/staff` describes what was built.

## Notes

- VexFlow was agreed by the user on 2026-10-25 ([design](../design.md#risks-and-open-questions)).
- No note name, tablature or timer yet.
- The full clef and ledger-line matrix is tested in F01-S07. This story tests treble with a few pitches only.

## Test approach

Unit tests for the staff renderer's output (position, accidental, ledger lines) where VexFlow's output can be inspected. The staff looks right in the browser: checked by hand.
