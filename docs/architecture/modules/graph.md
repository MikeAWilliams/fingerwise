# graph

`src/render/graph/index.ts`

## Purpose

The geometry of the pitch graph shown with a judged card's verdict: a horizontal cents axis two semitones either side of the expected note, with the expected and played pitches marked. It knows only pitches, cents and positions, not the staff, clef, audio, judge or UI. The SVG is drawn by `PitchGraph` in [app](app.md). Built in [F04-S06](../../features/04-record-and-judge/stories/F04-S06-verdict-and-pitch-graph.md).

## Public interface

- `SPAN_CENTS` (200): cents shown either side of the expected pitch.
- `SIDE_MARGIN` (24): space kept at each end of the axis, in the caller's units, for labels and the pinned arrow.
- `formatCents(cents): string`: rounded and signed, such as `+23¢`, `-7¢` or `0¢` (no sign on zero, also when rounding from a negative).
- `pitchGraph(expected, cents, width): PitchGraph`:
  - `ticks`: five `{ x, label }`, one per semitone from `expected - 2` to `expected + 2`, labelled with `formatPitch`.
  - `expectedX`: the centre.
  - `played: { x, pinned }`: `x` is linear in cents, from `SIDE_MARGIN` at -200 to `width - SIDE_MARGIN` at +200, so a tone midway between two semitones sits midway between their ticks. Beyond ±200 it is clamped to that edge and `pinned` is `"left"` or `"right"`; otherwise null.
  - `offsetLabel`: `formatCents(cents)`.
  - The caller passes written pitches and the offset from the sounding expected pitch, so labels agree with the staff.

## Dependencies

`../../core/pitch` only.

## Tests

- `tests/render/graph.test.ts`: tick positions and labels, expected at the centre, midway C5/C♯5 at the midpoint of their ticks, ±200 on the edge ticks, ±201 and an octave pinned to the right side, offset sign and rounding, zero.
- `tests/render/graph-imports.test.ts`: the module imports only `../../core/pitch` and nothing from app, audio, staff, the judge or Preact.
