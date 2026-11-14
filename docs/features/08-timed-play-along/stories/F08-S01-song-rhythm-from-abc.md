# F08-S01: Song rhythm from ABC

- **Feature:** `../design.md`
- **Modules:** `src/core/song`, `src/abc`, `src/app`, `docs/architecture/`
- **Depends on:** none

## Story

As a player who pastes a tune, I want the app to keep its note lengths, tempo and meter, so that the song can later be played in time.

## Acceptance criteria

Each item must be checkable and numbered so progress checklists can refer to it. Do not edit these once work starts; raise a change instead.
- **AC1:** Given a song in `src/core/song`, then each note has a written pitch and a length in quarter-note beats, and the song has a tempo in quarter notes per minute or none, and a meter, as [ADR 0008](../../../architecture/decisions/0008-songs-keep-rhythm.md) records.
- **AC2:** Given a song and a fallback tempo, when its slots are computed by a pure core function, then each note's slot in ms runs from its start to the next note's start at the song's tempo (or the fallback when it has none), and the last note's slot is its own length. A rest's time therefore goes to the note before it.
- **AC3:** Given a meter, when the count-in is computed by a pure core function, then it gives the beats per bar and the beat length at a tempo: the top number of beats of the bottom note value for simple meters (3/4 is three quarter beats, 2/2 two half beats), and dotted beats for 6/8, 9/8 and 12/8 (2, 3, 4).
- **AC4:** Given ABC with quarter, eighth, half, dotted notes, ties, triplets, rests (also before the first note) and repeats with endings, when the abc adapter reads it, then the pitches are as in F05, each note's beats match the written lengths with ties joined and triplets as written, rests before the first note are dropped, and other rests extend the slot of the note before them.
- **AC5:** Given `Q:1/4=120`, `Q:3/8=60` and `Q:1/2=60`, then the song's tempo is 120, 90 and 120 quarter notes per minute. Given no `Q:`, then the song has no tempo, the tune is still valid, and the Song section notes "No tempo in the tune, using ♩ = 90".
- **AC6:** Given no `M:`, `M:none`, `M:C` or `M:C|`, then the meter is 4/4, 4/4, 4/4 and 2/2.
- **AC7:** Given a second `Q:` or `M:` later in the tune, then the first is used, the later one is ignored, and no problem is reported.
- **AC8:** Given use song on with keep tempo not built or off, then song cards behave exactly as after F07; the new fields are not used.
- **AC9:** Given the change, then `src/core/song` still imports only `../pitch` and `../instrument` and knows nothing of ABC, and the fallback tempo (90) and meter (4/4) are named constants.
- **AC10:** Given the change, then `make verify` passes, and `song.md`, `abc.md` and the glossary's "Song" entry describe the new shape.

## Notes

- Read starts and lengths from the abcjs audio sequence, as the pitches are ([ADR 0006](../../../architecture/decisions/0006-abcjs-for-songs.md)); `Q:` presence and `M:` come from the parse tree. Confirm the sequence's start and duration fields in the adapter tests, since this is undocumented API.
- Slots use starts, not lengths, so rests need no special case beyond the first note.

## Test approach

Core unit tests for the slot and count-in functions (rests, the last note, fallback tempo, simple and compound meters, cut time). Adapter tests for each AC4–AC7 case with lengths and tempo written out. The existing song and card-flow tests still pass. By hand: paste a tune without `Q:` and see the note.
