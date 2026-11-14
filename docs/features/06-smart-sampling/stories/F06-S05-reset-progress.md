# F06-S05: Reset progress

- **Feature:** `../design.md`
- **Modules:** `src/app` (`Settings.tsx`, `App.tsx`), `docs/architecture/`
- **Depends on:** F06-S03

## Story

As a player, I want to clear what the app has learned about my playing, so that I can start fresh when I choose to.

## Acceptance criteria

Each item must be checkable and numbered so progress checklists can refer to it. Do not edit these once work starts; raise a change instead.
- **AC1:** Given the settings view, when the Cards section is open, then a "Reset progress" button shows under the smart sampling checkbox, enabled whether the checkbox is on, off or disabled.
- **AC2:** Given the button is pressed, then the player is asked "Reset progress? This can't be undone." and nothing changes until they confirm; cancelling changes nothing.
- **AC3:** Given the player confirms, then every pitch of the current instrument reads as need 1, this is saved, and the stored scores of other instruments are kept.
- **AC4:** Given a reset, then no setting changes.
- **AC5:** Given blocked or failing storage, when the player confirms, then the scores in memory are cleared and nothing throws.
- **AC6:** Given the button, then it meets the 44 px touch target and pressing it never steps a card.
- **AC7:** Given the change, then `make verify` passes and `app.md` describes the button and its confirmation.

## Notes

- How the confirmation is shown (a native dialog or an inline step) is the breakdown's choice.

## Test approach

Unit test for the reset path through the progress store (current instrument cleared and saved, others kept, storage failures). By hand: cancel keeps the scores; confirm makes a deliberately missed note no longer favoured; a reload keeps the reset.
