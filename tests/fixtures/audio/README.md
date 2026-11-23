# Audio fixtures

Short clips of the user's own playing on a 12-hole alto C ocarina, recorded with a headset microphone. They were trimmed from longer takes made for the [gap detection spike](../../../docs/research/gap-detection-spike.md). The coverage tests read them with no new dependency and frame them as the app's listener does (`tests/core/coverage-fixtures.test.ts`).

Each is 48 kHz, 16-bit, mono, with nothing else done to it. Times are seconds from the start of the clip. All the notes are written on the treble clef: the alto C sounds an octave higher, so written C4 sounds C5. Note times were measured with a throwaway script from the 5 ms level (a note is on while it is above -45 dB, blips under 100 ms left out) and from the detector's pitch track; the joins are the middle of each gap, or where the pitch changes for the slurred scale. Treat them as good to about 30 ms.

| Clip | Length | Holds | Written notes | First note starts | Joins | Last note ends |
| --- | --- | --- | --- | --- | --- | --- |
| `tongued-repeat.wav` | 3.4 s | One repeated note, tongued, with full stops between. The clip starts inside a note and ends inside one: the end of the sixth note of the take, the seventh whole, the start of the eighth. A 10 ms puff at the same pitch sits in the first gap (0.94 s): the messy release the spike found | C4, C4, C4 | 0.00 (cut) | 0.865, 2.74 | 3.40 (cut) |
| `held.wav` | 2.0 s | One note held, the middle of a longer hold. The tests treat it as two same-pitch notes | C4 (twice) | 0.00 | 1.00 | 2.00 |
| `tongued-scale.wav` | 3.45 s | A tongued scale, four notes, with tongued gaps of about 80 ms | C4, D4, E4, F4 | 0.17 | 0.925, 1.79, 2.625 | 3.40 |
| `slurred-scale.wav` | 2.7 s | A slurred scale in one breath, four notes. Almost every note was played about a semitone flat (heard as B4, C♯5, D♯5, F5 and so on where C5, D5, E5, F5 were meant); the user thinks it was a playing error | C4, D4, E4, F4 | 0.11 | 0.41, 1.19, 1.97 | 2.54 |

What the clips show, from the readings at the app's framing:

- **Sag:** the tongued notes start 10 to 30 cents flat of C5 and sag, reaching 60 to 100 cents flat towards the end of a note.
- **Sharp D:** in `tongued-scale.wav` the D sounds 60 to 80 cents sharp throughout.
- **Gaps:** the tongued gaps are full stops or dips to the noise floor. `held.wav` and `slurred-scale.wav` have no dip.

The recordings are the user's own playing. The full takes are not committed (`samples/` is untracked).
