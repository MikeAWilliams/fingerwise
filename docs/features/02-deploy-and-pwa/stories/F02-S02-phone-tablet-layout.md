# F02-S02: Phone and tablet layout

- **Feature:** `../design.md`
- **Modules:** `src/app`, `index.html`
- **Depends on:** F02-S01

## Story

As a player, I want the drill to fit and be easy to use on my phone or tablet, so that I can practice away from a computer.

## Acceptance criteria

Each item must be checkable and numbered so progress checklists can refer to it. Do not edit these once work starts; raise a change instead.
- **AC1:** Given a 360 px wide portrait screen, when a card is shown, then the whole staff is visible with no horizontal scrolling of the page.
- **AC2:** Given any screen from 360 px wide up, in portrait or landscape, then the Settings button never overlaps the staff or the reveal area.
- **AC3:** Given a tablet-sized screen (about 768 by 1024, and 1024 by 768), then the card is centered and the staff is larger than on a phone but bounded, not stretched across the screen.
- **AC4:** Given a phone in landscape (about 640 by 360), then the staff and the reveal area are both visible without scrolling the page, or the page scrolls vertically and nothing is cut off.
- **AC5:** Given the settings view at 360 px wide, then every control is usable and the page scrolls vertically if it is taller than the screen; no control is cut off.
- **AC6:** Given any interactive control (Settings, Close, the pickers, checkboxes and number inputs), then its tap target is at least 44 by 44 CSS pixels.
- **AC7:** Given a tap on the card, then it reveals early (or advances), exactly one step per tap, and a double tap does not zoom the page. Pinch zoom stays available.
- **AC8:** Given a revealed or hidden card at any size above, then revealing does not move or resize the staff (F01 layout rule).
- **AC9:** Given a notched or rounded-corner phone, then content respects the safe-area insets.
- **AC10:** Given the change, then `make verify` passes and `docs/architecture/modules/app.md` describes the layout rules.

## Notes

- Touch already works: F01 handles `click` on `document`, which phones synthesize from taps.
- Do not disable pinch zoom (accessibility).
- Touch-specific behavior, sizes and insets cannot be unit tested; checked on real Android devices.

## Test approach

Unit tests only for any new pure logic (for example sizing helpers). Everything else is checked by hand on an Android phone and tablet in both orientations, and in Firefox and Brave on Linux with responsive mode.
