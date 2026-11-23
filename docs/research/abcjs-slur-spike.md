# Slurs from abcjs (F09 spike)

- **Date:** 2026-11-22
- **Question:** how can the abc adapter tell, for each played note of a song, whether it is slurred to the next played note, through ties, repeats and endings? This supports the slurred joins in [F09](../features/09-timed-scoring/design.md#joins) and [ADR 0009](../architecture/decisions/0009-timed-songs-scored-by-coverage.md).
- **Outcome:** from the parse tree, matched to the audio sequence by `startChar`, with a rule of our own. The audio sequence's own slur marking is unreliable.
- **Version tried:** abcjs 6.7.2 (the app's pin), from the repo's `node_modules`, in a throwaway Bun script outside the repo.

## Findings

### The parse tree

A slur is recorded on the note's first pitch: `startSlur: [{ label }]` on the note that opens it (`style: "dotted"` for `.(`) and `endSlur: [label]` on the note that closes it. Every case tried came through as written:

| Input | Parse tree |
| --- | --- |
| `(CDE) F` | start on C, end on E |
| `((CD)E)` | two starts on C; ends on D and E |
| `(C D)(E F)` | two separate slurs |
| `(CD\|EF) G` | across a bar line |
| `(CD` newline `EF) G` | across a line break |
| `(3(CDE) F` | inside a triplet |
| `(C2-C2) D`, `(C2-\|C2 D) E` | with ties, including the end on the tied note |
| `.(CDE) F` | dotted |

Each element keeps its `startChar`, as do the audio events, so a played note finds its written note as the adapter already does for converted notes. A repeated passage maps to the same written notes on each play.

abcjs gives **no warning** for an unbalanced slur: `C(D E F` with no close, or `C) D` with no open.

### The audio sequence

A note played into the next under a slur gets `endType: "tenuto"` (and `gap: -0.001`). This looks ready-made, but it is wrong in several cases:

| Input | Sequence | Right answer |
| --- | --- | --- |
| `C !tenuto!D E` | D marked | not slurred: an articulation mark gives the same `endType` |
| `(C2-C2) D` | D marked: a slur closed on a tied note never closes | D not slurred |
| `\|:C(D:\|1 E) F:\|2 G` | on the second pass D is marked into G, and G is marked | only D to E on the first pass |
| `(C z D) E` | C marked, over the rest | no join: a rest breaks the sound |
| `C(D E F` (unclosed) | D, E and F marked | rejected (below) |

`.C` gives `endType: "staccato"`; staccato is not used.

## Proposed rule

1. Walk the written notes in text order, counting slur depth: each `startSlur` entry adds one, each `endSlur` entry takes one away. A written note is *slurred to its written next* when the depth after it is above zero. For a tied group, use the depth after the group's last note. Dotted slurs count as slurs.
2. A played note is slurred to the next played note when all three hold:
   - it is slurred to its written next;
   - the next played note is that written next note (not a jump back for a repeat or into another ending);
   - no rest lies between them (the next note starts when this one ends).
3. **Unbalanced slurs are a problem** (decided by the user, 2026-11-22): the song is rejected with a positioned problem, as for a chord or grace note. A slur still open at the end ("Slur opened here is never closed") is reported at its opening note, and a close with nothing open ("Slur closed here was never opened") at its closing note. Since slurs change scoring, a typo must not silently slur the rest of a tune.

This rule gives the right answer for every case in the tables.

## Not established

- Slurs in a tune with several voices (rejected anyway) and slurs on chords (rejected anyway).
- A slur that opens in one ending and closes after it. Rule 2 drops the join at any jump, which seems right, but it was not tried.
- Real tunes from the web: how often they contain unbalanced slurs, which would now be rejected.
