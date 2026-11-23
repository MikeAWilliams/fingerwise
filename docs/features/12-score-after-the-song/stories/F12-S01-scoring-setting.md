# F12-S01: The Scoring setting

- **Feature:** `../design.md`
- **Modules:** `src/core/settings`, `data/settings/defaults.json`, `src/app` (Settings form), `docs/architecture/`
- **Depends on:** none

## Story

As a player, I want to choose in Settings whether a timed song is scored live or after the song, so that I can play from the music alone when I want to.

## Acceptance criteria

Each item must be checkable and numbered so progress checklists can refer to it. Do not edit these once work starts; raise a change instead.
- **AC1:** Given the settings, then they have a `scoring` field, `"live"` or `"after"`. The defaults file has `"live"`, and strict parsing of the defaults rejects a missing or other value.
- **AC2:** Given stored settings with no `scoring` (data saved before F12), then it loads as `"live"` with every other field kept. Given a stored value that is not `"live"` or `"after"`, then it alone resets to the default.
- **AC3:** Given the settings module, then a test `scoringAfterApplies(settings)` is true exactly when `keepTempoApplies(settings)`, judging is on and `scoring` is `"after"`, with a truth table in the tests.
- **AC4:** Given the Settings form, then the Song section has a "Scoring" list after "Metronome" with the choices "Live feedback" and "After the song", showing the stored value.
- **AC5:** Given use song, keep tempo or judging off, then the list is disabled and keeps its value; turning them on again shows the same choice.
- **AC6:** Given a change of the list, then it is saved like the other settings and survives a reload.
- **AC7:** Given this story alone, then choosing "After the song" changes nothing in how a song plays (F12-S02 does that).
- **AC8:** Given the change, then `make verify` passes, and the `settings`, `app` and data-format docs describe the field and the list.

## Notes

- The Song section's summary line may mention it, such as ", scored after the song"; decide in the build, keeping it short.

## Test approach

Unit tests in `tests/core/settings.test.ts`: default, strict parse (missing, wrong value), old data, a bad value resetting alone, round trip, the truth table. Form tests for the list, disabling and saving. By hand in Settings with `make dev`.
