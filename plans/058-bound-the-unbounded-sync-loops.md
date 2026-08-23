# Plan 058: Bound balance sync work and remove per-record stale-archive work

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report. Do not improvise. When done, update this plan's row in
> `plans/README.md`, unless a reviewer has said they maintain the index.
>
> **Dispatch gate**: Plan 053 must be `DONE` before this plan starts. Preserve
> its inbound freshness and compare-and-swap guard when editing the archive half
> of `sync-xero-leave-records.ts`.
>
> **Drift check (run first)**:
> `git diff --stat 206af7b..HEAD -- packages/jobs/src/handlers/sync-xero-leave-balances.ts packages/jobs/src/handlers/sync-xero-leave-balances.test.ts packages/jobs/src/handlers/sync-xero-leave-balances.integration.test.ts packages/jobs/src/handlers/sync-xero-leave-records.ts packages/jobs/src/handlers/sync-xero-leave-records.test.ts packages/jobs/src/handlers/sync-xero-leave-records.integration.test.ts packages/xero/src/au/read.ts packages/feeds/src/publication/publication-service.ts packages/feeds/src/projection/feed-projection.ts`
> Changes from completed plan 053 are expected. Compare them with its final
> contract and stop if the freshness guard would be disturbed. The Xero and feed
> files are read-only reference paths in this plan; any required modification to
> them is a STOP condition.

## Status

- **Priority**: P2
- **Effort**: L
- **Risk**: MED
- **Depends on**: plan 053
- **Category**: bug, perf
- **Planned at**: commit `206af7b`, 2026-08-23
- **Covers findings**: C-07, P-04
- **Review status**: TODO, reconciled. The findings remain, but the old plan's
  multi-page loop was still tenant-sized and its bounded-concurrency archive
  retained unnecessary per-record database work.

## Why this matters

The AU leave-balance reader makes one paced request per employee. The handler
loads every employee, fetches every balance into memory, and persists nothing
until the complete fetch succeeds. A tenant-sized loop can exceed the remaining
access-token lifetime, the function execution window, or the daily Xero budget.
If a blanket error occurs late, all successful results accumulated earlier in
that run are discarded and the same prefix is retried next time.

Chunking the same full employee list inside one `step.run` does not bound the
job. The correct unit is one fixed-size employee page per scheduled run, with a
persisted cursor that moves only after that page's outcomes are recorded.

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

Plan 070 has since hardened token refresh. `ensureTenantReady` now refreshes and
reloads the tenant before the run at
`sync-xero-leave-balances.ts:444-505`. That change is correct, but a single
pre-run refresh does not make a tenant-sized loop bounded.

The schema already provides the continuation state this plan needs:
`packages/database/prisma/schema.prisma:541-558` defines `XeroSyncCursor`, with
one row per `(xero_tenant_id, entity_type)` and an existing `leave_balances`
entity value. No migration is required.

### Stale archive

`packages/jobs/src/handlers/sync-xero-leave-records.ts:712-744` finds every
stale Xero leave and archives the selected IDs with one `updateMany`.

The unbounded work is `:746-761`:

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
  `enqueueFeedRebuilds` at `sync-xero-leave-records.ts:258-264`.

Therefore the archive materialisation loop is redundant. Do not replace it
with `Promise.all` or bounded concurrency.

## Target contracts

### Balance page contract

- `MAX_BALANCE_EMPLOYEES_PER_RUN` is 40.
- A normal tenant-wide run reads at most 41 scoped people, ordered by `id`; the
  extra row determines whether another page exists, and only the first 40 are
  sent to Xero.
- At one request per second, a page takes about 40 seconds. At the hourly
  balance cadence, the maximum is 960 balance requests per organisation per
  day, leaving 4,040 calls for people, leave, approval reconciliation, retries,
  and manual operations under the documented 5,000-call daily limit.
- Store the last processed person ID in the existing scoped
  `XeroSyncCursor(entity_type = leave_balances)` row when another page exists.
  Clear `cursor_value` after the final page so the next hourly run begins a new
  cycle.
- A `personId`-targeted manual run bypasses and does not mutate the shared
  tenant cursor.
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

### Stale archive contract

