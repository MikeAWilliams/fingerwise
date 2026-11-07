# Glossary

Terms used across the docs. Add to this as the domain firms up.

| Term                           | Meaning                                                                                          |
| ------------------------------ | ------------------------------------------------------------------------------------------------ |
| **Pitch**                      | The internal note representation every layer converts to and from.                               |
| **Sounding pitch**             | The pitch that actually comes out of the instrument.                                             |
| **Written pitch**              | The pitch shown on the staff. The fingering table is keyed by it. Sounding pitch = written + transposition ([ADR 0003](architecture/decisions/0003-written-pitch-and-transposition.md)). |
| **Transposition**              | The semitone offset from written to sounding pitch. Required in every instrument definition; a future ocarina-key setting (C/F/G) would select it. |
| **Glyph**                      | The character in the tablature font that draws one fingering ([ADR 0002](architecture/decisions/0002-tablature-from-panzi-font.md)). |
| **Note range**                 | The lowest and highest written pitch the player has chosen to drill, with sharps included or excluded. |
| **Fingering**                  | The hole pattern (open/covered) that produces a pitch on an instrument.                          |
| **Tablature (tab)**            | A drawn diagram of a fingering.                                                                  |
| **Japanese / Taiwanese style** | The two common fingering systems for 12-hole ocarinas.                                           |
| **Instrument definition**      | A JSON data file describing an instrument (range, fingering table, transposition, default clef). |
| **Card**                       | One drill item: a pitch to be fingered.                                                          |
| **Reveal**                     | The step after the delay where the note letter and tablature are shown.                          |
| **Reveal delay**                  | Seconds between a card appearing and its automatic reveal. Set in settings, 0.5 to 30, default 3. Called "delay" in older docs. |
| **Auto-advance**               | Showing the next card on its own after the advance delay, with no click or key press. A setting, default on. |
| **Advance delay**              | Seconds between a reveal and the automatic next card when auto-advance is on. 0.5 to 30, default 3. |
| **Sound delay**                | Seconds from the reveal to the start of the tone. 0 to 30, default 0.5. |
| **Sound duration**             | Seconds the tone plays. 0.5 to 30, default 1.5. Sound delay + sound duration must be at most the advance delay. |
| **Judge**                      | Listening to the microphone before the reveal, deciding what pitch was played and grading the card ([F04](features/04-record-and-judge/design.md)). |
| **Verdict**                    | The judge's result for a card: correct, incorrect, or none (nothing heard).                      |
| **Tolerance**                  | How many cents from the expected pitch a played tone may be and still be correct. A setting.     |
| **Cents**                      | A hundredth of a semitone, the unit for how far a tone is from a note.                           |
| **Song**                       | One tune, an ordered list of written pitches, read from the player's ABC text ([F05](features/05-songs/design.md)). |
| **ABC notation**               | A plain-text format for tunes, used by tune books and online editors. Only its pitches are used. |
| **Pool**                       | The set of pitches a card can be drawn from: the naturals between the low and high bounds, plus the sharps between them if sharps are included. |
| **Drill engine**               | The code that builds the pool and draws the next pitch. Knows only pitch and instrument definitions, never clef, staff, audio or UI. |
| **PWA**                        | Progressive Web App: a website that can be installed to the home screen and run offline ([ADR 0004](architecture/decisions/0004-pwa-with-vite-plugin-pwa.md)). |
| **Service worker**             | A script the browser keeps that serves cached files when there is no network. Exists only in the production build. |
| **Precache**                   | Storing every built file in the service worker's cache on first load so the app runs offline.   |
| **Story**                      | A small, testable unit of work with acceptance criteria.                                         |
| **ADR**                        | Architecture decision record: a short note recording a decision and why.                         |
