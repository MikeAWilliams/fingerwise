# F16-S02: Single note view, with the microphone off

- **Feature:** `../design.md`
- **Modules:** `src/app` (`App.tsx`, `card-flow.ts`, `Card.tsx`, the song staff and lane drawing, `follow.ts`, `app.css`), `src/core/drill`, `docs/architecture/`
- **Depends on:** F16-S01

## Story

As a player, I want to work through the whole song one note at a time with no clock, seeing each fingering on the staff, so that I can learn a tune's fingerings at my own pace.

## Acceptance criteria

Each item must be checkable and numbered so progress checklists can refer to it. Do not edit these once work starts; raise a change instead.
- **AC1:** Given mode Song with Single note, when the drill is shown, then the whole song is drawn as in Tempo (every line, with its score lane, at the bars per line setting) and the play head is on the first note at once, with no start prompt, count-in or metronome.
- **AC2:** Given Single note, then the play head stays on the current note and does not move with time. The current note is black and every other note, rest and tie is grey. The current note's lane segment is as wide as its written length at the tune's tempo.
- **AC3:** Given Single note, then every line has a fingering strip under its score lane, whether or not a fingering shows. Showing or hiding a fingering, or the head moving to another line, moves nothing on the page. Tempo has no strip.
- **AC4:** Given Single note with judging off, when the fingering delay runs out, then the current note's letter and tablature show in the strip under it. When the advance delay then runs out, the head moves to the next note and the fingering is hidden.
- **AC5:** Given Single note with judging off, when the player taps (click, tap or key) while no fingering shows, then the fingering shows at once. When they tap while it shows, then the head moves to the next note at once.
- **AC6:** Given the next note is after a rest, when the head moves on, then it goes to that note: rests are passed over. A tied note is one note, its segment as long as the tied total.
- **AC7:** Given the head moves to a note on another line, then the page follows to that line as in Tempo. Manual scrolling is not locked at any time in Single note.
- **AC8:** Given the last note, when the head would move on, then the pinned bar reads "End of song", and a tap starts again from the first note. There is no score or summary.
- **AC9:** Given Single note, then no tone is ever played, except by Play song.
- **AC10:** Given Single note with judging on, then it behaves as in AC4 to AC9 until [F16-S03](F16-S03-single-note-listening.md) is built, whether or not the microphone stream runs.
- **AC11:** Given opening Settings, hiding the page, choosing a tune, or Play song, then Single note practice stops. Coming back (closing Settings, showing the page, a new tune, or the end of playback) starts at the first note. The tune list and Play song can be used at any time in Single note.
- **AC12:** Given Single note, then nothing feeds smart sampling or progress.
- **AC13:** Given the change, then the one-note song card (waiting, hint and skip) is gone from the flashcard flow, `nextInOrder` is removed from the drill engine, no flashcard follows a song's order, and Flashcards behave as before.
- **AC14:** Given the change, then `make verify` passes, and the `app` and `drill` module docs describe the Single note view and flow and the removal of song cards.

## Notes

- The fingering is the note letter and tablature, as on a revealed flashcard, drawn under the current note. At 3 or 4 bars per line it may hang over its neighbours' space; that is a live-check risk, not a failure.
- The strip's height is fixed for the view, so F10's following and line positions are computed once, as today.
- Rests before the first note are already dropped from the song ([ADR 0008](../../../architecture/decisions/0008-songs-keep-rhythm.md)).

## Test approach

Flow tests with a fake clock for the fingering and advance delays, taps, passing over rests, the end of the song and restarting. View tests that the strip is present on every line in Single note and absent in Tempo, and that the fingering appears under the current note. Drill tests updated for the removed `nextInOrder`. By hand with `make dev`: the example song with judging off, a tune with rests and ties, 1 and 4 bars per line, and a song long enough to follow onto a new line.