- Keep the complete-fetch and non-empty-remote safeguards. A truncated or empty
  remote collection must not trigger mass archival.
- In one scoped transaction, identify distinct affected person IDs and archive
  all stale `xero_leave` rows through the same `notIn: fetchedRemoteIds`
  predicate. Use the `updateMany.count` result as the archived count.
- Do not select every stale record ID and do not use an `id: { in: [...] }`
  update. This keeps the number of database statements and query parameters
  independent of the stale-record count.
- Remove only the archive path's calls to `materialiseSyncedPublication`.
  Create/update paths still materialise normally.
- After the transaction, use the existing deduplicated affected person IDs to
  enqueue feed rebuilds. A rebuild failure follows the handler's existing error
  boundary; do not restore per-record materialisation as a fallback.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Targeted unit tests | `cd packages/jobs && bunx vitest run src/handlers/sync-xero-leave-balances.test.ts src/handlers/sync-xero-leave-records.test.ts` | all tests pass |
| Balance integration | `cd packages/jobs && bunx vitest run src/handlers/sync-xero-leave-balances.integration.test.ts` | database cases run and pass, not skipped |
| Leave integration | `cd packages/jobs && bunx vitest run src/handlers/sync-xero-leave-records.integration.test.ts` | database cases run and pass, not skipped |
| Check | `bun run check` | exit 0 |
| Typecheck | `bun run typecheck` | exit 0 |
| Unit suite | `bun run test` | exit 0 |
| Integration suite | `bun run test:integration` | exit 0 with database tests executed |
| Build | `bun run build` | exit 0 |

The reconciled baseline for the two targeted unit files is 17 passing tests.

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
- `plans/README.md` for the final status update only

**Read-only references, do not modify**:

- `packages/database/prisma/schema.prisma`, the existing cursor model is enough
- `packages/xero/src/au/read.ts`, pacing and fetch error semantics stay intact
- `packages/feeds/src/publication/publication-service.ts`, no new bulk API is
  needed
- `packages/feeds/src/projection/feed-projection.ts`, its eligibility query is
  the proof that archived records disappear on rebuild

**Out of scope**:

- plan 053's inbound freshness and compare-and-swap implementation
- changing the 60-per-minute or 5,000-per-day Xero limits
- concurrent balance requests, the API is deliberately paced serially
- immediate self-dispatch of continuation events; the existing hourly scheduler
  governs balance cost
- NZ/UK readers and monetary balances, owned by plan 071
- approval-reconciliation paging, owned by plan 056
- schema migrations or a second cursor table

## Git workflow

- Suggested branch: `advisor/058-bound-sync-loops`
- Use a conventional commit such as
  `fix(jobs): page balance syncs across scheduled runs`.
- Do not push or open a pull request unless explicitly instructed.

## Steps

### Step 1: Characterise the bounded-page and archive contracts

Add failing unit tests before changing production code.

In `sync-xero-leave-balances.test.ts`, extend the database mock with scoped
`xeroSyncCursor.findFirst`, `create`, and `updateMany` operations. Add cases
that prove:

1. 41 returned people cause only 40 employee IDs to be fetched, in deterministic
   ID order;
2. another-page state writes the 40th person ID to the `leave_balances` cursor
   and returns `continuationPending: true`;
3. a final page clears the cursor and returns false;
4. a blanket fetch failure leaves the cursor unchanged;
5. a person-targeted run neither reads nor writes the shared cursor;
6. all cursor and people operations contain both tenant scopes.

In `sync-xero-leave-records.test.ts`, add a stale archive case that asserts a
bulk scoped archive and feed rebuild occur without calling
`materialiseSyncedPublication` for stale rows.

**Verify**:

`cd packages/jobs && bunx vitest run src/handlers/sync-xero-leave-balances.test.ts src/handlers/sync-xero-leave-records.test.ts`
fails only on the newly specified behaviour.

### Step 2: Load one deterministic balance page

1. Add `MAX_BALANCE_EMPLOYEES_PER_RUN = 40` next to the existing batch and
   heartbeat constants, with the rate arithmetic from the target contract.
