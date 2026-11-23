# F09-S01: Slurs in the song

- **Feature:** `../design.md`
- **Modules:** `src/core/song`, `src/abc`, `docs/architecture/`
- **Depends on:** none

## Story

As a player whose tune has slurs, I want the song to know which notes are slurred together, so that a slurred passage is scored as a slur and not as notes that failed to separate.

## Acceptance criteria

Each item must be checkable and numbered so progress checklists can refer to it. Do not edit these once work starts; raise a change instead.
- **AC1:** Given a song note, then it records whether it is slurred to the next played note. `createSong` accepts the field and treats a missing one as not slurred, so existing callers and tests are unchanged.
- **AC2:** Given ABC with slurs, when it is parsed, then a played note is slurred to the next exactly when [the slur spike's rule](../../../research/abcjs-slur-spike.md#proposed-rule) says so: slurred to its written next by slur depth (after a tied group's last note), the next played note is that written next note, and no rest lies between them.
- **AC3:** Given each case in the spike's tables (a nested slur, a slur across a bar line, across a line break, inside a triplet, ending on a tied note, a dotted slur, a slur into a first ending with a second ending, a slur over a rest, `!tenuto!` with no slur), then the slurred flags are as the spike's "right answer" gives, and the audio sequence's `endType` is not used.
- **AC4:** Given a repeated passage containing a slur, then each play of it has the same slurred flags, and the join from the end of the passage back to its start is not slurred unless rule AC2 makes it so.
- **AC5:** Given a slur still open at the end of the tune, then the song is rejected with the problem "Slur opened here is never closed" at the opening note's line, note and column.
- **AC6:** Given a close with no slur open, then the song is rejected with the problem "Slur closed here was never opened" at the closing note's line, note and column.
- **AC7:** Given a tune with no slurs, then every note is not slurred, and the song's pitches, starts, lengths, tempo, meter and first bar are unchanged from before.
- **AC8:** Given the change, then untimed song cards (F05, F07) and timed songs behave as before; nothing reads the field yet.
- **AC9:** Given the change, then `make verify` passes, and the `song` and `abc` module docs describe the field, the rule and the two new problems.

## Notes

- abcjs gives no warning for unbalanced slurs, so the adapter counts them itself.
- Dotted slurs count as slurs.
- `src/core/song` stays free of ABC: it only holds the flag.

## Test approach

Unit tests in `tests/abc/abc.test.ts` with every input from the spike's tables written out, plus the two problems with positions. A `tests/core/song.test.ts` case for the default. No browser check needed.
