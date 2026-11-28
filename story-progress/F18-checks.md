# F18 checks by hand

Done once, at Closing, after all three stories are built. Run with `make dev` in Firefox on Linux (Chrome too if it is installed). Everything to play uses easy, slow notes.

Set up first: in Settings, paste a tune book of two short tunes at different tempos (for example tune 1 at `Q:70`, tune 2 at `Q:100` with a few eighth notes). Turn on Judge my playing.

## S01: a song change clears the last run

1. Song mode, Tempo, Scoring live. Play tune 1 through roughly; it does not need to be good. At the summary you should see filled lanes, marks, the summary, analysis and maybe a shaded spot. Choose tune 2 in the header list. **Expect:** empty grey lanes, no fill, marks, playhead line, summary, analysis or shading, and the start prompt.
2. The same with Scoring after the song (the overrun lane shows if you keep playing a little past the end), then choose tune 2. **Expect:** no lanes from the run, no overrun lane, and the start prompt.
3. Single note: play a note or two so a message, trace or fingering shows, then choose tune 2. **Expect:** none of them, and the head on tune 2's first note.
4. Repeat 1 to 3, but instead of choosing tune 2, open Settings, change a note in the text (or Load from file…) and close. **Expect:** the same clean start.
5. After a finished run, open the tune list and choose the tune already chosen. **Expect:** the summary and lanes stay.

## S02: chosen tempo

1. Song mode: the header shows a "Tempo" list where "♩ = N" was. Open it on tune 1 (`Q:70`). **Expect:** 35 to 105 in steps of 5, with "♩ = 70 (tune)" selected.
2. A tune with sixteenths at `Q:100`. **Expect:** the list stops at 115, with 100 marked.
3. Choose a slower tempo (for example ♩ = 50) in Tempo practice. **Expect:** the count-in clicks, the playhead and the metronome (turn it on) all follow 50, and a fresh start prompt. Play song plays at 50. Single note asks for a longer tone (hold a long note: it passes only when held for the slower length).
4. Reload. **Expect:** ♩ = 50 is still selected and used.
5. Choose tune 2, and separately edit the text in Settings. **Expect:** each time, the tune's own tempo is selected.
6. While a timed run counts in or plays, the list is greyed out. At the start prompt, the summary, in Single note and during Play song, it can be used. Choosing it during Play song stops the playback.
7. Flashcards, and Settings open: no tempo list.
8. DevTools responsive mode at 360x640 in Song mode with two tunes: the header does not scroll sideways, the tune list shrinks with an ellipsis, and the tempo list stays readable.
9. DevTools > Application > Local Storage: `fingerwise.settings` has `songTempo`, a number after a choice, and `null` after choosing the "(tune)" entry or changing tune.

## S03: retry after the reveal

Flashcards, Judge my playing on, auto-advance off. Narrow the range to a few easy notes if you like.

1. Settings > Cards: under the auto-advance checkbox, "Off: keep playing a missed note until it is right" shows while judging is on, and goes when judging is off.
2. Play a wrong note on a card. **Expect:** it reveals as Incorrect with the fingering, and stays. Play another wrong note: the verdict and graph change to it. Then play the right note: "Right, counted as a miss", and the next card comes after the advance delay.
3. Play nothing until the card reveals, then play it right. **Expect:** as in 2.
4. During a retry, tap. **Expect:** the next card at once.
5. Play a card right before its reveal. **Expect:** Correct, and the next card after the advance delay with no tap. With play note on and a long sound duration (longer than the advance delay), the next card waits for the tone to end.
6. Play note on: miss a card and let its tone play without playing yourself. **Expect:** the tone does not pass the card. If it does (the room tail outlasts the 500 ms hold-off), note it: the wait gets tuned live.
7. Smart sampling on: miss a card, retry it right, then check that it comes up often (its need moved towards 1 once, not twice).
8. Turn auto-advance on. **Expect:** cards behave as before F18. Turn judging off, or block the microphone. **Expect:** with auto-advance off a revealed card waits for a tap, as before.
9. During a retry, open Settings, or switch tabs and come back. **Expect:** the flow stops, and a fresh card on return.

## Review points

- Code: the `overlayRun` clear in `SongOverlay` must not blank Single note's tone trace. `withTempo` keeps the song's identity for the tune's own tempo, so the flow is not rebuilt for nothing. The card flow has only one timer pending (`cancelTimer`) apart from the sound timer.
- Stuck states: a retry whose window never opens (a tone that never ends: check `durationMs` is passed). A tempo list left greyed after a run is stopped by Settings.
- Layout seams: the header at 360 px with a long tune title, and at 1024x768.
- Tuning: the retry's wait after the tone (500 ms hold-off) in a live room, in check 6.
- Docs: the `app`, `settings` and data-formats docs match what was built. The `card-flow.test.ts` Tests bullet no longer lists F07 tests that do not exist.
