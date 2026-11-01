# F02-S03: Installable (manifest and icons)

- **Feature:** `../design.md`
- **Modules:** `index.html`, `vite.config.ts`, icon source files, `docs/architecture/`
- **Depends on:** F02-S01, F02-S02

## Story

As a player, I want to install fingerwise on my home screen, so that it opens like an app without browser chrome.

## Acceptance criteria

Each item must be checkable and numbered so progress checklists can refer to it. Do not edit these once work starts; raise a change instead.
- **AC1:** Given the production build, then a web app manifest is emitted with the name `fingerwise`, a short name, a start URL and scope of `/fingerwise/`, `display` standalone, theme and background colors, and no fixed orientation.
- **AC2:** Given the manifest, then it lists a 192 px icon, a 512 px icon and a 512 px maskable icon, and every listed file exists in the build output.
- **AC3:** Given the icons, then they are generated from one original SVG committed in the repo, with a note of how to regenerate them.
- **AC4:** Given `index.html`, then it has a theme-color meta tag, a 180 px `apple-touch-icon` link, and the iOS home-screen meta tags (capable, title, status bar style).
- **AC5:** Given Brave on Linux served from `localhost` (`make preview`), then DevTools shows no manifest or installability errors, and the app can be installed and opens in its own window.
- **AC6:** Given Chrome on Android phone and tablet over HTTPS or `localhost`, then it offers install, the installed app has the icon, opens standalone without browser chrome, and the drill works.
- **AC7:** Given Firefox on Android, when "Add to Home screen" is used, then an icon appears and opens the app.
- **AC8:** Given the change, then `make verify` passes and `docs/architecture/deployment.md` describes the manifest, the icons and how to regenerate them.

## Notes

- The icon is a plain original placeholder (for example a note on a staff on a solid color). Do not copy existing artwork or commercial icons.
- Generating PNGs from SVG may need a tool; if so, ask the user before adding a dependency.
- Install flows differ by browser; AC6 and AC7 are checked by the user, not by tests.
- If a browser refuses to offer install until a service worker exists, stop and tell the user; the install check then moves to S04's acceptance run. Do not edit these criteria.
- iOS tags are added but untested; there is no AC for iOS behavior.

## Test approach

A unit test can check the built manifest fields and that each icon file exists (AC1, AC2). AC4 can be tested on `index.html`. Installability and standalone behavior are checked by hand on the target matrix.
