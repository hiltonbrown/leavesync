# Plan 104: Page and reconcile regional leave sync

> **Executor instructions**: Add bounded NZ/UK leave orchestration only. AU
> retains its tenant-wide snapshot path. Never apply tenant-wide archival to one
> employee's snapshot.
>
> **Drift check (run first)**:
> `git diff --stat ecd49f5..HEAD -- packages/jobs/src/handlers/sync-xero-leave-records.ts packages/jobs/src/handlers/sync-xero-leave-records.test.ts packages/jobs/src/handlers/sync-xero-leave-records.integration.test.ts packages/xero/src/read/dispatch.ts packages/xero/src/read/dispatch.test.ts packages/database/prisma/schema.prisma`
> Re-stamp after Plans 090, 102 and 103 are DONE.

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: HIGH
- **Depends on**: `plans/090-bulk-stale-xero-leave-archival.md` DONE, `plans/102-add-new-zealand-xero-read-adapters.md` DONE and `plans/103-add-united-kingdom-xero-read-adapters.md` DONE
- **Category**: migration
- **Planned at**: commit `ecd49f5`, 2026-08-24; re-stamp after dependencies
- **Execution status**: TODO
- **Supersedes**: regional leave-orchestration slice of rejected Plan 071

## Why this matters

NZ/UK leave reads cost one request per employee. Fetching a whole roster in one
job recreates the unbounded AU balance problem, while treating one employee's
result as tenant-complete would archive everyone else's leave.

## Current state and bounded contract

- Current dispatch accepts only a tenant and returns a tenant-wide snapshot.
- `XeroSyncCursor` already has `leave_records`; reuse it per database Xero tenant.
- Each scheduled NZ/UK run processes at most 20 linked people in `Person.id ASC`
  order, querying 21 to detect continuation. `cursor_value` is the last processed
  Person ID. A deleted cursor value remains a valid lexical boundary.
- Advance by dual-tenant CAS only after persistence, person-scoped archival and
  recorded employee-specific failures. Do not advance after auth, permission,
  rate-limit, transport, persistence blanket failure or cancellation. Reset
  after the final page. Never refetch `/employees` in this job.
- Plan 090's stale predicate gains `person_id = currentPersonId` plus
  `updated_at <= startedAt` for regional calls. Completing A cannot archive B.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Unit | `bunx vitest run packages/jobs/src/handlers/sync-xero-leave-records.test.ts packages/xero/src/read/dispatch.test.ts` | regional page/cursor cases pass |
| Integration | `bunx vitest run packages/jobs/src/handlers/sync-xero-leave-records.integration.test.ts` | scoped archival/isolation cases pass |
| Gates | `bun run check && bun run typecheck && bun run test && bun run test:integration && bun run build && git diff --check` | every command exits 0 |

## Scope

Modify only drift-check files and plan bookkeeping. Do not change approval
reconciliation, balances, employee import, OAuth/scheduling filters, write-back
or public support wording.

## Git workflow

- Branch: `feat/104-regional-leave-pages`
- Commit: `feat(jobs): page regional leave sync`
- Do not push or open a pull request unless instructed.

## Steps

### Step 1: Characterise the cursor and scoped archive

Add first/middle/final/wrap, 20/21 people, deleted cursor, failure/cancellation,
CAS race and two-person archive fixtures.

**Verify**: focused commands fail only for missing regional orchestration.

### Step 2: Add employee-aware dispatch

Change regional leave strategy to accept one Xero employee ID and call the
Plan 102/103 low-level function. Preserve the AU tenant-wide function separately
rather than pretending both results have the same completeness scope.

**Verify**: dispatch tests prove AU tenant completeness vs regional employee completeness.

### Step 3: Implement the 20-person page

Select linked active people with both tenant keys, process at most 20 and record
per-employee outcomes idempotently. Apply person-scoped stale archival only for
successful complete employee reads.

**Verify**: unit/integration tests prove bounded calls and A cannot archive B.

### Step 4: Persist cursor outcomes safely

Implement the advance/reset/failure/CAS contract above. Record a lost CAS as
cancelled/superseded without repeating provider calls in the same run.

**Verify**: first/middle/final/wrap, retry, cancellation and cross-tenant tests pass.

### Step 5: Run all gates

**Verify**: every table command exits 0; scope is clean.

## Test plan

Extend existing handler factories. Cover AU unchanged; NZ/UK 20/21; multiple
leave rows per person; empty complete employee; partial/malformed employee;
blanket vs employee failure; two people with stale records; concurrency freshness;
cursor CAS; cancellation; retry; idempotency and dual tenancy.

## Done criteria

- [ ] A regional scheduled run calls at most 20 employees.
- [ ] Regional archival is person-scoped and freshness-guarded.
- [ ] Cursor advancement cannot skip unrecorded work.
- [ ] AU tenant-wide behaviour remains unchanged.
- [ ] Every command passes and index is updated.

## STOP conditions

Stop on predecessor mismatch, inability to prove employee completeness, any
tenant-wide regional archive, cursor ambiguity or two failed verifications.

## Maintenance notes

Page size is a provider-budget control, not a freshness SLA. Keep AU and v2
completeness types distinct even if their canonical records are shared.
