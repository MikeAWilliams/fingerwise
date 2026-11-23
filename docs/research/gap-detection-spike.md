# Gap detection between notes (F09 spike)

- **Date:** 2026-11-22 (planned; results to follow)
- **Question:** can the app tell a tongued gap between two notes from a note held through or slurred, and what is the shortest gap it detects reliably? This is the [separation](../glossary.md) check of [F09](../features/09-timed-scoring/design.md#joins), and [ADR 0009](../architecture/decisions/0009-timed-songs-scored-by-coverage.md) stays proposed until it is answered.
- **Outcome:** for a headset microphone, yes. A fine level envelope (method B) separates gaps of 10 ms or more from held and slurred playing with a wide margin, using the analyser the app already has. Today's per-reading level (method A) meets the pass criteria with a thin margin. See [Results](#results).

## First recording

`samples/tonged-repeat.wav` (the file's own spelling), reviewed 2026-11-22 with throwaway scripts using the app's `detectPitch` and `rmsDb`:

- 48 kHz, 16-bit mono, 19.1 s. Peak −9.3 dBFS with no clipping, noise floor −77 dB, so about 60 dB of range.
- 8 notes on written C4 (sounding C5), 1.0 to 1.4 s each.
- **Gaps:** 560 to 710 ms of real silence, about 70 dB down. These are full stops between notes, not short tongued breaks. The app's per-reading level (2048 samples every 800) sees each as a 52 to 56 dB dip, so long gaps are detected trivially. Each clean release and attack is the raw material for the [made cases](#made-cases).
- **A messy release:** after note 5 the level drops for 4 ms, then a 32 ms puff at −39 dB at the same pitch follows. A naive note finder reads it as an extra note. Edge graces and a minimum run length must absorb it.
- **Tuning:** tracked at the app's framing, notes start 10 to 30 cents flat of C5 and sag to 60 to 100 cents flat as the breath eases. The first note is 46 to 107 cents flat throughout. Under a 40-cent tolerance this correctly fingered playing would score about 20 to 60%. This led to scoring the right note and reporting tuning apart ([ADR 0009](../architecture/decisions/0009-timed-songs-scored-by-coverage.md)). Some of the flatness may be the instrument; check it against a tuner.

## Results

All four takes are in `samples/` (the two tongued takes spelled `tonged-`). All are 48 kHz 16-bit mono with no clipping, and the noise floor is 55 to 60 dB below the notes.

### Real takes

| Take | What was played | Gaps and dips |
| --- | --- | --- |
| `tonged-repeat.wav` | 8 notes on written C4 | 560 to 710 ms full stops, about 70 dB deep |
| `tonged-scale.wav` | written C4 up to E5, tongued | 104 to 215 ms tongued gaps, 45 to 65 dB deep; method A sees 24 to 50 dB |
| `held.wav` | written C4, 3.3 s | deepest dip below the surrounding 100 ms median: A 0.2 dB, B 0.7 dB |
| `slurred-scale.wav` | written C4 upwards, slurred | deepest dip at a note change: A 2.4 dB, B 4.5 dB |

At a novice's slow tempo, tongued gaps are long and obvious. There were no false gaps on the held note or the slurred scale.

### Made cases

The 16 real gaps were shortened, keeping each real release and attack. The table gives the smallest dip below the held level each method saw, at the worst placement of its frame grid:

| Made gap | A: 2048 every 800 | B: 128-sample blocks | C: 1024 every 240 |
| --- | --- | --- | --- |
| 50 ms | 17.4 dB | 30.2 dB | 22.1 dB |
| 40 ms | 12.5 dB | 27.7 dB | 19.8 dB |
| 30 ms | 9.2 dB | 27.1 dB | 18.6 dB |
| 20 ms | 6.3 dB | 21.8 dB | 15.6 dB |
| 10 ms | 4.1 dB | 18.2 dB | 11.0 dB |

The largest false dips were A 2.4 dB and B 4.5 dB. Real dips are deeper than the [estimate below](#why-todays-readings-were-expected-to-be-too-coarse) because a release and an attack take time to fade and rise; they are not a hard switch.

- **Method A** passes the criteria (every gap of 30 ms or more found, no false gaps) with a dip threshold of about 5 dB. The margin is thin: 6.3 dB at 20 ms against 2.4 dB false.
- **Method B** separates every made gap, even 10 ms, from the false dips with a threshold around 10 dB, a margin of more than 10 dB. It needs no audio worklet, so separation does not wait for F6.
- **Method C** (F6's framing) is better than A and worse than B for this purpose.

### Tuning (beyond the question)

- `held.wav`: −30 to +34 cents. Steady.
- `tonged-scale.wav`: with the ±50-cent right-note band, 82% of readings (after 40 ms at each edge) are the right note; ±75 cents would give 95%. The D was 60 to 80 cents sharp throughout. Tongued attacks start up to 75 cents sharp for about 50 ms. Several releases slide to the next note (+200 cents) as the fingers move before the air stops, which coverage shows as red at the note's end.
- `slurred-scale.wav`: almost every note reads about a semitone flat (B4, C♯5, D♯5, … where C5, D5, E5 were expected). The user thinks it was a playing error. It does not affect the gap result: the take is a no-gap case, and it has no dips whatever its pitch. As a fixture it is labelled as played, a slurred scale about a semitone flat, which makes it a real case of drift for the pitch trace.
- The user chose to keep the band at ±50 cents and to give feedback instead: a trace spanning ±150 cents and a per-note tuning list ([F09](../features/09-timed-scoring/design.md#visual-feedback)).

### Limits of these results

- One headset microphone, close to the instrument. Laptop microphones (with room reverb filling the gaps) and Android are untested.
- Slow playing only; the short gaps were spliced, not played. Check real fast tonguing in the live check.
- 16 made gaps; the no-gap cases are one held note and one slurred scale. Treat the thresholds as starting values.
- The dip in the made cases is measured against the notes' median level, and in the negatives against the surrounding 100 ms. The live implementation should use one rule for both.

## Why today's readings were expected to be too coarse

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

## Recording

The user is a novice player, so the recording is one short, slow take on easy notes. Speed is not what is being tested: the hard cases are made from it by editing (see [Made cases](#made-cases)).

- [ ] Audacity: project rate 48000 Hz, mono, the HS80 as input, no effects. A loud note peaks around −6 dB and never clips.
- [ ] Four short takes, no metronome, each exported as a WAV into `samples/` with a second of silence at each end:
  - [ ] `samples/tongued-repeat.wav`: 8 tongued notes on one comfortable note, slowly (about one a second)
  - [ ] `samples/held.wav`: the same note held for about 4 s
  - [ ] `samples/tongued-scale.wav`: C D E F G F E D C, tongued, slowly
  - [ ] `samples/slurred-scale.wav`: C D E F G F E D C, slurred (one breath, fingers only)
- [ ] Tell Claude which note was used in `tongued-repeat.wav` and `held.wav`.

## Made cases

From the recording the script makes:

- **Shorter gaps:** each real tongued gap in `tongued-repeat.wav` and `tongued-scale.wav` cut down to 50, 40, 30, 20 and 10 ms, keeping the real release and attack on either side. This stands in for fast tongued playing.
- **Repeats from a held note:** `held.wav` cut at points along the note and rejoined with no gap, as negatives.
- **Placement:** each made case shifted by fractions of a frame, so a gap does not always land in the same place in the analyser's window.

## Ground truth

The script measures each true gap from a 1 ms envelope of the original recording, from where the tone's amplitude collapses to where the next attack begins. In the made cases the gap length is known exactly. This also records how long a novice's tongued gaps are at a slow tempo.

## Pass criteria (proposed)

- At least 95% of made gaps of 30 ms or longer found, on every note.
- At most 2% of false gaps on the held note and the slurred scale.
- One set of thresholds that works across all the notes recorded.

## Fixtures

Short clips (a few hundred KB each) trimmed to `tests/fixtures/` as WAV, so the coverage module's tests run on real playing. WAV parses without a dependency. The recording is the user's own playing.

## Limits

- Only the HS80 headset is recorded. A close microphone picks up little of the room, so this is the easy case. A laptop microphone (reverb filling the gaps) and Android remain untested.
- Spliced gaps keep real attacks but not the way a player's attack changes at speed, so a live check at faster tempos is still needed.
- Breath pushes without the tongue are not recorded. Whether one counts as separated stays open.
- Notes above G5 are not recorded.

## Method of the run

A throwaway Bun script in a scratch project outside the repo. It reads the four WAVs, makes the made cases, frames everything as A, B and C, reuses `detectPitch` and `rmsDb` from `src/audio/detector.ts`, and compares detected gaps with the truth. Nothing is added to `package.json` or `src/`.
