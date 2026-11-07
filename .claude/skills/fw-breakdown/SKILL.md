---
name: fw-breakdown
description: Break all the stories of a fingerwise feature into one ordered implementation checklist in story-progress/. Use when a feature's stories are ready to be built.
argument-hint: "<feature ID, e.g. F01>"
---

# fw-breakdown: feature to checklist

Turn a feature's stories into the "how": one ordered checklist with a section per story, each section sized for one commit. The stories say _what_; you decide _how_ and record it in `story-progress/<F>.md`, where `<F>` is the feature ID (`F01`).

## Branch (check first)

The breakdown is written on the feature's own branch, `feature/<F>-<slug>`, where `<slug>` is the feature folder's name without its number (`docs/features/01-core-flashcards/` gives `feature/F01-core-flashcards`; see CLAUDE.md#branches).
- On the matching `feature/` branch: proceed.
- On `main`: the feature's design and stories must already exist in `docs/features/` (its `plan/` branch merged). If not, stop and tell the user to merge the planning branch first. If they do, create `feature/<F>-<slug>` from the current `main` and switch to it.
- On a `plan/`, `chore/`, `fix/` or different-feature branch: stop and tell the user. Do not mix work.
- Leave the new progress file uncommitted; `fw-execute` commits it with the first story. Do not commit, push or merge.

## Read first

1. The feature's `design.md` and every story file in its `stories/` folder
2. The architecture docs for every module the stories touch, and relevant ADRs
3. The existing code those modules cover, and `docs/vision/vision.md` for the intended shape
4. `docs/templates/story-progress.md`

If a story is missing, ambiguous, contradicts an ADR or another story, or its acceptance criteria cannot be checked, stop and tell the user. Never edit a story or its criteria.

## Check assumptions before writing

List what you would have to assume across the whole feature. Separate:
- **Blocking**: changes the design or the breakdown (data shapes, which module owns something, an undecided open question). Ask the user.
- **Minor**: sensible defaults. State them in Notes and proceed.

Ask all blocking questions in one batch, with a recommendation for each (AskUserQuestion for bounded choices). Do not drip questions. If a question needs a real decision, say so: it is an ADR for `fw-plan`, not something to settle here.

## What a good breakdown looks like

- **Each story is one commit** that leaves the repo working: builds, lint clean, tests pass. Do not split a story across commits or merge stories into one.
- **Order the stories by dependency**, using the story numbers when they already fit and reordering only when a later story is needed by an earlier one. Within a story, order checklist items lowest layer first (pitch and data before drill logic before rendering before UI). Respect the layer rule: the drill engine knows only pitch and instrument definitions.
- **Plan across stories.** Note shared code that one story builds and later ones reuse, so the earlier story builds it once and in the right place.
- **Tests belong with the code** they cover, in the same story's section, not in a trailing "add tests" item.
- **Docs land with code**: the story that completes a module includes updating its `docs/architecture/modules/` doc and trimming the vision to a pointer.
- **Checklist items are concrete steps** a hands-off executor can follow without asking: name the files, functions or data to create, and the command that proves it works. Refer to acceptance criteria as `AC1`, `AC2` (per story); never copy their text.
- **Keep it proportionate.** A small story may be two or three items. Do not pad.
- **Instruments are data**: new fingering or instrument facts go in `data/instruments/` JSON, not code.

## Output

Write `story-progress/<F>.md` from the template, with a `## <story ID>: <name>` section per story, each holding its checklist, followed by the Closing section. Add a `Covers: AC1, AC2` line per story so every acceptance criterion of every story is covered; check this before finishing.

Then summarize in a few lines: the stories in order, the assumptions you made, and anything the user should confirm. Do not start executing. Do not commit unless asked.
