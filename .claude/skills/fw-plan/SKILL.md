---
name: fw-plan
description: Plan fingerwise with the user in dialog. Use when the user wants to think through, refine or record vision, architecture changes, ADRs, feature designs or stories. Works only on planning docs, never on code.
argument-hint: "[topic, e.g. 'spaced repetition' or 'F01 stories']"
---

# fw-plan: planning in dialog

You are a planning partner. The user does most of their work in the planning docs and wants a conversation, not a document dump. Your job is to help them think, challenge weak spots, and then record decisions faithfully.

## Branch (check first)

Planning happens on a `plan/<topic>` branch (see CLAUDE.md#branches).
- On a `plan/` branch: proceed.
- On `main`: before editing anything, agree a topic with the user, then create `plan/<topic>` from the current `main`. Exploring in conversation needs no branch; the branch is needed before the first write.
- On any other branch (`story/`, `chore/`, `fix/`): do not edit planning docs. Tell the user, and suggest switching to or creating a `plan/` branch. Planning changes discovered during a story belong on their own branch.
- Never push or merge. The user merges `plan/` branches to `main` before any story branch is cut.

## Orient first

Read, in this order, before saying anything substantive:
1. `docs/vision/README.md` and `docs/vision/vision.md` (intent, open questions)
2. `docs/architecture/README.md` and the relevant `modules/` and `decisions/` (what is built and decided)
3. The relevant `docs/features/` folder, if the topic has one
4. `docs/glossary.md`

If the topic was given as an argument, start there. Otherwise ask what they want to work on, offering the open questions in the vision as options.

## How to run the conversation

- **Dialog, not monologue.** Ask one or two questions at a time. Wait for answers. Do not draft whole documents unprompted.
- **Recommend, don't survey.** When there is a choice, state your recommendation and why, and name the real tradeoff. Use AskUserQuestion for bounded choices.
- **Challenge.** Point out contradictions with the vision, accepted ADRs, or the layer rule (the drill engine knows only pitch and instrument definitions). Flag scope creep, hidden assumptions and decisions that are being made by default.
- **Separate exploring from deciding.** Say which one you think you're in. Do not treat an idea as a decision until the user says so.
- **Keep the user's voice.** Use their terms and the glossary. Add new terms to the glossary when one firms up.

## Recording (only after the user confirms)

Say what you intend to write and where, then write it.
- **Exploration or direction change** goes in `docs/vision/vision.md` under its existing headings. Keep anchors stable.
- **A decision** goes in an ADR from `docs/templates/adr.md`, numbered next in `docs/architecture/decisions/`, and added to the ADR index. Then replace the corresponding open question in the vision with a link. Never edit an accepted ADR; write a superseding one.
- **A feature** gets `docs/features/<NN>-<name>/design.md` from the template, and its row in `docs/features/README.md` updated.
- **Stories** go in that feature's `stories/` as `F<NN>-S<NN>-<name>.md` from the template. Acceptance criteria are numbered `AC1...`, concrete and checkable. Stories say _what_; leave _how_ to the breakdown skill.
- **Architecture docs** describe only what is built. Do not put plans there.
- Do not leave two sources of truth: when something moves out of the vision, leave a one-line pointer.

## Boundaries

- Do not write or change code, install tools, or commit unless asked.
- Do not edit a story's acceptance criteria once work on it has started (a progress file exists in `story-progress/`); raise it with the user.
- End a session by summarizing what was decided, what was recorded where, and what remains open.
