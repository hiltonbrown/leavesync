# Plan 058: Bound balance sync work and remove per-record stale-archive work

> **Reconciliation outcome (2026-08-24)**: **REJECTED** as a compound plan.
> The findings remain valid and are superseded by Plans 090 and 091. The
> resolved product contract is an unlimited roster, one scheduled page of 40
> people each hour, and a rolling best-effort cycle with no completion SLA.
> Public pricing remains unchanged. This planning default was adopted in
> response to the operator's 2026-08-24 instruction to reconcile the blocked
> plans to an executable backlog. Do not execute this document.

> **Historical executor instructions (do not use)**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report. Do not improvise. When done, update this plan's row in
> `plans/README.md`, unless a reviewer has said they maintain the index.
>
> **Historical dispatch gate**: Plans 053 and 076 must be merged, and the product contract
> below must be approved, before this plan starts.
> Preserve plan 053's inbound freshness and compare-and-swap guard when editing
> `sync-xero-leave-records.ts`. Plan 076 must first prove that scheduled events
> route with the database `XeroTenant.id`, otherwise the hourly cursor cannot
> resume.
>
> **Drift check (run first)**:
> `git diff --stat ecd49f5..HEAD -- PRODUCT.md apps/web/app/pricing/components/pricing-experience.tsx apps/web/app/pricing/pricing.test.ts apps/app/app/'(authenticated)'/settings/integrations/_connection-view.ts apps/app/app/'(authenticated)'/settings/integrations/_connection-view.test.ts apps/app/app/'(authenticated)'/settings/integrations/xero/xero-client.tsx packages/jobs/src/handlers/sync-xero-leave-balances.ts packages/jobs/src/handlers/sync-xero-leave-balances.test.ts packages/jobs/src/handlers/sync-xero-leave-balances.integration.test.ts packages/jobs/src/handlers/sync-xero-leave-records.ts packages/jobs/src/handlers/sync-xero-leave-records.test.ts packages/jobs/src/handlers/sync-xero-leave-records.integration.test.ts`
> If any in-scope file changed, compare the live code with "Current state" and
> stop on a contract mismatch. The three new Xero settings test/helper paths
> named under Scope must not already exist. Separately re-read the read-only
> Xero, feed, and design references named under Scope; any required modification
> to them is a STOP condition.

## Status

- **Priority**: P2
- **Effort**: L
- **Risk**: MED
- **Depends on**: not applicable, rejected
- **Superseded by**: Plans 090 and 091
- **Category**: bug, perf
- **Planned at**: commit `ecd49f5`, 2026-08-24 (reconciled onto current main;
  scoped source snapshot unchanged)
- **Covers findings**: C-07, P-04
- **Operator approval**: RESOLVED by the reconciliation outcome above
- **Review status**: REJECTED, superseded by Plans 090 and 091

## Why this matters

The AU leave-balance reader makes one paced request per employee. The handler
loads every employee, fetches every balance into memory, and persists nothing
until the complete fetch succeeds. A tenant-sized loop can exceed the remaining
access-token lifetime or daily Xero budget and increases exposure to the
function execution window.
If a blanket error occurs late, all successful results accumulated earlier in
that run are discarded and the same prefix is retried next time.

Chunking the same full employee list inside one `step.run` does not bound the
request count. The draft unit is one fixed-size employee page per scheduled
run, with a persisted cursor that moves only after that page's outcomes are
recorded. This bounds request count, not wall-clock time: the shared Xero fetch
path has no request timeout, so this plan must not claim a hard duration bound.

The stale-leave archive has a different issue. Its archive write is already
bulk, but it then materialises every archived record one at a time. The
publication snapshot does not encode archive eligibility, and feed projection
filters the canonical record by `archived_at`, `include_in_feed`, and
`publish_status`. Those per-record publication reads and writes cannot remove
an event from a feed; the existing batched feed rebuild is the operation that
does. Replace the per-record loop with a constant number of scoped database
queries rather than adding concurrency to unnecessary work.

## Current state

### Balance sync

`packages/jobs/src/handlers/sync-xero-leave-balances.ts:130-151` loads the full
tenant employee set with no order, `take`, or cursor, then passes every employee
to one fetch:

```ts
const people = await database.person.findMany({
  select: { id: true, xero_employee_id: true },
  where: {
    ...scoped(context),
    archived_at: null,
    ...(context.personId ? { id: context.personId } : {}),
    xero_employee_id: { not: null },
  },
});
// ...
const balancesResult = await fetchLeaveBalancesForRegion(
  xeroTenant.payroll_region,
  { employeeIds, onProgress: makeHeartbeat(context, run.id), xeroTenant }
);
```

If that call fails, `:153-165` completes the run before `processBalances` is
called. No successfully fetched prefix is persisted.

`packages/xero/src/au/read.ts:245-309` correctly sleeps between employees and
returns a blanket error for authentication, rate-limit, or transport failure.
The one-second pacing is deliberate and remains out of scope.

