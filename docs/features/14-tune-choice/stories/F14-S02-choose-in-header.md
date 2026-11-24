# F14-S02: Choosing the tune in the header

- **Feature:** `../design.md`
- **Modules:** `src/app` (`App.tsx`, `header-text.ts`, `app.css`), `docs/architecture/`
- **Depends on:** F14-S01, F13-S02

## Story

As a player, I want to pick a tune from a list in the header, so that I can switch to another tune in my set without opening Settings.

## Acceptance criteria

Each item must be checkable and numbered so progress checklists can refer to it. Do not edit these once work starts; raise a change instead.
- **AC1:** Given use song on and a saved text with two or more tunes, then the pinned header shows a native drop-down list where the title is otherwise shown, with the chosen tune selected.
- **AC2:** Given the list, then it holds every tune in text order. A tune with a `T:` line is shown by its title, and one without is shown as "Tune N", N being its position in the text.
- **AC3:** Given a long title, then the list stays on one line, cut short with an ellipsis, and the page does not scroll sideways at phone width.
- **AC4:** Given one tune, then the header is as it is today: the title, or nothing without a `T:`. Given use song off, or Settings open, then no list is shown.
- **AC5:** Given a tune is chosen from the list, then it becomes the song and is saved as the chosen tune, so it is still chosen after a reload. The header's tempo is the new tune's.
- **AC6:** Given a tune is chosen, then the app behaves as on closing Settings with a new song: an untimed card is left, a finished run's score (lanes, summary, tuning list, analysis) is cleared, and the app starts at the new tune's first note: with keep tempo on, with the start prompt; with keep tempo off, the first song card, opening the microphone with judging on.
- **AC7:** Given the tune that is already chosen is chosen again, then nothing changes.
- **AC8:** Given a timed run is counting in, playing, or listening past the end, then the list is greyed out and cannot be changed. Given the start prompt, a finished run's score, or untimed song practice, then it can be used.
- **AC9:** Given playback ([F13](../../13-play-the-song/design.md)), when a tune is chosen, then playback stops and the new tune starts as in AC6.
- **AC10:** Given the list is opened or used by click, tap or key, then that does not also start a timed run or step a card.
- **AC11:** Given the change, then `make verify` passes, and the `app` module doc describes the list, when it shows and is greyed out, and what choosing a tune does.

## Notes

- Built after F13, so AC9 and the greying rule match the Play song button. If F14 is scheduled before F13, raise it with the user: AC9 then cannot be checked.
- The list is a form control in the header, so the document click and key handlers that start a run or step a card must ignore it, as they ignore the Settings button.

## Test approach

`header-text` tests for when the list shows, its labels and order, and when it is greyed out. App tests that choosing a tune saves it, restarts at the first note, clears a finished score, stops playback, and does not start a run. By hand with `make dev`: a text of three tunes, one without a `T:`; switch tunes in each mode, try to switch mid-run, reload and check the choice is kept, and check a long title at phone width.
