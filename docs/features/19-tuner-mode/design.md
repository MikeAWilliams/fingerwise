# F19: Tuner mode

- **Status:** done

> Shaped in dialog on 2026-11-28, on `plan/next-features`. The mode is recorded in [ADR 0014](../../architecture/decisions/0014-tuner-mode.md). Values marked *default* were not discussed and are open to change in review.

## Goal

A third mode, **Tuner**, next to Flashcards and Song. The player plays any note. The app shows which note it heard, on the staff with its name and tablature, and how far it is from in tune, with the cents and the pitch graph as on a revealed flashcard. The display follows the tone while it sounds and holds the result when it stops, then does it all again for the next note.

## Behavior

**Choosing it**

- The Mode list in Settings offers Flashcards, Song and Tuner. Under Tuner only the Microphone section shows. The judge checkbox is hidden there, because the microphone is always on in Tuner, and the tolerance shows. The other sections keep their values, as with any mode switch.
- The header shows the app name and Settings only: no title, tune list, tempo or Play song.

**Listening**

- While Tuner is showing (Settings closed, page visible), the microphone is open. It closes when Settings opens or the page is hidden, and reopens when they close or the page shows again. This is how Flashcards handles judging.
- Before the first tone the reveal area says "Play a note" (*default*) and the staff is empty. When the microphone is locked the area shows the existing "Tap or press a key to start listening", and when it is unavailable it shows the existing `JUDGE_UNAVAILABLE` message.
- Taps and keys do nothing else in Tuner, apart from unlocking the microphone.

**A tone**

- A tone starts once sounding readings have held for the settle time (200 ms), as the judge's tone watch defines it. Readings outside the instrument's band (an octave beyond its range either way) are ignored.
- **The note shown** is the nearest note to the tone, in written pitch (sounding minus the transposition, as the flashcard verdict does). While a tone sounds, the shown note changes only once another note has been nearest for the settle time (*default*). A tone near ±50¢ therefore does not flicker between two notes, and a bend shows as cents beyond ±50 until it settles.
- **Live.** While the tone sounds, the cents, the verdict line and the graph's dot follow it at the readout's rate (`READOUT_INTERVAL_MS`, 100 ms). The graph is centred on the shown note.
- **Hold.** When the tone ends (the tone watch's end silence), the display holds the tone's result: the median offset of the readings on the shown note (*default*). It is not the last reading, because the pitch sags as the breath fades. It stays until the next tone starts.
- **The display** is a revealed card's: the shown note on the staff, its name and tablature, a verdict row and the pitch graph. A note outside the instrument's range is drawn on the staff with no tablature.
- **In tune.** Within the tolerance, the row reads "In tune" with ✓ and the in-tune colour. Otherwise it reads "12 cents flat" or "12 cents sharp" with the amber colour (*default*). Colour is never the only signal.

**Nothing is kept**

- Nothing is graded, no progress is stored and no tone is played. Leaving Tuner keeps nothing from it.

## Out of scope

- A target note, or a tuner inside Flashcards or Song.
- A reference tone, or an A4 other than 440 Hz.
- A history or trace of past tones.
- Choosing the instrument or its key.

## Modules touched

- **settings (`src/core/settings`):** `Mode` gains `"tuner"`. `isMode` accepts it, and the strict parse, the round trip and the "applies" tests cover it.
- **judge (`src/core/judge`):** a pure helper, or the tone watch's readings, giving the shown note under the settle rule and the held median (S02). It works on readings and pitch only.
- **app (`App.tsx`, `Settings.tsx`, `settings-form.ts`):** the Tuner choice, its sections, the hidden judge checkbox and the header (S01).
- **app (new tuner flow, `Card.tsx`, `judge-text.ts`, `verdict.ts`):** listening while shown, the live readout and the hold, and the verdict row texts (S01, S02).
- **render (`graph`):** reused as is, centred on the shown note.

The drill engine, coverage, analysis, song and abc modules are unchanged.

## Data

- `mode` may be `"tuner"`. No other settings change. Old data is unaffected.
- No progress data.

## Risks and open questions

- **Settle for the shown note.** Using 200 ms for a note change inside a tone is a first guess; tune it live.
- **The hold's median.** Readings from the attack and the release can pull it. If the held value looks off live, trim the tone's ends first.
- **Breath noise between notes.** A short noisy sound under the settle time shows nothing, by the tone watch's rules. If real playing causes false tones, raise the clarity threshold or the settle time for Tuner only.

## Stories

In build order (written 2026-11-28).

- [F19-S01: Tuner mode and listening](stories/F19-S01-tuner-mode.md)
- [F19-S02: Show the note played](stories/F19-S02-show-the-note.md)