Plan 070 hardened token refresh and was merged at `206af7b` (implementation
`0514f71`). `ensureTenantReady` refreshes and reloads the tenant before the run
at `sync-xero-leave-balances.ts:444-505`. That change is correct, but a single
pre-run refresh does not make a tenant-sized loop bounded.

The shared Xero HTTP path has no per-request timeout:
`packages/xero/src/au/read.ts:250-284` calls `xeroFetch`, and
`packages/xero/src/rate-limit/xero-fetch.ts:88-112` awaits `fetch` without an
abort signal. The employee cap therefore provides a request-count ceiling only.

The scheduled continuation path is currently broken before this plan begins.
`packages/database/src/queries/schedulable-xero-tenants.ts:187-199` exposes both
the database row ID and Xero's provider tenant identifier, while
`packages/jobs/src/handlers/schedule-xero-syncs.ts:291-307` sends the provider
identifier in an event field that `sync-xero-leave-balances.ts:600-619` treats
as the database primary key. Plan 076 owns that prerequisite correction and a
distinct-ID integration test.

The schema already provides the continuation state this plan needs:
`packages/database/prisma/schema.prisma:541-558` defines `XeroSyncCursor`, with
one row per `(xero_tenant_id, entity_type)` and an existing `leave_balances`
entity value. No migration is required.

### Stale archive

`packages/jobs/src/handlers/sync-xero-leave-records.ts:829-862` finds every
stale Xero leave and archives the selected IDs with one `updateMany`.

The unbounded work is `:864-879`:

```ts
for (const record of stale) {
  try {
    await materialiseSyncedPublication(context, record.id);
  } catch (error) {
    log.error("Failed to materialise publication for archived leave record", {
      // ...
    });
  }
}
```

Each call reads the canonical record and then creates or updates its
publication. However:

- `packages/feeds/src/publication/publication-service.ts:190-218` projects UID,
  summary, description, privacy, and dates, not archive eligibility;
- `packages/feeds/src/projection/feed-projection.ts:100-113` queries canonical
  records with `archived_at: null`, `include_in_feed: true`, and
  `publish_status: "eligible"` before using publication identity;
- the sync handler already collects archived person IDs and calls
  `enqueueFeedRebuilds` at `sync-xero-leave-records.ts:263-286`.

Therefore the archive materialisation loop is redundant. Do not replace it
with `Promise.all` or bounded concurrency.

The current feed-rebuild lookup is not a sufficient replacement on its own.
`sync-xero-leave-records.ts:903-950` handles only `org`, `person`, and `team`
scopes, while the schema also permits `self` and `manager_team`. The canonical
`feedIdsForPeople` resolver at
`packages/feeds/src/cache/feed-invalidation.ts:17-65` covers every scope and
fails defensively. Reuse it rather than extending the hand-written lookup.

## Product contract prerequisite

The existing draft cap of 40 requests per hourly run is not an implementation
detail. It changes the product freshness contract to:

```text
maximum balance age for one complete cycle = ceil(active Xero people / 40) hours
```

That conflicts with `PRODUCT.md:581-583`, which describes leave-balance sync as
hourly, and with the public pricing copy that accepts as many people as the
payroll file holds. The UI currently labels a successful page timestamp as
"Balance sync" and does not expose `leave_balances_stale_since`, so customers
cannot tell that a multi-page cycle remains incomplete.

Before another executor is dispatched, the operator must approve the proposed
answers to all three product questions:

1. supported active Xero people per Organisation: unlimited;
2. maximum whole-cycle balance age: no fixed SLA, with the rolling formula
   disclosed;
3. scheduled balance baseline: 960 employee requests per day after 24 successful
   hourly pages, with retries, manual runs, and other Xero traffic sharing the
   remaining daily budget. This is not a hard maximum without a persisted
   request-budget throttle.

This plan's recommended launch contract is to retain the existing
unlimited-roster promise, define balance refresh as a rolling best-effort cycle
with no fixed completion SLA, use the provisional 40-person hourly page, and
make incomplete-cycle state visible in the Xero settings UI. The same
implementation commit updates PRODUCT, pricing copy, and the UI after the
rolling backend exists, so there is no interval where product language describes
behaviour that has not shipped.

If the operator instead requires a finite maximum balance age, stop and
reconcile this plan around an enforced organisation-size ceiling or a separately
budgeted continuation architecture. Recording an unapproved value is not
enforcement and does not satisfy the gate.

The contracts and steps below preserve the current 40-person draft so the
technical review record is concrete. They are not executable until the operator
replaces `PENDING` above with an approval date and concise contract record. A
different product contract or continuation architecture requires another
reconciliation, not executor improvisation.

## Target contracts

### Balance page contract

- `MAX_BALANCE_EMPLOYEES_PER_RUN` is 40.
- A normal tenant-wide run reads at most 41 scoped people, ordered by `id`; the
  extra row determines whether another page exists, and only the first 40 are
  sent to Xero.
