# 0011: A note's end gets a release allowance that follows the tempo

- **Status:** accepted
- **Date:** 2026-11-24

## Context
[ADR 0009](0009-timed-songs-scored-by-coverage.md) scores a note over its written length less "a short grace at each edge". In code the grace is a fixed 40 ms (`EDGE_GRACE_MS`). An end counts as early when the sound stops more than a fixed 60 ms (`TIMING_TOLERANCE_MS`) before the written end, and a plain join is separated only when a gap shows within ±60 ms of it. None of these change with tempo.

A player does not hold a note right up to the next one. They stop briefly to tongue the next note, and they breathe at the end of a phrase. Both are good playing, but today the silence counts against the note's coverage, most such notes get an "ended early" mark, and a gap that opens a little before the join falls outside the separation window. It gets worse as the tempo rises: an 80 ms tongued gap, about what the user's own [tongued scale](../../../tests/fixtures/audio/README.md) shows, is 10% of a quarter note at ♩ = 75 but 19% of one at ♩ = 140. The user decided on 2026-11-24 to let the allowance follow the tempo ([F15 design](../../features/15-release-allowance/design.md)).

## Decision
This replaces only ADR 0009's grace at the **end** of a note that is not slurred into the next. The rest of ADR 0009 stands: per-reading classification, right note then tuning, coverage as a share, joins, timing, slurs and the pure core. The grace at a note's start, at a slurred end, and on rests is unchanged.

- **Release allowance.** Every note whose end is not slurred into the next note (a plain join, a note before a rest, the last note) gets a release at its end: 25% of its written length, at most half a quarter note at the tune's tempo, and never less than the edge grace (40 ms). A slurred end gets none. The share, the cap and the floor are code constants, tuned in the live check.
- **Silence in the release is forgiven; sound there still counts.** The note's scored span ends where the release starts. In the release (up to the edge grace before the written end), the right note sounding counts as covered, a confirmed wrong note counts as a loss, and silence counts neither way. So a note held for its full value scores what it scores today.
- **"Ended early" is measured from the release.** An end is early only when the sound stops more than the timing tolerance before the release starts. "Ended late" stays measured from the written end.
- **The separation window opens at the release.** A plain join is separated when a gap shows anywhere from the join less the earlier note's release less the timing tolerance, to the join plus the timing tolerance. A note held through still shows no gap.
- **One span everywhere.** The score analysis's breakdown, the score lane and song playback use the same release: the breakdown leaves silence in the release out, the lane's expected time for a note ends at its release, and playback stops each tone where its release starts.
- **Pure core.** The release is worked out from the song and its tempo in the core. It knows note lengths and tempo, never staff, audio or UI.

## Alternatives considered
- **Keep a fixed grace, only larger:** one number cannot fit both a tongued gap on an eighth at a fast tempo and a breath on a half note at a slow one.
- **Leave the whole release out of the score:** simpler, but it takes credit away from a note still sounding there, so holding a note to its full value would score no better than stopping early.
- **A share with no cap:** a whole note could go silent for a whole beat or more.
- **A larger allowance at `!breath!` marks:** ABC can mark breaths, but the cap already leaves room for a breath on a long note. It can come later.
- **Start timing that follows the tempo too:** nothing so far shows that a fixed 60 ms tolerance at the start is wrong.

## Consequences
- Coverage rises and "ended early" and "not separated" fall where the player stopped to tongue or breathe. Held notes, wrong notes, sharp or flat notes and slurred playing score as before, and so does a held note that should have been two.
- A note stopped well short is still marked. At ♩ = 75, a quarter note that stops at 75% of its length loses nothing, and one that stops at 60% or less is marked "ended early", as today.
- The analysis must use the same span as coverage, or its breakdown and the score would disagree.
- Playback's fixed join gap (`JOIN_GAP_MS`, F13) is replaced by the release, so a tone ends where the lane's expected time ends.
- The [coverage](../modules/coverage.md), [analysis](../modules/analysis.md), [song](../modules/song.md) and [app](../modules/app.md) module docs change when this is built.
