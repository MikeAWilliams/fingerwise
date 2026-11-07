# F04-S05: Listen before the reveal

- **Feature:** `../design.md`
- **Modules:** `src/app`, `src/audio`, `src/core/judge`, `docs/architecture/`
- **Depends on:** F04-S02, F04-S03, F04-S04

## Story

As a player, I want the app to listen while I play the note and reveal the answer as soon as it has heard me, so that I get a graded answer without clicking.

## Acceptance criteria

Each item must be checkable and numbered so progress checklists can refer to it. Do not edit these once work starts; raise a change instead.
- **AC1:** Given judge is off, then nothing listens, no microphone is requested, and the card flow, timers and tone behave exactly as after F03.
- **AC2:** Given judge is on and a new card is shown, then listening starts and the reveal delay starts as before.
- **AC3:** Given a stable tone is heard before the reveal delay ends, then the judge's verdict (F04-S02) is made once, the reveal delay timer is cancelled, the card is revealed at once and listening stops. The verdict is available to the view as `correct | incorrect` with the heard frequency.
- **AC4:** Given the reveal delay ends with no stable tone, then the card reveals as before, listening stops, and the verdict is `none`.
- **AC5:** Given a click or key press reveals the card before any verdict, then the verdict is `none` and listening stops.
- **AC6:** Given a card is revealed, then no microphone use continues during the reveal, and the F03 tone and the advance delay behave as in F03-S05 and F01-S08.
- **AC7:** Given the settings view opens, judge is turned off, or the page is hidden, then listening stops and the microphone is released.
- **AC8:** Given the next card, then the previous card's verdict is gone, the stability logic is reset, and the hold-off starts again.
- **AC9:** Given the microphone is unavailable, then the flow behaves as with judge off and the S04 notice shows.
- **AC10:** Given a detector or listener failure, then nothing throws into the card flow and the card reveals by its normal timer.
- **AC11:** Given the change, then `make verify` passes and the `app` module doc describes the flow, including when the microphone is open.

## Notes

- The card flow stays plain TypeScript with injected timers and an injected listener, like the existing `createCardFlow`.
- Grading belongs to the card flow's state (`correct | incorrect | none`), so feature 6 can read it later. Nothing is stored.
- Opening the microphone for the first card may take a moment (permission prompt); the reveal delay should not count the prompt. Decide in the breakdown whether to start the delay after the listener is running, and state it in the module doc.

## Test approach

Card-flow unit tests with fake timers, a fake listener and fake readings: verdict early cancels the reveal timer, no tone reveals as `none`, early click reveals as `none`, one verdict per card, stop and release on settings and hide, failure paths. By hand with a real ocarina on the target matrix: correct and wrong notes, background talk and room noise, a note held through the breath onset, a note during the hold-off.
