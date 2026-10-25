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

## Likely next ADRs

Open questions are tracked in `../../vision/vision.md#open-questions` and under the features in `../../vision/vision.md#feature-order`.
