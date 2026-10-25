# Instrument definitions

One JSON file per instrument, for example `ocarina-12-taiwanese.json`. Adding an instrument means adding a file here, not writing code.

A definition holds: name and family, hole count and layout, fingering style, key, playable range, the glyph table (pitch to tablature glyph, per [ADR 0002](../../docs/architecture/decisions/0002-tablature-from-panzi-font.md)), written-vs-sounding transposition, default clef, and a reference to the tablature renderer.

The schema is in `../../docs/architecture/data-formats.md`. Intent is in `../../docs/vision/vision.md#required-abstractions`.

Fingering data must come from open sources or be generated from open fonts. Do not copy commercial fingering charts.
