# F02: Deploy and PWA

- **Status:** done
- **Vision source:** `../../vision/vision.md#feature-order`

## Goal

The player opens fingerwise at a public URL on a phone, tablet or computer, can install it to the home screen, and can run the drill with no network. The layout is usable on phone and tablet screens in portrait and landscape.

## Behavior

**Deploy (S01)**
- A GitHub Actions workflow checks and builds the app on every push to any branch. On `main` it also publishes `dist/` to GitHub Pages at `https://mikeawilliams.github.io/fingerwise/` (matches `base` in `vite.config.ts`). It can be re-run by hand from the Actions tab once it is on `main`.
- Only `main` may deploy in the end state. While S01 is in progress the story branch is also allowed to deploy, so the live site can be accepted before the merge. That exception is removed before the story is accepted. There is no live site yet, so the temporary deploy overwrites nothing.
- One-time repo setup by the user: Pages source set to "GitHub Actions", and the story branch added to the `github-pages` environment's allowed branches (removed again at the end).

**Phone and tablet layout (S02)**
- The card, staff, reveal area and settings view fit and are usable at 360 px wide in portrait, at phone landscape, and at tablet sizes in both orientations. Controls are touch-sized. Tapping anywhere on the card still reveals early and advances (the `click` handling from F01 already covers touch).

**Installable (S03)**
- A web app manifest and icons let Android (Chromium and Firefox) install the app so it opens standalone, without browser chrome. iOS gets the home-screen meta tags and touch icon; the install itself is manual (Share, Add to Home Screen) and untested.
- Icons are a simple original placeholder generated from an SVG kept in the repo, replaceable later without code changes.

**Offline and updates (S04)**
- After one online visit, the app starts and runs the drill with the network off, including the tablature font and saved settings.
- A new deploy reaches installed copies silently: it downloads in the background and takes over on a later launch. No prompt or banner ([ADR 0004](../../architecture/decisions/0004-pwa-with-vite-plugin-pwa.md)).

## Target matrix

| Platform / browser            | Status                                     |
| ----------------------------- | ------------------------------------------ |
| Firefox (Linux)               | tested by hand                             |
| Brave (Linux, Chromium)       | tested by hand                             |
| Firefox (Android phone, tablet) | tested by hand                           |
| Chrome (Android phone, tablet)  | tested by hand                           |
| Safari / any browser on iPhone and iPad | built for, **untested** (every iOS browser uses WebKit) |

## Out of scope

- An in-app hint for installing on iOS, an update prompt, a custom domain, app store listings, a Tauri wrapper.
- Install on desktop Firefox (it does not offer install).
- Push notifications, background sync, and any new drill behavior.
- Replacing the placeholder icon with final artwork.

## Modules touched

- `src/app`: layout and CSS (S02); service worker registration (S04).
- `index.html`: viewport, theme color, icon and iOS meta tags.
- `vite.config.ts`: `vite-plugin-pwa` (S03, S04).
- `.github/workflows/`: the deploy workflow (S01).
- `public/` or `data/`: icon source SVG and generated PNGs (S03).
- New architecture doc `docs/architecture/deployment.md`, written as the work lands.

`src/core/` is untouched.

## Data

No instrument or settings changes. Stored state is unchanged (`fingerwise.settings` in `localStorage`). New static files: manifest, icons, service worker (generated).

## Risks and open questions

- **iOS is untested.** Safari quirks (touch icon, standalone display, storage) may need a follow-up feature once a device is available. iOS can clear a site's storage after about 7 days of non-use in the browser; home-screen installs are mostly exempt.
- **Stale caches.** A service worker that serves old files after a deploy. Mitigated by precaching generated from the build; checked by the update acceptance criterion in S04.
- **Install without a service worker.** Recent Chromium versions do not require one, but if an Android browser refuses to offer install before S04, the install criteria of S03 cannot be proven until S04 lands; stop and tell the user rather than editing criteria.
- **Testing needs HTTPS.** Install and service workers need HTTPS or `localhost`. A phone on the LAN does not qualify; a USB cable with `adb reverse` makes the preview server `localhost` for the phone. See the user checklist.
- **New dependency** `vite-plugin-pwa`: agreed 2026-10-31 and recorded in ADR 0004. The icon generation tool in S03 may need another; ask first.
- **GitHub Actions** third-party actions (`oven-sh/setup-bun`, and GitHub's own Pages actions) are CI tooling, not app dependencies.

## User checklist

Manual steps for the user, in story order: [`user-checklist.md`](user-checklist.md). It is not for the implementing agent.

## Stories

- F02-S01: Deploy to GitHub Pages
- F02-S02: Phone and tablet layout
- F02-S03: Installable (manifest and icons)
- F02-S04: Offline and silent updates

Story files are in [`stories/`](stories/).
