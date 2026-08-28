# Plan 103: Add low-level United Kingdom leave and balance readers

> **Executor instructions**: Reuse Plan 102's shared v2 contracts. Do not enable
> UK access or claim live partner permission in this fixture implementation.
>
> **Drift check (run first)**:
> `git diff --stat ecd49f5..HEAD -- packages/xero/src/uk/read.ts packages/xero/src/uk/read.test.ts packages/xero/src/read/leave-records.ts packages/xero/src/read/leave-balances.ts packages/xero/src/read/leave-application-status.ts packages/xero/src/write/types.ts packages/xero/index.ts`
> Re-stamp after Plan 102 is DONE; stop on a shared-contract mismatch.

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: MED
- **Depends on**: `plans/102-add-new-zealand-xero-read-adapters.md` DONE
- **Category**: migration
- **Planned at**: commit `ecd49f5`, 2026-08-24; re-stamp after dependency
- **Execution status**: DONE
- **Supersedes**: UK adapter slice of rejected Plan 071

## Why this matters

UK read dispatch is unsupported and UK Payroll access requires partner
permission. Fixture-backed low-level readers can establish validation and error
contracts now, while live permission and activation remain a separate gate.

## Current state and contracts

- `packages/xero/src/uk/read.ts` is a status-only unsupported stub.
- Use official Xero UK employee leave/balance documentation and the
  `xero-payroll-uk.yaml` OpenAPI source cited in rejected Plan 071.
- Consume Plan 102's employee-aware status input, generic balance failure and
  `permission_error`. UK ordinary hour/day balances use null currency.
- If a UK payload exposes a monetary unit without an explicit documented
  mapping, return a scoped validation failure and block rollout. Do not infer GBP
  from symbols, locale or tenant region.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| UK | `bunx vitest run packages/xero/src/uk/read.test.ts` | all low-level reader cases pass |
| Regional regression | `bunx vitest run packages/xero/src/nz/read.test.ts packages/xero/src/au/read.test.ts packages/xero/src/read/leave-application-status.test.ts packages/xero/src/read/leave-balances.test.ts` | AU/NZ/shared cases pass |
| Gates | `bun run check && bun run typecheck && bun run test && bun run test:integration && bun run build && git diff --check` | every command exits 0 |

## Scope

Modify only UK reader/test, minimal root exports, and shared tests when required
to prove no regression. Do not edit jobs, database, OAuth, scheduling, UI,
public docs/support claims or Plan 102 shared implementations.

## Git workflow

- Base branch: `preview` (`origin/preview`), not `main`. Branch from `preview`, commit there, and land the finished work on `preview` — see `plans/README.md` § Execution policy.
- Work directly in this working tree. No isolated git worktree is used for this repo's plan executions.
- Branch: `feat/103-uk-read-adapters`
- Commit: `feat(xero): add United Kingdom payroll readers`
- Do not push or open a pull request unless instructed.

## Steps

### Step 1: Add UK schemas and fixtures

Create sanitised success/empty/malformed and 400/401/403/404/429 fixtures for
employee leave, ordinary balances and single status.

**Verify**: UK tests fail only for missing implementations.

### Step 2: Implement per-employee readers

Implement `fetchUkLeaveForEmployee`, `fetchUkLeaveBalancesForEmployee` and
`fetchUkLeaveApplicationStatus` using shared transport/error contracts. Return
complete results for one employee only.

**Verify**: UK command passes; permission denial never becomes empty success.

### Step 3: Prove regional isolation

Run AU/NZ/shared regressions and ensure UK types do not leak beyond `@repo/xero`.

**Verify**: regional command passes and `rg -n "Uk|UK" packages/availability packages/feeds` finds no provider type import.

### Step 4: Run all gates

**Verify**: every table command exits 0 and only in-scope files changed.

## Test plan

Cover IDs, dates, periods, multiple rows, hour/day null currency, unexpected
monetary unit, missing fields, empty complete response, typed permission/auth,
rate limit, token refresh and raw payload retention.

## Done criteria

- [x] Three fixture-backed UK low-level readers satisfy shared contracts.
- [x] 403 cannot masquerade as empty data or 401.
- [x] Unsupported monetary units fail closed.
- [x] No activation/support claim changes.
- [x] Every command passes.

## STOP conditions

Stop on a material undocumented schema difference, need for live access to
guess fixtures, shared-contract change, or any job/rollout edit.

## Maintenance notes

Plan 109 must validate these fixture-derived contracts against a sanctioned
live UK tenant before activation.

