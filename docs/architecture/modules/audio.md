# audio

`src/audio/`

## Purpose

Plays a sine tone for a pitch through Web Audio, and listens to the microphone, turning it into a stream of pitch readings. It takes a pitch and a number of seconds, or a reading callback, only; it knows nothing about settings, cards, the instrument or the judge. The one audio context of the app lives here and is shared by the tone player and the listener, so one unlock serves both.

## Public interface

- `context.ts`:
  - Structural types for the Web Audio calls used (`AudioContextLike` with `sampleRate`, `createAnalyser()` and `createMediaStreamSource(stream)`; `OscillatorLike`, `GainLike`, `AudioParamLike`, `AnalyserLike` with `fftSize`, `getFloatTimeDomainData` and `disconnect`; `SourceLike`; `StreamLike`, of which only `getTracks()` is used), so a fake implements them in Node tests and a real `AudioContext` satisfies them.
  - `createAudio(create): Audio`: `create` is a factory or null. `context()` creates the context on first call and caches it (a null factory or a throwing constructor gives null, cached, never retried). `unlock()` sets `unlockRequested`, gets the context and calls `resume()` only when its state is `"suspended"`; a throwing `resume()` or a rejected promise is swallowed. `unlockRequested` is true once `unlock()` has been called. Nothing runs at import time.
  - `browserAudioFactory()`: `() => new AudioContext()` when `globalThis.AudioContext` exists, otherwise null.
- `tone.ts`:
  - `createTonePlayer(audio): TonePlayer` with `play(pitch, seconds)`, `stop()` and `unlock()` (delegates to `audio.unlock()`). Constants `FADE_SECONDS` (0.02) and `PEAK_GAIN` (0.3).
  - `play` stops any tone first, so at most one sounds, then starts a sine oscillator at `toFrequency(pitch)` through a gain node: gain 0, ramp to `PEAK_GAIN` over the fade, hold, ramp to 0 so it ends at `seconds`; the oscillator starts now and stops at `seconds`. The fade is `min(FADE_SECONDS, seconds / 2)`, so a short duration still gives a valid envelope.
  - `stop` fades the current tone out over `FADE_SECONDS` and stops it; it does nothing when no tone is current. The oscillator's `onended` forgets the tone.
  - Every Web Audio call is in a `try/catch`; nothing throws or rejects, and a failure plays nothing.

- `detector.ts` ([ADR 0005](../decisions/0005-yin-pitch-detector.md)):
  - `detectPitch(samples, sampleRate, range = { minHz: 200, maxHz: 3000 }): { frequency, clarity }`: YIN with the difference function, cumulative mean normalization, absolute threshold `YIN_THRESHOLD` (0.15) followed down to its local minimum (or the lowest value in the range when nothing dips under it) and parabolic interpolation, over lags `sampleRate / maxHz` to `sampleRate / minHz`. Clarity is `1 - d'(τ)` clamped to [0, 1]. Silence or a constant buffer (all-zero difference), or a buffer too short for the range, gives frequency null and clarity 0, never NaN.
  - `rmsDb(samples)`: `20 * log10(rms)`, `-Infinity` for silence or an empty buffer.
  - The only place audio samples are analysed. Pure; nothing is kept between calls.
- `listener.ts`:
  - `interface ListenerEnv { getUserMedia, requestFrame, cancelFrame }`: `getUserMedia` is null when the browser has none. `browserListenerEnv()` builds it from `navigator.mediaDevices` and `requestAnimationFrame`.
  - `PitchReading { time, frequency, clarity, level }`: the frame timestamp in ms, the detected frequency or null, the clarity, and the RMS level in dBFS. The same fields as the [judge](judge.md)'s `Reading`, which it passes straight to.
  - `MIC_CONSTRAINTS`: `echoCancellation`, `noiseSuppression` and `autoGainControl` all false, so a steady tone is not faded and the noise gate means something. `WINDOW_SIZE` is 2048.
  - `createListener(audio, env): Listener` with `start(onReading)` and `stop()`.
  - `start` resolves to `{ status: "running" }`, `{ status: "locked" }` or `{ status: "unavailable", reason }` and never throws or rejects. No context or no `getUserMedia` gives `unsupported`. A `getUserMedia` failure maps by error name: `NotAllowedError` and `SecurityError` to `denied`; `NotFoundError`, `OverconstrainedError` and `NotReadableError` to `no-device`; anything else, a throw, or failing node creation to `unsupported`.
  - Running: the stream goes into a media stream source, then an analyser with `fftSize` 2048, never to the destination. Each animation frame reads the window, runs `detectPitch` and `rmsDb`, and calls `onReading`; a throwing `onReading` is swallowed.
  - A start while running or while a start is in flight returns the same promise, so there is one stream and one loop; the latest `onReading` gets the readings. A result other than running lets the next start try again.
  - `stop()` cancels the frame, disconnects the nodes, stops every track and forgets the stream; it does nothing when stopped. A stop during an in-flight start releases the stream as soon as it arrives, and that start resolves `locked`. Each start after a stop requests the stream again; the browser decides whether to prompt.

## The lock rule

`play` does nothing when there is no context, or when the context is not `"running"` and `unlock()` has not been called, and nothing is queued for later. After `unlock()`, a context that is still resuming gets the tone scheduled on its frozen clock, so a tone requested on the unlocking gesture sounds once the context runs.

The listener follows the same rule: while the context is locked, `start` resolves `locked` without requesting the microphone. After `unlock()`, a context still resuming proceeds.

## Privacy

Samples are read into one reused buffer, analysed and dropped. Nothing is stored or sent. The microphone is open only between `start` and `stop`.

## Autoplay

Browsers keep an audio context suspended until a user gesture. The app calls `unlock()` on the first `click`, `keydown` or `touchend`, in the capture phase on `window`, so it runs before the card flow handles the same gesture; a tone that gesture starts is scheduled on the resuming context and is heard. Until then the context is locked: a tone that falls due before any gesture is skipped, not queued, and later cards play normally. Nothing prompts the player or shows a message, and when audio is unavailable the drill is unchanged.

## Dependencies

`../core/pitch` only (`Pitch`, `toFrequency`). `src/core/` never imports `src/audio`.

## Tests

- `tests/audio/fake-audio.ts`: a fake context that records nodes, parameter calls, start and stop times and `resume` calls, and can throw or reject on demand; a fake analyser fed from a queue of sample buffers and a fake media stream source.
- `tests/audio/detector.test.ts`: generated 2048-sample buffers at 48 kHz (fundamental, 2nd harmonic at -24 dB, 3rd at -32 dB), every semitone A4 to F6 at two levels within 10 cents and clarity at least 0.9; a tone between semitones; seeded white noise below clarity 0.5; silence, a constant buffer and a too-short buffer; a custom range; `rmsDb` of a full-scale sine and of silence.
- `tests/audio/listener.test.ts`: fake media devices, frames and context: constraints, nodes and routing, readings, a throwing or stopping consumer, every error mapping, no context or `getUserMedia`, failing nodes, retry after failure, the lock rule, stop and release, stop twice, restart, stop during an in-flight start, double start (running and in flight), and one context shared with the tone player.
- `tests/audio/context.test.ts`: lazy single creation, `unlock()` on suspended, running and null cases, a throwing factory, a throwing and a rejecting `resume`.
- `tests/audio/tone.test.ts`: frequency and `"sine"`, envelope times, a very short duration, stop and repeated stop, replacement by a second play, the lock rule, and failures that never throw.
- `tests/audio/audio-imports.test.ts`: `src/audio` imports only relative paths and only `../core/pitch` from core; `src/core` imports nothing with `audio` in its path.
