# fingerwise

A flashcard drill for learning ocarina fingerings. A note appears on the staff, you finger it from memory, and after a delay the app reveals the note name and the fingering chart, then plays the note so you can check by ear. Optionally it listens through the microphone while you play the note on your ocarina and tells you whether you got it right. It runs in the browser as an installable, offline-capable web app, and it is open source.

**Live site:** <https://mikeawilliams.github.io/fingerwise/>

![fingerwise showing a D4 on the treble staff, with the note name, the 12-hole ocarina fingering and a pitch meter reading "Correct"](docs/images/screenshot.png)

The first target is the 12-hole ocarina. The design keeps instruments, clefs and staff styles as swappable data and layers so other instruments can be added later.

**Status:** features 1 to 9 are done.

- **Cards:** a random note is drawn on the staff. Its name and fingering appear after the delay or on a click or key press, and the next click or key shows another note. The next note also appears on its own after an advance delay.
- **Sound:** after the reveal the app plays the note as a plain tone, with a settable delay and duration.
- **Judging:** with judging on, the app listens through the microphone before the reveal, grades the note you played as correct or incorrect within a tolerance you set, and shows a graph of how your pitch sits against the expected one. It judges pitch, not fingering.
- **Settings:** note range, sharps, reveal delay, auto-advance and its delay, sound, and judging. They are kept in the browser.
- **App:** published to GitHub Pages from `main` (every push is verified), lays out for phone and tablet, installs to the home screen, works offline and updates itself silently (see [`deployment.md`](docs/architecture/deployment.md)).

Feature 10 (scrolling song view) is designed; other instruments and clefs is a parked idea. See [`docs/features/`](docs/features/) for the list.

## Documentation

Planning comes first in this project. The docs are organized by what they are for:

| Where                                      | What it is                                                                                       |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| [`docs/architecture/`](docs/architecture/) | What is actually built: overview, module docs, data formats, and decision records (ADRs).        |
| [`docs/features/`](docs/features/)         | One folder per feature: a design doc plus its stories with acceptance criteria. The plan, not fact. |
| [`docs/research/`](docs/research/)         | Background research: prior art, fingering data sources, licensing.                               |
| [`docs/templates/`](docs/templates/)       | Templates for features, stories, ADRs and progress files.                                        |
| [`docs/glossary.md`](docs/glossary.md)     | Domain terms.                                                                                    |
| [`story-progress/`](story-progress/)       | A checklist per feature currently being built. Deleted when the feature is accepted.                 |
| [`data/instruments/`](data/instruments/)   | Instrument definitions as JSON files.                                                            |
| [`data/fonts/`](data/fonts/)               | The bundled tablature font and its OFL license.                                                  |
| [`CLAUDE.md`](CLAUDE.md)                   | Working rules for Claude, which writes most of the code.                                         |

Feature designs are proposals, not promises: they record intent and may change, and only the architecture docs describe what is built.

The flow is: feature designs and stories, then progress tracking and code, then architecture docs updated to describe what was built. See [`docs/README.md`](docs/README.md) for the details.

## Building

The app runs entirely in the browser. The tools below are only needed to develop and build it; the built result is static files that any web host can serve.

### Prerequisites

| Tool                    | Role                                       | Install                     |
| ----------------------- | ------------------------------------------ | --------------------------- |
| git                     | Version control                            | Already present on Bazzite. |
| [Bun](https://bun.com/) | Runtime, package manager and script runner | `brew install bun`          |

Everything else is installed per project by `bun install`, so there is no global install for them:

| Tool                            | Role                              |
| ------------------------------- | --------------------------------- |
| [Preact](https://preactjs.com/) | UI library                        |
| TypeScript                      | Language and type checking        |
| [Vite](https://vite.dev/)       | Dev server and production bundler |
| [Vitest](https://vitest.dev/)   | Test runner                       |
| [Biome](https://biomejs.dev/)   | Linting and formatting            |

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
data/         instrument definitions (JSON) and the tablature font
```

## Run it locally

```bash
bun install      # or: make install
make dev         # http://localhost:5173/fingerwise/
make verify      # lint, type-check, tests and build
```

See [Building](#building) for the full command list.

## Using

The app drills the 12-hole alto C ocarina. A note appears on the staff; name it and finger it, then wait for the reveal (or click or press a key) to see the note name and fingering. The note then sounds. Click or press a key again for the next note, or let auto-advance show it.

To have the app judge you, turn on judging in the Settings view and play the note on your ocarina before the reveal. The browser asks for microphone permission the first time, and the first click, tap or key press is needed to unlock audio. Judging is off by default.

The Settings button sets the note range, whether sharps are included, the delays, the sound, and judging. Settings are kept in the browser.

## Contributing

Contributions are welcome, especially bug fixes, fingering corrections and new instruments. Read [`CONTRIBUTING.md`](CONTRIBUTING.md) first. This project is built with AI assistance; the details are there.

## License

MIT, see [`LICENSE`](LICENSE). Dependencies such as VexFlow and abcjs are MIT, and panzi's tablature fonts are unrestricted (the pitch detector is our own, [ADR 0005](docs/architecture/decisions/0005-yin-pitch-detector.md)). Fingerings must never be copied from commercial charts (Songbird, STL Ocarina and similar); use open sources and the open fonts. Code license and third-party asset notes stay separate in the repo.
