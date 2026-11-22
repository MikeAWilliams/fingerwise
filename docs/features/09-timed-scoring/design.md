# F09: Timed scoring

- **Status:** draft

> **Provisional.** This design starts from a review of how [F08](../08-timed-play-along/design.md) scores a timed song (2026-11-22). The user intends to change scoring more broadly, so every fix below is a starting point, not a decision. It will be revised as the wider scoring rework takes shape; nothing here needs an ADR until it settles.

## Goal

A timed song's score reflects how the player played, on any supported device, for real flue music: songs, slow-session dance tunes, game tunes and baroque pieces, not only beginner exercises (see [Targets](#targets-provisional)). A note played in time is not lost to audio latency, a late note is not punished twice, the player gets feedback as they play, and the summary says which notes were not graded.

## Behavior

How F08 scores today, for reference: with keep tempo and judging on, each slot of at least `MIN_GRADED_SLOT_MS` (300 ms) is a listening window that opens at the slot's start, with a `TIMED_HOLD_OFF_MS` of 0 ms. A tone counts once it has held for the [settle time](../../glossary.md) (200 ms). When the slot ends, the note is correct, incorrect or missed, and any half-settled tone is dropped. The summary is "N of M correct" over graded notes only ([app module](../../architecture/modules/app.md)).

### Measured latency

Measured on 2026-11-22 by tapping a key next to the microphone and timing the first frame where the level jumps, read the way the app reads it (2048-sample analyser, one reading per animation frame):

| Setup | Input (measured) | Output (browser-reported) |
| --- | --- | --- |
| Linux, Firefox 160, Corsair HS80 (2.4 GHz USB receiver, not Bluetooth) | median 71 ms, 64–80 over 26 taps; about 55 ms after allowing for the key's own sound | 42 ms (`outputLatency`) |
| Android | not measured; 50–200 ms reported in [prior art](../../research/prior-art-and-gotchas.md) | not measured |

The spread is one display frame (16.7 ms), so the input delay itself is steady.

### The time budget for a note

A note played exactly on the beat the player hears can only be marked correct once this much of its slot has passed:

| Part | Today | With F1 | With F1 and F4 |
| --- | --- | --- | --- |
| Output latency (the beat is heard late) | 40 ms | absorbed by the lag | absorbed by the lag |
| Input latency | 55 ms | absorbed by the lag | absorbed by the lag |
| The note filling the analyser window | 25 ms | 25 ms | 25 ms |
| Steady pitch before a verdict | 200 ms | 200 ms | ~80 ms |
| **Total** | **~330 ms** | **~225 ms** | **~105 ms** |
| Slot needed with 70 ms to spare for timing wobble and the attack | 400 ms | 295 ms | 175 ms |
| Fastest eighth note with that margin | ♩ = 75 | ♩ = 101 | ♩ = 171 |
| Fastest sixteenth note with that margin | none | none | ♩ = 85 |

An eighth at ♩ = 80 is a 375 ms slot: 45 ms to spare today, 150 ms with F1, 270 ms with F1 and F4. At ♩ = 90 to 100 it is effectively always missed today. Most of the cost is the settle time, not latency, so F1 alone is not enough.

### Targets (provisional)

From the [note lengths in real flue music](../../research/flue-music-tempos.md), in three tiers. Each must be graded with at least 50 ms to spare on desktop.

| Tier | Shortest note | Covers | Needs |
| --- | --- | --- | --- |
| **Must** | 250 ms | Songs and beginner material: eighths up to ♩ = 120 | F1 and F4 |
| **Must** | 190 ms | Slow-session reels (half ≤ 78) and jigs (dotted ♩ ≤ 105), game tunes such as eighths at ♩ = 158, sixteenths up to ♩ = 79 | F1 and F4: 105 ms needed, about 85 ms to spare |
| **Stretch** | 125 ms | Session reels (half ≤ 120) and jigs, baroque sixteenths up to ♩ = 120 | F1, F4 and F6 |

Ornaments (cuts, rolls, grace notes) are not graded in any tier.

### Problems found

- **P1: Latency is not allowed for.** The window follows the audio clock, so it opens and closes when the card changes. A played note reaches the judge later than that: by the output latency of the clicks the player follows, then the microphone's input latency, then about 25 ms for the note to fill the analyser window (see the budget above). On Android, with more input latency, eighths are lost at slower tempos still.
- **P2: A late note is punished twice.** A correct tone that is still settling when its slot ends is dropped, so that note is missed. Its tail then reaches the next slot, and if the tail lasts the settle time it is judged against the next note: a red "Incorrect", and the next note is recorded `incorrect` rather than `missed` if nothing else settles.
- **P3: The minimum graded slot is a cliff.** A 299 ms slot is ignored, while a 300 ms slot is graded with no time to spare. The threshold does not take the settle time or latency into account.
- **P4: The summary hides ungraded notes.** "3 of 4 correct" on a 30-note tune reads as if 4 notes were played. The ungraded notes stay grey on the staff, but the text does not say so.
- **P5: Little feedback while playing.** A verdict appears only once a tone has settled, a miss shows nothing, and the card moves on regardless; the colours on the staff and the end summary are the only lasting signal. In the user's testing this is what makes scoring feel bad, more than the misses themselves.
- **P6: Short notes are not gradable.** Eighths at ♩ = 80, which are common, have 45 ms to spare at best, and eighths from about ♩ = 90 are effectively always missed (see the budget). Triplet eighths and sixteenths at ordinary tempos are not graded at all. Today nothing below the first target tier is gradable, and slow-session dance tunes are out of reach.

### Proposed fixes (provisional)

- **F1: Scoring lag (fixes P1 and P2).** The card still changes at the slot's start, but each note's listening window is shifted later by a fixed **scoring lag**: note N is judged from its slot start plus the lag to the next slot start plus the lag. The windows do not overlap, so one tracker still serves the whole song. A tone in a note's last moments, and the tail that follows it, now count for that note, not the next.
  - The lag starts as a code constant (about 100 ms, the measured round trip), possibly the input allowance plus the audio context's reported output latency. It is tuned on desktop and Android.
  - A verdict can arrive after its card has gone. It then shows only as that note's mark on the staff; the verdict row belongs to the card on show.
  - The summary appears once the last note's window closes, one lag after the last slot ends.
- **F2: Minimum graded slot from the parts (fixes P3).** The threshold is the time a correct note needs (the budget above, after F1 and F4) plus a margin, not a separate number, so changing any part keeps grading winnable. With F1 and F4 it comes to about 175 ms, so eighths at any ordinary tempo and sixteenths up to about ♩ = 85 are graded.
- **F3: The summary names ungraded notes (fixes P4).** For example "14 of 20 correct, 6 too short to grade". With nothing ungraded it stays "14 of 20 correct"; with nothing graded, "End of song".
- **F4: A faster "correct" in timed songs (fixes P6).** The judge's 200 ms settle time is for identifying an unknown tone. In a timed song the expected pitch is known, so a correct note needs less evidence: about 80 ms of readings within tolerance of the expected pitch. Wrong tones keep the slower rule, so a glitch or an attack transient cannot easily show "Incorrect". The settle time is a judge threshold ([ADR 0005](../../architecture/decisions/0005-yin-pitch-detector.md)); a different rule for timed songs needs an ADR before it is built.
- **F5: Feedback while playing (fixes P5).** Not designed yet; depends on the wider scoring rework. F4 already makes a correct mark appear about 120 ms sooner.
- **F6: Faster, finer readings (for the stretch tier).** Readings come once per animation frame (16.7 ms) from a 2048-sample window (43 ms), so a 125 ms note gives about seven readings, the first two smeared with the note before. Reading more often from a smaller window (for example 1024 samples every 5 ms, from an audio worklet rather than animation frames) cuts the fill to about 12 ms and lets F4's evidence time drop to about 50 ms. That needs about 62 ms, leaving about 60 ms to spare at 125 ms. It changes how the audio module reads the microphone and what the detector sees ([ADR 0005](../../architecture/decisions/0005-yin-pitch-detector.md)), so it needs an ADR and a spike to check accuracy with the smaller window. At this speed a per-slot rule (was the expected pitch the main pitch heard in the slot?) may suit better than a settle-style verdict; that belongs to the wider scoring rework.

## Out of scope

- Timing judgment (onsets, early or late verdicts) and per-device latency calibration, as in F08. The scoring lag is a fixed allowance, not a measurement of the player. This may change with the wider scoring rework.
- Storing scores, or feeding timed grades into [F06](../06-smart-sampling/design.md).
- Untimed songs (F07) and random cards.

## Modules touched

- **app (`timed-flow.ts`):** windows shifted by the lag, the minimum graded slot derived, the summary's ungraded count, late results marking a note already off the card.
- **app (`judge-text.ts`):** the summary text.
- **judge (`src/core/judge`):** F4's expected-pitch rule, as a tracker option or a second tracker. The layer rule holds: it knows only pitch and frequency.
- **audio (`src/audio`):** possibly, read access to the audio context's output latency.

## Data

No settings or stored state. The scoring lag, F4's evidence time and the minimum graded slot are code constants.

## Risks and open questions

- **The wider scoring change.** What the user wants scoring to become may replace or reshape these fixes. Settle this first.
- **The targets.** The tiers rest on a quick web search, mostly forum figures. Is the stretch tier in this feature or a later one? The budget assumes a perfectly timed player.
- **Ornaments in the ABC.** If abcjs's audio sequence includes grace notes, they become very short slots. They should be shown but never graded; check how they come through.
- **F4's evidence time.** 80 ms is a guess. Too short and an attack transient or a slide through the right pitch counts as correct. Needs real recordings of tongued and slurred eighths, and of wrong notes near the right one.
- **The lag's value.** A fixed constant, or partly from `outputLatency` (whose browser support varies)? Android input latency is unmeasured; repeat the key-tap measurement there.
- **Repeated notes.** With a short evidence time and no hold-off, a held note counts for a repeat of the same pitch even sooner. F08 accepted that leniency; check it still holds.
- **Incorrect versus missed.** After F1, should a note with only wrong tones still be shown the same as a miss on the staff?
- **Metronome clicks.** Each 15 ms noise click can clear a tone that has not settled for about 60 ms. With F4's shorter evidence time that matters more for an eighth that starts on a click. Watch it in the live check.
- **Tests.** F08's tests feed readings with no latency. F09's tests should feed delayed readings and eighth-note slots at ♩ = 80 and faster.

## Stories

Not written yet; they follow once the scoring direction settles.
