# F16: Setting clarification

- **Status:** done

> Shaped in dialog on 2026-11-25. The settings were grouped by what each control does, not by its net effect. The net effect is one of two modes, flashcards or song, so the mode becomes the first choice and each setting moves under the mode it affects. Songs no longer set the flashcard order. The one-note-at-a-time song practice that order gave is rebuilt inside song mode as **Single note**. The decision is recorded in [ADR 0012](../../architecture/decisions/0012-two-practice-modes.md).

## Goal

Settings open with one choice: **Flashcards** or **Song**. Below it are only the settings that matter for that mode. Flashcards are always random. Song mode always shows the whole song, as [F10](../10-scrolling-song-view/design.md) does, and offers two kinds of practice: **Tempo**, which is today's keep tempo, and **Single note**. Single note is a low-pressure practice with no timing. The play head waits on each note until the player plays it right, the lane shows their tone against the note's length, and the fingering is drawn on the staff when they need it.

## Behavior

**Settings: the mode first**

- The first control in Settings is **Mode**: Flashcards or Song (decided 2026-11-25). It is a native drop-down list, like Scoring (*default*).
- Only the chosen mode's sections are shown. The other mode's settings are hidden, not greyed, and keep their values (*default*).
- **Flashcards** shows the sections it has today, without the song parts (*default* to keep the current split):
  - **Cards:** lowest note, highest note, include sharps, reveal delay, auto-advance, advance delay, use smart sampling, reset progress.
  - **Sound:** play note, sound delay, sound duration, with the sound sum rule as today.
  - The "song in use" note and the range controls greyed out by a song go away, since a song never sets the cards now. Smart sampling still needs Judge my playing.
- **Song** shows:
  - **Song:** the ABC box exactly as today (decided 2026-11-25): the text, the help line, the problems or the accepted line, the no-tempo note. Below it is **bars per line**, which now applies to both kinds of practice, since both show the whole song.
  - **Practice:** a drop-down list, **Single note** or **Tempo** (decided 2026-11-25). It replaces the keep tempo checkbox. Under it are only the chosen practice's settings (*default*):
    - Single note: **fingering delay** and **advance delay** (its own two, decided 2026-11-25; see below). The advance delay is greyed out while Judge my playing is on, with the line "Used with the microphone off" (*default* wording).
    - Tempo: **metronome** and **scoring**, as today.
- **Microphone** is shown in both modes, unchanged: Judge my playing, its help line, the unavailable notice, and the tolerance (decided 2026-11-25). Turning judging off stays useful in Flashcards and in Tempo.
- The use song checkbox goes away. A failing song text can no longer turn anything off. The mode stays Song, and the last song that passed stays in use, as it is the one saved (*default*).
- Settings opens with the chosen mode's first section open (*default*), and the rest work as sections do today.
- Changing the mode or practice takes effect when Settings closes, like any other setting.

**Flashcard mode**

- Cards are random only, drawn from the range, with or without smart sampling, as with use song off today. A song never sets their order (decided 2026-11-25).
- Everything else is unchanged: reveal, sound, judging, auto-advance and progress.
- The header shows the name and Settings only. Without a song in use there is no title, tune list, tempo or Play song (*default*, as with use song off today).

**Song mode**

- Always the scrolling whole-song view of F10, in both practices (decided 2026-11-25). The one-note song card of [F05](../05-songs/design.md) and [F07](../07-song-practice/design.md) goes away.
- The header works as with use song on today: the title or the [tune list](../14-tune-choice/design.md), and Play song. The tempo is shown in both practices (*default*), since Single note draws each note's length at it.
- Song mode never plays a note except through Play song (decided 2026-11-25). Play note and its delays belong to Flashcards.
- **Tempo** is today's keep tempo, unchanged: count-in, moving playhead, metronome, live or after-the-song scoring, and play-along without scoring when judging is off.

**Single note practice: the view**

