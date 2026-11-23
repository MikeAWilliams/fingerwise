# F10: Scrolling song view

- **Status:** draft

> Shaped in dialog on 2026-11-23. It changes how [F08](../08-timed-play-along/design.md) and [F09](../09-timed-scoring/design.md) draw a timed song; the timing, scoring and lane behaviour of F09 are unchanged.

## Goal

A timed song is drawn as ordinary sheet music: every line of the song stacked down the page. The page scrolls so the line being played is always in view, with the next line below it to read ahead. When the song ends, the player can scroll up and down the whole score and see how each line was played: the score lane, fill and fault marks stay on every line.

## Behavior

**When it applies**

- With keep tempo applying (use song on, a valid song), as in [F08](../08-timed-play-along/design.md#behavior). Untimed song practice (F07) and random cards are unchanged.

**The score**

- All lines are drawn at once, one under another, each with its clef and key signature, and each with a score lane under it as in F09. The **bars per line** setting still sets how many bars go on a line.
- The two-row scheme of F08 goes away: no reused rows, no redraw when play moves to the next line, no arrow pointing up to the next line.
- The note to play is black and every other note, rest and tie is grey, as before. Notes already played stay grey; the lane carries the result.
- The count-in bar and first line are drawn as now, at the top.

**Following the song**

- Whenever play reaches a new line (including line 1 when the count-in starts), the page scrolls smoothly so that line sits about a third of the way down the screen. The next line is then visible below it.
- Manual scrolling is locked from the start tap until the song ends: touch, wheel, keys and scroll bars do nothing, so a stray swipe cannot lose the player's place.
- The playhead, fill and marks of F09 work as before, now on whichever row is current. Each row's fill stays on that row when play moves on.

**The pinned bar**

- A bar pinned to the bottom of the screen holds what F09 shows under the staff: the start prompt, the live readout while playing, the summary and tuning list at the end, and the legend (while judging is on). It stays in view however the page is scrolled.
- It is part of the layout, not an overlay hiding music: the page has room under the last line so the last line can scroll clear of it.

**The end**

- When the summary shows, the view stays on the last line and scrolling unlocks. The player scrolls up and down to review every line's lane, fill and fault marks.
- A tap on the start prompt (as in F08) starts again: the page scrolls to line 1, the lanes clear, and the count-in begins. Scrolling is locked again.

**Edge cases**

- A song with one line fits on the screen and does not scroll.
- Interruptions as in F08: opening Settings, turning judging off or hiding the page stops the song; showing the drill again shows line 1 at the top with the start prompt, and scrolling is unlocked while waiting to start.
- Judging off: the score scrolls and follows the song the same way; the lanes stay neutral and the bar shows "End of song".
- A scroll in progress when the song ends or stops is allowed to finish; the lock is lifted at once.
- Reduced motion: with the system's reduced-motion setting on, the page jumps to the line instead of scrolling smoothly.

## Out of scope

- Following or scrolling in untimed song practice or random cards.
- Letting the player scroll during play, or a "jump to current line" control.
- Storing scores, zooming the score, or a page-turn mode.
- Changing F09's scoring, lane colours, marks, playhead or summary content.

## Modules touched

- **staff (`src/render/staff`):** `drawSongLines` draws every line instead of two. `SongLayout` and its `rows` cover the whole song, with each row's `top`, so the app can scroll to a row. Rows are no longer reused; the up arrow and the "line after" logic go.
- **app (`Staff.tsx`, `Card.tsx`, `SongOverlay.tsx`, `lane.ts`, `playhead.ts`, `trace.ts`, `marks.ts`):** the staff is drawn once per song, not when the line on show changes. The lane, playhead, fill and marks take rows from the whole layout, and keep the fill of every row instead of dropping a row that scrolls out. `playheadPlace` and the row-change logic no longer jump between two rows, just to the next. New: a scroll-follow step (scroll the current line to a third of the way down) and a scroll lock that applies from the start tap to the summary.
- **app (`app.css`):** the pinned bottom bar and the room under the last line; the card is no longer a fixed two-row height.
- **app (`timed-flow.ts`):** unchanged in behaviour. It already reports the current note, from which the line is found with `lineOfNote`.

The drill engine, judge, coverage core, audio and settings are unchanged.

## Data

No new settings or stored state. The scroll position, the "a third down" fraction and the scroll duration are code constants.

## Risks and open questions

- **Locking scroll.** Blocking touch, wheel and keys reliably across Firefox, Chrome, Safari and Android needs checking, including that the lock is always lifted (summary, stop, Settings, page hidden, unmount). A stuck lock would trap the player on a page they can't scroll. Check how it is implemented (an overflow style on the root, or event handlers) before the story is written.
- **Long songs.** Every line is drawn at once in VexFlow, so a long tune draws many staves and keeps many SVG elements and lanes. Drawing once per song helps, but check a 100-bar tune on a mid-range phone, and the overlay's per-frame cost with many rows.
- **Which rows the overlay animates.** The frame loop currently handles two rows. With many rows, only the current row needs a per-frame playhead, while all rows keep their settled fill. Settle the shape of this when stories are written.
- **The pinned bar on small screens.** It takes height from a phone. The legend may need to wrap or collapse. Decide in the live check.
- **Smooth scroll timing.** A smooth scroll takes a few hundred milliseconds and must not lag the playhead, which jumps to the next line at once. The scroll is started a little before the line is reached, or is short. Tune in the live check.
- **Fill on re-render.** All rows must keep their fill when the layout is redrawn (a rotation, a resize). F09 rebuilds the settled paths from the finished segments; check this covers every row.
- **Resize and rotate during a run.** Rows move when the width changes. Following stays correct if the target is re-found from the layout each time. Decide whether a resize mid-run is supported or stops the song.
- **Spacing of lines.** Lines keep a fixed height with their lane; whether they need more space between them for readability is a visual choice for the live check.

## Stories

None yet. To be written after the design is read, in build order.
