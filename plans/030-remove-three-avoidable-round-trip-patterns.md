# Plan 030: Remove three avoidable round-trip patterns

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report, do not improvise. When done, update this plan's status row in
> `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 75202db..HEAD -- apps/app/lib/server/get-active-org-context.ts apps/app/lib/server/require-active-org-page-context.ts packages/availability/src/holidays/holiday-service.ts packages/availability/src/dashboard/dashboard-service.ts`
> If any changed since this plan was written, re-check the "Current state"
> facts before proceeding.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: performance
- **Planned at**: commit `75202db`, 2026-07-25

## Why this matters

Three independent patterns each turn one logical operation into many database
round trips. They are unrelated in code but identical in shape, which is why
they are batched into one plan: fix the shape once and the reviewer learns the
pattern.

1. **Per-request context resolution is not memoised.**
   `getActiveOrgContext` performs a Clerk auth call and a database read, and it
   or its siblings are called from 117 sites. A single page render that touches
   a layout, a header and three server components repeats that work once per
   caller, in the same request, for the same answer.
2. **The public holiday import probes before every upsert.** For each holiday
   it runs a `findFirst` and then an `upsert` keyed on the same unique index.
   The `findFirst` result is used only to decide whether to increment
   `importedCount` or `skippedCount`. It doubles the round trips for
   bookkeeping.
3. **The dashboard drains the entire people list to compute counts.**
   `while (true)` paginating 200 at a time, accumulating every `PersonListItem`
   in memory, so that `buildTeamTodayCard` can tally six category counters. For
   an organisation with 2,000 people that is ten sequential round trips and
   2,000 hydrated objects, on every dashboard render, to produce six integers.

None of these is a correctness bug and none is urgent at small tenant sizes.
They are worth fixing because all three degrade with tenant size in ways that
will not show up in development, and because the dashboard one is on the first
page every user sees after signing in.

## Current state

### 1. `getActiveOrgContext` is not memoised

`apps/app/lib/server/get-active-org-context.ts`, lines 1-40:

```typescript
import "server-only";

import { requireOrg } from "@repo/auth/helpers";
import type { ClerkOrgId, OrganisationId, Result } from "@repo/core";
import { appError } from "@repo/core";
import { getOrganisationById } from "@repo/database/src/queries/organisations";

/**
 * Resolves the active organisation context from Clerk auth and validated params.
 * Must be called in server context only.
 *
 * Returns the clerk_org_id and organisation_id with full scope validation.
 * If organisation is missing or not accessible within the clerk_org_id boundary,
 * returns an error result.
 */
export async function getActiveOrgContext(organisationId: string): Promise<
  Result<{
    clerkOrgId: ClerkOrgId;
    organisationId: OrganisationId;
  }>
> {
  // Get authenticated Clerk Org ID
  let clerkOrgId: ClerkOrgId;
  try {
    clerkOrgId = (await requireOrg()) as ClerkOrgId;
  } catch {
    return {
      ok: false,
      error: appError(
        "unauthorised",
        "Not authenticated or no organisation selected"
      ),
    };
  }

  // Validate organisation exists and is within scope
  const orgResult = await getOrganisationById(
    clerkOrgId,
    organisationId as OrganisationId
  );
```

Two awaited calls, one of them a database read, for a value that is constant
within a request.

Count the callers:

```
grep -rn "getActiveOrgContext\|requireActiveOrgPageContext\|resolveAdminContext" apps/app --include=*.ts --include=*.tsx | grep -v node_modules | grep -v "\.test\." | wc -l
```

At commit `75202db` this returns `117`.

There is no use of React's `cache()` anywhere in the repository:

```
grep -rn "\bcache(" apps packages --include=*.ts --include=*.tsx | grep -v node_modules | grep -v "feed-cache\|runtime-cache\|cacheLife"
```

returns nothing.

### 2. The holiday import probes before every upsert

`packages/availability/src/holidays/holiday-service.ts`, lines 133-182:

```typescript
    for (const holiday of holidays) {
      const sourceRemoteId = sourceRemoteIdForHoliday(
        input.countryCode,
        input.regionCode,
        holiday.date,
        holiday.name
      );

      const existing = await database.publicHoliday.findFirst({
        where: {
          ...scopedQuery(input.clerkOrgId, input.organisationId),
          source: "nager",
          source_remote_id: sourceRemoteId,
        },
        select: { id: true },
      });

      await database.publicHoliday.upsert({
        where: {
          organisation_id_source_source_remote_id: {
            organisation_id: input.organisationId,
            source: "nager",
            source_remote_id: sourceRemoteId,
          },
        },
        create: {
          ...
        },
        update: {
          ...
        },
```

