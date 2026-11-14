# F08-S02: Keep tempo

- **Feature:** `../design.md`
- **Modules:** `src/core/settings`, `src/audio`, `src/app`, `data/settings`, `docs/architecture/`
- **Depends on:** F08-S01, F07 (built)

## Story

As a player who knows a tune's fingerings, I want the song cards to change on the beat at the tune's tempo, so that I practise reading and fingering under time pressure.

## Acceptance criteria

Each item must be checkable and numbered so progress checklists can refer to it. Do not edit these once work starts; raise a change instead.
- **AC1:** Given `data/settings/defaults.json`, then `keepTempo` is `false` and the strict defaults parse requires it. Given stored settings without it (saved before F08) or with a non-boolean, then it loads as `false` and every other setting is kept.
- **AC2:** Given the Song section, then a keep tempo toggle is shown, enabled only while use song is on; turning use song off disables it and keeps its value, and keep tempo does nothing while use song is off.
- **AC3:** Given use song and keep tempo on, when the drill is shown, then the first song note is on the staff with "Tap or press a key to start", and nothing else happens until a tap.
- **AC4:** Given the start prompt, when the player taps, then one bar of count-in clicks plays at the tune's tempo and meter (F08-S01), the first note stays on the staff, and the first slot starts at the end of that bar.
- **AC5:** Given a timed song, then each note's card appears at its slot's start and is replaced at its slot's end, with slot lengths from F08-S01; no letter, tablature or tone is shown or played, and the reveal delay, auto-advance, advance delay and play note settings have no effect.
- **AC6:** Given the count-in or a slot, when the player clicks, taps or presses a key, then nothing happens.
- **AC7:** Given the last slot ends, then the card shows "End of song" and stays; a tap starts the count-in again from the first note.
- **AC8:** Given a timed song, when Settings is opened, judging is changed or the page is hidden, then the song stops and its clicks stop; when the drill is shown again, the first note shows with the start prompt.
- **AC9:** Given the audio module, then a click can be scheduled at a time on the audio clock and the clock can be read; the click is a short, unpitched sound (not a sine tone the judge could settle on), and it follows the lock rule and never throws, as the tone does.
- **AC10:** Given a timed song, then card changes are timed from the audio clock, so they stay in step with the clicks over a whole tune (checked with a fake clock: no drift after 500 notes).
- **AC11:** Given keep tempo off, or use song off, then cards behave exactly as after F07, and random cards are unchanged in every case.
- **AC12:** Given the change, then `make verify` passes, and the `settings`, `audio` and `app` module docs and `data-formats.md` describe keep tempo.

## Notes

- Grading comes in F08-S03. Until then a timed song is not listened to even with judging on, and the summary always reads "End of song".
- With no audio context at all, the song still runs in time from the page clock, silently.
- The start tap is also the gesture that unlocks audio (and, in S03, opens the microphone).

## Test approach

Settings unit tests for the new field. Audio tests with the fake context: click scheduling, the lock rule, failures that never throw. Card-flow tests with a fake audio clock and fake timers: the start prompt, the count-in length for 4/4, 3/4 and 6/8, slot boundaries including a rest, taps ignored, the end and restart, stop and return, no drift over a long song, keep tempo off unchanged. By hand: play along with the example song and a jig.