- The whole song is shown, with each line's score lane, as in Tempo. The play head stays on the **current note** and does not move with time: there is no count-in, no metronome and no clock (decided 2026-11-25). The current note is black and the rest are grey, as in Tempo.
- The current note's lane segment is as wide as its written length at the tune's tempo, as in Tempo.
- **Fingering strip:** in Single note, every line has an empty strip under its lane (decided 2026-11-25). When the fingering shows, the note letter and tablature appear in the strip under the current note. Every line keeps its strip whether or not anything is in it, so nothing moves when the fingering appears or the head changes line. Tempo is unchanged and has no strip.
- When the head moves to a new line, the page follows it as F10 does. Manual scrolling is not locked, since nothing is timed (*default*).
- The first note is current as soon as the view is shown. There is no start prompt (*default*).
- Rests are passed over: the head goes from a note to the next note. A tied note is one note, its length the tied total (*default*).

**Single note practice: with the microphone on**

Applies while judging is on and the microphone stream is running. No [hold-off](../../glossary.md) applies when a note becomes current, since no reference tone plays (decided 2026-11-25 at acceptance, [F16-S03](stories/F16-S03-single-note-listening.md) AC1: the hold-off threw away the start of a tone played straight after the last note). A tone still needs a silence since the note became current.

- **The trace follows the tone, not a clock** (decided 2026-11-25). When the player starts a tone, the pitch trace starts at the left of the current note's segment and grows while they play, with the lane's colours and heights as in Tempo: green in tune, amber the right note out of tune, red beyond ±50 cents. Holding too short leaves part of the segment empty. Holding past its end draws nothing more (*default*).
- **A tone ends on silence.** A change of pitch does not end it. A blip shorter than the [settle time](../../glossary.md) is not a tone (decided 2026-11-25).
- **When a tone ends** (decided 2026-11-25):
  1. **Passed:** the time within the [tolerance](../../glossary.md) adds up to at least **75% of the note's segment**, its written length at the tune's tempo less the [release](../../glossary.md) (changed 2026-11-25 at acceptance: 75% of the written length was the whole grey box, since the release is 25%, so filling the box only just passed and any reading lost at the start or a dip failed; [F16-S03](stories/F16-S03-single-note-listening.md) AC4). The head moves to the next note.
  2. **Right note, too short:** most of the tone's sounding time was within the tolerance, but it fell short of 75%. The segment clears and the pinned bar says "Play the note's whole value" (decided 2026-11-25, so the player knows why the head did not move). No fingering and no mark. The note waits for another try. The message stays until the next tone starts (*default*).
  3. **Wrong note:** most of the tone's sounding time was outside the tolerance. The fingering shows, the segment clears, and the note waits.
