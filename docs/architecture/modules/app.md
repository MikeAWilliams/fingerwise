# app

`src/app/`

## Purpose

The Preact UI that wires the layers together: loads the instrument, shows a card, reveals it after a delay, loads the tablature font and shows its license. It holds no drill logic.

## Public interface

- `App`: loads the alto C instrument, starts loading its font once on mount, and renders a `Card` for a fixed pitch (`C5`; F01-S04 replaces it) and the license footer.
- `Card({ pitch, instrument, staffOptions, font })`: the staff above a fixed-height reveal area. A `useEffect` keyed on `pitch` resets `revealed` and starts the timer, and cancels it on cleanup. Until revealed the area is empty. When revealed it shows `formatPitch(pitch)` and the [`tabView`](tab.md) of the instrument's glyph for that pitch: the glyph in its font family, or the placeholder message while the font loads or after it fails.
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
- `tests/app/font.test.ts`: `loadFont` with a fake `FontFace` (loaded and failed), `fontUrl` lookup.
- `tests/data/fonts.test.ts`: the font file, its hash and the license text are in `data/fonts/`.

Components are not unit tested (no DOM in the test setup). Checked by hand with `make dev` and `make preview`: reveal after 3 s, the staff does not shift, the glyph appears in the ocarina font, the placeholder shows with the `.ttf` request blocked, the font is served from the same origin, the footer link opens the license.
