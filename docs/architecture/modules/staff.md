# staff

`src/render/staff/`

## Purpose

Owns how a pitch is drawn on a staff. Given a pitch and staff options it works out where the note sits (key, accidental, clef, ledger lines) and draws it with VexFlow. It knows nothing of the drill, the app or Preact.

## Public interface

- `interface StaffOptions`: `clef` ([`ClefName`](instrument.md)), `accidentals` (`"sharps"`), `keySignature` (`KeySignature`), `lowest` and `highest` ([`Pitch`](pitch.md)). The last two bound what the staff accepts.
- `type KeySignature`: `"C" | "G" | "D" | "A" | "E" | "B" | "F#"`, VexFlow key spec names. Sharp keys only, since pitches are spelled with sharps.
- `noteLayout(pitch, options): NoteLayout`: `{ key, accidental, clef, annotation, keySignature }`. `key` is a VexFlow key such as `f#/4`. `accidental` is what differs from the key: `"#"` for a sharp the key does not sharp, `"n"` for a natural whose letter the key sharps, otherwise `null`. Throws `StaffRangeError` if `pitch` is outside `lowest`..`highest`. For `treble-8vb` the clef is treble with an `8vb` annotation and the key is an octave higher.
- `noteDuration(beats): string`: the VexFlow duration for a note `beats` quarter notes long: `wd`, `w`, `hd`, `h`, `qd`, `q`, `8d`, `8`, `16d`, `16` or `32`. A length no single note can show (a tie or a tuplet) gets the longest that fits, or `32`.
- `buildNote(layout, beats = 4): StaveNote`: a note of `noteDuration(beats)`, with an accidental modifier when the layout has one and a dot when the duration is dotted.
- `buildStave(layout, x, y, width): Stave`: a stave with the layout's clef (and annotation) and, unless the key is `"C"`, its key signature. `drawStaff` uses it.
- `ledgerLines(note): number`: ledger lines the note needs, from VexFlow's staff line number.
- `drawStaff(element: HTMLDivElement, pitch, options, beats = 4): void`: clears `element` and draws a one-note SVG staff in it, the note `beats` long. It sets a view box (220 by 150) on the SVG context, so CSS sizes the SVG and the drawing scales with it.
- `drawSongLines(element, lines, current, options, meter, barsPerLine, countBeat = null): void` (`song-lines.ts`): clears `element` and draws two lines of music from `songLines` ([song](song.md)): the line holding note `current` and the one after it. Lines never move: line *n* is drawn in row *n* mod 2, so once the lower row is playing the upper row holds the next line, and a grey arrow in a 24-unit margin on the right runs from the lower staff's middle up to the upper one's. Each line starts with the clef and key signature; a whole bar is `BAR_WIDTH` (180) wide and a shorter one (pickup, last bar) is scaled by its length, but no narrower than half. Rests are drawn from the bar items, lengths no single note can show are split by `splitBeats` into tied notes, eighths and shorter are beamed with VexFlow's default groups for the meter, and a note tied over a line break gets half a tie on each line. Note `current`'s pieces, and beams and ties over them, are black; everything else is `GREY`; a `current` that is no note (-1, during the count-in) shows the first line all grey. The first line starts with a count-in bar: one rest per `countInBeats(meter)` beat, half a whole bar wide, carrying the clef and key signature. Rest `countBeat` is black while that beat clicks, the others `GREY`. When the count-in bar makes the first line wider than `barsPerLine` whole bars, all its bars are squeezed to fit. The view box is sized for `barsPerLine` whole bars, so lines keep the same scale.
- `splitBeats(beats): number[]`: a length as note values (dotted at most once) to tie, longest first; a length they cannot add up to (a triplet) stays one value.
- `lineOfNote(lines, index): number`: the line where note `index` starts, or 0.
- `StaffRangeError`.

The app passes C major; sharp-key signatures are supported for tests (F01-S07). In C there is no signature, so sharps are drawn as accidentals on the note.

## Dependencies

`vexflow/bravura` (Bravura font embedded, so no font is fetched at runtime), `src/core/pitch`, `src/core/instrument` and `src/core/song` (types). It must not import `src/app/`.

## Tests

- `tests/render/staff.test.ts`: inspects VexFlow's `StaveNote` model in Node (staff line, accidental modifiers, ledger lines, range errors, note length). Dots are not tested there: VexFlow's `Dot` needs a DOM.
- `tests/render/staff-imports.test.ts`: the staff module does not import the app, and core does not import render.
- `tests/extensibility/key-signature.test.ts` (F01-S07): `buildStave` adds a signature only outside C; in G and D accidentals follow the key; in C every pitch A3..F5 in each clef is drawn as before.
- `tests/extensibility/staff-clefs.test.ts` (F01-S07): the same pitch in treble, treble 8vb and bass; ledger lines at range limits in each clef; sharps in each clef and at range limits.
- `tests/render/staff.test.ts` also covers `splitBeats` and `lineOfNote`; `drawSongLines` needs a DOM and is checked by hand.

The rendered SVG is not unit tested; it is checked by hand with `make dev`.

## Notes

- `treble-8vb` draws a treble clef with an `8vb` annotation and writes the note an octave above its pitch (C4 on the third space, G3 on the second line). F01-S07 tests confirm the staff lines, ledger lines and sharps match that reading.
- `vexflow/bravura` makes the production bundle about 737 kB (394 kB gzip), and Vite warns about chunk size. Accepted for now.
- `drawStaff` takes an `HTMLDivElement` because VexFlow's `Renderer` does not accept a plain `HTMLElement`.
