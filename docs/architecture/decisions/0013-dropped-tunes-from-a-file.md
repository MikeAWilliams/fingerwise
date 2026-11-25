# 0013: Tunes that fail in a loaded file are kept as dropped tunes

- **Status:** accepted
- **Date:** 2026-11-25

## Context
[ADR 0010](0010-several-tunes-in-one-text.md) saves a song text only if every tune in it passes, and rejects "keep the tunes that pass". That suits text typed or pasted into the Settings box, where the player fixes each problem in place. The user now wants to load a song text from a file ([F17 design](../../features/17-load-abc-song-file/design.md)). A tune book file is often long and usually has some tunes this app cannot read (chords, a second voice, notes out of range). With ADR 0010's rule, one bad tune would block the whole file, and the player would have to fix a file they did not write. The user decided on 2026-11-25 that a failing tune in a loaded file is kept, with its music removed and a note added to its title.

## Decision
This replaces only ADR 0010's "every tune must pass" rule. The rest of ADR 0010 stands: tunes are numbered and chosen by position, the song is the chosen tune, and the limits are unchanged.

- **Dropped tune.** A tune whose text is just an `X:` line followed by a `T:` line is a *dropped tune*. It has no music and no `Song`. The file loader writes one in place of each tune that fails. Its title is the old title, or "Tune N" when there was none, followed by a short note on what failed.
- **When a text passes.** A text passes when every tune either passes or is a dropped tune, and at least one tune passes. A text where every tune is dropped fails, as a text with no notes does today.
- **Typed text stays strict.** Only that exact two-line shape counts as dropped. Any other failing tune still fails the whole text, so the Settings box works as it did. A player who types the shape by hand gets a dropped tune, which does no harm.
- **Dropped tunes are listed but cannot be chosen.** The header's tune list shows a dropped tune in its place, greyed out. Tune numbers still follow the text. A saved position that lands on a dropped tune loads as the first tune that passes, as does ADR 0010's fallback when the position is past the end.
- **Order on loading a file.** Failing tunes are replaced first, then the text is cut to the 10,000-character limit at the end of the last whole tune that fits. Replacing first makes the text shorter, so more tunes fit.

## Alternatives considered
- **Keep ADR 0010 for files too:** one failing tune rejects the file. This is simple, but a tune book from the web would rarely load.
- **Leave failing tunes out entirely:** the text holds only passing tunes. The text is clean and nothing new is needed in the adapter, but tune numbers no longer match the file, and the player cannot see what was left out or why.
- **Keep the failing tune's music and mark it unplayable:** the player could fix it in the box later. But then the saved text holds ABC that fails, and every load would have to tell a known failure from a new one. The user chose to drop the music.
- **Mark a dropped tune with a special comment or field instead of its shape:** this is more explicit, but it adds syntax of our own to the ABC. Two plain lines stay valid ABC that any other tool can read.

## Consequences
- The abc adapter treats a tune that is just `X:` and `T:` as a dropped tune, not as "No notes found", and returns it in its place among the tunes with its title and no song.
- The app's song state holds the dropped tunes in their positions. Choosing a tune and the saved-position rule skip them.
- The header's tune list shows dropped tunes greyed out. With one passing tune and one or more dropped tunes, the list still shows, since the text has two or more tunes.
- The Settings Song section gains a button that loads a file, replacing the text in the box.
- The [abc module doc](../modules/abc.md) and the [F14 design](../../features/14-tune-choice/design.md) describe ADR 0010's rule. The module doc is updated when the feature is built. The F14 design stays as a record of what was built then.
