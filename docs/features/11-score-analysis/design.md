# F11: Score analysis

- **Status:** done

> Shaped in dialog on 2026-11-23, after the user's recording of "Mary Had a Little Lamb" at ♩ = 80 scored 60% covered and 82% in tune but sounded right to them. A breakdown of that recording, run through the real detector and coverage core, showed where the score went: notes sounded for about 70% of their length, started about 110 ms late, and three notes were a quarter tone off. The user does not want the rules loosened; the goal is to become a better player, so the app should explain the score the same way.

## Goal

After a timed song, the player sees why they got the score they did: how much of the note time went to silence before a note started, silence after it stopped, a wrong note or out-of-tune playing; their typical habits (starting late, cutting notes short, long gaps, slowing down or rushing); and, when the song has one, a two-bar spot that is clearly worse than the rest and worth practising alone.

## Behavior

**When it shows**

- At the end of a timed song ([F09](../09-timed-scoring/design.md#summary)) with judging on and at least one note graded. With judging off, or nothing graded ("End of song"), there is no analysis.
- It is a section under the last line of music, reached by scrolling once the summary shows and scrolling unlocks ([F10](../10-scrolling-song-view/design.md#behavior)). The [pinned bar](../../glossary.md) keeps the summary and tuning list and gains an "Analysis ↓" link that scrolls to the section. The link shows only while the section's heading is below what can be seen, since on a window tall enough to hold the whole page it has nowhere to go (decided 2026-11-23 at acceptance, [F11-S05](stories/F11-S05-breakdown-table.md)).
- A tap on the start prompt starts again as before: the section and the practice-spot shading clear with the lanes.

**Where the score went**

How the graded note time splits, in shares that add up to 100%. Graded note time is each graded note's written length less its [edge graces](../../glossary.md), as coverage counts it. *Changed by [F15](../15-release-allowance/design.md#score-analysis): silence in a note's release is left out.*

- **In tune:** right note within the tolerance.
- **Out of tune:** right note outside the tolerance.
- **Silent before the note started:** silent time before the note's first right reading.
- **Silent after it stopped:** silent time after the note's last right reading.
- **Silent in the middle:** silent time between its first and last right readings.
- **Wrong note:** confirmed wrong readings.
- **Not played:** the silent time of a note with no right reading at all (decided 2026-11-23: skipping a note is a different fault from starting late, so it is named apart).

It is shown as a table headed "Where the note time went", whose figures are each a share of all graded note time (decided 2026-11-23 at acceptance, [F11-S05](stories/F11-S05-breakdown-table.md): the first build's line showed "55% in tune" beside the summary's "88% in tune", which is a share of right-note time only). The rows are grouped, and every row shows every time, 0% included, in this fixed order, so takes can be compared by position:

- **On the right note:** in tune, out of tune.
- **Silent:** before the note started, in the middle of the note, after the note stopped.
- **Wrong note.**
- **Not played.**

A group's figure is the sum of its rows. Whole percentages are rounded so that the rows add up to their group and the groups add up to 100%.

Rests are reported apart, in one line: the share of graded rest time that had sound in it. With no graded rests the line is left out.

For the recording this design came from: 45% in tune, 12% out of tune, 11% silent before, 16% silent after, 4% silent in the middle, 12% wrong.

**Playing habits**

Typical figures over the graded notes that have a right reading, each the median, so one fluffed note does not move it:

- **Start:** how far the note's sound starts from its written start, in ms, as "notes start about 110 ms late" or "early". The sound starts at the unbroken run of the right pitch leading into the first right reading, so it can be before the written start ([F11-S01 AC4](stories/F11-S01-breakdown-and-habits.md#acceptance-criteria), amended at breakdown).
- **Length:** how much of its written length a note sounds, from its written start to its last right reading, as "notes sound for about 70% of their length". When the song has at least three graded notes of one written length, that length gets its own figure too, such as "half notes 72%".
- **Gap:** at plain [joins](../../glossary.md) where both notes have a right reading, the time from the first note's last right reading to the next note's first, as "gaps between notes are about 200 ms".
- **Tempo drift:** the trend of the start offsets over the song, from a robust line fit (such as Theil–Sen) of each note's start offset against its written start. Shown only when the fitted change from the first note to the last is larger than the timing tolerance, as "notes started about 50 ms late in the first bars and about 400 ms late by the end: you slowed down" (or "rushed" when they get earlier). Added on 2026-11-23: a player who falls behind has every later note scored against the wrong written note, and without this line the analysis would blame pitch or length instead of tempo.

These use the same readings and scoring lag as the score; they add no rule and change no figure.

**Practice spots**

- Every span of two bars in a row, starting at any bar, is a candidate. A span's score is the coverage of its graded notes and rests (a note or rest belongs to the bar it starts in).
- A span is a practice spot when its coverages are significantly lower than those of the rest of the song: a one-sided Mann–Whitney rank test, p < 0.05, corrected for the number of spans tried (decided 2026-11-23, over a fixed gap in points or a t-test: coverages bunch near 0 and 1, and a rank test does not assume a bell curve).
- Up to two spots, not overlapping, worst first, each as "Bars 3–4: 41% covered, 72% elsewhere". Each is also shaded on the staff over its two bars, so it shows while scrolling back through the lanes.
- With no spot, the section says so, such as "No two bars stand out: the losses are spread through the song." This is the expected result when a habit, not a passage, costs the score; the recording this design came from has none.
- A song of fewer than three bars has no candidates, and the line is left out.

The exact wording of every line is a story's job.

## Out of scope

- Practice tips or advice text.
- Storing analyses or a history of runs.
- Changing the scoring rules, constants or summary of [F09](../09-timed-scoring/design.md) ([ADR 0009](../../architecture/decisions/0009-timed-songs-scored-by-coverage.md) stands).
- Untimed songs and random cards.
- Playing back or looping a practice spot.

## Modules touched

- **New core module, probably `src/core/analysis`:** pure. From the coverage run's finished segments, its result and the song's bars, it computes the breakdown, the habits and the practice spots, including the rank test, written by hand (no new dependency). Imports coverage and song; the layer rule holds.
- **coverage (`src/core/coverage`):** two added per-item fields that change no figure: where a note's sound starts (for the start habit) and how long a rest had sound in it (pending readings show as silent in the segments); the analysis needs the segments as well as the result, which the run already gives through `progress()`.
- **staff (`src/render/staff`):** shading over a range of bars, from the layout it already returns.
- **app:** the analysis section under the music, the "Analysis ↓" link in the pinned bar, the text in a `*-text.ts` module like `judge-text.ts`, and clearing on restart.

## Data

No settings or stored state. The span length (two bars), the number of spots (two), the significance level, the minimum notes for a per-length figure (three), the minimum song length (three bars) and the drift threshold (the timing tolerance) are code constants.

## Risks and open questions

- **Scoring lag.** The start figure includes any error in the scoring lag, so a device whose real latency differs shows a steady late or early offset ([F09 risks](../09-timed-scoring/design.md#risks-and-open-questions)). The other figures are not affected.
- **Small songs.** With few graded items the corrected test rarely reaches significance, so short songs will seldom show a spot. Accepted: a spot should only be shown when the evidence is there.
- **Which correction.** Bonferroni is simplest; Holm is a little less strict. Either fits the decision; choose in the breakdown.
- **Ties and exact p-values.** Coverages of 0 and 1 tie often. The test needs tie-corrected ranks, and an exact p-value or a normal approximation; choose in the breakdown and test against known values.
- **Large drift.** Start offsets come only from notes with a right reading. Once a player is more than about half a note behind, most notes are heard against the wrong written note and drop out, so the fit sees only the early part of the drift and understates it. [F12](../12-score-after-the-song/design.md)'s overrun lane shows the rest. Check the line against recordings that slow down by a quarter note or more.

## Stories

In build order (written 2026-11-23). Each story is visible or testable on its own.

- [F11-S01: Breakdown and habits](stories/F11-S01-breakdown-and-habits.md)
- [F11-S02: Practice spots](stories/F11-S02-practice-spots.md)
- [F11-S03: The analysis section](stories/F11-S03-analysis-section.md)
- [F11-S04: Shaded practice spots](stories/F11-S04-shaded-practice-spots.md)
- [F11-S05: Breakdown table](stories/F11-S05-breakdown-table.md) (added 2026-11-23 at acceptance; replaces the breakdown line of S03 AC2 and narrows when S03 AC5's link shows)
