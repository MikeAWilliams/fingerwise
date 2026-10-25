# Open 12-hole ocarina fingering data

- **Date:** 2026-10-25
- **Question:** what open data exists for 12-hole ocarina fingerings, and can the app draw tablature from it?
- **Source:** [panzi/ocarina_tabs](https://github.com/panzi/ocarina_tabs) (`make_font.py`, `main.js`, README), read via the GitHub web pages. The font files themselves were not downloaded or inspected.

## Findings

- **License:** the fonts are under the SIL Open Font License 1.1 (letterforms based on Liberation Sans). Bundling and redistributing them is allowed; the license notice must travel with them.
- **Two fonts:** `Open-12-Hole-Ocarina-1.ttf` and `Open-12-Hole-Ocarina-2.ttf`. The sources do not say how they differ. The user chose font 1 and trusts it.
- **Glyph encoding:** each glyph is a letter (ASCII codepoint) drawn as 12 holes, each either filled (covered) or outline (open). There is no half-covered state, so chromatic notes are full fingerings.
- **Pitch to glyph:** `main.js` has a `KEY_MAPS` table for C, F and G ocarinas. The C map covers 21 notes, one glyph per semitone from A to F² (read as A4 to F6 sounding):
  - naturals: A=A, C=B, D=C, F=D, H=E, I=F, K=G, M=A², O=B², P=C², R=D², T=E², U=F²
  - sharps: B=A♯, E=C♯, G=D♯, J=F♯, L=G♯, N=A♯², Q=C♯², S=D♯²
  - Flats are not listed; they use the sharp's glyph.
- **One table, three keys:** the F and G maps use the same glyph characters with different labels (`A` is A on C, D on F, E on G). The fingering table is shared across ocarina keys and the key is only an offset.
- **No data file:** there is no pitch-to-pattern JSON, only the font and the editor's table.

## Not established

- Whether the glyph set follows Taiwanese or Japanese style. The sources do not say. The user has chosen to treat it as the Taiwanese-style 12-hole alto C.
- Which physical hole is hole 1 in the glyphs. Not needed while tablature is drawn by the font.
- Whether the sounding range is exactly A4 to F6. Inferred from the labels; the C ocarina's octave marks (², none) are relative.
