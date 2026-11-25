# F17 hand checks

Run with `make dev` in Firefox and Chrome on Linux. The adapter and the helpers are covered by tests; these are the parts only the screen and a real file picker can check.

## S01: Dropped tunes in the song text

- [ ] Paste three short tunes into the Song box, then cut the middle one down to its `X:` and `T:` lines. The text is accepted: "3 tunes (1 not loaded), N notes", N counting only the other two.
- [ ] Song mode, header tune list: all three in order, the middle one greyed out and not choosable, by keyboard too.
- [ ] Choose tune 2 while it passes, then cut it to `X:`/`T:`: tune 1 is chosen. Make tune 1 the dropped one too: tune 3 is chosen. Reload: the same tune.
- [ ] Add a comment line to the dropped tune (`X:`, `T:`, `% note`): the text fails as before and the last good song stays.
- [ ] Reduce every tune to `X:`/`T:`: "No notes found", last good song kept.
- [ ] A text with no dropped tune looks and behaves as before.

## S02: Load a song file

- [ ] The Song section has "Load from file…" beside the box, and no sideways scroll in a narrow window.
- [ ] Load a small file that all passes: the box shows it unchanged and the song is used at once, as if pasted.
- [ ] Load a real tune book from the web (a few dozen tunes, some with chords or a second voice). The box shows each failing tune as two lines with "(not loaded: …)"; the kinds make sense for that tune. The header list shows them greyed out.
- [ ] A book over 10,000 characters: "The file was too long: tunes 1 to K of N were loaded." shows below the box; the box ends at a whole tune. Typing in the box clears the message; so does closing Settings.
- [ ] A file with no passing tune, and a binary file renamed `.abc`: the right message shows, the box and the song do not change.
- [ ] Cancel the picker: nothing changes, no message.
- [ ] Chrome: load a file from a folder other than Downloads, press the button again: the picker starts in that folder.
- [ ] Firefox: the same; note whether it starts in that folder (the browser decides).
- [ ] A large tune book (thousands of lines): loading does not freeze the page noticeably.

## Review points

- [ ] The dropped titles read well in the box and the header list; long titles do not break the header layout.
- [ ] `src/abc` still takes and returns strings only; reading files lives in `src/app`.
- [ ] Typed text gives the same problem lists as before (the `collectAll` option is only used by the loader).

### Tune these constants

- [ ] None in this feature.
