# Prior art and technical gotchas

Moved here from the retired vision document. Prior art is as of October 2026; apps change, so check again before relying on it.

## Question

Does anything already do what fingerwise does, and what makes it hard?

## Prior art

Nothing found does this exact loop (staff note, finger from memory, delayed reveal, optional judging).

- **Eidolophone EARTHWIND** (Steam, not yet released): staff-reading game and a note/fingering card game, but mic-centered.
- **Mickji quizzes**: note image with 4 multiple-choice names; no fingerings.
- **Soloist Ocarina, Ocarina Tabs** (iOS): song-focused, with fingering charts.
- **Motif Fingering Flashcards** (Apple): right concept, but no ocarina support.
- **Pure Ocarinas "Match the note"**: ear training with mic.
- **panzi/ocarina_tabs**: open-source tab generator and fonts (free for any use). See [ocarina-fingering-data.md](ocarina-fingering-data.md).

## Technical gotchas

- **Transposition:** many ocarina charts write notes an octave below sounding pitch; the app must define what the staff means and let users set their instrument. Decided in [ADR 0003](../architecture/decisions/0003-written-pitch-and-transposition.md).
- **Breath sensitivity:** ocarina pitch rises with blowing pressure, so judging needs a wide window.
- **Pitch is not fingering:** the judge hears what came out, not what the fingers did.
- **Mic latency:** 50-200 ms on Android, varies by device; calibration would be required for onset-timing scoring (feature 8 does not score onsets).
- **Repeated notes and fast passages:** hard to detect on a soft-attack instrument.
- **Mic requires HTTPS:** GitHub Pages provides it.

## Reuse potential

Low as a library (the pieces already exist). Modest value in a clean, machine-readable 12-hole fingering dataset (JSON) per key and style, and in an instrument-definition format that lets others add instruments. The main value is to ocarina players using the app.

## Possible later ideas

- Sampled, ocarina-like sounds in place of the sine tone.
- Export/import of stored progress for syncing between devices.
- A Tauri wrapper for desktop. Mac needs signing and notarization ($99/yr); Windows shows SmartScreen warnings unless signed.
- WASM is not needed; the workloads are tiny. Keep it only as an escape hatch for the pitch detector.
