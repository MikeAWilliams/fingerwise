# F13-S02: The Play song button

- **Feature:** `../design.md`
- **Modules:** `src/app` (`App.tsx`, `header-text.ts`, a playback flow, `app.css`, text), `docs/architecture/`
- **Depends on:** F13-S01

## Story

As a player, I want a Play song button in the header that plays the tune with a count-in, so that I can hear how it goes before I play it myself.

## Acceptance criteria

Each item must be checkable and numbered so progress checklists can refer to it. Do not edit these once work starts; raise a change instead.
- **AC1:** Given use song on with a valid song, then the pinned header shows a "▶ Play song" button next to Settings, with keep tempo on or off, judging on or off, and either scoring choice. Given use song off, no valid song, or no Web Audio, it is not shown.
- **AC2:** Given the button is pressed, then one bar of count-in clicks plays, as for a timed run of the same tune, and then each note's tone plays at its sounding pitch on the F13-S01 schedule, at the tune's tempo (or ♩ = 90).
- **AC3:** Given keep tempo and metronome both on, then a click plays on every beat while the tune plays, as in a timed run. Otherwise there are no clicks after the count-in.
- **AC4:** Given playback, then the button reads "■ Stop", and pressing it stops every click and tone at once.
- **AC5:** Given the last note ends, or Stop is pressed, then the app returns to the song's beginning: with keep tempo on, the first note with the start prompt; with keep tempo off, the first song card.
- **AC6:** Given judging on, then the microphone is closed while the song plays and nothing is judged; afterwards it opens as it does after closing Settings.
- **AC7:** Given a timed run is counting in, playing, or listening past the end, then the button is greyed out and does nothing. Given the start prompt, a finished run's score, or untimed song practice, then it can be pressed.
- **AC8:** Given a finished run's score is shown, when the button is pressed, then the lanes, summary, tuning list and analysis are cleared, as starting a new run clears them.
- **AC9:** Given the button is pressed by click, tap or key, then that press does not also start a timed run or step a card.
- **AC10:** Given playback, then taps and key presses on the page other than the header buttons do nothing; opening Settings, changing a setting or hiding the page stops playback.
- **AC11:** Given playback with keep tempo off, then the header shows the tempo, as it does with keep tempo on.
- **AC12:** Given play note off, then the button still plays the song.
- **AC13:** Given the change, then `make verify` passes, and the `app` module doc describes the button and the playback flow.

## Notes

- This story leaves the screen as it is during playback; F13-S03 adds the lines of music, sounding note, playhead and following.
- The press is a gesture, so the audio unlock in the capture phase runs before it, as for the start tap.

## Test approach

Playback flow tests on a fake audio clock: count-in clicks, tones scheduled at the schedule's times, metronome clicks only when it applies, stop, the end returning to the start. App tests for when the button shows and is greyed out, and that its press does not start a run. By hand with `make dev`: play the example song in each mode, stop part-way, try to press it mid-run.
