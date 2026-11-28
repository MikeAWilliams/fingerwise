# 0009: Timed songs scored by coverage

- **Status:** accepted (grace at a released end superseded by [0011](0011-release-allowance.md))
- **Date:** 2026-11-22

## Context
F08 grades a timed song one slot at a time with the judge's tone tracker: a tone must hold steady for the settle time (200 ms, [ADR 0005](0005-yin-pitch-detector.md)) before the slot gets a single verdict ([F08 design](../../features/08-timed-play-along/design.md)). The [F09 review](../../features/09-timed-scoring/design.md#problems-found-in-f08) found that this cannot grade short notes, punishes a late note twice, and gives the player almost no feedback while playing. The user decided on 2026-11-22 that a note is not right or wrong: it is scored by how much of it was played correctly, and the player sees that fill in as they play.

## Decision
- **Per-reading classification.** In a timed song, each detector reading is classified on its own against the expected pitch, with no settle time: right note (its nearest note is the expected pitch), wrong (its nearest note is another one) or silent. A wrong classification needs a few readings in a row; anything else that is not the right note counts as silent. The tone tracker and its thresholds stay as they are for untimed cards and songs.
- **Right note, then tuning.** Coverage counts the right note, in tune or not. The tolerance setting decides only whether a right-note reading is in tune, and tuning is reported apart from coverage: as a pitch trace in the lane and an in-tune figure in the summary. Decided on 2026-11-22 after the first spike recording, where a novice's correctly fingered notes sagged 60 to 100 cents flat and a tolerance rule would have scored them mostly wrong.
- **Coverage.** A note's score is the share of its written length (not its slot) filled with right-note readings. A rest's score is the share filled with silence. A short grace at each edge is not counted. The song's coverage is the mean over every graded note and rest, each counting equally.
- **Joins.** A plain join between two notes requires a silence (*separation*), even at the same pitch. A slurred join requires the sound not to break while the pitch changes. A tie is one note, so it has no join.
- **Timing is judged.** Each note reports whether it started late, started early, ended early or ended late, beyond a tolerance, measured after a fixed scoring lag. Each figure is a percentage of the notes that have that edge. Separation is a percentage of plain joins.
- **Slurs in the song.** The abc adapter reads slurs, and a song note records whether it is slurred to the next note. This extends the song shape in [ADR 0008](0008-songs-keep-rhythm.md); nothing there is reversed.
- **Pure core.** Classification, coverage, timing and separation are pure core code over readings and note times in ms. They know pitch and frequency, never staff, audio or UI.

## Alternatives considered
- **A faster settle rule for the expected pitch (F09's earlier F4):** keeps one verdict per note and still gives a binary result and little feedback. Replaced.
- **One verdict per slot from the main pitch heard:** simpler, but still binary, and it says nothing about timing.
- **Coverage only within the tolerance:** strict, but for a novice the score would measure tuning rather than fingering or timing.
- **Right note only, tuning left to untimed drills:** simpler, but throws away what the readings already say about tuning.
- **A coverage threshold that makes a note correct:** the user wants the percentage itself, not pass or fail.
- **Weighting coverage by duration:** long notes would dominate, and a messy fast run would barely move the score.
- **Leniency for repeated notes held through:** matches F08, but the user wants every pair of notes separated.
- **Ignoring slurs:** every slurred passage would score as "not separated".

## Consequences
- F08's slot verdicts, `NoteResult` and `songMarks` are replaced in timed songs. Note heads go back to black or grey, and a score lane under the staff carries the result ([F09 visual feedback](../../features/09-timed-scoring/design.md#visual-feedback)).
- Timing figures are only as accurate as the scoring lag. A device whose real latency differs from the lag shows a steady early or late bias. Per-device calibration may follow.
- Separation needs a detector for short gaps and dips, which the judge does not have. The [gap detection spike](../../research/gap-detection-spike.md) (2026-11-22) found that a fine level envelope from the existing analyser separates gaps of 10 ms or more from held and slurred playing on a headset microphone, so separation does not wait for F09's F6. Laptop microphones, Android and real fast playing are untested. Accepted on 2026-11-22.
- The abc adapter depends on slur information from abcjs, matched to the audio sequence's notes through repeats.
- [song.md](../modules/song.md), [abc.md](../modules/abc.md), [judge.md](../modules/judge.md), [staff.md](../modules/staff.md) and [app.md](../modules/app.md) change when this is built.
