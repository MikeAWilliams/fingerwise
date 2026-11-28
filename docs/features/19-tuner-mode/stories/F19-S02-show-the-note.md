# F19-S02: Show the note played

- **Feature:** `../design.md`
- **Modules:** `src/core/judge`, `src/app` (the tuner flow, `Card.tsx`, `judge-text.ts`, `verdict.ts`, `App.tsx`), `docs/architecture/`
- **Depends on:** F19-S01

## Story

As a player, I want to see which note I played and how far it is from in tune, as it sounds, so that I can hear and see how breath and fingering move the pitch.

## Acceptance criteria

Each item must be checkable and numbered so progress checklists can refer to it. Do not edit these once work starts; raise a change instead.
- **AC1:** Given Tuner is listening, when sounding readings inside the instrument's band have held for the settle time (200 ms), then a tone starts. Shorter sounds and readings outside the band show nothing.
- **AC2:** Given a tone, then the shown note is its nearest note in written pitch (sounding minus the transposition). It is drawn on the staff with its name and tablature, a verdict row and the pitch graph centred on it. A note outside the instrument's range is drawn with no tablature.
- **AC3:** Given a tone sounds, then the cents in the verdict row and the graph's dot follow the latest readings, updated at most every `READOUT_INTERVAL_MS` (100 ms).
- **AC4:** Given a tone sounds on a shown note, when another note is nearest, then the shown note changes only after that note has been nearest for the settle time. Until then the cents are measured from the shown note, beyond ±50 if need be.
- **AC5:** Given a tone ends (the tone watch's end silence), then the display holds the median offset of the tone's readings on the shown note, and keeps it until the next tone starts.
- **AC6:** Given an offset within the tolerance, then the verdict row reads "In tune" with ✓ in the in-tune colour. Otherwise it reads "N cents flat" or "N cents sharp" (N rounded, "1 cent" singular) in the amber colour, so colour is never the only signal.
- **AC7:** Given a held result, when a new tone starts, then the display follows the new tone as in AC2 to AC4.
- **AC8:** Given the change, then `make verify` passes, and the `judge` and `app` module docs describe the shown note, the settle rule, the live readout and the hold.

## Notes

- The judge's tone watch already starts a tone after the settle time, ends it after its end silence and exposes the live readings (`tone()`). The settle rule for a note change and the held median are pure functions over readings, in core.
- The graph module needs no change: it is given the shown note as the expected pitch.

## Test approach

Core tests over reading sequences at 16.7 ms steps: a steady tone, a tone at +45¢, a bend across ±50¢ held shorter and longer than the settle time, a sag at the release (the held median ignores it), a tone outside the band, a blip under the settle time. App tests for the verdict row texts and the readout throttle. By hand with `make dev` and an ocarina: play each note of the range, bend a note by breath and watch the dot move, stop and check the held value, play out of the range.
