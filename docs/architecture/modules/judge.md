# judge

`src/core/judge/index.ts`

## Purpose

Turns a heard frequency into a note, an offset and a verdict, and turns a stream of noisy detector readings into at most one stable tone. It compares in sounding pitch; converting a heard note back to written pitch for display happens in the app. It is pure: time comes in with each reading and with `reset`, and it never reads a clock or starts a timer. Built in [F04-S02](../../features/04-record-and-judge/stories/F04-S02-judge-rules.md).

## Public interface

- `type Grade = "correct" | "incorrect"`.
- `interface FrequencyBand { minHz, maxHz }`.
- `interface Reading { time, frequency, clarity, level }`: `time` in ms, `frequency` in Hz or null, `clarity` in [0, 1], `level` RMS in dBFS. The [audio](audio.md) listener's reading has the same fields and passes straight through.
- `nearestPitch(hz): { pitch, cents }`: rounds `69 + 12 * log2(hz / 440)`; `cents` is in [-50, 50]. Exactly midway rounds up (to -50 from the upper pitch).
- `centsFrom(hz, expected): number`: `1200 * log2(hz / toFrequency(expected))`, signed.
- `judge(expected, hz, toleranceCents): Grade`: correct when `|centsFrom|` is within the tolerance, inclusive (with a 1e-6 cent allowance for floating-point error). An octave is 1200 cents, so it is always incorrect.
- `frequencyBand(instrument): FrequencyBand`: one octave below the lowest sounding pitch to one octave above the highest, so an octave error is still heard. 220 to about 2793.8 Hz for the alto C.
- `interface StabilityOptions { band, clarity, gateDb, spreadCents, settleMs, holdOffMs }`: `band` null counts every frequency.
- `DEFAULT_THRESHOLDS`: clarity 0.9, gate -55 dBFS, spread 25 cents, settle 200 ms, hold-off 500 ms, no band. The app adds the instrument's band. Every function takes the thresholds as a parameter; nothing reads a global.
- `createToneTracker(options): ToneTracker` with:
  - `reset(startMs)`: start listening afresh; clears the run and re-arms the report.
  - `push(reading): number | null`: ignores readings before `startMs + holdOffMs`. A reading counts when its frequency is present, its clarity and level are at or above the thresholds and it is inside the band; a failing reading clears the run. While the run's spread (max over min, in cents) exceeds `spreadCents`, the oldest readings are dropped. When the run spans at least `settleMs` (newest time minus oldest), it returns the median frequency once, then null until the next `reset`. Before the first `reset` it returns null.

## Thresholds

The values are provisional, from the [detector spike](../../research/pitch-detection-spike.md#proposed-values) on generated tones, and are confirmed or retuned in the live check after [F04-S06](../../features/04-record-and-judge/stories/F04-S06-verdict-and-pitch-graph.md). Retuning needs no new ADR ([ADR 0005](../decisions/0005-yin-pitch-detector.md)).

## Dependencies

`src/core/pitch` and `src/core/instrument` only. The [drill](drill.md) does not import the judge, and the judge does not import the drill.

## Tests

- `tests/core/judge.test.ts`: `nearestPitch` for A4 and equal-tempered values, rounding near ±50; midway C5/C♯5 is +50 and -50; the tolerance boundary (40 correct, 40.01 incorrect), neighbouring semitone and octaves incorrect; the alto C band; the default thresholds; reading sequences at 16.7 ms steps for a steady tone, a wobble within 25 cents, jumps, a jump to another note, a breath glide, a rough start, silence, low clarity, low level, thresholds at their exact values, a 50 Hz hum at clarity 1, above the band, an octave error, a failing reading mid-run, a second tone, reset, before the first reset, the hold-off and custom thresholds; the source imports exactly `../pitch` and `../instrument`, uses no clock or timer, and the drill does not import it.
- `tests/core/core-imports.test.ts`: covers this folder too (relative imports, no browser globals).
