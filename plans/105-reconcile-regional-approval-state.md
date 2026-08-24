# Plan 105: Reconcile NZ and UK approval state

> **Executor instructions**: Extend the completed fair approval cursor with the
> employee-aware regional status contract. Do not change write-back support.
>
> **Drift check (run first)**:
> `git diff --stat ecd49f5..HEAD -- packages/jobs/src/handlers/reconcile-xero-approval-state.ts packages/jobs/src/handlers/reconcile-xero-approval-state.test.ts packages/jobs/src/handlers/reconcile-xero-approval-state.integration.test.ts packages/xero/src/read/dispatch.ts packages/xero/src/read/dispatch.test.ts`
> Re-stamp after Plans 056, 102 and 103 are DONE.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: `plans/056-give-the-approval-reconciler-a-cursor.md` DONE, `plans/102-add-new-zealand-xero-read-adapters.md` DONE and `plans/103-add-united-kingdom-xero-read-adapters.md` DONE
- **Category**: bug
- **Planned at**: commit `ecd49f5`, 2026-08-24; re-stamp after dependencies
- **Execution status**: TODO
- **Supersedes**: approval-state slice of rejected Plan 071

## Why this matters

Regional status endpoints require the employee ID as well as the leave ID. The
current reconciliation selection and dispatch omit it, so fixture-backed NZ/UK
readers cannot be used safely. This must preserve Plan 056's fairness and never
turn provider failures into business statuses.

## Current state and handoff

- `reconcile-xero-approval-state.ts:246-267` selects candidate leave/provider
  fields but not `person.xero_employee_id`.
- `:856-859` calls status dispatch with leave ID and tenant only.
- Plan 056 owns the 500-record cap, stable cursor, compare-and-swap and
  not-found accounting. Preserve its completed implementation exactly.
- Plan 102 adds `xeroEmployeeId` to status input and distinguishes 403
  `permission_error` from 401 `auth_error`.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Unit | `bunx vitest run packages/jobs/src/handlers/reconcile-xero-approval-state.test.ts packages/xero/src/read/dispatch.test.ts` | regional status/error cases pass |
| Integration | `bunx vitest run packages/jobs/src/handlers/reconcile-xero-approval-state.integration.test.ts` | cursor/tenant cases pass |
| Gates | `bun run check && bun run typecheck && bun run test && bun run test:integration && bun run build && git diff --check` | every command exits 0 |

## Scope

Modify only drift-check files and plan bookkeeping. Do not change cursor size,
approval write-back, leave paging, balances, OAuth/scheduling or UI.

## Git workflow

- Branch: `feat/105-regional-approval-status`
- Commit: `feat(jobs): reconcile regional approval state`
- Do not push or open a pull request unless instructed.

## Steps

### Step 1: Add the employee identity projection

Select the Person Xero employee ID under both tenant keys. Treat missing ID as a
record failure that advances fairly, not a provider call with an empty value.

**Verify**: unit tests prove the selected employee ID reaches dispatch and a
missing ID is recorded once.

### Step 2: Route regional status reads

Pass employee and leave IDs to the AU/NZ/UK dispatcher. AU ignores employee ID;
NZ/UK require it. A 403 permission error is a blanket run failure/retry signal,
not NOT_FOUND, decline or unknown status.

**Verify**: dispatch/unit tests cover approved, rejected, withdrawn, 403, 404,
unknown and malformed results.

### Step 3: Preserve fairness and tenancy

Retain the 500 cap, ordering, cursor CAS, cancellation and per-record failure
behaviour from Plan 056.

**Verify**: integration tests cover resume, wrap, cross-tenant IDs, cancellation
and a failing record followed by a successful one.

### Step 4: Run all gates

**Verify**: every command exits 0 and scope is clean.

## Test plan

Extend existing fixtures with xero employee IDs and payroll region. Cover all
mapped statuses, missing employee ID, 401, 403, 404, rate limit, unknown,
cancellation, cap/cursor/CAS, record failure and both tenant boundaries.

## Done criteria

- [ ] NZ/UK status calls always carry employee and leave identity.
- [ ] Permission/auth failures never become approval states.
- [ ] Plan 056 fairness/cursor contracts remain intact.
- [ ] Every command passes; no write-back surface changed.

## STOP conditions

Stop if Plan 056 is not DONE, its cursor shape changed, regional status needs a
new business state, or any out-of-scope write path is required.

## Maintenance notes

Keep read reconciliation independent from outbound approval capability. Plan 037
owns future write-back research.

