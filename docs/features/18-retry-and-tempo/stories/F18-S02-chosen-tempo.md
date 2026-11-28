# F18-S02: Chosen tempo

- **Feature:** `../design.md`
- **Modules:** `src/core/settings`, `src/app` (`header-text.ts`, `App.tsx`, `app.css`), `data/settings/defaults.json`, `docs/architecture/`
- **Depends on:** F18-S01

## Story

As a player, I want to choose the tempo from the header, so that I can practise a tune slower or faster without editing its text, and still see what tempo it was written at.

## Acceptance criteria

Each item must be checkable and numbered so progress checklists can refer to it. Do not edit these once work starts; raise a change instead.
- **AC1:** Given Song mode (either practice) with a song and Settings closed, then the header shows a list labelled "Tempo" in place of the "♩ = N" text. In Flashcards, with no song or with Settings open it is not shown.
- **AC2:** Given a tune at tempo T, then the list's entries are "♩ = N" for every multiple of 5 from half of T rounded up to a multiple of 5 (at least 30) to 1.5 × T rounded down, in order.
- **AC3:** Given a tune whose shortest note lasts B quarter notes, then no entry N above B × 60000 / 130 (the tempo where it lasts `MIN_GRADED_MS`) is listed, apart from the tune's own tempo.
- **AC4:** Given any tune, then its own tempo is an entry in its place in the order, labelled "♩ = N (tune)" with N rounded as the header rounds it, even when it is not a multiple of 5 or is past the cap of AC3. A tune with no `Q:` line has ♩ = 90 marked so.
- **AC5:** Given no tempo has been chosen, then the tune's own entry is selected.
- **AC6:** Given a tempo is chosen, then Tempo practice uses it for the count-in, playhead, metronome, scoring, release allowance and analysis, Single note uses it for the length a tone must last, and Play song plays at it.
- **AC7:** Given a tempo is chosen, then it is saved at once, playback stops, and a fresh flow starts at the first note with everything from the last run cleared, as in F18-S01.
- **AC8:** Given a chosen tempo, when the page is reloaded, then the same tempo is selected and used.
- **AC9:** Given a chosen tempo, when another tune is chosen, the song text is edited, or a file is loaded, then the tempo is the new tune's own.
- **AC10:** Given a saved tempo that is not an entry in the current tune's list, then the tune's own tempo is selected and used.
- **AC11:** Given a timed run is counting in or playing (`cardPhase` is `"playing"`), then the list is disabled and greyed out like the tune list. It is usable at the start prompt, the summary, in Single note and during playback.
- **AC12:** Given settings stored before this story (no `songTempo`) or a `songTempo` that is not `null` or a positive finite number, then it loads as `null`, and every other field is kept. `parseDefaults` requires `songTempo` to be `null` or a positive finite number, and the shipped defaults have `null`.
- **AC13:** Given a phone-width screen in Song mode with a tune list and the tempo list, then the header does not scroll sideways.
- **AC14:** Given the change, then `make verify` passes, and the `settings` and `app` module docs and data formats describe the chosen tempo, its entries and its reset.

## Notes

- The core takes the tempo as an input ([song](../../../architecture/modules/song.md), [coverage](../../../architecture/modules/coverage.md)), so the app passes the chosen tempo where it passed the song's. The song itself is not changed.
- Choosing a tempo follows the same path as choosing a tune (`chooseTune`, then `changeSettings`). The document click and keydown handlers already skip a target inside a `select`.
- The header label rounds (a `Q:3/8=40` tune shows ♩ = 60), but the value used is the tune's exact tempo.

## Test approach

Unit tests of the entries: a tune at 90 with eighths (45 to 135); a tune at 96 (96 marked between 95 and 100); a tune with sixteenths at 100 (capped at 115); a tune already past its cap (only its own entry above the cap); no `Q:` (90 marked); a `Q:3/8=40` tune; a slow tune near the 30 floor. Settings tests for `songTempo`: the default, the strict parse, old data, bad values resetting alone, the round trip. App tests for the reset on a tune change and on an edit, and for a saved tempo not in the list. By hand with `make dev`: choose a slower tempo and check the count-in, playhead, metronome and Play song all follow it; reload; change tune; and check a phone-width header.
