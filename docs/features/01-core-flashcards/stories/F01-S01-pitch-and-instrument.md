# F01-S01: Pitch and instrument definition

- **Feature:** `../design.md`
- **Modules:** `src/core/pitch`, `src/core/instrument`, `data/instruments/`
- **Depends on:** none

## Story

As a maintainer, I want one pitch type and a validated, data-driven instrument definition for the 12-hole alto C, so that every later layer works from the same pitch and instrument data.

## Acceptance criteria

Each item must be checkable and numbered so progress checklists can refer to it. Do not edit these once work starts; raise a change instead.
- **AC1:** Given a note name such as `A3`, `C♯5` or `F5`, when it is parsed and then formatted, then the original name comes back. A string that is not a note name is rejected.
- **AC2:** Given a pitch, when the instrument's transposition is applied, then the sounding pitch is the written pitch plus the transposition in semitones (A3 written with +12 gives A4).
- **AC3:** Given `data/instruments/ocarina-12-taiwanese.json`, when it is loaded, then it yields name and family, 12 holes, Taiwanese-style fingering, default clef treble, written range A3 to F5, transposition +12, the font reference, and a glyph for each of the 21 pitches in that range.
- **AC4:** Given the loaded alto C, when each of the 21 pitches is looked up, then it returns the glyph character the [research note](../../../research/ocarina-fingering-data.md) lists for that note.
- **AC5:** Given an instrument file with no `transposition`, when it is loaded, then the loader rejects it with an error that names the field.
- **AC6:** Given an instrument file missing a glyph for a pitch in its written range, when it is loaded, then the loader rejects it and names the pitch.
- **AC7:** Given an instrument file whose range is inconsistent (lowest not below highest, or a glyph outside the range), when it is loaded, then the loader rejects it.
- **AC8:** Given the `src/core/pitch` and `src/core/instrument` modules, then they import no framework or browser API.
- **AC9:** Given the change, then `make verify` passes and `docs/architecture/data-formats.md` and the `modules/` docs for `pitch` and `instrument` describe what was built.

## Notes

- Glyph characters are opaque: nothing here can check them against a real fingering ([ADR 0002](../../../architecture/decisions/0002-tablature-from-panzi-font.md)).
- Transposition is required with no default ([ADR 0003](../../../architecture/decisions/0003-written-pitch-and-transposition.md)).
- Chromatic notes are written as sharps only.
- The font file is not part of this story (see F01-S03); the instrument file only names it.

## Test approach

All unit tests (Vitest). Nothing to check by hand in the browser.
