# CLAUDE.md

fingerwise is a browser-based flashcard drill for 12-hole ocarina fingerings. The human drives planning, docs and architecture; Claude writes most of the code. Docs come first.

## Where things live

- `docs/vision/vision.md`: intent and planning. A proposal, not fact.
- `docs/architecture/`: what is built. Fact. Module docs mirror `src/` folders; ADRs are in `decisions/`.
- `docs/features/<n>-<name>/`: `design.md` plus `stories/`. Story specs are durable.
- `story-progress/`: one temporary checklist per in-flight story, deleted when the story is accepted (see its README).
- `data/instruments/`: instrument definitions as JSON.
- `docs/templates/`: use these when creating features, stories, ADRs, progress files.

## Skills (in `.claude/skills/`)

| Skill | Use | Style |
|---|---|---|
| `fw-plan` | Think through and record vision, ADRs, feature designs, stories. | Dialog-heavy |
| `fw-breakdown <ID>` | Turn a story into sub-tasks with checklists in `story-progress/`. | Checks assumptions, asks once |
| `fw-execute <ID>` | Run the breakdown, one commit per sub-task. | Hands-off; user-invoked only |

## Workflow

1. On a `plan/` branch, plan with `fw-plan`: vision, then feature design, then stories. Merge the branch to `main`.
2. On a `story/<ID>-<slug>` branch, `fw-breakdown <ID>` reads the story, design and module docs, and writes `story-progress/<ID>.md`: sub-tasks, each a checklist of how, referring to the story's `AC` numbers instead of copying text.
3. `fw-execute <ID>` on the same branch implements one sub-task at a time, running checks and committing after each. It stops and reports instead of guessing.
4. When code lands, the matching `docs/architecture/modules/` doc is updated in the same commit, and the corresponding detail in the vision is trimmed to a pointer.
5. Verify each acceptance criterion. Stop for the user's acceptance.
6. After acceptance, delete the progress file in the final commit before merge. Move anything durable into architecture docs or an ADR first.

## Branches

`main` only receives merges. Every change happens on a branch, named `<type>/<name>` in lowercase kebab-case (story branches keep the uppercase ID):

| Branch | For | Example | Skill |
|---|---|---|---|
| `plan/<topic>` | Vision, ADRs, feature designs, stories, glossary. Docs only. | `plan/spaced-repetition`, `plan/f01-core-flashcards` | `fw-plan` |
| `story/<ID>-<slug>` | Building one story: code, tests, module docs, the progress file. One story per branch. | `story/F01-S02-reveal-after-delay` | `fw-breakdown`, `fw-execute` |
| `chore/<topic>` | Tooling, scaffolding, CI, skills, `CLAUDE.md`. | `chore/scaffold-vite` | none |
| `fix/<topic>` | Bug fixes outside a story. | `fix/ledger-line-clip` | none |

- A story's `<slug>` is the slug in its story file name, so `F01-S02-reveal-after-delay.md` gives `story/F01-S02-reveal-after-delay`.
- Slugs are short (about five words or fewer).
- Cut every branch from an up-to-date local `main`.
- The usual flow: a `plan/` branch designs a feature and writes its stories, and that branch is **merged to `main` first**. Each story then gets its own `story/` branch cut from the updated `main`.
- Do not mix kinds. Planning changes found while building a story go on a separate `plan/` branch; stop and tell the user.
- The progress file lives only on its `story/` branch and is deleted before that branch merges.
- Never push, merge, or delete branches unless asked.

## Rules

- Do not edit a story's acceptance criteria. If they are wrong, stop and tell the user.
- Do not reverse an accepted ADR. Propose a new ADR that supersedes it.
- A decision that changes architecture or answers a vision open question needs an ADR first; ask the user.
- Respect the layer rule: the drill engine knows only pitch and instrument definitions, never clef, staff, audio or UI. Pitch is the single internal representation.
- Instruments are data (JSON in `data/instruments/`), not code.
- Never copy commercial fingering charts; use open sources only.
- Do not install tools or dependencies without the user's agreement; toolchain choice is an open question in the vision.
- Do not commit unless asked. Running `fw-execute` counts as asking: it commits locally on a `story/` branch, never on `main`, and never pushes.

## Conventions

- Docs and folders are kebab-case. Story IDs are `F<feature>-S<story>`; ADRs are `NNNN-name.md`.
- Link to doc sections by anchor rather than copying text.
