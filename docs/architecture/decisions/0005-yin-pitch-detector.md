# 0005: Hand-written YIN pitch detector for the judge

- **Status:** accepted
- **Date:** 2026-11-07

## Context
Feature 4 grades a card from the pitch the player plays into the microphone ([F04 design](../../features/04-record-and-judge/design.md)). An ocarina gives a soft, near-sine tone whose pitch rises with breath pressure, and the judge must ignore room noise, speech and the previous card's tone. The vision named Pitchy as the candidate. Adding a dependency needs the user's agreement ([CLAUDE.md](../../../CLAUDE.md#rules)), so a spike compared Pitchy with a small own YIN on generated fixtures. The method, numbers and proposed thresholds are in the [research note](../../research/pitch-detection-spike.md).

## Decision
- **Detector:** a hand-written YIN (difference function, cumulative mean normalization, absolute threshold 0.15, parabolic interpolation), searching at least the judge's frequency band. Its clarity is `1 - d'(τ)` at the chosen lag. No dependency is added.
- **Where:** in `src/audio`, next to the microphone listener that feeds it; the only place audio samples are analysed. It is a pure function over a sample buffer and the sample rate, so it is unit tested in Node without a microphone.
- **Input:** a 2048-sample window from an `AnalyserNode`, read once per animation frame. Each reading carries the time, the frequency (or none), the clarity and the RMS level.
- **Thresholds:** the judge's defaults come from the research note: clarity 0.9, gate −55 dBFS RMS, a frequency band of one octave beyond the instrument's sounding range each way, readings within 25 cents for a 200 ms settle time, and a 500 ms hold-off. They stay provisional until the live check after [F04-S06](../../features/04-record-and-judge/stories/F04-S06-verdict-and-pitch-graph.md), and retuning them needs no new ADR.

## Alternatives considered
- **Pitchy (McLeod pitch method):** the same accuracy on every fixture (median error about 2 cents, no octave errors) and four times faster (0.05 ms against 0.22 ms a frame on a desktop). Rejected because it adds two packages (Pitchy and `fft.js`) for no gain in accuracy, and because its clarity is high on silence, hiss and hum (it reports 23 Hz or 50 Hz with clarity up to 1.0), so it relies entirely on the frequency band to reject noise. YIN's clarity rejects broadband noise by itself.
- **Plain autocorrelation or FFT peak picking:** simpler, but prone to octave errors on near-sine tones with weak harmonics. Not tried.
- **Machine-learned detectors (CREPE and similar):** accurate, but a large model download for an offline PWA that only needs one clear tone at a time.

## Consequences
- No new dependency; the detector is about 50 lines that the project owns and tests.
- The CPU cost is higher than Pitchy's. It was measured on a desktop only. If a phone struggles, read every second animation frame or narrow the search to the frequency band; neither changes this decision.
- The judge's frequency band depends on the instrument's sounding range, so `src/core/judge` reads the instrument definition (allowed by the layer rule) to get it.
- Voiced speech, singing and whistling in the band are periodic and can be judged as tones; the steadiness rule makes this rare but does not prevent it.
- The F04 spike story (F04-S01) was removed: its work is this ADR and the research note.
