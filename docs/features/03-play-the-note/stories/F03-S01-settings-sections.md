# F03-S01: Settings sections

- **Feature:** `../design.md`
- **Modules:** `src/app`, `docs/architecture/`
- **Depends on:** F01-S08, F02-S02

## Story

As a player, I want the settings grouped into collapsible sections, so that the settings view stays short and readable as features add more of them.

## Acceptance criteria

Each item must be checkable and numbered so progress checklists can refer to it. Do not edit these once work starts; raise a change instead.
- **AC1:** Given the settings view, then the existing controls (lowest and highest note, include sharps, reveal delay, auto-advance, advance delay) sit in one section titled "Cards". No setting, validation rule, default, stored field or card behavior changes, and the existing settings tests pass unchanged.
- **AC2:** Given a section, then it is a native `<details>` with a `<summary>` showing its title and, while closed, a one-line summary of its current values (for Cards, for example "A3 to F5, sharps, reveal 3 s, advance 3 s").
- **AC3:** Given the keyboard, then a section opens and closes with Enter or Space on its summary, and a screen reader announces it as expandable and expanded or collapsed.
- **AC4:** Given the settings view opens, then the Cards section is open and any section added later starts closed.
- **AC5:** Given a section has a message to show (such as the sharps-blocked note, and later a rejected edit, a notice or validator problems), then it is open while the message shows, and opens by itself if it was closed when the message appears.
- **AC6:** Given a section is opened or closed, then the state is not saved; each time the view opens it starts as in AC4.
- **AC7:** Given a long settings view, then the Close button stays reachable without scrolling past every section (a sticky footer), and never covers a control or a message.
- **AC8:** Given 360x640 portrait, 640x360 landscape and tablet sizes, then the view has no sideways scroll, targets keep their 44 px size (F02-S02), and a closed section hides its controls from tab order.
- **AC9:** Given a section component that takes a title, a summary line, an optional message state and children, then later features add a section with no change to the structure.
- **AC10:** Given the change, then `make verify` passes and the `app` module doc describes the sections, the open rules and the sticky footer.

## Notes

- Later sections: Sound (feature 3), Microphone (feature 4), Song (feature 5). Each of those stories adds its own section using this one's component.
- Rules that cross sections show their message next to the input being edited and name the other value (for example the sound delay plus sound duration rule, F03-S04, when the advance delay in Cards is edited).
- A summary line is derived from the settings, like the rest of the view; it is not stored.
- No new dependency; this is plain Preact and CSS.

## Test approach

Unit tests for the summary-line and open-state logic as pure functions in `settings-form.ts` style. The look, keyboard behavior, screen reader announcement, sticky footer and layouts are checked by hand in the browser at the sizes above.
