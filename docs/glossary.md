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
| **Sound duration**             | Seconds the tone plays. 0.5 to 30, default 1.5. While play note and auto-advance are both on, sound delay + sound duration must be at most the advance delay. |
| **Judge**                      | Listening to the microphone before the reveal, deciding what pitch was played and grading the card ([F04](features/04-record-and-judge/design.md)). |
| **Listening window**           | The part of a card's life when the judge uses microphone readings: from the card's appearance until its reveal. The microphone stream itself stays open across cards while drilling. |
| **Verdict**                    | The judge's result for a card: correct, incorrect, or none (nothing heard).                      |
| **Tolerance**                  | How many cents from the expected pitch a played tone may be and still be correct. A setting.     |
| **Settle time**                | How long a detected pitch must stay clear, loud enough and steady before it counts as a played tone. 200 ms, from the [F04 spike](research/pitch-detection-spike.md). |
| **Hold-off**                   | A short time at the start of each listening window when readings are ignored, so the room tail of the previous tone is not judged. 500 ms from the card's appearance. |
| **Cents**                      | A hundredth of a semitone, the unit for how far a tone is from a note.                           |
| **Song**                       | One tune, an ordered list of notes (written pitch, start and length in quarter-note beats) with its tempo and meter, read from the player's ABC text ([F05](features/05-songs/design.md), [ADR 0008](architecture/decisions/0008-songs-keep-rhythm.md)). |
| **Use song**                   | A setting: cards follow the saved song in order instead of the random pool. Default off; disabled with no valid song. |
| **Example song**               | "Mary Had a Little Lamb", the song text in the defaults, so use song works without pasting a tune. An empty stored song text loads as it ([F07](features/07-song-practice/design.md)). |
| **Waiting**                    | A song card's state, with use song and judging on, until the correct note is played or the player skips. A wrong note does not end it ([F07](features/07-song-practice/design.md)). |
| **Hint**                       | The note letter and tablature shown on a waiting card after the reveal delay or a tap, while it keeps listening. Unlike the reveal, no tone plays and nothing advances. |
| **Skip**                       | A tap on a card showing the hint: the next song note is dealt at once, with no tone. |
| **Keep tempo**                 | A setting: with use song on, each song card lasts its note's length at the tune's tempo and the song moves on regardless; graded within the slot when judging is on ([F08](features/08-timed-play-along/design.md)). Default off. |
| **Tempo**                      | How fast a song is played, from its ABC `Q:` line; ♩ = 90 when it has none ([ADR 0008](architecture/decisions/0008-songs-keep-rhythm.md)). |
| **Slot**                       | With keep tempo, the time a song note's card is shown and listened to: from its start to the next note's start, so a rest's time goes to the note before it. |
| **Coverage**                   | In a timed song, the share of a note's written length filled with the correct pitch, or of a rest filled with silence, edges aside. The song's coverage is the mean over graded notes and rests ([ADR 0009](architecture/decisions/0009-timed-songs-scored-by-coverage.md)). |
| **Scoring lag**                | A fixed allowance for audio latency: each reading is placed on the song's timeline this long before it arrived ([F09](features/09-timed-scoring/design.md)). |
| **Edge grace**                 | A short time at each edge of a note or rest not counted in its coverage, for release tails and the previous pitch blurring through the analyser. |
| **Join**                       | Where one song note meets the next: **plain** (a silence is required, even at the same pitch) or **slurred** (no break, the pitch changes). A tie makes one note, so it has no join. |
| **Separation**                 | A detected gap, silent readings or a dip in level, at a plain join. |
| **Timing fault**               | A note that started late, started early, ended early or ended late, beyond a tolerance after the scoring lag. |
| **Playhead**                   | The vertical line moving through a timed song's staff at the time the player hears. |
| **Score lane**                 | The strip under each staff line where each note's and rest's segment fills with colour as it is played. |
| **Count-in**                   | One bar of clicks in the tune's meter before the first note of a timed song. |
| **Metronome**                  | A setting under keep tempo: a click on every beat while the song plays, not just the count-in. Default off. |
| **ABC notation**               | A plain-text format for tunes, used by tune books and online editors. Only its pitches are used. |
| **Pool**                       | The set of pitches a card can be drawn from: the naturals between the low and high bounds, plus the sharps between them if sharps are included. |
| **Smart sampling**             | A setting: with judging on, random cards are drawn weighted by need instead of uniformly ([F06](features/06-smart-sampling/design.md)). Default off. |
| **Need**                       | A pitch's score from 0 to 1 for how much work it needs; 1 when never graded. Moved towards 1 by a miss and towards 0 by a correct answer ([ADR 0007](architecture/decisions/0007-smart-sampling-by-need.md)). |
| **Drill engine**               | The code that builds the pool and draws the next pitch. Knows only pitch and instrument definitions, never clef, staff, audio or UI. |
| **PWA**                        | Progressive Web App: a website that can be installed to the home screen and run offline ([ADR 0004](architecture/decisions/0004-pwa-with-vite-plugin-pwa.md)). |
| **Service worker**             | A script the browser keeps that serves cached files when there is no network. Exists only in the production build. |
| **Precache**                   | Storing every built file in the service worker's cache on first load so the app runs offline.   |
| **Story**                      | A small, testable unit of work with acceptance criteria.                                         |
| **ADR**                        | Architecture decision record: a short note recording a decision and why.                         |
