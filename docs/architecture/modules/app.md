# app

`src/app/`

## Purpose

The Preact UI that wires the layers together: loads the instrument, shows a card, reveals it after a delay or on click or key press, advances to the next card, loads the tablature font and shows its license. Drawing is delegated to [`drill`](drill.md); this layer owns input and the timer.

## Public interface

- `App`: loads the alto C instrument, starts loading its font once on mount, and reads `data/settings/defaults.json` at build time through `parseDefaults` ([settings](settings.md)), builds the pool once from its range and sharps flag, and in one `useEffect` creates the card flow with `Math.random` and its delay (`delaySeconds * 1000`), mirrors its state into `useState`, calls `start()` and calls `stop()` on cleanup. The same effect owns input: `click` on `document` and `keydown` on `window` each call `flow.step()` once. It ignores `keydown` with `event.repeat` or Ctrl/Meta/Alt held, and clicks inside an `<a>`, `button`, `input`, `select` or `label` (the license link and the settings controls). It renders a `Card` for the current state and the license footer.
- `createCardFlow({ pool, random, delayMs, advanceDelayMs, onChange })` (`card-flow.ts`, plain TypeScript): returns `{ start, step, stop }` over the state `{ pitch, revealed }`. `start()` draws the first pitch with `drawPitch` and starts the reveal timer. `step()` reveals an unrevealed card and cancels the timer, or, if revealed, draws a different pitch, hides it and restarts the timer from zero; never both. When `advanceDelayMs` is not null, every reveal (timed or by `step()`) starts an advance timer that deals the next card, so the delay counts from the reveal; it is held in the same slot as the reveal timer, so only one timer is ever pending (none for a hidden card's advance). A `step()` on a revealed card deals at once and cancels the advance timer, so it never fires. `null` turns auto-advance off. `stop()` cancels whichever timer is pending.
- `Card({ pitch, revealed, instrument, staffOptions, font })`: presentational. The staff above a fixed-height reveal area. Until revealed the area is empty. When revealed it shows `formatPitch(pitch)` and the [`tabView`](tab.md) of the instrument's glyph for that pitch: the glyph in its font family, or the placeholder message while the font loads or after it fails.
- `Staff({ pitch, options })`: draws the staff with [`drawStaff`](staff.md).
- `startRevealTimer(delayMs, onReveal): () => void`: a `setTimeout` wrapper that returns a cancel function.
- `Settings({ instrument, settings, onChange, onClose })`: the settings view. Two `<select>` pickers (`lowestOptions` / `highestOptions`, labelled with `formatPitch`), an include-sharps checkbox, a reveal delay number input (`min` 0.5, `max` 30, `step` 0.5), an auto-advance checkbox, an advance delay number input (same bounds; stays enabled when auto-advance is off) and a Close button. The checkbox is disabled while sharps are on and `canTurnSharpsOff` is false, with the reason from `setIncludeSharps` shown beside it. Every change calls `onChange`.
- `settings-form.ts` (plain TypeScript): `lowestOptions` and `highestOptions` (the written range below/above the other bound, naturals only when sharps are off, so low is never at or above high) and `applyDelayInput` / `applyAdvanceDelayInput` (the new reveal or advance delay only when finite and in 0.5 to 30, otherwise the settings unchanged; they share one check). Sharps changes go through `setIncludeSharps` in [settings](settings.md).
- `settings-store.ts`: `SETTINGS_KEY` (`fingerwise.settings`), `browserStorage()` (`window.localStorage` or null when absent or blocked), `loadSettings(storage, instrument, defaults)` (defaults on null storage, missing key, throwing `getItem` or bad JSON, otherwise `validateSettings`; never throws) and `saveSettings(storage, settings)` (one `setItem` of `toSettingsJson`; no-op on null, swallows a throwing `setItem`). Storage is injected as `Pick<Storage, "getItem" | "setItem">`. `App` loads the initial settings once into `useState` and builds the pool and delay from them. See [data-formats](../data-formats.md#storage).
- `fontUrl(fileName)`: the built URL of a font in `data/fonts/`, found by file name with `import.meta.glob`, so the instrument JSON's `tablature.font` picks the font. Throws if missing.
- `loadFont(family, url, env): Promise<"loaded" | "failed">`: adds a `FontFace` to `env.fonts` and waits for it. `env` (`{ FontFace, fonts }`) is injected so it runs in Node tests. Never rejects.

## Settings view

`App` holds `settings` and `open` in state. A Settings button is shown on every card (fixed to the top right, so it does not move the staff). Opening clears the card and sets `open`; the card is not rendered while the view is open. The card-flow effect runs only while `open` is false and is keyed on `[settings, open]`: opening runs its cleanup (`flow.stop()`, listeners removed), so the timer stops and clicks and keys no longer drive the card. Closing re-runs it with a pool, reveal delay and advance delay (`settings.autoAdvance ? settings.advanceDelaySeconds * 1000 : null`) built from the current settings, so `start()` draws a new card with a fresh timer. Each change goes through `changeSettings`, which sets the state and calls `saveSettings(browserStorage(), next)`. A stored value is only written when the player changes something.

## Layout

`app.css` gives the staff box and the reveal area fixed heights, so revealing does not move or resize the staff. The placeholder uses the same box as the glyph.

## Font and license

The font loads on page load, not at reveal, so it is usually ready when the delay ends. The family name is the file name without its extension ([tab](tab.md)). `vite.config.ts` sets `build.assetsInlineLimit` so files under `data/fonts/` are emitted as files, never data URIs. `dist/assets/` holds the `.ttf` and `OFL-*.txt`, and the footer links the license. No font request goes to another host. See [`data/fonts/README.md`](../../../data/fonts/README.md) and [ADR 0002](../decisions/0002-tablature-from-panzi-font.md).

## Dependencies

`src/core/*`, `src/render/staff`, `src/render/tab`, Preact.

## Tests

- `tests/app/reveal.test.ts`: fake timers; no call at 2999 ms, one call at 3000 ms (passed directly), cancel works.
- `tests/app/card-flow.test.ts`: fake timers and a fake random; early reveal stops the timer, the next card starts a full delay, one step does exactly one thing, `stop()` cancels; with an advance delay: advance after a timed and an early reveal, no advance timer while hidden, an early step cancels the pending advance, `null` keeps the card, `stop()` cancels a pending advance.
- `tests/app/font.test.ts`: `loadFont` with a fake `FontFace` (loaded and failed), `fontUrl` lookup.
- `tests/app/settings-form.test.ts`: option lists (excluded bounds, naturals only with sharps off, full range) and delay input edges.
- `tests/app/settings-store.test.ts`: fake in-memory storage; round trip, missing key, bad JSON, invalid fields, throwing `getItem` and `setItem`, null storage.
- `tests/data/settings-defaults.test.ts`: the defaults file parses against the alto C and holds A3, F5, sharps on, 3 s.
- `tests/data/fonts.test.ts`: the font file, its hash and the license text are in `data/fonts/`.

`tests/node-modules.d.ts` declares only the `node:fs` and `node:crypto` functions the font test uses, so tests can read files without adding `@types/node`.

Components are not unit tested (no DOM in the test setup). Checked by hand with `make dev` and `make preview`: the first card varies across reloads, a click or key reveals early and the 3 s timer does not fire later, the next click or key shows a new hidden card that auto-reveals 3 s later, one press never reveals and advances together, a held key does not run through cards, with auto-advance on a revealed card is replaced by a hidden one after the advance delay with no input (hands-free), an early click or key during that wait skips at once and no second advance follows, with auto-advance off a revealed card stays until input, opening Settings during the advance wait stops it and shows nothing until closed, a sharp shows an accidental and `♯` in the name, reveal after 3 s, the staff does not shift, the glyph appears in the ocarina font, the placeholder shows with the `.ttf` request blocked, the font is served from the same origin, the footer link opens the license. Settings: the button is on every card; opening stops the timer and keys and clicks do nothing; closing shows a new hidden card that reveals after the set delay; the pickers never allow low at or above high; sharps off shows naturals only and moves a sharp bound; a blocked toggle is disabled and explained; the auto-advance checkbox and advance delay input change and save like the rest, a reload keeps them, a stored key without the new fields loads with auto-advance on and 3 s; a reload keeps the changes and `fingerwise.settings` is in DevTools; a corrupted key falls back to the defaults; with storage blocked the app still runs.
