# Pitch detection for the judge (F04 spike)

- **Date:** 2026-11-07
- **Question:** which pitch detector, and which clarity threshold, noise gate, settle time, hold-off and tolerance, should the [F04 judge](../features/04-record-and-judge/design.md) use for a 12-hole alto C ocarina?
- **Outcome:** a hand-written YIN, no dependency ([ADR 0005](../architecture/decisions/0005-yin-pitch-detector.md)). Thresholds below.
- **Status of the numbers:** provisional. Every fixture is generated; no real recording was used (the user's choice). The thresholds are confirmed or retuned in the live check after [F04-S06](../features/04-record-and-judge/stories/F04-S06-verdict-and-pitch-graph.md), when the user plays a real ocarina.

## Method

- **Detectors:** Pitchy 4.1.0 (McLeod pitch method, FFT autocorrelation, depends on `fft.js`) and a hand-written YIN (de Cheveigné and Kawahara 2002: difference function, cumulative mean normalization, absolute threshold 0.15, parabolic interpolation, search 200 Hz to 2 kHz; clarity is `1 - d'(τ)`). Pitchy's clarity is its NSDF peak. Pitchy's own volume gate was turned off and its `clarityThreshold` (MPM peak picking, not an output gate) left at 0.9.
- **Framing:** 48 kHz, a 2048-sample window (43 ms), read every 800 samples (16.7 ms, one read per 60 Hz animation frame), as an `AnalyserNode` polled from `requestAnimationFrame` would give. Level is the window's RMS in dBFS.
- **Run:** a throwaway Bun script in a scratch project outside the repo; Pitchy was installed only there. Nothing was added to `package.json` or `src/`.

### Fixtures (all generated)

The ocarina model is a near-sine: the fundamental, a 2nd harmonic at −24 dB and a 3rd at −32 dB, a slow drift (±3 cents at 4.5 Hz, ±2 cents at 0.7 Hz), optional breath noise (high-passed white noise following the envelope), and mic self-noise at −100 dBFS.

| Group | Count | What |
| --- | --- | --- |
| Steady | 189 | Every semitone of the alto C's sounding range, A4 to F6 (21 notes), at peak levels −6, −24 and −40 dBFS, with no breath noise and with breath noise 20 dB and 10 dB below the tone. |
| Rising | 10 | Breath pressure: pitch glides from −70 to +10 cents over 300 ms with a 120 ms attack (five notes across the range, two levels). Harsher than a tongued attack, on purpose. |
| Unsteady attack | 10 | 120 ms of pitch jumps of up to a semitone every 10 ms and fluttering level, then steady. |
| Offset | 40 | Steady tones played −45, −30, +30 and +45 cents off, to check the verdict either side of the 40-cent tolerance. |
| Noise | 13 | Silence; white hiss at −30, −45, −60 dBFS; mains hum (50 Hz plus 150 Hz) at −30, −45; synthetic speech (glottal pulses through vowel formants, 4 syllables a second, moving f0) at f0 110, 210 and 320 Hz and two levels; hand-clap-like clicks. |
| Room tail | 18 | A 0.5 s tone (A4, A5, F6) at −6 and −20 dBFS that stops, then the room's reverberation decays with RT60 0.3, 0.6 and 1.0 s. |

## Results

### Accuracy and cost

Per-frame error on the steady part of steady tones:

| Breath noise | Pitchy p50 / p99 / max | YIN p50 / p99 / max | Clarity p1 (both) |
| --- | --- | --- | --- |
| none | 1.8 / 4.6 / 4.7 ¢ | 1.8 / 4.9 / 5.3 ¢ | 1.00 |
| 20 dB below | 1.8 / 5.2 / 6.3 ¢ | 2.0 / 5.6 / 6.3 ¢ | 0.99 |
| 10 dB below | 3.0 / 13 / 25 ¢ | 4.0 / 15 / 28 ¢ | 0.94 |

- The level (−6 to −40 dBFS) made no difference. Neither detector made an octave or other gross error on any tone frame (0 of 7,371 each).
- The error includes the model's own drift of up to ±5 cents.
- Cost per frame on a desktop CPU: Pitchy 0.05 ms, YIN 0.22 ms. At 60 reads a second YIN uses about 1.3% of a desktop core; a phone several times slower is still well within budget.

### Noise

- **Pitchy reports a pitch for anything.** On silence, hiss and clicks it reports about 23 Hz with clarity up to 1.0, and on mains hum 50 Hz with clarity 1.0. Its clarity alone cannot reject noise; a frequency band must.
- **YIN's clarity rejects broadband noise by itself:** at most 0.10 on hiss, 0.32 on clicks, 0 on hum (below its search range).
- **Voiced speech is periodic** and both detectors give it clarity 0.97 to 0.99 when f0 is 210 Hz or above. Only the frequency band and the steadiness rule keep it out.
- With a band of 220 to 2794 Hz, Pitchy reports no in-band frame at all on hiss, hum or silence.

### The stability rule

A reading counts when its clarity, level and frequency all pass. A tone is heard when counted readings stay within a spread band (max minus min, in cents) for the settle time. Its value is the median of the window.

Without a frequency band, both detectors give false verdicts on noise: Pitchy on hum and speech in every setting, YIN on speech at short settle times. With the band 220 to 2794 Hz:

| Rule (clarity 0.9, gate −55 dBFS) | Pitchy wrong / false | YIN wrong / false | Time to verdict p50 / p95 |
| --- | --- | --- | --- |
| settle 150 ms, band 35 ¢ | 3 / 2 | 2 / 1 | 143–159 / 159–176 ms |
| settle 150 ms, band 25 ¢ | 1 / 0 | 2 / 0 | 143–159 / 176–193 ms |
| settle 150 ms, band 20 ¢ | 0 / 0 | 1 / 0 | 159 / 276–293 ms |
| **settle 200 ms, band 25 ¢** | **0 / 0** | **0 / 0** | **209 / 326 ms** |
| settle 200 ms, band 35 ¢ | 0 / 1 | 0 / 0 | 193–209 / 259–276 ms |

"Wrong" counts the 249 tone fixtures judged differently from the intended verdict (correct within 40 cents). "False" counts the 13 noise fixtures that produced any verdict. Every tone fixture got a verdict in every setting above.

- The wrong verdicts at 150 ms are all **rising** fixtures, judged at about −42 cents in the middle of the breath glide.
- The false verdicts are the 210 Hz and 320 Hz **speech**, caught on a turn of its pitch contour.
- A clarity threshold of 0.95 missed every tone with breath noise 10 dB below it (clarity about 0.947). 0.93 has too little margin over that, so 0.9.
- The gate made no difference between −60 and −50 dBFS on these fixtures. The quietest tone (−40 dBFS peak) is about −43 dBFS RMS.

### Room tail (hold-off)

Under the proposed rule, could a stable verdict still form from the previous tone's tail if listening starts this long after the tone stops? (V = yes. Both detectors gave identical results.)

| Tail | 0 ms | 200 ms | 300 ms | 400 ms | 500 ms |
| --- | --- | --- | --- | --- | --- |
| −20 dBFS, RT60 0.3 s | – | – | – | – | – |
| −6 dBFS, RT60 0.3 s | V | – | – | – | – |
| −20 dBFS, RT60 0.6 s | V | – | – | – | – |
| −6 dBFS, RT60 0.6 s | V | V | – | – | – |
| −20 dBFS, RT60 1.0 s | V | V | – | – | – |
| −6 dBFS, RT60 1.0 s | V | V | V | V | – |

The F03 tone may end exactly when the next card appears (sound delay plus duration may equal the advance delay), and a click cuts it at once. So the hold-off must cover the whole tail, counted from the card's appearance.

## Proposed values

| Parameter | Value | Supported by |
| --- | --- | --- |
| Detector | Hand-written YIN | Same accuracy as Pitchy, zero errors with the rule below, no dependency; its clarity also rejects broadband noise by itself. [ADR 0005](../architecture/decisions/0005-yin-pitch-detector.md). |
| Frequency band | Readings count only between one octave below the instrument's lowest sounding pitch and one octave above its highest (220 to 2794 Hz for the alto C) | Removes Pitchy's 23 Hz and 50 Hz reports, mains hum and most speech. One octave each way still lets an octave error be heard and judged incorrect. |
| Clarity threshold | 0.9 | Tones with heavy breath noise sit at about 0.947; noise in band stays at or below 0.73 except voiced speech. |
| Noise gate | −55 dBFS RMS | No effect in the range tried; 12 dB under the quietest fixture. The live check sets it against a real room and microphone. |
| Steadiness | All readings in the settle window within 25 cents of each other | 35 cents lets speech and a slow breath glide through; 20 cents slows verdicts with no gain. |
| Settle time | 200 ms (was "about 150 ms") | The only setting with no wrong or false verdict on either detector. Verdicts arrive at about 210 ms median and 330 ms p95 after the tone starts. |
| Hold-off | 500 ms from the card's appearance | Covers a loud tone in a live room (RT60 1.0 s). A player needs longer than that to read a card, finger and blow, so it costs nothing; a tone already sounding is judged once the hold-off ends. |
| Tolerance | Default 40 cents, bounds 10 to 45 (unchanged) | The detector's verdict error is under 10 cents at p95 (median 3), so 10 cents is a usable strictest setting. The default is a teaching choice; the live check may change it. |
| Analysis window | 2048 samples, read once per animation frame | What was measured. 43 ms at 48 kHz covers at least 9 periods of A4. |

## Not established

- **Real ocarinas, rooms and microphones.** The model has no real attack transients, no fingering-change glitches, and no device frequency response. All values are provisional until the live check.
- **The browser's microphone processing.** Echo cancellation, noise suppression and auto gain are not simulated. [F04-S03](../features/04-record-and-judge/stories/F04-S03-microphone-pitch-stream.md) turns them all off, and the live check confirms that a steady tone is not faded.
- **Phone CPU cost.** It was measured on a desktop only. If YIN is too slow on a phone, read every second animation frame (this needs a shorter settle window in frames, not in time) or narrow the search range to the frequency band.
- **Real speech and whistling.** A held, sung or whistled note in the band is a real tone and will be judged; this is expected and not a fault.
- **Android microphone latency** is checked by hand on the [target matrix](../features/02-deploy-and-pwa/design.md#target-matrix). It delays verdicts but does not change them.