- Duration is part of the pass, but softly: the only message is the one above, when a right note was too short. Holding too long is never commented on.
- **Fingering delay:** when it runs out before a pass, the fingering shows anyway, and the note keeps waiting and listening. Once shown, the fingering stays until the head moves on.
- **Tap (click, tap or key):** a tap shows the fingering if it is not showing. A tap while it shows skips to the next note (*default*, as F07's hint and skip).
- Apart from the too-short message, there is no verdict row and no verdict text: the lane is the feedback (*default*). The pinned bar holds the legend.

**Single note practice: with the microphone off**

Applies while judging is off, and while the stream is not running (opening, locked or unavailable), as untimed songs fall back today (decided 2026-11-25).

- Nothing is judged and nothing is drawn in the lane. The segment still shows the note's length.
- After the **fingering delay** the fingering shows. After the **advance delay** the head moves to the next note.
- A tap shows the fingering if it is not showing, and otherwise moves to the next note.

**Single note practice: the end and stopping**

- After the last note, the pinned bar reads "End of song", and a tap starts again from the first note (*default*). There is no score and no summary.
- Opening Settings, hiding the page, choosing a tune or Play song stops the practice, as they stop untimed song practice today. Coming back starts at the first note (*default*).
- Nothing in Single note feeds smart sampling or progress, as song cards do not today (*default*).

**Settings carried over**

- Stored settings saved before this feature map as follows (decided 2026-11-25):
  - use song off → Flashcards
  - use song on, keep tempo off → Song, Single note
  - use song on, keep tempo on → Song, Tempo
- New defaults (*default*): mode Flashcards, practice Single note, fingering delay 3 s and advance delay 3 s, each 0.5 to 30 like the flashcard delays.
- Single note's delays start at the defaults, not at the player's flashcard values (*default*).
- The sound sum rule is unchanged and applies to Flashcards only.

## Out of scope

- Any way to draw flashcards from a song, in order or at random.
- Choosing the mode from the header.
- A score, summary, analysis or stored results for Single note.
- Messages about tuning, or about holding a note too long, in Single note. The lane shows both.
- The fingering strip in Tempo practice or during playback.
- A count-in or metronome in Single note.
- Phone fit for the taller Single note lines (song mode is desktop first; phones only need no sideways scroll).

## Modules touched

- **settings (`src/core/settings`, `data/settings/defaults.json`):** the mode, the practice and Single note's two delays as new fields. `useSong` and `keepTempo` go, with old stored data mapped as above. The "applies" helpers follow the mode and practice: smart sampling no longer checks a song, and metronome, scoring and keep tempo's test become Tempo's. Field names are left to the breakdown.
- **drill (`src/core/drill`):** `nextInOrder` has no caller left and goes (*default*). The pool and smart sampling are unchanged.
- **A pure rule for a Single note tone:** from a tone's readings, the tolerance, the expected pitch and the note's length at the tempo, it decides passed, too short or wrong. It knows pitch and timings only. Where it lives (judge, coverage or its own module) is left to the breakdown.
- **app (`Settings.tsx`, `settings-form.ts`, `section.ts`):** the mode first, sections by mode, the practice list and its settings.
- **app (`App.tsx`, `card-flow.ts`, `header-text.ts`):** the flow is chosen by mode and practice. Song cards, waiting, hint and skip leave the flashcard flow, and a Single note flow takes their place. The header follows the mode.
- **app (song view: `Card.tsx`, the staff and lane drawing, `follow.ts`):** a fixed play head, the tone-driven trace in the current segment, and the fingering strip under every line in Single note.
- **Docs:** glossary terms (mode, Flashcards, Song, Single note, Tempo practice, fingering delay, fingering strip). Use song, keep tempo, waiting, hint and skip are marked as replaced.

The audio, detector, abc, song core, coverage scoring of Tempo, analysis and playback are unchanged.

## Data

- New stored settings: the mode (Flashcards or Song), the practice (Single note or Tempo), Single note's fingering delay and advance delay.
- Removed: `useSong` and `keepTempo`, read once to map old data.
- `metronome`, `scoring`, `barsPerLine`, `songAbc` and `songTune` are unchanged.

## Risks and open questions

- **Where a tone ends.** Silence ends a tone, but a dropout of a reading or two inside a held note must not. How long a silence must last is tuned in the live check.
- **The 75% at slow tempos.** A whole note at ♩ = 60 needs about 2.6 s within tolerance. That may be long for a novice. The share is a code constant, tuned in the live check.
- **Fingering width at 3 or 4 bars per line.** Notes may sit closer together than the glyph is wide. Only one fingering shows at a time, so it cannot collide with another, but it may hang over its neighbours' space.
- **Height in Single note.** With the strip, fewer lines fit the screen. Accepted, since reading ahead does not matter without time pressure.
- **Repeated notes at the same pitch.** The player must stop between them for the tone to end. This is natural tonguing, but a slurred repeat held as one tone passes only the first note.

## Stories

In build order (written 2026-11-25). Each story is visible or testable on its own.

- [F16-S01: Mode first in Settings](stories/F16-S01-mode-first.md)
- [F16-S02: Single note view, with the microphone off](stories/F16-S02-single-note-view.md)
- [F16-S03: Single note with the microphone on](stories/F16-S03-single-note-listening.md)
