# F02-S01: Deploy to GitHub Pages

- **Feature:** `../design.md`
- **Modules:** `.github/workflows/`, `docs/architecture/`
- **Depends on:** none

## Story

As a player, I want to open fingerwise at a public URL on any device, so that I can use it without building it myself.

## Acceptance criteria

Each item must be checkable and numbered so progress checklists can refer to it. Do not edit these once work starts; raise a change instead.
- **AC1:** Given a push to any branch, then a workflow runs a `verify` job that installs from the frozen lockfile and runs lint, type-check, tests and build, the same checks as `make verify`.
- **AC2:** Given the `verify` job fails, then no deploy happens.
- **AC3:** Given the `verify` job passes on `main`, then a `deploy` job publishes the built `dist/` to GitHub Pages. Pushes to other branches never run `deploy`, except as AC4 allows.
- **AC4:** Given the story is in progress, then the story branch may also run `deploy`, through one clearly commented condition in the workflow, so the live site can be accepted before the merge.
- **AC5:** Given the story is ready for acceptance, then that exception is removed from the workflow, so `deploy` runs only on `main` and on manual runs of the workflow from `main`.
- **AC6:** Given the workflow, then it declares least-privilege permissions (read contents; write pages and id-token only for the deploy job), a concurrency group so two deploys never overlap, and the `github-pages` environment on the deploy job.
- **AC7:** Given the deployed site at `https://mikeawilliams.github.io/fingerwise/`, when opened, then a card shows, the page makes no failing requests (no 404s in the network panel), and every file is served under `/fingerwise/`.
- **AC8:** Given the deployed site, when a card is revealed, then the name and glyph in the ocarina font show, the font is requested from the same origin, and the footer license link opens the OFL text.
- **AC9:** Given the deployed site, when settings are changed and the page is reloaded, then the saved settings are kept.
- **AC10:** Given the change, then `make verify` passes, `README.md` gives the live URL, and `docs/architecture/deployment.md` describes the workflow, its triggers, the `main`-only rule and the one-time repo settings; `docs/architecture/README.md` lists it.

## Notes

- The user does the one-time repo settings: Pages source "GitHub Actions", and the story branch added to the `github-pages` environment's allowed branches (removed at the end). The agent cannot do these; the [user checklist](../user-checklist.md) lists them. The agent never pushes.
- No live site exists yet, so the temporary branch deploy overwrites nothing.
- After the merge, the first run on `main` is the final proof of AC3 and AC5. If it fails, fix on a `fix/` branch.
- Pin the Bun version used in CI. Use major-version tags for GitHub's own actions.
- `workflow_dispatch` only shows its "Run workflow" button once the file is on `main`.

## Test approach

Nothing to unit test. The workflow is checked by pushing the branch and reading the Actions run; the live site is checked by hand in the browsers on the target matrix (AC7 to AC9).
