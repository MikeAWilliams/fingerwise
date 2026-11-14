# F09: Other instruments and clefs

- **Status:** parked. Not planned for now; recorded so the idea is not lost. Design it properly with `fw-plan` before any story is written.

## Goal

The player picks another instrument (for example tin whistle, recorder or a 6-hole ocarina) and drills it the same way as the 12-hole ocarina, with the clef that suits it.

## Idea

Instruments are data, not code ([`data-formats.md`](../../architecture/data-formats.md)), so most of this should be adding JSON files in `data/instruments/` and a way to choose between them. Clefs are the part that needs code: a clef maps a pitch to a staff position (treble, bass, alto, tenor), with any octave marking such as treble 8vb. It is selectable per user, with a default per instrument. The staff module ([`staff.md`](../../architecture/modules/staff.md)) draws the pitch; the drill engine must keep knowing nothing about clefs.

## Open questions

- **Which instrument first?** The user plans to add one later. Its fingering source must be open (see [fingering data research](../../research/ocarina-fingering-data.md)); never copy a commercial chart.
- **Tablature for the new instrument.** [ADR 0002](../../architecture/decisions/0002-tablature-from-panzi-font.md) draws the 12-hole ocarina from panzi's font. Another instrument may need a different font or a drawn hole pattern.
- **Instrument picker.** Where it lives in the settings, and whether the stored note range and song survive switching instruments.
- **Clef module.** Whether a clef is data too, or code behind a small interface; any new clef setting and its storage.
- **Transposition.** Each instrument states its own written-to-sounding offset ([ADR 0003](../../architecture/decisions/0003-written-pitch-and-transposition.md)).

## Stories

None yet.
