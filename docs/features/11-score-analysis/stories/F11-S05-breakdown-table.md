# F11-S05: Breakdown table

- **Feature:** `../design.md`
- **Modules:** `src/app`, `docs/architecture/`
- **Depends on:** F11-S03

## Story

As a player reading the analysis, I want the breakdown laid out as a table that says what each share is a share of, so that its "in tune" does not read as a different answer to the summary's "in tune", and I can compare takes at a glance.

## Acceptance criteria

Each item must be checkable and numbered so progress checklists can refer to it. Do not edit these once work starts; raise a change instead.
- **AC1:** Given the analysis shows, then "where the score went" is a table headed "Where the note time went", with a column of shares named "Share of all note time", in place of the line of [F11-S03 AC2](F11-S03-analysis-section.md#acceptance-criteria). The rest line stays as S03 AC2 gives it, under the table.
- **AC2:** Given the breakdown, then the table has these rows, every time, in this order, 0% included: "On the right note" with "in tune" and "out of tune" under it; "Silent" with "before the note started", "in the middle of the note" and "after the note stopped" under it; "Wrong note"; "Not played". The three group rows and the last two are set apart from the rows under a group (bold or similar), and the rows under a group are indented.
- **AC3:** Given the breakdown, then each figure is a whole percentage, the rows under a group add up to the group's figure, and the group figures with "Wrong note" and "Not played" add up to 100%.
- **AC4:** Given the table, then a screen reader reads it as a table with column headers, and it has no sideways scroll at 360x640.
- **AC5:** Given the analysis shows, then the "Analysis ↓" link of S03 AC5 is in the pinned bar only while the section's heading is below what can be seen (under the pinned bar or past the bottom of the window). It goes as soon as the heading comes into view and stays gone while the page is scrolled further down; scrolling back up to the music brings it back. A window that holds the whole page shows no link.
- **AC6:** Given the link is used, then besides scrolling to the section as S03 AC5 gives it, keyboard focus moves to the section's heading.
- **AC7:** Given the change, then `make verify` passes, the texts stay in the app text module, and the `app` module doc describes the table and when the link shows.

## Notes

- Added at acceptance on 2026-11-23 after the first build showed "55% in tune" in the analysis beside "88% in tune" in the summary. Both are right: the summary's is a share of the time on the right note, averaged note by note; the analysis's is a share of all graded note time. The summary's wording is not changed here.
- Rounding: round the groups to whole percentages so they add to 100 (largest remainder), then the rows within each group to add to their group the same way.
- No change to the analysis core's figures.

## Test approach

Unit tests for the table's rows from breakdown values: fixed order and 0% rows, groups as sums, rounding that adds up where plain rounding would not. By hand with `make dev`: the take from `samples/f11-feedback.png` or a new one; the link absent on a tall window and present on a short one, gone once scrolled to the heading; Tab to the link, Enter: it scrolls, focus is on the heading, the song does not restart.
