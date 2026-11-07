---
name: fw-execute
description: Execute a feature's checklist hands-off, one story per commit. Use when story-progress/<F>.md exists and the user wants the work done.
argument-hint: "<feature ID, e.g. F01>"
disable-model-invocation: true
---

# fw-execute: run the checklist

Invoking this skill is the user's authorization to edit code and make local commits for this feature, nothing more. Work hands off: do not ask questions mid-run. When blocked, stop and report.

## Preconditions (check, then stop if not met)

- `story-progress/<F>.md` exists with story sections. If not, tell the user to run `fw-breakdown` first.
- You are on the feature's branch, `feature/<F>-<slug>` (see CLAUDE.md#branches), where `<F>` matches the argument. On `main` or any other branch, stop and tell the user to switch (or run `fw-breakdown`, which creates the feature branch). Never create branches here and never commit to `main`.
- The working tree is clean, except that `story-progress/<F>.md` may be new and uncommitted from `fw-breakdown`; commit it with the first story. Any other uncommitted change: stop and report.
- `make verify` exists (lint, type-check, tests, build; see the README's Building section). If it does not, stop and report.

## Per story loop

1. Take the first story section with unticked items. Read its story file, the feature design, relevant ADRs, and the architecture docs for the modules it touches.
2. Implement exactly what the checklist and the story's acceptance criteria require. Follow the layer rule: the drill engine knows only pitch and instrument definitions. Instruments are data, not code. No scope beyond the story.
3. Run `make verify`. Fix failures that your change caused (`make fix` applies formatting). It must pass before committing.
4. Update `docs/architecture/modules/` for anything this story completed, and trim the matching vision detail to a pointer.
5. Tick the story's checklist items in `story-progress/<F>.md`.
6. Commit everything for the story, including the tick and doc updates, in one commit. Message: `<story ID>: <name>` (for example `F01-S02: Reveal after delay`), with a short body. Follow the harness's attribution rules for commit trailers. Do not push.
7. Move straight on to the next story. Do not pause between stories.

## Stop and report, don't push through, when

- A story, the design or the checklist is ambiguous or contradicts an ADR or the architecture docs.
- The work needs an architecture decision or an open question answered (that is an ADR for `fw-plan`).
- An acceptance criterion looks wrong or uncheckable. Never edit criteria.
- Tests or build fail and the cause is not your change, or you cannot fix them after a reasonable effort.
- A tool or dependency is needed that the user has not agreed to install.
- Anything would be destructive or outward-facing (force push, deleting user work, publishing).
- The work turns out to need a planning change (vision, ADR, feature design, story). That goes on a separate `plan/` branch; report it rather than editing planning docs here.

When stopping, record what happened under Notes in the progress file, leave the tree committed or cleanly stashed, and report: which stories were finished, where you stopped, and the specific decision needed. Earlier stories stay committed.

## Finishing

After the last story, verify each story's acceptance criteria against the running code or tests, tick the Closing items you can, and report which criteria are met and how, story by story. Then stop for user acceptance. Do not delete the progress file yet.

If the user then says the feature is accepted, delete `story-progress/<F>.md` in a final commit (`<F>: remove progress file`), after confirming durable outcomes are already in the architecture docs or ADRs. Do not merge or push unless asked.
