# Decision records (ADRs)

A short record of a decision: the context, what was chosen, what was rejected, and why. Use [`../../templates/adr.md`](../../templates/adr.md).

- Files are numbered: `0001-short-name.md`.
- Status is `proposed`, `accepted`, or `superseded by NNNN`.
- Do not edit an accepted ADR to change the decision. Write a new one that supersedes it.
- Claude must not reverse an accepted ADR without a new ADR.

## Index

| #                                | Decision                                                  | Status   |
| -------------------------------- | --------------------------------------------------------- | -------- |
| [0001](0001-toolchain-and-ui.md) | Toolchain and UI layer: Bun, Vite, Vitest, Biome, Preact | accepted |
| [0002](0002-tablature-from-panzi-font.md) | Tablature drawn with panzi's font 1; glyph per pitch in the JSON | accepted |
| [0003](0003-written-pitch-and-transposition.md) | Written pitch on the staff; required per-instrument transposition | accepted |
| [0004](0004-pwa-with-vite-plugin-pwa.md) | PWA with vite-plugin-pwa; silent updates; tested targets | accepted |
| [0005](0005-yin-pitch-detector.md) | Hand-written YIN pitch detector for the judge; no dependency | accepted |
| [0006](0006-abcjs-for-songs.md) | abcjs reads songs through its audio sequence; deep import, exact pin | accepted (one-tune rule superseded by 0010) |
| [0007](0007-smart-sampling-by-need.md) | Smart sampling by need score, from judge grades only | accepted |
| [0008](0008-songs-keep-rhythm.md) | Songs keep note lengths, tempo and meter from the ABC | accepted |
| [0009](0009-timed-songs-scored-by-coverage.md) | Timed songs scored by coverage, timing and separation; slurs in the song | accepted (grace at a released end superseded by 0011) |
| [0010](0010-several-tunes-in-one-text.md) | A song text may hold several tunes; all must pass; chosen by position | accepted ("all must pass" superseded by 0013) |
| [0011](0011-release-allowance.md) | A note's end gets a release allowance that follows the tempo | accepted |
| [0012](0012-two-practice-modes.md) | Two practice modes, flashcards and song; songs no longer set the card order | accepted |
| [0013](0013-dropped-tunes-from-a-file.md) | Tunes that fail in a loaded file are kept as dropped tunes, music removed | accepted |

## Likely next ADRs

Open questions are tracked under "Risks and open questions" in each feature design in [`../../features/`](../../features/).
