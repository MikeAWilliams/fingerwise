# 0004: PWA with vite-plugin-pwa and silent updates

- **Status:** accepted
- **Date:** 2026-10-31

## Context
Feature 2 makes fingerwise installable and usable offline on phones and tablets (Android and iOS) and in Firefox and Chromium browsers. [ADR 0001](0001-toolchain-and-ui.md) deferred PWA support and named `vite-plugin-pwa`. An offline app needs a service worker that caches every built file, including the tablature font, and a way for new versions to reach players who have the old one cached.

## Decision
- **Plugin:** add `vite-plugin-pwa` as a dev dependency. It generates the manifest and the service worker (Workbox) at build time and precaches every built file, so the file list is never maintained by hand.
- **Updates:** silent. A new version downloads in the background and takes over on a later launch. There is no "new version available" prompt and no update UI.
- **Hosting and deploy:** GitHub Pages, deployed by a GitHub Actions workflow from `main`, as the vision already states. The deploy trigger and its limits are specified in feature 2, story S01.
- **Targets:** tested by hand on Firefox and Brave (Linux) and Firefox and Chrome (Android phone and tablet). iPhone, iPad and Safari are built for but untested until a device is available.

## Alternatives considered
- **Hand-written service worker:** no dependency, but the file list and cache versioning would be maintained by hand, the usual source of "deployed but the phone still shows the old version".
- **Prompt to reload on update:** gives the player control, but needs UI, a story and a string, for an app with no unsaved work.
- **No offline support (deploy only):** simplest, but the drill is most useful where signal is poor, and the vision wants it usable on a phone.

## Consequences
- One new dev dependency; its configuration lives in `vite.config.ts`.
- The service worker exists only in the production build, so offline and install behavior is checked with `make preview` or the deployed site, not `make dev`.
- A player may run the old version for one launch after a deploy.
- iOS behavior is unverified until tested on a real device; see the risks in the [feature 2 design](../../features/02-deploy-and-pwa/design.md#risks-and-open-questions).
- `docs/architecture/` gains a deployment doc when the work lands.
