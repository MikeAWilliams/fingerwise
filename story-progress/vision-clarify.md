# Vision clarify (branch `plan/vision-clarify-and-extend`)

Not a story. A working checklist for smoothing out `docs/vision/vision.md` and settling the feature order. Delete in the final commit before merge.

## Housekeeping (no decision needed)

- [ ] Close the transposition open question: it is a per-instrument setting (glossary has written vs sounding)
- [ ] Stack section: trim lines already covered by ADR 0001 to pointers
- [ ] Note that PWA support is deferred to its own story (ADR 0001)
- [ ] Add a touch/phone UI line to the vision (tap to reveal, portrait layout)

## Decisions for the user

- [ ] Feature order: 1 -> deploy/PWA -> 2 (spaced repetition) -> 3 (hear it) -> second-key layer test -> songs and mic?
- [ ] Mic judging: add a research spike before it gets a slot?
- [ ] Feature 7 (timed play-along): keep, or park as "maybe never"?
- [ ] Tablature: SVG drawn from the JSON (recommended) or panzi's fonts?
- [ ] "Ocarina key" setting (C/F/G): what does it change, the staff note or only the sounding pitch?
- [ ] Reverse card (show fingering, name the note): in feature 1 or later?
- [ ] First fingering style: Japanese or Taiwanese? (can wait for the data research)
- [ ] Spaced repetition: unit is pitch per instrument? Binary or three-level grading?
- [ ] Delay: fixed or adaptive, and can the player reveal early?

## Research

- [ ] Fingering data source: does panzi's `ocarina_tabs` have a pitch-to-pattern table or only fonts? Write `docs/research/` note
- [ ] Hole pattern shape: open / covered / half, for chromatic notes

## Then edit the vision

- [ ] Rewrite Feature order with the agreed order and dependencies
- [ ] Add deploy/PWA to the order
- [ ] Note that feature 1 will split into several stories
- [ ] Update Open questions: remove settled, add new ones
