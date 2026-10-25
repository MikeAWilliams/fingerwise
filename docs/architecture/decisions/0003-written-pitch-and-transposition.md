# 0003: Written pitch and transposition

- **Status:** accepted
- **Date:** 2026-10-25

## Context
Many ocarina charts write notes an octave below the sounding pitch. The app needs a single definition of what the staff shows and how it relates to the pitch that comes out. The glyph table from [ADR 0002](0002-tablature-from-panzi-font.md) is shared by the C, F and G ocarinas (see the [research note](../../research/ocarina-fingering-data.md)), which suggests keying it by what the player reads, not by what they hear.

## Decision
- The staff shows **written pitch**. The instrument's fingering table is keyed by written pitch.
- Each instrument definition states its **transposition** (semitones from written to sounding). It is a required field with no default; the loader rejects a file that omits it.
- The 12-hole alto C writes its lowest note as A3 and its highest as F5, and sounds 12 semitones higher: sounding = written + 12, so A4 to F6.
- The ocarina key (C, F, G) would change only the transposition; the fingering table is the same for all three. Feature 1 ships the alto C only.
- A player cannot override an instrument's transposition. Choosing a key is the only way to change it.
- Sounding pitch is derived from written pitch at the boundary where audio or judging needs it (features 4 and 5).

## Alternatives considered
- **Table keyed by sounding pitch:** each ocarina key would need its own table, tripling the data and hiding that the fingerings are the same.
- **A default transposition of 0:** a missing field would silently put every note an octave off. Rejected in favor of a required field.
- **Player override of the offset:** more UI and more states to test. It can be added later; removing it later would be harder.

## Consequences
- The drill engine and the glyph table work in written pitch. Audio and judging convert at their boundary.
- Instrument JSON needs a transposition field and a way to add other keys later. The offsets for F and G must be verified against an open source before they are shipped.
- The reveal letter shows the written name, so it always agrees with the staff.
