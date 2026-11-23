# F10: Your checks

What you do by hand once F10 is built. `fw-execute` does **not** stop between stories: it builds S01 to S05 in one run and then stops for you. Do this whole file then, and tell Claude the outcome.

This file is temporary like [`F10.md`](F10.md) and is deleted before the merge. Claude moves anything that should last, such as the tuned constants, into the module docs first.

## How to record results

- **Here, in this file.** Tick each box you've checked and fill in each section's `Observed:` line, even if it's only "all fine". When something is wrong, say what you did and what you saw.
- **Screenshots** of anything that looks wrong go in `samples/f10/` (untracked), named `<section>-<what>.png`, for example `lock-stuck-after-settings.png`.
- Most checks need no playing, and many run with Judge my playing off. Where playing is asked, slow and imperfect is fine: a few mistakes give the lanes some marks to look at.

## Setup

- `make dev`, then open http://localhost:5173/fingerwise/ in Firefox and in Chrome on Linux.
- Settings unless a check says otherwise: Use song, Keep tempo and Metronome on, Bars per line 2, Judge my playing on.
- **Window sizes:** Chrome DevTools device toolbar (Ctrl+Shift+M) set to 1024x768, then a normal large window. Phone sizes (360x640, 640x360) only for "no sideways scroll".
- **Scroll bars always visible**, so a sideways shift shows: in Firefox set `widget.gtk.overlay-scrollbars.enabled` to false in `about:config` (or GNOME Settings, Accessibility, Always Show Scroll Bars). Chrome on Linux shows them already.
- **Reduced motion:** Firefox `about:config`, add `ui.prefersReducedMotion` = 1; Chrome DevTools, Rendering panel, "Emulate CSS prefers-reduced-motion: reduce". Turn it off again afterwards.

### Tunes

Paste into the Song box when a check asks for one.

**Scroll check** (six lines at 2 bars per line; a tie over the first line break; lines 3 and 6 start with a rest):

```
X:1
T:Scroll check
M:4/4
L:1/4
Q:70
K:C
C D E F | G4- | G E D C | D2 z2 | z E F G | E2 D2 |
C D E2 | F E D2 | E2- E D | C4 | z D E F | G4 |]
```

**Long title, other tempo unit** (should show `♩ = 60`):

```
X:1
T:A very long title that keeps going well past the width of any screen you have
M:6/8
L:1/8
Q:3/8=40
K:C
C2 D E2 F | G3 G3 | E2 D C3 |]
```

**No title, no tempo** (should show no title and `♩ = 90`):

```
X:1
M:4/4
L:1/4
K:C
C D E F | G4 |]
```

The last one also fits on one line, for the "does not scroll" check.

**100 bars** (no playing; judging off):

```
X:1
T:Hundred bars
M:4/4
L:1/4
Q:180
K:C
C D E F | G A G F | E D C D | E2 E2 |
C D E F | G A G F | E D C D | E2 E2 |
C D E F | G A G F | E D C D | E2 E2 |
C D E F | G A G F | E D C D | E2 E2 |
C D E F | G A G F | E D C D | E2 E2 |
C D E F | G A G F | E D C D | E2 E2 |
C D E F | G A G F | E D C D | E2 E2 |
C D E F | G A G F | E D C D | E2 E2 |
C D E F | G A G F | E D C D | E2 E2 |
C D E F | G A G F | E D C D | E2 E2 |
C D E F | G A G F | E D C D | E2 E2 |
C D E F | G A G F | E D C D | E2 E2 |
C D E F | G A G F | E D C D | E2 E2 |
C D E F | G A G F | E D C D | E2 E2 |
C D E F | G A G F | E D C D | E2 E2 |
C D E F | G A G F | E D C D | E2 E2 |
C D E F | G A G F | E D C D | E2 E2 |
C D E F | G A G F | E D C D | E2 E2 |
C D E F | G A G F | E D C D | E2 E2 |
C D E F | G A G F | E D C D | E2 E2 |
C D E F | G A G F | E D C D | E2 E2 |
C D E F | G A G F | E D C D | E2 E2 |
C D E F | G A G F | E D C D | E2 E2 |
C D E F | G A G F | E D C D | E2 E2 |
C D E F | G A G F | E D C D | E2 E2 |]
```

## 1. The basic feature

One pass to see it works before the harder checks. Scroll check tune, 1024x768.

- [ ] The header shows "Scroll check" and `♩ = 70`, and stays at the top while you scroll by hand before starting.
- [ ] All six lines are drawn, each with a clef and a lane; there is no arrow.
- [ ] Tap to start: the page goes to line 1, the count-in plays, and each new line scrolls up to about a third of the way down as the playhead reaches it, with the next line visible below.
- [ ] Play it slowly and imperfectly. At the summary, scroll up: every line kept its fill and marks.
- [ ] Tap the summary: the page scrolls back to line 1 and every lane is cleared.

Observed:

## 2. Ways the lock could get stuck

