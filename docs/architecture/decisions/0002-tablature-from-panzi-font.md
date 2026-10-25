# 0002: Tablature drawn with panzi's font 1

- **Status:** accepted
- **Date:** 2026-10-25

## Context
Feature 1 reveals a fingering diagram after the delay. The vision leaned toward SVG drawn from a hole pattern in the instrument JSON, or panzi's `ocarina_tabs` fonts. Research ([ocarina-fingering-data](../../research/ocarina-fingering-data.md)) found the fonts are OFL-licensed, give one glyph per semitone for the 12-hole alto C range, and encode only open or covered holes.

## Decision
- Tablature is rendered as text in `Open-12-Hole-Ocarina-1.ttf` from [panzi/ocarina_tabs](https://github.com/panzi/ocarina_tabs), used unmodified.
- The instrument definition stores, for each pitch, the glyph character to show. It does not store hole patterns.
- The font file ships with the app together with its OFL 1.1 license notice, kept separate from the MIT code license.
- The first instrument is the 12-hole alto C ocarina, Taiwanese-style fingering, with the font's A to F² range.

## Alternatives considered
- **SVG drawn from hole patterns in the JSON:** keeps data as the single source and works for any hole count, but means building and testing our own renderer and sourcing hole patterns we cannot copy from commercial charts.
- **Font 2:** the sources do not say how it differs from font 1; the user chose font 1.

## Consequences
- Tablature data in the JSON is opaque: a character cannot be checked without looking at the font. Trust in the font is a stated assumption.
- Half-covered holes are not representable. An instrument needing them would need another renderer.
- The instrument definition needs a renderer reference (font family) plus per-pitch glyph characters. Another hole count needs its own font or a new renderer; that is feature 9's problem.
- Loading the font is a UI concern (`src/render/`); `src/core/` only passes the glyph string through.
- The OFL notice must be included in the repo and the shipped build.
