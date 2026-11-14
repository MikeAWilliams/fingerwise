# Contributing to fingerwise

Thanks for your interest. fingerwise is a small project, and help is welcome in the areas below.

## How the project is built

The maintainer plans and decides the architecture, and Claude (an AI assistant) writes most of the code. [`CLAUDE.md`](CLAUDE.md) and the `fw-*` skills in `.claude/skills/` are in the repo for that reason. That workflow (stories, progress files, `fw-execute`) is the maintainer's. **You do not need to use it.** Send a normal pull request, written by hand or with whatever tools you like. You are responsible for what you submit either way.

## A note on the maintainer

The maintainer is not a sophisticated musician, and cannot check fingerings or musical details on most instruments. Please be specific and clear in everything you request or contribute, and do as much of the work as you can so it is easy to review. For an instrument or a fingering, that means the full data, your hole numbering, a linked open source with its license, and how you checked it (for example, that you own and play the instrument). Contributions the maintainer cannot verify are slow to accept. Questions are welcome, and patience is appreciated.

## Where outside help is most useful

- Bug reports and fixes.
- Fingering corrections to existing instruments.
- New instruments. An instrument is a JSON file in [`data/instruments/`](data/instruments/), not code. See that folder's README.
- Documentation fixes.

For anything feature-sized, open an issue or discussion first. The direction is set in [`docs/vision/vision.md`](docs/vision/vision.md) and the feature designs in [`docs/features/`](docs/features/), so a good idea may still not fit the plan, and it is better to find out before you write the code.

## Fingering data: open sources only

Never copy from a commercial fingering chart. Fingerings must come from open sources (with a license that allows reuse), open fonts, or your own testing on a real instrument. Say where the data came from in your pull request.

## Setting up

You need [Bun](https://bun.com/). Then:

```bash
make install   # install dependencies
make dev       # dev server at http://localhost:5173/fingerwise/
make verify    # lint, type-check, tests and build
```

`make verify` must pass before you open a pull request. CI runs the same checks. Do not run formatters other than Biome (`make fix`) over the code.

## Rules of the codebase

- **Layer rule.** The drill engine (`src/core/`) knows only pitch and instrument definitions. It never knows about clef, staff, audio or UI, and it imports no framework or browser APIs. Pitch is the single internal representation. See [`docs/architecture/`](docs/architecture/).
- **Instruments are data**, not code.
- **No new dependencies** or tools without discussing it first in an issue. The stack is described in [ADR 0001](docs/architecture/decisions/0001-toolchain-and-ui.md).
- `src/` never uses Bun-specific APIs; it runs in the browser.
- A change that alters the architecture needs an ADR first. Propose it in an issue.
- If your change lands code, update the matching doc in `docs/architecture/modules/` in the same pull request.

## Branches and pull requests

Fork the repo and branch from an up-to-date `main`. Name the branch `<type>/<name>` in lowercase kebab-case: `fix/ledger-line-clip`, `chore/ci-cache`, `feature/new-instrument-name`. Keep pull requests focused, and fill in the pull request template.

## Conduct

Be kind. Everyone taking part is expected to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## License

By contributing you agree that your contribution is licensed under the [MIT license](LICENSE).
