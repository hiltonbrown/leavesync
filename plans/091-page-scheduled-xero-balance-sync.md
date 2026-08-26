# Plan 091: Page scheduled Xero balance sync across runs

> **Executor instructions**: Implement one tenant-wide page per scheduled run.
> The page limit is a workload bound, not a customer roster limit or freshness
> SLA.
>
> **Drift check (run first)**:
> `git diff --stat ecd49f5..HEAD -- PRODUCT.md packages/jobs/src/handlers/sync-xero-leave-balances.ts packages/jobs/src/handlers/sync-xero-leave-balances.test.ts packages/jobs/src/handlers/sync-xero-leave-balances.integration.test.ts packages/database/prisma/schema.prisma apps/app/app/'(authenticated)'/settings/integrations/xero/xero-client.tsx`
> Plan 076 changes are expected. Stop if it did not establish database
> `XeroTenant.id` routing or dual-tenant cursor isolation.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: `plans/076-route-scheduled-syncs-by-the-database-tenant-id.md` DONE
- **Category**: perf
- **Planned at**: commit `ecd49f5`, 2026-08-24; re-stamp after Plan 076
- **Execution status**: TODO
- **Supersedes**: balance half of rejected Plan 058

## Why this matters

The current handler loads every active person, performs serial AU provider reads
for the full roster, and persists only after all reads finish. Late blanket
failure discards earlier useful work and retries the same prefix. One durable
page per scheduled invocation bounds calls and makes progress resumable without
turning roster size into a billing limit.

## Resolved product contract

This planning default was adopted in response to the operator's 2026-08-24
instruction to reconcile the blocked plans to an executable backlog. Change it
only through a new recorded product decision.

- Billing keeps an unlimited employee roster.
- The scheduler processes one ordered page of 40 people each hour.
- A complete roster refresh is rolling best effort with no fixed completion
  SLA. `ceil(active people / 40)` is only the nominal successful-page count.
- Public pricing remains unchanged. Customer copy must not expose page size,
  daily-call arithmetic or a completion estimate.

## Current state

- `sync-xero-leave-balances.ts:130-181` loads every active person, performs all
  provider reads, then persists results.
- `packages/xero/src/au/read.ts:222-309` performs serial employee requests.
- Prisma already defines `XeroSyncCursor` with `leave_balances` as an entity
  type and `XeroTenant.leave_balances_stale_since` for cycle state.
- `xero-client.tsx:161-177` exposes only one “Balance sync” timestamp.
- `PRODUCT.md:581-583` specifies hourly dispatch but no whole-roster SLA.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Unit | `bunx vitest run packages/jobs/src/handlers/sync-xero-leave-balances.test.ts` | all page/cursor cases pass |
| Integration | `bunx vitest run packages/jobs/src/handlers/sync-xero-leave-balances.integration.test.ts` | real cursor/isolation cases pass |
| Gates | `bun run check && bun run typecheck && bun run test && bun run test:integration && bun run build && git diff --check` | every command exits 0 |

## Scope

Balance handler/tests, `XeroSyncCursor(entity_type = leave_balances)`, PRODUCT
scheduling wording, and Xero settings status copy. Exclude stale leave archival,
regional adapters and public pricing.

**In-scope files**: the paths in the drift check plus an existing co-located
settings test or a new `xero-client.test.tsx`. **Out of scope**: pricing files,
regional Xero modules, stale leave archival and rate-limiter architecture.

## Git workflow

- Base branch: `preview` (`origin/preview`), not `main`. Branch from `preview`, commit there, and land the finished work on `preview` — see `plans/README.md` § Execution policy.
- Work directly in this working tree. No isolated git worktree is used for this repo's plan executions.
- Branch: `perf/091-page-balance-sync`
- Commit: `perf(jobs): page scheduled balance sync`
- Do not push or open a pull request unless instructed.

## Steps

1. Add tests for first, middle, final and wraparound pages, cursor compare-and-
   swap, retries, tenant isolation and targeted-person refreshes.
2. Query 41 active people in stable ID order after the cursor and process at
   most 40. If no row follows, complete the cycle and restart deterministically
   on the next scheduled invocation.
3. Persist individual outcomes before a conditional dual-tenant cursor update.
   Do not advance after blanket auth, rate-limit or transport failure. Advance
   after recorded employee-specific failures so one employee cannot starve the
   roster.
4. Serialise scheduled work by database `XeroTenant.id`. Targeted refreshes
   bypass the shared cursor and must not change tenant cycle timestamps.
5. Update PRODUCT to distinguish page cadence from cycle completion. Rename the
   settings timestamp to “Latest balance page” and show “Rolling refresh in
   progress since …” from `leave_balances_stale_since`.
6. On a runner with `DATABASE_URL`, run focused, check, typecheck, unit,
   integration and build gates.

Use `XeroSyncCursor.entity_type = "leave_balances"`; `cursor_value` is the last
processed `Person.id` in ascending order. Query `id > cursor_value`; if that
person was deleted, continue from the lexical value without a lookup. Query 41,
process 40, and set the cursor to the 40th processed person. On the final page,
clear/reset the cursor only after every page outcome is persisted and clear
`leave_balances_stale_since`; set it when a new cycle begins and retain it across
middle pages. A lost compare-and-swap returns a recorded cancelled/superseded
run outcome and does not retry provider calls in the same invocation.

Scheduled Inngest concurrency uses the database Xero tenant ID from Plan 076.
Targeted refreshes do not read/write the shared cursor,
`leave_balances_stale_since` or tenant-wide `last_leave_balances_sync_at`.
`SyncRun` fetched/succeeded/failed counts describe the current page; UI cycle
state comes from cursor/stale-since fields, not aggregated run counts.

## Step verification

| After step | Verification | Expected result |
|---|---|---|
| 1 | unit command | new paging tests fail only because implementation is absent |
| 2 | unit command | page boundary and wraparound cases pass |
| 3 | integration command | outcome persistence precedes compare-and-swap advancement |
| 4 | integration command | targeted and scheduled cursor cases pass |
| 5 | focused UI test plus `rg -n "unlimited|Latest balance page|Rolling refresh" PRODUCT.md apps/app/app/'(authenticated)'/settings/integrations/xero` | contract and copy are present; pricing is untouched |
| 6 | full gates command | every command exits 0 |

## Test plan

Extend the existing balance handler unit and integration suites. Use their
tenant factories. Add first/middle/final/wraparound, 40/41 people, stale cursor,
blanket failure, employee failure, retry, targeted refresh and cross-tenant
cases. Add a focused settings rendering assertion for cycle wording.

## Done criteria

- [ ] Each scheduled invocation requests balances for at most 40 people.
- [ ] Cursor advancement follows the recorded-outcome contract.
- [ ] Targeted refreshes cannot disturb the scheduled cursor.
- [ ] UI and PRODUCT copy state the rolling best-effort contract accurately.
- [ ] All repository-required gates pass.

## STOP conditions

Stop before editing if Plan 076 is not DONE or the live cursor cannot be scoped
by both tenant keys. Stop after editing if any failure can skip unrecorded work.

## Maintenance notes

Page size is an internal workload control. Any later change must re-evaluate
provider budgets and function limits without turning it into a billing limit or
freshness promise.
