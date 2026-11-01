# F02-S04: Offline and silent updates

- **Feature:** `../design.md`
- **Modules:** `vite.config.ts`, `src/app`, `package.json`, `docs/architecture/`
- **Depends on:** F02-S03

## Story

As a player, I want the drill to work with no network and to pick up new versions on its own, so that I can practice anywhere and never have to manage updates.

## Acceptance criteria

Each item must be checkable and numbered so progress checklists can refer to it. Do not edit these once work starts; raise a change instead.
- **AC1:** Given `vite-plugin-pwa` is added as a dev dependency ([ADR 0004](../../../architecture/decisions/0004-pwa-with-vite-plugin-pwa.md)), then the production build emits a service worker that precaches every built file, including the tablature font, its license text, the icons and the manifest.
- **AC2:** Given the app is loaded in production, then the service worker is registered with scope `/fingerwise/`. It is not registered by `make dev`.
- **AC3:** Given one online visit has completed, when the network is turned off and the app is reloaded or started, then a card shows, the early reveal and the timed reveal work, and the name and glyph in the ocarina font show.
- **AC4:** Given the network is off, then saved settings are loaded and changed settings still save.
- **AC5:** Given a new build is deployed (or served in its place) while an older copy is cached, when the app is closed and reopened, then by the second launch after the change it runs the new version.
- **AC6:** Given an update, then no prompt, banner or reload button appears, and old caches are removed.
- **AC7:** Given a browser where service workers are unsupported or registration fails (for example Firefox in a private window), then the app still runs online as before.
- **AC8:** Given the change, then `make verify` passes, `docs/architecture/deployment.md` describes the service worker and the update behavior, `docs/architecture/modules/app.md` describes the registration, and the vision's detail for feature 2 is a pointer to the architecture doc.

## Notes

- Silent update means: the new version downloads in the background and takes over on a later launch, per ADR 0004.
- AC5 is checked locally: build version A, serve it with `make preview`, load it, change something visible, rebuild, serve again on the same port, then reopen. It does not need two deploys.
- The service worker only exists in the production build; use `make preview` or the deployed site, never `make dev`.
- Firefox private windows disable service workers; that is the expected AC7 case.
- Phone testing over `localhost` needs a USB cable and `adb reverse`; see the user checklist.

## Test approach

Unit tests can check the generated service worker's precache list contains the font, license, icons and manifest (AC1). Offline behavior, update behavior and registration are checked by hand on the target matrix.