The `findFirst` and the `upsert` key on the same identity. The only use of
`existing` is the counter bookkeeping immediately after (`importedCount`
versus `skippedCount`, declared at lines 130-131). Prisma's `upsert` does not
report which branch it took, which is presumably why the probe exists.

Note the loop is also fully sequential: each iteration awaits two round trips
before the next begins.

### 3. The dashboard drains all people

`packages/availability/src/dashboard/dashboard-service.ts`, lines 1057-1098:

```typescript
  const collected: PersonListItem[] = [];
  let cursor: string | null = null;
  let totalCount = 0;

  while (true) {
    const result = await listPeople({
      actingPersonId: input.actingPersonId,
      clerkOrgId: input.clerkOrgId,
      filters: {
        includeArchived: false,
        personType: "all",
        xeroLinked: "all",
        xeroSyncFailedOnly: false,
      },
      organisationId: input.organisationId,
      pagination: {
        cursor,
        pageSize: 200,
      },
      role: input.role,
    });
    if (!result.ok) {
      return result;
    }

    totalCount = result.value.totalCount;
    collected.push(...result.value.people);
    if (!result.value.nextCursor) {
      break;
    }
    cursor = result.value.nextCursor;
  }

  return {
    ok: true as const,
    value: {
      nextCursor: null,
      people: collected,
      totalCount,
    },
  };
```

The consumer is `buildTeamTodayCard` (line 1127 onwards), which counts:

```typescript
function buildTeamTodayCard(people: PersonListItem[]) {
  let peopleOnLeaveCount = 0;
  let peopleWorkingFromHomeCount = 0;
  let peopleTravellingCount = 0;
  let peopleOtherOooCount = 0;
  let peopleAvailableCount = 0;
  let peopleWithXeroSyncFailedCount = 0;
  const peopleNeedingAttention: Array<{
```

Six counters and a "needing attention" list. Read the rest of that function
during execution to see exactly what `peopleNeedingAttention` requires, because
it is the part that may genuinely need row data rather than counts.

Note also the unbounded `while (true)`: there is no page-count ceiling, so a
pathological cursor (one that never advances) loops forever. That is the same
shape plan 003 fixes in the Xero reader.

## Design

Three independent fixes. **Each is separately shippable and separately
revertible**; if one turns out to be harder than expected, land the others.

**Fix 1: wrap the context resolvers in React's `cache()`.** `cache()` memoises
per request, which is exactly the scope of the redundancy. It is a
framework-provided primitive with no invalidation semantics to get wrong: the
cache lives and dies with the request.

**Fix 2: batch the existence probe.** Before the loop, fetch the set of
`source_remote_id`s that already exist in one query, then decide the counters
from the set rather than from a per-row probe. Halves the round trips and
removes the sequential dependency between probe and write.

**Fix 3: count in the database rather than in memory.** Replace the drain with
aggregate queries that return the six counters directly, plus a bounded query
for `peopleNeedingAttention`. This is the largest of the three and the one
most likely to hit a snag, because the counters are derived from availability
state rather than from `Person` columns.

**If fix 3 turns out to require restructuring `listPeople`'s filtering
semantics, stop and report rather than reimplementing them.** Wrong counts on
the dashboard are worse than slow ones.

## Commands you will need

All run from the repo root.

```
bun install                # run first if you hit "Cannot find module '@repo/observability/log'"
bun run check
bun run typecheck
bun run test
bunx vitest run packages/availability/src/holidays/holiday-service.test.ts
bunx vitest run packages/availability/src/dashboard/dashboard-service.test.ts
```

## Scope

**In scope:**

- `apps/app/lib/server/get-active-org-context.ts`
- `apps/app/lib/server/require-active-org-page-context.ts`
- `packages/availability/src/holidays/holiday-service.ts` and its test
- `packages/availability/src/dashboard/dashboard-service.ts` and its test

**Explicitly out of scope:**

- The 117 call sites of the context resolvers. `cache()` wraps the function; no
  caller changes.
