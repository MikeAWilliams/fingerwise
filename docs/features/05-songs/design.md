# F05: Songs as note order

- **Status:** designed
- **Vision source:** `../../vision/vision.md#feature-order`

## Goal

The player pastes one tune in ABC notation into the settings, and the drill shows its notes in order, one card each, looping at the end. Everything else about a card (reveal delay, reveal, tone, microphone judging, auto-advance) works as it does for random cards.

## Behavior

**Song settings** (a "Song" section of the settings view, see [F03-S01](../03-play-the-note/stories/F03-S01-settings-sections.md); saved with the others)
- A text box for the tune in ABC notation, a short line of help, and a link to the online ABC editor `https://editor.drawthedots.com/` for writing and checking a tune with a staff and playback. The app itself draws nothing of the song.
- A validator reads the text as it is edited and reports in plain words: either what it accepted (for example "21 notes, 2 flats converted to sharps") or a list of problems, each with its line and note number so the tune can be fixed in the editor.
- Only a text that passes is applied and saved. While the box holds a text that fails, the problems show and the last good song stays saved. Closing the settings view drops a failing text: on reopening, the box shows the saved song. Tunes are expected to be fixed in the linked editor. Clearing the box removes the song.
- **Use song:** a toggle, default off. It is disabled while no valid song is saved. Off, the drill is the random pool as in F01.
- With "use song" on, the note range and include-sharps settings do not apply; the view says so and shows them disabled.

**What the validator accepts**
- One tune with one voice. Pitches are read in written pitch: middle C (`C`) is C4, as on the staff ([ADR 0003](../../architecture/decisions/0003-written-pitch-and-transposition.md)); no transposition is applied.
- Key signature, meter and note lengths are read so the pitches are right. Lengths and meter are then not used.
- Accidentals follow ABC rules: the key signature, and an accidental carried to later notes of the same pitch in its bar.
- Repeat signs and first and second endings are played out as written.
- A tie joins its notes into one: `B-B` is one card.
- Rests, slurs, dynamics, chord symbols, lyrics and decorations are ignored.
- Rejected, with a message that names where: chords, a second voice, grace notes, more than one tune, no notes, a note outside the instrument's written range (A3 to F5 for the alto C, each offender listed), a song over the length limit, and D.C., D.S., Fine, coda and segno marks (abcjs does not play them out; write the repeat out in the editor instead).
- Anything abcjs warns about is rejected with its line and column. abcjs reads almost any text as notes, so a warning is the only sign that the text is not the tune it looks like.
- **Flats become sharps:** B♭ is A♯ and so on, because the app spells in sharps only. E♯ and B♯ (which the app has no name for) become F and C, and double sharps and flats become their plain note. The validator counts the conversions and says so. Songs written with flats therefore show sharps on the staff and in the reveal.
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
- `src/core/drill`: an in-order choice of the next pitch from a plain pitch list (the pitch after the previous one, looping), alongside `drawPitch`. Still only pitches; it does not import `song`.
- `src/core/settings`: the song text and "use song" as fields, checked for type and the character limit only. It cannot parse ABC (no library in `src/core`).
- An ABC adapter outside `src/core` (location decided in the breakdown; `src/core` may not import a library) that turns ABC text into a `Song` or a list of problems using abcjs ([ADR 0006](../../architecture/decisions/0006-abcjs-for-songs.md)). The pitches come from abcjs's audio sequence (`setUpAudio`), which already applies the key signature, carried accidentals, ties and repeats. The parse tree is used to find what is rejected and to count conversions. See the [spike](../../research/abcjs-parsing-spike.md).
- `src/app`: settings view, validator messages, card flow takes a song source. On load the app parses the saved song text once with the adapter, which gives the card flow its `Song` and turns "use song" off if the text no longer passes.
- `package.json`: abcjs pinned to an exact version, agreed 2026-11-07 ([ADR 0006](../../architecture/decisions/0006-abcjs-for-songs.md)).

The tone player, the judge and the staff are untouched.

## Data

New settings `useSong` (default off) and `songAbc` (default empty text), in the defaults file and under the same `localStorage` key. Settings saved earlier get the defaults. A song is stored as the player's ABC text; it is parsed again on load.

## Risks and open questions

- **abcjs in a non-browser environment.** Settled by the [spike](../../research/abcjs-parsing-spike.md): `parseOnly` and `setUpAudio` run under Vitest with no DOM.
- **Accidental rules.** abcjs applies them in its sequence (the spike checked key signatures, bar-carried accidentals per octave, naturals and ties across the bar line). S02 still tests them against known tunes written out by hand, since the adapter depends on abcjs getting them right.
- **Deep import.** The narrow entry (`abcjs/src/api/abc_tunebook.js`) is not a documented API and may move in a release. abcjs is pinned exactly, and the adapter's tests catch a break on a deliberate upgrade.
- **Flats shown as sharps** may look strange to players who read flats. A flat-spelling feature touches pitch, staff and reveal and is not part of this one.
- **Bundle size.** The deep import leaves the renderer, synth and editor out: about 211 kB minified, 61 kB gzip, against 509 kB and 149 kB for the whole package (the app's main chunk is about 747 kB and 399 kB). It is lazy-loaded (a dynamic import when the Song section opens or a saved song is in use) and still precached for offline use; S02 measures the real numbers in the app build. With a saved song in use, the first card waits for abcjs to load and parse.
- **Which tunes fit.** The 12-hole alto C spans only A3 to F5, so many tunes will be rejected for range. A transposing option may be wanted later.

## Stories

- F05-S01: Song type and song order in the drill
- F05-S02: ABC to song
- F05-S03: Song settings and validator
- F05-S04: Cards follow the song

Story files are in [`stories/`](stories/).
