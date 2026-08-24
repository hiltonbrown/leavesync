# Plan 065: One rule for whether a public holiday applies to a person

> **Reconciliation outcome (2026-08-24)**: **REJECTED** because the proposed
> all-scope rule activates dormant assignment types without supported writers
> or product UI and misses current-status consumers. Plans 095 and 096 implement
> the supported location/jurisdiction rule. Do not execute this document.

> **Historical executor instructions (do not use)**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the next
> step. If anything in "STOP conditions" occurs, stop and report — do not
> improvise. When done, update this plan's row in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat ecd49f5..HEAD -- packages/core/src/holiday-applies.ts packages/feeds/src/projection packages/availability/src/calendar packages/availability/src/analytics packages/availability/src/duration packages/availability/src/dashboard`
> If any in-scope file changed, compare the "Current state" excerpts against the
> live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: MED — this plan **changes behaviour on three surfaces by design**
- **Depends on**: not applicable, rejected
- **Superseded by**: Plans 095 and 096
- **Category**: tech-debt, bug
- **Planned at**: commit `ecd49f5`, 2026-08-24
- **Execution status**: REJECTED, superseded by Plans 095 and 096
- **Covers findings**: A-02

## Why this matters

Five independent implementations answer the same question — does this public
holiday apply to this person — and they disagree. The same holiday can be
non-working on the dashboard, working on the calendar, absent from the ICS feed,
and counted differently again in leave-duration maths. Because
`working-days.ts` feeds the duration shown next to leave requests, the
divergence has a money-adjacent consequence, not just a cosmetic one.

The schema models five assignment scope types. Four of the five implementations
silently ignore four of them, so a team-scoped or person-scoped holiday
assignment is a no-op everywhere except the dashboard. And
`PublicHolidayAssignment.include_in_feeds` is written on every assignment and
**read nowhere**, so it cannot be honoured at all.

This is not a refactor for tidiness. It is deciding what the product's holiday
rule actually is, once, and then having one place to change it.

## Current state

Five implementations, all verified present:

| Location | Behaviour |
|---|---|
| `packages/feeds/src/projection/feed-projection.ts:314` `holidayAppliesToLocation` | location scope only; strict `location.countryCode !== holiday.country_code`; `"CUSTOM"` treated as applying everywhere (`:335`) |
| `packages/availability/src/calendar/calendar-service.ts:687` `holidayAppliesToLocation` | location only; no `archived_at` guard inside |
| `packages/availability/src/analytics/leave-reports-service.ts:522` `holidayAppliesToLocation` | location only; compares country **only when** `location?.country_code` is truthy, so a Location with a null country matches every country's holidays |
| `packages/availability/src/duration/working-days.ts:352` `shouldExcludeHoliday` | location only; `country_code === "CUSTOM"` short-circuits true; adds a "region set on holiday but not on location ⇒ excluded" rule the others lack |
| `packages/availability/src/dashboard/dashboard-service.ts:1406` `holidayAppliesToActor` | the only one honouring `organisation`, `team` and `person` scopes; defaults to `true` when there are no assignments; ignores `default_classification`, `country_code` and `region_code` entirely |

The schema, `packages/database/prisma/schema.prisma:238`:
`public_holiday_assignment_scope_type { organisation, location, team, person, feed }`.

`PublicHolidayAssignment.include_in_feeds` (`schema.prisma:789`) is written as
`true` at `packages/database/src/queries/public-holidays.ts:166` and `:177`, and
read nowhere.

**Where the shared predicate must live.** Verified package dependencies:
`@repo/availability` depends on `@repo/feeds`; `@repo/feeds` does **not** depend
on `@repo/availability`; both depend on `@repo/core`, which depends only on
`zod`. So the predicate goes in **`@repo/core`** as a pure function. It must not
import Prisma or any database module.

## The decision this plan must make first

Before writing code, reconcile PRODUCT.md's older location-oriented wording
with the schema's five assignment scopes, write down the canonical rule and get
it agreed. The proposal, derived from the five implementations:

1. **Scope coverage** from the dashboard: honour `organisation`, `location`,
   `team` and `person` assignments.
2. **Country/region strictness** from the calendar and feed: compare
   `country_code` and `region_code` strictly, with `"CUSTOM"` meaning "applies
   regardless of country".
3. **No assignments** means the holiday applies by jurisdiction alone (today's
   dashboard default), not that it applies to nobody.
4. **`include_in_feeds`** is honoured **only** on the feed path — it is a
   publication concern, not a working-time concern. A holiday excluded from feeds
   still counts as non-working for duration maths.
5. The `feed` scope type is out of scope for this plan unless a use exists;
   record that decision rather than implementing it speculatively.

Point 4 is the subtle one. State it explicitly in the shared module's doc
comment, because it is the rule most likely to be "simplified" incorrectly later.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Lint | `bun run check` | exit 0 |
| Typecheck | `bun run typecheck` | exit 0 |
| Unit tests | `bun run test` | exit 0, 17/17 tasks |
| Core | `cd packages/core && bunx vitest run` | 2 files / 18 tests baseline, plus new |

