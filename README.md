# fingerwise

A flashcard drill for learning ocarina fingerings. A note appears on the staff, you finger it from memory, and after a delay the app reveals the note name and the fingering chart. You grade yourself, so no microphone is needed. It runs in the browser as an installable, offline-capable web app, and it is open source.

The first target is the 12-hole ocarina. The design keeps instruments, clefs and staff styles as swappable data and layers so other instruments can be added later.

**Status:** planning. No code has been written yet.

## Documentation

Planning comes first in this project. The docs are organized by what they are for:

| Where | What it is |
|---|---|
| [`docs/vision/`](docs/vision/) | The vision and detailed plan. Intent, not fact. Start with [`vision.md`](docs/vision/vision.md). |
| [`docs/architecture/`](docs/architecture/) | What is actually built: overview, module docs, data formats, and decision records (ADRs). |
| [`docs/features/`](docs/features/) | One folder per feature: a design doc plus its stories with acceptance criteria. |
| [`docs/research/`](docs/research/) | Background research: prior art, fingering data sources, licensing. |
| [`docs/templates/`](docs/templates/) | Templates for features, stories, ADRs and progress files. |
| [`docs/glossary.md`](docs/glossary.md) | Domain terms. |
| [`story-progress/`](story-progress/) | Temporary tracking of stories currently being built. Purged at milestones. |
| [`data/instruments/`](data/instruments/) | Instrument definitions as JSON files. |
| [`CLAUDE.md`](CLAUDE.md) | Working rules for Claude, which writes most of the code. |

The flow is: vision, then feature designs and stories, then progress tracking and code, then architecture docs updated to describe what was built. See [`docs/README.md`](docs/README.md) for the details.

## Building

Not yet available. The toolchain (Node + pnpm or Bun, and the UI layer) is an open decision recorded in the [vision](docs/vision/vision.md#open-questions). This section will list prerequisites and the install, dev, test and build commands once it is decided.

## Using

Not yet available. This section will explain how to run a drill and change the settings (ocarina key, fingering style, note range, delay length) once the first feature exists.

## License

MIT, see [`LICENSE`](LICENSE). Third-party assets and dependencies are noted in the [vision](docs/vision/vision.md#license-and-assets).