- `packages/availability/src/people/people-service.ts` and `listPeople`'s
  semantics. Fix 3 adds new aggregate queries; it does not change the existing
  list query.
- Any other `while (true)` loop. Plan 003 owns the Xero reader's.
- Vercel KV, the feed cache, or any cross-request caching. `cache()` is
  per-request only and this plan introduces no persistent cache.
- Any database index. If profiling suggests one is needed, report it rather
  than adding a migration inside a performance plan.
- The deep import `@repo/database/src/queries/organisations` visible in the
  excerpt above. That is plan 031.

## Git workflow

```
git checkout -b perf/remove-avoidable-round-trips
```

One commit per fix:

```
perf(app): memoise org context resolution per request
perf(availability): batch the public holiday existence check
perf(availability): count team availability in the database
```

Do not push or open a pull request unless the user asks.

## Steps

### Step 1: Establish the baseline

```
bun run check
bun run typecheck
bun run test
```

**Expected**: all three exit 0. Record the total test count.

### Step 2: Fix 1, memoise the context resolvers

Edit `apps/app/lib/server/get-active-org-context.ts`. Wrap the exported
function in React's `cache()`:

```typescript
import "server-only";

import { requireOrg } from "@repo/auth/helpers";
import type { ClerkOrgId, OrganisationId, Result } from "@repo/core";
import { appError } from "@repo/core";
import { getOrganisationById } from "@repo/database/src/queries/organisations";
import { cache } from "react";

/**
 * Resolves the active organisation context from Clerk auth and validated params.
 * Must be called in server context only.
 *
 * Returns the clerk_org_id and organisation_id with full scope validation.
 * If organisation is missing or not accessible within the clerk_org_id boundary,
 * returns an error result.
 *
 * Memoised with React cache() because this is called from over a hundred sites
 * and a single page render reaches it several times with the same argument. The
 * memo is per request and dies with it, so there is no staleness window and no
 * cross-tenant risk: a different organisationId is a different cache entry, and
 * a different request shares nothing.
 */
export const getActiveOrgContext = cache(
  async (
    organisationId: string
  ): Promise<
    Result<{
      clerkOrgId: ClerkOrgId;
      organisationId: OrganisationId;
    }>
  > => {
    // ... existing body verbatim
  }
);
```

**Keep the body byte-identical.** This step changes how the function is
memoised, not what it computes.

Then do the same for `apps/app/lib/server/require-active-org-page-context.ts`.
Read it first: if it delegates to `getActiveOrgContext`, memoising the inner
one may be sufficient and wrapping both is redundant. Wrap the outer one too
only if it does independent work.

**Two things to verify before relying on this:**

`cache()` keys on the argument list by reference-and-value equality. These
functions take a single string, so that is fine. If a resolver takes an object
argument, `cache()` will miss on every call and the change is inert; check the
signature.

`cache()` is React server-only. These files already have `import "server-only"`
at the top, so they cannot leak into a client bundle.

**Verify**:

```
bun run typecheck
bun run check
bun run test
```

**Expected**: all exit 0 with an unchanged test count. Memoisation must not
change behaviour.

### Step 3: Prove fix 1 does something

Add a temporary counter to confirm deduplication, then remove it.

In `get-active-org-context.ts`, temporarily log inside the memoised body:

```typescript
    log.info("getActiveOrgContext miss", { organisationId });
```

Run the app (`bun run dev`), load the dashboard, and count the log lines for a
single page load.

**Expected**: one line per distinct `organisationId` per request, not one per
caller.

**Then remove the log and confirm**:

```
git diff apps/app/lib/server/get-active-org-context.ts
```

The diff must show only the `cache()` wrapper and the comment. `CLAUDE.md`
forbids `console.log` in production code, and a stray `log.info` on a
hot path is nearly as bad.

If you cannot run the app in this environment, say so and rely on Step 2's
test pass. Do not claim the deduplication was observed if it was not.

### Step 4: Fix 2, batch the holiday existence check

Edit `packages/availability/src/holidays/holiday-service.ts`.

Before the `for (const holiday of holidays)` loop, compute the source IDs and
fetch the existing set in one query:

