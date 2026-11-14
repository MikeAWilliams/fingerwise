# F07-S02: Hint while waiting

- **Feature:** `../design.md`
- **Modules:** `src/app`, `docs/architecture/`
- **Depends on:** F07-S01

## Story

As a player stuck on a song note, I want the fingering shown as a hint while the app keeps listening, and a way to skip, so that I can learn the note and still play it, or move on.

## Acceptance criteria

Each item must be checkable and numbered so progress checklists can refer to it. Do not edit these once work starts; raise a change instead.
- **AC1:** Given a waiting card (F07-S01), when the reveal delay runs out, then the note letter and tablature show as a hint, the card keeps listening, no tone plays and no advance timer starts.
- **AC2:** Given a waiting card with no hint, when the player clicks, taps or presses a key, then the hint shows at once, as in AC1.
- **AC3:** Given a card showing the hint, when a wrong tone is judged, then its verdict row and graph show with the hint and clear as in F07-S01 AC2, and the hint stays.
- **AC4:** Given a card showing the hint, when the correct tone is judged, then the card reveals as in F07-S01 AC4.
- **AC5:** Given a card showing the hint, when the player clicks, taps or presses a key, then the next song note is dealt at once and no tone plays for the skipped card.
- **AC6:** Given the hint shows, then the staff does not move, and the hint with a wrong verdict and graph fits the judging reveal area at the F02 layout sizes.
- **AC7:** Given the change, then `make verify` passes, and the `app` module doc describes the hint and the skip.

## Notes

- A held key must not run through cards (key repeat is already ignored).
- One tap does one thing: hint, then skip, never both.

## Test approach

Card-flow unit tests with fake timers: the hint at the reveal delay, the early hint by `step()`, listening still open after the hint, a wrong verdict during the hint, a correct tone after the hint, the skip with no tone and no extra advance. By hand at 360x640, 640x360 and 768x1024: hint, wrong note under the hint and skip, with the staff steady.
