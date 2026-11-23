# F11-S02: Practice spots

- **Feature:** `../design.md`
- **Modules:** `src/core/analysis`, `docs/architecture/`
- **Depends on:** F11-S01

## Story

As a player, I want to be told when two bars of the song went clearly worse than the rest, and only then, so that I can practise that spot on its own instead of the whole song.

## Acceptance criteria

Each item must be checkable and numbered so progress checklists can refer to it. Do not edit these once work starts; raise a change instead.
- **AC1:** Given a song of at least three bars, then every span of two bars in a row, starting at any bar, is a candidate. A graded note or rest belongs to the bar it starts in. A candidate with no graded item is skipped.
- **AC2:** Given a candidate, then its coverages (of its graded notes and rests) are compared with those of the rest of the song by a one-sided Mann–Whitney U test (the span lower), with mid-ranks for ties.
- **AC3:** Given the p-values, then a candidate is a practice spot only when its p-value is below 0.05 after correcting for the number of candidates tested (Bonferroni or Holm; the choice is recorded in the module doc).
- **AC4:** Given practice spots, then at most two are reported, not overlapping, lowest p-value first (ties broken by lower mean coverage, then the earlier bar). Each gives its first and last bar numbers (counted from 1 over the bars of `songBars`, so a pickup bar is bar 1 and the count-in is not counted), its mean coverage and the mean coverage of the rest of the song.
- **AC5:** Given no candidate passes, or a song of fewer than three bars, then the result says so: no spots, and whether candidates were tested at all (so the text can tell "nothing stands out" from "too short to tell").
- **AC6:** Given a song whose coverage is uniformly low, or uniformly high, then there is no spot.
- **AC7:** Given the p-value computation, then it matches known reference values for small samples with and without ties, within a stated precision.
- **AC8:** Given the change, then `make verify` passes and the `analysis` module doc describes the rule.

## Notes

- Exact p-values or a normal approximation with tie correction: choose in the breakdown; small samples (a two-bar span may hold two to eight items) favour exact values where they are cheap.
- The constants (span of two bars, two spots, 0.05, three bars minimum) live in one block.
- No new dependency: the test is written by hand.

## Test approach

Unit tests from item coverages placed in bars: one clearly bad span among good ones (found), the same with noise (still found), a bad single item (not enough alone), uniform scores (none), two bad spans far apart (both, in order), two overlapping bad spans (one), a two-bar song (none, too short), ties at 0 and 1. Reference p-values checked against a published table or a statistics package run once by hand, recorded in the test.