```typescript
    const sourceRemoteIds = holidays.map((holiday) =>
      sourceRemoteIdForHoliday(
        input.countryCode,
        input.regionCode,
        holiday.date,
        holiday.name
      )
    );

    // One query instead of one per holiday. The per-row findFirst this replaces
    // existed only to decide whether each upsert counted as an import or a
    // skip: Prisma's upsert does not report which branch it took.
    const existingRows = await database.publicHoliday.findMany({
      where: {
        ...scopedQuery(input.clerkOrgId, input.organisationId),
        source: "nager",
        source_remote_id: { in: sourceRemoteIds },
      },
      select: { source_remote_id: true },
    });
    const existingSourceRemoteIds = new Set(
      existingRows.map((row) => row.source_remote_id)
    );
```

Then inside the loop, replace the `findFirst` with a set lookup, using the
precomputed id:

```typescript
    for (const [index, holiday] of holidays.entries()) {
      const sourceRemoteId = sourceRemoteIds[index];
      const existing = existingSourceRemoteIds.has(sourceRemoteId);

      await database.publicHoliday.upsert({
        // ... unchanged
      });
```

Then update the counter increments to use the boolean rather than the row.
Read lines 183 onwards to see their current form and adapt; do not guess.

**Two correctness notes:**

- `source_remote_id` may be nullable in the schema. Check
  `packages/database/prisma/schema.prisma` before assuming
  `row.source_remote_id` is a `string`. If it is `string | null`, filter nulls
  out when building the set.
- The `in` clause takes as many ids as there are holidays in the import, which
  for a year of national holidays is order-of-ten. If a caller ever imports
  many years at once, check whether that list can grow large enough to matter;
  at a few hundred it is fine.

**Verify**:

```
bun run typecheck
bunx vitest run packages/availability/src/holidays/holiday-service.test.ts
```

**Expected**: both exit 0. The existing holiday tests already assert on
`importedCount` and `skippedCount` (see `holiday-service.test.ts` lines 268 and
334, which assert `skippedCount` is 0). Those assertions are the regression
test for this change: if the counters drift, they fail.

### Step 5: Fix 3, count in the database

Read `buildTeamTodayCard` in full (from line 1127) and write down exactly what
it derives from the people list: which six counters, and what
`peopleNeedingAttention` needs.

Then replace the drain with:

- **aggregate queries for the counters**, using `database.person.count` or a
  `groupBy` scoped with both tenant keys and the same filters `listPeople`
  applies (`includeArchived: false`, and the role-based visibility that
  `listPeople` enforces via `actingPersonId` and `role`);
- **one bounded query for `peopleNeedingAttention`**, with an explicit `take`.
  A dashboard card cannot render an unbounded list, so find the cap the UI
  already applies and use it. If the UI does not cap it, pick a defensible
  number (ten is typical for a dashboard card), state it as a named constant
  with a comment, and say in your report that you chose it.

**The hard part is the role-based visibility.** `listPeople` takes
`actingPersonId` and `role` and filters accordingly; a manager sees their
reports, an admin sees everyone. Your aggregate queries must apply the same
filter or the counts will be wrong for managers. Read how `listPeople`
constructs that predicate in
`packages/availability/src/people/people-service.ts` and reuse it rather than
reimplementing it. If it is not extractable without restructuring
`listPeople`, **go to STOP conditions**.

Whatever you do, **delete the `while (true)`**. If fix 3 proves too large,
the minimum acceptable change is to bound the loop:

```typescript
// Bound the drain. An unadvancing cursor would otherwise loop forever, and a
// dashboard card does not need more people than this to compute its counters.
const MAX_PAGES = 25;
```

and return a partial result flagged as such rather than spinning. Say clearly
in your report if you took the minimum rather than the full fix.

**Verify**:

```
bun run typecheck
bunx vitest run packages/availability/src/dashboard/dashboard-service.test.ts
bun run test
```

**Expected**: all exit 0.

### Step 6: Prove fix 3 preserves the counts

This is the step that makes fix 3 safe. Write a test that builds a fixture set
of people with known availability states and asserts the six counters match
what `buildTeamTodayCard` produced before.

The cleanest way: before changing anything, run the existing dashboard tests
and record the counter values they assert. After the change, those same
assertions must still hold. If the existing tests do not assert counters, write
that test **first**, against the unchanged implementation, confirm it passes,
and only then make the change. That gives you a real characterisation test
rather than one written to match whatever the new code does.

**Verify**:

```
bunx vitest run packages/availability/src/dashboard/dashboard-service.test.ts
```

**Expected**: passes both before and after the change, with identical
assertions.

### Step 7: Full verification

