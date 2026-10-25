# tab

`src/render/tab/`

## Purpose

Decides what to show for a pitch's fingering: the glyph in the tablature font once the font is loaded, or a placeholder until then. It is given a glyph string and a font status. It knows nothing of holes, instruments, the drill or Preact ([ADR 0002](../decisions/0002-tablature-from-panzi-font.md)).

## Public interface

- `type FontStatus = "loading" | "loaded" | "failed"`.
- `interface TabFont`: `family` (CSS family name) and `status`.
- `fontFamilyFor(fileName): string`: the family name the font is registered under, the file name without its extension (`Open-12-Hole-Ocarina-1.ttf` gives `Open-12-Hole-Ocarina-1`).
- `tabView(glyph, font): TabView`: `{ kind: "glyph", text, fontFamily }` when loaded, with the glyph passed through as given; otherwise `{ kind: "placeholder", message }`, `Loading fingering…` while loading and `Fingering font could not load` on failure.

## Dependencies

None. It must not import `src/app/`. Loading the font is the app's job ([app](app.md)).

## Tests

- `tests/render/tab.test.ts`: each status gives the right view, glyphs pass through untouched, `fontFamilyFor` strips the extension.
- `tests/render/staff-imports.test.ts`: the tab module does not import the app.
