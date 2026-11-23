# F09: Your checks

What you do by hand while F09 is built: when to do each check, what to play or look at, and where to write it down. `fw-execute` stops after committing each story from S03 on. Do that story's section here, then tell Claude the outcome so it can continue. S01 and S02 need nothing from you except one skim after S02.

This file is temporary like [`F09.md`](F09.md) and is deleted before the merge. Claude moves anything that should last, such as the latency figures you note, into the module docs first.

## How to record results

- **Here, in this file.** Tick each box you've checked. Under each section, fill in the `Observed:` line, even if it's only "all fine". When something is wrong, say what you did and what you saw.
- **Screenshots** of anything that looks wrong go in `samples/f09/` (untracked), named `<story>-<what>.png`, for example `s06-red-on-held-note.png`.
- **Audio, only when a score looks wrong.** If you can, record the same take in Audacity while the app listens (48000 Hz, mono, headset, no effects), and export it as `samples/f09/<story>-<what>.wav`. Claude can then run it through the scoring code and see what the app saw. You never need to record a take that went fine.

## Setup (once)

- Desktop: `make dev`, then open http://localhost:5173/fingerwise/.
- Phone (Android, for the smoothness check in S06): the microphone needs a secure page, so use the USB bridge. Connect the phone with USB debugging on, run `adb reverse tcp:5173 tcp:5173`, and open http://localhost:5173/fingerwise/ in Chrome on the phone. If that isn't possible, write so under S06 and the phone check waits until the feature is deployed.
- Settings for every check: Use song, Keep tempo, Metronome on and Bars per line 2, with Judge my playing on unless a check says otherwise.
- **Check tune** (has a rest, a tie over a bar line and a tie over a line break). Paste it into the Song box when a check asks for it:

  ```
  X:1
  T:Check tune
  M:4/4
  L:1/4
  Q:70
  K:C
  C D E2- | E z F2- | F2 G2 | E2 D2 | C4 |]
  ```

- The **example song** is the default Mary Had a Little Lamb (♩ = 70). To get it back, clear the Song box.

All playing is the example song or the Check tune, at ♩ = 70, on notes C to G. Nothing has to be fast: Claude makes the fast and hard cases synthetically in the tests.

## After S02: coverage core

- [ ] Skim `tests/fixtures/audio/README.md`: each clip's description and note times look like what you played. No need to stop the run for this.

Observed:

## After S03: readings on the audio clock

There's no lane or live feedback yet; only the summary changes.

- [ ] In the browser console of each browser you have (Firefox, Chrome, and Chrome on the phone if set up), run `new AudioContext().outputLatency` and write the number down. Do it with the headset, and again with Bluetooth headphones if you have them.
- [ ] Play the example song as well as you can with the headset. The summary should read "N% covered" with a plausible N: high for a good take, not near 0.
- [ ] Play it again with the ocarina silent for the second half. N should drop to about half.
- [ ] If you have Bluetooth headphones, play it once with them. N should be about the same as with the headset.
- [ ] Untimed song cards and random cards behave as before.

outputLatency (browser, output, value):

Observed:

## After S04: lane under the staff

No playing needed. Paste the Check tune.

- [ ] In DevTools responsive mode at 360x640, 640x360, 768x1024 and 1024x768: a grey lane sits under each staff row, with a segment under every note and the rest, and nothing overlaps.
- [ ] There's no sideways scroll at any of those sizes.
- [ ] Start the song with judging off. When the rows change, the card doesn't jump in height.
- [ ] The tied E (bars 1 to 2) has one continuous segment, and the tied F (over the line break) has a segment on both rows.
- [ ] The note to play is black and the others grey, as before.

Observed:

## After S05: playhead

No playing needed. Judging can be off.

- [ ] Example song at ♩ = 70: the line runs through the count-in rests with the clicks, then reaches each note as its click sounds.
- [ ] Change `Q:` in the Song box to 120 and check the same at that speed.
- [ ] It jumps cleanly to the other row at each line end.
- [ ] It stops when the summary shows, and when you open Settings. A tap on the summary starts it again from the count-in.
- [ ] It runs the same with judging on and off.

Observed:

## After S06: live fill and readout

Example song unless stated. Play each take once.

- [ ] **Good take:** the trace is mostly green near the lane's middle, trailing a little behind the line. "Hearing E4 …" names what you play.
- [ ] **Sagging note:** on a long note (E2 or D2), let the breath ease off. The trace sinks and turns amber, then red.
- [ ] **Wrong fingering:** deliberately play G instead of the first E. That stretch is red and pinned to the lane's top edge, and the readout says "Hearing G4 …".
- [ ] **Held-over rest:** with the Check tune, keep playing the E into the rest in bar 2. The rest shows red where you sounded and green where you were silent.
- [ ] When the rows change, the row that leaves takes its fill with it, and the other row keeps its fill.
- [ ] With judging off there's no fill and no readout.
- [ ] **Phone:** the playhead and fill move smoothly, with no stutter.

Observed:

## After S07: fault marks

Example song at ♩ = 70. Each item is one take, playing badly on purpose in one place.

- [ ] **Late:** wait about half a beat before one note. A late mark appears at that note's start.
- [ ] **Short:** stop one long note (E2) halfway. An early-end mark appears at its end.
- [ ] **Held over:** keep playing one note well into the next before changing. Marks appear at the first note's end and the next note's start.
- [ ] **Not separated:** play "E E E2" (bar 2) in one breath without tonguing. Not-separated marks appear between the Es.
- [ ] At 360x640 (or on the phone) the marks are readable and don't hide the middle of the trace.

Observed:

## After S08: the summary

- [ ] After a real take of the example song, the summary shows coverage, in tune, the timing figures and separation, and the tuning line when a note was off.
- [ ] It wraps without sideways scroll at 360x640 and looks right at 1024x768.
- [ ] With a screen reader (Orca on Linux), the summary and tuning line are read as text.
- [ ] A tap restarts from the count-in, with the lane, fill and marks cleared.
- [ ] With judging off it says "End of song".

Observed:

## Before acceptance (optional, from the design's risks)

Not required by any story. These are the numbers the design says to tune, so they're worth doing once everything works.

- [ ] Constants: say anything that felt off, such as too much red at the start of notes or gaps not seen. Claude will adjust the constants in the code.
- [ ] Ocarina against a tuner: does it read in tune when played normally? Write the offset down.
- [ ] Android latency: when you're ready, ask Claude to set up the key-tap measurement on the phone.

Observed:
