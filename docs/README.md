# Documentation

fingerwise is planned in documents first. This is the map.

| Folder | Holds | Nature |
|---|---|---|
| [`vision/`](vision/) | The vision and detailed planning. Where most human work happens. | Intent (may be unbuilt) |
| [`architecture/`](architecture/) | Overview, one doc per module, data formats, decision records (ADRs). | As-built fact |
| [`features/`](features/) | One folder per feature: a design doc plus its stories. | Specs |
| [`research/`](research/) | Background investigation: prior art, fingering sources, licensing notes. | Reference |
| [`templates/`](templates/) | Templates for feature designs, stories, ADRs and progress files. | Tooling |
| [`glossary.md`](glossary.md) | Domain terms used across the docs. | Reference |

Outside `docs/`:
- [`../story-progress/`](../story-progress/): one temporary checklist per in-flight story; deleted when the story is accepted, before merge.
- [`../data/instruments/`](../data/instruments/): instrument definitions as JSON.

## Flow

`vision` -> `features` (design, then stories) -> `story-progress` -> code -> `architecture` updated.

## Conventions

- File and folder names are kebab-case.
- Features are numbered in build order: `features/01-core-flashcards/`.
- Story IDs are `F<feature>-S<story>` (for example `F01-S02`), and story files are named `F01-S02-short-name.md`.
- ADRs are numbered: `architecture/decisions/0001-short-name.md`.
- Link to sections by anchor instead of duplicating text.
