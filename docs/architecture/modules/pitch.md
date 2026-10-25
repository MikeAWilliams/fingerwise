# pitch

`src/core/pitch/index.ts`

## Purpose

The single internal pitch representation. Every other layer converts to and from it.

A `Pitch` is a branded MIDI note number (C4 = 60, A4 = 69). MIDI makes transposition and ranges plain arithmetic. Names use sharps only, with `♯` (U+266F).

## Public interface

- `type Pitch`: `number & { readonly __brand: "Pitch" }`.
- `parsePitch(name): Pitch | null`: accepts `^[A-G][♯#]?[0-9]$`; ASCII `#` is an alias for `♯` and parses to the same pitch. Rejects flats, `B♯`/`B#`, `E♯`/`E#` and anything outside MIDI 0-127 (`C0` to `G9`).
- `formatPitch(p): string`: inverse of `parsePitch`, e.g. `C♯5`. Always writes `♯`, never `#`.
- `transpose(p, semitones): Pitch`.
- `isNatural(p): boolean`: true when the name has no sharp.
- `pitchesInRange(lowest, highest): Pitch[]`: every semitone, inclusive, ascending.

## Dependencies

None.

## Tests

- `tests/core/pitch.test.ts`: round trips, rejections, known values, transposition, ranges.
- `tests/core/core-imports.test.ts`: every file under `src/core/` imports only relative modules and uses no browser globals.
