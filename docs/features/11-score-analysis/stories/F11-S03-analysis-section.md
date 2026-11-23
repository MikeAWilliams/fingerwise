# F11-S03: The analysis section

- **Feature:** `../design.md`
- **Modules:** `src/app`, `docs/architecture/`
- **Depends on:** F11-S01, F11-S02

## Story

As a player who has just finished a song in time, I want to read the analysis under the music and jump to it from the summary, so that I can see why I scored what I did while the run is fresh.

## Acceptance criteria

Each item must be checkable and numbered so progress checklists can refer to it. Do not edit these once work starts; raise a change instead.
- **AC1:** Given a timed run ends with judging on and something graded, then a section under the last line of music shows the analysis: where the score went, playing habits and practice spots.
- **AC2:** Given the breakdown, then it lists each share as a whole percentage with its plain name ("in tune", "out of tune", "silent before the note started", "silent after it stopped", "silent in the middle", "wrong note", "not played"), largest loss first after the two right-note shares, and leaves out shares that round to 0%. The rest line ("sound during rests: N%") shows only when there are graded rests.
- **AC3:** Given the habits, then each present habit is one plain line, for example "Notes start about 110 ms late", "Notes sound for about 70% of their length (half notes 72%)", "Gaps between notes are about 200 ms", "Notes started about 50 ms late in the first bars and about 400 ms late by the end: you slowed down". Absent habits are left out. Times are rounded to 10 ms and shares to whole percentages.
- **AC4:** Given practice spots, then each is a line such as "Bars 3–4: 41% covered, 72% elsewhere", worst first. Given none after testing, then "No two bars stand out: the losses are spread through the song." Given a song too short to test, then no practice-spot line.
- **AC5:** Given the analysis shows, then the pinned bar, under the summary and tuning list, has an "Analysis ↓" link that scrolls the page to the section (a jump with reduced motion on).
- **AC6:** Given a run with judging off or nothing graded ("End of song"), then there is no section and no link.
- **AC7:** Given a tap on the start prompt, then the section and link are removed with the lanes, and the page scrolls to line 1 as before.
- **AC8:** Given the section, then it fits a 1024x768 window with no sideways scroll, reads as text to a screen reader, and has no sideways scroll at 360x640.
- **AC9:** Given the change, then `make verify` passes, the texts are in an app text module (like `judge-text.ts`), and the `app` module doc describes the section and link.

## Notes

- Wording above is the target; small refinements are allowed in the build if they keep the figures and order.
- Nothing is stored; the analysis is computed once when the summary is ready.

## Test approach

Unit tests for the text from analysis results: all parts present, shares that round to 0 left out, absent habits, per-length figures, drift in both directions, spots, no spots, too short. By hand with `make dev` on desktop after real runs with an ocarina: the link, the section's content against the lanes, restart clearing it.
