# F07-S01: Wait for the correct note

- **Feature:** `../design.md`
- **Modules:** `src/app`, `docs/architecture/`
- **Depends on:** none

## Story

As a player working through a song with judging on, I want each note to wait until I play it correctly, so that a wrong note or a slow start does not move the tune on without me.

## Acceptance criteria

Each item must be checkable and numbered so progress checklists can refer to it. Do not edit these once work starts; raise a change instead.
- **AC1:** Given use song and judging are on and listening is running, when an incorrect tone is judged, then the card is not revealed: the verdict row (icon, "Incorrect", the judged note) and pitch graph show, no tone plays, no advance timer starts, and the card keeps listening.
- **AC2:** Given a wrong verdict is showing, when about 1 second passes with no new verdict, then the verdict row and graph clear and the card is shown as before the wrong note.
- **AC3:** Given a wrong verdict, then the tracker is reset at that moment, so the next verdict comes no sooner than the hold-off plus the settle time after it; a new verdict replaces the one showing.
- **AC4:** Given a waiting card, when the correct tone is judged, then the card reveals exactly as in F04 (correct verdict, graph, letter, tablature), listening closes, the F03 tone plays after its sound delay, and the next song note follows after the advance delay with auto-advance on, or on a tap with it off.
- **AC5:** Given a waiting card with no hint showing, when the player clicks, taps or presses a key, then the card is not dealt away (the hint behaviour is F07-S02); given a card revealed by a correct tone, a tap advances as in F05.
- **AC6:** Given use song is off, or judging is off, or listening is `opening`, `locked` or `unavailable`, then cards behave exactly as after F05.
- **AC7:** Given a waiting card, when Settings is opened, judging is turned off or the page is hidden, then the flow stops and releases the microphone as in F04, and the song starts again at its first note when the drill is shown.
- **AC8:** Given the change, then `make verify` passes, and the `app` module doc describes waiting in the card flow.

## Notes

- Until F07-S02 lands, a waiting card simply keeps waiting when the reveal delay runs out; S02 adds the hint and the skip.
- The verdict row and graph are the F04 ones; only when they show and clear changes.
- About 1 second is a constant to tune in the live check, not a setting.
- The grade is still exposed as in F04; nothing is stored.

## Test approach

Card-flow unit tests with fake timers, a fake listener and the real tone tracker fed fake readings: an incorrect tone keeps the card and clears after about 1 s, the tracker reset and its hold-off, a replacing verdict, a correct tone after misses reveals, plays the tone and advances, auto-advance off, no wait without a song, without judging, and while opening, locked or unavailable, and `stop()` while waiting. By hand with an ocarina: play a wrong note, see it flagged and cleared, play the right one, hear the tone and move on.
