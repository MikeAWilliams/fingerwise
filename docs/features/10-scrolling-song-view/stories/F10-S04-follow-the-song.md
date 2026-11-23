# F10-S04: Follow the song

- **Feature:** `../design.md`
- **Modules:** `src/app`, `docs/architecture/`
- **Depends on:** F10-S03

## Story

As a player following a song in time, I want the page to scroll by itself so the line I'm playing stays in view with the next line below it, so that I never lose my place or take my hands off the ocarina.

## Acceptance criteria

Each item must be checkable and numbered so progress checklists can refer to it. Do not edit these once work starts; raise a change instead.
- **AC1:** Given a song is playing, when play reaches a new line, then the page scrolls smoothly so that line sits about a third of the way down the space between the header and the bar, with the next line visible below it.
- **AC2:** Given the start tap, then the page scrolls to the first line in the same way before the count-in, from wherever it was scrolled.
- **AC3:** Given a line near the top or bottom of the page, then the page never scrolls past its top or end; the line sits where the page allows.
- **AC4:** Given play reaches a new line, then the scroll starts at that moment, not before; the playhead and the line being played are on screen throughout the scroll.
- **AC5:** Given the system's reduced-motion setting is on, then the page jumps to the line instead of scrolling smoothly.
- **AC6:** Given the window is resized or the phone rotated during a song, then the page jumps, without a smooth scroll, to put the current line back about a third of the way down.
- **AC7:** Given the summary shows, then the page stays on the last line. Given the song starts again, then it scrolls back to the first line.
- **AC8:** Given the song stops (Settings, judging off, the page hidden), when the drill is shown again, then the first line is at the top with the start prompt.
- **AC9:** Given a scroll in progress when the song ends or stops, then it is allowed to finish.
- **AC10:** Given a song that fits on the screen, then the page does not scroll.
- **AC11:** Given judging is off, then the page follows the song the same way.
- **AC12:** Given random cards and untimed song cards, then the page never scrolls by itself.
- **AC13:** Given the change, then `make verify` passes, and the `app` module doc describes following the song.

## Notes

- The target is found from the layout each time, never kept from the last scroll, so it stays right after a resize.
- The "a third down" fraction and the scroll's duration are code constants; the duration is tuned in this story's live check.
- Scrolling by hand still works in this story; F10-S05 locks it.

## Test approach

Unit tests for the scroll target from a layout, a screen height, the header and bar heights and a line (middle line, first line, last line, a song that fits). Checked by hand with `make dev` in a desktop window (1024x768 and larger) on a tune of at least six lines: following, restart, a window resize mid-song, and with reduced motion turned on in the system.