- At one request per second, a page has about 39 seconds of deliberate pacing,
  plus unbounded network latency. Hourly event IDs deduplicate repeated
  coordinator dispatch within a slot, so 24 successful scheduled pages form a
  provisional 960-request daily baseline. Function retries, manual runs, and
  any separately introduced retry path are additional traffic and must fit
  inside the remaining 4,040 calls shared with people, leave, and approval work
  under the documented 5,000-call daily limit. This plan does not claim 960 is
  a hard maximum.
- Store the last processed person ID in the existing scoped
  `XeroSyncCursor(entity_type = leave_balances)` row when another page exists.
  Clear `cursor_value` after the final page so the next hourly run begins a new
  cycle.
- A `personId`-targeted manual run bypasses and does not read or mutate the
  shared tenant cursor, `last_leave_balances_sync_at`, or
  `leave_balances_stale_since`. It updates only that person's balances and its
  own `SyncRun`.
- Cursor reads and writes carry both `clerk_org_id` and `organisation_id`, plus
  `xero_tenant_id` and `entity_type`.
- Authentication, rate-limit, or transport failure does not advance the
  cursor. Employee-specific failures and recorded persistence failures do
  advance it so one poison employee cannot starve the tail; they are retried in
  the next complete cycle.
- Persist all successful balances and failed-record outcomes before advancing
  the cursor. A crash before cursor advancement may replay a page, which is safe
  because balance upserts are idempotent.
- Return `continuationPending: true` and retain or set
  `leave_balances_stale_since` while another page exists. Return false and clear
  the stale marker at cycle completion.
- `last_leave_balances_sync_at` records the successful page time, not only full
  cycle completion, so the existing hourly scheduler remains the rate-budget
  governor.
- Validate any stored cursor as a UUID before using it in a `Person.id` filter.
  A malformed or valid-but-out-of-range cursor causes one in-memory restart from
  page one, but the stored value is not repaired until that replacement page's
  outcomes are durable.
- The Inngest function serialises queued balance events per database Xero tenant
  with `concurrency: { limit: 1, key: "event.data.xeroTenantId" }`. Cursor
  mutation also compares the stored value with the value read for the page, so
  direct/manual races fail safely rather than skipping work.
- After page outcomes are durable, cursor progress,
  `last_leave_balances_sync_at`, and `leave_balances_stale_since` change in one
  scoped database transaction. A metadata transaction failure fails the run;
  the page may replay safely.

### Product and settings contract

- Replace PRODUCT's unqualified hourly balance-sync statement with the exact
  operational distinction: one bounded page is scheduled hourly, a whole cycle
  rolls across pages, and completion time grows with active Xero people.
- Keep the pricing promise that the plan covers the whole payroll organisation
  and that price does not change per seat. Add adjacent copy stating that leave
  balances refresh in rolling pages and that larger payroll files take longer
  to complete a full refresh. Do not publish the internal page size or a fixed
  completion time as a customer SLA.
- Add `leave_balances_stale_since` to the existing explicit tenant allowlist in
  `organisationWithConnectionSelect`. Do not broaden the connection select or
  newly expose credentials, cursor data, Person rows, or employee counts.
- Rename the settings stat from "Balance sync" to "Latest balance page" and
  present cycle state as separate visible text.
- When both timestamps are null, show `Not run yet` and no cycle detail. When
  `leave_balances_stale_since` is non-null, show
  `Rolling refresh in progress since <en-AU timestamp>`. When the latest page
  exists and the stale marker is null, show `No rolling refresh in progress`.
  Do not claim every employee succeeded: a final page can complete the traversal
  with failed records queued for the next cycle.
- Put display-state selection in a pure `balanceSyncDisplay` helper. Inject a
  timestamp formatter into the helper so unit tests are timezone-independent;
  production passes the existing `en-AU` formatter.
- Add component-level coverage that renders `XeroClient` with complete,
  incomplete, and never-run fixtures. Helper-only tests are not sufficient to
  prove that the customer-facing label and detail are wired.
- Keep the existing provider `xero_tenant_id` tenant-name fallback. The balance
  status must not newly render that identifier or any provider payload.

### Stale archive contract

- Keep the complete-fetch and non-empty-remote safeguards. A truncated or empty
  remote collection must not trigger mass archival.
- Pass the sync `startedAt` into archival. In one scoped transaction, identify
  distinct affected person IDs and archive all stale `xero_leave` rows through
  one reusable predicate containing `updated_at: { lte: startedAt }` plus
  `notIn: fetchedRemoteIds`. This preserves plan 053's rule that a row created
  or changed after the run began cannot be overwritten. Use the
  `updateMany.count` result as the archived count.
- Do not select every stale record ID and do not use an `id: { in: [...] }`
  update. This keeps the number of database statements and query parameters
  independent of the stale-record count.
- Remove only the archive path's calls to `materialiseSyncedPublication`.
  Create/update paths still materialise normally.
- After the transaction, resolve all affected feed IDs through
  `feedIdsForPeople`, map its returned objects to `.id`, and enqueue one rebuild
  per unique feed. This must cover `org`, `person`, `team`, `self`, and
  `manager_team`. A rebuild failure follows the handler's existing error
  boundary; do not restore per-record materialisation as a fallback.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Targeted unit tests | `cd packages/jobs && bunx vitest run src/handlers/sync-xero-leave-balances.test.ts src/handlers/sync-xero-leave-records.test.ts` | all tests pass |
