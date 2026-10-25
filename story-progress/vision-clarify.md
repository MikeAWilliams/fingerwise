# Vision clarify (branch `plan/vision-clarify-and-extend`)

Not a story. A working checklist for smoothing out `docs/vision/vision.md` and settling the feature order. Delete in the final commit before merge.

## Housekeeping (no decision needed)

- [x] Transposition: moved to feature 1 open items in the vision (no ADR here; decide in feature 1 planning)
- [x] Stack section: trimmed lines covered by ADR 0001 to a pointer
- [x] Noted that PWA support is deferred to its own story (feature 2)
- [x] Touch/phone UI line added as a detail under feature 2

## Decisions for the user

- [x] Feature order decided: 1 core, 2 deploy/PWA, 3 songs, 4 hear it, 5 judge a single note, 6 smarter sampling, 7 wait mode, 8 timed play-along, 9 other instruments (maybe eventually). Second-instrument layer test folded into feature 1 as test-only requirements (now in the vision)
- [x] Mic judging: spike question noted under feature 5 for later
- [x] Feature 8 (timed play-along): kept; scope note added under the feature, revisit after feature 5
- [x] Reverse card: dropped; the reveal appears under the staff (detail under feature 1)
- [x] First fingering style: moved to feature 1 open items
- [x] Feature 6 (sampling): open questions listed under the feature in the vision
- [x] Delay: fixed in settings for feature 1; adaptive noted as a later idea; reveal early covered under feature 2

## Research


## Then edit the vision

- [x] Rewrite Feature order with the agreed order (dependencies between songs/mic features still to note)
- [x] Add deploy/PWA to the order
- [x] Update Open questions: delay removed, the other two point to feature 1
