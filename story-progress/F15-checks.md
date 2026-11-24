# F15: checks by hand

Done once, at Closing, after all four stories are built. `make dev`, keep tempo on, judging on. Use the example song or any short tune of quarter and half notes on easy notes. Each playing ask is one short, slow take.

## Playing

1. **Tongued, slow (♩ = 60 to 75).** Play a few bars, tonguing each note and breathing where it feels natural. Expect: high coverage, few or no "ended early" marks, plain joins separated.
2. **Clipped on purpose, same tempo.** Play the same bars stopping each note at about half its length. Expect: "ended early" marks and lower coverage, as before F15.
3. **Faster tempo (♩ = 120 or more, set by editing `Q:`).** No need to play: start the song and let it run silent, or play a single long note. Look at the lane: halves and wholes now end a short way before the next note, and quarters end proportionally earlier.

## Looking

- **Lane.** Each note's grey segment ends before the next note, longer gaps after long notes. A slurred note runs to the next one. Rests look as before. The pitch trace still shows where you kept sounding past the segment's end.
- **Marks.** "Ended early" sits at the end of the shortened segment; "ended late" and "not separated" at the written join or end. A note across a line break: nothing drawn on the next row for its release alone.
- **Scoring after the song** and **judging off**: the lanes are shortened the same way.
- **Analysis.** After the tongued run, "Where the note time went" shows little or no "silent after the note stopped". Its in-tune share agrees with the score.
- **Play song.** Listen to the example song: notes before half-note gaps breathe more, slurs still join, the last note stops a little early. The tone ends where the lane segment ends.

## Review

- **Too generous?** After takes 1 and 2, decide whether 25% and half a quarter note feel right. The stricter options are a share of 20% or a cap of ⅜ of a quarter note (`RELEASE_SHARE`, `RELEASE_CAP_QUARTERS` in `src/core/song/index.ts`).
- **Code.** One span rule (`scoredSpan`) used by coverage and analysis; `song` imports nothing from `coverage`; `JOIN_GAP_MS` gone.
- **Docs.** `song`, `coverage`, `analysis` and `app` module docs describe the release and cite ADR 0011.
