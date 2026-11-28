# F19 checks by hand

Done once, at Closing, after both stories are built. Run with `make dev` in Firefox on Linux (Chrome too if it is installed). Everything to play is single, slow, easy notes. Nothing needs to be played in time.

## S01: Tuner mode and listening

1. Open Settings. **Expect:** the Mode list reads Flashcards, Song, Tuner, in that order.
2. Choose Tuner. **Expect:** only the Microphone section, open, with no "Judge my playing" checkbox, the Tuner help line and the tolerance. Its closed summary reads "within 40¢".
3. Switch to Flashcards, then Song, then back to Tuner. **Expect:** Cards, Sound, Song and Practice keep their values (for example a changed reveal delay and practice).
4. With Judge my playing **off** (set it in Flashcards first), switch to Tuner and close Settings. **Expect:** the header shows only "fingerwise" and Settings, with no title, tune list, tempo or Play song (have a titled song with two tunes saved). The browser asks for the microphone, or its indicator comes on. The area reads "Play a note" over an empty staff (clef only, no note).
5. Reload while in Tuner. **Expect:** "Tap or press a key to start listening". Tap. **Expect:** the microphone opens and "Play a note" shows.
6. Open Settings. **Expect:** the microphone indicator goes off. Close it, and it comes back on. Switch to another tab and back: the same.
7. Block the microphone for the site (the lock icon in the address bar) and reload. **Expect:** the unavailable message on the card, and in an open Microphone section in Settings.
8. In Tuner nothing plays a tone and taps do nothing apart from unlocking. DevTools > Application > Local Storage: `fingerwise.progress` does not change while you play in Tuner. `fingerwise.settings` holds `"mode":"tuner"`.

## S02: Show the note played

1. Play an easy note (for example C5) steadily for a second or two. **Expect:** after about a fifth of a second the note shows on the staff with its name, tablature, a verdict row and the graph centred on it. The dot moves smoothly with your breath, and the cents change no faster than about ten times a second.
2. Stop. **Expect:** the display stays, showing a value near the middle of what you played, not the sag at the end. It stays until you play again.
3. Play softer, then harder, on one note. **Expect:** the row turns between "N cents flat" (amber), "In tune ✓" (green) and "N cents sharp" (amber), and the dot follows.
4. Bend a note up by blowing hard for a moment, then back. **Expect:** a short push shows cents beyond +50 on the same note. Held past a fifth of a second, it shows the next note.
5. Play a few different notes one after another, with short gaps. **Expect:** each new note replaces the last result. Notes across your whole range have the right name and tablature (a written note, as the flashcards show it).
6. A sound outside the range, if you can make one (whistle or sing an octave above the top note), or play a tone from another device. **Expect:** a note within an octave of the range is drawn on the staff with no tablature. Check that it is not cut off at the top or bottom. Far outside the band, nothing changes.
7. A quick tap of a note or a breath noise shorter than a fifth of a second. **Expect:** nothing changes.
8. Change the tolerance to 10 and then 45. **Expect:** what counts as "In tune" narrows and widens.

## Review points

- Code: `tuner-flow.ts` has no timer, no tone and no grading, and `stop()` always releases the listener. The flow effect's other branches cannot render in Tuner. `followNote` is deterministic, so throttling when it is called does not change which note is shown.
- Stuck states: Tuner opened while a note is already sounding shows nothing until a silence, which is expected and a tuning point. A tone that never ends because of room noise above the gate keeps the display live.
- Tuning constants: the 200 ms note-change settle, the held median (trim the ends if it reads off), and whether breath noise between notes makes false tones (see the design's Risks).
- Layout seams: the staff for notes an octave beyond the range, the graph's marker pinned past ±100¢, and the tuner card at 360x640 and 1024x768.
