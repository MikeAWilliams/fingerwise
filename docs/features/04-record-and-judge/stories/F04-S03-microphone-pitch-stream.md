# F04-S03: Microphone pitch stream

- **Feature:** `../design.md`
- **Modules:** `src/audio`, `docs/architecture/`
- **Depends on:** F04-S01, F03-S03

## Story

As the judge, I want a stream of pitch readings from the microphone that I can start and stop, so that listening can follow the life of a card.

## Acceptance criteria

Each item must be checkable and numbered so progress checklists can refer to it. Do not edit these once work starts; raise a change instead.
- **AC1:** Given a listener created over an injected environment, when `start(onReading)` is called, then it requests the microphone with echo cancellation, noise suppression and auto gain control all off, and calls `onReading` with the time, the detected frequency (or none), the clarity and the level at a steady rate until stopped.
- **AC2:** Given permission is denied, no microphone exists, or audio is unsupported, then `start` resolves to an `unavailable` result with a reason (`denied`, `no-device`, `unsupported`) and never throws or rejects.
- **AC3:** Given the shared audio context (F03-S03) is still locked, when `start` is called, then it resolves to a `locked` result, does not request the microphone, and never throws or rejects.
- **AC4:** Given a running listener, when `stop()` is called, then the readings stop and the microphone is released so the browser's recording indicator goes away; calling `stop()` when not running does nothing.
- **AC5:** Given a start while already listening, then there is still only one microphone stream and one reading loop.
- **AC6:** Given the permission was granted before, then a later `start` does not prompt again within the browser's own rules, and the listener may reuse or reopen the stream; it never keeps the microphone open while stopped.
- **AC7:** Given the detector the spike chose, then it is the only place audio samples are analysed, and no sample is stored or sent anywhere.
- **AC8:** Given the listener and the tone player, then they use one shared audio context, so one unlock serves both.
- **AC9:** Given the change, then `make verify` passes, `src/core` does not import `src/audio`, and `modules/audio.md` documents the listener and its injected environment.

## Notes

- The injected environment follows `loadFont` and the tone player: tests run in Node with fakes.
- If the spike approves a dependency, it is imported here and nowhere else.
- The browser's processing is off because noise suppression can fade a steady near-sine tone, auto gain makes a fixed noise gate meaningless, and echo cancellation has nothing to cancel (the microphone is never read while the F03 tone plays). Confirmed by hand in S05.
- Real microphone behavior is checked by hand in S05.

## Test approach

Unit tests with fake media devices and a fake analyser feeding samples: start, readings, stop and release, denial, no device, double start, throwing fakes. A real tone through a real microphone is checked by hand.