2. For tenant-wide runs, load the scoped `leave_balances` cursor before people.
3. Query people with:
   - `orderBy: { id: "asc" }`;
   - `take: MAX_BALANCE_EMPLOYEES_PER_RUN + 1`;
   - `id: { gt: cursorValue }` when a cursor exists;
   - existing archive, Xero employee ID, Clerk Org, and Organisation filters.
4. Split the extra row from the page. Build `personIdByEmployeeId` and
   `employeeIds` from the first 40 only.
5. If a stored cursor yields no people, clear the stale cursor and query the
   first page once in the same run. Do not loop repeatedly on malformed cursor
   state.
6. Preserve `context.personId` behaviour by querying that one scoped person and
   bypassing all cursor logic.

**Verify**: the page-size, order, cursor-recovery, and person-targeted unit cases
pass; `bun run typecheck` exits 0.

### Step 3: Persist page outcomes before cursor progress

1. Keep `ensureTenantReady` as the page-level freshness boundary established by
   plan 070. Do not add per-employee refresh calls. A 40-second page fits inside
   the five-minute proactive buffer.
2. Fetch only the page employee IDs with the existing progress heartbeat.
3. Record employee-specific fetch failures and persist successful balances
   through the existing idempotent upsert path.
4. If the fetch returns a blanket error, complete the run as failed and leave
   the cursor and stale marker unchanged.
5. After all successful and failed-record outcomes for a completed fetch are
   durable:
   - set the cursor to the last processed person ID when the extra row proved
     another page exists;
   - clear `cursor_value` after the final page.
6. Use scoped `findFirst` plus scoped `updateMany` or `create` for cursor state.
   Do not use an unscoped unique `upsert` merely because
   `(xero_tenant_id, entity_type)` is unique.
7. If cursor creation encounters a genuine uniqueness race despite the
   duplicate-run guard, reload the scoped cursor and update it. Do not weaken
   tenant scoping.

**Verify**: unit tests prove persistence happens before cursor mutation and a
blanket failure never advances progress.

### Step 4: Represent incomplete and complete cycles honestly

1. Add `continuationPending: boolean` to the successful internal result shape
   and set it to false in empty/cancelled results.
2. When another page exists, set
   `leave_balances_stale_since` only if it is currently null, preserving the
   start of the incomplete cycle.
3. On the final page, clear `leave_balances_stale_since` and reset the cursor.
4. Continue updating `last_leave_balances_sync_at` after every successfully
   processed page. Do not immediately dispatch another page.
5. A page with employee-specific or persistence failures may be
   `partial_success` and still advance. Those failed records are retried when
   the cursor completes and the next cycle starts.

**Verify**: two simulated scheduled runs process disjoint pages, then a final
run resets the cursor; an immediately following run starts again from page one.

### Step 5: Replace stale archival with constant-query bulk work

1. Keep the caller's `complete` check and the helper's empty-remote guard.
2. Build one reusable scoped stale predicate containing:
   - both tenant scopes;
   - `archived_at: null`;
   - `source_type: "xero_leave"`;
   - `source_remote_id: { notIn: fetchedRemoteIds }`.
3. In one database transaction:
   - select distinct `person_id` values matching that predicate;
   - call `availabilityRecord.updateMany` with the same predicate and existing
     archive data;
   - return `updateMany.count` and the distinct person IDs.
4. Delete the archive path's loop over stale record IDs. Leave the create and
   update calls to `materialiseSyncedPublication` untouched.
5. Keep `enqueueFeedRebuilds` after archival. Its existing set logic deduplicates
   people and feeds.
6. Update mocks to execute the transaction callback with the mocked client.

**Verify**:

- stale archive unit tests show one distinct-person query, one bulk update, zero
  stale-record materialisations, and one deduplicated feed rebuild dispatch;
- `rg -n "for \(const record of stale\)" packages/jobs/src/handlers/sync-xero-leave-records.ts`
  returns no matches;
- targeted unit tests pass.

### Step 6: Add database-backed cursor and archive coverage

In `sync-xero-leave-balances.integration.test.ts`:

1. delete scoped `XeroSyncCursor` rows before parent fixtures in cleanup;
2. prove a pre-seeded scoped cursor resumes after the stored person ID;
3. prove a completed final page resets `cursor_value` to null;
4. prove a cursor belonging to another Clerk Org/Organisation cannot influence
   this tenant;
