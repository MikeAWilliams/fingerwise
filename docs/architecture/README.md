# Architecture

This folder describes what is **built**, not what is planned. Plans live in [`../vision/`](../vision/). If the code and these docs disagree, that is a bug in one of them: fix it in the same change.

## Contents

| Path                       | Holds                                                                     |
| -------------------------- | ------------------------------------------------------------------------- |
| `overview.md`              | Layers, dependency rules, data flow. (Not written yet.)                         |
| [`modules/`](modules/)     | One doc per module, mirroring the folders under `src/`.                   |
| `data-formats.md`          | Instrument JSON schema and storage schema. (Not written yet.)             |
| [`decisions/`](decisions/) | ADRs: accepted decisions and why.                                         |

## Layer rule

The drill engine depends only on pitch and instrument definitions. It must not import from rendering, audio or the UI. See `../vision/vision.md#required-abstractions`.
