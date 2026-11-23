# abc

`src/abc/index.ts`, `src/abc/abcjs.d.ts`

## Purpose

Turns pasted ABC notation into a [`Song`](song.md) of written pitches with their lengths, tempo and meter, or into a list of problems the player can fix. It lives outside `src/core` because it imports a library; `src/core` never imports it. Built in [F05-S02](../../features/05-songs/stories/F05-S02-abc-to-song.md) as [ADR 0006](../decisions/0006-abcjs-for-songs.md) records.

## Public interface

- `MAX_ABC_CHARS` (the settings' `MAX_SONG_CHARS`, 10000) and `MAX_ABC_NOTES = 500`.
- `interface AbcProblem { message, line, note?, column? }`: `line` and `column` are 1-based in the text (CRLF counts as one line break); `note` counts written notes in text order, as the editor shows them (a chord is one, rests and grace notes are none).
- `type AbcResult = { ok: true; song; notes; converted } | { ok: false; problems }`. `notes` is the song length (repeats played out); `converted` counts played notes written with a different letter than their sharp spelling (B♭ to A♯, E♯ to F, double accidentals), once per play.
- `parseAbc(text, instrument): Promise<AbcResult>`: async because abcjs is loaded by a dynamic import on first use. Never throws.
- `locate(text, startChar): { line, column }`.

## How it reads a tune

`parseOnly(text)`, then the tune's `setUpAudio({ chordsOff: true })`. The MIDI numbers of the note events are the app's pitches (sharp spelling), so abcjs applies the key signature, accidentals carried through the bar, naturals, ties, and repeats with first and second endings. No transposition (ADR 0003). Each note event also carries `start` and `duration` in whole-note units (an eighth is 0.125); the adapter multiplies by 4 for quarter-note beats and subtracts the first note's start, so rests before the first note are dropped and a rest later on is a gap between one note's end and the next start. Ties are joined and triplets come out as written by abcjs. This is undocumented API, so the tests write every start and length out.

Before `setUpAudio`, every `el_type: "tempo"` element is removed from the voices (a mid-tune `Q:` line or inline `[Q:…]`): abcjs otherwise rescales the durations of every later note by the tempo ratio, which would change the written lengths. The tempo comes from the tune's first `Q:` in `metaText.tempo` (`bpm` times its beat length in quarter notes), and is `null` when there is none or no rate. The meter comes from `getMeter()`: `specified` with plain numbers gives that meter, `cut_time` gives 2/2, and anything else (no `M:`, `M:none`, `M:C`, a compound top number such as `2+3`) gives `DEFAULT_METER`. A second `Q:` or `M:` is ignored and reports nothing. The song's `firstBar` comes from the first voice's parse tree: the played length of the notes and rests before the first `bar` element (a triplet's notes scaled by its `tripletMultiplier` up to `endTriplet`), less the first note's start, taken modulo a bar; a result of zero or a whole bar, or a tune with no bar line, gives a whole bar. The song's `title` is the first header `T:` as abcjs keeps it in `metaText.title` (trimmed; a blank one gives `undefined`); later header `T:` lines are subtitles and ignored. The rest of the parse tree is used only to reject and to explain.

Slurs are read from the parse tree, not the audio sequence, whose `endType` marks articulations, slurs closed on a tied note and jumps wrongly (see the [slur spike](../../research/abcjs-slur-spike.md)). abcjs records a slur on the note's first pitch: one `startSlur` entry per slur that opens and one `endSlur` entry per slur that closes. Walking the written notes in text order, the adapter keeps a depth (dotted slurs count). Event `i` is `slurred` when the depth after its written note (after the last note of a tied group) is above zero, the next event is the written note that follows the group (a jump back for a repeat, or into another ending, is not), and the next event starts where this one ends (no rest). Events and written notes are matched by `startChar`, as for converted notes.

abcjs is imported as `import("abcjs/src/api/abc_tunebook.js")` and nowhere else; it is CommonJS, so the API is `mod.default ?? mod`. The package has no `exports` map, so the deep path resolves, but it is not a documented API: abcjs is pinned to an exact version (6.7.2) and a bump reruns the tests. `abcjs.d.ts` types only the fields read.

## Supported subset and rejections

Slurs are kept as the `slurred` flag (above); decorations, chord symbols, lyrics and dynamics are read and not kept; rests, triplets, note lengths, tempo and meter are kept as rhythm (see above). Each of these is a problem with a position and a plain message:

- a chord, a grace note, a second voice or staff, more than one tune (the line of the second `X:`), no notes;
- a slur closed with none open ("Slur closed here was never opened", at the closing note) or still open at the end ("Slur opened here is never closed", at the innermost unclosed opening note), which abcjs does not warn about;
- a D.C., D.S., fine, coda or segno decoration (on a note or a bar);
- any abcjs warning (plain prose parses leniently into notes with warnings), with abcjs's line and column and its markup stripped; an exception from abcjs becomes one problem;
- more than 10,000 characters (checked before parsing) or more than 500 notes after repeats (reported at the first note over);
- a note outside the instrument's written range, one problem per offender naming the pitch, its position and `below` or `above` the range.

Lists longer than 10 are cut to 10 plus "and N more problems".

## Dependencies

`abcjs` (dynamic, deep import only), `src/core/settings` (`MAX_SONG_CHARS` only), `src/core/song`, `src/core/pitch`, `src/core/instrument`.

## Measured size

abcjs is its own chunk, `abc_tunebook-<hash>.js`, with no `modulepreload` in `dist/index.html`, and is listed in `dist/sw.js`. Measured on the F05-S02 build with a temporary `import("../abc")`:

| | Minified | Gzip |
| --- | --- | --- |
| abcjs chunk | 211.04 kB | 60.74 kB |
| the adapter, in its own chunk for the measurement only (in the app it is part of the main chunk) | 4.83 kB | 2.14 kB |
| spike (for comparison) | about 211 kB | about 61 kB |

The precache grew from 18 entries (839.07 KiB) to 20 entries (1051.45 KiB), +212.38 KiB.

## Tests

- `tests/abc/abc.test.ts` (Node, no DOM): octaves; note lengths, ties, triplets, rests and repeats with endings (starts and beats written out); `Q:` tempos and no `Q:`; `T:` titles (trimmed, absent, blank, two lines); `M:` meters including `C`, `C|`, none and a compound top number; a later `Q:` or `M:` ignored; the first bar (no pickup, a pickup, a leading rest, a triplet pickup, no bar line, 6/8); tunes in K:G, K:F, K:Ddor and K:D with the pitches written out; carried accidentals and naturals; flats, E♯, B♯, double accidentals and the converted counts, also inside a repeat; repeats and endings; the ignored markup; ties; CRLF, tabs, blank lines; every rejection with its line, note and column; both limits, repeats counted; the range offenders with side; prose and malformed text give problems and never throw.
- `tests/abc/abc-imports.test.ts`: abcjs appears in exactly one runtime import, the dynamic deep import in `src/abc/index.ts`, and in no static import.
