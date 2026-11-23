# F09: Timed scoring

- **Status:** draft

> **Provisional.** This design started from a review of how [F08](../08-timed-play-along/design.md) scores a timed song (2026-11-22). The scoring model below was chosen in dialog on 2026-11-22 and is recorded, as proposed, in [ADR 0009](../../architecture/decisions/0009-timed-songs-scored-by-coverage.md). The numbers in it are starting values, to be tuned in the live check.

## Goal

A timed song's score shows how the player played, on any supported device, for real flue music: songs, slow-session dance tunes, game tunes and baroque pieces (see [Targets](#targets-provisional)). Every note is scored by how much of it was played correctly, along with whether it started and ended on time and was separated from its neighbours. The player watches this happen: a playhead moves through the music, and a lane under the staff fills with colour as they play.

## Behavior

### Background: F08 and latency

How F08 scores today: with keep tempo and judging on, each slot of at least `MIN_GRADED_SLOT_MS` (300 ms) is a listening window opening at the slot's start. A tone counts once it has held for the [settle time](../../glossary.md) (200 ms). When the slot ends, the note is correct, incorrect or missed. The summary is "N of M correct" over graded notes only ([app module](../../architecture/modules/app.md)).

Latency was measured on 2026-11-22 by tapping a key next to the microphone and timing the first frame where the level jumps, read the way the app reads it (2048-sample analyser, one reading per animation frame):

| Setup | Input (measured) | Output (browser-reported) |
| --- | --- | --- |
| Linux, Firefox 160, Corsair HS80 (2.4 GHz USB receiver, not Bluetooth) | median 71 ms, 64–80 over 26 taps; about 55 ms after allowing for the key's own sound | 42 ms (`outputLatency`) |
| Android | not measured; 50–200 ms reported in [prior art](../../research/prior-art-and-gotchas.md) | not measured |

The spread is one display frame (16.7 ms), so the input delay itself is steady.

