# Story progress

**Temporary working state.** One checklist per feature that is currently being built. The story (in `docs/features/`) says _what_ and _what done means_; the checklist here says _how_, and is ticked off as work happens. If a file is here, that feature is in flight.

## Rules

- One file per in-flight feature, named by its ID: `F01.md`, with one section per story. The `fw-breakdown` skill creates it from [`../docs/templates/story-progress.md`](../docs/templates/story-progress.md); `fw-execute` works through it. A feature may add `F01-checks.md` for the user's checks by hand (what to play, look at and note down after each story); it follows the same lifecycle.
- Each story section is a checklist, and each story is one commit.
- Items describe how, not what. Do not copy the story's text or acceptance criteria; refer to them as `AC1`, `AC2`, and so on.
- Tick items as they are completed and commit the file with the work.
- Never edit a story's acceptance criteria from here.

## Lifecycle

1. Work starts: create the checklist.
2. Work proceeds: tick items, add Notes only if needed.
3. Durable outcomes are moved out: module docs in `docs/architecture/`, any decisions as ADRs.
4. The user accepts the work.
5. **Purge:** delete the checklist in the final commit before merging. Git history is the archive.

This README is the only file that stays.
