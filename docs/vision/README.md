# Vision

This folder is where planning happens. Most of the human work on fingerwise is done in [`vision.md`](vision.md); architecture changes, features and stories are derived from it.

## Rules

1. **The vision is intent, not fact.** Anything here may be undecided or unbuilt. For what exists, read [`../architecture/`](../architecture/).
2. **One file, stable headings.** `vision.md` has the high-level vision on top and detailed planning below. Cite sections by anchor (`vision.md#feature-order`) rather than copying text. If the file outgrows one document, split it and keep `vision.md` as the summary and index.
3. **No two sources of truth.** When a section is implemented and documented in architecture, replace its detail with a one-line pointer ("Implemented: see `architecture/modules/pitch.md`").
4. **Decisions leave the vision.** Open questions live in `vision.md`. When one is decided, record it as an ADR in `../architecture/decisions/` and link it here.

## How the vision becomes work

```
vision.md  ->  features/<n>-<name>/design.md  ->  stories/  ->  story-progress/  ->  code
                                                                      |
                                              architecture/ (updated as code lands)
```

1. Pick an area of the vision and write a feature design in [`../features/`](../features/).
2. Break the design into stories (each with acceptance criteria).
3. Work stories one at a time, tracking progress in [`../../story-progress/`](../../story-progress/).
4. When code lands, update [`../architecture/`](../architecture/) to describe what now exists, then trim the vision.
