# instrument

`src/core/instrument/index.ts`

## Purpose

Turns parsed instrument JSON into a validated `Instrument`. Instruments are data ([`data-formats.md`](../data-formats.md)); this module only validates and answers lookups.

## Public interface

- `type FingeringStyle` (`taiwanese | japanese`), `type ClefName` (`treble | treble-8vb | bass`).
- `interface Instrument`: `name`, `family`, `holes`, `fingeringStyle`, `defaultClef`, `lowest`, `highest` (written range), `transposition`, `tablatureFont`, `glyphs` (`ReadonlyMap<Pitch, string>`).
- `class InstrumentError extends Error`.
- `loadInstrument(raw: unknown): Instrument`: takes parsed JSON (`src/core` cannot read files). Throws `InstrumentError` naming the field or pitch for: a missing or wrongly typed field, `transposition` absent or non-integer, lowest not below highest, a glyph key that is non-canonical or outside the range, a pitch in the range with no glyph.
- `glyphFor(instrument, written): string | undefined`.
- `soundingPitch(instrument, written): Pitch`: written plus `transposition`.

## Dependencies

`../pitch` only.

## Tests

`tests/core/instrument.test.ts` loads `data/instruments/ocarina-12-taiwanese.json` and checks every field and all 21 glyphs against a table written from the research note. Invalid instruments are deep copies of that JSON with one field changed. `tests/core/core-imports.test.ts` guards the import rule. `tests/extensibility/fixture-instrument.test.ts` loads a 6-hole fixture (`tests/fixtures/instruments/fixture-6-hole.json`: range C5 to C6, transposition 0, bass clef) through the loader, the drill and the tab view with no change to `src/` (F01-S07).
