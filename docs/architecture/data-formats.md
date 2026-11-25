# Data formats

## Instrument JSON

One file per instrument in [`data/instruments/`](../../data/instruments/). Validated by `loadInstrument` ([`modules/instrument.md`](modules/instrument.md)). Pitches are note names as in [`modules/pitch.md`](modules/pitch.md): sharps only, written with `♯`.

| Field                 | Type    | Required | Rule                                                                                |
| --------------------- | ------- | -------- | ----------------------------------------------------------------------------------- |
| `name`                | string  | yes      | Non-empty.                                                                          |
| `family`              | string  | yes      | Non-empty (ocarina, tin whistle, ...).                                              |
| `holes`               | integer | yes      | Positive.                                                                           |
| `fingeringStyle`      | string  | yes      | `taiwanese` or `japanese`.                                                          |
| `defaultClef`         | string  | yes      | `treble`, `treble-8vb` or `bass`.                                                   |
| `writtenRange.lowest` | string  | yes      | Note name. Strictly below `highest`.                                                |
| `writtenRange.highest`| string  | yes      | Note name.                                                                          |
| `transposition`       | integer | yes      | Semitones from written to sounding pitch. No default ([ADR 0003](decisions/0003-written-pitch-and-transposition.md)). |
| `tablature.font`      | string  | yes      | Non-empty font file name. The file lives in [`data/fonts/`](../../data/fonts/), not in the instrument file. |
| `tablature.glyphs`    | object  | yes      | Written pitch name to glyph string. One entry per semitone in the range, no others. |

Glyph keys must be in canonical form (`C♯4`, not `C#4`) and inside the written range. A missing or extra glyph is rejected, naming the pitch. Glyph strings are opaque: only checked to be non-empty ([ADR 0002](decisions/0002-tablature-from-panzi-font.md)).

Every error is an `InstrumentError` whose message names the offending field (dotted path) or pitch.

### Example

[`ocarina-12-taiwanese.json`](../../data/instruments/ocarina-12-taiwanese.json): the 12-hole alto C, written range A3 to F5, transposition +12, glyphs `A` (A3) to `U` (F5), one letter per semitone.

## Settings defaults

[`data/settings/defaults.json`](../../data/settings/defaults.json) holds the settings used when nothing else applies. The app imports it at build time and reads it with `parseDefaults` ([settings](modules/settings.md)).

| Field           | Type    | Rule                                                      |
| --------------- | ------- | --------------------------------------------------------- |
| `lowest`        | string  | Note name (`A3`, `C♯5`) inside the instrument's written range, below `highest`. |
| `highest`       | string  | Note name inside the written range.                       |
| `includeSharps` | boolean | When false, `lowest` and `highest` must be naturals.      |
| `delaySeconds`  | number  | Reveal delay. Finite, 0.5 to 30 inclusive.                |
| `autoAdvance`   | boolean | Whether the next card appears on its own after the reveal. |
| `advanceDelaySeconds` | number | Advance delay, counted from the reveal. Finite, 0.5 to 30 inclusive. |
| `soundEnabled` | boolean | Play note: whether the card's note sounds after the reveal. |
| `soundDelaySeconds` | number | Time from the reveal to the note starting. Finite, 0 to 30 inclusive. |
| `soundDurationSeconds` | number | How long the note sounds. Finite, 0.5 to 30 inclusive. |
| `judgeEnabled` | boolean | Whether the microphone judges the played note before the reveal. |
| `smartSampling` | boolean | Whether cards are drawn by need (F06). Only takes effect with judging on and mode Flashcards. |
| `toleranceCents` | number | How far, in cents, a played tone may be from the expected pitch and still be correct. Finite, 10 to 45 inclusive. |
| `mode` | `"flashcards"` or `"song"` | What is drilled: random cards from the range, or the song (F16). `"flashcards"` in the defaults file. |
| `practice` | `"single"` or `"tempo"` | How a song is practised: one note at a time, or in time through the whole song (F08, F16). Does nothing in Flashcards. `"single"` in the defaults file. |
| `fingeringDelaySeconds` | number | Single note: seconds before the fingering shows. Finite, 0.5 to 30 inclusive. `3` in the defaults file. |
| `singleAdvanceDelaySeconds` | number | Single note with the microphone off: seconds from the fingering showing to the next note. Finite, 0.5 to 30 inclusive. `3` in the defaults file. |
| `barsPerLine` | number | Bars on each line of a timed song's staff. Whole number, 1 to 4. `2` in the defaults file. |
| `metronome` | boolean | With Tempo practice, a click on every beat while the song plays, not just the count-in (F08). Does nothing unless the mode is Song and the practice Tempo. `false` in the defaults file. |
| `scoring` | `"live"` or `"after"` | With Tempo practice and judging on, whether a timed song shows its judging as it plays (`live`) or all at once after the song (`after`, F12). Does nothing unless the mode is Song, the practice Tempo and judging is on. `"live"` in the defaults file. |
| `songAbc` | string | The player's tune, or several tunes each starting with its own `X:` line, in ABC notation, kept as typed. At most 10,000 characters. The defaults file holds the example song (Mary Had a Little Lamb); a stored `""` or a missing field loads as that text. |
| `songTune` | number | The chosen tune's position in `songAbc`, counting from 1 (not its `X:` number). Whole number, at least 1. `1` in the defaults file. |

