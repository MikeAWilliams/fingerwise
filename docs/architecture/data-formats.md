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
| `delaySeconds`  | number  | Finite, 0.5 to 30 inclusive.                              |

The file must be valid as written: `parseDefaults` throws a `SettingsError` naming the field rather than correcting anything. Currently A3, F5, sharps on, 3 seconds.

## Storage

Settings are kept in `localStorage` under the single key `fingerwise.settings`, as JSON in the same shape as the defaults file:

```json
{ "lowest": "A3", "highest": "F5", "includeSharps": true, "delaySeconds": 3 }
```

On load the value is run through `validateSettings` ([settings](modules/settings.md)), so each invalid field falls back to its default. A missing key, unparseable JSON, a throwing `getItem` or absent storage gives the defaults. A failed write is ignored. A corrected value is not written back until the player changes something. Nothing else is stored yet.
