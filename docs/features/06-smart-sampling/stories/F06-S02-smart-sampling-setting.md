# F06-S02: Smart sampling setting

- **Feature:** `../design.md`
- **Modules:** `src/core/settings`, `src/app` (`Settings.tsx`, `settings-form.ts`), `data/settings`, `docs/architecture/`
- **Depends on:** none

## Story

As a player, I want a simple "Use smart sampling" checkbox, so that I can choose to have the app focus on the notes I need to work on.

## Acceptance criteria

Each item must be checkable and numbered so progress checklists can refer to it. Do not edit these once work starts; raise a change instead.
- **AC1:** Given `data/settings/defaults.json`, then it holds `smartSampling: false`, and the strict defaults parse requires it to be a boolean.
- **AC2:** Given stored settings without `smartSampling` (saved before this feature), when they load, then it is `false` and every other field is kept; given a stored value that is not a boolean, then it alone resets to `false`.
- **AC3:** Given the settings view, when the Cards section is open, then it shows a "Use smart sampling" checkbox; changing it is saved, and a reload keeps it.
- **AC4:** Given judging off, then the checkbox is disabled, its value is kept, and a line under it reads "Needs Judge my playing"; turning judging on enables it with the same value.
- **AC5:** Given use song on, then the checkbox is disabled, its value is kept, and the line the range controls show for a song in use applies to it too.
- **AC6:** Given this story alone, when the checkbox is on, then cards are drawn exactly as before (the draw changes in S04).
- **AC7:** Given the change, then `make verify` passes and the `settings` and `app` module docs and `data-formats.md` describe the new field and control.

## Notes

- The label and line say nothing of how sampling works, by the user's wish.
- The Cards summary line is unchanged.

## Test approach

Settings unit tests: default, strict parse, old data, wrong type. Settings-form tests for the disabled state and reason. By hand: the checkbox saves and reloads; it is disabled with the line while judging is off and while use song is on, keeping its value.
