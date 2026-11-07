# F05-S04: Cards follow the song

- **Feature:** `../design.md`
- **Modules:** `src/app`, `docs/architecture/`
- **Depends on:** F05-S01, F05-S03

## Story

As a player, I want the cards to follow my tune note by note, so that I can learn to finger a song I want to play.

## Acceptance criteria

Each item must be checkable and numbered so progress checklists can refer to it. Do not edit these once work starts; raise a change instead.
- **AC1:** Given use song is off, then the card flow draws random cards from the pool exactly as in F01 to F04.
- **AC2:** Given use song is on with a valid song, then the first card is the song's first note and each next card is the following note.
- **AC3:** Given the last note of the song has been revealed and advanced from, then the next card is the song's first note again.
- **AC4:** Given a song with the same note twice in a row, then both cards are shown, one after the other.
- **AC5:** Given the settings view is closed, or the page is loaded, then the song starts at its first note.
- **AC6:** Given use song is on, then the reveal delay, the early reveal, the reveal, the F03 tone, the F04 judging and the advance delay behave exactly as for random cards.
- **AC7:** Given use song is on, then the drill engine and the card flow draw nothing at random.
- **AC8:** Given the change, then `make verify` passes and the `app` module doc describes the song source in the card flow.

## Notes

- The card flow takes a "next pitch" source; the random draw and the song are two sources, so the flow does not know which is in use.
- A song that changed in the settings view takes effect when the view closes, as with the other settings.
- No indicator of the song position is required.
- abcjs is lazy-loaded (F05-S02 AC10), so with a saved song in use the first card waits until the song is parsed; nothing is shown in the meantime.

## Test approach

Card-flow unit tests with fake timers: the order, the loop, repeated notes, restart on a new flow, and a check that a fake random is never called with a song. By hand: paste a short tune with flats, a tune out of range (rejected with its list), and watch the cards follow it; change the song and see it restart.
