# F17: Load a song file

- **Status:** designed

> A quick fix (`quick-fix/load-abc-song-file`), shaped in dialog on 2026-11-25. The user wanted to load a tune book from a file instead of pasting it, and found that real files are often too long or hold tunes the app cannot read.

## Goal

The Song section in Settings has a button that loads an ABC file into the song text, replacing what is there. A file that is too long is cut at the end of the last whole tune that fits. A tune the app cannot read is kept as a **dropped tune**: its music is removed and its title says what was wrong. The rest of the file loads. The rules are recorded in [ADR 0013](../../architecture/decisions/0013-dropped-tunes-from-a-file.md).

## Behavior

**Dropped tunes in the song text**

- A tune whose text is just an `X:` line followed by a `T:` line is a dropped tune. It is not "No notes found": the text passes when every other tune passes and at least one tune passes. A text where every tune is dropped fails with "No notes found", as an empty text does today.
- The header's tune list shows a dropped tune in its place, by its title, greyed out so it cannot be chosen (*default*: a disabled option in the native list). Tune numbers still follow the text.
- A saved position that lands on a dropped tune loads as the first tune that passes. Editing the text keeps [ADR 0010](../../architecture/decisions/0010-several-tunes-in-one-text.md)'s position rule, then applies the same step.
- The accepted line counts dropped tunes apart: "28 tunes (5 not loaded), 640 notes" (*default*). Notes and conversions are totalled over the tunes that passed.
- Typed or pasted text is otherwise as strict as today. Only that exact two-line shape counts as dropped.

**Loading a file**

- The Song section has a "Load from file…" button (*default* wording) next to the text box. It opens the browser's file picker for `.abc` and `.txt` files (*default*). The file's text replaces the text in the box. It is then checked and saved as a typed text is, and the box shows the loaded text, dropped tunes included.
- **Failing tunes become dropped tunes.** Each tune that fails any check (chords, grace notes, a second voice, a slur left open or never opened, D.C. or D.S., an abcjs warning, no notes, too many notes, a note out of range, unreadable) is replaced by its `X:` line and a `T:` line. The title is the old title, or "Tune N" (N its position in the file) when it had none, followed by the kinds of problem found (decided 2026-11-25): "Foo (not loaded: chords, out of range)".
- The kinds are short labels, one per kind, listed once each in the order of the list above (*default*): chords, grace notes, second voice, unmatched slur, D.C. or D.S., ABC errors, no notes, too many notes, out of range, unreadable.
- **Too long.** After failing tunes are replaced, a text over 10,000 characters is cut at the end of the last whole tune that fits, so no tune is cut in half. The Song section then says so below the box (*default*: "The file was too long: tunes 1 to 23 of 40 were loaded."), until the text is next edited or Settings closes.
- Text before the first `X:` (a file header) and prose between tunes are kept as they are, and count towards the length.
- **Nothing to load.** When no tune in the file passes, or the first tune alone does not fit in 10,000 characters, the box and the saved song are not changed, and the Song section says why (*default*: "No tune in the file could be loaded." or "The first tune is longer than 10,000 characters."). A file that cannot be read as text says "The file could not be read." (*default*).
- Loading a file behaves as an edit of the text: the same position rule, and the same effect on the app as changing the song in Settings.

## Out of scope

- Cutting or dropping tunes in text typed or pasted into the box. That text keeps today's rules, apart from accepting dropped tunes.
- Raising the 10,000-character or 500-note limits.
- Loading from a URL, dragging a file onto the page, or loading several files at once.
- Saving the song text back to a file.
- Fixing a dropped tune: its music is gone, and the player reloads or pastes a fixed version.

## Modules touched

- **abc (`src/abc`):** recognises a dropped tune and returns it in its place with its title and no song. Gives each problem a kind, so the loader can name the kinds. A file-loading function that replaces failing tunes and cuts the text to the limit, returning the new text and what was cut, or the reason nothing loaded.
- **app (`song-form.ts`, `Settings.tsx`, Song section):** the "Load from file…" button and file picker, the cut and nothing-to-load messages, the accepted line with dropped tunes, and skipping dropped tunes when choosing the position.
- **app (`App.tsx`, `header-text.ts`):** the song state holds the dropped tunes in their positions, and the header's list greys them out.

The song core, settings, drill engine, judge, coverage, analysis and detector are unchanged: a dropped tune has no `Song`.

## Data

- No new settings. `songAbc` holds the loaded text, dropped tunes included, at most 10,000 characters.

## Risks and open questions

- **Splitting a file into tunes.** The cut and the replacement work on each tune's text. The adapter already splits on `\nX:`; the loader must split the same way, so that its positions match the problems.
- **Large files.** A tune book of many thousand lines is read tune by tune, and reading can stop once the text is full, so a big file does not lock the page.
- **What abcjs warns about.** A tune that loads elsewhere may still give abcjs warnings here, and so be dropped as "ABC errors". That is the existing rule; the label just makes it visible.

## Stories

In build order (written 2026-11-25). Each story is visible or testable on its own.

- [F17-S01: Dropped tunes in the song text](stories/F17-S01-dropped-tunes.md)
- [F17-S02: Load a song file](stories/F17-S02-load-a-song-file.md)
