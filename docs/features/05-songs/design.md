# F05: Songs as note order

- **Status:** designed
- **Vision source:** `../../vision/vision.md#feature-order`

## Goal

The player pastes one tune in ABC notation into the settings, and the drill shows its notes in order, one card each, looping at the end. Everything else about a card (reveal delay, reveal, tone, microphone judging, auto-advance) works as it does for random cards.

## Behavior

**Song settings** (a "Song" section of the settings view, see [F03-S01](../03-play-the-note/stories/F03-S01-settings-sections.md); saved with the others)
- A text box for the tune in ABC notation, a short line of help, and a link to the online ABC editor `https://editor.drawthedots.com/` for writing and checking a tune with a staff and playback. The app itself draws nothing of the song.
- A validator reads the text as it is edited and reports in plain words: either what it accepted (for example "21 notes, 2 flats converted to sharps") or a list of problems, each with its line and note number so the tune can be fixed in the editor.
- Only a text that passes is applied and saved. While the box holds a text that fails, the problems show and the last good song stays saved. Clearing the box removes the song.
- **Use song:** a toggle, default off. It is disabled while no valid song is saved. Off, the drill is the random pool as in F01.
- With "use song" on, the note range and include-sharps settings do not apply; the view says so and shows them disabled.

**What the validator accepts**
- One tune with one voice. Pitches are read in written pitch: middle C (`C`) is C4, as on the staff ([ADR 0003](../../architecture/decisions/0003-written-pitch-and-transposition.md)); no transposition is applied.
- Key signature, meter and note lengths are read so the pitches are right. Lengths and meter are then not used.
- Accidentals follow ABC rules: the key signature, and an accidental carried to later notes of the same pitch in its bar.
- Repeat signs and first and second endings are played out as written.
- Rests, ties, slurs, dynamics, chord symbols, lyrics and decorations are ignored.
- Rejected, with a message that names where: chords, a second voice, grace notes, more than one tune, no notes, a note outside the instrument's written range (A3 to F5 for the alto C, each offender listed), a song over the length limit.
- **Flats become sharps:** B♭ is A♯ and so on, because the app spells in sharps only. E♯ and B♯ (which the app has no name for) become F and C. The validator counts the conversions and says so. Songs written with flats therefore show sharps on the staff and in the reveal.
- A length limit (about 500 notes and 10,000 characters) keeps the saved settings small.

**Playing a song**
- With "use song" on, the first card is the song's first note; each next card is the next note, in the same card flow as before. Repeated notes are shown again; the "never the same pitch twice" rule of random cards does not apply.
- After the last note the song starts over.
- The position is not saved. Page load, and closing the settings view, start again from the first note.
- Judging, the tone, delays, auto-advance and the reveal are unchanged.

**Edge cases**
- Saved settings whose song text no longer passes (a hand-edited store, or a later change to the rules) turn "use song" off and keep the text visible with its problems.
- The instrument's range at the time of validation is the only range check. A song that fits the alto C is not checked against other instruments.
- Pasted text with Windows line endings, tabs or a trailing blank line is accepted.

## Out of scope

- Visualizing, playing or editing the song in the app (use the linked editor).
- A list of songs, names, a bundled example, sharing or import from files and URLs.
- Rhythm in the drill, wait mode (feature 7) and timed play-along (feature 8). The durations are read but unused.
- MusicXML, other formats, and transposing a song into range.
- Flat spelling on the staff and reveal; a possible later feature.
- Multi-voice, chords and grace notes.

## Modules touched

- `src/core/song` (new): the `Song` type (a list of pitches) and the range check; pure.
- `src/core/drill`: a song-based choice of the next pitch (the pitch after the previous one, looping), alongside `drawPitch`. Still only pitches.
- `src/core/settings`: the song text, "use song", and their validation.
- An ABC adapter outside `src/core` (location decided in the breakdown; `src/core` may not import a library) that turns ABC text into a `Song` or a list of problems using abcjs.
- `src/app`: settings view, validator messages, card flow takes a song source.
- ADR for the abcjs dependency and the supported ABC subset.
- `package.json`: abcjs, agreed 2026-11-07, recorded in the ADR.

The tone player, the judge and the staff are untouched.

## Data

New settings `useSong` (default off) and `songAbc` (default empty text), in the defaults file and under the same `localStorage` key. Settings saved earlier get the defaults. A song is stored as the player's ABC text; it is parsed again on load.

## Risks and open questions

- **abcjs in a non-browser environment.** The parser may touch browser globals or bring in rendering code; tests run in Node. The spike-sized check is the first acceptance criterion of S02; if abcjs cannot run there, stop and tell the user.
- **Accidental rules.** Applying the key signature and bar-carried accidentals correctly is the part most likely to be wrong. S02 tests it against known tunes written out by hand.
- **Flats shown as sharps** may look strange to players who read flats. A flat-spelling feature touches pitch, staff and reveal and is not part of this one.
- **Bundle size.** abcjs is larger than the rest of the app together; check the built size and precache cost in S02 and report it.
- **Which tunes fit.** The 12-hole alto C spans only A3 to F5, so many tunes will be rejected for range. A transposing option may be wanted later.

## Stories

- F05-S01: Song type and song order in the drill
- F05-S02: ABC to song
- F05-S03: Song settings and validator
- F05-S04: Cards follow the song

Story files are in [`stories/`](stories/).
