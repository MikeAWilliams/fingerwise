# F07-S03: Example song by default

- **Feature:** `../design.md`
- **Modules:** `src/core/settings`, `src/app`, `data/settings`, `docs/architecture/`
- **Depends on:** none

## Story

As a new player, I want an example song already in place, so that I can turn on use song and try it at once without finding and pasting a tune.

## Acceptance criteria

Each item must be checkable and numbered so progress checklists can refer to it. Do not edit these once work starts; raise a change instead.
- **AC1:** Given `data/settings/defaults.json`, then use song is off and the song text is the "Mary Had a Little Lamb" example, and the strict defaults parse accepts it. The strict parse still rejects use song on and still checks the text is a string within the length limit. This supersedes F05-S03 AC1.
- **AC2:** Given the defaults' song text, when it is read by the abc adapter, then it is a valid song with no problems (checked by a test).
- **AC3:** Given no stored settings, when the app loads and the Song section is opened, then the box holds the example, the validator shows its summary, and the use song toggle is enabled.
- **AC4:** Given the example in the box, when use song is turned on and the view closed, then the cards follow the example song as in F05.
- **AC5:** Given stored settings whose song text is empty, or settings saved before F05, when the app loads, then the song text is the example and every other setting is kept. This supersedes F05-S03 AC3.
- **AC6:** Given the player clears the box in the open view, then there is no valid song as in F05 (use song disabled and turned off, the greyed example shown); on the next load the example is back.
- **AC7:** Given the change, then the example text exists once in the code and data (the defaults file); the greyed placeholder uses the same text.
- **AC8:** Given the change, then `make verify` passes, and the `settings` and `app` module docs and `data-formats.md` describe the new default.

## Notes

- `src/core/settings` still never parses ABC; AC2 is a test outside it.
- A stored non-empty text is kept as it is, valid or not, as in F05.

## Test approach

Settings unit tests: the strict parse accepts the new defaults and still rejects use song on; an empty or missing stored text becomes the default's and other fields are kept. A test that parses the defaults' song text with the abc adapter. By hand: a fresh profile shows the example and use song turns on at once; clearing the box disables use song and the example returns after a reload.
