# F10: Scrolling song view

- **Status:** done

> Shaped in dialog on 2026-11-23. It changes how [F08](../08-timed-play-along/design.md) and [F09](../09-timed-scoring/design.md) draw a timed song; the timing, scoring and lane behaviour of F09 are unchanged.

## Goal

A timed song is drawn as ordinary sheet music: every line of the song stacked down the page. The page scrolls so the line being played is always in view, with the next line below it to read ahead. When the song ends, the player can scroll up and down the whole song and see how each line was played: the score lane, fill and fault marks stay on every line.

## Behavior

**When it applies**

- With keep tempo applying (use song on, a valid song), as in [F08](../08-timed-play-along/design.md#behavior). Untimed song practice (F07) and random cards are unchanged, apart from the [pinned header](#behavior), which applies everywhere.

**The music**

- All lines are drawn at once, one under another, each with its clef and key signature, and each with a score lane under it as in F09. The **bars per line** setting still sets how many bars go on a line.
- The two-row scheme of F08 goes away: no reused rows, no redraw when play moves to the next line, no arrow pointing up to the next line.
- The note to play is black and every other note, rest and tie is grey, as before. Notes already played stay grey; the lane carries the result.
- The count-in bar and first line are drawn as now, at the top.

**Following the song**

- Whenever play reaches a new line (including line 1 when the count-in starts), the page scrolls smoothly so that line sits about a third of the way down the screen. The next line is then visible below it. The page never scrolls above its top, so the first lines sit higher than a third down.
- Manual scrolling is locked from the start tap until the song ends: touch, wheel, keys and scroll bars do nothing, so a stray swipe cannot lose the player's place.
- The playhead, fill and marks of F09 work as before, now on whichever row is current. Each row's fill stays on that row when play moves on.

**The pinned header**

- The app header (the name and the Settings button) is pinned to the top of the screen everywhere in the app, so Settings stays in reach while scrolling is locked. Opening Settings stops a song as in F08: it is the player's way out mid-song.
- With use song on and a tune that has a `T:` line, the header also shows the tune's title, in timed and untimed practice alike.
- While keep tempo applies, the header also shows the tempo the song plays at, such as "♩ = 70", including F08's default of ♩ = 90 for a tune with no `Q:`.

**The pinned bar**

- A bar pinned to the bottom of the screen holds what F09 shows under the staff: the start prompt, the live readout while playing, the summary and tuning list at the end, and the legend (while judging is on). It stays in view however the page is scrolled.
- It is part of the layout, not an overlay hiding music: the page has room under the last line so the last line can scroll clear of it.

**The end**

- When the summary shows, the view stays on the last line and scrolling unlocks. The player scrolls up and down to review every line's lane, fill and fault marks.
- A tap on the start prompt (as in F08) starts again: the page scrolls to line 1, the lanes clear, and the count-in begins. Scrolling is locked again.

**Edge cases**

- A song with one line fits on the screen and does not scroll.
- Interruptions as in F08: opening Settings, turning judging off or hiding the page stops the song; showing the drill again shows line 1 at the top with the start prompt, and scrolling is unlocked while waiting to start.
- Judging off: the music scrolls and follows the song the same way; the lanes stay neutral and the bar shows "End of song".
- A scroll in progress when the song ends or stops is allowed to finish; the lock is lifted at once.
- Reduced motion: with the system's reduced-motion setting on, the page jumps to the line instead of scrolling smoothly.
- A resize or rotation during a song does not stop it. The page jumps (no smooth scroll) to put the current line back a third of the way down, and the lanes, fill and marks stay with their rows.

## Out of scope

- Following or scrolling in untimed song practice or random cards. They change only by the pinned header and its title.
- Letting the player scroll during play, or a "jump to current line" control.
- Storing scores, zooming the music, or a page-turn mode.
- Changing F09's scoring, lane colours, marks, playhead or summary content.
- Fitting song mode well on a phone. F10 targets desktop (decided 2026-11-23); phones only need no sideways scroll. A follow-up feature handles phones if song mode does not work well there.

## Modules touched

- **staff (`src/render/staff`):** `drawSongLines` draws every line instead of two. `SongLayout` and its `rows` cover the whole song, with each row's `top`, so the app can scroll to a row. Rows are no longer reused; the up arrow and the "line after" logic go.
- **app (`Staff.tsx`, `Card.tsx`, `SongOverlay.tsx`, `lane.ts`, `playhead.ts`, `trace.ts`, `marks.ts`):** the staff is drawn once per song, not when the line on show changes. The lane, playhead, fill and marks take rows from the whole layout, and keep the fill of every row instead of dropping a row that scrolls out. `playheadPlace` and the row-change logic no longer jump between two rows, just to the next. New: a scroll-follow step (scroll the current line to a third of the way down) and a scroll lock that applies from the start tap to the summary.
- **app (`app.css`):** the pinned bottom bar and the room under the last line; the card is no longer a fixed two-row height.
- **app (`App.tsx`, `app.css`):** the header is pinned to the top and shows the song's title and, while keep tempo applies, its tempo.
- **abc (`src/abc`) and song (`src/core/song`):** the adapter reads the tune's first `T:` line, and a song gains an optional title. The core treats it as text only.
- **app (`timed-flow.ts`):** unchanged in behaviour. It already reports the current note, from which the line is found with `lineOfNote`.

The drill engine, judge, coverage core, audio and settings are unchanged.

## Data

No new settings or stored state. The title comes from the stored song text each time it is parsed. The scroll position, the "a third down" fraction and the scroll duration are code constants.

## Risks and open questions

- **Locking scroll.** Blocking touch, wheel and keys reliably across Firefox, Chrome, Safari and Android needs checking, including that the lock is always lifted (summary, stop, Settings, page hidden, unmount). A stuck lock would trap the player on a page they can't scroll. Decided 2026-11-23: the lock is `overflow: hidden` on the root (`<html>`) while locked. It stops wheel, touch, keys and the scroll bar in one place, and the app's own scrolling still works. `scrollbar-gutter: stable` keeps the music from shifting sideways when the scroll bar hides. Lifting the lock removes one class, so every way out clears the same thing. Check live on Linux Firefox and Chrome; Android and Safari wait until the app is checked on them.
- **Long songs.** Every line is drawn at once in VexFlow, so a long tune draws many staves and keeps many SVG elements and lanes. Drawing once per song helps, but check a 100-bar tune on desktop (phones with the follow-up), and the overlay's per-frame cost with many rows.
- **Which rows the overlay animates.** Decided 2026-11-23: each frame touches only the current row: the playhead and the open (still-filling) fill. Just after a line break the open fill can still be on the row before, because fill trails the playhead by the scoring lag, so that row is updated too until it settles. A row's settled fill is written once, when its segments finish, into that row's own paths, and other rows are not touched. The per-frame cost does not grow with the length of the song.
- **The pinned header and bar on small screens.** Together they take height from a phone, landscape most of all. Deferred: F10 targets desktop ([out of scope](#out-of-scope)). A long title is cut short rather than wrapped at any width.
- **Smooth scroll timing.** The scroll starts when play reaches the new line (decided 2026-11-23): the line was already visible below the last one, so the playhead never jumps off screen while the page moves. Only the scroll's duration is left to tune in the live check.
- **Fill on re-render.** All rows must keep their fill when the layout is redrawn (a rotation, a resize). F09 rebuilds the settled paths from the finished segments; check this covers every row.
- **Resize and rotate during a run.** Supported (decided 2026-11-23, see [edge cases](#behavior)). Rows sit at new screen positions when the width changes, so the scroll target is found again from the layout each time instead of being kept from the last scroll.
- **Spacing of lines.** Lines keep a fixed height with their lane; whether they need more space between them for readability is a visual choice for the live check.

## Stories

In build order (written 2026-11-23). Each story is visible or testable on its own.

- [F10-S01: Pinned header](stories/F10-S01-pinned-header.md)
- [F10-S02: Every line drawn](stories/F10-S02-every-line-drawn.md)
- [F10-S03: Pinned bar](stories/F10-S03-pinned-bar.md)
- [F10-S04: Follow the song](stories/F10-S04-follow-the-song.md)
- [F10-S05: Scroll lock](stories/F10-S05-scroll-lock.md)
