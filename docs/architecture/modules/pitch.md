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
- `toFrequency(p): number`: equal-temperament frequency in hertz, `440 * 2 ** ((p - 69) / 12)`, so A4 is exactly 440. The A4 = 440 reference is a constant in the file; there is no tuning parameter.

## Dependencies

None. The file has no import at all.

## Tests

- `tests/core/pitch.test.ts`: round trips, rejections, known values, transposition, ranges, `toFrequency` (A4 440, C4, A3, A5, octave ratio of 2 across MIDI 0 to 115, A4 to F6 finite, positive and increasing).
- `tests/core/core-imports.test.ts`: every file under `src/core/` imports only relative modules and uses no browser globals; `pitch` has no import at all.
