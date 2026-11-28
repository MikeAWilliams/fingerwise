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
- `passesChecks(reading, options): boolean`: whether a reading counts at all: its frequency is present, finite and positive, its clarity and level are at or above the thresholds and it is inside the band (when there is one). The tone tracker uses it unchanged, and the [coverage](coverage.md) module reuses it for its per-reading classification.
- `createToneTracker(options): ToneTracker` with:
  - `reset(startMs)`: start listening afresh; clears the run and re-arms the report.
  - `push(reading): number | null`: ignores readings before `startMs + holdOffMs`. A reading counts when its frequency is present, its clarity and level are at or above the thresholds and it is inside the band; a failing reading clears the run. While the run's spread (max over min, in cents) exceeds `spreadCents`, the oldest readings are dropped. When the run spans at least `settleMs` (newest time minus oldest), it returns the median frequency once, then null until the next `reset`. Before the first `reset` it returns null.

### The tone rule for Single note (F16-S03)

- `TONE_END_SILENCE_MS` (150, a live-check value): how long readings must stay non-sounding to end a tone, so a dropout of a reading or two inside a held note does not end it. `SINGLE_NOTE_PASS_SHARE` (0.75, a live-check value): the share of `lengthMs` (the app gives the note's lane segment) a tone must spend within the tolerance to pass.
- `type ToneOutcome = "passed" | "too-short" | "wrong"` and `gradeTone(readings, { expected, toleranceCents, lengthMs, checks }): ToneOutcome`. `expected` is the sounding pitch and `lengthMs` the length the tone is held against (the app gives the note's lane segment: the written length at the tempo less the release). Each reading lasts until the next one's time (the last lasts no time). Sounding time is the readings that pass `passesChecks`; time within is those `judge` grades correct against the tolerance, the flashcard tolerance, not coverage's nearest-note test. The result is `passed` when time within is at least the share of `lengthMs` (a tone held longer than the note passes too, with no rule about its length), `too-short` when time within is more than half the sounding time, and `wrong` otherwise.
- `createToneWatch(options, endSilenceMs = TONE_END_SILENCE_MS): ToneWatch` with `reset(startMs)` (the options' hold-off applies, and a tone in progress is dropped), `push(reading)` and `tone()`. `push` returns `{ kind: "start"; startMs }` once sounding readings have lasted `settleMs` (`startMs` is the first of them), `{ kind: "end"; readings }` after `endSilenceMs` of readings that do not sound (never on a change of pitch; `readings` are all the tone held, trailing silence included), or null. A sound shorter than the settle time is dropped and reports nothing. A tone counts only after a silent reading since the reset (the hold-off's own readings count for this), so a sound held across a reset, such as one pitch held through two notes, is not a new tone until the player stops. After an end the watch listens for another tone with no new hold-off. `tone()` gives `{ startMs, readings } | null` for the live trace. Unlike `createToneTracker` it reports any number of tones per reset.

### The tuner's note (F19-S02)

All three are pure, over the readings of one tone, in sounding pitch; the app converts to written. Readings that fail `passesChecks(reading, checks)` are skipped.

- `withinTolerance(cents, toleranceCents): boolean`: `|cents| <= tolerance + 1e-6`. `judge` uses it, so the two agree at the boundary (40 is within 40, 40.01 is not).
- `followNote(readings, checks, settleMs): { pitch, cents, since } | null`: the note to show while the tone sounds. **Settle rule:** the first note is the nearest pitch to the median frequency of the passing readings in the first `settleMs`, so a scoop at the attack does not show the wrong note. After that a candidate run starts at a passing reading whose nearest pitch differs from the shown note. A passing reading back on the shown note resets the run, and one on a third note starts its own. When a run spans at least `settleMs` (newest time minus first), its pitch becomes the shown note and `since` is the run's first index in `readings`. `cents` is `centsFrom` the latest passing reading to the shown note, so it can pass ±50 while a bend has not yet settled. Null when no reading passes.
- `heldNote(readings, checks, settleMs): { pitch, cents } | null`: `followNote`'s final note, and the median of `centsFrom` over the passing readings from `since` on (a bend beyond ±50 that never settled counts), so a short sag at the release does not move it.

## Thresholds

The values come from the [detector spike](../../research/pitch-detection-spike.md#proposed-values) on generated tones and have been accepted by the user after playing a real ocarina. Retuning them later needs no new ADR ([ADR 0005](../decisions/0005-yin-pitch-detector.md)).

## Dependencies

`src/core/pitch` and `src/core/instrument` only. The [drill](drill.md) does not import the judge, and the judge does not import the drill.

## Tests

- `tests/core/judge.test.ts`: `nearestPitch` for A4 and equal-tempered values, rounding near ±50; midway C5/C♯5 is +50 and -50; the tolerance boundary (40 correct, 40.01 incorrect), neighbouring semitone and octaves incorrect; the alto C band; the default thresholds; reading sequences at 16.7 ms steps for a steady tone, a wobble within 25 cents, jumps, a jump to another note, a breath glide, a rough start, silence, low clarity, low level, thresholds at their exact values, a 50 Hz hum at clarity 1, above the band, an octave error, a failing reading mid-run, a second tone, reset, before the first reset, the hold-off and custom thresholds; the source imports exactly `../pitch` and `../instrument`, uses no clock or timer, and the drill does not import it.
- `passesChecks`: a reading at each threshold passes and just below fails; no frequency and a frequency outside the band fail (F09-S02).
- `gradeTone` (F16-S03): a full correct tone, exactly 75%, just under, a short right tone, a mostly wrong tone, a scoop into the right note, out-of-tune right notes beyond the tolerance, a tone longer than the note and no sounding time; `createToneWatch`: the hold-off, a blip under the settle time, a pitch change inside one tone, a dropout shorter than the end constant, the end after silence, a second tone after an end, reset, and `tone()`.
- `followNote`, `heldNote` and `withinTolerance` (F19-S02), reading sequences at 16.7 ms steps: a steady tone, +45¢, a bend across +50¢ shorter and longer than the settle time (`since` at the bend's start), a scoop at the attack, a return to the shown note resetting a run, a third note, a release sag, a bend that never settled, trailing silence, no passing reading, and the tolerance boundary.
- `tests/core/core-imports.test.ts`: covers this folder too (relative imports, no browser globals).
