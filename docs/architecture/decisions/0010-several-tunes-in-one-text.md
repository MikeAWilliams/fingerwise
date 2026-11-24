# 0010: A song text may hold several tunes

- **Status:** accepted
- **Date:** 2026-11-24

## Context
[ADR 0006](0006-abcjs-for-songs.md) lists "more than one tune" among the rejections, so the player can paste only one tune. ABC allows a text to hold several tunes, each starting with its own `X:` line, and tunes are often shared that way. The user decided on 2026-11-24 to accept such a text and let the player pick one of its tunes in the header ([F14 design](../../features/14-tune-choice/design.md)).

## Decision
This replaces only ADR 0006's "more than one tune" rejection. The rest of ADR 0006 stands: abcjs, the deep import and exact pin, pitches from the audio sequence, and the parse tree used to reject and explain. Each tune is read as one tune is read today.

- **Every tune must pass.** A song text is saved only if every tune in it passes. A tune that fails makes the whole text fail, and each problem names its tune ("Tune 3, line 12, note 7: ..."). The rule that only a passing text is saved stays as it is.
- **Tunes are numbered by position.** Tune N is the N-th tune in the text, whatever its `X:` number. Tunes are offered in text order, and a tune without a `T:` line is labelled "Tune N".
- **The chosen tune is saved by position.** The player's choice is stored with the settings as a position. When the saved text changes, the same position is kept if the new text still has that many tunes, and tune 1 is chosen otherwise. A stored position past the end also loads as tune 1.
- **The song is the chosen tune.** Everything that reads the song (cards, timed runs, scoring, playback) reads the chosen tune's `Song`, with its own title, tempo and meter. The core song module is unchanged.
- **Limits.** The 10,000-character limit covers the whole text. The 500-note limit applies to each tune.

## Alternatives considered
- **Keep the tunes that pass:** saves a text when at least one tune passes and leaves out the tunes that fail. This is friendlier to a tune book copied from the web, but it adds a partly valid state to the Song section and to the saved text. The user chose the simpler rule; tunes are fixed in the linked editor, as before.
- **Label untitled tunes by their `X:` number:** this matches the source text, but `X:` numbers can skip, repeat or be out of order, so the labels would not follow the list.
- **Remember the chosen tune by title:** this survives reordering, but it is ambiguous when titles are missing or repeated.
- **Raise the character limit to hold a whole tune book:** 10,000 characters is about 15 to 30 tunes, enough for a practice set. abcjs reads every tune again on each edit, so a larger limit may make typing lag on a slow phone. It can be raised later.

## Consequences
- The abc adapter returns every tune's song, or the problems with their tune, instead of rejecting a second `X:`.
- The settings gain one stored field for the chosen tune, with a default and validation.
- The header shows a tune choice in place of the title when the text has two or more tunes.
- The [abc module doc](../modules/abc.md)'s rejection list and the [F05 design](../../features/05-songs/design.md#behavior) describe the one-tune rule. The module doc is updated when the feature is built. The F05 design stays as a record of what was built then.
