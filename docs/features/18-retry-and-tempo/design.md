# F18: Retry and tempo

- **Status:** done

> Shaped in dialog on 2026-11-28, on `plan/next-features`, as a bundle of three small changes built on one branch (`feature/F18-retry-and-tempo`). Values marked *default* were not discussed and are open to change in review.

## Goal

Three small changes to practice:

- **A song change clears the last run.** Choosing another tune, or another tempo, never leaves feedback from the last run on screen.
- **Chosen tempo.** In Song mode the header's tempo becomes a list, so a tune can be practised slower or faster than written without editing its `Q:` line. The tune's own tempo stays visible in the list.
- **Retry.** In Flashcards, with auto-advance off and the microphone on, a missed card stays after the reveal until the right note is played. It still counts as a miss.

## Behavior

### A song change clears the last run

- Choosing a tune in the header list, choosing a tempo, or closing Settings with a changed song text (typed or loaded from a file) starts the new song clean. The lanes are empty, there is no summary, tuning list, analysis, practice spot shading or overrun lane, and Single note's message, trace and fingering are gone. Tempo practice shows the start prompt, Single note its first note.
- The [app doc](../../architecture/modules/app.md) already says a finished run's state goes with the old flow when the tune changes. Something drawn from outside that state survives, and the player sees it. Which parts do is for the breakdown to find. The rule is that nothing from the last run survives.

### Chosen tempo

- **Where.** In Song mode, either practice, the header's "♩ = N" becomes a `select` labelled "Tempo" (*default*), next to the title or tune list. It is shown when the tempo is shown today: with a song, not while Settings is open.
- **The list.** Entries are "♩ = N" in steps of 5, in quarter notes, as the header counts them. They run from half the tune's tempo, rounded up to a multiple of 5 and never below 30, to 1.5× the tune's tempo, rounded down.
- **The cap.** The list also stops at the fastest tempo where the tune's shortest note still lasts at least `MIN_GRADED_MS` (130 ms). Above that, Tempo practice would draw the note and never grade it. Rests are not considered (*default*). The same list serves both practices (*default*), although Single note has no such limit.
- **The tune's own tempo is always an entry**, marked "♩ = N (tune)", even when it is not a multiple of 5 or lies past the cap. With no `Q:` line the tune's tempo is ♩ = 90 ([ADR 0008](../../architecture/decisions/0008-songs-keep-rhythm.md)), marked the same way. The label is rounded as the header rounds it today, but the value used is the tune's exact tempo.
- **What it changes.** Everything that uses the tune's tempo uses the chosen one instead: Tempo practice (count-in, playhead, metronome, scoring, release allowance, analysis), the length a Single note tone must last, and Play song.
- **Choosing.** Choosing a tempo works like choosing a tune. It is saved at once, it stops playback, and it starts a fresh flow at the first note, clean as above. It is disabled while `cardPhase` is `"playing"`, greyed out like the tune list and Play song.
- **How long it lasts.** The chosen tempo is saved, so a reload keeps it. Choosing another tune, editing the song text or loading a file resets it to the new tune's own tempo. It is not remembered per tune.
- **A saved tempo not in the list** (for example, the text changed under it) gives the tune's own tempo.
- **Narrow screens.** The header must not scroll sideways on a phone; a better phone layout is a later follow-up. The title or tune list shrinks with an ellipsis, and the tempo list keeps its width.

### Retry (Flashcards)

- **When.** In Flashcards with judging on, the microphone running (`listening` is `running`) and auto-advance off. With auto-advance on, nothing changes. With the microphone off, locked or unavailable, auto-advance off waits for a tap as it does today.
- **A miss stays.** When a card reveals after a wrong note, or after the reveal delay with nothing heard, it shows the fingering as today and does not move on. The app keeps listening for the card's note.
- **Playing it right.** A settled tone within the tolerance (the same test as before the reveal) shows "Right, counted as a miss" (*default*) in the verdict line. The next card follows after the advance delay.
- **Playing it wrong again.** The verdict line and graph show the latest note heard, and the app keeps listening.
- **A tap or key** during a retry deals the next card at once, as on any revealed card. It is still a miss.
- **The grade.** The miss is graded once, at the reveal, as today. The retry never changes it, so with smart sampling the card's need moves towards 1 once.
- **Not hearing the tone.** With play note on, the reveal plays the card's own note, which the microphone would take as the right note. Readings are ignored until the tone ends, plus the 500 ms hold-off, before the retry listens.
- **Right the first time.** A card played right before its reveal reveals as correct and moves on by itself after the advance delay, with auto-advance off too, so the player's hands stay on the ocarina. It never deals before the reveal's tone has ended, so the [sound sum rule](../../architecture/modules/settings.md) still needs auto-advance on and is unchanged.
- **Settings.** The auto-advance checkbox gets a note while judging is on: "Off: keep playing a missed note until it is right" (*default*).
- Opening Settings, hiding the page or turning judging off during a retry stops the flow as it does today.

## Out of scope

- A tempo remembered per tune, a free-typed tempo, or steps other than 5.
- Changing the tempo during a run.
- Retry in Song mode, which already waits in Single note, or with auto-advance on.
- Counting a retry's tries, or grading a retry as anything but a miss.

## Modules touched

- **app (`App.tsx`, the song overlay and lanes):** whatever survives a song change is cleared (S01).
- **app (`header-text.ts`, `App.tsx`, `app.css`):** the tempo list and its entries, the chosen tempo passed to the timed, Single note and playback flows in place of the song's, and the reset on a tune or text change (S02). The entries are a pure function of the song: its tempo, its shortest note and `MIN_GRADED_MS` from [coverage](../../architecture/modules/coverage.md).
- **settings (`src/core/settings`):** `songTempo`, the chosen tempo or `null` for the tune's own (S02).
- **app (`card-flow.ts`, `Card.tsx`, `judge-text.ts`, `Settings.tsx`):** the retry state, listening after the reveal once the tone has ended, the verdict text, the moving on after a correct first try with auto-advance off, and the auto-advance note (S03).

The drill engine, judge, coverage, song core and abc adapter are unchanged. The core already takes the tempo as an input, so a chosen tempo needs no change there.

## Data

- **Settings:** `songTempo: number | null`, default `null` (the tune's own tempo). It is checked in core as `null` or a positive finite number; anything else resets alone. Whether it is in the current tune's list is the app's job, since settings never parses ABC. `data/settings/defaults.json` gains `"songTempo": null`, and [data formats](../../architecture/data-formats.md) records it.
- **Old data:** a missing `songTempo` is `null`.
- No new progress data. Retry only grades a miss, as today.

## Risks and open questions

- **What survives a song change.** S01 must find it first. A test that reproduces it comes before the fix.
- **The tone and the retry.** The room tail after a reveal's tone can last longer than the hold-off in a live room. If the retry hears the tone as the right note, tune the wait live, as the hold-off was.
- **Header width.** Title, tune list, tempo list and Play song on one line is tight on a phone. The design keeps the line from scrolling sideways, but how it looks on a phone is a later follow-up.

## Stories

In build order (written 2026-11-28). Each story is visible or testable on its own.

- [F18-S01: A song change clears the last run](stories/F18-S01-song-change-clears.md)
- [F18-S02: Chosen tempo](stories/F18-S02-chosen-tempo.md)
- [F18-S03: Retry after the reveal](stories/F18-S03-retry-after-reveal.md)
