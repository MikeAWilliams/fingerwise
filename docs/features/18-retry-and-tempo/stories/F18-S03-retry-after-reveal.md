# F18-S03: Retry after the reveal

- **Feature:** `../design.md`
- **Modules:** `src/app` (`card-flow.ts`, `Card.tsx`, `judge-text.ts`, `Settings.tsx`, `App.tsx`), `docs/architecture/`
- **Depends on:** none

## Story

As a player, I want a missed flashcard to wait until I play it right, so that I practise the right fingering straight away instead of moving on with the wrong one in my hands.

## Acceptance criteria

Each item must be checkable and numbered so progress checklists can refer to it. Do not edit these once work starts; raise a change instead.
- **AC1:** Given Flashcards with judging on, the microphone running and auto-advance off, when a card reveals after a wrong note or after the reveal delay with nothing heard, then it shows the fingering as today, does not move on, and keeps listening for the card's note.
- **AC2:** Given a retry, when a settled tone within the tolerance is played, then the verdict line shows "Right, counted as a miss" and the next card is dealt after the advance delay.
- **AC3:** Given a retry, when a wrong note is played, then the verdict line and graph show that note and the card keeps listening.
- **AC4:** Given a retry, when the player taps or presses a key, then the next card is dealt at once.
- **AC5:** Given a retried card, then it is graded once, as a miss at its reveal, and playing it right afterwards grades nothing more. With smart sampling, its need moves towards 1 once.
- **AC6:** Given play note on, then readings during the reveal's tone and for 500 ms after it ends are ignored, so the tone is never heard as the right note.
- **AC7:** Given judging on, the microphone running and auto-advance off, when a card is played right before its reveal, then it reveals as correct and the next card is dealt after the advance delay, and never before the reveal's tone has ended.
- **AC8:** Given auto-advance off and judging off, or the microphone locked or unavailable, then a revealed card waits for a tap as today.
- **AC9:** Given auto-advance on, then cards behave as today, retry or not.
- **AC10:** Given judging on, then the Cards section shows under the auto-advance checkbox: "Off: keep playing a missed note until it is right".
- **AC11:** Given a retry, when Settings is opened, the page is hidden or judging is turned off, then the flow stops as today and nothing more is graded.
- **AC12:** Given the change, then `make verify` passes, and the `app` module doc describes the retry, its listening after the tone, and moving on after a correct first try with auto-advance off.

## Notes

- The sound sum rule ([settings](../../../architecture/modules/settings.md)) still applies only with auto-advance on. With it off, moving on waits for the advance delay or the tone's end, whichever is later, so no rule is needed.
- The retry uses the same tone test as before the reveal (the judge's settle time and tolerance) and the same hold-off.
- `onGraded` is still called at most once per card, from the reveal.

## Test approach

Card flow tests with a fake listener, tracker and timers: a wrong note, then the right one; a timed reveal, then the right one; a wrong note during the retry; a tap during the retry; readings during the tone and the hold-off ignored; a correct first try moving on after the advance delay and after a long tone; each of judging off, locked, unavailable and auto-advance on unchanged; `onGraded` called once with `miss`. By hand with `make dev` and an ocarina: miss a card, play it right, and check it moves on and counts as a miss in progress; with play note on, check the tone does not pass the card.
