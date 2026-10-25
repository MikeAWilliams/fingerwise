# staff

`src/render/staff/`

## Purpose

Owns how a pitch is drawn on a staff. Given a pitch and staff options it works out where the note sits (key, accidental, clef, ledger lines) and draws it with VexFlow. It knows nothing of the drill, the app or Preact.

## Public interface

- `interface StaffOptions`: `clef` ([`ClefName`](instrument.md)), `accidentals` (`"sharps"`), `keySignature` (`"C"`), `lowest` and `highest` ([`Pitch`](pitch.md)). The last two bound what the staff accepts.
- `noteLayout(pitch, options): NoteLayout`: `{ key, accidental, clef, annotation }`. `key` is a VexFlow key such as `f#/4`. Throws `StaffRangeError` if `pitch` is outside `lowest`..`highest`. For `treble-8vb` the clef is treble with an `8vb` annotation and the key is an octave higher.
- `buildNote(layout): StaveNote`: a whole note, with a sharp modifier when the layout has one.
- `ledgerLines(note): number`: ledger lines the note needs, from VexFlow's staff line number.
- `drawStaff(element: HTMLDivElement, pitch, options): void`: clears `element` and draws a one-note SVG staff in it.
- `StaffRangeError`.

C major only, with no key signature, so sharps are drawn as accidentals on the note.

## Dependencies

`vexflow/bravura` (Bravura font embedded, so no font is fetched at runtime), `src/core/pitch` and `src/core/instrument` (types). It must not import `src/app/`.

## Tests

- `tests/render/staff.test.ts`: inspects VexFlow's `StaveNote` model in Node (staff line, accidental modifiers, ledger lines, range errors).
- `tests/render/staff-imports.test.ts`: the staff module does not import the app, and core does not import render.
- `tests/extensibility/staff-clefs.test.ts` (F01-S07): the same pitch in treble, treble 8vb and bass; ledger lines at range limits in each clef; sharps in each clef and at range limits.

The rendered SVG is not unit tested; it is checked by hand with `make dev`.

## Notes

- `treble-8vb` draws a treble clef with an `8vb` annotation and writes the note an octave above its pitch (C4 on the third space, G3 on the second line). F01-S07 tests confirm the staff lines, ledger lines and sharps match that reading.
- `vexflow/bravura` makes the production bundle about 737 kB (394 kB gzip), and Vite warns about chunk size. Accepted for now.
- `drawStaff` takes an `HTMLDivElement` because VexFlow's `Renderer` does not accept a plain `HTMLElement`.
