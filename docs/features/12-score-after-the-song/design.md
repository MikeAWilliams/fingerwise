# F12: Score after the song

- **Status:** designed

> Shaped in dialog on 2026-11-23, alongside [F11: Score analysis](../11-score-analysis/design.md). The user wanted to play a song as a performance, from the music alone, and be judged afterwards, the way their recording of "Mary Had a Little Lamb" was analysed after the fact.

## Goal

The player can choose to play a timed song from the music alone, with the count-in and metronome but no playhead, lanes or live readout, and get the whole score at the end: every line's lane, trace and fault marks, the summary, the tuning list and the score analysis. If they fall behind the tempo, they are not cut off at the last beat: everything they played is shown.

## Behavior

**The setting**

- A **Scoring** list in Settings, next to metronome, with two choices: **Live feedback** (the default, [F09](../09-timed-scoring/design.md) as built) and **After the song** (decided 2026-11-23, over a switch, a toggle in the pinned bar or other names).
- It applies only with use song, keep tempo and judging all on. Otherwise it is greyed out and keeps its value, as metronome does.
- It is stored with the other settings. Stored data without it loads as Live feedback.

**While playing (After the song)**

- The count-in and the metronome (when on) as now.
- The music as in [F10](../10-scrolling-song-view/design.md): every line drawn, the page following the song, scrolling locked. The note to play is black and the rest grey, as now.
- No playhead, no lanes and no live readout (decided 2026-11-23): like a music stand, the player keeps time from the clicks alone.
- The [pinned bar](../../glossary.md) shows one quiet line, such as "Scoring after the song" (*default*).
- The microphone is read exactly as for Live feedback and with the same [scoring lag](../../glossary.md). Only the readings and level blocks are kept, in memory, for this run (decided 2026-11-23). No audio is stored, so the [audio module's privacy rule](../../architecture/modules/audio.md#privacy) stands. The same playing gives the same score in either mode.

**When listening stops**

- Listening carries on past the song's last beat. It stops when both are true (decided 2026-11-23):
  - the last note's slot has ended, plus the scoring lag;
  - there has been 1 s of silence, silence as the coverage core classifies it (any reading that fails the judge's checks).
- As a safety net it stops anyway 10 s after the last slot ends, so room noise cannot keep it listening.
- The metronome stops at the song's last beat; nothing clicks during the overrun.
- During the overrun the pinned bar says so, such as "Listening… stop playing to see your score".

**At the end**

- Every line's lane, pitch trace and fault marks appear at once, as F09 would have drawn them live, with the summary, the tuning list and the [F11 analysis](../11-score-analysis/design.md).
- **Overrun lane:** anything played after the song's last note is shown in a short extra lane under the last line, labelled "after the end", on the same time-to-x scale. With no note expected there, its trace shows each sounding reading's offset from its nearest note. It is drawn only when something sounded there. It does not change coverage or any other figure: the coverage core already leaves readings after the last note out of every segment.
- The analysis adds one line when there was an overrun, such as "You played 1.8 s past the end", next to F11's tempo drift line.
- Then as now: the view stays on the last line, scrolling unlocks, and a tap on the start prompt starts again, clearing the lanes, the overrun lane and the analysis.

**Edge cases**

- Stopping mid-song (opening Settings, hiding the page, turning judging off) discards the readings and judges nothing (*default*), as an interrupted Live feedback run shows no score.
- The microphone unavailable or denied: as F09 with judging on.
- Nothing graded: "End of song", no lanes, no analysis, as F09.
- Live feedback is unchanged: it stops listening one lag after the last slot, as now.

## Out of scope

- Keeping the audio, or playing the recording back. A possible later idea; it would need an ADR, because audio would be stored.
- Fitting the song's start time to the playing after the fact. The score uses the scoring lag exactly as Live feedback does, so a habit of starting late still shows.
- The overrun lane in Live feedback.
- Scoring the overrun, or re-aligning notes played late against the notes they were meant to be.

## Modules touched

- **settings (`src/core/settings`):** a `scoring` field, `"live" | "after"`, default live; validation that resets it alone; and a test like `metronomeApplies` for when After the song applies. The defaults file gains it.
- **app (`Settings.tsx`, `settings-form.ts`):** the Scoring list, greyed out when it does not apply.
- **app (`timed-flow.ts`):** in After the song, the run's progress is not drawn during play; listening carries on past the last slot until the stop rule is met; the metronome is not scheduled past the last beat; the result and segments go to the overlay at the end, with the readings after the last note for the overrun lane.
- **app (`SongOverlay.tsx`, `lane.ts`, `trace.ts`, `marks.ts`, `playhead.ts`):** no playhead or lanes during play in After the song; all rows drawn at once at the end; the overrun lane.
- **staff (`src/render/staff`):** room for the overrun lane under the last line, if the layout needs it.
- **analysis (from F11):** the overrun line.

The coverage core, judge, audio module and detector are unchanged. No ADR: nothing in [ADR 0009](../../architecture/decisions/0009-timed-songs-scored-by-coverage.md) or the privacy rule changes.

## Data

A new stored setting, `scoring`. The silence that ends listening (1 s), the cap (10 s after the last slot) and the overrun lane's span are code constants.

## Risks and open questions

- **Room noise and the stop rule.** A fan, a hum or the metronome's last click could pass the judge's checks and delay the stop until the cap. Check in the live check; the cap bounds it.
- **A long overrun lane.** Up to 10 s past the end at the song's time scale may be wider than a line. Decided in [F12-S04](stories/F12-S04-overrun-lane.md): cut at the line's width, with how much more there was.
- **Order.** F12 works without F11 but is meant to show F11's analysis at the end, so it is built after F11.
- **Memory.** About 60 readings and 375 level blocks a second: a three-minute tune keeps roughly 11,000 readings and 68,000 blocks. Small, but check on a phone later.

## Stories

In build order (written 2026-11-23), after F11. Each story is visible or testable on its own.

- [F12-S01: The Scoring setting](stories/F12-S01-scoring-setting.md)
- [F12-S02: Music only, judged at the end](stories/F12-S02-music-only-judged-at-the-end.md)
- [F12-S03: Listening past the end](stories/F12-S03-listening-past-the-end.md)
- [F12-S04: The overrun lane](stories/F12-S04-overrun-lane.md)