| Balance integration | `cd packages/jobs && bunx vitest run src/handlers/sync-xero-leave-balances.integration.test.ts` | database cases run and pass, not skipped |
| Leave integration | `cd packages/jobs && bunx vitest run src/handlers/sync-xero-leave-records.integration.test.ts` | database cases run and pass, not skipped |
| Settings tests | `cd apps/app && bunx vitest run 'app/(authenticated)/settings/integrations/_connection-view.test.ts' 'app/(authenticated)/settings/integrations/xero/balance-sync-status.test.ts' 'app/(authenticated)/settings/integrations/xero/xero-client.test.tsx'` | all tests pass |
| Pricing test | `cd apps/web && bunx vitest run app/pricing/pricing.test.ts` | all tests pass |
| Check | `bun run check` | exit 0 |
| Typecheck | `bun run typecheck` | exit 0 |
| Unit suite | `bun run test` | exit 0 |
| Integration suite | `bun run test:integration` | exit 0 with database tests executed |
| Build | `bun run build` | exit 0 |

Re-measure the two targeted unit-file baselines at dispatch; the former
`1c0d0d2` count was historical and is not a completion criterion. The suite had 25
passing tests, verified on 2026-08-24.

## Scope

**In scope**:

- `packages/jobs/src/handlers/sync-xero-leave-balances.ts`
- `packages/jobs/src/handlers/sync-xero-leave-balances.test.ts`
- `packages/jobs/src/handlers/sync-xero-leave-balances.integration.test.ts`
- `packages/jobs/src/handlers/sync-xero-leave-records.ts`, archive helper and
  result plumbing only
- `packages/jobs/src/handlers/sync-xero-leave-records.test.ts`, archive tests
  only
- `packages/jobs/src/handlers/sync-xero-leave-records.integration.test.ts`,
  archive expectations and regression coverage only
- `PRODUCT.md`, sync-scheduling contract only
- `apps/web/app/pricing/components/pricing-experience.tsx`
- `apps/web/app/pricing/pricing.test.ts`
- `apps/app/app/(authenticated)/settings/integrations/_connection-view.ts`
- `apps/app/app/(authenticated)/settings/integrations/_connection-view.test.ts`
- `apps/app/app/(authenticated)/settings/integrations/xero/xero-client.tsx`
- `apps/app/app/(authenticated)/settings/integrations/xero/xero-client.test.tsx`
  (new)
- `apps/app/app/(authenticated)/settings/integrations/xero/balance-sync-status.ts`
  (new)
- `apps/app/app/(authenticated)/settings/integrations/xero/balance-sync-status.test.ts`
  (new)

**Bookkeeping only**:

- `plans/README.md` for the final status update after every gate passes

**Read-only references, do not modify**:

- `packages/database/prisma/schema.prisma`, the existing cursor model is enough
- `packages/xero/src/au/read.ts`, pacing and fetch error semantics stay intact
- `packages/xero/src/rate-limit/xero-fetch.ts`, request timeout policy is not
  silently changed by this plan
- `packages/feeds/src/publication/publication-service.ts`, no new bulk API is
  needed
- `packages/feeds/src/projection/feed-projection.ts`, its eligibility query is
  the proof that archived records disappear on rebuild
- `packages/feeds/src/cache/feed-invalidation.ts`, reuse its exported
  `feedIdsForPeople` helper through `@repo/feeds`; do not duplicate or modify it
- `packages/feeds/src/scope/feed-scope.test.ts`, existing proof for all five
  scope types; do not duplicate or modify it
- `DESIGN.md`, especially stale-data presentation and Australian English
- `.impeccable.md`, especially calm, precise operational state

**Out of scope**:

- plan 053's inbound freshness and compare-and-swap implementation
- plan 076's scheduled tenant-routing correction
- changing the 60-per-minute or 5,000-per-day Xero limits
- concurrent balance requests, the API is deliberately paced serially
- immediate self-dispatch of continuation events; the existing hourly scheduler
  governs balance cost
- NZ/UK readers and monetary balances, owned by plan 071
- approval-reconciliation paging, owned by plan 056
- schema migrations or a second cursor table
- claiming a hard wall-clock bound without a separately reviewed Xero request
  timeout
- changing subscription prices, tiers, entitlements, or Clerk Billing

## Git workflow

- Suggested branch: `advisor/058-bound-sync-loops`
- Use a conventional commit such as
  `fix(jobs): page balance syncs across scheduled runs`.
- Do not push or open a pull request unless explicitly instructed.

## Steps

### Step 0: Satisfy decision, dependency, and verification preflights

Before source edits:

1. Confirm plans 053 and 076 are merged on the executor's base commit.
2. Confirm the plan already records operator approval of the unlimited-roster,
   rolling-best-effort contract. The executor must not solicit or infer product
   authority. If approval is still `PENDING`, or the approved cap is not 40,
   stop for reviewer reconciliation of this plan and Plan 071.
