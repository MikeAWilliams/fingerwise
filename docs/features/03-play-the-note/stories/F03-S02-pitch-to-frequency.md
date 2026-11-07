# F03-S02: Pitch to frequency

- **Feature:** `../design.md`
- **Modules:** `src/core/pitch`, `docs/architecture/`
- **Depends on:** none

## Story

As the audio layer, I want a pitch converted to hertz, so that I can play any pitch the drill produces.

## Acceptance criteria

Each item must be checkable and numbered so progress checklists can refer to it. Do not edit these once work starts; raise a change instead.
- **AC1:** Given A4, then `toFrequency` returns exactly 440.
- **AC2:** Given C4, A5 and A3, then it returns 261.6256 (to four decimals), 880 and 220.
- **AC3:** Given any pitch, then raising it by 12 semitones doubles the frequency (within floating point error).
- **AC4:** Given every pitch of the alto C's sounding range (A4 to F6), then the result is finite, positive and strictly increasing with pitch.
- **AC5:** Given the change, then `make verify` passes, `src/core/pitch` still imports nothing and uses no browser API, and `modules/pitch.md` documents `toFrequency`.

## Notes

- Equal temperament, A4 = 440 Hz, as a constant in the module. No tuning parameter.
- Sounding pitch comes from the existing `soundingPitch` in the instrument module; this story does not touch it.

## Test approach

Unit tests in `tests/core/pitch.test.ts` for the known values and the octave rule.
