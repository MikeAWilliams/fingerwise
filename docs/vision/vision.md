# fingerwise Vision

> **Status: draft, living document.** This is intent and planning, not fact. What is actually built is described in [`../architecture/`](../architecture/). See [README.md](README.md) for how this file feeds the rest of the docs.

## Vision

### Concept

A flashcard drill for 12-hole ocarina. A note appears on the staff, the player fingers it from memory, then after a delay the app reveals the note letter and tablature. Self-graded, no microphone needed. Open source.

### Who it is for

Ocarina players learning to read the staff and recall fingerings from memory. Also, extensible to other instruments later.

---

## Detailed planning

### Prior art

As of Oct 2026. Nothing found does this exact loop.
- **Eidolophone EARTHWIND** (Steam, not yet released): staff-reading game and a note/fingering card game, but mic-centered.
- **Mickji quizzes**: note image with 4 multiple-choice names; no fingerings.
- **Soloist Ocarina, Ocarina Tabs** (iOS): song-focused, with fingering charts.
- **Motif Fingering Flashcards** (Apple): right concept, but no ocarina support.
- **Pure Ocarinas "Match the note"**: ear training with mic.
- **panzi/ocarina_tabs**: open-source tab generator and fonts (free for any use).

### Stack

- **Platform:** Progressive Web App (installable on Android, works offline). PWA support is deferred to its own story (feature 2); see [ADR 0001](../architecture/decisions/0001-toolchain-and-ui.md).
- **Toolchain and UI:** decided in [ADR 0001](../architecture/decisions/0001-toolchain-and-ui.md).
- **Staff rendering:** VexFlow (MIT).
- **Tablature:** panzi's font 1, decided in [ADR 0002](../architecture/decisions/0002-tablature-from-panzi-font.md).
- **Audio:** Web Audio API (sine-wave synth, optional samples).
- **Pitch detection:** Pitchy / YIN (MIT), in JS.
- **Storage:** localStorage (progress, sampling state); export/import button for sync.
- **Hosting:** GitHub Pages (free, HTTPS included, which the mic requires) via GitHub Actions.
- **WASM (C++/Rust):** not needed; the workloads are tiny and DOM/Web Audio access goes through JS anyway. Keep only as an optional escape hatch for the pitch detector.
- **Native later (optional):** Tauri wrapper for Linux/Mac/Windows. Same web code. Mac needs signing/notarization ($99/yr); Windows shows SmartScreen warnings unless signed.

### Required abstractions

Design these in from the start. Keep them as separate, swappable layers so nothing is hardcoded to treble clef or 12-hole ocarina.

- **Pitch:** a single internal representation that every other layer converts to and from. Built: see [`modules/pitch.md`](../architecture/modules/pitch.md).
- **Staff:** owns how a pitch is drawn. Built; see [staff.md](../architecture/modules/staff.md).
- **Clef:** a definition mapping pitch to staff position (treble, bass, alto, tenor, etc.), plus any octave transposition marking (e.g. treble 8vb). Selectable per user and per instrument default.
- **Instrument:** a data-driven definition, not code. Built: see [`modules/instrument.md`](../architecture/modules/instrument.md) and [`data-formats.md`](../architecture/data-formats.md).
- **Fingering/tab renderer:** draws the glyph the instrument definition holds for a pitch. Built: see [`modules/tab.md`](../architecture/modules/tab.md) and [ADR 0002](../architecture/decisions/0002-tablature-from-panzi-font.md).
- **Drill engine:** operates only on pitches and instrument definitions; knows nothing about clef, staff, or hole count. Built: see [`modules/drill.md`](../architecture/modules/drill.md).
- **Audio and judging:** synth and pitch detection work in sounding pitch, with the instrument's transposition applied at the boundary.

Instrument definitions live as JSON files (`data/instruments/`) so contributors can add instruments without writing code.

### Feature order

