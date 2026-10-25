# F01: Core flashcards

- **Status:** designed
- **Vision source:** `../../vision/vision.md#feature-order`

## Goal

The player sees a note on a treble staff, fingers it from memory, and after a delay (or when they ask) sees the note name and the fingering diagram under the staff. They can set the note range, whether sharps are included, and the delay. The only instrument is the 12-hole alto C ocarina with Taiwanese-style fingering.

## Behavior

**Card flow**
1. A card shows one written pitch on the staff. The delay timer starts.
2. When the delay ends, or the player clicks or presses a key before then, the card is revealed: the written note name (e.g. `C4`, `C♯5`) and the tablature glyph appear under the staff, in place.
3. After the reveal, a click or key press shows the next card, and its timer starts from zero.
4. There is no pause button and no grading. Grading arrives with feature 6.

**Start and navigation**
- The app has no start screen. Page load shows a card immediately, using the saved settings or the defaults.
- A settings button is always visible. Opening settings stops the current card and its timer. Closing settings draws a new card with the new settings.
- Until the settings UX story (S06) lands there is no settings button. From S05 the settings come from a bundled defaults file (full range, sharps included, 3-second delay) and cannot be changed in the app.

**Choosing cards**
- Uniform random over the player's note range (sharps only if included), never the same pitch as the previous card. The settings never allow a one-note range, but if the drill engine is handed one it repeats that note.
- Chromatic notes are drawn as sharps with an accidental on the note, in C major (no key signature). The name shows the sharp.
- The staff is treble clef only.

**Settings** (the bundled defaults file is the base; from S06 the player's choices are saved in `localStorage` over it, and missing or corrupt data falls back to the defaults file)
- **Note range:** a lowest and highest written pitch, chosen within the instrument's written range (A3 to F5 for the alto C). The lowest is always below the highest. Every natural note between them is in the pool. Default: the full range.
- **Include sharps:** a toggle. On, every semitone between low and high is in the pool. Off, sharps are left out and the pickers offer natural notes only. Default on.
- **Delay:** seconds before the automatic reveal. Default 3.
- There is no fingering-style setting and no ocarina-key setting; there is one instrument.

**Edge cases**
- The pickers enforce low < high: the lowest cannot equal or exceed the highest.
- Turning sharps off while low or high is a sharp moves the low bound up and the high bound down to the nearest natural note inside the range. Turning them back on keeps the bounds as they are.
- If that move would leave low equal to or above high, the sharps toggle is blocked and the settings view says why. The range is never left invalid.
- The font has not loaded when the reveal happens: the note name still shows, and the glyph appears when the font arrives (the text must not be left blank without notice).
- A stored setting outside the instrument's range, or with low not below high, or an invalid delay, is clamped or reset to default (exact rules in F01-S05).

## Out of scope

- Grading and scheduling (feature 6), sound (4, 5), songs (3), PWA and touch layout (2).
- Clef, sharps-or-flats and key-signature settings. Treble 8vb, bass, ledger lines, accidentals and key signatures are covered by tests only.
- A reverse card (fingering shown, note named).
- Player override of transposition.
- Fingering style choice, other instruments, half-covered holes.
- F and G ocarinas and an ocarina-key setting. The font's table suggests they share the fingerings with a different transposition, but their offsets and octaves are unverified. They come later as instrument data once checked against an open source.

## Modules touched

All new. Module docs are written when each is built.

- `src/core/pitch`: the pitch representation, transposition arithmetic, note names.
- `src/core/instrument`: instrument definition types, loader and validation (required transposition, glyph for every pitch in range, ranges consistent).
- `src/core/drill`: picks the next pitch from a range and an instrument, avoiding the previous pitch. Knows only pitch and instrument definitions.
- `src/core/settings`: setting types, defaults, validation and clamping. The bundled defaults file and the `localStorage` access itself live in `src/app`.
- `src/render/staff`: draws a written pitch on a treble staff with VexFlow. Clef, accidental handling and range limits are parameters.
- `src/render/tab`: shows a glyph string in the bundled font.
- `src/app`: the card view, settings view, timer, `localStorage`, font loading.

`src/core/` imports no framework or browser APIs. The drill engine imports nothing from `render` or `app`.

## Data

**Instrument definition** (`data/instruments/ocarina-12-taiwanese.json`; the schema is written to `docs/architecture/data-formats.md` when the loader lands). It holds at least: name and family, hole count, fingering style, default clef, written range, a required transposition (+12 for the alto C, per [ADR 0003](../../architecture/decisions/0003-written-pitch-and-transposition.md)), the tablature font reference, and a table from written pitch to glyph character.

**Glyph table:** the 21 glyphs of font 1, A3 to F5 written ([research note](../../research/ocarina-fingering-data.md)).

**Font:** `Open-12-Hole-Ocarina-1.ttf`, committed with its OFL 1.1 text, copyright line and source URL ([ADR 0002](../../architecture/decisions/0002-tablature-from-panzi-font.md)).

**Defaults file:** `data/settings/defaults.json`, imported at build time. It holds the settings listed under Settings above.

**Stored state (S06):** one `localStorage` key for settings: low pitch, high pitch, include sharps, delay.

## Extensibility tests (shipped as tests, not features)

- A fixture instrument under `tests/` with a different hole count, range and transposition passes through the loader, the drill engine and the tab renderer with no code changes.
- The same pitch renders in treble, treble 8vb and bass clef.
- Staff edge cases: ledger lines at range limits, accidentals, key signature.
- A check that `src/core/drill` imports nothing from clef, staff, `render` or `app`.

## Risks and open questions

- **Tablature depends on trusting font 1** (user decision, [ADR 0002](../../architecture/decisions/0002-tablature-from-panzi-font.md)). Nothing in the tests can check a glyph against a real fingering.
- **Style label:** the sources do not say the font is Taiwanese-style; the user chose to treat it as such.
- **Staff rendering with VexFlow** adds a dependency, which CLAUDE.md says needs the user's agreement. The vision names VexFlow, but it is not yet in `package.json`; agreed by the user on 2026-10-25.

## Stories

- F01-S01: Pitch and instrument definition (pitch type, note names, transposition, JSON loader, the alto C file)
- F01-S02: Show a note on the staff
- F01-S03: Reveal name and tablature after the delay
- F01-S04: Next card and drill rules (random pick, no immediate repeat, early reveal)
- F01-S05: Settings read from a bundled defaults file (range, include sharps, delay; read only, no UI)
- F01-S06: Settings UX (settings button and view, range pickers, sharps toggle, delay, persistence in `localStorage`)
- F01-S07: Extensibility tests

Story files are in [`stories/`](stories/).