3. Run both existing database-backed integration files and confirm neither
   suite skips.
4. Run the default `bun run build` and confirm Turbopack can bind its loader
   loopback port. `next build --webpack` is diagnostic only and is not a
   substitute.

**Verify**:

- `cd packages/jobs && bunx vitest run src/handlers/sync-xero-leave-balances.integration.test.ts src/handlers/sync-xero-leave-records.integration.test.ts`
  exits 0 with both database suites executed;
- `bun run build` exits 0 using the repository default;
- `git merge-base --is-ancestor 27b739b HEAD`, plus the exact Plan 076 merge SHA
  inserted by the required post-dependency reconciliation, both exit 0. If the
  exact Plan 076 SHA is absent here, stop: this rejected historical plan has not been
  reconciled for execution.

Stop before implementation if any preflight fails.

### Step 1: Characterise the bounded-page and archive contracts

Add failing unit tests before changing production code.

In `sync-xero-leave-balances.test.ts`, extend the database mock with scoped
`xeroSyncCursor.findFirst`, `createMany`, and `updateMany` operations plus a
transaction callback. Add cases that prove:

1. 41 returned people cause only 40 employee IDs to be fetched, in deterministic
   ID order;
2. another-page state writes the 40th person ID to the `leave_balances` cursor
   and returns `continuationPending: true`;
3. a final page clears the cursor and returns false;
4. a blanket fetch failure leaves the cursor unchanged;
5. a person-targeted success or failure neither reads nor writes the shared
   cursor nor mutates either tenant-wide balance timestamp;
6. malformed and valid-but-out-of-range cursors restart in memory without an
   early persisted repair;
7. a failed replacement fetch leaves the stored cursor unchanged;
8. all cursor and people operations contain both tenant scopes;
9. the Inngest registration serialises queued events by database tenant ID.

In `sync-xero-leave-records.test.ts`, add a stale archive case that asserts a
bulk scoped archive and feed rebuild occur without calling
`materialiseSyncedPublication` for stale rows. Mock `feedIdsForPeople` from
`@repo/feeds` with its real object return shape and prove rebuild dispatch maps
each object to its `.id`.

**Verify**:

`cd packages/jobs && bunx vitest run src/handlers/sync-xero-leave-balances.test.ts src/handlers/sync-xero-leave-records.test.ts`
fails only on the newly specified behaviour.

### Step 2: Load one deterministic balance page

1. Add the operator-approved `MAX_BALANCE_EMPLOYEES_PER_RUN` next to the
   existing batch and heartbeat constants, with the approved freshness and rate
   arithmetic. The unreconciled draft value is 40.
2. Add per-database-tenant Inngest concurrency to
   `syncXeroLeaveBalancesFunction`; keep the database duplicate-run check as a
   diagnostic/idempotency aid, not as an atomic lock.
3. For tenant-wide runs, load the scoped `leave_balances` cursor before people.
   Validate a non-null value as a UUID before using it in a database filter.
4. Query people with:
   - `orderBy: { id: "asc" }`;
   - `take: MAX_BALANCE_EMPLOYEES_PER_RUN + 1`;
   - `id: { gt: cursorValue }` when a cursor exists;
   - existing archive, Xero employee ID, Clerk Org, and Organisation filters.
5. Split the extra row from the page. Build `personIdByEmployeeId` and
   `employeeIds` from the first `MAX_BALANCE_EMPLOYEES_PER_RUN` rows only.
6. If a cursor is malformed or a valid stored cursor yields no people, treat it
   as null in memory and query the first page once in the same run. Do not write
   the repair yet and do not loop repeatedly.
7. Preserve `context.personId` behaviour by querying that one scoped person and
   bypassing all cursor and tenant-cycle metadata logic.

**Verify**: the page-size, order, cursor-recovery, and person-targeted unit cases
pass; `bun run typecheck` exits 0.

### Step 3: Persist page outcomes before cursor progress

1. Keep `ensureTenantReady` as the page-level freshness boundary established by
   plan 070. Do not add per-employee refresh calls. The page cap reduces token
   expiry exposure but does not prove a wall-clock bound because requests lack
   a timeout.
2. Fetch only the page employee IDs with the existing progress heartbeat.
3. Record employee-specific fetch failures and persist successful balances
   through the existing idempotent upsert path.
4. If the fetch returns a blanket error, complete the run as failed and leave
   the cursor and stale marker unchanged.
5. After all successful and failed-record outcomes for a completed fetch are
   durable, begin one scoped metadata transaction. Inside it:
   - set the cursor to the last processed person ID when the extra row proved
     another page exists;
   - clear `cursor_value` after the final page.
6. Condition cursor `updateMany` on both tenant scopes, tenant ID, entity type,
   and the cursor value read before the page. A zero update count for an
   existing row means another direct/manual run changed progress; fail the
   metadata transaction rather than skipping people.
