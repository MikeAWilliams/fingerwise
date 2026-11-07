# F03-S05: Play the note after the reveal

- **Feature:** `../design.md`
- **Modules:** `src/app`, `src/audio`, `docs/architecture/`
- **Depends on:** F03-S03, F03-S04

## Story

As a player, I want to hear the note shortly after the card is revealed, so that I can check my fingering by ear.

## Acceptance criteria

Each item must be checkable and numbered so progress checklists can refer to it. Do not edit these once work starts; raise a change instead.
- **AC1:** Given play note is on and a card is revealed, by the reveal delay or by a click or key press, then after the sound delay the tone for the card's sounding pitch (written pitch plus the instrument's transposition) plays for the sound duration and then stops.
- **AC2:** Given a card that is not revealed, then no tone plays and no sound timer runs.
- **AC3:** Given a revealed card whose tone is pending or playing, when the player clicks or presses a key to advance, then the pending tone is cancelled or the playing tone is stopped, and the next card starts silent.
- **AC4:** Given auto-advance is on, then the tone has ended before the automatic advance, and the advance still happens exactly as in F01-S08.
- **AC5:** Given the settings view opens while a tone is pending or playing, then it is cancelled or stopped.
- **AC6:** Given play note is off, then no tone ever plays.
- **AC7:** Given auto-advance is off, then the tone plays once per reveal and the card stays.
- **AC8:** Given the first click, tap or key press on the page, then audio is unlocked by it. A tone that was due before any gesture is skipped, and later cards play normally.
- **AC9:** Given audio is unavailable or fails, then the drill behaves exactly as without this feature and shows nothing extra.
- **AC10:** Given a click or key press that reveals the card when the sound delay is 0, then the tone starts at once and audibly on that gesture (it is the first gesture, audio is unlocked by it).
- **AC11:** Given the change, then `make verify` passes and the `app` and `audio` module docs describe the flow, and the autoplay behavior is documented.

## Notes

- The tone timers start from the reveal, whichever way it came, like the advance timer in F01-S08.
- The drill engine and `src/core` are untouched apart from what S01 and S03 add.
- Audio is checked by ear in the browser; there is no test of actual sound.

## Test approach

Card-flow unit tests with fake timers and a fake tone player: tone start and stop times after a timed and an early reveal, cancel on early advance, on settings open and on `stop()`, nothing when play note is off, nothing before the reveal, and a player that throws does not break the flow. By hand on the target matrix: tone pitch matches a tuner or piano (sounding A4 to F6 for written A3 to F5), delay and duration feel right, nothing rings over the next card, the first-gesture behavior on phone and desktop.
