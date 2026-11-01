# F02 user checklist

For the human, not the implementing agent. Follow it in story order. Each story is accepted on its own `story/` branch before it merges, per [CLAUDE.md](../../../CLAUDE.md#workflow). Tick items as you go (copy this file elsewhere if you want a clean one per run). AC numbers refer to the story files in [`stories/`](stories/).

## Before you start

- [ ] The `plan/f02-publish` branch is merged to `main`, and each story branch is cut from the updated `main`.
- [ ] You can push branches to `MikeAWilliams/fingerwise` and open its Settings page on GitHub.
- [ ] Browsers ready: Firefox and Brave on Linux; Firefox and Chrome on the Android phone and tablet.
- [ ] For S03 and S04 phone checks: `adb` installed on the computer (`brew install android-platform-tools`, or the distro package), USB debugging enabled on the Android device, a USB cable. Check with `adb devices` that the phone is listed and authorized.

## S01: Deploy to GitHub Pages

Branch: `story/F02-S01-deploy-github-pages`

One-time setup, before the first push of the workflow:
- [ ] Repo Settings, Pages, Source: set to **GitHub Actions**.
- [ ] After the first workflow run creates the `github-pages` environment (or create it yourself under Settings, Environments): open it, under **Deployment branches and tags** add the story branch `story/F02-S01-deploy-github-pages`. (Needed for AC4; remove it in the last step.)

Verify:
- [ ] Push the branch. In the Actions tab, the `verify` job runs and passes (AC1).
- [ ] The `deploy` job runs on the branch and succeeds (AC3, AC4). If `verify` is broken on purpose in a throwaway commit, `deploy` is skipped (AC2; optional).
- [ ] Open `https://mikeawilliams.github.io/fingerwise/` on the Linux browsers: a card shows. DevTools, Network: no red or 404 requests, all files under `/fingerwise/` (AC7).
- [ ] Reveal a card: the name and the ocarina glyph show; the `.ttf` request goes to the same host; the footer license link opens (AC8).
- [ ] Open Settings, change the range, reload: the change is kept (AC9).
- [ ] Repeat the above on the Android phone in Firefox and Chrome.

Accept and finish:
- [ ] Ask for the exception to be removed (AC5), then remove the story branch from the `github-pages` environment's allowed branches (and, if you like, confirm `main` is the only entry).
- [ ] README has the live URL; `docs/architecture/deployment.md` exists (AC10).
- [ ] Accept; the progress file is deleted; merge to `main`.
- [ ] **After the merge:** the Actions run on `main` succeeds and the site still loads. Try **Run workflow** from the Actions tab: it appears now and succeeds (final proof of AC3 and AC5). If it fails, open a `fix/` branch.

## S02: Phone and tablet layout

Branch: `story/F02-S02-phone-tablet-layout`

Setup:
- [ ] Run `bun run dev --host` and note the network address Vite prints (for example `http://192.168.x.x:5173/fingerwise/`). Phone and computer on the same Wi-Fi. Open it on the phone and tablet. (No HTTPS needed for layout.)

Verify each on the Android phone and tablet, portrait and landscape; on Linux use Firefox and Brave responsive mode at 360x640, 640x360, 768x1024, 1024x768:
- [ ] Whole staff visible at 360 wide, page does not scroll sideways (AC1).
- [ ] Settings button never covers the staff or the reveal (AC2).
- [ ] Tablet: card centered, staff bigger than the phone's but not stretched (AC3).
- [ ] Phone landscape: staff and reveal both visible, or the page scrolls and nothing is cut off (AC4).
- [ ] Settings view: every control usable, scrolls if tall (AC5).
- [ ] Controls easy to hit with a thumb; none feel tiny (AC6).
- [ ] Tap the card: reveals, tap again: next card, one step per tap. Double-tap does not zoom. Pinch zoom still works (AC7).
- [ ] Revealing never shifts the staff (AC8).
- [ ] If the phone has a notch or rounded corners, nothing is hidden under it (AC9).
- [ ] Accept; merge.

## S03: Installable

Branch: `story/F02-S03-installable-manifest`

Setup: `make build`, then `make preview` (serves on `http://localhost:4173/fingerwise/`).
- [ ] Brave on Linux: open it; DevTools, Application, Manifest shows no errors and icons render; the install button appears in the address bar; install it and it opens in its own window (AC5).
- [ ] Phone: with the cable, run `adb reverse tcp:4173 tcp:4173`, then open `http://localhost:4173/fingerwise/` in Chrome on the phone. Same for the tablet (one device at a time, or `adb -s <id> reverse ...`).
- [ ] Chrome on Android phone and tablet offers install (menu, Install app); the icon looks right; it opens standalone without browser chrome; a card works (AC6).
- [ ] Firefox on Android: menu, Add to Home screen; icon appears; it opens the app (AC7). Note whether it opens standalone or in a tab; either is fine.
- [ ] If a browser refuses to offer install, tell the agent; the check may move to S04 (see the story notes).
- [ ] Look at the icon in the home screen: acceptable as a placeholder? (Replacing it later is not part of this feature.)
- [ ] Skim `index.html` for the iOS tags (AC4). They cannot be verified without an iPhone.
- [ ] Accept; merge. After the merge, once the deploy finishes, install from the live URL on one Android device as a final check.

## S04: Offline and silent updates

Branch: `story/F02-S04-offline-and-updates`

Setup: dev dependency `vite-plugin-pwa` is agreed; the agent adds it.
- [ ] Always test the production build: `make build`, `make preview` (not `make dev`).
- [ ] Linux Brave: DevTools, Application, Service Workers shows one registered worker with scope `/fingerwise/` (AC2). `make dev` shows none.
- [ ] Offline on Linux: load once, DevTools, Network, set **Offline**, reload: a card shows, early reveal and timed reveal work, name and glyph show in the ocarina font, and a changed setting still saves (AC3, AC4). Repeat in Firefox (DevTools there has no Offline toggle in every version; use File, Work Offline or stop the preview server).
- [ ] Phone: `adb reverse tcp:4173 tcp:4173`, load `http://localhost:4173/fingerwise/` once, then stop `make preview` on the computer (the cable would otherwise still serve the files). Close the browser tab and reopen the URL, or open the installed app from the home screen: the card still shows and the drill runs (AC3, AC4). Do this on Chrome, and on Firefox if it lets you.
- [ ] Update behavior (AC5, AC6): with `make preview` running, load the app. Make a visible tiny change (for example edit the page title in `index.html`), run `make build` again, and restart `make preview` on the same port. Close and reopen the app (phone: reopen the installed app); you may need a second launch before the new version shows. No prompt, banner or reload button appears. DevTools, Application, Cache Storage shows only the current cache, no old ones. Undo the throwaway change.
- [ ] Firefox private window: the drill still runs online with service workers off (AC7).
- [ ] `docs/architecture/deployment.md` and `modules/app.md` read correctly; the vision's feature 2 detail is a pointer (AC8).
- [ ] Accept; merge. After the deploy, load the live site on a phone, go offline, reopen: the card still shows.

## After feature 2

- [ ] Set the feature 2 row in `docs/features/README.md` to `done`, and update the target matrix in the design if anything differs from the plan (on a `plan/` branch).
- [ ] When you have an iPhone or iPad: add a follow-up plan item to test Safari, the touch icon, standalone display and storage behavior, and record the result in the architecture docs.