7. When another page needs a row and none existed, use scoped
   `createMany({ skipDuplicates: true })`, then the scoped conditional
   `updateMany`. This handles a genuine uniqueness race without an unscoped
   unique `upsert`. If a conflicting cross-scope row causes the scoped update to
   affect zero rows, fail safely and never mutate that row.
8. Update the tenant cycle metadata in the same transaction as cursor progress.
   Require the scoped `xeroTenant.updateMany` result to have `count === 1`; a
   zero count must throw so cursor and tenant metadata roll back together. If
   any metadata operation fails, fail the run; balance upserts may replay
   safely.

**Verify**: unit tests prove persistence happens before the transaction, cursor
compare-and-swap rejects changed progress, injected metadata failures roll back
the cursor/timestamp pair, and a blanket failure never advances progress.

### Step 4: Represent incomplete and complete cycles honestly

1. Add `continuationPending: boolean` to the internal result shape. It is true
   only after a successfully processed tenant-wide page proves another page
   exists; it is false for targeted, preflight-failed, empty, and cancelled
   runs. A blanket page failure retains its failed status and does not claim
   successful continuation progress.
2. For a successful tenant-wide page with another page, set
   `leave_balances_stale_since` only if it is currently null, preserving the
   start of the incomplete cycle, in the metadata transaction.
3. On the final tenant-wide page, clear `leave_balances_stale_since` and reset
   the cursor in that same transaction.
4. Continue updating `last_leave_balances_sync_at` after every successfully
   processed tenant-wide page. Do not immediately dispatch another page under
   the provisional 40-person draft.
5. A page with employee-specific or persistence failures may be
   `partial_success` and still advance. Those failed records are retried when
   the cursor completes and the next cycle starts.
6. A `personId`-targeted run updates none of the cursor, stale marker, or
   tenant-wide last-sync timestamp on success or failure.

**Verify**: two simulated scheduled runs process disjoint pages, then a final
run resets the cursor; an immediately following run starts again from page one.

### Step 5: Replace stale archival with constant-query bulk work

1. Keep the caller's `complete` check and the helper's empty-remote guard. Pass
   the run's existing `startedAt` into `archiveStaleRecords`.
2. Build one reusable scoped stale predicate containing:
   - both tenant scopes;
   - `archived_at: null`;
   - `source_type: "xero_leave"`;
   - `source_remote_id: { notIn: fetchedRemoteIds }`;
   - `updated_at: { lte: startedAt }`.
3. In one database transaction:
   - select distinct `person_id` values matching that predicate;
   - call `availabilityRecord.updateMany` with the same predicate and existing
     archive data;
   - return `updateMany.count` and the distinct person IDs.
4. Delete the archive path's loop over stale record IDs. Leave the create and
   update calls to `materialiseSyncedPublication` untouched.
5. Replace `enqueueFeedRebuilds`' hand-written person/team/feed queries with
   `feedIdsForPeople` imported from `@repo/feeds`. Pass the deduplicated affected
   person IDs, map returned `{ id, privacyMode }` objects to `id`, deduplicate
   defensively, then retain the existing Inngest rebuild payload.
6. Update mocks to execute the transaction callback with the mocked client and
   to return the real `feedIdsForPeople` object shape.

**Verify**:

- stale archive unit tests show one distinct-person query, one bulk update, zero
  stale-record materialisations, one canonical feed-scope lookup, and one
  deduplicated rebuild dispatch per returned feed ID;
- `rg -n "for \(const record of stale\)" packages/jobs/src/handlers/sync-xero-leave-records.ts`
  returns no matches;
- targeted unit tests pass.

### Step 6: Add database-backed cursor and archive coverage

In `sync-xero-leave-balances.integration.test.ts`:

1. delete scoped `XeroSyncCursor` rows before parent fixtures in cleanup;
2. prove a pre-seeded scoped cursor resumes after the stored person ID;
3. prove a completed final page resets `cursor_value` to null;
4. prove a cursor belonging to another Clerk Org/Organisation cannot influence
   this tenant or be mutated after a uniqueness conflict;
5. prove a targeted refresh leaves cursor, stale marker, and tenant-wide
   last-sync timestamp unchanged;
6. retain idempotent balance upsert and per-employee failure coverage.

In `sync-xero-leave-records.integration.test.ts`:

1. adjust the stale fixture so it represents an already published record;
2. prove bulk archival sets `archived_at`, `include_in_feed: false`, and
   `publish_status: "archived"`;
3. prove the affected feed rebuild is dispatched;
4. prove the archive path does not create or update a publication merely
   because the record was archived. Existing publication identity may remain;
   feed eligibility comes from the canonical record query;
5. add a run-start race case: pause the mocked complete Xero fetch, create or
   update an absent-remote Xero record after the handler has captured
   `startedAt`, release the fetch, and prove the newer row is not archived;
6. prove the handler delegates affected-person matching to the canonical feed
   resolver. Keep detailed `org`, `person`, `team`, `self`, and `manager_team`
   resolution coverage in `packages/feeds/src/scope/feed-scope.test.ts`; this
   handler test must prove it does not reintroduce a partial scope query.

