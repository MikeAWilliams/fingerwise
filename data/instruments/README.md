# Instrument definitions

One JSON file per instrument, for example `ocarina-12-c-japanese.json`. Adding an instrument means adding a file here, not writing code.

A definition holds: name and family, hole count and layout, fingering style, key, playable range, the fingering table (pitch to hole pattern), written-vs-sounding transposition, default clef, and a reference to the tablature renderer.

The schema is not yet defined. It will be documented in `../../docs/architecture/data-formats.md` once the first feature is designed. Intent is in `../../docs/vision/vision.md#required-abstractions`.

Fingering data must come from open sources or be generated from open fonts. Do not copy commercial fingering charts.
