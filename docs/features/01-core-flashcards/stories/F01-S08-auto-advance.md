# F01-S08: Auto-advance after the reveal

- **Feature:** `../design.md`
- **Modules:** `src/core/settings`, `src/app`, `data/settings/`
- **Depends on:** F01-S06

## Story

As a player, I want the next card to appear on its own a few seconds after the reveal, so that I can drill hands-free without clicking or pressing a key for every card.

## Acceptance criteria

Each item must be checkable and numbered so progress checklists can refer to it. Do not edit these once work starts; raise a change instead.
- **AC1:** Given `data/settings/defaults.json`, then it also holds auto-advance (on) and the advance delay (3 seconds), and the strict defaults parse accepts it.
- **AC2:** Given auto-advance is on and a card is revealed, by the reveal delay or by a click or key press, then the next card is shown after the advance delay with no input, its advance timer starts only once it is revealed, its reveal timer starts from zero, and its name and glyph are hidden.
- **AC3:** Given auto-advance is on and a revealed card is waiting out its advance delay, when the player clicks or presses a key, then the next card is shown at once and the pending advance timer is cancelled (it never fires a second advance).
- **AC4:** Given auto-advance is off, then a revealed card stays until a click or key press, as in F01-S04 AC7.
- **AC5:** Given a card is unrevealed, then no advance timer is running; one click or key press still does exactly one step (F01-S04 AC8).
- **AC6:** Given the settings view opens while an advance timer is pending, then that timer stops and no card is shown until the view closes (F01-S06 AC2, AC3).
- **AC7:** Given the settings view, then it offers an auto-advance toggle and an advance delay in seconds limited to 0.5 to 30 (the input's min, max and step enforce it; step 0.5). Changes are saved with the other settings under the same `localStorage` key.
- **AC8:** Given stored or default settings where auto-advance is missing or not a boolean, or the advance delay is missing or not a finite number from 0.5 to 30 inclusive, when validated, then that setting alone resets to its default, and the other settings are kept.
- **AC9:** Given settings saved before this story (no auto-advance fields), when the app loads, then the saved range, sharps flag and reveal delay are kept and auto-advance is on with a 3-second advance delay.
- **AC10:** Given the change, then `make verify` passes, the `modules/` docs for `settings` and `app` describe what was built, and `data-formats.md` documents the new fields of the defaults file and the stored key.

## Notes

- A bonus story added after feature 1 shipped.
- The existing "delay" is now called the **reveal delay** in docs and the settings view. Its stored field and validation do not change.
- The advance delay counts from the moment of the reveal, whether the reveal came from the timer or from input.
- No pause button: turning auto-advance off in settings is the way to stop hands-free mode.
- The drill engine is not touched; the timers live in the app layer.

## Test approach

Unit tests for the new validation rules in `core/settings` and for the card flow with fake timers and a fake random: auto-advance after the reveal (timed and early), early skip cancels the pending advance, no advance when off, `stop()` cancels a pending advance. Storage tests for old saved data without the new fields. The settings view and the hands-free flow are checked by hand in the browser.
