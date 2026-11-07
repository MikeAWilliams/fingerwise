# F03: Play the note

- **Status:** designed
- **Vision source:** `../../vision/vision.md#feature-order`

## Goal

After a card is revealed, the player hears the note: a plain tone at the instrument's sounding pitch. They can check their fingering by ear, and can set how long after the reveal the tone starts and how long it lasts. The tone always ends before the next card can appear.

## Behavior

**Playing**
- The tone belongs to the reveal, not to the new card. When a card is revealed (by the reveal delay or by a click or key press), the **sound delay** starts. When it ends, the sounding pitch (written pitch plus the instrument's transposition, [ADR 0003](../../architecture/decisions/0003-written-pitch-and-transposition.md)) plays for the **sound duration**, then stops.
- Leaving the card (a click or key press that advances, the automatic advance, or opening settings) cancels a pending tone and cuts a playing one. A tone never rings over the next card.
- There is no play button and no replay.
- The sound is a sine wave at equal temperament with A4 = 440 Hz, with a short fade-in and fade-out so it does not click. There is no volume setting; the device volume controls it.

**Autoplay rule**
- Browsers keep audio locked until the first click, tap or key press on the page. The first such gesture unlocks audio; until then a tone that is due is simply skipped. There is no "tap to enable sound" prompt. A player who opens the app and lets it run hands-free hears nothing until they tap once.

**Settings** (a new "Sound" section of the settings view, saved with the others; the view is first split into collapsible sections by [F03-S01](stories/F03-S01-settings-sections.md))
- **Play note:** a toggle. Default on. Off, no tone plays, the two timing inputs below are disabled (their values kept) and no sound rule applies.
- **Sound delay:** seconds from the reveal to the start of the tone, 0 to 30. Default 0.5.
- **Sound duration:** seconds the tone plays, 0.5 to 30. Default 1.5.
- **Rule:** while play note **and** auto-advance are both on, sound delay + sound duration must be at most the **advance delay**. With either off it does not apply: no tone, or no timed advance for it to ring over (a click to advance cuts the tone).

**Conflicts in the settings view** (the settings are never in a state that breaks the rule)
- While the rule applies, an edit to the sound delay, sound duration or advance delay that would break it is rejected, the old value stays, and the view says the sum must not exceed the advance delay.
- While the rule does not apply, the advance delay can be set freely. Turning play note or auto-advance on when that would break the rule is blocked: the toggle is disabled and the view names the values, for example "Sound delay plus duration (2 s) is longer than the advance delay (1 s)", the same pattern as the blocked sharps toggle in F01.
- Stored or default values that break the rule while it applies are reset to the defaults (all three timing values, so the result is valid). See F03-S04.

**Edge cases**
- With auto-advance off, the tone plays once after the reveal and does not repeat.
- Clicking to reveal and the sound delay of 0: the tone starts at once on that same gesture, which also unlocks audio.
- Audio is unavailable (no Web Audio, or the context cannot start): the drill works as before and nothing is shown. No error reaches the player.
- The page is hidden or the tab is switched: the tone may stop; no special handling.

## Out of scope

- Playing on the new card (before the reveal), a replay button, an ear-first mode that hides the staff note.
- Volume, waveform choice, ocarina-like or sampled sounds ("optional samples" in the vision stays later).
- A tuning setting other than A4 = 440 Hz.
- Any microphone use (feature 4).

## Modules touched

- `src/core/pitch`: `toFrequency(pitch)`, pitch to hertz.
- `src/core/settings`: three new fields, their bounds and the sum rule. The instrument's `soundingPitch` already exists.
- `src/audio` (new): the tone player over Web Audio. Knows pitches and seconds, nothing about cards or UI.
- `src/app`: the settings view becomes collapsible sections (S01); card flow starts and cancels the tone around the reveal; the Sound section gets the new inputs.
- `data/settings/defaults.json`: new fields.

The drill engine is untouched.

## Data

New settings: `soundEnabled`, `soundDelaySeconds`, `soundDurationSeconds`, in the defaults file and under the same `localStorage` key. Settings saved before this feature get the defaults for the new fields.

## Risks and open questions

- **Locked audio on mobile.** Some mobile browsers only unlock on certain gesture types (touch end, not touch start). Checked by hand on the target matrix from [F02](../02-deploy-and-pwa/design.md#target-matrix).
- **Timer drift.** The tone is scheduled from the app's timers, not the audio clock, so its start can be off by a few milliseconds. Fine for this feature; feature 8 will need the audio clock.
- **Existing saved settings.** A saved advance delay below 2 s with the new defaults breaks the rule on load; the reset rule in [F03-S04](stories/F03-S04-sound-settings.md) resolves it, which also resets the player's advance delay. Accepted.

## Stories

- F03-S01: Settings sections
- F03-S02: Pitch to frequency
- F03-S03: Tone player
- F03-S04: Sound settings
- F03-S05: Play the note after the reveal

Story files are in [`stories/`](stories/).
