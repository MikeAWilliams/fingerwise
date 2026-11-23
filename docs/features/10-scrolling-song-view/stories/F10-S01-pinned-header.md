# F10-S01: Pinned header

- **Feature:** `../design.md`
- **Modules:** `src/abc`, `src/core/song`, `src/app`, `docs/architecture/`
- **Depends on:** none

## Story

As a player practising a song, I want the header with Settings, the tune's title and its tempo always at the top of the screen, so that I know what I'm playing and can always reach Settings.

## Acceptance criteria

Each item must be checkable and numbered so progress checklists can refer to it. Do not edit these once work starts; raise a change instead.
- **AC1:** Given a tune with a `T:` line, when it is parsed, then the song carries the text of its first `T:` line, trimmed, as its title. Given no `T:` line, or one that is blank, then the song has no title.
- **AC2:** Given any card (random, untimed song or timed song) and a page taller than the screen, when the page is scrolled, then the header (the app's name and the Settings button) stays at the top of the screen and nothing scrolls over it or is hidden under it.
- **AC3:** Given use song is on with a valid song that has a title, then the header shows the title, in timed and untimed practice alike. Given no title, or use song off, then no title shows.
- **AC4:** Given keep tempo applies, then the header shows the tempo the song plays at as "♩ = N", N being quarter notes per minute, including "♩ = 90" for a tune with no `Q:`. Given keep tempo does not apply, then no tempo shows.
- **AC5:** Given a title too long for the header, then it is cut short with an ellipsis on one line, and the Settings button stays whole and in reach.
- **AC6:** Given phone and desktop widths (360x640, 640x360, 768x1024, 1024x768), then the header fits on one line with no sideways scroll.
- **AC7:** Given the Settings view is open, then the header behaves as it does today apart from staying at the top.
- **AC8:** Given the change, then `make verify` passes, and the `abc`, `song` and `app` module docs describe the title and the header.

## Notes

- The title is display text only: the core and the drill engine do nothing with it.
- Tempo comes from the song as F08 plays it ([F08 tempo and slots](../../08-timed-play-along/design.md#behavior)); a `Q:` given in another unit is shown as the quarter-note tempo the song plays at.
- Opening Settings still stops a timed song as in F08. Making Settings reachable mid-song matters once F10-S05 locks scrolling.

## Test approach

Unit tests for reading the title (present, absent, blank, two `T:` lines) and for the tempo text (given, default). The header is checked by hand with `make dev` at the widths above, with a long title, a tune with no `T:`, and a tune with no `Q:`.
