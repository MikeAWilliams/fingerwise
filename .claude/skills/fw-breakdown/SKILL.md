---
name: fw-breakdown
description: Break a fingerwise story into ordered sub-tasks, each with its own checklist, written to story-progress/. Use when a story is ready to be built.
argument-hint: "<story ID, e.g. F01-S02>"
---

# fw-breakdown: story to sub-tasks

Turn one story into the "how": an ordered list of sub-tasks, each a checklist and each sized for one commit. The story says *what*; you decide *how* and record it in `story-progress/<ID>.md`.

## Branch (check first)
The breakdown is written on the story's own branch, `story/<ID>-<slug>`, where `<slug>` is the slug in the story file's name (see CLAUDE.md#branches).
- On the matching `story/` branch: proceed.
- On `main`: the story file must already exist in `docs/features/` (its `plan/` branch merged). If it does not, stop and tell the user to merge the planning branch first. If it does, create `story/<ID>-<slug>` from the current `main` and switch to it.
- On a `plan/`, `chore/`, `fix/` or different-story branch: stop and tell the user. Do not mix work.
- Leave the new progress file uncommitted; `fw-execute` commits it with sub-task 1. Do not commit, push or merge.

## Read first
1. The story file in `docs/features/*/stories/` and its feature `design.md`
2. The architecture docs for every module it touches, and relevant ADRs
3. The existing code those modules cover, and `docs/vision/vision.md` for the intended shape
4. `docs/templates/story-progress.md`

If the story is missing, ambiguous, contradicts an ADR, or its acceptance criteria cannot be checked, stop and tell the user. Never edit the story or its criteria.

## Check assumptions before writing
List what you would have to assume. Separate:
- **Blocking**: changes the design or the breakdown (data shapes, which module owns something, an undecided open question). Ask the user.
- **Minor**: sensible defaults. State them in Notes and proceed.

Ask all blocking questions in one batch, with a recommendation for each (AskUserQuestion for bounded choices). Do not drip questions. If a question needs a real decision, say so: it is an ADR for `fw-plan`, not something to settle here.

## What a good breakdown looks like
- **Each sub-task is one coherent commit** that leaves the repo working: builds, lint clean, tests pass.
- **Order by dependency**, lowest layer first (pitch and data before drill logic before rendering before UI). Respect the layer rule: the drill engine knows only pitch and instrument definitions.
- **Tests belong with the code** they cover, in the same sub-task, not in a trailing "add tests" task.
- **Docs land with code**: the sub-task that completes a module includes updating its `docs/architecture/modules/` doc and trimming the vision to a pointer.
- **Checklist items are concrete steps** a hands-off executor can follow without asking: name the files, functions or data to create, and the command that proves it works. Refer to acceptance criteria as `AC1`, `AC2`; never copy their text.
- **Keep it proportionate.** A small story may be two or three sub-tasks. Do not pad.
- **Instruments are data**: new fingering or instrument facts go in `data/instruments/` JSON, not code.

## Output
Write `story-progress/<ID>.md` from the template, with `## Sub-task N: <name>` sections, each holding its checklist, followed by the Closing section. Add a one-line `Covers: AC1, AC2` per sub-task so every acceptance criterion is covered by at least one sub-task; check this before finishing.

Then summarize in a few lines: the sub-tasks in order, the assumptions you made, and anything the user should confirm. Do not start executing. Do not commit unless asked.
