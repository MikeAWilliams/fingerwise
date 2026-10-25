# Vision clarify (branch `plan/vision-clarify-and-extend`)

Not a story. A working checklist for smoothing out `docs/vision/vision.md` and settling the feature order. Delete in the final commit before merge.

## Housekeeping (no decision needed)

- [x] Transposition: moved to feature 1 open items in the vision (no ADR here; decide in feature 1 planning)
- [x] Stack section: trimmed lines covered by ADR 0001 to a pointer
- [x] Noted that PWA support is deferred to its own story (feature 2)
- [x] Touch/phone UI line added as a detail under feature 2

## Decisions for the user

- [x] Feature order decided: 1 core, 2 deploy/PWA, 3 songs, 4 hear it, 5 judge a single note, 6 smarter sampling, 7 wait mode, 8 timed play-along, 9 other instruments (maybe eventually). Second-instrument layer test folded into feature 1 as test-only requirements (now in the vision)
- [ ] Mic judging: add a research spike before it gets a slot?
- [ ] Feature 8 (timed play-along): keep, or park as "maybe never"?
- [ ] "Ocarina key" setting (C/F/G): what does it change, the staff note or only the sounding pitch?
- [ ] Reverse card (show fingering, name the note): in feature 1 or later?
- [ ] First fingering style: Japanese or Taiwanese? (can wait for the data research)
- [ ] Feature 6 (sampling): user to describe the sampling behavior wanted (Leitner, SM-2, or other). Open points: card unit (pitch per instrument?), grade levels, gradual introduction of new cards, within-session requeue of misses, scheduler takes grades from any source
- [ ] Delay: fixed or adaptive, and can the player reveal early?

## Research


## Then edit the vision

- [x] Rewrite Feature order with the agreed order (dependencies between songs/mic features still to note)
- [x] Add deploy/PWA to the order
- [ ] Update Open questions: remove settled, add new ones
