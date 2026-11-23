# Gap detection between notes (F09 spike)

- **Date:** 2026-11-22 (planned; results to follow)
- **Question:** can the app tell a tongued gap between two notes from a note held through or slurred, and what is the shortest gap it detects reliably? This is the [separation](../glossary.md) check of [F09](../features/09-timed-scoring/design.md#joins), and [ADR 0009](../architecture/decisions/0009-timed-songs-scored-by-coverage.md) stays proposed until it is answered.
- **Outcome:** not run yet.

## Why today's readings are probably too coarse

Each reading's level is the RMS of the newest 2048 samples (43 ms), taken once per animation frame (16.7 ms) ([audio](../architecture/modules/audio.md)). A gap shorter than the window never fills it:

| True gap | Best-case window | Dip below the held level |
| --- | --- | --- |
| 20 ms | 23 ms of tone in 43 | about 1.5 dB at best |
| 30 ms | 13 ms of tone in 43 | about 5 dB at best |
| 50 ms | one window fully silent | full depth, if a frame lands there |

A held note wavers by a few dB with breath, so dips of 2 to 5 dB cannot be told from normal playing. For repeats of the same pitch YIN gives no help: a window that is mostly the same periodic tone keeps its clarity.

## Methods to compare

- **A: today's readings.** Per-reading level and clarity (2048 samples every 16.7 ms).
- **B: fine envelope.** At today's frame rate, the RMS of 128-sample blocks (2.7 ms) over the samples new since the last frame. Frames overlap by about 1250 samples, so every sample is seen without an audio worklet. Blocks are timed from the audio clock. A frame dropped for more than 43 ms leaves a hole.
- **C: F6 framing.** 1024 samples every 5 ms, as an audio worklet would give.

For each, try two cues: the **dip** (the level falling a number of dB below the median of the surrounding 100 ms, then recovering) and the **attack** (a sharp level rise after a dip, as a tongued start has).

## Recordings

The user plays an alto C ocarina into a Corsair HS80 headset microphone on Linux. Record in Audacity at 48 kHz, mono, 32-bit float or 16-bit WAV, with no effects and no input processing. One file per row. Say the take's name before playing, and leave a second of silence at each end.

| File | What to play | Labels |
| --- | --- | --- |
| `repeat-tongued-<pitch>-<tempo>.wav` | One pitch, tongued: 4 quarters, 8 eighths, 8 sixteenths, at ♩ = 80, 100 and 120, for a low (C5), a middle (G5) and a high (E6) written note | positive |
| `repeat-held-<pitch>.wav` | The same pitch held steadily for about 4 s, with no tongue and no breath push | negative |
| `repeat-huff-<pitch>.wav` | The same pitch, repeats made with breath pushes only, no tongue | grey zone |
| `change-tongued-<tempo>.wav` | A scale up and down, tongued, eighths at ♩ = 80 and 120 | positive |
| `change-slurred-<tempo>.wav` | The same scale slurred | negative |
| `staccato.wav` | Short detached quarters at ♩ = 80 | easy positive |
| `metronome.wav` | `repeat-tongued` eighths at ♩ = 100 with the app's metronome clicking through the headset's own speakers (or desktop speakers) | positive, with noise |

## Ground truth

For each join, measure the true gap in Audacity's waveform: from where the tone's amplitude collapses to where the next attack begins. This also records how long the user's tongued gaps really are at each tempo.

## Pass criteria (proposed)

- At least 95% of tongued gaps found at eighths ♩ = 120, at every pitch.
- At most 2% of false gaps on held and slurred takes.
- One set of thresholds that works across low, middle and high notes.
- Breath pushes are reported, not judged: they decide whether a huff counts as separated, which is the user's call.

## Fixtures

Trim a few short clips (a few hundred KB each) to `tests/fixtures/` as WAV, so the coverage module's tests run on real playing. WAV parses without a dependency. The recordings are the user's own playing.

## Limits

Only the HS80 headset is recorded. A close microphone picks up little of the room, so this is the easy case. A laptop microphone (reverb filling the gaps) and Android remain untested. Until they are tested, the findings hold for headset desktops only.

## Method of the run

A throwaway Bun script in a scratch project outside the repo. It reads the WAVs, frames them as A, B and C, reuses `detectPitch` and `rmsDb` from `src/audio/detector.ts`, and compares detected gaps with the labels. Nothing is added to `package.json` or `src/`.
