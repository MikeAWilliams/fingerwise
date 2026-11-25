# F16 hand checks

Run with `make dev` (and an ocarina for the microphone checks). The pure parts are covered by tests; these are the parts only the screen and the ear can check.

## S01: Mode first in Settings

- [x] Open Settings: the first control is Mode (Flashcards, Song). Flashcards shows Cards (open), Sound and Microphone; Song shows Song (open), Practice and Microphone.
- [x] Flashcards: no song note, range and sharps are never greyed out for a song; smart sampling is greyed out only with judging off.
- [x] Song: no use song or keep tempo box. Practice offers Single note (fingering delay, advance delay) and Tempo (metronome, scoring). With Single note and judging on, the advance delay is greyed out with "Used with the microphone off".
- [x] Change values in a hidden mode or practice, switch away and back, reload: values are kept.
- [x] Header: Flashcards shows only the name and Settings. Song shows the title or tune list and the tempo, with Play song.
- [x] Old data: store settings with `useSong` off / on+`keepTempo` off / on+`keepTempo` on (and neither field) in `localStorage` key `fingerwise.settings`, reload: Flashcards / Song+Single note / Song+Tempo / Flashcards+Single note, other values kept.
- [x] A song text that fails keeps the mode and the last good song.

### Tune these constants (S01)

- [x] None in this story.

## S02: Single note view, microphone off

- [x] Song with Single note and judging off: the whole song is drawn with lanes and a strip under every lane, the head is on the first note, no start prompt or count-in.
- [x] After the fingering delay the letter and glyph show in the strip under the head; after the advance delay the head moves and the fingering hides. Nothing on the page moves when it shows or hides.
- [x] Taps (click, tap, key): first shows the fingering, second moves on. Rests are skipped; a tied note is one note.
- [x] 1 and 4 bars per line, and a song long enough to follow onto a new line: the page follows the head, and manual scrolling is never locked. Check a fingering at 4 bars per line for overhang.
- [x] The last note: "End of song" in the bar, no black note, no head; a tap starts again at the first note. No tone is ever played except by Play song.
- [x] Opening Settings, hiding the page, choosing a tune and Play song stop it; coming back starts at the first note. The tune list and Play song work at any time.

### Tune these constants (S02)

- [x] `STRIP_HEIGHT` (`src/render/staff/song-lines.ts`, now 60): the strip is tall enough for the letter and glyph without wasting space.
- [x] `FINGERING_NAME_SIZE`, `FINGERING_GLYPH_SIZE`, `FINGERING_MESSAGE_SIZE` (`src/app/SongOverlay.tsx`, now 13, 38, 10): the glyph is not cut off or crowded, at 1 and 4 bars per line.

## S03: Single note, microphone on

- [ ] With judging on and the microphone allowed: holding the right note grows a trace from the left of the current note's segment, green in tune, amber out of tune, red beyond ±50 cents. A tone held past the written length draws nothing more.
- [ ] Hold the whole note value: the head moves on. Hold only a short right tone: "Play the note's whole value" shows until the next tone starts. Play a wrong fingering: the fingering shows and stays; the note keeps listening.
- [ ] A held tone longer than the note passes with no message. Two notes at the same pitch: a tone held across both passes only the first.
- [ ] Without the microphone (denied, or before the first tap): Single note behaves as with judging off and Settings shows the unavailable notice. The legend shows with judging on, and there is no verdict row.

### Tune these constants (S03)

- [ ] `TONE_END_SILENCE_MS` (`src/core/judge/index.ts`, now 150): a breath or tongue stop ends a tone, a dropout inside a held note does not.
- [ ] `SINGLE_NOTE_PASS_SHARE` (`src/core/judge/index.ts`, now 0.75): a whole note at ♩ = 60 needs 3 s within tolerance; lower it if that feels too long.
- [ ] The trace's reach past the grey segment into the release gap looks right.
