# F14: Tune choice

- **Status:** designed

> Shaped in dialog on 2026-11-24. The user wanted to paste several tunes in one ABC text, as the format allows, and switch between them from the header.

## Goal

The song text in Settings can hold several tunes. When it does, the song's title in the [pinned header](../../glossary.md) becomes a list of the tunes, in the order they appear in the text, and choosing one makes it the song. The rules are recorded in [ADR 0010](../../architecture/decisions/0010-several-tunes-in-one-text.md).

## Behavior

**Pasting several tunes**

- A text with several tunes, each starting with its own `X:` line, is valid ABC and is no longer rejected. Each tune is read and checked as a single tune is today.
- **Every tune must pass** before the text is saved (decided 2026-11-24). Each problem leads with its tune: "Tune 3, line 12, note 7: ...". The line is counted in the whole text, as the editor shows it, and the note is counted within the tune. The list is still cut to 10 problems plus "and N more problems".
- The accepted line reads "3 tunes, 64 notes, 2 flats converted to sharps" (*default*), with the notes and conversions totalled over all tunes. A text with one tune keeps today's line.
- The "No tempo in the tune" note refers to the chosen tune (*default*).
- **Limits** (decided 2026-11-24): 10,000 characters for the whole text, as today, and 500 notes for each tune after repeats.

**The tune choice**

- With use song on and **two or more tunes**, the header shows a list of the tunes where the title is now. It is a native drop-down list (*default*), one line, with long titles cut short by an ellipsis.
- The list shows every tune **in text order**. A tune with a `T:` line shows its title, and a tune without one shows "Tune N", where **N is its position** in the text, not its `X:` number (decided 2026-11-24).
- With one tune, the header is unchanged: the title, or nothing when there is no `T:`.
- Like the title, the list is hidden while Settings is open.

**Choosing a tune**

- Choosing a tune makes it the song, and the app behaves as it does on closing Settings with a new song (*default*): whatever was running stops, a finished run's score is cleared, and the app starts at the new tune's first note in its own mode. The header's tempo becomes the new tune's tempo, and the tune's own `M:` sets the meter.
- Choosing the tune that is already chosen changes nothing.
- The list is greyed out while a timed run is counting in, playing, or (with After the song) listening past the end, so a run cannot be lost by accident (*default*, the same rule as F13's [Play song](../13-play-the-song/design.md#behavior) button). It can be used on the start prompt, on a finished run's score, and at any time in untimed song practice.
- During [playback](../13-play-the-song/design.md), choosing a tune stops playback, as changing a setting does.
- Choosing a tune with the list is not also a start tap: it does not start a timed run or step a card.

**Remembering the choice**

- The chosen tune is saved with the settings, so it survives a reload (*default*).
- When the saved song text changes, the **same position is kept** if the new text has that many tunes, and tune 1 is chosen otherwise (decided 2026-11-24). A failing text does not change the choice, since it is not saved.
- A stored position that is not valid for the saved text loads as tune 1.

## Out of scope

- Keeping the passing tunes of a text where some tunes fail.
- Choosing the tune in Settings. The list is in the header only.
- Playing several tunes in a row, a set list, or shuffling tunes.
- A tune library kept apart from the song text, or importing tune files.
- Searching or filtering a long list of tunes.
- Remembering progress, scores or tempo per tune.

## Modules touched

- **abc (`src/abc`):** reads every tune in the text and returns each tune's song with its note count and conversions, or the problems, each with its tune. A second `X:` is no longer a problem. The 500-note limit applies to each tune.
- **settings (`src/core/settings`, `data/settings/defaults.json`):** a new stored field for the chosen tune's position, with a default of 1 and validation.
- **app (`song-form.ts`, Song section):** the accepted line for several tunes, the problem line with its tune, the no-tempo note for the chosen tune, and keeping the chosen position on a passing edit.
- **app (`App.tsx`, `header-text.ts`, `app.css`):** the song state holds every tune and the chosen one. The header shows the list in place of the title and greys it out by the rules above. Choosing a tune saves the choice and restarts the flow.

The song core, drill engine, judge, coverage, analysis and detector are unchanged: each tune is a `Song`, and they see only the chosen one.

## Data

- A new setting, the chosen tune's position in the song text, 1-based, default 1. A missing or invalid value loads as 1, as other fields fall back to their defaults. The field name is left to the breakdown.
- `songAbc` is unchanged: the whole text, as typed, at most 10,000 characters.

## Risks and open questions

- **Text before the first `X:`.** In ABC, the lines before the first tune form a file header whose fields apply to every tune. Whether abcjs applies them, and how its warning line numbers count across several tunes, has to be tested when the adapter is built.
- **Free text between tunes.** Tune books often have prose between tunes. abcjs may ignore it or warn about it. A warning is a problem, so such a text would be rejected until the prose is removed.
- **Narrow headers.** With F13's Play song button, the header holds the name, the list, the tempo, Play song and Settings. On a phone the list may need to shrink hard. F10 targets desktop, and phones only need no sideways scroll.
- **Order with F13.** This feature is numbered after F13, and F14-S02 depends on F13-S02 for the playback rule. If F14 is scheduled first, that story needs changing before work starts.

## Stories

In build order (written 2026-11-24). Each story is visible or testable on its own.

- [F14-S01: Several tunes in the song text](stories/F14-S01-several-tunes.md)
- [F14-S02: Choosing the tune in the header](stories/F14-S02-choose-in-header.md)
