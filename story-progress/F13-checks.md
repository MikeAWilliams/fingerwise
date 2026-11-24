# F13: hand checks

Do these once, at Closing, after all three stories are built; `fw-execute` does not stop for them. Use Firefox on Linux desktop (Chrome too, if installed) with `make dev`. Nothing here needs playing: it is all listening and looking.

Paste this tune into the Song section; it has repeated notes, a slur, a tie, rests and a repeat:

```
T: Playback check
M:4/4
L:1/8
Q:1/4=80
|: C2 D2 E2 E2 | (E2 F2) G4- | G2 z2 A2 B2 | c c c c B2 z2 :|
```

For the fast check, change `Q:1/4=80` to `Q:1/4=160` and the last bar to `c/c/c/c/ c/c/c/c/ B2 z2`.

## The button (S02)

- Use song on: "▶ Play song" sits next to Settings. Check it with keep tempo on and off, with judging on and off, and with each Scoring choice. Turn use song off: it is gone. In Settings it is hidden.
- **A fresh reload:** the very first press is heard.
- **Keep tempo on:** start a run. During the count-in and while playing, the button is greyed out and does nothing. Again with Scoring "After the song", while it is listening past the end. On the start prompt and on a finished score it works.
- **From a finished score:** pressing it clears the lanes, summary, tuning line and analysis.
- Tab to the button and press Enter, then Space. Playback starts, and no run starts and no card steps.

## Listening (S02)

- **Count-in:** one bar of clicks at ♩ = 80, then the tune. Compare it with a timed run's count-in.
- **Pitch:** the notes sound an octave above written, as play note does. Optional: check one against a tuner.
- **Joins:**
  - the repeated E's are clearly separate
  - E–F under the slur runs together, with no gap and no audible dip at the join
  - the tied G is one held note
  - the rests are silent
  - the repeat plays the tune twice
- **Clicks:** no clicks or pops at any join.
- **Join gap (`JOIN_GAP_MS`, 50 ms):** does it sound like tonguing, or too choppy or too smooth? Note a better value.
- **Fast:** at ♩ = 160 the sixteenths are all heard as separate notes.
- **Metronome:** with keep tempo and metronome on, a click on every beat while the tune plays. With either off, nothing after the count-in.
- **Play note off:** the button still plays.
- **Header tempo:** with keep tempo off, the header shows "♩ = 80" while playing, and it goes afterwards.

## Stopping and returning (S02, S03)

- **Stop mid-tune:** the button reads "■ Stop" while playing. Pressing it silences everything at once.
- **Return with keep tempo on:** the first line and the start prompt.
- **Return with keep tempo off:** the first song card.
- **Judging on, keep tempo off:** the browser's microphone indicator goes off while playing and comes back on after.
- **Let it finish:** the same return as a stop.
- **Other stops:** opening Settings mid-tune stops it. Closing Settings does not restart playback. Switching tabs mid-tune stops it; coming back shows the start.
- **Taps:** tapping the music or pressing a key during playback does nothing.

## Looking (S03)

- **Keep tempo off:** the lines of music show during playback, not one card.
- **The sounding note:** it is black and the rest grey, and the black note stays with the sound. The first note is black during the count-in. Nothing is black during a rest.
- **Playhead:** it moves with the sound, as in a live-feedback run.
- **Nothing else:** no lanes, traces, marks, "Hearing …" or legend. The bar says "Playing the song".
- **A tune of three or more lines** (set bars per line to 1): the page follows line by line. The wheel, keys and scroll bar do not scroll while playing, and scrolling works again after.
- **From a score scrolled down to the analysis:** pressing Play song brings the page back to line 1.

## Layout

- At 1024x768, the header fits on one line.
- At 360x640 (responsive mode), the button is just "▶" or "■", and nothing scrolls sideways.
- The greyed-out button clearly looks unusable.

## Review points

- **Constant:** `JOIN_GAP_MS` (50 ms), and the quarter-of-a-note cap for short notes.
- **Slurs:** if E–F dips, the fades need to cross. That would change F13-S01 AC3, so raise it rather than patch it.
- **Code:**
  - `clock-timer.ts` is shared by both flows, and the timed-flow tests did not change.
  - Playback has its own clicker and tone scheduler.
  - The tone player for cards behaves as before.
  - The drill flow effect stands down while playing rather than a second flow running beside it.
- **Wording:** "▶ Play song", "■ Stop", "Playing the song".
