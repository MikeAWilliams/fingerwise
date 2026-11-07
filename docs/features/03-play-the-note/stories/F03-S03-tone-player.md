# F03-S03: Tone player

- **Feature:** `../design.md`
- **Modules:** `src/audio`, `docs/architecture/`
- **Depends on:** F03-S02

## Story

As a player, I want a clean sine tone for a pitch, so that I can hear the note I should be fingering.

## Acceptance criteria

Each item must be checkable and numbered so progress checklists can refer to it. Do not edit these once work starts; raise a change instead.
- **AC1:** Given a tone player created over an injected audio environment, when it is asked to play a pitch for a number of seconds, then it starts one sine oscillator at the pitch's frequency (F03-S02) through a gain node, with a short fade-in at the start and a fade-out that finishes at the requested duration, and the oscillator stops at the end.
- **AC2:** Given a tone is playing, when `stop()` is called, then the tone fades out quickly and stops, and calling `stop()` with nothing playing does nothing.
- **AC3:** Given a tone is playing, when a new tone is requested, then the first is stopped before the second starts, so at most one tone sounds.
- **AC4:** Given the audio context is suspended, when `unlock()` is called, then it asks the context to resume; given it is already running, or there is no context, then `unlock()` does nothing and never throws.
- **AC5:** Given no Web Audio support, or a context that throws or rejects when created, resumed or played, then no call to the player throws or rejects; it plays nothing.
- **AC6:** Given the context is locked and `unlock()` has not been called, when a tone is requested, then nothing is played and nothing is queued for later. Given `unlock()` has been called and the resume has not finished, when a tone is requested, then it is scheduled on the context and sounds once the context runs (so a tone requested on the unlocking gesture is heard).
- **AC7:** Given the change, then `make verify` passes, `src/audio` is not imported by `src/core`, and a new `modules/audio.md` documents the interface.

## Notes

- Web Audio objects are injected (like `loadFont` takes its `env`) so the tests run in Node with fakes.
- The context is created lazily on first `unlock()` or play, not at import time. It is the one audio context of the app; the F04 microphone listener will share it, so keep it reachable from `src/audio` rather than private to the tone player.
- Fade lengths are small constants (about 10 to 30 ms) inside the module, not settings. A duration shorter than the two fades must still produce a valid envelope.
- `src/audio` takes a pitch and seconds only. It does not know settings, cards or the instrument.

## Test approach

Unit tests with a fake audio context that records node creation, parameter ramps and start/stop times. The sound itself is checked by hand in S04.
