# F08: Timed play-along

- **Status:** designed
- **Vision source:** `../../vision/vision.md#feature-order`

## Goal

A song can be played in time. With a new **keep tempo** setting on, each song card lasts as long as its note does at the tune's tempo, so quarter notes and eighth notes come faster than whole notes, and the song moves on whether or not the note was played. With judging on, each note is graded on pitch within its own time, and the player gets a score at the end. It sits beside [F07](../07-song-practice/design.md): F07 is "practise until you get it", keep tempo is "play it under time pressure".

## Behavior

**When it applies**

- Keep tempo applies while use song is on with a valid song. With it off, songs behave as in F05 and F07.
- With judging off, the cards still change in time, with no verdicts and no score. With judging on but the microphone stream not running (`opening`, `locked`, `unavailable`), the song plays in time ungraded, as with judging off.
- While keep tempo applies, the reveal delay, auto-advance, the advance delay and play note do nothing for song cards, and F07's waiting, hint and skip do not happen. Random cards are unchanged.

**Tempo and slots**

- The tempo comes from the tune's `Q:` line. To play slower, the player edits it. There is no tempo setting.
- A tune with no `Q:` is played at a default of quarter note = 90 and is still valid. The Song section notes "No tempo in the tune, using ♩ = 90".
- Each note gets a **slot**: the time from its start to the next note's start at the tempo, using the written note lengths (ties joined, triplets as written, repeats played out as in F05). A rest's time therefore goes to the note before it: that card stays up longer, and nothing is drawn for the rest. Rests before the first note are skipped. The last note's slot is its own length.

**Count-in**

- A timed song starts with its first note on the staff and "Tap or press a key to start". The tap is the gesture that unlocks audio and, with judging on, opens the microphone, and it lets the player start when ready.
- After the start tap, and each time the song starts again, one bar of clicks plays before the first note. A bar is the tune's meter (`M:`): the top number of beats, except that 6/8, 9/8 and 12/8 count dotted beats (2, 3, 4). No meter, or free meter, counts 4 quarter beats. A pickup (anacrusis) starts after the full count-in bar.
- During the count-in the staff shows the first note, so the player can get ready. The microphone is not listened to until the first slot starts.

**Playing a slot**

- The card appears at the start of its slot and is replaced by the next card when the slot ends. Cards and clicks run from the audio clock, so they stay together.
- With judging on, the slot is the listening window. The [hold-off](../../glossary.md) is shorter than F04's 500 ms, because no tone is played (see Risks). A correct tone shows the F04 verdict (icon, "Correct", the judged note) at once, without the note letter, tablature or pitch graph, and the card keeps its place until the slot ends. A wrong tone shows "Incorrect" with the judged note, and the card keeps listening, so the player can still correct it within the slot. A later correct tone replaces it.
- When the slot ends, the note is **correct** if a correct tone was heard in it, otherwise **missed**. A missed note shows nothing extra on its way out.
- No tone plays during the song, because the microphone would hear it on the next note.
- A slot too short for the judge to hear a settled tone is shown but **not graded**: it counts neither way in the score. The threshold is provisional (see Risks).

**End of the song**

- After the last slot, a summary stays up: "14 of 20 correct", counting graded notes only. With judging off, or with no graded notes, it reads "End of song". A tap starts the song again from the count-in.

**Taps and interruptions**

- During the count-in and the song, a tap does nothing. The song cannot be skipped through by hand.
- Opening Settings, turning judging off or hiding the page stops the song as in F04. Showing the drill again shows the first note with the start prompt.

**Metronome** (last story, see Risks)

- A **metronome** setting, default off, enabled only with keep tempo. With it on, a quiet click plays on every beat of the song, not just the count-in, using the same beat as the count-in.

## Out of scope

- Timing judgment: onset detection, early or late verdicts, ±100–150 ms windows, latency calibration. A note is right if its pitch is heard anywhere in its slot.
- A tempo setting or slow-down control. The player edits `Q:`.
- Drawing rests, bars or several notes on the staff. One note per card as today.
- Tempo or meter changes within a tune (a second `Q:` or `M:`), and swing. The first `Q:` and `M:` hold for the whole tune, and later ones are accepted and ignored. Note lengths still follow the written notes, so a meter change alone plays correctly; only the clicks keep the first meter's beat.
- Storing scores, or feeding timed grades into [F06](../06-smart-sampling/design.md).
- Pausing.

## Modules touched

Durations and tempo are recorded in [ADR 0008](../../architecture/decisions/0008-songs-keep-rhythm.md).

- **song (`src/core/song`):** a song note gains its length in beats (quarter notes) and the song gains the tune's tempo (or none) and meter. A pure function turns a song and a tempo into slot lengths in ms, and the meter into count-in beats. It stays free of ABC.
- **abc (`src/abc`):** reads note starts and lengths from the same abcjs audio sequence it already reads pitches from, and `Q:` and `M:` from the parse tree; reports whether the tune had a tempo.
- **audio (`src/audio`):** a short click, scheduled at a time on the audio clock, and read access to that clock. The click must not be a pitched tone the judge could settle on.
- **settings (`src/core/settings`):** `keepTempo` and `metronome`, both booleans, both default false; metronome on requires keep tempo on.
- **app (`card-flow.ts`):** a timed mode: count-in, slots on the audio clock, per-slot listening and grading, the summary, taps ignored while playing.
- **app (`Card.tsx`, settings UI):** a verdict without a reveal, the summary, the two toggles in the Song section, the "No tempo in the tune" note.

The drill engine, judge, staff and tab modules are unchanged. The judge's hold-off is already a parameter.

## Data

- `data/settings/defaults.json`: `keepTempo: false`, `metronome: false`.
- Stored settings: the same two fields. Data saved before F08 gets both off.
- Default tempo (♩ = 90) and default meter (4/4) are code constants (ADR 0008), not settings.

## Risks and open questions

- **Short notes.** The judge needs 200 ms of steady pitch (settle time) after its hold-off. At ♩ = 90 an eighth note is 333 ms, so only a short hold-off leaves time to grade it. The timed hold-off and the "too short to grade" threshold are provisional (starting values: hold-off 0 ms, threshold 300 ms) and are set in the live check on a real ocarina.
- **Repeated notes.** With little or no hold-off, a note held from the previous slot is graded for the next one. For a repeated pitch that counts as correct without re-tonguing. That is accepted as lenient.
- **Microphone latency** (50–200 ms on Android) shortens the effective window at the end of each slot: a tone that settles just before the slot ends may be heard after it. A grace period after the slot is possible later if the live check shows false misses.
- **Metronome clicks breaking a held note.** A reading that fails the judge's checks clears its run. If a click in the microphone does that, short notes may never settle. The metronome is the last story so it can be dropped or reworked without affecting the rest. The count-in clicks come before any listening and carry no such risk.
- **Timer accuracy.** Card changes run from the page's timers, which can lag the audio clock by a frame or so. That is fine for display, and clicks are scheduled on the audio clock itself.
- **F07 dependency.** F07 is designed but not built. F08-S02 onwards builds on F07's card flow, so F08 is built after F07. If building F07 changes its behaviour, check these stories before F08's breakdown.

## Stories

- F08-S01: Song rhythm from ABC
- F08-S02: Keep tempo
- F08-S03: Grade within the slot
- F08-S04: Metronome
