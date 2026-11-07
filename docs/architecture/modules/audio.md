# audio

`src/audio/`

## Purpose

Plays a sine tone for a pitch through Web Audio. It takes a pitch and a number of seconds only; it knows nothing about settings, cards or the instrument. The one audio context of the app lives here, so the microphone listener of a later feature can share it.

## Public interface

- `context.ts`:
  - Structural types for the Web Audio calls used (`AudioContextLike`, `OscillatorLike`, `GainLike`, `AudioParamLike`), so a fake implements them in Node tests and a real `AudioContext` satisfies them.
  - `createAudio(create): Audio`: `create` is a factory or null. `context()` creates the context on first call and caches it (a null factory or a throwing constructor gives null, cached, never retried). `unlock()` sets `unlockRequested`, gets the context and calls `resume()` only when its state is `"suspended"`; a throwing `resume()` or a rejected promise is swallowed. `unlockRequested` is true once `unlock()` has been called. Nothing runs at import time.
  - `browserAudioFactory()`: `() => new AudioContext()` when `globalThis.AudioContext` exists, otherwise null.
- `tone.ts`:
  - `createTonePlayer(audio): TonePlayer` with `play(pitch, seconds)`, `stop()` and `unlock()` (delegates to `audio.unlock()`). Constants `FADE_SECONDS` (0.02) and `PEAK_GAIN` (0.3).
  - `play` stops any tone first, so at most one sounds, then starts a sine oscillator at `toFrequency(pitch)` through a gain node: gain 0, ramp to `PEAK_GAIN` over the fade, hold, ramp to 0 so it ends at `seconds`; the oscillator starts now and stops at `seconds`. The fade is `min(FADE_SECONDS, seconds / 2)`, so a short duration still gives a valid envelope.
  - `stop` fades the current tone out over `FADE_SECONDS` and stops it; it does nothing when no tone is current. The oscillator's `onended` forgets the tone.
  - Every Web Audio call is in a `try/catch`; nothing throws or rejects, and a failure plays nothing.

## The lock rule

`play` does nothing when there is no context, or when the context is not `"running"` and `unlock()` has not been called, and nothing is queued for later. After `unlock()`, a context that is still resuming gets the tone scheduled on its frozen clock, so a tone requested on the unlocking gesture sounds once the context runs.

## Dependencies

`../core/pitch` only (`Pitch`, `toFrequency`). `src/core/` never imports `src/audio`.

## Tests

- `tests/audio/fake-audio.ts`: a fake context that records nodes, parameter calls, start and stop times and `resume` calls, and can throw or reject on demand.
- `tests/audio/context.test.ts`: lazy single creation, `unlock()` on suspended, running and null cases, a throwing factory, a throwing and a rejecting `resume`.
- `tests/audio/tone.test.ts`: frequency and `"sine"`, envelope times, a very short duration, stop and repeated stop, replacement by a second play, the lock rule, and failures that never throw.
- `tests/audio/audio-imports.test.ts`: `src/audio` imports only relative paths and only `../core/pitch` from core; `src/core` imports nothing with `audio` in its path.
