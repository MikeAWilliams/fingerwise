# F17-S02: Load a song file

- **Feature:** `../design.md`
- **Modules:** `src/abc`, `src/app` (`song-form.ts`, `Settings.tsx`, Song section, `app.css`), `docs/architecture/`
- **Depends on:** F17-S01

## Story

As a player, I want to load a tune book from an ABC file, so that I do not have to copy and paste it, and a long or partly unreadable file still loads what it can.

## Acceptance criteria

Each item must be checkable and numbered so progress checklists can refer to it. Do not edit these once work starts; raise a change instead.
- **AC1:** Given the Song section in Settings, then it has a "Load from file…" button that opens the browser's file picker for `.abc` and `.txt` files.
- **AC2:** Given a file whose tunes all pass and that fits in 10,000 characters, when it is loaded, then its text replaces the text in the box unchanged, and it is checked, saved and used exactly as if it had been typed.
- **AC3:** Given a file with a tune that fails any check, when it is loaded, then that tune is replaced in the loaded text by its `X:` line and a `T:` line, and every other tune is kept as written.
- **AC4:** Given a replaced tune, then its `T:` is its first title, or "Tune N" (N its position in the file) when it had none, followed by " (not loaded: " and the kinds of problem found, each once, comma-separated, in this order: chords, grace notes, second voice, unmatched slur, D.C. or D.S., ABC errors, no notes, too many notes, out of range, unreadable; then ")". For example, "Foo (not loaded: chords, out of range)".
- **AC5:** Given every problem of a replaced tune, including those beyond the first 10 the Song section lists, then all their kinds are named.
- **AC6:** Given a file still over 10,000 characters after its failing tunes are replaced, when it is loaded, then the text is cut at the end of the last whole tune that fits, so no tune is cut in half, and the Song section shows "The file was too long: tunes 1 to K of N were loaded." until the text is next edited or Settings closes.
- **AC7:** Given text before the first `X:` or between tunes, then it is kept as it is and counts towards the 10,000 characters.
- **AC8:** Given a file where no tune passes, or whose first tune alone is over 10,000 characters after replacement, or that cannot be read as text, when it is loaded, then the box and the saved song do not change, and the Song section shows "No tune in the file could be loaded.", "The first tune is longer than 10,000 characters." or "The file could not be read." in turn.
- **AC9:** Given a file is loaded and saved, then the chosen tune follows the same position rule as an edit of the text (ADR 0010, then F17-S01's step past dropped tunes), and the app is affected as by changing the song in Settings.
- **AC10:** Given the file picker is opened and cancelled, then nothing changes and no message is shown.
- **AC11:** Given a browser with `showOpenFilePicker` (Chrome or Edge on desktop), when the button is pressed, then the app opens that picker with a fixed `id` and the `.abc` and `.txt` types, so a second press starts in the folder the last file was loaded from.
- **AC12:** Given a browser without `showOpenFilePicker` (Firefox, Safari, phones), when the button is pressed, then a plain file input for `.abc` and `.txt` files is opened instead, and loading works as in AC2 to AC9.
- **AC13:** Given the change, then `make verify` passes, and the `abc` and `app` module docs describe loading a file, the two pickers, the kinds of problem, the replacement and the cut.

## Notes

- [ADR 0013](../../../architecture/decisions/0013-dropped-tunes-from-a-file.md): failing tunes are replaced first, then the text is cut, so more tunes fit.
- Reading a file uses the browser's picker and `File.text()`, in `src/app`; `src/abc` takes and returns strings.
- A web page is never told a file's path, so the starting folder is kept by the browser, not the app (see the design's [loading a file](../design.md#behavior)). `showOpenFilePicker` may be missing from TypeScript's DOM types; a small local declaration covers it, with no new dependency. Its cancel is an `AbortError`, which is not an error to show.
- Read tune by tune and stop once the text is full, so a large tune book does not lock the page.

## Test approach

Adapter tests (Node, no DOM) on loader input strings: every kind of problem and its label; several kinds in one tune, in order; more than 10 problems in one tune; an untitled failing tune; the cut at a tune boundary, with the count; a file header and prose between tunes; every tune failing; a first tune too long; CRLF. `song-form` tests for the messages. By hand with `make dev`: load a real tune book file, check the dropped titles in the box and the header list, and the too-long message. In Firefox and in Chrome, load a file from a folder, press the button again and check that the picker starts in that folder; cancel once and check nothing changes.
