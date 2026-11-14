# 0008: Songs keep note lengths, tempo and meter

- **Status:** accepted
- **Date:** 2026-11-14

## Context
Feature 5 kept only a song's pitches: lengths and meter were read so abcjs got the pitches right, then dropped ([F05 design](../../features/05-songs/design.md#out-of-scope)). Feature 8 plays a song in time, each card lasting as long as its note at the tune's tempo ([F08 design](../../features/08-timed-play-along/design.md)), so the song needs its rhythm. The user decided on 2026-11-14 that the tempo comes from the ABC, not from a setting.

## Decision
- **Same source as the pitches.** The abc adapter reads each note's start and length from the abcjs audio sequence it already uses ([ADR 0006](0006-abcjs-for-songs.md)), so ties, triplets and repeats with endings come out as abcjs plays them. ADR 0006 stands; this adds fields to what is read.
- **Slots from starts.** A note's slot runs from its start to the next note's start, so a rest's time goes to the note before it. Rests before the first note are dropped. The last note's slot is its own length.
- **Tempo and meter from the tune.** The first `Q:` gives the tempo, converted to quarter notes per minute; whether the tune had one is read from the parse tree, not inferred from abcjs's own default. The first `M:` gives the meter. A later `Q:` or `M:` is ignored.
- **Defaults:** no `Q:` means ♩ = 90; no `M:` or free meter means 4/4. Both are code constants. A tune without them is valid.
- **Core shape:** in `src/core/song`, a note has a pitch and a length in quarter-note beats; the song has a tempo (or none) and a meter. Turning beats and tempo into milliseconds, and a meter into count-in beats, is pure core code. Core still knows nothing of ABC.

## Alternatives considered
- **A tempo setting instead of `Q:`:** one control for every tune, but the tune already says how fast it goes, and editing `Q:` is a single number. The user chose the ABC.
- **Lengths from the parse tree:** documented output, but it means rewriting ties, triplets, repeats and endings, the same reason ADR 0006 rejected it for pitches.
- **Rests as their own cards:** shows the silence, but needs drawing rests on the staff, a new rendering job; folding them into the note before keeps one note per card.

## Consequences
- `Song` changes shape; [song.md](../modules/song.md), [abc.md](../modules/abc.md) and the glossary's "Song" are updated when built. Untimed song cards (F05, F07) ignore the new fields.
- The adapter depends on more of abcjs's undocumented audio sequence (start and duration as well as pitch). The exact pin and the adapter's tests guard it.
- A tune with several tempos or a meter change plays at its first one.
- Swing and other performance timing are not modelled; notes are played as written.
