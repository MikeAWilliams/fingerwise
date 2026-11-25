# F16-S01: Mode first in Settings

- **Feature:** `../design.md`
- **Modules:** `src/core/settings`, `data/settings/defaults.json`, `src/app` (`Settings.tsx`, `settings-form.ts`, `section.ts`, `song-form.ts`, `App.tsx`, `header-text.ts`), `docs/architecture/`
- **Depends on:** none

## Story

As a player, I want to choose flashcards or song first and see only that mode's settings, so that I can tell what each setting will change.

## Acceptance criteria

Each item must be checkable and numbered so progress checklists can refer to it. Do not edit these once work starts; raise a change instead.
- **AC1:** Given Settings is open, then its first control is **Mode**, a native drop-down list offering Flashcards and Song, showing the saved mode.
- **AC2:** Given mode Flashcards, then Settings shows the Cards section (lowest note, highest note, include sharps, reveal delay, auto-advance, advance delay, use smart sampling, reset progress), the Sound section (play note, sound delay, sound duration) and the Microphone section, and nothing about songs. No control is greyed out because of a song, and the "song in use" note is gone. Smart sampling is still greyed out with judging off.
- **AC3:** Given mode Song, then Settings shows the Song section (the ABC box, its help line, problems or accepted line and no-tempo note, all as today, then bars per line), a Practice section and the Microphone section. The Cards and Sound sections are not shown. There is no use song checkbox and no keep tempo checkbox.
- **AC4:** Given mode Song, then the Practice section holds a native drop-down list offering Single note and Tempo. With Tempo chosen, it shows metronome and scoring, and not Single note's settings. With Single note chosen, it shows fingering delay and advance delay in seconds (0.5 to 30, step 0.5), and not metronome or scoring.
- **AC5:** Given Single note is chosen and Judge my playing is on, then its advance delay is greyed out with the line "Used with the microphone off". With judging off, it can be changed.
- **AC6:** Given the Microphone section, then it is the same in both modes: Judge my playing, its help line, the unavailable notice when it applies, and the tolerance.
- **AC7:** Given any settings changed while hidden by the other mode or practice, when the player switches mode or practice and back, then their values are kept. Each value survives a reload.
- **AC8:** Given Settings opens, then the chosen mode's first section is open.
- **AC9:** Given mode Flashcards, when Settings closes, then cards are drawn at random from the range (uniformly, or by need with smart sampling), whatever song is saved. The header shows only the name and Settings: no title, tune list, tempo or Play song.
- **AC10:** Given mode Song with Tempo, when Settings closes, then the app behaves exactly as with use song and keep tempo on before this story: the whole song, the start prompt, count-in, playhead, metronome, scoring and Play song, with the title or tune list and the tempo in the header.
- **AC11:** Given mode Song with Single note, when Settings closes, then the app behaves as untimed song practice did before this story (one note at a time, waiting, hint and skip). This is temporary: [F16-S02](F16-S02-single-note-view.md) replaces it.
- **AC12:** Given mode Song and a song text that fails, then the mode and practice are unchanged, and the last song that passed stays in use when Settings closes.
- **AC13:** Given stored settings saved before this story, when the app loads, then use song off loads as Flashcards, use song on with keep tempo off loads as Song with Single note, and use song on with keep tempo on loads as Song with Tempo. Every other stored value is kept. Stored data with neither field loads as Flashcards with Single note.
- **AC14:** Given no stored settings, then the defaults are mode Flashcards, practice Single note, fingering delay 3 s and advance delay 3 s. A stored mode, practice or delay that is missing or invalid resets alone to its default, and the strict defaults parse rejects a defaults file with any of them missing or invalid.
- **AC15:** Given the change, then `make verify` passes, and the `settings` and `app` module docs and `data-formats.md` describe the mode, the practice, the two delays, how old data maps, and the Settings layout by mode.

## Notes

- Field names and their stored form are left to the breakdown. `useSong` and `keepTempo` are read only to map old data (AC13) and are no longer written.
- The "applies" helpers follow the mode and practice: smart sampling no longer checks a song. Metronome, scoring after the song and the old keep tempo test become Tempo's.
- AC11 keeps the old card working only so the app is usable between stories. Do not polish it.
- The sound sum rule is unchanged and belongs to Flashcards.
- Single note's two delays exist and are saved in this story, but nothing uses them until F16-S02.

## Test approach

Settings core tests for the new fields: defaults, strict parse, bad values resetting alone, old data mapping (AC13) and the round trip. Settings form and view tests for which sections and controls show by mode and practice, and for the greyed-out advance delay. By hand with `make dev`: switch modes and practices, check the header in each, reload with old stored settings from each of the three cases, and check a failing song text keeps the mode.
