# Plan 096: Align current status and dashboard holiday cards

> **Executor instructions**: Adopt Plan 095's helper without changing its rule.
>
> **Drift check (run first)**:
> `git diff --stat ecd49f5..HEAD -- packages/core/src/holiday-applicability.ts packages/availability/src/people/current-status.ts packages/availability/src/people/current-status.test.ts packages/availability/src/dashboard/dashboard-service.ts packages/availability/src/dashboard/dashboard-service.test.ts`
> Plan 095 changes are expected. Stop if its exported input differs from the
> projections named below.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: `plans/095-centralise-the-supported-holiday-rule.md` DONE
- **Category**: bug
- **Planned at**: commit `ecd49f5`, 2026-08-24; re-stamp after Plan 095
- **Execution status**: TODO
- **Supersedes**: consumer half of rejected Plan 065

## Why this matters

`current-status.ts` contains both single-person and batched holiday queries that
select neither assignments nor default classification. The dashboard also has
its own next-holiday predicate. Leaving them behind would keep “today” status
inconsistent with feeds, calendar, analytics and working-day duration.

## Current state

- `current-status.ts:449-485` performs a single-person holiday read and
  `:487-572` a separate batched read; neither selects assignments or
  `default_classification`.
- `dashboard-service.ts:961-991` calculates upcoming holidays separately and
  `:1406` defines `holidayAppliesToActor`, which activates unsupported scopes.
- Dashboard status is surfaced separately at `dashboard-service.ts:775-784`, so
  a partial migration would leave two visible answers.
- The predecessor export is `holidayIsNonWorking(input)` with
  `holiday: { archivedAt, countryCode, regionCode, defaultClassification,
  locationAssignments: [{ locationId, classification }] }` and
  `subject: { locationId, countryCode, regionCode }`; every nullable field is
  explicit.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Status | `bunx vitest run packages/availability/src/people/current-status.test.ts` | single/batch parity cases pass |
| Dashboard | `bunx vitest run packages/availability/src/dashboard/dashboard-service.test.ts` | today/next-holiday cases pass |
| Gates | `bun run check && bun run typecheck && bun run test && bun run test:integration && bun run build && git diff --check` | every command exits 0 |

## Scope

Modify only the four files in the drift check and plan bookkeeping. Do not
change the core rule, holiday writers/UI, feed/calendar/analytics/duration, or
activate organisation/team/person/feed scopes.

## Git workflow

- Branch: `fix/096-align-holiday-consumers`
- Commit: `fix(availability): align status holiday rules`
- Do not push or open a pull request unless instructed.

## Steps

1. Add equivalent fixtures for regional, custom, working override, archived and
   missing-location holidays to single status, batched status and next-holiday
   dashboard tests.
2. Extend both current-status projections to the exact Plan 095 field set,
   including active location assignments and `default_classification`.
3. Pass location ID plus country/region, or the Organisation fallback, to the
   core `holidayIsNonWorking` predicate using the exact
   `HolidayApplicabilityInput` defined in Plan 095. Replace
   `holidayAppliesToActor`; do not activate organisation,
   team, person or feed assignments.
4. Assert single/batch status parity and that “today” and “next holiday” make
   the same applicability decision.
5. Run focused dashboard/status tests and every repository-required gate.

## Step verification

1. Both focused commands pass new pre-change fixtures that capture current
   disagreement.
2. Status tests prove both query shapes contain the exact helper fields.
3. `rg -n "holidayAppliesToActor" packages/availability/src/dashboard` returns no match and focused tests pass.
4. The same fixture table produces identical single, batch and next-card results.
5. Both focused commands and the full gates command exit 0.

## Test plan

Follow the existing mocked database style in both suites. Cover regional,
custom, archived, default working/non-working, location override and person
without location. Use fixed Brisbane dates/time zone. Assert organisation,
team/person/feed assignments remain inert, dual-tenant query predicates remain,
and helper-only fields never appear in the public current-status result.

## Done criteria

- [ ] Feed projection, calendar, analytics, duration, single current status,
      batched current status and dashboard holiday cards use the canonical rule.
- [ ] Single and batched status results are identical.
- [ ] Dashboard cards agree with feed/calendar/duration fixtures.
- [ ] Tenant and organisation scoping remain explicit.
- [ ] All gates pass.

## STOP conditions

Stop if Plan 095 is incomplete, query expansion exposes raw payloads, or parity
would require changing the resolved product rule.

## Maintenance notes

Keep single and batched projections in lockstep. Any new status consumer should
consume the core helper rather than copy its conditions.
