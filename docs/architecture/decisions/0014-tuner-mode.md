# 0014: A third mode, Tuner, that shows whatever note is played

- **Status:** accepted
- **Date:** 2026-11-28

## Context

[ADR 0012](0012-two-practice-modes.md) made the mode the first choice in Settings, with exactly two modes: Flashcards and Song. Both have a target: the card's pitch, or the song's current note. The player also wants to play freely and see which note came out and how far it is from in tune, with no target. On an ocarina the pitch moves with breath pressure, so seeing it move while playing is the point.

The user decided on 2026-11-28 to add this as a mode of its own ([F19 design](../../features/19-tuner-mode/design.md)).

## Decision

- **Three modes.** The Mode list in Settings offers **Flashcards**, **Song** and **Tuner**, in that order. This supersedes ADR 0012's "two modes". The rest of ADR 0012 stands: each setting belongs to the mode it affects and is shown only under it.
- **Tuner has no target and no score.** It listens all the time while it is showing. It takes the nearest note to what it hears as the note played, and shows that note and its offset in cents. Nothing is graded, no progress is stored and no tone is played.
- **Live, then hold.** While a tone sounds, the offset follows it. When the tone ends, the tone's result stays until the next tone.
- **Microphone only.** Tuner shows only the Microphone section. The microphone is always on in Tuner, so the judge checkbox is hidden there, while the tolerance shows and sets what counts as in tune.
- **Layer rule unchanged.** Picking the nearest note, the offset and the held value are pure core code over readings and pitch ([judge](../modules/judge.md)). The staff, tablature and graph are drawn by the app and render layers as for a revealed card.

## Alternatives considered

- **A tuner panel inside Flashcards or Song:** it would add a third way of listening to modes that already listen, with settings that apply to only part of a mode. This is the kind of mixing ADR 0012 removed.
- **One result per note, as a flashcard verdict:** simpler, but it hides the bend of the pitch with breath that the player wants to see.
- **A tuner with no staff or tablature:** less to read, but the player would not see which fingering they actually played.

## Consequences

- `Mode` gains `"tuner"`. Old stored data is unaffected: no old mode maps to it.
- The [settings](../modules/settings.md) view shows only Microphone under Tuner. The [app](../modules/app.md) gets a tuner flow and view, and the header shows no song controls in Tuner.
- Every test that asks "which mode" (`smartSamplingApplies`, `tempoApplies`, `singleNoteApplies`, the sections shown) must treat Tuner as neither Flashcards nor Song.
