# Plan 108: Activate New Zealand Xero sync

> **Executor instructions**: This rollout is externally blocked until a
> sanctioned NZ verification tenant and preview credentials are recorded. Do
> not merge enablement or public claims using fixture evidence alone.
>
> **Drift check (run first)**:
> `git diff --stat ecd49f5..HEAD -- packages/xero/src/oauth/service.ts packages/xero/src/oauth/service.test.ts packages/database/src/queries/schedulable-xero-tenants.ts packages/database/src/queries/schedulable-xero-tenants.test.ts packages/jobs/src/handlers/schedule-xero-syncs.ts packages/jobs/src/handlers/schedule-xero-syncs.test.ts README.md docs/architecture/xero-people-sync.md`
> Re-stamp after all code dependencies are DONE and the external preflight is
> recorded without secret values.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: HIGH
- **Depends on**: Plans 076, 100, 102, 104, 105, 106 and 107 DONE; sanctioned live NZ tenant and preview deployment credentials
- **Category**: migration
- **Planned at**: commit `ecd49f5`, 2026-08-24; re-stamp after dependencies
- **Execution status**: BLOCKED, live NZ verification environment not recorded
- **Supersedes**: NZ activation slice of rejected Plan 071

## Why this matters

Readers and jobs are not customer support until OAuth selection and scheduling
are enabled and exercised against a real NZ payroll organisation. Activating
before live proof could expose a misleading successful connection.

## Current state and preflight

`packages/xero/src/oauth/service.ts:325-335` rejects NZ/UK and
`schedulable-xero-tenants.ts:161-173` selects AU only. Before edits, record only
credential types and evidence location: Xero app client credentials, exact
preview callback URL, payroll-admin authoriser, sanctioned NZ demo/verification
tenant, preview deployment SHA and test actor. Never record values, tokens, raw
payroll responses or customer identifiers in plans.

Use a preview branch/deployment containing the exact activation diff. Complete
live validation there before merge. Predecessors must already have removed
regional success-no-ops; activation fails preflight if any remain.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Focused | `bunx vitest run packages/xero/src/oauth/service.test.ts packages/database/src/queries/schedulable-xero-tenants.test.ts packages/jobs/src/handlers/schedule-xero-syncs.test.ts` | NZ selection/scheduling cases pass |
| No-op search | `rg -n "NZ payroll .*not yet|payroll_region: \"AU\"" packages/jobs packages/xero packages/database/src/queries/schedulable-xero-tenants.ts` | no NZ not-available message or AU-only activation filter remains |
| Gates | `bun run check && bun run typecheck && bun run test && bun run test:integration && bun run build && git diff --check` | every command exits 0 |
| Live smoke | preview OAuth and end-to-end NZ sync | evidence record shows every named flow passed |

## Scope

Modify only drift-check files, a plan-local `plans/108-nz-live-evidence.md`, and
plan bookkeeping. Observability may add allowlisted `payrollRegion` to existing
run logs in the named scheduler file only. Do not edit adapters/handlers, public
pricing or UK activation.

## Git workflow

- Branch: `feat/108-activate-nz-xero`
- Commit after live proof: `feat(xero): activate New Zealand payroll sync`
- Do not push/merge or publish support wording before live proof.

## Steps

### Step 0: Satisfy the external preflight

Record credential types, preview SHA/callback, tenant class, authoriser role and
sanitised evidence owner. No secret or customer value.

**Verify**: a reviewer confirms every required type/environment exists.

### Step 1: Enable selection and scheduling in preview

Allow NZ in OAuth and schedulable queries; preserve database tenant routing,
both tenant keys and all AU tests. Do not opportunistically change handlers.

**Verify**: focused tests and no-op search pass.

### Step 2: Run the live smoke matrix

Exercise connect, token refresh, people, leave, approval status, balances,
manual/scheduled sync, partial failure, cancellation and reconnect. Record dates,
preview SHA, flow outcomes and sanitised provider request IDs only.

**Verify**: every row in `plans/108-nz-live-evidence.md` passes with no raw data.

### Step 3: Run gates and update support docs

Update support wording only after Step 2, run all gates and stop listeners.

**Verify**: all table commands pass and evidence predates support wording.

## Test plan

Add AU/NZ selection, tenant query and scheduled event tests, including revoked,
disabled, wrong region and cross-tenant cases. Live smoke covers every supported
operation and typed provider failure.

## Done criteria

- [ ] External preflight and sanitised live evidence are complete.
- [ ] NZ OAuth/scheduling work without regional no-ops.
- [ ] Both tenant keys and database tenant routing are proven.
- [ ] Support wording follows live proof.
- [ ] Focused, live and full gates pass.

## STOP conditions

Stop while the external environment is absent, any predecessor is incomplete,
a handler still skips NZ, live data differs materially from fixtures, or any
secret/customer data would enter evidence.

## Maintenance notes

Activation evidence is region-specific. Do not use NZ success as proof of UK
partner permission or response contracts.
