# F01-S04: Next card and drill rules

- **Feature:** `../design.md`
- **Modules:** `src/core/drill`, `src/app`
- **Depends on:** F01-S03

## Story

As a player, I want a click or key press to reveal the card early and then show the next one, so that I can drill at my own pace.

## Acceptance criteria

Each item must be checkable and numbered so progress checklists can refer to it. Do not edit these once work starts; raise a change instead.
- **AC1:** Given a range and an include-sharps flag, when the pool is built, then it holds every natural between low and high, plus every sharp between them if sharps are included.
- **AC2:** Given a pool, when a pitch is drawn, then every pool pitch is reachable and each is equally likely (tested with an injected random source).
- **AC3:** Given a previous pitch and a pool of two or more, when a pitch is drawn, then it is never the previous pitch.
- **AC4:** Given a pool of one pitch, when a pitch is drawn, then that pitch is returned again.
- **AC5:** Given the app loads, then the first card is drawn by the drill over the instrument's full written range with sharps included.
- **AC6:** Given a card is unrevealed, when the player clicks or presses a key, then the card is revealed at once and the delay timer stops.
- **AC7:** Given a card is revealed, when the player clicks or presses a key, then the next card is shown, its timer starts from zero, and its name and glyph are hidden.
- **AC8:** Given one click or key press, then it does exactly one step: it never reveals and advances together.
- **AC9:** Given a chromatic pitch is drawn, then it shows with an accidental on the staff and the name shows the sharp.
- **AC10:** Given `src/core/drill`, then it imports only `src/core/pitch` and `src/core/instrument`, and takes no random source other than an injected one.
- **AC11:** Given the change, then `make verify` passes and the `modules/` doc for `drill` describes what was built.

## Notes

- There is no pause button and no grading.
- The one-note case cannot be reached from settings (see the design); the drill still has to handle it.
- Settings do not exist yet: range and flag are fixed until F01-S05.
- The static check that the drill imports nothing from clef, staff, `render` or `app` is part of F01-S07.

## Test approach

Unit tests for the pool and the draw, with an injected random source and a fake timer for the flow. Click and key behavior is checked by hand in the browser.
