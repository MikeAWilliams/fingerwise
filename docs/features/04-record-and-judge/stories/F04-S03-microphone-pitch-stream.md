# F04-S03: Microphone pitch stream

- **Feature:** `../design.md`
- **Modules:** `src/audio`, `docs/architecture/`
- **Depends on:** F03-S03

## Story

As the judge, I want a stream of pitch readings from the microphone that I can start and stop, so that listening can follow the life of a card.

## Acceptance criteria

Each item must be checkable and numbered so progress checklists can refer to it. Do not edit these once work starts; raise a change instead.
- **AC1:** Given a listener created over an injected environment, when `start(onReading)` is called, then it requests the microphone with echo cancellation, noise suppression and auto gain control all off, and calls `onReading` with the time, the detected frequency (or none), the clarity and the RMS level in dBFS, from a 2048-sample window read once per animation frame, until stopped.
- **AC2:** Given permission is denied, no microphone exists, or audio is unsupported, then `start` resolves to an `unavailable` result with a reason (`denied`, `no-device`, `unsupported`) and never throws or rejects.
- **AC3:** Given the shared audio context (F03-S03) is still locked, when `start` is called, then it resolves to a `locked` result, does not request the microphone, and never throws or rejects.
- **AC4:** Given a running listener, when `stop()` is called, then the readings stop and the microphone is released so the browser's recording indicator goes away; calling `stop()` when not running does nothing.
- **AC5:** Given a start while already listening, then there is still only one microphone stream and one reading loop.
- **AC6:** Given the permission was granted before, then a later `start` does not prompt again within the browser's own rules, and the listener may reuse or reopen the stream; it never keeps the microphone open while stopped.
- **AC7:** Given the hand-written YIN detector ([ADR 0005](../../../architecture/decisions/0005-yin-pitch-detector.md)), then it is the only place audio samples are analysed, and no sample is stored or sent anywhere. No dependency is added.
- **AC8:** Given generated sample buffers, then the detector finds a near-sine tone with weak harmonics anywhere from A4 to F6 within 10 cents, with clarity at least 0.9, and gives clarity below 0.5 for white noise and silence.
- **AC9:** Given the listener and the tone player, then they use one shared audio context, so one unlock serves both.
- **AC10:** Given the change, then `make verify` passes, `src/core` does not import `src/audio`, and `modules/audio.md` documents the listener and its injected environment.

## Notes

- The injected environment follows `loadFont` and the tone player: tests run in Node with fakes.
- The detector is a pure function over a sample buffer and the sample rate; the [research note](../../../research/pitch-detection-spike.md#method) describes the YIN variant measured.
- If YIN is too slow on a phone, read every second frame or narrow the search to the frequency band (ADR 0005); the reading rate is not part of the judge's thresholds, which are in milliseconds.
- The browser's processing is off because noise suppression can fade a steady near-sine tone, auto gain makes a fixed noise gate meaningless, and echo cancellation has nothing to cancel (the microphone is never read while the F03 tone plays). Confirmed by hand in S05.
- Real microphone behavior is checked by hand in S05.

## Test approach

Unit tests with fake media devices and a fake analyser feeding samples: start, readings, stop and release, denial, no device, double start, throwing fakes. A real tone through a real microphone is checked by hand.