**Verify**:

- `cd packages/jobs && bunx vitest run src/handlers/sync-xero-leave-balances.integration.test.ts src/handlers/sync-xero-leave-records.integration.test.ts`
- expected: exit 0 with both database-backed suites executed, not skipped

### Step 7: Publish the rolling product and UI contract atomically

Add failing tests before changing product copy or the UI:

1. In `apps/web/app/pricing/pricing.test.ts`, render `PricingExperience` and
   assert that it retains the whole-payroll, no-per-seat promise; says leave
   balances refresh in rolling pages; says larger payroll files take longer for
   a complete refresh; and does not claim all balances complete hourly.
2. Add `leave_balances_stale_since: true` to the nested tenant select in
   `_connection-view.ts`. Extend its test to prove that field is selected while
   the explicit connection allowlist still excludes credential fields.
3. Add `balance-sync-status.ts` and table-driven tests. The helper accepts
   `lastPageAt`, `staleSince`, and an injected timestamp formatter. Cover:
   - both null: `Not run yet` with no detail;
   - latest page plus null stale marker: `No rolling refresh in progress`;
   - non-null stale marker: `Rolling refresh in progress since <formatted>`;
   - a final-page partial-success representation uses the same non-success
     wording and never says `complete` or `successful`.
4. Add `xero-client.test.tsx`. Mock `next/navigation` and the server actions,
   render complete, incomplete, and never-run organisation fixtures, and assert
   that `XeroClient` wires `Latest balance page`, the helper detail, and the
   absence of contradictory detail in the never-run state.
5. Update `xero-client.tsx` to use the helper and extend its local `Stat` with
   optional secondary detail. Keep the existing compact tonal surface. Do not
   add a nested card, tooltip, spinner, predicted completion time, or
   provider-identifier detail.
6. Update only PRODUCT's leave-balance scheduling bullet and adjacent pricing
   copy to the approved contract. Preserve other sync cadence and pricing
   semantics. Use Australian English and no em dashes.

These changes ship in the same implementation commit as Steps 2 to 6. Do not
merge or deploy the copy and UI semantics on top of the old unbounded handler.

**Verify**:

- `cd apps/app && bunx vitest run 'app/(authenticated)/settings/integrations/_connection-view.test.ts' 'app/(authenticated)/settings/integrations/xero/balance-sync-status.test.ts' 'app/(authenticated)/settings/integrations/xero/xero-client.test.tsx'`
  exits 0;
- `cd apps/web && bunx vitest run app/pricing/pricing.test.ts` exits 0;
- `rg -n "Leave balance sync|as many people|rolling" PRODUCT.md apps/web/app/pricing`
  shows one consistent contract without a fixed full-cycle SLA.

### Step 8: Run full verification and inspect the diff

Run, in order:

1. `bun run check`
2. `bun run typecheck`
3. `bun run test`
4. `bun run test:integration`
5. `bun run build`
6. `git diff --check`

Then verify:

- `git diff -- packages/xero/src/au/read.ts` is empty;
- `git diff -- packages/feeds/src/publication/publication-service.ts packages/feeds/src/projection/feed-projection.ts` is empty;
- plan 053's guarded inbound `updateMany.where` is unchanged;
- no schema or migration file changed.
- `git status --short` lists only the 15 in-scope implementation/test/docs
  paths and, after bookkeeping, `plans/README.md`.

Every gate must exit 0 before the plan index is updated.

## Test plan

Follow the existing mock structure in both unit files and the scoped real
database fixtures in both integration files.

| Area | Required proof |
|---|---|
| Page cap | 41 people produce exactly 40 employee requests |
| Cursor resume | next run starts strictly after the stored person ID |
| Cursor reset | final page clears progress; next cycle starts at the first person |
| Cursor recovery | missing/out-of-range cursor resets once without a loop |
| Malformed cursor | invalid UUID never reaches a UUID comparison and is repaired only after durable outcomes |
| Targeted sync | `personId` fetches one person and leaves cursor plus both tenant cycle timestamps untouched |
| Blanket failure | no cursor movement and no false successful timestamp |
| Record failure | failure recorded, successful balances persisted, page advances |
| Cursor race | changed cursor causes compare-and-swap failure, never a skipped page |
| Metadata atomicity | cursor, stale marker, and last-sync timestamp commit or roll back together, including `xeroTenant.updateMany.count === 0` |
| Tenancy | another Organisation's person or cursor cannot be read or mutated |
| Idempotency | replay before cursor advancement does not duplicate balances |
| Stale archive | only rows not changed after `startedAt` are archived by one bulk update |
| Feed removal | canonical all-scope resolver queues affected rebuilds; no stale-row materialisation loop |
| Empty/truncated fetch | archive remains disabled |
| Plan 053 regression | stale inbound update guard remains in the update predicate |
| Product copy | unlimited roster remains, rolling refresh is disclosed, and no hourly full-cycle SLA is claimed |
| Settings projection | stale marker is selected without broadening credential exposure |
| Settings wiring | complete, incomplete, never-run, and final-page partial states render without a false success claim |
| Timezone independence | display helper tests inject their formatter and do not depend on the CI timezone |

