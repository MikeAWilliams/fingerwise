# F16-S03: Single note with the microphone on

- **Feature:** `../design.md`
- **Modules:** a pure Single note tone rule in `src/core` (module left to the breakdown), `src/app` (the Single note flow, `Card.tsx`, the lane drawing, the pinned bar), `docs/architecture/`
- **Depends on:** F16-S02

## Story

As a player, I want Single note to listen as I play, move on when I play the note right and long enough, and show me the fingering when I play the wrong note, so that I learn the fingerings of a tune without time pressure.

## Acceptance criteria

Each item must be checkable and numbered so progress checklists can refer to it. Do not edit these once work starts; raise a change instead.
- **AC1:** Given Single note with judging on and the microphone stream running, then the current note listens from the moment it becomes current, with the hold-off as for flashcards.
- **AC2:** Given a tone starts, then a pitch trace starts at the left of the current note's segment and grows while it sounds, with the colours and heights of Tempo's lane: green in tune, amber the right note out of tune, red beyond ±50 cents. Its full width is the note's written length at the tune's tempo, and a tone held past it draws nothing more.
- **AC3:** Given a tone, then it ends on silence, not on a change of pitch. A sound shorter than the settle time is not a tone and draws nothing that stays.
- **AC4:** Given a tone ends and its time within the tolerance adds up to at least 75% of the note's written length at the tempo, then the head moves to the next note.
- **AC5:** Given a tone ends where most of its sounding time was within the tolerance but less than 75% of the written length, then the segment clears and the pinned bar says "Play the note's whole value". No fingering shows and nothing is marked. The note keeps listening, and the message stays until the next tone starts.
- **AC6:** Given a tone ends where most of its sounding time was outside the tolerance, then the fingering shows in the strip, the segment clears and the note keeps listening. The fingering stays until the head moves on.
- **AC7:** Given the note has not passed when the fingering delay runs out, then the fingering shows and the note keeps listening. The advance delay plays no part while listening.
- **AC8:** Given judging on, when the player taps while no fingering shows, then it shows at once. When they tap while it shows, then the head moves to the next note.
- **AC9:** Given two notes in a row at the same pitch, then a tone held across both passes only the first; the player must stop for the next tone to count.
- **AC10:** Given a tone holds right longer than the note, then it passes when it ends, with no message about its length.
- **AC11:** Given the microphone stream is opening, locked or unavailable, then Single note behaves as with judging off (F16-S02), and the Microphone section shows the unavailable notice as today.
- **AC12:** Given judging on, then the pinned bar shows the legend. Apart from AC5's message, there is no verdict row or verdict text.
- **AC13:** Given the pure tone rule, then it takes the tone's readings, the expected pitch, the tolerance and the note's length in time, and returns passed, too short or wrong. It imports nothing from staff, audio or UI.
- **AC14:** Given the change, then `make verify` passes, and the `app` module doc and the doc of the module holding the tone rule describe listening in Single note, the tone's end, the 75% pass and the three outcomes.

## Notes

- How long a silence must last to end a tone is a code constant, tuned in the live check, so that a dropout of a reading or two inside a held note does not end it.
- The 75% share is a code constant too. A whole note at ♩ = 60 needs 3 s within tolerance; tune it if that proves too long.
- "Within the tolerance" is the flashcard judge's tolerance against the expected written pitch, as the flashcard grade uses. Coverage's nearest-note test is not used for the pass.
- The trace is drawn as Tempo's lane draws it, but its time axis starts at the tone's start, not at a clock.

## Test approach

Unit tests for the pure tone rule: a full correct tone, exactly 75%, just under, a short right tone, a mostly wrong tone, a scoop into the right note, out-of-tune right notes beyond the tolerance, and a silence dropout shorter than the end constant. Flow tests with fake readings and clock for each outcome, the fingering delay, taps and the fallback without a stream. By hand with `make dev` and an ocarina: the example song, holding short, holding long, a wrong fingering, and a repeated note.
