# F06-S01: Need scores and weighted draw

- **Feature:** `../design.md`
- **Modules:** `src/core/progress` (new), `src/core/drill`, `docs/architecture/`
- **Depends on:** none

## Story

As a player, I want the app to keep a score of how much work each note needs and draw by it, so that the notes I miss come up more often than the ones I know.

## Acceptance criteria

Each item must be checkable and numbered so progress checklists can refer to it. Do not edit these once work starts; raise a change instead.
- **AC1:** Given a set of scores with no entry for a pitch, when its need is read, then it is 1.
- **AC2:** Given a pitch with need `n`, when a correct grade is applied, then its need is `n + 0.3 * (0 - n)`; when a miss is applied, then it is `n + 0.3 * (1 - n)`. From 1, four correct grades give 0.7, 0.49, 0.343 and 0.2401; a miss from 0.08 gives 0.356 (within floating-point tolerance).
- **AC3:** Given the module, then the update rate (0.3) and the floor (0.05) are named constants defined in one place, and the draw weight of a pitch is `max(need, floor)`.
- **AC4:** Given scores, when they are reset, then every pitch reads as need 1.
- **AC5:** Given applying a grade or a reset, then the input scores are not modified (a new value is returned).
- **AC6:** Given a pool, a weight per pitch and a previous pitch, when the weighted draw runs with an injected random source, then each pitch other than the previous is chosen with probability proportional to its weight; with a stepping random every candidate is reachable and the previous pitch is never drawn.
- **AC7:** Given a pool of one pitch, the weighted draw returns it even when it is the previous; given an empty pool, or a weight that is not finite and positive, it throws `DrillError`.
- **AC8:** Given the weighted draw with equal weights, then it gives the same pitch as `drawPitch` for the same random value, so uniform behaviour is unchanged.
- **AC9:** Given the source, then `src/core/progress` imports only `../pitch` (and `../instrument` if needed), knows nothing of the judge's types (a grade is correct or miss), and uses no clock or `Math.random`; `src/core/drill` does not import `progress`; the core import and drill layer tests pass.
- **AC10:** Given the change, then `make verify` passes, `docs/architecture/modules/progress.md` exists and is listed in the modules index, and `drill.md` describes the weighted draw.

## Notes

- The rules are in [ADR 0007](../../../architecture/decisions/0007-smart-sampling-by-need.md).
- Nothing in the app uses this yet; S04 wires it in.
- Serialization of scores is S03.

## Test approach

Unit tests for the update rule (sequences from AC2, boundaries at 0 and 1), reset and immutability, the weighted draw under stepping and fixed randoms (proportions, no repeat, one-pitch and empty pools, bad weights), equal weights matching `drawPitch`, and import checks.