A stuck lock traps you on a page you cannot scroll, so this is the section to try hardest. After each way out, scroll by hand with the wheel, the scroll bar and the keys to prove the page moves. Do it in **both** Firefox and Chrome.

- [ ] While locked, none of these move the page: mouse wheel, dragging the scroll bar, arrow keys, Page Up/Down, Space, Home, End. The page still follows the song.
- [ ] Open Settings during the count-in, then close it: unlocked, line 1 at the top, start prompt showing.
- [ ] Open Settings mid-song, turn Judge my playing off, close: unlocked.
- [ ] With judging on and the microphone not yet allowed, tap start and open Settings while the permission prompt is up: unlocked.
- [ ] Switch to another tab mid-song, then back: unlocked, line 1 at the top with the start prompt.
- [ ] Let a song reach the summary while a scroll is still moving (Scroll check, last line): the scroll finishes and the page unlocks at once.
- [ ] Turn Use song off from Settings after a song: random cards are never locked.
- [ ] Settings button in the header works while locked.

Observed:

## 3. Layout seams

- [ ] **Sideways shift:** with scroll bars always visible, the music does not move left or right when the lock goes on at the start tap or comes off at the summary.
- [ ] **Header over music:** scroll so a lane, fill or the playhead passes under the header. Nothing draws over the header; nothing is hidden under it at the top of the page.
- [ ] **Bar over music:** scrolled to the end, the last line's lane sits fully above the bar. Mid-song, the bar growing from prompt to readout to summary does not make the music jump.
- [ ] **1024x768:** header, bar and at least two whole lines with their lanes on screen together, before, during and after a song.
- [ ] **Settings view:** with the pinned header, tab through the controls; none is hidden under the header, and the Settings footer still sticks to the bottom.
- [ ] **Header text:** long title tune cut short with "…", Settings button whole, at every size including 360x640. No title, no tempo tune: no title, `♩ = 90`. Untimed song (Keep tempo off): title shows, no tempo. Settings open: no title or tempo.
- [ ] **Phone sizes:** no sideways scroll at 360x640 and 640x360, before, during and after a song. (How well it fits is a later feature.)

Observed:

## 4. Odd moments in the song

- [ ] **Tie over a line break** (Scroll check, line 1 to 2) and **a line opening with a rest** (lines 3 and 6): the scroll starts when the playhead reaches the new line, not a note later.
- [ ] **Resize mid-song:** drag the window narrower and wider during the Scroll check: the song carries on, the page jumps to put the current line back a third down, and every lane keeps its fill and marks.
- [ ] **Reduced motion on:** the page jumps between lines instead of sliding.
- [ ] **One-line tune** (no title, no tempo): the page does not scroll.
- [ ] **Judging off:** the page follows the song the same way; lanes stay neutral; the bar shows "End of song" and no legend.

Observed:

## 5. Long song performance

Hundred bars tune, judging off, Chrome, large window.

- [ ] Time from closing Settings to the music appearing: write it down. Under about a second is fine.
- [ ] Play it through (watch, no playing). The playhead and scrolling stay smooth at the end as at the start.
- [ ] **Only the current row changes each frame.** In Chrome DevTools, Elements panel, expand the `.song-overlay` SVG: changed attributes flash purple. During play only the playhead line and the current row's paths (and the row before it just after a break) should flash; finished rows and rows below stay still. Then turn judging on and play a few notes of the Scroll check to see the fill paths do the same.
- [ ] Optional: Performance panel, record 10 seconds mid-song. Note the typical frame time.

Observed:

## 6. Tuning

Your preferred values; Claude puts them in the code and the module docs.

- [ ] Scroll duration (start: 450 ms). Too slow to follow, too fast to read?
- [ ] Where the current line sits (start: a third of the way down).
- [ ] Space between lines (start: none beyond the lane). Easy to tell which lane belongs to which line?
- [ ] Music size at 1024x768 (it is capped so two lines fit). Readable?

Observed:

## 7. Nothing else changed

- [ ] Random cards (Use song off) look and behave as before, at 1024x768 and 360x640.
- [ ] Untimed song cards (Keep tempo off) look and behave as before, apart from the header title.
- [ ] Timed scoring (F09): lane colours, marks, playhead, summary and tuning list look as before.

Observed:

## 8. Reading the code (optional)

Things worth a look in the diff, beyond whether it works:

- [ ] `story-progress/F10.md` Notes: the four choices made without asking (following the playhead's row, the height cap, the bar at the screen bottom, a scroll stopped by Settings). Agree with each?
- [ ] `docs/architecture/modules/staff.md` and `app.md` describe the whole-song layout; nothing about two rows, row *n* mod 2 or the arrow is left.
- [ ] `Song.title` is display text only: nothing in `src/core/` reads it.
- [ ] New pure helpers have tests: `header-text.ts`, `rowFrame`, `rowsToUpdate`, `follow.ts`, `scroll-lock.ts`.
- [ ] The lock is set in one place (`setScrollLock`) and every exit goes through it.
- [ ] No new dependencies in `package.json`.

Observed:
