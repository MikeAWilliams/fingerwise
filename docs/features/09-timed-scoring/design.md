# F09: Timed scoring

- **Status:** draft

> **Provisional.** This design starts from a review of how [F08](../08-timed-play-along/design.md) scores a timed song (2026-11-22). The user intends to change scoring more broadly, so every fix below is a starting point, not a decision. It will be revised as the wider scoring rework takes shape; nothing here needs an ADR until it settles.

## Goal

A timed song's score reflects how the player played, on any supported device. A note played in time is not lost to audio latency, a late note is not punished twice, and the summary says which notes were not graded.

## Behavior

How F08 scores today, for reference: with keep tempo and judging on, each slot of at least `MIN_GRADED_SLOT_MS` (300 ms) is a listening window that opens at the slot's start, with a `TIMED_HOLD_OFF_MS` of 0 ms. A tone counts once it has held for the [settle time](../../glossary.md) (200 ms). When the slot ends, the note is correct, incorrect or missed, and any half-settled tone is dropped. The summary is "N of M correct" over graded notes only ([app module](../../architecture/modules/app.md)).

### Problems found

- **P1: Latency is not allowed for.** The window follows the audio clock, so it opens and closes when the card changes. A played note reaches the judge later than that: by the output latency of the clicks the player follows, then the microphone's input latency (50–200 ms on Android, [prior art](../../research/prior-art-and-gotchas.md)), then about 40 ms for the detector's 2048-sample window. The note must also hold for the settle time inside the window. A slot therefore needs roughly `latency + 40 + 200` ms to be scorable:

  | Device | Latency (approx.) | Shortest scorable slot | Graded but nearly unwinnable |
  | --- | --- | --- | --- |
  | Desktop, wired | 40–80 ms | 280–320 ms | almost none |
  | Android | 100–250 ms | 340–490 ms | eighths at ♩ = 67–100, quarters at ♩ ≥ 120 |
  | Bluetooth output | +150–250 ms | 500 ms + | most eighths, many quarters |

  At the default ♩ = 90 an eighth is a 333 ms slot. It is graded, but on Android it is almost always a false miss.
- **P2: A late note is punished twice.** A correct tone that is still settling when its slot ends is dropped, so that note is missed. Its tail then reaches the next slot, and if the tail lasts the settle time it is judged against the next note: a red "Incorrect", and the next note is recorded `incorrect` rather than `missed` if nothing else settles. On a high-latency device a slurred note played exactly in time can already do this.
- **P3: The minimum graded slot is a cliff.** A 299 ms slot is ignored, while a 300 ms slot is graded with about 100 ms left for all latency. The threshold does not take the settle time or latency into account.
- **P4: The summary hides ungraded notes.** "3 of 4 correct" on a 30-note tune reads as if 4 notes were played. The ungraded notes stay grey on the staff, but the text does not say so.

### Proposed fixes (provisional)

- **F1: Scoring lag (fixes P1 and P2).** The card still changes at the slot's start, but each note's listening window is shifted later by a fixed **scoring lag**: note N is judged from its slot start plus the lag to the next slot start plus the lag. The windows do not overlap, so one tracker still serves the whole song. A tone in a note's last moments, and the tail that follows it, now count for that note, not the next.
  - The lag starts as a code constant (about 120 ms), possibly plus the audio context's reported output latency. It is tuned in a live check on desktop and Android.
  - A verdict can arrive after its card has gone. It then shows only as that note's mark on the staff; the verdict row belongs to the card on show.
  - The summary appears once the last note's window closes, one lag after the last slot ends.
- **F2: Minimum graded slot from the parts (fixes P3).** The threshold is the settle time plus the scoring lag plus a margin, not a separate number, so changing any of them keeps grading winnable. With the values above it comes to about 400–450 ms.
- **F3: The summary names ungraded notes (fixes P4).** For example "14 of 20 correct, 6 too short to grade". With nothing ungraded it stays "14 of 20 correct"; with nothing graded, "End of song".

## Out of scope

- Timing judgment (onsets, early or late verdicts) and per-device latency calibration, as in F08. The scoring lag is a fixed allowance, not a measurement of the player. This may change with the wider scoring rework.
- Storing scores, or feeding timed grades into [F06](../06-smart-sampling/design.md).
- Untimed songs (F07) and random cards.

## Modules touched

- **app (`timed-flow.ts`):** windows shifted by the lag, the minimum graded slot derived, the summary's ungraded count, late results marking a note already off the card.
- **app (`judge-text.ts`):** the summary text.
- **audio (`src/audio`):** possibly, read access to the audio context's output latency.

The judge, its thresholds and the drill engine are unchanged. The layer rule holds: all of this stays in the app.

## Data

No settings or stored state. The scoring lag and the minimum graded slot are code constants.

## Risks and open questions

- **The wider scoring change.** What the user wants scoring to become may replace or reshape F1 to F3. Settle this first.
- **Were F08's constants tuned live?** `TIMED_HOLD_OFF_MS` (0 ms) and `MIN_GRADED_SLOT_MS` (300 ms) are still marked provisional. Was the F08-S03 live check done, and on which devices?
- **The lag's value.** A fixed constant, or the constant plus `outputLatency` (whose browser support varies)? A setting was not proposed; is that right?
- **A shorter settle time for timed songs.** It would widen every window, but the settle time also guards against glitches ([ADR 0005](../../architecture/decisions/0005-yin-pitch-detector.md)). Needs real recordings.
- **Incorrect versus missed.** After F1, should a note with only wrong tones still be shown the same as a miss on the staff?
- **Metronome clicks.** Each 15 ms noise click can clear a tone that has not settled for about 60 ms. That rarely matters on the beat, but may cost an off-beat note that crosses a click. Watch it in the live check.
- **Tests.** F08's tests feed readings with no latency. F09's tests should feed delayed readings.

## Stories

Not written yet; they follow once the scoring direction settles.
