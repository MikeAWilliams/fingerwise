# F14-S01: Several tunes in the song text

- **Feature:** `../design.md`
- **Modules:** `src/abc`, `src/core/settings`, `data/settings/defaults.json`, `src/app` (`song-form.ts`, Song section, `App.tsx`, `header-text.ts`), `docs/architecture/`
- **Depends on:** none

## Story

As a player, I want to paste a text holding several tunes into the Song section, so that I can keep a set of tunes in the app without pasting a new one each time.

## Acceptance criteria

Each item must be checkable and numbered so progress checklists can refer to it. Do not edit these once work starts; raise a change instead.
- **AC1:** Given a song text with two or more tunes, each starting with its own `X:` line, and every tune passing the checks a single tune passes today, then the text is accepted and saved, and no "more than one tune" problem is reported.
- **AC2:** Given a song text with several tunes where any tune fails, then the text is not saved, the last good song stays saved, and each problem leads with its tune's position in the text, as in "Tune 3, line 12, note 7: ...". The line is counted in the whole text, and the note within that tune. The list is cut to 10 problems plus "and N more problems", as today.
- **AC3:** Given a tune is numbered in a problem or label, then N is its position in the text (the first tune is 1), not its `X:` number, also when the `X:` numbers skip, repeat or run out of order.
- **AC4:** Given an accepted text with several tunes, then the Song section's result reads "N tunes, M notes", with M totalled over all tunes after repeats, followed by ", K flats converted to sharps" when K, totalled over all tunes, is above zero. Given a text with one tune, the result line is as it is today.
- **AC5:** Given a text over 10,000 characters, then it is rejected as today. Given a tune with more than 500 notes after repeats, then it is reported at its first note over, with its tune. Given several tunes that are each at most 500 notes but more than 500 together, then the text is accepted.
- **AC6:** Given the settings, then they hold the chosen tune's position, 1-based, with 1 in the defaults file. A missing value, one that is not a whole number of at least 1, or one past the last tune of the saved text loads as 1.
- **AC7:** Given use song on with an accepted text of several tunes, then the song (cards, timed runs, the header's title and tempo) is the chosen tune, with that tune's own notes, `T:`, `Q:` and `M:`. Given the chosen tune has no `Q:`, then the "No tempo in the tune" note shows in the Song section.
- **AC8:** Given tune 3 is chosen, when the song text is edited and the new text passes with at least 3 tunes, then tune 3 stays chosen. When it passes with fewer than 3 tunes, tune 1 is chosen. When it fails, the choice does not change.
- **AC9:** Given a text with one tune, then the app behaves as it does today.
- **AC10:** Given the change, then `make verify` passes, and the `abc`, `settings` and `app` module docs and `data-formats.md` describe several tunes, the problems with their tune, and the new setting.

## Notes

- [ADR 0010](../../../architecture/decisions/0010-several-tunes-in-one-text.md) records the rules. The rest of [ADR 0006](../../../architecture/decisions/0006-abcjs-for-songs.md) stands: each tune is read as one tune is read today.
- The tune cannot be chosen in the UI yet; F14-S02 adds the list in the header. To check AC7 and AC8 by hand before then, set the stored position in the browser's storage.
- Test text before the first `X:` (the ABC file header) and prose between tunes, and record what abcjs does with each in the `abc` module doc (see the design's [risks](../design.md#risks-and-open-questions)). If abcjs counts warning lines per tune rather than over the whole text, AC2 still requires the line in the whole text.

## Test approach

Adapter tests (Node, no DOM) on texts of two and three tunes: every tune's notes, title, tempo and meter written out; a failing tune at the start, middle and end, with its tune, line and note; `X:` numbers that skip, repeat and run backwards; the note limit per tune and not in total; the character limit; a file header; prose between tunes. Settings tests for the new field's default and fallbacks. `song-form` tests for the result line, the problem line and keeping the position on an edit. By hand with `make dev`: paste a text of three tunes, check the result line, then break one tune and read its problems.
