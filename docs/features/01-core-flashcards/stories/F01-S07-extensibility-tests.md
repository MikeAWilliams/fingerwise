# F01-S07: Extensibility tests

- **Feature:** `../design.md`
- **Modules:** `tests/`, `src/core/instrument`, `src/core/drill`, `src/render/staff`, `src/render/tab`
- **Depends on:** F01-S02, F01-S03, F01-S04

## Story

As a maintainer, I want tests that prove the layers are not tied to the alto C or to treble clef, so that adding instruments and clefs later is data work.

## Acceptance criteria

Each item must be checkable and numbered so progress checklists can refer to it. Do not edit these once work starts; raise a change instead.
- **AC1:** Given a fixture instrument under `tests/` with a different hole count, written range and transposition, when it goes through the loader, the drill and the tab renderer, then each works with no change to `src/`.
- **AC2:** Given the same pitch, when it is rendered in treble, treble 8vb and bass clef, then each rendering is correct for that clef.
- **AC3:** Given pitches at the range limits, when they are rendered, then the ledger lines are right.
- **AC4:** Given sharp pitches, when they are rendered, then the accidentals are right.
- **AC5:** Given a key signature parameter, when a pitch is rendered, then the signature is drawn and accidentals follow it.
- **AC6:** Given `src/core/drill`, then an automated check fails if it imports from anything about clef or staff, from `src/render`, or from `src/app`.
- **AC7:** Given the change, then `make verify` passes, and the new tests change no product behavior and ship no features.

## Notes

- Treble 8vb, bass, ledger lines, accidentals and key signatures are tests only. They are not features of the app ([design](../design.md#extensibility-tests-shipped-as-tests-not-features)).
- Duplicate coverage from F01-S02 is not repeated here.
- If a test shows the code does need a change to pass, stop and tell the user. That is a finding, not a fix to slip in.

## Test approach

Vitest only. Nothing to check by hand.