## Scope

**In scope**:
- `packages/core/src/holiday-applies.ts` (create) and its test
- the five call sites listed in "Current state", each losing its local copy
- the tests of each affected surface

**Out of scope**:
- Query shapes. Plans 060 and 061 narrow the projections this predicate reads
  from; if either has not landed, expect the field set to move.
- The `"CUSTOM"` sentinel itself. It is deliberate and handled; this plan
  preserves its meaning rather than replacing it with a nullable column.
- `include_in_feeds` write paths in `packages/database/src/queries/public-holidays.ts`.
- The `feed` scope type.

## Git workflow

- Branch: `advisor/065-unify-holiday-predicate`
- Conventional commits, e.g. `refactor(core): one predicate for holiday applicability`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Characterise all five behaviours before changing any of them

Write a test table capturing what each of the five implementations returns
**today** for a shared matrix of inputs: matching and mismatching country,
matching and mismatching region, null location country, `"CUSTOM"` country, no
assignments, organisation/team/person/location assignments, archived holiday,
`include_in_feeds` false.

This is the safety net. Without it there is no way to tell an intended behaviour
change from an accidental one.

**Verify**: the table runs and documents five columns of current behaviour,
including the disagreements.

### Step 2: Write the canonical predicate in `@repo/core`

Implement one pure function over an explicit input shape — something like
`{ holiday, assignments, person: { id, teamId, locationId, countryCode, regionCode } }`
plus a `purpose: "feed" | "working-time"` discriminator to carry rule 4.

No Prisma imports. No database access. Pure and directly testable.

**Verify**: `cd packages/core && bunx vitest run` → the new tests pass;
`bun run typecheck` → exit 0.

### Step 3: Adopt it one surface at a time, in this order

Land each surface as its own commit so a regression is bisectable:

1. `working-days.ts` — highest consequence, best existing test coverage after
   plan 052
2. `feed-projection.ts`
3. `calendar-service.ts`
4. `leave-reports-service.ts`
5. `dashboard-service.ts`

After each, run that surface's suite and record which characterisation-table
expectations changed and why. A changed expectation is fine; an **unexplained**
changed expectation is a STOP condition.

**Verify**: after each step, `bun run test` → exit 0, 17/17 tasks.

### Step 4: Honour `include_in_feeds` on the feed path

With the predicate unified, make the feed projection pass `purpose: "feed"` and
respect `include_in_feeds`. This is new capability, not a refactor — a holiday
assignment flagged out of feeds now actually stays out.

**Verify**: a feed projection test asserting an `include_in_feeds: false`
assignment excludes the holiday from ICS output while duration maths still
counts it as non-working.

### Step 5: Delete the five local copies

**Verify**:
`grep -rn "holidayAppliesToLocation\|shouldExcludeHoliday\|holidayAppliesToActor" packages/ | grep -v "/generated/"`
returns only imports of the shared function, no local definitions.

## Test plan

- `packages/core/src/holiday-applies.test.ts`: the full input matrix from Step 1,
  now with one expected column instead of five
- one adoption test per surface asserting the surface's observable output for a
  fixed dataset
- feed: `include_in_feeds: false` excludes from ICS
- working time: `include_in_feeds: false` still counts as non-working
- team-scoped and person-scoped assignments now apply on every surface, not just
  the dashboard

Verification: `bun run test` → exit 0, with at least 15 new tests.

## Done criteria

ALL must hold:

- [ ] `bun run check` exits 0
- [ ] `bun run typecheck` exits 0
- [ ] `bun run test` exits 0, 17/17 tasks, with at least 15 new tests
- [ ] `packages/core/src/holiday-applies.ts` exists, imports no database module
      (`grep -c "@repo/database" packages/core/src/holiday-applies.ts` prints `0`)
- [ ] The grep in Step 5 finds no local predicate definitions
- [ ] Every behaviour change against the Step 1 characterisation table is listed
      in the report with its justification
- [ ] `plans/README.md` row updated

## STOP conditions

Stop and report if:

- The canonical rule in "The decision this plan must make first" has not been
  agreed by the operator. **Do not pick one and proceed** — this plan changes what
  customers see on three surfaces, and the choice is a product decision.
- A characterisation expectation changes and you cannot explain why from the
  rule. That is an accidental behaviour change.
- Unifying requires `@repo/core` to import Prisma types. Restructure the input
  shape instead; core must stay pure.
- Team- or person-scoped assignments turn out to exist in production data in a
  way that would visibly change customers' calendars on deploy. That needs an
  operator heads-up before it ships, not after.

## Maintenance notes

- One predicate now governs feeds, calendar, dashboard, analytics and duration.
  That is the point, and it is also the risk: a change here moves five surfaces
  at once. A reviewer should require the full matrix to be re-run on any edit.
- The `purpose` discriminator is the seam that keeps publication concerns out of
  working-time maths. If someone proposes collapsing it, rule 4 is the reason not
  to.
- Deliberately deferred: the `feed` assignment scope type, which the schema
  models and nothing uses.
