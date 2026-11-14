# abc

`src/abc/index.ts`, `src/abc/abcjs.d.ts`

## Purpose

Turns pasted ABC notation into a [`Song`](song.md) of written pitches, or into a list of problems the player can fix. It lives outside `src/core` because it imports a library; `src/core` never imports it. Built in [F05-S02](../../features/05-songs/stories/F05-S02-abc-to-song.md) as [ADR 0006](../decisions/0006-abcjs-for-songs.md) records.

## Public interface

- `MAX_ABC_CHARS = 10000` (S03 replaces it with the settings constant) and `MAX_ABC_NOTES = 500`.
- `interface AbcProblem { message, line, note?, column? }`: `line` and `column` are 1-based in the text (CRLF counts as one line break); `note` counts written notes in text order, as the editor shows them (a chord is one, rests and grace notes are none).
- `type AbcResult = { ok: true; song; notes; converted } | { ok: false; problems }`. `notes` is the song length (repeats played out); `converted` counts played notes written with a different letter than their sharp spelling (B♭ to A♯, E♯ to F, double accidentals), once per play.
- `parseAbc(text, instrument): Promise<AbcResult>`: async because abcjs is loaded by a dynamic import on first use. Never throws.
- `locate(text, startChar): { line, column }`.

## How it reads a tune

`parseOnly(text)`, then the tune's `setUpAudio({ chordsOff: true })`. The MIDI numbers of the note events are the app's pitches (sharp spelling), so abcjs applies the key signature, accidentals carried through the bar, naturals, ties, and repeats with first and second endings. No transposition (ADR 0003). The parse tree is used only to reject and to explain.

abcjs is imported as `import("abcjs/src/api/abc_tunebook.js")` and nowhere else; it is CommonJS, so the API is `mod.default ?? mod`. The package has no `exports` map, so the deep path resolves, but it is not a documented API: abcjs is pinned to an exact version (6.7.2) and a bump reruns the tests. `abcjs.d.ts` types only the fields read.

## Supported subset and rejections

Rests, slurs, decorations, chord symbols, lyrics, dynamics, triplets, note lengths and meter are read and not kept. Each of these is a problem with a position and a plain message:

- a chord, a grace note, a second voice or staff, more than one tune (the line of the second `X:`), no notes;
- a D.C., D.S., fine, coda or segno decoration (on a note or a bar);
- any abcjs warning (plain prose parses leniently into notes with warnings), with abcjs's line and column and its markup stripped; an exception from abcjs becomes one problem;
- more than 10,000 characters (checked before parsing) or more than 500 notes after repeats (reported at the first note over);
- a note outside the instrument's written range, one problem per offender naming the pitch, its position and `below` or `above` the range.

Lists longer than 10 are cut to 10 plus "and N more problems".

## Dependencies

`abcjs` (dynamic, deep import only), `src/core/song`, `src/core/pitch`, `src/core/instrument`.

## Measured size

abcjs is its own chunk, `abc_tunebook-<hash>.js`, with no `modulepreload` in `dist/index.html`, and is listed in `dist/sw.js`. Measured on the F05-S02 build with a temporary `import("../abc")`:

| | Minified | Gzip |
| --- | --- | --- |
| abcjs chunk | 211.04 kB | 60.74 kB |
| the adapter chunk | 4.83 kB | 2.14 kB |
| spike (for comparison) | about 211 kB | about 61 kB |

The precache grew from 18 entries (839.07 KiB) to 20 entries (1051.45 KiB), +212.38 KiB.

## Tests

- `tests/abc/abc.test.ts` (Node, no DOM): octaves; tunes in K:G, K:F, K:Ddor and K:D with the pitches written out; carried accidentals and naturals; flats, E♯, B♯, double accidentals and the converted counts, also inside a repeat; repeats and endings; the ignored markup; ties; CRLF, tabs, blank lines; every rejection with its line, note and column; both limits, repeats counted; the range offenders with side; prose and malformed text give problems and never throw.
- `tests/abc/abc-imports.test.ts`: abcjs appears in exactly one runtime import, the dynamic deep import in `src/abc/index.ts`, and in no static import.
