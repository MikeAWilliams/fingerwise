# F01-S06: Settings UX

- **Feature:** `../design.md`
- **Modules:** `src/app`
- **Depends on:** F01-S05

## Story

As a player, I want to set the note range, whether sharps are included and the delay, and have them remembered, so that I can drill the notes I am learning.

## Acceptance criteria

Each item must be checkable and numbered so progress checklists can refer to it. Do not edit these once work starts; raise a change instead.
- **AC1:** Given any card, then a settings button is visible.
- **AC2:** Given a card is showing, when the player opens settings, then the timer stops and the card is no longer driven.
- **AC3:** Given the settings view is open, when it is closed, then a new card is drawn with the current settings and its timer starts from zero.
- **AC4:** Given the settings view, then it offers a lowest and a highest pitch picker limited to the instrument's written range, an include-sharps toggle and a delay in seconds, limited to 0.5 to 30 (the input's min, max and step enforce it; step 0.5).
- **AC5:** Given the pickers, then the lowest cannot be set equal to or above the highest, and the highest cannot be set equal to or below the lowest.
- **AC6:** Given sharps are off, then the pickers offer natural notes only.
- **AC7:** Given turning sharps off is allowed, when the player turns it off, then the bounds move as in F01-S05 AC7.
- **AC8:** Given turning sharps off is blocked, then the toggle cannot be turned off and the view says why.
- **AC9:** Given a change in the settings view, then it is saved to `localStorage` under one key (low pitch, high pitch, include sharps, delay).
- **AC10:** Given a reload, then the saved settings are used.
- **AC11:** Given `localStorage` data that is missing, unparseable or invalid, when the app loads, then the defaults file is used, per the validation rules in F01-S05, and the app does not crash.
- **AC12:** Given `localStorage` is unavailable or throws, then the app still works with the defaults and unsaved changes.
- **AC13:** Given the change, then `make verify` passes, the `modules/` doc for `app` describes the settings view and storage, and `data-formats.md` documents the stored key.

## Notes

- The settings button does not exist before this story.
- There is no fingering-style or ocarina-key setting.
- All range, snapping and blocking logic comes from `core/settings`; this story wires it to the UI.

## Test approach

Unit tests for the storage wrapper (missing, corrupt and throwing storage) and component tests for the view if the toolchain allows. Opening, closing and reloading are checked by hand in the browser.
