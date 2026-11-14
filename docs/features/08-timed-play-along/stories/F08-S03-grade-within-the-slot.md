# F08-S03: Grade within the slot

- **Feature:** `../design.md`
- **Modules:** `src/app`, `docs/architecture/`
- **Depends on:** F08-S02

## Story

As a player playing a song in time with judging on, I want each note graded as I play it and a score at the end, so that I know how well I kept up.

## Acceptance criteria

Each item must be checkable and numbered so progress checklists can refer to it. Do not edit these once work starts; raise a change instead.
- **AC1:** Given use song, keep tempo and judging on, when the player taps to start, then the microphone stream is started as in F04, and the count-in starts once the start resolves, whatever the result. The stream stays open across the whole song.
- **AC2:** Given the stream is running at a slot's start and the slot is at least the minimum graded length, then the tracker is reset at the slot's start with the timed hold-off, and the slot is the listening window.
- **AC3:** Given a listening slot, when a correct tone is judged, then the verdict (icon, "Correct", the judged note) shows at once, without the letter, tablature or pitch graph, and the card stays until the slot ends.
- **AC4:** Given a listening slot, when an incorrect tone is judged, then "Incorrect" with the judged note shows and the card keeps listening; a correct tone later in the same slot replaces it and the note counts as correct.
- **AC5:** Given a slot ends, then the note is correct if a correct tone was heard in it, and missed otherwise; a missed note shows nothing extra, and readings after the slot's end do not count for it.
- **AC6:** Given a slot shorter than the minimum graded length, or one that starts while the stream is not running (`opening`, `locked`, `unavailable`), then it is shown in time, not listened to, shows no verdict and is not counted.
- **AC7:** Given the last slot ends, then the summary reads "N of M correct", where M counts graded notes only; with no graded notes it reads "End of song". A tap starts again as in F08-S02.
- **AC8:** Given the timed hold-off and the minimum graded length, then they are named constants in the app, starting at 0 ms and 300 ms, to be tuned in the live check.
- **AC9:** Given a timed song stops (Settings, judging off, page hidden), then the microphone is released as in F04.
- **AC10:** Given the change, then no grade is stored and smart sampling (F06) is unaffected; random cards and F07 waiting are unchanged.
- **AC11:** Given the change, then `make verify` passes, and the `app` module doc describes grading in timed songs.

## Notes

- With a 0 ms hold-off, holding a note into a repeat of the same pitch counts the repeat as correct. That is accepted.
- The judge is unchanged; the hold-off is already a tracker option.

## Test approach

Card-flow tests with a fake audio clock, a fake listener and the real tone tracker fed fake readings: correct, incorrect then correct, nothing heard, a tone spanning a slot boundary, a short slot, the stream opening late, the summary counts, stop releasing the microphone. By hand with an ocarina: play the example song well, then badly, and check the score; try a tune with eighth notes at a slow and a fast `Q:`. This is the live check for the two constants.
