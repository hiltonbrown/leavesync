# Plan 102: Add low-level New Zealand leave and balance readers

> **Executor instructions**: Implement low-level per-employee reads and shared
> canonical contracts only. Jobs and regional paging belong to Plans 104–106.
>
> **Drift check (run first)**:
> `git diff --stat ecd49f5..HEAD -- packages/xero/src/nz/read.ts packages/xero/src/nz/read.test.ts packages/xero/src/read/leave-records.ts packages/xero/src/read/leave-records.test.ts packages/xero/src/read/leave-balances.ts packages/xero/src/read/leave-balances.test.ts packages/xero/src/read/leave-application-status.ts packages/xero/src/read/leave-application-status.test.ts packages/xero/src/write/types.ts packages/xero/src/write/types.test.ts packages/xero/index.ts`
> Plans 100/101 changes are expected. Re-stamp after both are DONE.

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: MED
- **Depends on**: `plans/100-add-regional-xero-employee-readers.md` DONE and `plans/101-add-currency-leave-balance-contract.md` DONE
- **Category**: migration
- **Planned at**: commit `ecd49f5`, 2026-08-24; re-stamp after dependencies
- **Execution status**: TODO
- **Supersedes**: NZ adapter slice of rejected Plan 071

## Why this matters

NZ leave and balances are employee-scoped v2 endpoints, not the AU tenant-wide
shape. A low-level validated adapter is needed before a job can page people
safely, distinguish complete employee results and persist monetary Holiday Pay.

## Current state and contracts

- `packages/xero/src/nz/read.ts` is a status-only unsupported stub.
- Official endpoints are
  [`/employees/{EmployeeID}/leave`](https://developer.xero.com/documentation/api/payrollnz/employeeleave)
  and [`/employees/{EmployeeID}/leaveBalances`](https://developer.xero.com/documentation/api/payrollnz/leavebalances).
- Extend `FetchLeaveApplicationStatusInput` with optional `xeroEmployeeId` so
  the current AU caller remains deployable; the NZ low-level input narrows it to
  a required non-empty string. Plan 105 makes regional dispatch require it. AU
  ignores it. Move `XeroLeaveBalanceFetchFailure` from AU into the generic
  balance module/export.
- Add `permission_error` for HTTP 403/partner denial with plain-language mapping.
  Keep 401 as `auth_error`; handlers later treat both as blanket failures.
- Approved monetary rule: NZ `Dollars` maps to `unitType: "currency"` and
  `currencyCode: "NZD"`. Never infer from a symbol or locale.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| NZ | `bunx vitest run packages/xero/src/nz/read.test.ts` | all per-employee reads pass |
| Shared/AU | `bunx vitest run packages/xero/src/read/leave-records.test.ts packages/xero/src/read/leave-balances.test.ts packages/xero/src/read/leave-application-status.test.ts packages/xero/src/write/types.test.ts packages/xero/src/au/read.test.ts` | shared changes and AU regressions pass |
| Gates | `bun run check && bun run typecheck && bun run test && bun run test:integration && bun run build && git diff --check` | every command exits 0 |

## Scope

Only drift-check files, AU tests required by shared-contract changes, and plan
bookkeeping. Do not edit job handlers, dispatch regional strategies, database
persistence, OAuth, scheduling or UI.

## Git workflow

- Branch: `feat/102-nz-read-adapters`
- Commit: `feat(xero): add New Zealand payroll readers`
- Do not push or open a pull request unless instructed.

## Steps

### Step 1: Generalise shared read contracts

Move the AU-owned failure type, add optional employee ID to the shared status
input plus a required NZ subtype, and add the
403 permission variant/message. Keep AU behaviour and HTTP mappings otherwise.

**Verify**: shared/AU command passes.

### Step 2: Add NZ fixture schemas and mappers

Add lower-camel success/empty/malformed fixtures for employee leave, balances
and status lookup. Zod-validate complete envelopes before canonical mapping.

**Verify**: NZ tests fail only because transport functions are absent.

### Step 3: Implement per-employee transport

Implement `fetchNzLeaveForEmployee`, `fetchNzLeaveBalancesForEmployee` and
`fetchNzLeaveApplicationStatus`, all through existing token/rate-limit fetch.
Return explicit complete/failure results; no roster loop exists here.

**Verify**: NZ tests cover success, empty, 400/401/403/404/429, malformed data,
token refresh and raw-payload retention.

### Step 4: Run all gates

**Verify**: every table command exits 0 and scope is clean.

## Test plan

Use sanitised official response shapes. Cover lower-camel IDs/dates/periods,
multiple leave rows, `Dollars -> currency/NZD`, hours/null code, missing IDs,
permission vs auth, empty complete response and AU compatibility.

## Done criteria

- [ ] Three low-level NZ functions return validated canonical results.
- [ ] The balance reader returns explicit currency/NZD without persistence.
- [ ] 403 permission is distinct from 401 authentication.
- [ ] Shared failure/status contracts retain AU behaviour.
- [ ] Every command passes; no job or rollout code changed.

## STOP conditions

Stop on undocumented response semantics, a need for tenant-wide fake
completeness, unsupported currency, or any required job/OAuth/scheduler edit.

## Maintenance notes

Keep low-level readers roster-agnostic. Scheduled page size and cursor ownership
belong to job orchestration.
