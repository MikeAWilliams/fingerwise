# F12: hand checks

Done once at Closing, after all four stories are built; `fw-execute` does not stop for them. Firefox on Linux desktop (Chrome too if installed), `make dev`, use song, keep tempo and judging on, "Mary Had a Little Lamb" at ♩ = 80 or slower. Each playing ask is one short, slow take on the song's easy notes; nothing fast or high.

## Settings (S01)

- The Song section has "Scoring" after "Metronome" with "Live feedback" and "After the song"; the stored value shows.
- Turn use song, keep tempo or judging off: the list is greyed out and keeps its value; turn it back on and the same choice shows.
- Choose "After the song", reload: it is still chosen. The closed Song section's summary reads "on, keep tempo, scored after the song".
- DevTools → Local Storage → `fingerwise.settings`: delete the `scoring` key and reload: it loads as Live feedback, nothing else changed. Set it to `"x"`: same.

## Play (S02 to S04, Scoring: After the song)

1. **A normal take, metronome on.** Count-in and clicks as usual. While playing: no playhead, no lanes, no trace, no marks, no "Hearing …", no legend; the bar says "Scoring after the song"; the current note is black and the page follows the lines. Stop on time. Within about a second: every line's lane, trace and marks appear at once, with the summary, tuning line, legend and analysis; no overrun lane and no "past the end" line.
2. **Hold the last note about 2 s too long.** After the last beat no click sounds; the bar says "Listening… stop playing to see your score". The score appears about 1 s after you stop. Under the last line, an "after the end" lane shows the held note's trace from the left; the analysis says "You played 2.x s past the end" after the drift line. The summary figures are about what take 1 gave.
3. **Play a few extra notes after the end** (any easy notes, with short gaps under 1 s). Listening carries on through the gaps; the lane shows each note at its offset from its nearest note.
4. **Live feedback, same as 2.** Switch Scoring back to Live feedback and hold the last note long: the score shows one lag after the last beat as before, with no overrun lane.

## Look

- **Restart:** from the summary tap the start prompt: lanes, overrun lane, legend, analysis and the line all go; the page goes back to line 1; nothing is drawn during the count-in.
- **Stop mid-song:** open Settings halfway; close it: the start prompt, no lanes. The same by switching tabs, and once during the overrun (step 2, switch tab while holding).
- **Room noise / endless sound:** hum or let a fan run at the end without stopping: it still ends 10 s after the last beat. Note whether ordinary room noise alone (silent player) delays the end; that is the design's stop-rule risk.
- **Long overrun:** keep sounding the full 10 s: the overrun lane stops at the line's width and shows "+N s" at its right.
- **Nothing graded / microphone denied:** block the microphone: "End of song" or the F09 notice, no lanes, no legend.
- **Layout:** at 1024x768 and 360x640 (responsive mode) no sideways scroll; scrolled to the end, the overrun lane and its label clear the pinned bar; the music did not jump when the lane appeared. Resize after the summary: lanes, trace and the overrun lane scale together.
- **Metronome off:** a take in after the song with the metronome off: only the count-in clicks.

## Review points

- **Constants:** `OVERRUN_SILENCE_MS` (1 s) and `OVERRUN_CAP_MS` (10 s): does 1 s feel like a wait, or does a breath between extra notes end it too early?
- **Same score in both modes:** a take of the same playing in each mode gives similar figures; the timed-flow test proves identical figures for identical readings.
- **Memory:** a three-minute run keeps its readings in the coverage run and the overrun list only; nothing is stored (DevTools storage unchanged after a run).
- **Code:** `SongOverlay` in after the song never makes the playhead visible yet still reports rows for following; `settledPaths` reused rather than a second drawing path.
- **Wording:** "Scoring after the song", "Listening… stop playing to see your score", "after the end", "You played N s past the end".
