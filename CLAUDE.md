# CLAUDE.md

fingerwise is a browser-based flashcard drill for 12-hole ocarina fingerings. The human drives planning, docs and architecture; Claude writes most of the code. Docs come first.

## Where things live

- `docs/vision/vision.md`: intent and planning. A proposal, not fact.
- `docs/architecture/`: what is built. Fact. Module docs mirror `src/` folders; ADRs are in `decisions/`.
- `docs/features/<n>-<name>/`: `design.md` plus `stories/`. Story specs are durable.
- `story-progress/`: one temporary checklist per in-flight feature, deleted when the feature is accepted (see its README).
- `data/instruments/`: instrument definitions as JSON.
- `docs/templates/`: use these when creating features, stories, ADRs, progress files.

## Skills (in `.claude/skills/`)

| Skill               | Use                                                               | Style                         |
| ------------------- | ----------------------------------------------------------------- | ----------------------------- |
| `fw-plan`           | Think through and record vision, ADRs, feature designs, stories.  | Dialog-heavy                  |
| `fw-breakdown <F>`  | Turn all of a feature's stories into one checklist in `story-progress/`. | Checks assumptions, asks once |
| `fw-execute <F>`    | Run the checklist, one commit per story.                          | Hands-off; user-invoked only  |

## Workflow

1. On a `plan/` branch, plan with `fw-plan`: vision, then feature design, then stories. Merge the branch to `main`.
2. On a `feature/F<NN>-<slug>` branch, `fw-breakdown F<NN>` reads the feature design, all its stories and the module docs, and writes `story-progress/F<NN>.md`: one section per story, each a checklist of how, referring to the story's `AC` numbers instead of copying text.
3. `fw-execute F<NN>` on the same branch implements one story at a time, in order, running checks and committing after each. It stops and reports instead of guessing.
4. When code lands, the matching `docs/architecture/modules/` doc is updated in the same commit, and the corresponding detail in the vision is trimmed to a pointer.
5. After the last story, verify each story's acceptance criteria. Stop for the user's acceptance.
6. After acceptance, delete the progress file in the final commit before merge. Move anything durable into architecture docs or an ADR first.

## Branches

`main` only receives merges. Every change happens on a branch, named `<type>/<name>` in lowercase kebab-case (feature branches keep the uppercase ID):

| Branch              | For                                                                                    | Example                                              | Skill                        |
| ------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------- | ---------------------------- |
| `plan/<topic>`      | Vision, ADRs, feature designs, stories, glossary. Docs only.                           | `plan/spaced-repetition`, `plan/f01-core-flashcards` | `fw-plan`                    |
| `feature/F<NN>-<slug>` | Building one feature's stories: code, tests, module docs, the progress file. One feature per branch. | `feature/F01-core-flashcards`                   | `fw-breakdown`, `fw-execute` |
| `chore/<topic>`     | Tooling, scaffolding, CI, skills, `CLAUDE.md`.                                         | `chore/ci-pages`                                     | none                         |
| `fix/<topic>`       | Bug fixes outside a story.                                                             | `fix/ledger-line-clip`                               | none                         |

- The initial project scaffold (Bun, Vite, Preact, Vitest, Biome, Makefile) was committed straight to `main`, a one-time exception made by the user. Everything after follows these rules.
- A feature's `<slug>` is the name in its folder, so `docs/features/01-core-flashcards/` gives `feature/F01-core-flashcards`.
- Slugs are short (about five words or fewer).
- Cut every branch from an up-to-date local `main`.
- The usual flow: a `plan/` branch designs a feature and writes its stories, and that branch is **merged to `main` first**. The feature then gets its own `feature/` branch cut from the updated `main`.
- Do not mix kinds. Planning changes found while building a story go on a separate `plan/` branch; stop and tell the user.
- The progress file lives only on its `feature/` branch and is deleted before that branch merges.
- Never push, merge, or delete branches unless asked.

## Rules

- Do not edit a story's acceptance criteria. If they are wrong, stop and tell the user.
- Do not reverse an accepted ADR. Propose a new ADR that supersedes it.
- A decision that changes architecture or answers a vision open question needs an ADR first; ask the user.
- Respect the layer rule: the drill engine knows only pitch and instrument definitions, never clef, staff, audio or UI. Pitch is the single internal representation.
- Instruments are data (JSON in `data/instruments/`), not code.
- Never copy commercial fingering charts; use open sources only.
- The stack is Bun, Vite, Preact, Vitest and Biome ([ADR 0001](docs/architecture/decisions/0001-toolchain-and-ui.md)). Do not add dependencies or tools without the user's agreement.
- `make verify` (lint, type-check, tests, build) must pass before any commit. Biome does not touch Markdown or `.claude/`; do not run formatters over them.
- `src/core/` imports no framework or browser APIs, and `src/` never uses Bun-specific APIs.
- Do not commit unless asked. Running `fw-execute` counts as asking: it commits locally on a `feature/` branch, never on `main`, and never pushes.

## Conventions

- Docs and folders are kebab-case. Story IDs are `F<feature>-S<story>`; ADRs are `NNNN-name.md`.
- Link to doc sections by anchor rather than copying text.
