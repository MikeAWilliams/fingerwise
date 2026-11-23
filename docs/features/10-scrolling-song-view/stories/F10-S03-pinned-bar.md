# F10-S03: Pinned bar

- **Feature:** `../design.md`
- **Modules:** `src/app`, `docs/architecture/`
- **Depends on:** F10-S02

## Story

As a player following a song in time, I want the start prompt, what the microphone hears, the summary and the legend always at the bottom of the screen, so that I can see them wherever the music is scrolled.

## Acceptance criteria

Each item must be checkable and numbered so progress checklists can refer to it. Do not edit these once work starts; raise a change instead.
- **AC1:** Given keep tempo applies, then a bar pinned to the bottom of the screen holds what F09 shows under the staff: the start prompt before the song, the live readout while playing, the summary and tuning list at the end, and the legend while judging is on. None of these shows under the staff any more.
- **AC2:** Given a song longer than the screen, when the page is scrolled to any point, then the bar stays at the bottom of the screen.
- **AC3:** Given the page is scrolled to its end, then the last line and its lane sit fully above the bar: the page has room under the last line, and the bar never covers music.
- **AC4:** Given the bar's content changes (prompt to readout to summary and tuning list), then the bar may change height but the music above it does not jump.
- **AC5:** Given a tap on the start prompt or on the summary, then the song starts as in F08.
- **AC6:** Given judging is off, then the bar shows the start prompt, nothing while playing, and "End of song" at the end, with no legend.
- **AC7:** Given a desktop window (1024x768 and larger), then the header, the bar and at least two full lines with their lanes are on screen together. Given phone widths (360x640, 640x360), then nothing scrolls sideways; how well it fits a phone is left to a follow-up.
- **AC8:** Given random cards and untimed song cards, then nothing changes.
- **AC9:** Given the change, then `make verify` passes, and the `app` module doc describes the pinned bar.

## Notes

- The bar is part of the layout, not an overlay over the music ([design](../design.md#behavior)).
- F10 targets desktop. Fitting the header, bar and music on a phone is a follow-up if song mode does not work well there ([design](../design.md#out-of-scope)).

## Test approach

Checked by hand with `make dev` at 1024x768 and a larger desktop window, and for sideways scroll only at the phone widths above: before, during and after a song, judging on and off, scrolled to the top and to the end.
