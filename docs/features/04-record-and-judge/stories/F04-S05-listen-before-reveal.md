# F04-S05: Listen before the reveal

- **Feature:** `../design.md`
- **Modules:** `src/app`, `src/audio`, `src/core/judge`, `docs/architecture/`
- **Depends on:** F04-S02, F04-S03, F04-S04

## Story

As a player, I want the app to listen while I play the note and reveal the answer as soon as it has heard me, so that I get a graded answer without clicking.

## Acceptance criteria

Each item must be checkable and numbered so progress checklists can refer to it. Do not edit these once work starts; raise a change instead.
- **AC1:** Given judge is off, then nothing listens, no microphone is requested, and the card flow, timers and tone behave exactly as after F03.
- **AC2:** Given judge is on and a new card is shown, then its listening window opens and the reveal delay starts as before. The microphone stream is opened once and stays open across cards while the drill shows; it is not reopened per card.
- **AC3:** Given a stable tone is heard before the reveal delay ends, then the judge's verdict (F04-S02) is made once, the reveal delay timer is cancelled, the card is revealed at once and the listening window closes. The verdict is available to the view as `correct | incorrect` with the heard frequency.
- **AC4:** Given the reveal delay ends with no stable tone, then the card reveals as before, the listening window closes, and the verdict is `none`.
- **AC5:** Given a click or key press reveals the card before any verdict, then the verdict is `none` and the listening window closes.
- **AC6:** Given a card is revealed, then readings are ignored until the next card's window opens (the F03 tone is never judged), and the F03 tone and the advance delay behave as in F03-S05 and F01-S08.
- **AC7:** Given the settings view opens, judge is turned off, or the page is hidden, then the microphone stream is stopped and released, and the browser's recording indicator goes away.
- **AC8:** Given the next card, then the previous card's verdict is gone, the stability logic is reset, and the hold-off starts again at the opening of its listening window.
- **AC9:** Given the microphone is denied or missing when listening is needed, then the flow behaves as with judge off, the card area shows a short notice that judging is unavailable, and the Microphone section (F04-S04) shows the same notice and is open when the settings view opens. The judge setting stays on.
- **AC10:** Given a detector or listener failure, then nothing throws into the card flow and the card reveals by its normal timer.
- **AC11:** Given judge is on and audio is still locked (no click, tap or key press yet), then the card area shows "Tap or press a key to start listening" and nothing listens. The first gesture unlocks audio and acts as usual (it reveals this card with verdict `none`), and listening starts from the next card.
- **AC12:** Given judge is on and the microphone stream is still opening (on load, after the settings view closes, or when the page is shown again, including any permission prompt), then the card is shown at once but its reveal delay and listening window start only when the stream is running, or when it fails (then as AC9). A click or key press still reveals early as usual.
- **AC13:** Given judge is on and the page is shown again after being hidden, then the stream reopens and a fresh card is dealt, as when the settings view closes, with its reveal delay waiting as in AC12. Given judge is off, then hiding and showing the page changes nothing from F03.
- **AC14:** Given the change, then `make verify` passes and the `app` module doc describes the flow, including when the microphone stream is open and when the listening window is.

## Notes

- The card flow stays plain TypeScript with injected timers and an injected listener, like the existing `createCardFlow`.
- Grading belongs to the card flow's state (`correct | incorrect | none`), so feature 6 can read it later. Nothing is stored.
- Opening the microphone may take a moment (and the first time, a permission prompt); AC12 keeps that out of the reveal delay.

## Test approach

Card-flow unit tests with fake timers, a fake listener and fake readings: verdict early cancels the reveal timer, no tone reveals as `none`, early click reveals as `none`, one verdict per card, stop and release on settings and hide, failure paths. By hand with a real ocarina on the target matrix, with the browser's microphone processing off (F04-S03): correct and wrong notes, background talk and room noise, a note held through the breath onset, a note during the hold-off.
