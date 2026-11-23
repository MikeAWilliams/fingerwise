# F11: hand checks

Done once at Closing, after all four stories are built; `fw-execute` does not stop for them. Firefox on Linux desktop (Chrome too if installed), `make dev`, judging on, keep tempo on, the example song or "Mary Had a Little Lamb" at ♩ = 80 or slower. Each playing ask is one short, slow take; nothing fast or high.

## Play

1. **A normal take.** Play the song once as well as you can. The summary shows, then "Analysis ↓" under the summary and tuning lines. Expect the breakdown to be mostly in tune, with silent before/after shares like the worked example's. Its percentages read sensibly against the lanes: where the lane is mostly empty, silence; where it's red, wrong. Note the habit lines and whether they match how it felt.
2. **Late on purpose.** Start every note a little late (wait a beat-fraction after the click). "Notes start about … ms late" should grow against take 1.
3. **Short notes.** Play each note short, stopping well before the next. The length figure should drop and the gap figure should rise; "silent after it stopped" should lead the losses.
4. **One fluffed spot.** Play cleanly except bars 3–4 (or any two bars), where you blow wrong notes or stay silent. Expect "Bars 3–4: …% covered, …% elsewhere", and on the staff those two bars shaded, labelled "Practice: bars 3–4". Clicking the analysis line scrolls to that row. If no spot shows, note the figures; small songs rarely pass the corrected test (a design risk, not a bug).
5. **Slowing down (optional, only if easy).** Start in time and drift a little slower towards the end. A "you slowed down" line should appear. If this is awkward to play, skip it: tests cover drift with generated readings.

## Look

- **Breakdown table (S05):** "Where the note time went" is a table with the nine rows in fixed order, 0% rows shown, groups bold and the rows under them indented. The groups add to 100% and each group's rows add to it. Read against the summary: "On the right note" × the summary's in-tune share ≈ "in tune".
- **Link shows only when needed (S05):** on a tall window where the whole page fits, there is no "Analysis ↓". Make the window short (or 360x640) and it shows; scroll down until the "Analysis" heading is above the bar and it goes; scroll back up to the music and it comes back. After Tab and Enter on it, focus is on the "Analysis" heading.
- **Link:** "Analysis ↓" scrolls smoothly to the section, with the section's heading just under the sticky header. With reduced motion on (Firefox: `ui.prefersReducedMotion` = 1 in `about:config`), it jumps. Tab to it and press Enter: it scrolls and does **not** restart the song.
- **Restart:** from the summary, tap the start prompt. The section, link and shading go, the page goes back to line 1, the count-in starts.
- **No analysis:** judging off, then play to the end: "End of song", no link, no section. Judging on and stay silent: does it grade anything? If nothing is graded, there should be no link either.
- **Layout:** at 1024x768 the section fits the width with no sideways scroll; at 360x640 (responsive mode) nothing scrolls sideways. The sticky bar does not cover the section's last line at the page end.
- **Shading:** spans a line break correctly (pick 2 bars per line and a spot over bars 2–3). Resize the window and rotate in responsive mode after the summary: the shading stays on its bars. The notes, trace and fault marks are still clearly visible through it.
- **Screen reader (quick):** the section is plain text with headings (Firefox accessibility inspector is enough).

## Review points

- **Constants:** whether `SPOT_ALPHA` with Bonferroni is too strict for songs this short; whether the drift threshold (`TIMING_TOLERANCE_MS`) fires too easily or never.
- **Large drift:** the module doc's figure for how far the fit understates a quarter-note slowdown; whether the text should hedge.
- **Performance:** the summary should appear without a visible pause. If it lags on a long song, lower `EXACT_BUDGET`.
- **Coverage unchanged:** the summary figures for the same take are the same as before F11 (the two new `ItemScore` fields are additive).
- **Wording:** each line reads plainly; refine words, not figures or order (S03 notes allow it).
