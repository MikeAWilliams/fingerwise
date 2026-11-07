# F04-S02: Judge rules

- **Feature:** `../design.md`
- **Modules:** `src/core/judge`, `docs/architecture/`
- **Depends on:** F03-S02, F04-S01

## Story

As the drill, I want a heard frequency turned into a note, an offset and a verdict, and a stream of noisy readings turned into one stable tone, so that grading is consistent and testable without a microphone.

## Acceptance criteria

Each item must be checkable and numbered so progress checklists can refer to it. Do not edit these once work starts; raise a change instead.
- **AC1:** Given a frequency, then `nearestPitch` returns the nearest pitch and the offset in cents from it (between -50 and +50), exact for equal-tempered values (A4 440 Hz gives A4 and 0).
- **AC2:** Given a frequency and an expected pitch, then `centsFrom` returns the signed distance in cents from the expected pitch's frequency, so a tone midway between C5 and C♯5 is 50 cents from each.
- **AC3:** Given an expected pitch, a heard frequency and a tolerance, then `judge` returns correct when the distance is within the tolerance (inclusive) and incorrect otherwise; a tone an octave away is incorrect whatever its note name.
- **AC4:** Given a stream of readings (time, frequency or none, clarity, level), then the stability logic reports one stable tone when readings above the clarity threshold and noise gate stay within a small pitch spread for the settle time, and reports nothing for silence, low clarity, low level, or readings that jump around.
- **AC5:** Given a stable tone has been reported, then the logic does not report a second one for the same card until it is reset.
- **AC6:** Given readings inside the hold-off at the start of listening, then they are ignored.
- **AC7:** Given the thresholds, settle time and hold-off, then they are parameters with defaults from the spike (F04-S01), never read from a global.
- **AC8:** Given the change, then `make verify` passes, `src/core/judge` imports only `../pitch` (and the instrument module if needed), uses no browser API and is covered by the core imports test, and a new `modules/judge.md` documents it.

## Notes

- Time is passed in with each reading; the module never reads a clock or starts a timer.
- The judge compares in sounding pitch. Converting the heard note back to written pitch for display uses the instrument's transposition and happens in the app.
- Layer rule: the drill engine does not import the judge, and the judge does not import the drill.

## Test approach

Unit tests with hand-made reading sequences: steady tone, wobble, drifting tone, a tone with a rough start, silence, noise, a second tone after the first, readings inside the hold-off, and boundary tolerances.
