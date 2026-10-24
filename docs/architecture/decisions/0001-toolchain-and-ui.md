# 0001: Toolchain and UI layer

- **Status:** accepted
- **Date:** 2026-10-24

## Context
fingerwise is a browser-only app (installable PWA, no server) that will be written mostly by Claude under a human-led planning process. The development machine runs Bazzite (immutable), with Homebrew available. We needed a TypeScript toolchain that is current, quick to run, and predictable for generated code.

## Decision
- **Runtime, package manager and script runner:** Bun, installed with `brew install bun`.
- **Language:** TypeScript (strict).
- **Dev server and bundler:** Vite, with `base` set to `/fingerwise/` for GitHub Pages.
- **Tests:** Vitest.
- **Lint and format:** Biome, applied to code and config only (not Markdown or `.claude/`).
- **UI:** Preact with TSX and plain CSS. No router; one page that switches views.
- **Entry point:** a `Makefile` wrapping the `bun run` scripts. `make verify` (lint, type-check, tests, build) must pass before every commit.
- **Dependencies:** installed per project through `bun install`; nothing global except Bun.

## Alternatives considered
- **Node + pnpm:** the conventional choice with the most tutorials. Rejected because Bun covers install and scripts in one tool and Vite works through it.
- **Vanilla TypeScript:** no framework to learn, but hand-rolled rendering and state grows messy as settings, drills and play-along arrive.
- **Svelte:** least boilerplate, but `.svelte` files have weaker Biome support and a smaller ecosystem than Preact.
- **React:** same model as Preact at a larger size, with no benefit for this app.

## Consequences
- Code in `src/` runs in the browser and must not use Bun-specific APIs. Bun is a development tool only.
- `src/core/` imports no framework or browser APIs, which keeps the drill engine testable and the layer rule intact.
- Switching runtime later (to Node) should be cheap because Bun is only the installer and script runner.
- PWA support (`vite-plugin-pwa`) is deferred to its own story.
- Adding any further dependency still needs the user's agreement.
