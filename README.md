# fingerwise

A flashcard drill for learning ocarina fingerings. A note appears on the staff, you finger it from memory, and after a delay the app reveals the note name and the fingering chart. You grade yourself, so no microphone is needed. It runs in the browser as an installable, offline-capable web app, and it is open source.

The first target is the 12-hole ocarina. The design keeps instruments, clefs and staff styles as swappable data and layers so other instruments can be added later.

**Status:** planning. The project is scaffolded (hello-world app, passing build and tests), but no features exist yet.

## Documentation

Planning comes first in this project. The docs are organized by what they are for:

| Where                                      | What it is                                                                                       |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| [`docs/vision/`](docs/vision/)             | The vision and detailed plan. Intent, not fact. Start with [`vision.md`](docs/vision/vision.md). |
| [`docs/architecture/`](docs/architecture/) | What is actually built: overview, module docs, data formats, and decision records (ADRs).        |
| [`docs/features/`](docs/features/)         | One folder per feature: a design doc plus its stories with acceptance criteria.                  |
| [`docs/research/`](docs/research/)         | Background research: prior art, fingering data sources, licensing.                               |
| [`docs/templates/`](docs/templates/)       | Templates for features, stories, ADRs and progress files.                                        |
| [`docs/glossary.md`](docs/glossary.md)     | Domain terms.                                                                                    |
| [`story-progress/`](story-progress/)       | A checklist per story currently being built. Deleted when the story is accepted.                 |
| [`data/instruments/`](data/instruments/)   | Instrument definitions as JSON files.                                                            |
| [`CLAUDE.md`](CLAUDE.md)                   | Working rules for Claude, which writes most of the code.                                         |

The flow is: vision, then feature designs and stories, then progress tracking and code, then architecture docs updated to describe what was built. See [`docs/README.md`](docs/README.md) for the details.

## Building

The app runs entirely in the browser. The tools below are only needed to develop and build it; the built result is static files that any web host can serve.

### Prerequisites

| Tool                    | Role                                       | Install                     |
| ----------------------- | ------------------------------------------ | --------------------------- |
| git                     | Version control                            | Already present on Bazzite. |
| [Bun](https://bun.com/) | Runtime, package manager and script runner | `brew install bun`          |

Everything else is installed per project by `bun install`, so there is no global install for them:

| Tool                          | Role                              |
| ----------------------------- | --------------------------------- |
| [Preact](https://preactjs.com/) | UI library                      |
| TypeScript                    | Language and type checking        |
| [Vite](https://vite.dev/)     | Dev server and production bundler |
| [Vitest](https://vitest.dev/) | Test runner                       |
| [Biome](https://biomejs.dev/) | Linting and formatting            |

Check the install with `bun --version`. `make` is also used and is present on Bazzite.

### Commands

The `Makefile` is the entry point; each target wraps a `bun run` script from `package.json`. Run `make` to list them.

```bash
make install     # install dependencies from the lockfile
make dev         # dev server with hot reload (http://localhost:5173/fingerwise/)
make test        # run tests once
make test-watch  # run tests in watch mode
make check       # lint and format check (Biome)
make fix         # apply Biome fixes and formatting
make typecheck   # type-check (Vite does not type-check)
make build       # production build into dist/
make preview     # serve dist/ locally
make verify      # check + typecheck + test + build: must pass before a commit
make clean       # remove dist/ and coverage/
```

Vite is run through Bun here, and application code in `src/` runs in the browser, so it must not use Bun-specific APIs.

### Source layout

```
src/core/     pure logic: pitch, instrument, drill (no framework or browser imports)
src/render/   staff and tablature rendering
src/audio/    synth and pitch detection
src/app/      Preact UI and entry point (main.tsx)
tests/        Vitest tests
data/         instrument definitions (JSON)
```

`src/core/hello.ts` and its test are placeholders and will be removed when the first real code lands.

## Using

Not yet available. This section will explain how to run a drill and change the settings (ocarina key, fingering style, note range, delay length) once the first feature exists.

## License

MIT, see [`LICENSE`](LICENSE). Third-party assets and dependencies are noted in the [vision](docs/vision/vision.md#license-and-assets).
