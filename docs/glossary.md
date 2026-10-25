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
| **Story**                      | A small, testable unit of work with acceptance criteria.                                         |
| **ADR**                        | Architecture decision record: a short note recording a decision and why.                         |
