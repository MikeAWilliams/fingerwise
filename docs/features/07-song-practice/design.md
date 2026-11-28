# F07: Song practice

- **Status:** done

> The one-note song card with waiting, hint and skip is to be replaced by Single note practice in [F16](../16-setting-clarification/design.md) ([ADR 0012](../../architecture/decisions/0012-two-practice-modes.md)). The example song stays.

## Goal

Two small follow-ups to [F05](../05-songs/design.md). With judging on, a song waits for the player to play each note correctly instead of moving on after a wrong note or a timeout, so working through a tune becomes "play it right to continue". And the app ships an example song, so use song can be tried at once without pasting a tune first.

## Behavior

**Wait for the correct note** ([F07-S01](stories/F07-S01-wait-for-the-correct-note.md), [F07-S02](stories/F07-S02-hint-while-waiting.md))

- Applies only while use song and judging are both on and the microphone stream is running. Random cards, songs with judging off, and any card whose listening is `opening`, `locked` or `unavailable` behave exactly as after F05.
- A song card is **waiting** from its appearance until the correct note is played or the player skips. The listening window stays open the whole time, with the [hold-off](../../glossary.md) at the card's appearance as in F04.
- **Wrong note:** an incorrect tone shows its verdict row (icon, "Incorrect", the judged note such as `D5 −12¢`) and the pitch graph for about 1 second, then they clear. The card stays and keeps listening. The tracker is reset when the wrong verdict is shown, so its hold-off applies again; a player still holding the wrong note gets a fresh verdict at most every hold-off plus settle time (about 0.7 s), not a flicker. A new verdict during the 1 second replaces the old one.
- **Correct note:** the card reveals as in F04 (verdict, graph, note letter, tablature), the F03 tone plays after its sound delay, and with auto-advance on the next song note comes after the advance delay; with it off the card stays until a tap. Listening closes, so the tone is never judged.
- **Hint:** when the reveal delay runs out while waiting, the note letter and tablature appear as a **hint**. The card keeps waiting and listening. No tone plays (the microphone would hear it) and no advance timer starts. A wrong note during the hint shows its verdict under the hint as above.
- **Tap (click, tap or key):** keeps the two-step pattern. On a waiting card without the hint, a tap shows the hint at once. On a card showing the hint, a tap **skips**: the next song note is dealt at once, with no tone. On a card revealed by a correct note, a tap advances as today.
- Opening Settings, turning judging off, or hiding the page stop the flow as in F04; the song restarts from its first note when the drill is shown again, as in F05.

**Example song by default** ([F07-S03](stories/F07-S03-example-song-by-default.md))

- The defaults file holds "Mary Had a Little Lamb" (the text F05 showed only as a greyed placeholder) as the song text, with use song still off. The Song section shows it in the box, the validator accepts it, and the use song toggle is enabled at once.
- An empty stored song text loads as the example. Clearing the box and leaving it empty therefore brings the example back on the next load; to drop it, the player replaces it with their own tune. While the box is empty in the open view, there is no valid song, so use song is disabled (and turned off, as in F05), and the greyed example shows as before.
- This replaces F05's empty default and its "never saved or played" example ([F05-S03 AC1](../05-songs/stories/F05-S03-song-settings-and-validator.md) and AC3, and the bundled-song line in [F05's out of scope](../05-songs/design.md#out-of-scope)). F05's story files are not edited; this feature supersedes those points.

## Out of scope

- Waiting for random cards. Only songs wait.
- Rhythm, timing or a playhead (feature 8).
- Storing grades or counting attempts. How song cards feed feature 6, if at all, is feature 6's question.
- A setting to turn waiting off. Use song with judging on always waits.
- Several songs, a song list or a song picker.

## Modules touched

- **app (`card-flow.ts`):** a wait option. With it on and listening running, an incorrect tone shows a short-lived verdict and resets the tracker instead of revealing; the reveal timer shows a hint instead of a final reveal and keeps the window open; `step()` on a hinted card deals the next card without a tone. The state gains a way to tell a hint from a final reveal and to carry the passing wrong verdict.
- **app (`App.tsx`):** turns the wait option on when use song and judging are both on with a song in use.
- **app (`Card.tsx`):** renders the hint and a passing wrong verdict.
- **settings (`src/core/settings`):** the strict defaults parse accepts a non-empty song text; validation maps an empty stored song text to the default's. Settings still never parse ABC.
- **app (`song-form.ts`):** the example text lives in the defaults file; the placeholder reads it from there rather than holding a second copy.
- **Data:** `data/settings/defaults.json`.

The drill engine, judge, audio, staff and tab modules are untouched.

## Data

- `data/settings/defaults.json`: `songAbc` becomes the example tune; `useSong` stays `false`.
- Stored settings: no new fields. A stored `songAbc` of `""` now loads as the example.

## Risks and open questions

- **Verdict display time:** about 1 second is a starting value, not a setting; tune it in the live check.
- **Hint timing with long delays:** with a long reveal delay the hint is late; that is the reveal delay's job and needs no extra setting.
- **Reveal area height:** the hint plus a wrong verdict and graph must fit the judging reveal area without moving the staff.

## Stories

- F07-S01: Wait for the correct note
- F07-S02: Hint while waiting
- F07-S03: Example song by default
