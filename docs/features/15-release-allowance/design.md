# F15: Release allowance

- **Status:** designed

> Shaped in dialog on 2026-11-24. The rules are recorded in [ADR 0011](../../architecture/decisions/0011-release-allowance.md), which replaces [ADR 0009](../../architecture/decisions/0009-timed-songs-scored-by-coverage.md)'s grace at a note's released end.

## Goal

A timed song no longer charges the player for stopping briefly to tongue the next note or to breathe at the end of a phrase. Each note's end gets a release allowance that grows with the note's length and shrinks as the tempo rises. Silence there costs nothing, the lane shows the shorter time the note is expected to sound, and the app's own playback stops each note there too.

## Behavior

### The release allowance

Every note whose end is not slurred into the next note gets a release at its end. That covers a plain join, a note before a rest and the last note.

> release = 25% of the note's written length, at most half a quarter note at the tune's tempo, and never less than the 40 ms [edge grace](../../glossary.md)

In ms, by tempo:

| ♩ = | sixteenth | eighth | quarter | half | whole |
| --- | --- | --- | --- | --- | --- |
| 60 | 62 | 125 | 250 | 500 | 500 |
| 75 | 50 | 100 | 200 | 400 | 400 |
| 100 | 40 | 75 | 150 | 300 | 300 |
| 140 | 40 | 54 | 107 | 214 | 214 |
| 180 | 40 | 42 | 83 | 167 | 167 |

- The share covers tongued gaps on short notes.
- The cap leaves room for a breath on a long note, without letting a whole note go silent for a whole beat.
- The floor keeps today's behaviour on very short notes.
- A slurred end gets no release, as it gets no grace today.
- A tied note is one note, so its release follows its whole tied length.
- Rests are unchanged.

### Scoring

- **Coverage.** A note's scored span runs from its start (less the edge grace, as today) to where its release starts. In the release, up to the edge grace before the written end:
  - the right note sounding counts as covered and adds to the note's scored time;
  - a confirmed wrong note counts as a loss and adds to the scored time;
  - silence, pending readings included, counts neither way.

  So a note held for its full value scores exactly what it scores today, and only a stop for tonguing or breath is spared.
- **Ended early** is measured from the release start: the sound stops more than the timing tolerance (60 ms) before the release starts. **Ended late** is unchanged.
- **Separation.** A plain join is separated when a gap shows anywhere from (join − the earlier note's release − 60 ms) to (join + 60 ms). Today the window is join ± 60 ms. A gap that opens during the release now counts, and a note held through still shows no gap.
- **Start timing** is unchanged.
- Which notes and rests are graded is unchanged. A note of the minimum graded length (130 ms) or longer still keeps a scored span of at least 50 ms. Up to 160 ms the release is the 40 ms floor, as today. Beyond that it is at most a quarter of the note.

What this lets through, at ♩ = 75:
- a quarter note stopped at 75% of its length loses nothing;
- one stopped at 70% loses a little coverage and gets no mark;
- one stopped at 60% or less gets an "ended early" mark, as today.

The share and the cap are the settings to adjust if this proves too generous in the live check. A share of 20%, or a cap of ⅜ of a quarter note, are the stricter options.

### Score analysis

- "Where the note time went" uses the same span as coverage, so the table and the score agree. Silence in the release is left out of the table (decided 2026-11-24). Sound there counts in its row: in tune, out of tune or wrong note.
- Playing habits are unchanged. "Notes sound for about N% of their length" and "Gaps between notes are about N ms" still measure what was played against the written length.

### The score lane

- The lane shows each note's expected playing time. A graded note with a release has its neutral segment end where the release starts, so it is shorter than the note's written length (decided 2026-11-24). Nothing neutral is drawn in the release, so it looks like the gap between segments.
- An ungraded note's lighter segment is shortened the same way (*default*).
- A note slurred into the next keeps its full length. Rest segments are unchanged.
- The pitch trace is still drawn wherever there is sound, in the release too (*default*), since sound there still counts.
- **Marks** (*default*):
  - an "ended early" mark sits at the shortened end, where it was measured;
  - an "ended late" mark sits at the written end;
  - a "not separated" mark sits at the written join;
  - start marks are unchanged.
- The legend is unchanged.

### Playback

- [Play song](../13-play-the-song/design.md#behavior) plays the way the scoring expects (decided 2026-11-24). Each tone that is not slurred into the next note ends where its release starts. This replaces F13's fixed gap of 50 ms, or less for a very short note.
- So a note before a rest, and the last note, stop at their release too, as they stop 50 ms early today.
- Slurred joins and ties are unchanged.

## Out of scope

- Start timing that follows the tempo. The start tolerance stays a fixed 60 ms.
- A larger allowance at `!breath!` marks in the ABC.
- Settings for the share or the cap. They are code constants.
- Showing the release zone in the legend, or a breakdown row for release silence.
- Untimed song cards and random cards. They are not scored by coverage.

## Modules touched

- **song (`src/core/song`):** the release rule, per note from the song and its tempo, beside `playbackSchedule`, since both coverage and playback use it. `playbackSchedule` uses it in place of `JOIN_GAP_MS`. The floor equals the edge grace, which lives in coverage today, so the breakdown decides where that constant belongs. It must not make `song` import `coverage`.
- **coverage (`src/core/coverage`):** the timeline carries each note's release. Coverage, "ended early" and the separation window follow the rules above.
- **analysis (`src/core/analysis`):** the breakdown uses the span and release from coverage.
- **app (`lane.ts`, `marks.ts`, `SongOverlay.tsx`):** the shortened neutral segment and the mark positions.

The layer rule holds: the release is pure core code over note lengths and tempo. The drill engine, judge, detector and staff are unchanged.

## Data

No settings or stored state. The share (25%), the cap (half a quarter note) and the floor (the edge grace) are code constants, kept together with the other scoring constants so they can be tuned in the live check.

## Risks and open questions

- **Too generous?** A player who cuts notes short by a quarter is no longer told. The live check should include deliberately clipped notes at a slow and a fast tempo.
- **Breath on short notes.** At a fast tempo a phrase ending on a quarter note leaves less room for a breath than a half note does. Breath marks are left for later.
- **Fixtures are slow playing.** The user's clips are slow, so the cap rarely binds in tests. Synthetic readings cover fast tempos, and the live check covers real playing.

## Stories

In build order (written 2026-11-24). Each story is visible or testable on its own.

- [F15-S01: Release in the scoring](stories/F15-S01-release-in-scoring.md)
- [F15-S02: Analysis uses the release](stories/F15-S02-analysis-uses-release.md)
- [F15-S03: Lane shows the release](stories/F15-S03-lane-shows-release.md)
- [F15-S04: Playback stops at the release](stories/F15-S04-playback-at-release.md)
