# F06-S04: Cards drawn by need

- **Feature:** `../design.md`
- **Modules:** `src/app` (`card-flow.ts`, `App.tsx`), `docs/architecture/`
- **Depends on:** F06-S01, F06-S02, F06-S03

## Story

As a player drilling with judging on, I want the notes I miss to come up more often and the ones I know less often, learned from how I play, so that my practice goes where it is needed.

## Acceptance criteria

Each item must be checkable and numbered so progress checklists can refer to it. Do not edit these once work starts; raise a change instead.
- **AC1:** Given smart sampling on, judging on and use song off ("applies"), when a random card is dealt, then its pitch comes from the weighted draw over the pool with the current scores, never the previous pitch (unless the pool is one pitch).
- **AC2:** Given smart sampling applies and the microphone stream is running when a card reveals, when the verdict is `correct`, then a correct grade is applied to that pitch; when it is `incorrect` or `none` (timed or by a tap), then a miss is applied. The new scores are saved at once.
- **AC3:** Given smart sampling applies, when a card reveals while listening is `opening`, `locked` or `unavailable`, then no grade is applied and nothing is saved; draws are still weighted.
- **AC4:** Given a grade has been applied, when the next card is dealt, then the draw uses the updated scores.
- **AC5:** Given smart sampling off, judging off, or use song on, then random cards are drawn as before this feature, song cards keep tune order (including F07 waiting), and no scores are changed or written.
- **AC6:** Given scores exist, when the range bounds or the sharps setting change, then no score is lost: pitches still in the pool keep theirs, pitches newly in the pool use their kept score or 1, and pitches left out keep theirs for later.
- **AC7:** Given a reload, then the scores from before the reload are used.
- **AC8:** Given the change, then `make verify` passes and `app.md` describes the pitch source, when grades apply and how they are saved.

## Notes

- One grade per card at most: the reveal is the only grading point.
- The tone during the reveal is never judged (F04), so it cannot grade.
- Tuning of the constants happens in the live check, not here.

## Test approach

Card-flow unit tests with fake timers, a fake random and the fake listener: weighted draws, a grade per verdict, none for `opening`/`locked`/`unavailable`, the next draw using the update, no grades when off or for song cards. By hand with a real ocarina: after a few minutes of deliberately missing one note, it comes up clearly more often; notes played right come up less; reloading keeps this; turning the setting off brings back even draws.
