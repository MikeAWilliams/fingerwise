# F01-S03: Reveal name and tablature after the delay

- **Feature:** `../design.md`
- **Modules:** `src/render/tab`, `src/app`, `data/fonts/` (folder set in the breakdown)
- **Depends on:** F01-S01, F01-S02

## Story

As a player, I want the note name and fingering diagram to appear under the staff after a delay, so that I can check my fingering.

## Acceptance criteria

Each item must be checkable and numbered so progress checklists can refer to it. Do not edit these once work starts; raise a change instead.
- **AC1:** Given a card is shown, when the delay elapses, then the written note name (e.g. `C4`, `C♯5`) and the tablature glyph appear under the staff. The delay is a fixed 3 seconds until F01-S05.
- **AC2:** Given a card before the delay ends, then no name or glyph is visible.
- **AC3:** Given the reveal, then it appears in place: the staff does not move or resize.
- **AC4:** Given the glyph, then it is the character the instrument definition holds for that pitch, drawn in the bundled tablature font.
- **AC5:** Given the font has not loaded when the reveal happens, then the note name shows at once, a visible placeholder or notice stands where the glyph will go, and the glyph appears when the font arrives.
- **AC6:** Given the repo, then `Open-12-Hole-Ocarina-1.ttf` is committed unmodified with the full OFL 1.1 text taken from upstream, the upstream copyright line, the source URL, and the upstream commit or release it came from ([ADR 0002](../../../architecture/decisions/0002-tablature-from-panzi-font.md)).
- **AC7:** Given a production build, then the font and its license notice are in the output, and no request for the font goes to another host.
- **AC8:** Given the change, then `make verify` passes and the `modules/` docs for `render/tab` and `app` describe what was built.

## Notes

- The font license sits apart from the MIT code license.
- The tab renderer is given a glyph string and a font reference. It does not know hole counts.
- Early reveal and the next card come in F01-S04.

## Test approach

Unit tests for the tab renderer, with a fake timer for the delay. The font-not-loaded case is simulated in a test. Font appearance and offline behavior are checked by hand in the browser.
