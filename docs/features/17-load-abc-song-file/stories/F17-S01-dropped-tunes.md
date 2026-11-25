# F17-S01: Dropped tunes in the song text

- **Feature:** `../design.md`
- **Modules:** `src/abc`, `src/app` (`song-form.ts`, Song section, `App.tsx`, `header-text.ts`), `docs/architecture/`
- **Depends on:** none

## Story

As a player, I want a song text to keep a tune that could not be loaded as a titled placeholder, so that the rest of a tune book still works and I can see what was left out.

## Acceptance criteria

Each item must be checkable and numbered so progress checklists can refer to it. Do not edit these once work starts; raise a change instead.
- **AC1:** Given a song text where one tune is just an `X:` line followed by a `T:` line, and every other tune passes, then the text is accepted and saved, and no "No notes found" problem is reported for that tune.
- **AC2:** Given a song text where every tune is just an `X:` line and a `T:` line, then the text fails with "No notes found", and the last good song stays saved.
- **AC3:** Given a tune with an `X:` line, a `T:` line and anything else (another header line, a comment, a note), that fails a check, then the text fails as today; only the exact two-line shape is a dropped tune.
- **AC4:** Given an accepted text with dropped tunes, then the Song section's result reads "N tunes (D not loaded), M notes", N counting every tune and D the dropped ones, with M and the flats converted totalled over the tunes that passed. With no dropped tunes, the line is as it is today.
- **AC5:** Given song mode and an accepted text of two or more tunes with at least one dropped, then the header's tune list shows every tune in text order, the dropped tunes by their `T:` title and greyed out, and a dropped tune cannot be chosen.
- **AC6:** Given a saved position that lands on a dropped tune, when the app loads or the text is edited, then the first tune that passes is chosen. Otherwise the ADR 0010 position rule is unchanged.
- **AC7:** Given a text with no dropped tune, then the app behaves as it does today.
- **AC8:** Given the change, then `make verify` passes, and the `abc` and `app` module docs describe dropped tunes.

## Notes

- [ADR 0013](../../../architecture/decisions/0013-dropped-tunes-from-a-file.md) records the rules.
- A dropped tune has no `Song`; the song core is unchanged.
- This story can be checked by typing a dropped tune into the box; F17-S02 makes them from a file.

## Test approach

Adapter tests (Node, no DOM): a dropped tune first, middle and last among passing tunes; every tune dropped; the near-miss shapes in AC3; CRLF line endings. `song-form` tests for the result line and the chosen position. By hand with `make dev`: paste three tunes with the middle one reduced to `X:` and `T:`, check the result line and the greyed entry in the header list.
