# Plan 106: Orchestrate regional balance pages

> **Executor instructions**: Extend the completed rolling balance-page contract;
> do not add a second cursor or a regional full-roster loop.
>
> **Drift check (run first)**:
> `git diff --stat ecd49f5..HEAD -- packages/jobs/src/handlers/sync-xero-leave-balances.ts packages/jobs/src/handlers/sync-xero-leave-balances.test.ts packages/jobs/src/handlers/sync-xero-leave-balances.integration.test.ts packages/xero/src/read/dispatch.ts packages/xero/src/read/dispatch.test.ts packages/xero/src/nz/read.test.ts packages/xero/src/uk/read.test.ts`
> Re-stamp after Plans 091, 101, 102 and 103 are DONE.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: `plans/091-page-scheduled-xero-balance-sync.md` DONE, `plans/101-add-currency-leave-balance-contract.md` DONE, `plans/102-add-new-zealand-xero-read-adapters.md` DONE and `plans/103-add-united-kingdom-xero-read-adapters.md` DONE
- **Category**: migration
- **Planned at**: commit `ecd49f5`, 2026-08-24; re-stamp after dependencies
- **Execution status**: TODO
- **Supersedes**: balance-orchestration slice of rejected Plan 071

## Why this matters

Regional balance requests are employee-scoped. They must reuse the hourly
40-person rolling page so function work and provider calls stay bounded while
preserving unit, currency and raw-payload correctness.

## Current state and inherited contract

Plan 091 processes 40 people ordered by Person ID, queries 41, and advances the
`leave_balances` cursor per employee only after recorded outcomes. Blanket auth,
permission, rate-limit, transport or persistence failure does not advance;
employee-specific failure does. Targeted refresh bypasses the cursor and both
tenant-wide timestamps. Database Xero tenant ID is the Inngest concurrency key.
One employee may yield many balance rows; the cursor still advances once for
that employee. Page run counts are not whole-cycle counts.

NZ `Dollars -> currency/NZD` is approved and documented. Never infer currency
from symbols or locale. UK hours/days use null code; undocumented UK monetary
units are scoped validation failures and block UK activation.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Unit | `bunx vitest run packages/jobs/src/handlers/sync-xero-leave-balances.test.ts packages/xero/src/read/dispatch.test.ts` | regional page/failure cases pass |
| Integration | `bunx vitest run packages/jobs/src/handlers/sync-xero-leave-balances.integration.test.ts` | cursor/persistence/isolation cases pass |
| Gates | `bun run check && bun run typecheck && bun run test && bun run test:integration && bun run build && git diff --check` | every command exits 0 |

## Scope

Modify only drift-check files and plan bookkeeping. Do not change page size,
currency schema, presentation, OAuth/scheduling, leave orchestration or pricing.

## Git workflow

- Base branch: `preview` (`origin/preview`), not `main`. Branch from `preview`, commit there, and land the finished work on `preview` — see `plans/README.md` § Execution policy.
- Work directly in this working tree. No isolated git worktree is used for this repo's plan executions.
- Branch: `feat/106-regional-balance-pages`
- Commit: `feat(jobs): sync regional balance pages`
- Do not push or open a pull request unless instructed.

## Steps

### Step 1: Add regional page fixtures

Cover AU/NZ/UK, 40/41 people, multiple balances per person, currency, blanket vs
employee failure, final/reset, targeted refresh and CAS race.

**Verify**: focused tests fail only for missing regional dispatch.

### Step 2: Route each employee by region

Dispatch a page's employee IDs to the correct low-level reader and persist every
validated balance under Plan 101's amount/unit/code/raw-payload contract.

**Verify**: NZD, hour/day null-code and raw-payload integration cases pass.

### Step 3: Preserve cursor/failure semantics

Reuse Plan 091's cursor, concurrency key, outcome order and targeted bypass.
Treat permission error as blanket failure. Do not advance per balance row.

**Verify**: page/retry/CAS/targeted tests pass for all regions.

### Step 4: Run all gates

**Verify**: every command exits 0 and scope is clean.

## Test plan

Extend existing balance handler factories. Cover first/middle/final/wrap,
40/41, deleted cursor, zero/many balances, employee failure followed by success,
401/403/429/transport/persistence, targeted refresh, NZD, unexpected UK money,
AU null currency, retry/idempotency and both tenant keys.

## Done criteria

- [ ] Each region uses the same 40-person employee cursor contract.
- [ ] Cursor movement is per employee, never per balance row.
- [ ] Currency/raw payload invariants hold at read and persistence boundaries.
- [ ] Targeted and blanket-failure behaviour is unchanged.
- [ ] Every command passes.

## STOP conditions

Stop on predecessor mismatch, any unbounded regional loop, currency inference,
cursor advance before persistence or an out-of-scope UI/scheduler change.

## Maintenance notes

Keep page timestamps distinct from cycle state. Do not market hourly dispatch as
a whole-roster freshness SLA.

