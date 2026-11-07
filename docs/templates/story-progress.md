# F<NN>: <feature name>

Feature: [`<n>-<name>`](../docs/features/<n>-<name>/design.md)

One section per story, in dependency order. Each story is one commit that leaves the repo building, linted and passing tests.

## F<NN>-S01: <name>

Story: [`F<NN>-S01-<name>`](../docs/features/<n>-<name>/stories/F<NN>-S01-<name>.md)

Covers: AC1, AC2
- [ ] <how: concrete step, naming files/functions/data>
- [ ] <how: concrete step>
- [ ] Tests for the above pass
- [ ] Update `docs/architecture/modules/<module>.md`; trim the vision to a pointer

## F<NN>-S02: <name>

Story: [`F<NN>-S02-<name>`](../docs/features/<n>-<name>/stories/F<NN>-S02-<name>.md)

Covers: AC1
- [ ] <how: concrete step>

## Closing

- [ ] Verify every story's acceptance criteria
- [ ] User acceptance
- [ ] Delete this file (final commit before merge)

## Notes

Only if needed: assumptions made, blockers, surprises. A question needing a decision becomes an ADR.
