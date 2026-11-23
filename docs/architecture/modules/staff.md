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
- `drawSongLines(element, lines, options, meter, barsPerLine): SongLayout` (`song-lines.ts`): clears `element` and draws every line of the song from `songLines` ([song](song.md)), one under another. Everything is drawn grey; `colourSong` makes the note to play black, so a change of note redraws nothing and the staff is drawn once per song. Lines never move: line *n* is row *n*, at `rowFrame(n)`. `rowFrame(index)` gives `{ top, bottom, laneTop, laneBottom }` at `index * (ROW_HEIGHT + ROW_SPACING)` (`ROW_SPACING`, 0, is extra space between rows) and `songHeight(lineCount)` the whole drawing's height (the rows and a 10-unit margin). Each row is `ROW_HEIGHT` tall: the staff (`LINE_HEIGHT`, 110), a `LANE_GAP` (6) and a `LANE_HEIGHT` (24) strip left empty for the lane the app draws. Each line starts with the clef and key signature; a whole bar is `BAR_WIDTH` (180) wide and a shorter one (pickup, last bar) is scaled by its length, but no narrower than half. Rests are drawn from the bar items, lengths no single note can show are split by `splitBeats` into tied notes, eighths and shorter are beamed with VexFlow's default groups for the meter, and a note tied over a line break gets half a tie on each line. The first line starts with a count-in bar: one rest per `countInBeats(meter)` beat, half a whole bar wide, carrying the clef and key signature. When the count-in bar makes the first line wider than `barsPerLine` whole bars, all its bars are squeezed to fit. The view box is `barsPerLine` whole bars wide (plus the clef and margins) and `songHeight(lines.length)` tall, so every line has the same scale and the box grows with the song.
- `SongLayout { width, height, rows, countIn, beams }`, returned by `drawSongLines`: `rows` has one `RowLayout { line, top, bottom, laneTop, laneBottom, stops, notes }` (the `rowFrame` plus its stops and notes) per line, in view-box units. `stops` are `{ x, beat }` in order of x, with `beat` counted from the first note's start (negative in the count-in): the line's first position at the first stave's `getNoteStartX()` (after the clef and key signature), every note piece and rest at its `getAbsoluteX()` after formatting (a split or tied note has one per piece), and every bar line at its stave's end x with the next bar's start beat. `notes` maps a note's song index to the SVG elements of its pieces and its ties on that row (found with `getSVGElement()` after drawing); `beams` holds each beam's element with the notes it joins; `countIn` holds each count-in rest's elements.
- `colourSong(layout, current, countBeat)`: sets `fill` and `stroke` on the drawn elements that have one (a note's head, stem and dots, ties, beams) without redrawing: note `current` black, the others `GREY`; a beam is black when a note it joins is the one to play. A `current` that is no note (-1, during the count-in) leaves all notes grey, and count-in rest `countBeat` is black while that beat clicks.
- `rowMap(stops): RowMap` (`lane-map.ts`, pure, no VexFlow): `beatToX(beat)` is piecewise linear between the stops and clamped to the row; at a beat several stops share (a bar line and the note after it) it is the last one, the note's own x. `span(startBeat, endBeat)` is `{ x0, x1 }`: it starts at the start beat's own x and ends at the first stop at the end beat, so a note's segment ends at the bar line and not at the next bar's first note, and a span over a bar line is one continuous stretch. A line's map starts at its first position, after the clef and key signature.
- `beatRangeOnRows(rows, startBeat, endBeat): RowPart[]` (`lane-map.ts`, pure; F11-S04): for each row (anything with `stops`) whose beats, first to last stop, overlap the range, `{ row, x0, x1 }`. `x0` is the first stop at or after `startBeat` (the bar line, or the line's start when the row begins inside the range); `x1` is the first stop at `endBeat` (the closing bar line), or the row's last stop when the range runs on to the next row or past the song's end. A row the range only touches at an end has no part. The app draws the practice-spot shading from it.
- `splitBeats(beats): number[]`: a length as note values (dotted at most once) to tie, longest first; a length they cannot add up to (a triplet) stays one value.
- `StaffRangeError`.

The app passes C major; sharp-key signatures are supported for tests (F01-S07). In C there is no signature, so sharps are drawn as accidentals on the note.

## Dependencies

`vexflow/bravura` (Bravura font embedded, so no font is fetched at runtime), `src/core/pitch`, `src/core/instrument` and `src/core/song` (types). It must not import `src/app/`.

## Tests

- `tests/render/staff.test.ts`: inspects VexFlow's `StaveNote` model in Node (staff line, accidental modifiers, ledger lines, range errors, note length). Dots are not tested there: VexFlow's `Dot` needs a DOM.
- `tests/render/staff-imports.test.ts`: the staff module does not import the app, and core does not import render.
- `tests/extensibility/key-signature.test.ts` (F01-S07): `buildStave` adds a signature only outside C; in G and D accidentals follow the key; in C every pitch A3..F5 in each clef is drawn as before.
- `tests/extensibility/staff-clefs.test.ts` (F01-S07): the same pitch in treble, treble 8vb and bass; ledger lines at range limits in each clef; sharps in each clef and at range limits.
- `tests/render/lane-map.test.ts` (F09-S04): a hand-built row (line start, a note, a rest, a half note, a bar line): x at each stop, interpolation inside a segment, a note taking its own x and ending at the bar line, a span over a bar line, the line start after the clef, clamping, negative count-in beats and a single stop. `beatRangeOnRows` (F11-S04): a range within one row, across a line break, the last bar and past the song's end, a pickup bar and rows the range does not reach.
- `tests/render/staff.test.ts` also covers `splitBeats`, `rowFrame` and `songHeight` (six lines: count, order, increasing tops, lane under its staff, no overlap); `drawSongLines` and `colourSong` need a DOM and are checked by hand.

The rendered SVG is not unit tested; it is checked by hand with `make dev`.

## Notes

- `treble-8vb` draws a treble clef with an `8vb` annotation and writes the note an octave above its pitch (C4 on the third space, G3 on the second line). F01-S07 tests confirm the staff lines, ledger lines and sharps match that reading.
- `vexflow/bravura` makes the production bundle about 737 kB (394 kB gzip), and Vite warns about chunk size. Accepted for now.
- `drawStaff` takes an `HTMLDivElement` because VexFlow's `Renderer` does not accept a plain `HTMLElement`.
