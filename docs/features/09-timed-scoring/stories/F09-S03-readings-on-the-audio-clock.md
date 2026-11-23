# F09-S03: Readings on the audio clock

- **Feature:** `../design.md`
- **Modules:** `src/audio`, `src/app`, `docs/architecture/`
- **Depends on:** F09-S02

## Story

As a player playing a song in time with judging on, I want what I play to be scored against the moment I heard it, so that audio delay does not count against me.

## Acceptance criteria

Each item must be checkable and numbered so progress checklists can refer to it. Do not edit these once work starts; raise a change instead.
- **AC1:** Given the listener is running, then each reading also carries the audio context's `currentTime` taken when the analyser is read. The page-time field and untimed use are unchanged.
- **AC2:** Given the listener is running, then it also produces a fine level envelope: the RMS of 128-sample blocks over the samples new since the last frame, each block timed on the audio clock. A frame gap longer than the analyser window leaves a hole, not invented values.
- **AC3:** Given a timed song starts, then the scoring lag is the input allowance (55 ms) plus the context's `outputLatency` read at that moment, or 100 ms when the browser does not report it. Both numbers are named constants.
- **AC4:** Given a timed song with judging on and the stream running, then readings and envelope blocks are placed in song time (audio time less the scoring lag less the song's start) and fed to the coverage core for the whole song, not per slot. The tone tracker is no longer used in timed songs.
- **AC5:** Given the song's last note, then the run ends one scoring lag after the last slot ends, and the summary shows then.
- **AC6:** Given the summary, then until F09-S08 it reads "N% covered" from the coverage core, or "End of song" when nothing was graded.
- **AC7:** Given a timed song, then note heads are black for the notes on show and grey for the rest; they are no longer coloured by result, and F08's per-slot verdict row no longer shows while playing.
- **AC8:** Given the stream is not running (`opening`, `locked`, `unavailable`), then the song plays in time with nothing scored, as in F08.
- **AC9:** Given untimed cards, untimed songs (F07) and random cards, then they behave exactly as before.
- **AC10:** Given the change, then `make verify` passes, and the `audio` and `app` module docs describe the audio-clock stamp, the envelope, the lag and coverage scoring in timed songs.

## Notes

- The analyser's newest sample and `currentTime` come from the same audio thread, so no clock conversion is needed (decided 2026-11-22).
- The envelope's cost per frame stays small: one pass over the new samples.
- Between this story and F09-S06 there is no live feedback while playing; that is expected mid-feature.

## Test approach

Listener tests with the fake context and analyser: the audio-clock stamp, envelope blocks over overlapping windows and over a dropped frame. Timed-flow tests with a fake audio clock and readings delayed by a known latency: a note played on time is fully covered once the lag is applied, the run ending one lag after the last slot, the fallback lag. By hand: play the example song and check the coverage figure is plausible, with the headset and with Bluetooth headphones if available.
