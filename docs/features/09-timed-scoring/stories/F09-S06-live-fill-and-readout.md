# F09-S06: Live fill and readout

- **Feature:** `../design.md`
- **Modules:** `src/app`, `src/app/judge-text.ts`, `docs/architecture/`
- **Depends on:** F09-S03, F09-S05

## Story

As a player playing a song in time with judging on, I want to watch each note fill in as I play, with its tuning, and see what note is heard, so that I can correct myself as I go.

## Acceptance criteria

Each item must be checkable and numbered so progress checklists can refer to it. Do not edit these once work starts; raise a change instead.
- **AC1:** Given classified segments from the coverage core, then each note's lane segment fills as a pitch trace: a thick line whose height follows the reading's cents offset from the expected pitch over about ±150 cents, centred when in tune, up when sharp, down when flat.
- **AC2:** Given the trace, then it is green within the tolerance, amber from there to ±50 cents, and red beyond. Faint lines mark the tolerance and ±50 cents.
- **AC3:** Given a reading more than about 150 cents from the expected pitch, then it is drawn red, pinned to the lane's top edge when above and bottom edge when below.
- **AC4:** Given silence on a note, then that stretch stays the segment's neutral colour. Given a rest, then silence fills it green and sound fills it red.
- **AC5:** Given the fill, then it is drawn at song time, so it trails the playhead by about the scoring lag; the playhead is not moved back to meet it.
- **AC6:** Given a row is replaced by the next line, then its fill goes with it; the rows still on show keep theirs.
- **AC7:** Given a timed song is playing with judging on and the stream running, then the reveal area shows what is heard now, in written pitch with its offset ("Hearing D4 +62¢"), or "Hearing nothing", changing at most about ten times a second. With the stream not running it shows nothing.
- **AC8:** Given judging off, then segments never fill and no readout shows.
- **AC9:** Given the fill and readout update every frame on a mid-range phone, then the playhead stays smooth; the overlay is drawn with few elements (for example one path per colour per row, or a canvas).
- **AC10:** Given the change, then `make verify` passes and the `app` module doc describes the fill and readout; the readout texts are in `judge-text.ts`.

## Notes

- Height carries tuning and direction, so colour is never the only signal.
- A note drifting a semitone flat is one line sinking out of the band; a wrong fingering a tone away is pinned to the edge. Telling these apart is the point of the ±150 cent span.

## Test approach

Unit tests for the trace's height and colour from a cents offset (in tune, amber, red within the span, pinned beyond, clamping), and for the readout text and its rate limit. By hand with an ocarina and `make dev`: play the example song well, with a sagging note, with a wrong fingering, and with a held-over rest; check colours, heights, the trailing fill, the readout, and smoothness on a phone.