Across fields: with `soundEnabled` and `autoAdvance` both true, `soundDelaySeconds + soundDurationSeconds` must not exceed `advanceDelaySeconds`.

The file must be valid as written: `parseDefaults` throws a `SettingsError` naming the field rather than correcting anything. Currently A3, F5, sharps on, 3 second reveal delay, auto-advance on, 3 second advance delay, play note on, 0.5 second sound delay, 1.5 second sound duration, judge off, smart sampling off, 40 cent tolerance, mode flashcards, practice single note, 3 second fingering delay, 3 second single note advance delay, metronome off, scoring live, 2 bars per line, the example song as the text and tune 1 chosen.

## Storage

Settings are kept in `localStorage` under the single key `fingerwise.settings`, as JSON in the same shape as the defaults file:

```json
{ "lowest": "A3", "highest": "F5", "includeSharps": true, "delaySeconds": 3, "autoAdvance": true, "advanceDelaySeconds": 3, "soundEnabled": true, "soundDelaySeconds": 0.5, "soundDurationSeconds": 1.5, "judgeEnabled": false, "smartSampling": false, "toleranceCents": 40, "mode": "flashcards", "practice": "single", "fingeringDelaySeconds": 3, "singleAdvanceDelaySeconds": 3, "metronome": false, "scoring": "live", "barsPerLine": 2, "songAbc": "T: Mary Had a Little Lamb\nL:1/4\nQ:70\nE D C D | E E E2 | D D D2 | E G G2 |\nE D C D | E E E E | D D E D | C4 ||", "songTune": 1 }
```

On load the value is run through `validateSettings` ([settings](modules/settings.md)), so each invalid field falls back to its default. Data saved before auto-advance existed lacks `autoAdvance` and `advanceDelaySeconds`, so it keeps its other fields and gets the defaults for those two; data saved before sound existed likewise gets play note on, 0.5 s and 1.5 s, and data saved before judging gets judge off and 40 cents; data saved before smart sampling gets it off; a `smartSampling` that is not a boolean resets alone; data saved before songs gets an empty text (so the example song) and Flashcards. Data saved before F16 has `useSong` and `keepTempo` instead of `mode` and `practice`, and they are read once to map: use song off loads as Flashcards, use song on with keep tempo off as Song with Single note, and use song on with keep tempo on as Song with Tempo; a boolean `keepTempo` sets the practice even with use song off, and with neither field the result is Flashcards with Single note. They are not written back, and every other stored value is kept. A `mode`, `practice` or delay that is missing or invalid resets alone to its default. Data saved before the metronome gets it off, and a non-boolean `metronome` resets alone; data saved before F12 gets `scoring` `"live"`, keeping every other field, and a `scoring` that is not `"live"` or `"after"` resets alone; data saved before bars per line gets 2, and a value that is not a whole number from 1 to 4 resets alone. A `songAbc` that is not a string or is over 10,000 characters, resets alone; a text saved empty, or missing in data saved before songs, takes the defaults' song, so a fresh profile and old data both start with the example. Data saved before F14 lacks `songTune` and gets 1, keeping every other field; a value that is not a whole number of at least 1 resets alone to 1. A position past the last tune of the saved text is not checked here: the app corrects it to 1 and saves it at load. Whether a stored text still passes is not checked here: the app parses it at load and, when it fails, holds no song and leaves the mode alone ([app](modules/app.md)). If the result breaks the sound rule above (for example an old advance delay of 1 s), the sound delay, sound duration and advance delay all reset to the defaults and the other fields are kept. A missing key, unparseable JSON, a throwing `getItem` or absent storage gives the defaults. A failed write is ignored. A corrected value is not written back until the player changes something. Nothing else is stored yet; nothing from the microphone is ever stored.

### Progress

Smart sampling's scores ([progress](modules/progress.md)) are kept in `localStorage` under their own key, `fingerwise.progress`, separate from the settings, as one JSON object keyed by the instrument's `name`, each value a map from written pitch name to need (0 known, 1 needs work):

```json
{ "12-hole alto C ocarina": { "C5": 0.24, "C♯5": 0.7 } }
```

Only pitches that have been graded appear; any other reads as need 1. Because the key is the instrument's `name`, renaming an instrument in its JSON orphans its scores. On load only the current instrument's entry is read, and `fromProgressJson` drops each entry whose pitch name does not parse, is outside the instrument's written range, or whose value is not a finite number from 0 to 1; a value that is not an object gives no scores. A missing key, unparseable JSON, a non-object store, a throwing `getItem` or absent storage gives no scores. Saving replaces only the current instrument's entry and copies the other instruments' entries as stored (unvalidated, since only one instrument is loaded); an unreadable store is replaced. A failed write or absent storage is ignored. There is no version field, as with the settings. Nothing from the microphone is stored, only these numbers.
