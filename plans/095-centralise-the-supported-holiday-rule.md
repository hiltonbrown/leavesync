# Plan 095: Centralise the supported location and jurisdiction holiday rule

> **Executor instructions**: Implement only the supported location rule below.
> Do not activate schema scopes merely because they exist.
>
> **Drift check (run first)**:
> `git diff --stat ecd49f5..HEAD -- PRODUCT.md packages/core packages/feeds/src/projection/feed-projection.ts packages/feeds/src/projection/feed-projection.test.ts packages/availability/src/calendar packages/availability/src/analytics/leave-reports-service.ts packages/availability/src/duration/working-days.ts`
> Plan 061 changes are expected. Stop if its feed projection no longer loads the
> fields required by the resolved rule.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: `plans/061-halve-the-work-on-the-ics-feed-read-path.md` DONE
- **Category**: bug
- **Planned at**: commit `ecd49f5`, 2026-08-24; re-stamp after Plan 061
- **Execution status**: TODO
- **Supersedes**: core half of rejected Plan 065

## Resolved product rule

1. Archived holidays never apply.
2. A matching active location assignment overrides `default_classification`.
3. Otherwise the default must be `non_working`.
4. `CUSTOM` bypasses country matching; every other holiday requires exact
   country, and a regional holiday requires exact region.
5. A person without a location uses the Organisation country and null region.
6. Organisation, team, person and feed assignments remain inert until a
   supported writer and UI productise them. `include_in_feeds` is not activated.

A matching location assignment is an explicit override and therefore wins even
when the holiday jurisdiction differs from the location. The schema unique
constraint on `(public_holiday_id, scope_type, scope_value)` permits only one
assignment for that holiday/location; ignore archived assignments. A person
without a location cannot match one and uses the Organisation country/null
region fallback.

## Why this matters

Feed, calendar, analytics and duration code independently decide whether a
holiday is non-working and disagree on country, region and default behaviour.
Duration affects leave units, so divergence is money-adjacent correctness, not
only display inconsistency.

## Current state

- Private predicates exist in `feed-projection.ts:315-345`,
  `calendar-service.ts:687-713`, `leave-reports-service.ts:522-552` and
  `working-days.ts:341-388`.
- The only supported production assignment writer/read path is location-scoped
  (`holiday-service.ts:399-435`). Other schema scopes have no supported product
  writer; the feed import helper has no production caller.
- `PRODUCT.md:423-425` still describes a removed `location_id` column.
- `@repo/core` has no dependency on availability or feeds, so it is the valid
  home for a pure shared predicate.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Core | `bunx vitest run packages/core/src/holiday-applicability.test.ts` | resolved-rule matrix passes |
| Consumers | `bunx vitest run packages/feeds/src/projection/feed-projection.test.ts packages/availability/src/calendar/calendar-service.test.ts packages/availability/src/analytics/leave-reports-service.test.ts packages/availability/src/duration/working-days.test.ts` | equivalent fixtures pass |
| Gates | `bun run check && bun run typecheck && bun run test && bun run test:integration && bun run build && git diff --check` | every command exits 0 |

## Scope

A pure helper in `@repo/core`, PRODUCT's stale `location_id` wording, and the
four consumers that already load the full holiday/assignment shape: feed
projection, calendar, analytics and working-day duration. Current status and
dashboard cards belong to Plan 096.

**In-scope files**: the drift-check files plus
`packages/core/src/holiday-applicability.ts`, its test and the root core export.
**Out of scope**: database schema/writers, public-holiday UI, current status,
dashboard cards and dormant assignment scopes.

## Git workflow

- Base branch: `preview` (`origin/preview`), not `main`. Branch from `preview`, commit there, and land the finished work on `preview` — see `plans/README.md` § Execution policy.
- Work directly in this working tree. No isolated git worktree is used for this repo's plan executions.
- Branch: `fix/095-supported-holiday-rule`
- Commit: `fix(availability): centralise holiday applicability`
- Do not push or open a pull request unless instructed.

## Steps

1. Characterise each existing private predicate in its co-located suite for
   archive, custom, country, region, default and location-override cases.
2. Add `holidayIsNonWorking(input: HolidayApplicabilityInput): boolean` in
   `packages/core/src/holiday-applicability.ts`. The input contains
   `holiday: { archivedAt, countryCode, regionCode, defaultClassification,
   locationAssignments: [{ locationId, classification }] }` and
   `subject: { locationId, countryCode, regionCode }`. Use nulls explicitly.
3. Adopt the helper in feed projection, calendar, leave analytics and duration.
   Delete replaced private predicates without changing query ownership.
4. Correct PRODUCT to describe location assignments rather than a removed
   `location_id` column. State that dormant scopes are unsupported.
5. Prove all four surfaces agree from equivalent fixtures, then run every gate.

## Step verification

1. Consumer command passes the pre-change characterisation fixtures.
2. Core command passes every row of the six-rule matrix with no database mock.
3. `rg -n "holidayAppliesToLocation|shouldExcludeHoliday" packages/feeds/src/projection packages/availability/src/{calendar,analytics,duration}` returns no replaced private predicate, then consumer tests pass.
4. `rg -n "location assignment|organisation|team|person|feed" PRODUCT.md` shows the supported/inert distinction and no stale column claim.
5. Consumer and full gates commands exit 0.

## Test plan

Create a table-driven core suite for archive, active/inactive location override,
working/non-working default, custom, exact/mismatched country, exact/missing/
mismatched region and Organisation fallback. Mirror a smaller equivalent matrix
in each co-located consumer suite to prove query-to-helper wiring.

## Done criteria

- [ ] One pure helper implements the complete resolved rule.
- [ ] Four full-row consumers use it without activating dormant scopes.
- [ ] Product documentation matches the schema and supported writers.
- [ ] Characterisation, cross-surface and repository gates pass.

## STOP conditions

Stop if Plan 061 is not DONE, an in-scope consumer cannot load active location
assignments, or adopting the helper would require activating another scope.

## Maintenance notes

A future assignment-scope feature must add a supported writer, UI and explicit
precedence contract before changing this helper.
