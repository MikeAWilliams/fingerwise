# F04-S02: Judge rules

- **Feature:** `../design.md`
- **Modules:** `src/core/judge`, `docs/architecture/`
- **Depends on:** F03-S02

## Story

As the drill, I want a heard frequency turned into a note, an offset and a verdict, and a stream of noisy readings turned into one stable tone, so that grading is consistent and testable without a microphone.

## Acceptance criteria

Each item must be checkable and numbered so progress checklists can refer to it. Do not edit these once work starts; raise a change instead.
- **AC1:** Given a frequency, then `nearestPitch` returns the nearest pitch and the offset in cents from it (between -50 and +50), exact for equal-tempered values (A4 440 Hz gives A4 and 0).
- **AC2:** Given a frequency and an expected pitch, then `centsFrom` returns the signed distance in cents from the expected pitch's frequency, so a tone midway between C5 and C♯5 is 50 cents from each.
- **AC3:** Given an expected pitch, a heard frequency and a tolerance, then `judge` returns correct when the distance is within the tolerance (inclusive) and incorrect otherwise; a tone an octave away is incorrect whatever its note name.
- **AC4:** Given a stream of readings (time, frequency or none, clarity, level), then the stability logic reports one stable tone, at the median of its window, when readings at or above the clarity threshold and noise gate and inside the frequency band stay within the spread band of each other for the settle time. It reports nothing for silence, low clarity, low level, readings outside the frequency band, or readings that jump around.
- **AC5:** Given a stable tone has been reported, then the logic does not report a second one for the same card until it is reset.
- **AC6:** Given readings inside the hold-off at the start of listening, then they are ignored.
- **AC7:** Given the thresholds, then they are parameters, never read from a global, with defaults from the [detector spike](../../../research/pitch-detection-spike.md#proposed-values): clarity 0.9, gate −55 dBFS, spread band 25 cents, settle time 200 ms, hold-off 500 ms.
- **AC8:** Given an instrument, then the frequency band runs from one octave below its lowest sounding pitch to one octave above its highest (220 to 2794 Hz for the alto C), so an octave error is still heard and judged incorrect.
- **AC9:** Given the change, then `make verify` passes, `src/core/judge` imports only `../pitch` and `../instrument`, uses no browser API and is covered by the core imports test, and a new `modules/judge.md` documents it.

## Notes

- Time is passed in with each reading; the module never reads a clock or starts a timer.
- The judge compares in sounding pitch. Converting the heard note back to written pitch for display uses the instrument's transposition and happens in the app.
- Layer rule: the drill engine does not import the judge, and the judge does not import the drill.

## Test approach

Unit tests with hand-made reading sequences: steady tone, wobble, drifting tone, a slow breath glide, a tone with a rough start, silence, noise, readings outside the frequency band (a 50 Hz hum at clarity 1), a second tone after the first, readings inside the hold-off, and boundary tolerances.
