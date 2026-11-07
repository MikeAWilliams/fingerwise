# F05-S03: Song settings and validator

- **Feature:** `../design.md`
- **Modules:** `src/core/settings`, `src/app`, `data/settings/`, `docs/architecture/`
- **Depends on:** F05-S02, F03-S01, F03-S04

## Story

As a player, I want to paste a tune into the settings and be told whether it can be used, so that I can drill my own tunes.

## Acceptance criteria

Each item must be checkable and numbered so progress checklists can refer to it. Do not edit these once work starts; raise a change instead.
- **AC1:** Given `data/settings/defaults.json`, then it also holds use song (off) and an empty song text, and the strict defaults parse accepts it. The strict parse rejects a defaults file with use song on or a non-empty song text.
- **AC2:** Given stored or default settings where use song is missing or not a boolean, or the song text is missing, not a string, or over 10,000 characters, when validated, then that setting alone resets to its default and the other settings are kept. `src/core/settings` does not parse ABC.
- **AC3:** Given settings saved before this story, when the app loads, then they are kept, use song is off and the song text is empty.
- **AC4:** Given stored settings with use song on and a text that no longer passes the validator or is empty, when the app loads, then the app (not `src/core/settings`) parses the text once with the adapter (S02), turns use song off and keeps the text. A text that passes gives the `Song` used by the card flow.
- **AC5:** Given the settings view, then a "Song" section (F03-S01) has a song text box, a help line, a link to `https://editor.drawthedots.com/` that opens in a new tab, a use song toggle, and no drawing of the song.
- **AC6:** Given text typed or pasted into the box, then the validator reports the result as it changes: on success, the note count and the number of flats converted; on failure, the list of problems with their positions (S02). Both are readable by a screen reader, and the Song section is open while problems show.
- **AC7:** Given a text that passes, then it is saved with the other settings under the same `localStorage` key. Given a text that fails, then the last good song stays saved, and the problems stay shown until the text is fixed or the view closes. A failing text is not kept: when the view opens again, the box shows the saved song.
- **AC8:** Given an emptied box, then the song is removed and use song turns off.
- **AC9:** Given no valid saved song, then the use song toggle is disabled.
- **AC10:** Given use song on, then the note range pickers and the include-sharps toggle in the Cards section are disabled with a line saying a song is in use. Their values are kept for when it is turned off.
- **AC11:** Given the change, then `make verify` passes, the `settings` and `app` module docs describe what was built, and `data-formats.md` documents the new fields.

## Notes

- Mirrors F03-S04 for the stored fields. The song text is stored as typed, so it can be edited later.
- The validator needs the instrument's written range, which the settings view already has.
- Nothing plays from the song until S04.

## Test approach

Unit tests in `core/settings` for the field rules and old data, and form-logic tests for the apply/keep-last-good behavior and the messages. The text box, link, disabled states and screen-reader text are checked by hand in the browser.
