# Plan 109: Validate and activate United Kingdom Xero sync

> **Executor instructions**: This rollout is blocked until Xero partner
> permission and a sanctioned UK verification tenant are recorded. It is not
> dependent on completing the NZ live rollout.
>
> **Drift check (run first)**:
> `git diff --stat f79b1de..HEAD -- packages/xero/src/oauth/service.ts packages/xero/src/oauth/service.test.ts packages/database/src/queries/schedulable-xero-tenants.ts packages/database/src/queries/schedulable-xero-tenants.test.ts packages/jobs/src/handlers/schedule-xero-syncs.ts packages/jobs/src/handlers/schedule-xero-syncs.test.ts README.md plans/xero-people-sync.md`
> Re-stamp after code dependencies are DONE and external evidence is available.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: HIGH
- **Depends on**: Plans 076, 100, 101, 103, 104, 105, 106 and 107 DONE; Xero UK partner permission and sanctioned live UK tenant
- **Category**: migration
- **Planned at**: commit `f79b1de`, 2026-08-29; all code dependencies merged
- **Execution status**: BLOCKED, UK partner permission/live tenant not recorded
- **Supersedes**: UK activation slice of rejected Plan 071

## Why this matters

UK fixture work cannot prove the intended Xero app has Payroll UK permission or
that live response shapes match documentation. Activation and public claims
must follow live verification, independently of whether NZ has launched.

## Current state and preflight

OAuth rejects UK and scheduling is AU-only at the paths named above. Record only
credential types: partner permission confirmation, Xero app client credentials,
preview callback URL, payroll-admin authoriser, sanctioned UK tenant, preview
SHA and test actor. Never copy values, tokens, raw payloads or customer data.

Use a preview branch/deployment with the exact activation diff. Material live
schema/permission differences are a STOP: reopen Plan 103 as a separately
reviewed adapter change, extend sanitised fixtures, then repeat this plan.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Focused | `bunx vitest run packages/xero/src/oauth/service.test.ts packages/database/src/queries/schedulable-xero-tenants.test.ts packages/jobs/src/handlers/schedule-xero-syncs.test.ts packages/xero/src/uk/read.test.ts packages/xero/src/nz/read.test.ts` | UK activation and NZ regression cases pass |
| No-op search | `rg -n "UK payroll .*not yet|payroll_region: \"AU\"" packages/jobs packages/xero packages/database/src/queries/schedulable-xero-tenants.ts` | no UK not-available message or AU-only activation filter remains |
| Gates | `bun run check && bun run typecheck && bun run test && bun run test:integration && bun run build && git diff --check` | every command exits 0 |
| Live smoke | preview OAuth and end-to-end UK sync | evidence record shows all flows passed |

## Scope

Modify only drift-check files, `plans/109-uk-live-evidence.md`, and plan
bookkeeping. Allowlisted `payrollRegion` may be added to existing scheduler run
logs only. Do not modify adapters in this plan, require NZ activation, expand
write-back or change pricing.

## Git workflow

- Base branch: `preview` (`origin/preview`), not `main`. Branch from `preview`, commit there, and land the finished work on `preview` — see `plans/README.md` § Execution policy.
- Work directly in this working tree. No isolated git worktree is used for this repo's plan executions.
- Branch: `feat/109-activate-uk-xero`
- Commit after live proof: `feat(xero): activate United Kingdom payroll sync`
- Do not push/merge or publish support wording before live proof.

## Steps

### Step 0: Satisfy partner/live preflight

Record permission, credential/environment types, preview SHA/callback and
sanitised evidence owner without values.

**Verify**: a reviewer confirms UK partner permission and every required type.

### Step 1: Validate live reader contracts before enablement

Run employee, leave, status and balance reads in preview. Compare only schema
shape/typed outcomes with sanitised fixtures.

**Verify**: `plans/109-uk-live-evidence.md` records matching contracts. Any
material difference stops this plan and reopens Plan 103.

### Step 2: Enable UK OAuth and scheduling in preview

Allow UK selection/scheduling, preserving database tenant routing and both
tenant keys. Do not change adapters or handlers opportunistically.

**Verify**: focused tests and no-op search pass.

### Step 3: Run complete live smoke and gates

Exercise connect, refresh, people, leave, approval status, balances, manual/
scheduled sync, typed failures, cancellation and reconnect. Update public docs
only after success; run every gate.

**Verify**: live matrix and all table commands pass; evidence predates wording.

## Test plan

Add AU/NZ/UK selection/scheduler regressions and live UK cases for permissions,
token refresh, empty/success/partial, retry/cancellation and tenant isolation.

## Done criteria

- [ ] Partner permission and live contract evidence are recorded safely.
- [ ] UK OAuth/scheduling have no regional no-op.
- [ ] AU/NZ regressions and both tenant boundaries pass.
- [ ] Public claims follow live proof.
- [ ] Focused, live and full gates pass.

## STOP conditions

Stop while permission/tenant is absent, any predecessor is incomplete, a live
shape differs materially, a handler skips UK, or evidence would expose data.

## Maintenance notes

Keep UK activation independent from NZ rollout. Repeat live verification after
material Xero permission, API version or app-registration changes.
