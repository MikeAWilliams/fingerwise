# Instrument definitions

One JSON file per instrument, for example `ocarina-12-taiwanese.json`. Adding an instrument means adding a file here, not writing code.

A definition holds: name and family, hole count and layout, fingering style, key, playable range, the glyph table (pitch to tablature glyph, per [ADR 0002](../../docs/architecture/decisions/0002-tablature-from-panzi-font.md)), written-vs-sounding transposition, default clef, and a reference to the tablature renderer.

The schema is in `../../docs/architecture/data-formats.md`. Intent is in `../../docs/vision/vision.md#required-abstractions`.

Fingering data must come from open sources or be generated from open fonts. Do not copy commercial fingering charts.

## Citing sources

Every fingering must be traceable to an open source. When you add or change a definition, say where the fingerings came from in the pull request (the PR template has a field for it), and record it in the file if the schema has a place for it. Acceptable sources are open fonts and open data with a license that allows reuse (name the license), or fingerings you worked out yourself on a real instrument. If you are unsure whether a source is open, ask in an issue before sending data. See [`docs/research/ocarina-fingering-data.md`](../../docs/research/ocarina-fingering-data.md) for the sources already evaluated.
