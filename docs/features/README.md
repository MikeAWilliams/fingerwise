# Features

One folder per feature, numbered in build order:

```
features/
  01-core-flashcards/
    design.md          behavior, UX, edge cases, modules touched
    stories/
      F01-S01-show-note.md
      F01-S02-reveal-after-delay.md
```

Use the templates in [`../templates/`](../templates/). Stories are durable specs: their acceptance criteria do not change as work happens. The "how" for a story in flight is tracked as a checklist in [`../../story-progress/`](../../story-progress/), not here.

## Index

| #   | Feature                        | Design status |
| --- | ------------------------------ | ------------- |
| 01  | Core flashcards                | not started   |
| 02  | Spaced repetition              | not started   |
| 03  | Play the note                  | not started   |
| 04  | Songs as note order            | not started   |
| 05  | Record and judge a single note | not started   |
| 06  | Wait mode for songs            | not started   |
| 07  | Timed play-along               | not started   |
| 08  | Other instruments and clefs    | not started   |

Feature order and scope come from `../vision/vision.md#feature-order`. Folders are created when a feature is designed, not before.