5. retain idempotent balance upsert and per-employee failure coverage.

In `sync-xero-leave-records.integration.test.ts`:

1. adjust the stale fixture so it represents an already published record;
2. prove bulk archival sets `archived_at`, `include_in_feed: false`, and
   `publish_status: "archived"`;
3. prove the affected feed rebuild is dispatched;
4. prove the archive path does not create or update a publication merely
   because the record was archived. Existing publication identity may remain;
   feed eligibility comes from the canonical record query.

**Verify**:

- `cd packages/jobs && bunx vitest run src/handlers/sync-xero-leave-balances.integration.test.ts src/handlers/sync-xero-leave-records.integration.test.ts`
- expected: exit 0 with both database-backed suites executed, not skipped

### Step 7: Run full verification and inspect the diff

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
| Targeted sync | `personId` fetches one person and leaves shared cursor untouched |
| Blanket failure | no cursor movement and no false successful timestamp |
| Record failure | failure recorded, successful balances persisted, page advances |
| Tenancy | another Organisation's person or cursor cannot be read or mutated |
| Idempotency | replay before cursor advancement does not duplicate balances |
| Stale archive | all matching rows archived by one bulk update |
| Feed removal | affected feed rebuild queued; no stale-row materialisation loop |
| Empty/truncated fetch | archive remains disabled |
| Plan 053 regression | stale inbound update guard remains in the update predicate |

## Done criteria

- [ ] A tenant-wide balance run sends at most 40 employee IDs to Xero.
- [ ] Balance progress uses the existing scoped `XeroSyncCursor` and no schema
      change.
- [ ] Successful page outcomes are durable before cursor advancement.
- [ ] Blanket failures do not advance; record-level failures do not starve the
      tail.
- [ ] Person-targeted sync does not read or mutate the shared cursor.
- [ ] `continuationPending` and `leave_balances_stale_since` distinguish an
      incomplete cycle from a complete one.
- [ ] The stale archive uses a constant number of scoped database operations,
      archives by the stale predicate, and reports `updateMany.count`.
- [ ] No per-stale-record publication materialisation remains; create/update
      materialisation and batched feed rebuilds remain.
- [ ] Unit and database-backed tests prove paging, resume/reset, error,
      idempotency, tenancy, archive, and feed-rebuild behaviour.
- [ ] Plan 053's compare-and-swap guard is unchanged.
- [ ] `packages/xero/src/au/read.ts`, feed source files, Prisma schema, and
      migrations have no diff.
- [ ] `bun run check`, `bun run typecheck`, `bun run test`,
      `bun run test:integration`, `bun run build`, and `git diff --check` exit 0.
- [ ] Before the plan-index update, only the six in-scope handler/test files are
      modified; afterwards only `plans/README.md` is additionally modified.
- [ ] `plans/README.md` is updated to `DONE` with date, commit, and verification
      evidence.

## STOP conditions

Stop and report if:

- plan 053 is not complete or its guarded update would be changed by the archive
  refactor;
- `XeroSyncCursor` is already used by a live balance workflow with a different
  cursor-value meaning;
- the hourly 40-person page produces an unacceptable full-cycle age for the
  largest supported tenant. Report the supported employee count and calculated
  cycle duration before changing the cap or adding immediate continuation;
- cursor progress cannot be written with both tenant scopes;
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
- any mandatory gate fails twice after a reasonable correction.

## Maintenance notes

- A recurring job is bounded only when one invocation has a hard ceiling and a
  durable next position. Slicing an unbounded in-memory list is not pagination.
- The 40-person cap is part of the daily Xero budget. Recalculate the hourly and
  daily totals before changing it.
- Cursor updates must remain after outcome persistence. Moving them earlier can
  permanently skip an employee after a crash.
- Feed publication materialisation snapshots representation, not eligibility.
  Archive and inclusion changes require a feed rebuild, not a per-record
  publication rewrite.
- Plan 071 depends on this generic balance cursor and 40-person request cap when
  it enables employee-scoped NZ/UK balance reads. Do not make the cursor
  AU-specific.
