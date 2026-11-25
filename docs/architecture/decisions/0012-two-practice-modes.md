# 0012: Two practice modes, flashcards and song; songs no longer set the card order

- **Status:** accepted
- **Date:** 2026-11-25

## Context
Settings grew by feature: Cards, Sound, Microphone and Song sections, each grouping controls by what they do. What they add up to is one of two ways of practising, random flashcards or a song, but nothing says so. Use song, keep tempo, play note and the delays combine into states that are hard to predict. Some combinations do nothing (keep tempo with use song off). Others are odd: a song can set the flashcard order ([F05](../../features/05-songs/design.md)), giving one-note song cards with a tone after each correct note ([F07](../../features/07-song-practice/design.md)), while the same song is also shown whole and in time under keep tempo ([F08](../../features/08-timed-play-along/design.md), [F10](../../features/10-scrolling-song-view/design.md)).

The one-note song card was still useful: practising a tune note by note with no time pressure. The user decided on 2026-11-25 to make the mode the first choice, to drop song order for flashcards, and to rebuild note-by-note practice inside song mode ([F16 design](../../features/16-setting-clarification/design.md)).

## Decision
- **Two modes.** The player chooses **Flashcards** or **Song**, and that is the first control in Settings. Each setting belongs to the mode it affects and is shown only under it. Microphone settings apply to both.
- **Flashcards are random only.** Cards come from the range, uniformly or by need ([ADR 0007](0007-smart-sampling-by-need.md)). A song never sets their order. Play note, its delays, the reveal delay, auto-advance and progress belong to Flashcards.
- **Song mode always shows the whole song**, as F10 draws it, and never plays a note except through Play song ([F13](../../features/13-play-the-song/design.md)).
- **Two kinds of song practice**, chosen in a list that replaces the keep tempo checkbox:
  - **Tempo:** keep tempo as built (F08 to F12, [ADR 0009](0009-timed-songs-scored-by-coverage.md), [ADR 0011](0011-release-allowance.md)), unchanged.
  - **Single note:** the play head stays on one note with no clock. With the microphone on, a tone that stays within tolerance for at least 75% of the note's written length at the tempo moves it on. Duration counts towards the pass, softly: a right note that is too short gets one short message and another try. With the microphone off, the fingering shows after a delay and the head moves on after a second delay. The fingering is drawn on the staff, in a strip under every line.
- **Single note has its own delays.** They repeat the flashcard reveal and advance delays, but they are separate settings, because they act in a different place.
- **Old settings carry over.** Use song off becomes Flashcards. Use song on becomes Song, with keep tempo choosing Tempo (on) or Single note (off).

## Alternatives considered
- **Keep the sections and grey out what does not apply:** this is what grew so far. Every control stays in view, but the player still has to work out which combination gives which practice.
- **Keep song order for flashcards next to song mode:** it keeps the one-note card, but leaves two ways to practise a song that behave differently, one of them playing a tone after each note.
- **Random cards drawn from the song's notes:** a pool from a tune is a range setting in disguise, and no one asked for it.
- **Single note only with the microphone:** simpler, but with judging off, or the microphone blocked, there would be nothing to do. With delays it still works as a self-check.
- **The fingering in the pinned bar:** stable and cheap, but far from the note being read. The user wanted it near the line.

## Consequences
- F05's songs as note order and F07's one-note song card, waiting, hint and skip are removed when F16 is built. Neither was an ADR, so this supersedes none. Their designs and the glossary get pointers.
- The drill engine loses `nextInOrder`. The layer rule is unchanged: the pass rule for a Single note tone is pure core code that knows pitch, tolerance and timings, never staff, audio or UI.
- The [settings](../modules/settings.md) module swaps `useSong` and `keepTempo` for the mode and practice, gains Single note's two delays, and maps old stored data. The [app](../modules/app.md) module's Settings view, flows, header and song view change. Both are updated when built.
- Single note lines are taller, because of the fingering strip, so fewer fit the screen. That is accepted, since there is no time pressure.
