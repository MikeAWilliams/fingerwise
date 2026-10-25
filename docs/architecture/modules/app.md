# app

`src/app/`

## Purpose

The Preact UI that wires the layers together: loads the instrument, shows a card, reveals it after a delay or on click or key press, advances to the next card, loads the tablature font and shows its license. Drawing is delegated to [`drill`](drill.md); this layer owns input and the timer.

## Public interface

- `App`: loads the alto C instrument, starts loading its font once on mount, and builds the pool once with `buildPool(instrument, { ...fullRange(instrument), includeSharps: true })` (fixed until F01-S05), and in one `useEffect` creates the card flow with `Math.random` and `REVEAL_DELAY_MS`, mirrors its state into `useState`, calls `start()` and calls `stop()` on cleanup. The same effect owns input: `click` on `document` and `keydown` on `window` each call `flow.step()` once. It ignores `keydown` with `event.repeat` or Ctrl/Meta/Alt held, and clicks inside an `<a>` (the license link). It renders a `Card` for the current state and the license footer.
- `createCardFlow({ pool, random, delayMs, onChange })` (`card-flow.ts`, plain TypeScript): returns `{ start, step, stop }` over the state `{ pitch, revealed }`. `start()` draws the first pitch with `drawPitch` and starts the reveal timer. `step()` reveals an unrevealed card and cancels the timer, or, if revealed, draws a different pitch, hides it and restarts the timer from zero; never both. `stop()` cancels the timer.
- `Card({ pitch, revealed, instrument, staffOptions, font })`: presentational. The staff above a fixed-height reveal area. Until revealed the area is empty. When revealed it shows `formatPitch(pitch)` and the [`tabView`](tab.md) of the instrument's glyph for that pitch: the glyph in its font family, or the placeholder message while the font loads or after it fails.
- `Staff({ pitch, options })`: draws the staff with [`drawStaff`](staff.md).
- `startRevealTimer(delayMs, onReveal): () => void` and `REVEAL_DELAY_MS` (3000, fixed until F01-S05): a `setTimeout` wrapper that returns a cancel function.
- `fontUrl(fileName)`: the built URL of a font in `data/fonts/`, found by file name with `import.meta.glob`, so the instrument JSON's `tablature.font` picks the font. Throws if missing.
- `loadFont(family, url, env): Promise<"loaded" | "failed">`: adds a `FontFace` to `env.fonts` and waits for it. `env` (`{ FontFace, fonts }`) is injected so it runs in Node tests. Never rejects.

## Layout

`app.css` gives the staff box and the reveal area fixed heights, so revealing does not move or resize the staff. The placeholder uses the same box as the glyph.

## Font and license

The font loads on page load, not at reveal, so it is usually ready when the delay ends. The family name is the file name without its extension ([tab](tab.md)). `vite.config.ts` sets `build.assetsInlineLimit` so files under `data/fonts/` are emitted as files, never data URIs. `dist/assets/` holds the `.ttf` and `OFL-*.txt`, and the footer links the license. No font request goes to another host. See [`data/fonts/README.md`](../../../data/fonts/README.md) and [ADR 0002](../decisions/0002-tablature-from-panzi-font.md).

## Dependencies

`src/core/*`, `src/render/staff`, `src/render/tab`, Preact.

## Tests

- `tests/app/reveal.test.ts`: fake timers; no call at 2999 ms, one call at 3000 ms, cancel works.
- `tests/app/card-flow.test.ts`: fake timers and a fake random; early reveal stops the timer, the next card starts a full delay, one step does exactly one thing, `stop()` cancels.
- `tests/app/font.test.ts`: `loadFont` with a fake `FontFace` (loaded and failed), `fontUrl` lookup.
- `tests/data/fonts.test.ts`: the font file, its hash and the license text are in `data/fonts/`.

`tests/node-modules.d.ts` declares only the `node:fs` and `node:crypto` functions the font test uses, so tests can read files without adding `@types/node`.

Components are not unit tested (no DOM in the test setup). Checked by hand with `make dev` and `make preview`: the first card varies across reloads, a click or key reveals early and the 3 s timer does not fire later, the next click or key shows a new hidden card that auto-reveals 3 s later, one press never reveals and advances together, a held key does not run through cards, a sharp shows an accidental and `♯` in the name, reveal after 3 s, the staff does not shift, the glyph appears in the ocarina font, the placeholder shows with the `.ttf` request blocked, the font is served from the same origin, the footer link opens the license.