1. **Core flashcards:** staff note, delay, reveal letter + tablature. Settings for note range (with or without sharps) and delay length; the alto C only, F and G ocarinas come later. Designed in [`features/01-core-flashcards`](../features/01-core-flashcards/design.md). Also carries extensibility tests (no shipped features): a fixture instrument under `tests/` with a different hole count, range and transposition, which the drill engine, tab renderer and loader must handle with no code changes; the same pitch rendered in treble, treble 8vb and bass clef; staff edge cases (ledger lines at range limits, accidentals, key signature); and a check that the drill engine runs with no clef, staff or UI imports. Open items for the feature 1 design:
   - **Delay:** fixed length chosen in settings. An adaptive delay is a possible later idea, tied to feature 6 (sampling), since it needs grade history. The default is 3 seconds.
   - **Reveal placement:** built; see [`modules/app.md`](../architecture/modules/app.md). There is no reverse card (fingering shown, note named).
   - **Fingering data, style, hole pattern shape, tablature rendering:** decided in [ADR 0002](../architecture/decisions/0002-tablature-from-panzi-font.md); findings in [research](../research/ocarina-fingering-data.md). First instrument: 12-hole alto C, Taiwanese-style, font range A to F².
   - **Written vs sounding pitch, transposition, override:** decided in [ADR 0003](../architecture/decisions/0003-written-pitch-and-transposition.md).
2. **Deploy and PWA:** publish to GitHub Pages via GitHub Actions and make the app installable and offline-capable, so the drill is usable on a phone as early as possible.
   - **Touch and phone UI:** the layout works in portrait on a phone, and tapping the card reveals early.
3. **Songs as note order:** accept ABC notation and plain note lists (`C4 D4 E4 G4`); use ABC libraries (thesession.org, abcnotation.com) as a song source. Parse with abcjs, draw with VexFlow. MusicXML import later.
4. **Play the note:** synthesized tone; "hear it, then finger it" drill.
5. **Record and judge a single note:** mic pitch detection, forgiving window (about ±30-50 cents), onset/settling handling.
   - **Open question for later:** should this get a research spike (pitch-detection accuracy on ocarina, Android mic latency) before it is designed?
6. **Smarter flashcard sampling:** replace feature 1's uniform pick with a scheduler that chooses which card comes next, based on how the player did before. Grades are self-reported only until the mic judge exists (feature 5). Two candidate approaches:
   - **Leitner boxes:** cards sit in numbered boxes. A correct answer moves a card up a box, a miss drops it to box 1, and higher boxes are reviewed less often. State per card is just a box and a due date.
   - **SM-2:** each card carries its own ease value, and the next interval is computed from its grade history. Adapts better but has more parameters to tune.

   Open questions (the sampling behavior must be described by the user before this feature can be designed):
   - **Card unit:** is a card one pitch on one instrument, so each instrument has its own progress?
   - **Grades:** two buttons (got it / missed it) or three? Speed cannot be measured, so any extra grade is self-reported.
   - **New cards:** start with a few notes and add more as they settle, or draw from the whole note-range setting from the start?
   - **Misses:** does a missed card come back later in the same session?
   - **Grade source:** the scheduler takes grades from any source, so the mic judge can feed it later.
7. **Wait mode for songs:** song advances when the correct note is played; no timing judgment.
8. **Timed play-along:** Web Audio clock playhead, count-in/metronome, onset detection, tolerance windows (about ±100-150 ms), latency calibration step, lenient scoring.
   - **Scope:** kept for now as the last real feature. It is the hardest and depends on the mic judge being reliable, so revisit whether to keep it once feature 5 shows how well judging works.
9. **Other instruments and clefs (maybe eventually):** thanks to the abstractions above, this is mostly data: add instrument JSON files (tin whistle, recorder, 6-hole ocarina, etc.) and clef options.

### Technical gotchas

- **Transposition:** many ocarina charts write notes an octave below sounding pitch; the app must define what the staff means and let users set their instrument.
- **Breath sensitivity:** ocarina pitch rises with blowing pressure, so judging needs a wide window.
- **Pitch is not fingering:** the judge hears what came out, not what the fingers did.
- **Mic latency:** 50-200 ms on Android, varies by device; calibration is required for timing scoring.
- **Repeated notes and fast passages:** hard to detect on a soft-attack instrument.
- **Mic requires HTTPS** (GitHub Pages provides it).

### License and assets

- **Code:** MIT (see the repo's `LICENSE`).
- **Dependencies:** VexFlow, Pitchy, and abcjs are MIT; panzi's fonts are unrestricted.
- **Avoid:** copying commercial fingering charts (Songbird, STL Ocarina, etc.); generate charts from the open fonts.
- Keep code license and third-party asset notes clearly separated in the repo.

### Reuse potential

Low as a library (the pieces already exist). Modest value in:
- A clean, machine-readable 12-hole fingering dataset (JSON) per key and style; check panzi's repo first.
- An instrument-definition format that lets others add instruments.

Main value is to ocarina players using the app.

### Open questions

- None for feature 1. Open questions for later features sit under their entries in [Feature order](#feature-order).
