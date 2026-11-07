# F04-S01: Detector spike

- **Feature:** `../design.md`
- **Modules:** `docs/architecture/decisions/`, `docs/research/`, test fixtures
- **Depends on:** none

## Story

As the project, I want evidence about which pitch detector and which thresholds work for a 12-hole ocarina, so that the judge is built on a measured choice and not a guess.

## Acceptance criteria

Each item must be checkable and numbered so progress checklists can refer to it. Do not edit these once work starts; raise a change instead.
- **AC1:** Given at least Pitchy and a small hand-written YIN, then both are run on the same fixtures and the results (detected pitch, clarity, errors in cents, failures) are recorded in a research note in `docs/research/`.
- **AC2:** Given the fixtures, then they cover synthetic tones across the alto C sounding range (A4 to F6) at several levels, a tone with rising pitch (breath pressure) and an unsteady attack, and noise: silence, steady hiss and speech-like or broadband sound. All fixtures are generated (see Notes), and the note says so.
- **AC3:** Given the results, then the note proposes values for the clarity threshold, noise gate, settle time, start-of-card hold-off and default tolerance, each with the measurement that supports it.
- **AC4:** Given the results, then a new ADR records the detector choice and whether a dependency is added, status proposed until the user accepts it.
- **AC5:** Given no approval, then no dependency is added to `package.json`. The Pitchy trial runs only from a script outside the shipped `src/`, and nothing from the trial is imported by `src/`.
- **AC6:** Given the change, then `make verify` passes and the vision's feature 4 "Research spike" line also points to the research note.

## Notes

- Stop and ask the user before installing Pitchy even for the trial.
- This story can edit the thresholds proposed in the design's provisional values (tolerance 40 cents within 10 to 45, about 150 ms settle time); the tolerance's upper bound stays below 50 cents; it does not change any acceptance criteria.
- Real-device checks (Android mic latency) are listed for the user to do, not simulated.
- The spike's own test code is throwaway unless the chosen detector wants it kept.
- By the user's choice, the fixtures are all generated; no real recordings are used. The generator should not stop at clean sine waves: use a near-sine tone with weak harmonics, a slow attack, pitch rising as breath pressure builds, breath noise mixed in, several levels, and room-tail decay for the hold-off.
- The proposed thresholds are provisional until the live check after F04-S06, where the user plays and sees how notes are judged. The research note says so.

## Test approach

The deliverable is measurement. Fixtures and the comparison script are committed only if the user wants them kept; otherwise the note holds the numbers.