Under F08, a note played exactly on the beat can only be marked correct after about 330 ms: 40 ms output latency, 55 ms input latency, 25 ms for the note to fill the analyser window, and the 200 ms settle time. So eighths at ♩ = 90 or faster are effectively always missed. Most of the cost is the settle time, which is why coverage drops it (see [the scoring model](#scoring-model)).

### Problems found in F08

- **P1: Latency is not allowed for.** The window opens and closes with the card, but a played note reaches the judge about 100 ms later.
- **P2: A late note is punished twice.** It is missed in its own slot, and its tail is judged against the next note.
- **P3: The minimum graded slot is a cliff.** A 299 ms slot is ignored; a 300 ms slot is graded with no time to spare.
- **P4: The summary hides ungraded notes.** "3 of 4 correct" on a 30-note tune reads as if 4 notes were played.
- **P5: Little feedback while playing.** In the user's testing this is what makes scoring feel bad, more than the misses themselves.
- **P6: Short notes are not gradable.** Nothing below the first target tier can be graded.

### Targets (provisional)

From the [note lengths in real flue music](../../research/flue-music-tempos.md):

| Tier | Shortest note | Covers | Needs |
| --- | --- | --- | --- |
| **Must** | 250 ms | Songs and beginner material: eighths up to ♩ = 120 | Coverage scoring |
| **Must** | 190 ms | Slow-session reels (half ≤ 78) and jigs (dotted ♩ ≤ 105), game tunes such as eighths at ♩ = 158, sixteenths up to ♩ = 79 | Coverage scoring |
| **Stretch** | 125 ms | Session reels (half ≤ 120) and jigs, baroque sixteenths up to ♩ = 120 | Coverage scoring and F6 |

A note is gradable when its length less both [edge graces](#coverage) leaves enough readings to score (the [minimum graded length](#fixes)). Ornaments (cuts, rolls, grace notes) are drawn but not graded in any tier.

### Scoring model

All of this follows [ADR 0009](../../architecture/decisions/0009-timed-songs-scored-by-coverage.md). Times are song times: each reading is placed on the song's timeline at its time less the [scoring lag](#fixes).

#### Classifying readings

Each reading is classified on its own against the note (or rest) due at its song time:

- **Correct:** it passes the judge's clarity, level and band checks, and is within the tolerance of the expected pitch.
- **Wrong:** it passes those checks but is off the expected pitch, and so are the readings just before it, for about 3 in a row (about 50 ms). This stops one octave jump or attack transient from showing red.
- **Silent:** anything else, including a wrong reading that is not yet confirmed, low level, low clarity and metronome clicks.

Each reading covers the time until the next one. Runs with the same classification merge into one segment.

#### Coverage

- **A note's coverage** is the share of its written length filled with correct readings. It uses the note's own length, not its slot, so a following rest is not part of it.
- **A rest's coverage** is the share of the rest filled with silence. A rest is a gap between one note's end and the next note's start, as [`songBars`](../../architecture/modules/song.md) already finds it.
- **Edge grace.** A short grace (about 40 ms, at least the analyser fill plus a normal articulation gap) at each edge of a note or rest is not counted, so a decaying release or the previous pitch blurring through the analyser window is not penalised. At a slurred join the grace forgives only the previous pitch; silence there still counts, so a broken slur shows.
- **Song coverage** is the mean over every graded note and rest, each counting equally, so a sixteenth counts as much as a whole note.

Silence inside a note is unfilled, never wrong: it lowers coverage and is drawn in the lane's own colour. Wrong pitch also lowers coverage and is drawn in red.

#### Joins

Every pair of neighbouring notes meets at a join:

| Join | Silence | Checked |
| --- | --- | --- |
| **Plain** (two separate notes, even at the same pitch) | required | separation, and timing at both edges |
| **Slurred** (the ABC slurs them) | must not occur; a gap is unfilled | timing of the pitch change |
| **Tied** | n/a: a tie makes one note | nothing |

**Separation:** a plain join is separated when a gap is detected within the timing tolerance of the written join. A gap is either silent readings or a dip: the level falling by some number of dB, or clarity dropping, and then recovering. A tongued break on an ocarina lasts about 20–50 ms and may never drop below the silence gate in a 43 ms analyser window, so the dip matters ([risks](#risks-and-open-questions)).

#### Timing

From the edges of each note's run of correct readings, beyond a timing tolerance (about ±60 ms):

- **Started late:** the first correct reading comes after the note's start.
- **Started early:** the correct pitch is already sounding before the note's start.
- **Ended early:** the correct pitch stops before the note's end.
- **Ended late:** the correct pitch carries on into the next note or rest.

Each is a percentage of the notes that have that edge. A note never played correctly has no edges and is left out. At a same-pitch plain join with no gap there is no edge, so only "not separated" is reported. A late change from one note to the next counts as both "ended late" and "started late". This is accepted: the figures describe what happened rather than adding to the score, and coverage counts the overhang only once.

#### Summary

After the last note's window closes (one lag after the last slot ends), the reveal area shows, for example:

> 82% covered · started late 12%, early 3% · ended early 5%, late 20% · not separated 10% · 2 notes too short to grade

The exact wording is a story's job. With nothing graded it says "End of song".

### Visual feedback

- **Playhead:** a vertical line across the current staff line and its lane. It shows the time the player hears: the audio clock, less the context's reported output latency where available. Notes are not spaced by time on the staff, so its x is interpolated piecewise between the drawn positions of notes, rests and bar lines. It speeds up over wide spacing and slows over crowded runs. It runs through the count-in bar, starts each line at the first note (after the clef and key signature), and jumps to the other row at a line break. Rows stay fixed as in F08 (line *n* in row *n* mod 2).
- **Score lane:** a thin strip under each staff line, on the same time-to-x map. Each graded note and rest has a segment spanning its written length, drawn in a neutral colour. Ungraded notes have a segment in a lighter style that never fills.
- **Fill:** as readings arrive, segments fill: green for correct (on a note) or silence (on a rest), red for wrong pitch or sound during a rest, and the neutral colour left showing for silence on a note. Wrong pitch is drawn offset up when sharp and down when flat, so colour is not the only signal. The fill trails the playhead by about the scoring lag; the playhead is not pulled back to meet it, because a player following it would then play late.
- **Fault marks:** drawn live in the lane as the fill reaches them: a tick at a segment's edge for each timing fault, and a mark at a plain join with no gap.
- **Note heads:** black for the notes on show and grey for the rest, as during F08's count-in. They are no longer coloured by result; the lane carries it.
- **Redraws:** the staff is drawn only when the rows change. The playhead and lane are an overlay updated each animation frame outside Preact state, so a frame never redraws VexFlow. A line that scrolls out of view takes its fill with it.
- A tie or slur over a line break has a segment on each row.

### Fixes

The F08 fixes, revised for coverage:

- **F1: Scoring lag (fixes P1 and P2).** Each reading is placed on the timeline at its time less a fixed scoring lag (about 100 ms, the measured round trip), possibly the input allowance plus the context's `outputLatency`. It is tuned on desktop and Android. A note's fill completes one lag after the playhead has passed it.
- **F2: Minimum graded length (fixes P3).** A note or rest is graded when its length less both edge graces is at least a minimum scored span (about 50 ms), so about 130 ms. Below that it is drawn and not graded. The value follows from the graces, so it moves when they do.
- **F3: The new summary (fixes P4).** Coverage, the four timing figures, separation, and the count of notes too short to grade (see [Summary](#summary)).
- **F4: dropped.** A faster settle rule for the expected pitch is no longer needed: coverage has no settle time.
- **F5: Feedback while playing (fixes P5).** The [visual feedback](#visual-feedback) above.
- **F6: Faster, finer readings (for the stretch tier and for separation).** Readings come once per animation frame (16.7 ms) from a 2048-sample window (43 ms). Reading 1024 samples every 5 ms from an audio worklet would cut the blur at each edge to about 12 ms, allow smaller edge graces, and make short tongued gaps visible. It changes how the audio module reads the microphone and what the detector sees ([ADR 0005](../../architecture/decisions/0005-yin-pitch-detector.md)), so it needs its own ADR and a spike.

## Out of scope

- Per-device latency calibration. The scoring lag is a fixed allowance, so a device whose real latency differs shows a steady early or late bias in the timing figures.
- Storing scores or a history of runs, or feeding timed results into [F06](../06-smart-sampling/design.md).
- Untimed songs (F07) and random cards keep the settle-based judge.
- Grading ornaments.

## Modules touched

- **song (`src/core/song`):** a note records whether it is slurred to the next. Rests from `songBars` are reused for rest coverage.
- **abc (`src/abc`):** reads slurs from abcjs and matches them to the audio sequence's notes, through repeats.
- **New core module, probably `src/core/coverage`:** classifying readings against a note timeline, coverage per note and rest, timing faults, separation and the song summary. Pure; imports pitch, judge and song. The layer rule holds.
- **judge (`src/core/judge`):** possibly a per-reading check (gates, band, tolerance) exported for the coverage module to reuse. The tone tracker is unchanged.
- **audio (`src/audio`):** placing readings on the audio clock (readings are stamped with `performance.now()` while the timed flow runs on the audio context's clock), and read access to `outputLatency`.
- **staff (`src/render/staff`):** `drawSongLines` also returns its layout: each row's y-range and lane position, and the x of every note, rest and bar line, for the time-to-x map. Room under each staff for the lane.
- **app:** `timed-flow.ts` feeds readings to the coverage module instead of a tone tracker per slot, and drops slot verdicts and `songMarks`. A new overlay component draws the playhead, lane, fill and marks on each animation frame. `judge-text.ts` holds the summary text.

## Data

No settings or stored state. The scoring lag, edge grace, wrong-reading run, timing tolerance, gap dip and minimum scored span are code constants.

## Risks and open questions

- **Gap detection.** Can a 20–50 ms tongued gap be told from a held note? Today's per-reading level probably cannot (a 43 ms window shows a 30 ms gap as a 5 dB dip at best). A fine level envelope from the analyser's overlapping windows might, without F6. See the [gap detection spike](../../research/gap-detection-spike.md). If neither works, separation waits for F6, or the gap rule is relaxed. ADR 0009 stays proposed until this is answered.
- **The lag's accuracy.** Coverage tolerates an error of tens of milliseconds, but timing figures report it on every note. Repeat the key-tap measurement on Android. Is a fixed lag good enough, or does calibration have to come into scope?
- **The two clocks.** How readings are placed on the audio clock: `AudioContext.getOutputTimestamp()`, or reading both clocks when each reading is taken. Browser support varies.
- **Slurs from abcjs.** The audio sequence carries no slurs. They must come from the parse tree and be matched to sequence notes, through repeats and endings, possibly by source position. Spike before the story.
- **Constants.** Edge grace, the wrong-reading run, timing tolerance, the gap dip and the minimum scored span are guesses. Tune them in the live check.
- **The verdict row in timed cards.** F08 shows an icon, label and judged note under the staff while playing. Keep it as a live "what I hear" readout, or drop it now that the lane carries the result?
- **Rests at speed.** A rest shorter than the minimum graded length is not graded, so a staccato passage written with short rests scores no rests.
- **Breaths.** A song with no rests forces a breath somewhere, which costs coverage and a timing fault. Accepted for now.
- **Metronome clicks.** A click during a note is silent readings, so it shows as a small unfilled sliver. Watch it in the live check.
- **Performance.** A redraw on every animation frame on a mid-range phone, with two staff rows and lanes. Keep the overlay cheap: one path per segment colour, or a canvas.
- **Tests.** Feed delayed readings on the song timeline: eighths at ♩ = 80 and faster, tongued and slurred joins, a note held through a same-pitch join, late and early edges, a rest with an overheld note.

## Stories

Not written yet. Likely: slurs in the song; a coverage core with timing and separation; readings on the audio clock with the lag; staff layout export and the lane; the playhead and live fill; fault marks and the summary.
