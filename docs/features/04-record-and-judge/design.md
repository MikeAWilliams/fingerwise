# F04: Record and judge a single note

- **Status:** designed
- **Vision source:** `../../vision/vision.md#feature-order`

## Goal

With judging on, the player plays the note on their ocarina instead of only fingering it silently. The app listens through the microphone before the reveal, decides what pitch was played, grades the card correct or incorrect, and reveals at once. The reveal shows the verdict, the note that was heard and a graph of how the played pitch sits against the expected one.

## Behavior

**Listening**
- Judging is a setting, default off ([F04-S04](stories/F04-S04-judge-settings.md)). With it off the app behaves exactly as after [F03](../03-play-the-note/design.md).
- With it on, the microphone stream is open while the drill is showing, and is not reopened per card (that would cost start-up time on every card and flicker the browser's recording indicator). Readings are judged only in each card's **listening window**, from the card's appearance until its reveal. Readings during the reveal are ignored, so the tone from F03 is never judged.
- The expected pitch is the card's sounding pitch (written pitch plus the instrument's transposition, [ADR 0003](../../architecture/decisions/0003-written-pitch-and-transposition.md)). The microphone hears sounding pitch.
- Listening uses the same audio context as the F03 tone, so it is locked until the first click, tap or key press. While it is locked and judging is on, the card area shows "Tap or press a key to start listening". That gesture unlocks audio and acts as usual (it reveals the card, with "nothing heard"); listening starts from the next card. This is the only prompt to tap in the app, because judging, unlike the tone, would otherwise fail silently.
- While the stream is opening (including the permission prompt), the card is shown but its reveal delay and listening window wait until the stream runs or fails, so the prompt never counts against the player.
- The permission is requested the first time listening is needed. If it is denied or no microphone exists, the drill carries on as with judging off, and the card area shows a short notice that judging is unavailable ([F04-S05](stories/F04-S05-listen-before-reveal.md)).

**Judging one tone**
- Background rejection: a tone counts only when the detector reports a clear pitch (clarity above a threshold) with a level above a noise gate, held steady for a settle time (about 150 ms). This skips room noise, speech and the unsteady start of a breath. The thresholds are set by the spike ([F04-S01](stories/F04-S01-detector-spike.md)).
- The first stable tone decides the card. There is no second try on the same card.
- **Correct:** the detected pitch is in the same octave and within the tolerance, in cents, of the expected pitch. The tolerance is a setting, bounded below 50 cents so a tone nearer the neighbouring semitone (likely a wrong fingering) is never correct. Provisionally the bounds are 10 to 45 and the default 40; the spike may tighten them but not raise the upper bound to 50 or more.
- **Incorrect:** any other stable tone.
- A verdict triggers the reveal immediately, cancelling the reveal-delay timer.
- **No answer:** if the reveal delay ends with no stable tone, the card reveals as before with a neutral "nothing heard" state. It is not a miss.
- A click or key press before any verdict reveals early as today, also with "nothing heard".

**Reveal with a verdict**
- A verdict color and an icon (correct, incorrect, nothing heard); color is never the only signal.
- The judged note by name and offset, for example `C♯5 +23¢`, shown in written pitch to agree with the staff and the reveal letter. Nothing is shown for "nothing heard".
- A pitch graph: a horizontal cents axis spanning two semitones either side of the expected note, with a tick and note name at each semitone, so a tone between C and C♯ sits visibly between them. It marks the expected pitch and the played pitch and labels the offset in cents. A tone beyond the axis is pinned to the edge with an arrow, and its note name still shows.
- The rest of the reveal (note letter, tablature, the F03 tone and the advance delay) works as before. The graph and verdict sit in the reveal area without moving the staff.

**Edge cases**
- Opening settings, turning judging off, or the page being hidden stops listening and releases the microphone.
- With judging on, when the hidden page is shown again it behaves like closing the settings view: the stream reopens and a fresh card is dealt, its reveal delay waiting for the stream. With judging off, page visibility changes nothing.
- The tone from the previous card cannot reach the next one: F03 requires the tone to end before the advance. A short hold-off at the start of each listening window covers the room tail (the spike sets its length).
- Octave errors count as incorrect and are shown as such by the graph (pinned to the edge).
- The grade is shown, not stored. It is exposed from the card flow as `correct | incorrect | none` for feature 6.

## Out of scope

- Retries, hints, a play-along or timing judgment (feature 8), and judging a sequence (feature 7).
- Storing grades or any progress (feature 6).
- Detecting the fingering. The judge hears the pitch that came out, not what the fingers did (vision, technical gotchas).
- Latency calibration, per-device tuning, and an A4 reference other than 440 Hz.
- Instruments other than the alto C.

## Modules touched

- `src/core/judge` (new): frequency to the nearest pitch and cents offset, the tolerance rule, and the stability logic over a stream of detector readings. Pure; no browser API.
- `src/audio`: microphone capture and the detector loop (the detector itself is chosen by the spike), over the one audio context shared with the F03 tone player.
- `src/core/settings`: judge toggle and tolerance.
- `src/app`: card flow listens, reveals on a verdict; the reveal shows the verdict, judged note and graph; a "Microphone" settings section (see [F03-S01](../03-play-the-note/stories/F03-S01-settings-sections.md)) with the inputs and the unavailable notice.
- `src/render` or `src/app`: the pitch graph (decided in S06).
- ADR from the spike: detector choice and dependency.

The drill engine is untouched.

## Data

New settings `judgeEnabled` (default off) and `toleranceCents`, in the defaults file and under the same `localStorage` key. Settings saved earlier get the defaults. Nothing is recorded or kept from the microphone.

## Risks and open questions

- **Accuracy on an ocarina.** Pitch rises with breath pressure, and a soft, near-sine tone with a quiet attack is hard for some detectors. The spike answers this before anything is built on it, using generated tones only, so its thresholds are provisional until the live check after [F04-S06](stories/F04-S06-verdict-and-pitch-graph.md), where the user plays and the thresholds are confirmed or retuned.
- **Mic latency and permission on mobile.** Android latency varies by device; HTTPS is required (GitHub Pages provides it). Checked by hand on the [target matrix](../02-deploy-and-pwa/design.md#target-matrix).
- **Dependency.** Pitchy is the vision's candidate. The spike compares it with a small own implementation of YIN and the user approves before any dependency is added ([CLAUDE.md](../../../CLAUDE.md#rules)).
- **Speaker bleed.** On a phone the F03 tone could be heard by the next card's listening if the room is live. Mitigated by the hold-off; revisit if the by-hand check shows false verdicts.
- **Privacy.** Audio is processed in the page and never stored or sent. The microphone is open while drilling with judging on, and only the listening windows are analysed. The browser's own microphone indicator shows the whole time it is open.

## Stories

- F04-S01: Detector spike
- F04-S02: Judge rules
- F04-S03: Microphone pitch stream
- F04-S04: Judge settings
- F04-S05: Listen before the reveal
- F04-S06: Verdict, judged note and pitch graph

Story files are in [`stories/`](stories/).
