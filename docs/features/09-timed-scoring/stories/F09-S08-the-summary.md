# F09-S08: The summary

- **Feature:** `../design.md`
- **Modules:** `src/app`, `src/app/judge-text.ts`, `docs/architecture/`
- **Depends on:** F09-S03

## Story

As a player who has just played a song in time, I want a summary of how I played, with the notes I was most out of tune on, so that I know what to practise next.

## Acceptance criteria

Each item must be checkable and numbered so progress checklists can refer to it. Do not edit these once work starts; raise a change instead.
- **AC1:** Given a run ends with graded notes, then the summary shows coverage, the in-tune figure, the four timing figures, the share of plain joins not separated, and the number of notes too short to grade when there are any, for example "82% covered · 64% in tune · started late 12%, early 3% · ended early 5%, late 20% · not separated 10% · 2 notes too short to grade".
- **AC2:** Given a timing figure with no notes that have that edge, or no plain joins, then that part is left out rather than shown as 0%.
- **AC3:** Given any pitch averaging outside the tolerance, then a tuning list follows, such as "Furthest off: D4 +70¢ · E5 +40¢ · C4 −35¢": up to three written pitches, worst first. With none outside it, the list is left out.
- **AC4:** Given a run with nothing graded, or judging off, then the summary reads "End of song".
- **AC5:** Given the summary, then it fits the reveal area at 360x640 without sideways scroll, wrapping onto lines as needed, and a screen reader reads it as text.
- **AC6:** Given a tap on the summary, then the song starts again from the count-in with all figures, fill and marks cleared, as in F08.
- **AC7:** Given the summary, then nothing is stored and smart sampling (F06) is unaffected.
- **AC8:** Given the change, then `make verify` passes, the texts are in `judge-text.ts`, and the `app` module doc describes the summary.

## Notes

- The exact wording may be refined here; the figures and their rules come from the coverage core (F09-S02).
- Replaces F09-S03's interim "N% covered".

## Test approach

Unit tests for the summary text from coverage results: everything present, parts left out, too-short count, tuning list order and cut-off, "End of song". By hand at 360x640 and 1024x768 after a real run with an ocarina, and with a screen reader.