## Done criteria

- [ ] A tenant-wide balance run sends at most the operator-approved employee cap
      to Xero (40 in the provisional draft).
- [ ] This plan records operator approval of the unlimited-roster,
      rolling-best-effort balance contract and the provisional 40-person page.
- [ ] Plan 076 is merged and scheduled events route by database tenant ID.
- [ ] Balance progress uses the existing scoped `XeroSyncCursor` and no schema
      change.
- [ ] Successful page outcomes are durable before cursor advancement.
- [ ] Blanket failures do not advance; record-level failures do not starve the
      tail.
- [ ] Person-targeted sync does not read or mutate the shared cursor or either
      tenant-wide balance-cycle timestamp.
- [ ] `continuationPending` and `leave_balances_stale_since` distinguish an
      incomplete cycle from a complete one.
- [ ] Cursor progress and tenant cycle metadata are one atomic, conditional
      state transition after durable page outcomes.
- [ ] The stale archive uses a constant number of scoped database operations,
      archives by the stale predicate, and reports `updateMany.count`.
- [ ] No per-stale-record publication materialisation remains; create/update
      materialisation remains, and canonical all-scope feed rebuilds remain.
- [ ] Stale archival cannot update a row whose `updated_at` is later than the
      sync run's `startedAt`.
- [ ] Unit and database-backed tests prove paging, resume/reset, error,
      idempotency, tenancy, archive, and feed-rebuild behaviour.
- [ ] PRODUCT, pricing, and Xero settings distinguish the latest page from the
      rolling cycle without claiming every person succeeded.
- [ ] Component-level tests prove the customer-facing balance status wiring,
      including no completion detail before the first run.
- [ ] Plan 053's compare-and-swap guard is unchanged.
- [ ] `packages/xero/src/au/read.ts`, feed source files, Prisma schema, and
      migrations have no diff.
- [ ] `bun run check`, `bun run typecheck`, `bun run test`,
      `bun run test:integration`, `bun run build`, and `git diff --check` exit 0.
- [ ] Before the plan-index update, only the 15 in-scope implementation,
      test, and product-doc paths are modified; afterwards only
      `plans/README.md` is additionally modified.
- [ ] `plans/README.md` is updated to `DONE` with date, commit, and verification
      evidence.

## STOP conditions

Stop and report if:

- plan 053 or plan 076 is not merged, scheduled events do not carry the database
  Xero tenant ID, or plan 053's guarded update would be weakened by the archive
  refactor;
- operator approval remains `PENDING`, or the approved contract differs from
  the provisional 40-person hourly rolling-best-effort draft;
- `XeroSyncCursor` is already used by a live balance workflow with a different
  cursor-value meaning;
- the approved product contract changes to require a finite full-cycle age;
- cursor progress cannot be written with both tenant scopes;
- cursor progress and both tenant cycle timestamps cannot be committed in one
  conditional transaction;
- a completed page cannot be distinguished safely from a blanket fetch failure;
- feed projection no longer filters the canonical record's archive, inclusion,
  and eligibility fields before rendering;
- removing archive materialisation changes a published UID or sequence in an
  existing regression test. The current service does not project archive state,
  so such a failure means an assumption changed;
- the bulk stale predicate exceeds a real database parameter or statement limit
  for the maximum supported remote snapshot. Report measured limits rather than
  reintroducing an unbounded per-record loop;
- a mandatory integration test is skipped because `DATABASE_URL` is absent;
- `feedIdsForPeople` no longer resolves every supported feed scope or returns a
  shape different from `{ id, privacyMode }`;
- any language claims a hard page duration or guaranteed fit inside the token
  buffer while one employee request still lacks a proven timeout;
- PRODUCT, pricing, or settings changes would deploy separately from the
  bounded rolling handler;
- the default Turbopack build cannot bind its required loader loopback port;
- any mandatory gate fails twice after a reasonable correction.

## Maintenance notes

- A recurring job is bounded only when one invocation has a hard ceiling and a
  durable next position. Slicing an unbounded in-memory list is not pagination.
- The provisional 40-person cap is a product freshness and daily-budget
  decision, not a private constant. Reconcile PRODUCT, UI language, plan 071,
  hourly totals, and daily totals before changing or approving it.
- Cursor updates must remain after outcome persistence. Moving them earlier can
  permanently skip an employee after a crash.
- Feed publication materialisation snapshots representation, not eligibility.
  Archive and inclusion changes require a feed rebuild, not a per-record
  publication rewrite.
- Request-count bounds do not provide wall-clock bounds. A future shared Xero
  timeout plan must account for safe read retries and the ambiguity rules for
  writes before this plan can claim a duration ceiling.
- Plan 071 depends on this generic balance cursor and operator-approved request
  cap when it enables employee-scoped NZ/UK balance reads. Do not make the
  cursor AU-specific.
