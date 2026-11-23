# F10-S05: Scroll lock

- **Feature:** `../design.md`
- **Modules:** `src/app`, `docs/architecture/`
- **Depends on:** F10-S01, F10-S04

## Story

As a player following a song in time, I want scrolling by hand turned off while the song plays and back on when it ends, so that a stray swipe can't lose my place and I can review the whole song afterwards.

## Acceptance criteria

Each item must be checkable and numbered so progress checklists can refer to it. Do not edit these once work starts; raise a change instead.
- **AC1:** Given the start tap, then scrolling by hand is locked until the song ends or stops: touch, mouse wheel, keys (arrows, Page Up/Down, Space, Home, End) and the scroll bar do not move the page. The page still follows the song as in F10-S04.
- **AC2:** Given the summary shows, then the lock is lifted at once, and the player can scroll up and down the whole song to see every line's lane, fill and marks.
- **AC3:** Given the song stops because Settings is opened, judging is turned off or the page is hidden, then the lock is lifted. Given the drill goes away (the app unmounts the card), then the lock is lifted.
- **AC4:** Given the song starts again from the summary, then the lock applies again.
- **AC5:** Given the start prompt is waiting, then scrolling by hand works.
- **AC6:** Given the lock is on, then the Settings button in the header can be reached and works.
- **AC7:** Given the lock is put on or lifted on a desktop browser with a scroll bar, then the music does not shift sideways.
- **AC8:** Given the lock, then it is put on and lifted in one place, by one class on the root element, so every way out clears the same thing.
- **AC9:** Given random cards and untimed song cards, then scrolling is never locked.
- **AC10:** Given Firefox and Chrome on Linux, then AC1 to AC7 hold in both.
- **AC11:** Given the change, then `make verify` passes, and the `app` module doc describes the lock.

## Notes

- The lock is `overflow: hidden` on `<html>` with `scrollbar-gutter: stable` ([design](../design.md#risks-and-open-questions)).
- Android and Safari are checked when the app is checked on them, not in this story.
- A stuck lock traps the player, so AC3's cases are the ones to try hardest.

## Test approach

Unit tests for when the lock applies (ready, playing, summary, stopped, unmounted) from the timed flow's states. Checked by hand with `make dev` on Linux Firefox and Chrome: each input in AC1 during a song, then each way out in AC2 and AC3, confirming the page scrolls by hand afterwards.
