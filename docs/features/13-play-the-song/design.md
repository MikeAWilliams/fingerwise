# F13: Play the song

- **Status:** done

> Shaped in dialog on 2026-11-24. The user wanted a button that plays the song in song mode, whatever keep tempo and scoring are set to, so a tune can be heard before it is practised.

## Goal

With use song on, the player can press **Play song** and hear the tune: a count-in, then every note at the tune's tempo as a plain tone, while the music follows along on screen. It is for listening first, before playing the tune themselves. Nothing is listened to or scored while it plays.

## Behavior

**The button**

- A **Play song** button ("▶ Play song") in the [pinned header](../../glossary.md), next to Settings. It is shown whenever use song is on with a valid song: with keep tempo on or off, with judging on or off, and with either [scoring](../12-score-after-the-song/design.md) choice (decided 2026-11-24, over the start prompt area).
- While the song plays, the button reads "■ Stop". Pressing it stops playback at once.
- It is greyed out while a timed run is counting in, playing, or (with After the song) listening past the end, so a run cannot be lost by accident (decided 2026-11-24). It is usable on the start prompt, on a finished run's score, and at any time in untimed song practice.
- Pressing it is not also a start tap: the button's click or key press does not start a timed run or step a card.
- Without Web Audio the button is not shown (*default*). The press is itself the gesture that unlocks audio, so playback is heard on the first press.

**Pressing Play song**

- Whatever was on screen stops: an untimed card is left, the microphone is closed, and a finished run's score (lanes, summary, tuning list, analysis) is cleared, as starting a new run clears it (decided 2026-11-24).
- The [play note](../03-play-the-note/design.md) setting does not affect it (*default*): play note is about cards.

**What is heard**

- A count-in, always: one bar of clicks in the tune's meter, as a timed run's [count-in](../08-timed-play-along/design.md#behavior). Then the metronome's beat clicks when the metronome applies (keep tempo and metronome on), and none otherwise (decided 2026-11-24).
- Each note as a sine tone at its sounding pitch, at the tune's tempo (`Q:`, or ♩ = 90), with its written length: the same sound as [F03](../03-play-the-note/design.md), equal temperament, A4 = 440 Hz. Rests are silent.
- Joins are played as an ocarina player would tongue them (decided 2026-11-24): at a **plain** [join](../../glossary.md) each note ends a short gap (*default* 50 ms, less for a very short note) before the next note's start, so repeated notes sound separately; at a **slurred** join there is no gap; a tie is one held note. *The fixed gap is replaced by the release allowance in [F15](../15-release-allowance/design.md#playback).*
- Repeats play out, as in the song itself.

**What is seen**

- The tune's lines of music, as in [F10](../10-scrolling-song-view/design.md), in every mode, including untimed song practice, which otherwise shows one card at a time (decided 2026-11-24).
- The sounding note is black and the rest grey. A [playhead](../../glossary.md) moves through the music in time with the sound (decided 2026-11-24). There are no lanes, traces, marks, readout or legend.
- The page follows the song and scrolling is locked, as in a timed run.
- The [pinned bar](../../glossary.md) shows one quiet line, "Playing the song" (*default*).
- The header shows the tempo while playing, even with keep tempo off (*default*), since the tune is played at it.

**When playback ends**

- At the end of the last note, or on Stop, the clicks and tones stop and the app returns to the song's beginning in its own mode (decided 2026-11-24): with keep tempo on, the first note with the start prompt; with keep tempo off, the first song card, which opens the microphone again with judging on, as on closing Settings.
- During playback, taps and key presses on the music do nothing. Opening Settings or hiding the page stops playback, as it stops a run.

**Edge cases**

- A tune that starts with a pickup: the count-in is a full bar before it, as in a timed run.
- Changing a setting stops playback, as opening Settings does.
- Audio locked or failing mid-way: nothing is shown, as in F03; playback still ends at its time.

## Out of scope

- Playing along: hearing the tune while playing and being scored. The microphone would hear the playback ([F08](../08-timed-play-along/design.md#behavior) plays no tone during a song for the same reason).
- Tablature or note names during playback.
- A different speed for playback than the tune's tempo, pausing, or starting part-way through.
- Other sounds than the sine tone, a volume control, or sampled ocarina sounds.
- Playing back the player's own recording (see [F12](../12-score-after-the-song/design.md#out-of-scope)).
- Playback with use song off.

## Modules touched

- **song (`src/core/song`):** a pure function from a song and a tempo to the tones to play: each note's start and length in ms after the join gap. It reads the note's `slurred` flag. Still free of ABC, audio and UI.
- **audio (`src/audio`):** tones scheduled at a time on the audio clock, several in a row, and stopping all of them at once. Today the tone player plays one tone, starting now.
- **app (`App.tsx`, `header-text.ts`, `app.css`):** the Play song / Stop button in the header, shown and greyed out by the rules above, and the tempo shown while playing.
- **app (a playback flow, beside `timed-flow.ts`):** the count-in, the metronome, the tones and the sounding note on the audio clock; stop; the end.
- **app (`Card.tsx`, `SongOverlay.tsx`, `playhead.ts`, `follow.ts`, `scroll-lock.ts`):** the lines of music, playhead, following and scroll lock during playback, in either mode; the pinned bar's line.

The drill engine, judge, coverage, analysis and detector are unchanged. No ADR: playback adds sound, not a decision that changes the architecture, and nothing is stored or recorded.

## Data

None stored. The join gap is a code constant.

## Risks and open questions

- **The join gap.** 50 ms is a first guess; set it by ear in the hand check. A sixteenth at a fast tempo needs a smaller gap so the note is still heard.
- **Narrow headers.** The header already holds the name, title, tempo and Settings. A phone may need the button shortened to its icon. F10 targets desktop, and phones only need no sideways scroll.
- **Sine tones in a row.** Each note needs its own short fade in and out so the joins do not click; slurred notes cross with no gap and may need the next tone to start as the last fades.

## Stories

In build order (written 2026-11-24). Each story is visible or testable on its own.

- [F13-S01: The playback schedule](stories/F13-S01-playback-schedule.md)
- [F13-S02: The Play song button](stories/F13-S02-play-song-button.md)
- [F13-S03: Following the music](stories/F13-S03-following-the-music.md)
