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

Use the templates in [`../templates/`](../templates/). Stories are durable specs: their acceptance criteria do not change as work happens. The "how" for a feature in flight is tracked as a checklist in [`../../story-progress/`](../../story-progress/), not here.

## Index

| #   | Feature                        | Design status |
| --- | ------------------------------ | ------------- |
| 01  | Core flashcards                | done          |
| 02  | Deploy and PWA                 | done          |
| 03  | Play the note                  | done          |
| 04  | Record and judge a single note | done          |
| 05  | Songs as note order            | done          |
| 06  | Smart sampling                 | done          |
| 07  | Song practice                  | done          |
| 08  | Timed play-along               | done          |
| 09  | Timed scoring                  | done          |
| 10  | Scrolling song view            | done          |
| 11  | Score analysis                 | done          |
| 12  | Score after the song           | done          |
| 13  | Play the song                  | designed      |

This index is the feature order. Folders are created when a feature is designed, not before.

## Parked

Ideas not planned yet. They have no number, so a feature planned later never forces a renumber; one gets its number, and its folder moves out of [`parked/`](parked/), when it is scheduled.

| Idea                        | Design |
| --------------------------- | ------ |
| Other instruments and clefs | [parked/other-instruments-and-clefs](parked/other-instruments-and-clefs/design.md) |
