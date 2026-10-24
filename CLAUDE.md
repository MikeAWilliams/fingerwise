# CLAUDE.md

fingerwise is a browser-based flashcard drill for 12-hole ocarina fingerings. The human drives planning, docs and architecture; Claude writes most of the code. Docs come first.

## Where things live

- `docs/vision/vision.md`: intent and planning. A proposal, not fact.
- `docs/architecture/`: what is built. Fact. Module docs mirror `src/` folders; ADRs are in `decisions/`.
- `docs/features/<n>-<name>/`: `design.md` plus `stories/`. Story specs are durable.
- `story-progress/`: one temporary checklist per in-flight story, deleted when the story is accepted (see its README).
- `data/instruments/`: instrument definitions as JSON.
- `docs/templates/`: use these when creating features, stories, ADRs, progress files.

## Workflow

1. Before coding a story, read the story, its feature `design.md`, and the architecture docs for every module it touches.
2. Create `story-progress/F<NN>-S<NN>.md` from the template: a checklist of how, referring to the story's `AC` numbers instead of copying text. Tick tasks as you go.
3. Implement only what the story's acceptance criteria require.
4. When code lands, update the matching `docs/architecture/modules/` doc in the same change, and trim the corresponding detail in the vision to a pointer.
5. Verify each acceptance criterion. Stop for the user's acceptance.
6. After acceptance, delete the progress file in the final commit before merge. Move anything durable into architecture docs or an ADR first.

## Rules

- Do not edit a story's acceptance criteria. If they are wrong, stop and tell the user.
- Do not reverse an accepted ADR. Propose a new ADR that supersedes it.
- A decision that changes architecture or answers a vision open question needs an ADR first; ask the user.
- Respect the layer rule: the drill engine knows only pitch and instrument definitions, never clef, staff, audio or UI. Pitch is the single internal representation.
- Instruments are data (JSON in `data/instruments/`), not code.
- Never copy commercial fingering charts; use open sources only.
- Do not install tools or dependencies without the user's agreement; toolchain choice is an open question in the vision.
- Do not commit unless asked.

## Conventions

- Docs and folders are kebab-case. Story IDs are `F<feature>-S<story>`; ADRs are `NNNN-name.md`.
- Link to doc sections by anchor rather than copying text.