```
bun run check
bun run typecheck
bun run test
git diff --name-only
```

**Expected**: the first three exit 0; the last lists only the files in the "In
scope" list.

## Test plan

| File | Tests |
|---|---|
| `packages/availability/src/holidays/holiday-service.test.ts` | Extend: `importedCount` and `skippedCount` are correct when all holidays are new, when all already exist, and when the import is mixed. The mixed case is the one the batched set can get wrong. |
| `packages/availability/src/dashboard/dashboard-service.test.ts` | Characterisation test written **before** the change (Step 6), asserting the six counters and the `peopleNeedingAttention` contents for a fixed fixture. Plus: a manager sees only their reports' counts; an admin sees all. |
| `apps/app/lib/server/get-active-org-context.ts` | No new test. `cache()` memoisation is a framework behaviour and a test would assert React's implementation, not this code. The existing tests passing unchanged is the requirement. |

For fix 3, the characterisation test is not optional. It is the only thing
standing between "counted in the database" and "counted differently in the
database". Write it against the old code, watch it pass, then change the code.

Follow the repo conventions: co-located test files, `vi.hoisted` plus
`vi.mock`, factories for fixture data.

## Done criteria

All of the following, verbatim:

1. `bun run check` exits 0.
2. `bun run typecheck` exits 0.
3. `bun run test` exits 0 with at least six more tests than the Step 1
   baseline.
4. `grep -c "cache(" apps/app/lib/server/get-active-org-context.ts` prints `1`
   or more.
5. `grep -c "findFirst" packages/availability/src/holidays/holiday-service.ts`
   is **lower** than at baseline (record the baseline value in Step 1).
6. `grep -c "while (true)" packages/availability/src/dashboard/dashboard-service.ts`
   prints `0`.
7. No `log.info`, `console.log` or other temporary instrumentation remains.
   Check with `grep -rn "console\." apps/app/lib/server packages/availability/src/dashboard packages/availability/src/holidays`.
8. `git diff --name-only` lists only in-scope files.

## STOP conditions

Stop and report back rather than improvising if any of these occur:

- **The baseline in Step 1 is not green.** Report what fails; change nothing.
- **`listPeople`'s role-based visibility filter cannot be reused** by the
  aggregate queries without restructuring `listPeople` (Step 5). Report what
  the filter does and why it is not extractable. Land fixes 1 and 2, take the
  bounded-loop minimum for fix 3, and let the user decide about the rest.
  Reimplementing a visibility filter is how a manager ends up seeing counts
  that include people they cannot see.
- **The dashboard counters change value** after fix 3. Report the fixture, the
  expected counts and the actual ones. Do not adjust the test to match.
- **`cache()` is not available** from the installed React version, or the
  resolver takes an object argument that would defeat memoisation. Report the
  React version and the signature.
- **The holiday counters change** for the mixed case after fix 2. That means
  the batched set and the per-row probe disagree, most likely because
  `source_remote_id` is nullable or because the `where` clauses differ. Report
  the discrepancy.
- **Any fix requires a database index to be worthwhile.** Report the query and
  the index you would add. Adding a migration inside a performance plan hides a
  schema change in a diff nobody expects one in.

## Maintenance notes

- **The shared shape**: all three of these compute something small (a context
  object, two counters, six integers) by fetching something large (a row per
  caller, a row per holiday, every person). When reviewing a query, the
  question worth asking is "how much of what this returns is actually used?".
- **`cache()` is per request and has no invalidation.** That is what makes it
  safe here and it is also its limit: it cannot help across requests. If
  cross-request caching of organisation context is ever wanted, that is a
  different mechanism with real staleness and tenancy questions, and it should
  not be introduced by extending this one.
- **Prisma's `upsert` does not report which branch it took.** That is the
  reason the holiday probe existed, and it will come up again. The general
  answer is the one used here: fetch the existing keys once before the loop.
- **Unbounded `while (true)` over a paginated source appears at least twice**
  in this repo (here and in the Xero reader, which plan 003 fixes). Both should
  carry an explicit page ceiling. It is worth grepping for the pattern when
  reviewing any new pagination code.
- **Related plans**: 013 (paginate and narrow the approvals list query) and 014
  (batch feed cache invalidation) are the same category and were separated
  because they are larger. 003 bounds the other `while (true)`. 031 addresses
  the deep `@repo/database/src/...` import visible in this plan's excerpts.
