# fingerwise Vision

> **Status: draft, living document.** This is intent and planning, not fact. What is actually built is described in [`../architecture/`](../architecture/). See [README.md](README.md) for how this file feeds the rest of the docs.

## Vision

### Concept

A flashcard drill for 12-hole ocarina. A note appears on the staff, the player fingers it from memory, then after a delay the app reveals the note letter and tablature. Self-graded, no microphone needed. Open source.

### The gap

Nothing found does this exact loop (see [Prior art](#prior-art)). The opening is a no-mic, self-graded, delayed-reveal drill with spaced repetition, on Android-friendly tech.

### Who it is for

Ocarina players learning to read the staff and recall fingerings from memory.

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

- **Platform:** Progressive Web App (installable on Android, works offline).
- **Language:** TypeScript with Preact (TSX) and plain CSS. Decided in [ADR 0001](../architecture/decisions/0001-toolchain-and-ui.md).
- **Build:** Vite, with `base` set to the repo path for GitHub Pages ([ADR 0001](../architecture/decisions/0001-toolchain-and-ui.md)).
- **Staff rendering:** VexFlow (MIT).
- **Tablature:** panzi's open-source ocarina fonts.
- **Audio:** Web Audio API (sine-wave synth, optional samples).
- **Pitch detection:** Pitchy / YIN (MIT), in JS.
- **Storage:** localStorage (progress, spaced-repetition state); export/import button for sync.
- **Hosting:** GitHub Pages (free, HTTPS included, which the mic requires) via GitHub Actions.
- **WASM (C++/Rust):** not needed; the workloads are tiny and DOM/Web Audio access goes through JS anyway. Keep only as an optional escape hatch for the pitch detector.
- **Native later (optional):** Tauri wrapper for Linux/Mac/Windows. Same web code. Mac needs signing/notarization ($99/yr); Windows shows SmartScreen warnings unless signed.

### Required abstractions

Design these in from the start. Keep them as separate, swappable layers so nothing is hardcoded to treble clef or 12-hole ocarina.

- **Pitch:** a single internal representation (e.g. MIDI number or note name + octave). Every other layer converts to and from this.
- **Staff:** owns how a pitch is drawn. Inputs: pitch, clef, key signature, accidental handling. Outputs: a VexFlow rendering. Supports ledger lines and range limits. Adding a new staff style (e.g. grand staff, single-line) should not touch the drill logic.
- **Clef:** a definition mapping pitch to staff position (treble, bass, alto, tenor, etc.), plus any octave transposition marking (e.g. treble 8vb). Selectable per user and per instrument default.
- **Instrument:** a data-driven definition, not code. Contains:
  - name and family (ocarina, tin whistle, recorder, ...)
  - hole count and layout, and fingering style (Japanese/Taiwanese)
  - key (C/F/G, etc.)
  - playable range
  - fingering table: pitch to hole pattern
  - written-vs-sounding transposition (how the staff relates to actual pitch)
  - default clef
  - tablature renderer reference (font or SVG layout)
- **Fingering/tab renderer:** takes an instrument's hole pattern and draws it; the instrument definition points to which renderer to use.
- **Drill engine:** operates only on pitches and instrument definitions; knows nothing about clef, staff, or hole count.
- **Audio and judging:** synth and pitch detection work in sounding pitch, with the instrument's transposition applied at the boundary.

Instrument definitions live as JSON files (`data/instruments/`) so contributors can add instruments without writing code.

### Feature order

1. **Core flashcards:** staff note, delay, reveal letter + tablature. Settings for ocarina key (C/F/G), style (Japanese/Taiwanese), note range, and delay length.
2. **Spaced repetition:** Leitner boxes or SM-2; self-rating (got it / missed it) feeds scheduling.
3. **Play the note:** synthesized tone; "hear it, then finger it" drill.
4. **Songs as note order:** accept ABC notation and plain note lists (`C4 D4 E4 G4`); use ABC libraries (thesession.org, abcnotation.com) as a song source. Parse with abcjs, draw with VexFlow. MusicXML import later.
5. **Record and judge a single note:** mic pitch detection, forgiving window (about ±30-50 cents), onset/settling handling.
6. **Wait mode for songs:** song advances when the correct note is played; no timing judgment.
7. **Timed play-along:** Web Audio clock playhead, count-in/metronome, onset detection, tolerance windows (about ±100-150 ms), latency calibration step, lenient scoring.
8. **Other instruments and clefs (optional):** thanks to the abstractions above, this is mostly data: add instrument JSON files (tin whistle, recorder, 6-hole ocarina, etc.) and clef options.

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

- Which fingering style(s) to support first (Japanese vs Taiwanese)?
- Default staff convention for sounding vs written pitch? (Now a per-instrument setting in the instrument definition.)
- Delay length default and whether it adapts to the user's speed?
