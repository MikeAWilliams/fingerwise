# F14: hand checks

Do these once, at Closing, after both stories are built; `fw-execute` does not stop for them. Use Firefox on Linux desktop (Chrome too, if installed) with `make dev`. Nothing here needs playing: judging can stay off, except for one optional look with it on.

Paste this text into the Song section. It has three tunes, the second without a `T:`, `X:` numbers out of order, and different tempos and meters:

```
X:3
T: First tune, with a rather long title to test the ellipsis in the header
M:4/4
L:1/4
Q:1/4=70
C D E F | G2 G2 ||

X:1
M:3/4
L:1/4
E D C | D3 ||

X:7
T: Third
M:2/4
L:1/8
Q:1/4=100
G A B c | c4 ||
```

## Several tunes in the text (S01)

- The result line reads "3 tunes, 15 notes". Add a `B_` somewhere and check that ", 1 flat converted to a sharp" follows.
- Break the third tune (change `c4` to `c$4`). The problem reads "Tune 3, line 18, ..." and the line matches the editor's line number. The last good song stays: reopening Settings shows the saved text.
- Break the second tune with a chord `[CE]`. The problem names tune 2 and its note within that tune.
- The "No tempo in the tune" note shows only while tune 2 is chosen. Before S02, set `songTune` to 2 in the browser's storage (`fingerwise.settings`) and reload.
- One-tune text (the example song): the result line, the header and the problems look exactly as before.
- With `songTune` 3 stored, remove the third tune: tune 1 is chosen. With `songTune` 9 stored and reloaded: tune 1.

## The header list (S02)

- Use song on: a drop-down list replaces the title, showing "First tune, …", "Tune 2", "Third", with the chosen one selected. With one tune there is a title, or nothing without a `T:`. With use song off, and in Settings, there is no list.
- **Long title:** the list stays on one line with an ellipsis. Narrow the window to phone width (about 360 px, responsive design mode): no sideways scroll, and the list, tempo, Play song and Settings all fit. Note if the list gets too narrow to read.
- **Choosing, keep tempo on:** the start prompt shows the new tune, the header tempo changes (70, then 100 for Third; tune 2 shows the default 90), and the staff has the tune's own meter.
- **Choosing, keep tempo off:** the first card of the new tune appears. With judging on, the microphone opens again.
- **Mid-run:** during the count-in and while playing, the list is greyed out and cannot be opened. With Scoring "After the song", it is also greyed while listening past the end. On a finished score it works, and choosing a tune clears the lanes, summary, tuning line and analysis.
- **Playback:** press Play song, then choose another tune. Playback stops and the new tune's start prompt or first card shows.
- **Same tune:** choosing the tune already chosen changes nothing, and a running untimed card stays where it is.
- **No accidental start:** open the list by click and by keyboard (Tab, then Space or arrows), and choose a tune both ways. No run starts and no card steps. Then press Space: it opens the list again, because focus stays there. Note whether that feels wrong.
- **Reload:** the chosen tune is still chosen.
- **Edit:** with Third chosen, add a fourth tune. Third stays chosen. Delete tunes 2 to 4: tune 1 is chosen.

## Review points

- `src/abc/index.ts`: the warning-line mapping through `TuneBook`, and whether the per-tune code reads as cleanly as before the split.
- abc module doc: does dropping a file header's `L:`/`K:`/`M:` matter for the tunes you plan to paste? If so, it needs a follow-up story.
- Typing in a text of 15 or more tunes: does the Song section lag (ADR 0010's note on the 10,000-character limit)?
