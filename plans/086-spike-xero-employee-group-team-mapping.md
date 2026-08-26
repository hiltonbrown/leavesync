# Plan 086: Decide whether Xero EmployeeGroupName should map to Team Calendar teams

> **Executor instructions**: This is a read-only spike. Do not change product
> source or schema. Write only `plans/086-findings.md`, then update the index.
>
> **Drift check**: `git diff --stat ecd49f5..HEAD -- packages/xero/src/read packages/jobs/src/handlers/sync-xero-people.ts packages/database/prisma/schema.prisma PRODUCT.md`

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: direction
- **Planned at**: commit `ecd49f5`, 2026-08-24
- **Replaces**: rejected Plan 074

## Why this matters

The official Payroll AU employee model exposes `EmployeeGroupName`, but not the
tracking-category or supervisor fields assumed by Plan 074. Team mapping may
still be useful, but it needs an explicit ownership and rename policy. Manager
hierarchy cannot be inferred from the Payroll API and is excluded.

## Current state

- Official AU employee docs: https://developer.xero.com/documentation/api/payrollau/employees
- Official OpenAPI: https://github.com/XeroAPI/Xero-OpenAPI/blob/master/xero-payroll-au.yaml
- `Team` is tenant scoped and used by calendar/filter surfaces.
- People sync currently preserves Team Calendar-owned associations rather than
  assigning teams from Xero.

## Commands you will need

| Purpose | Command | Expected result |
|---|---|---|
| Inventory | `rg -n "EmployeeGroupName|team_id|Team" packages/xero packages/jobs packages/database PRODUCT.md` | evidence recorded |
| Scope | `git status --short` | only plan files changed |

## Scope

**In scope**: official primary-source research, current model/call-site reading,
and `plans/086-findings.md`.

**Out of scope**: source/schema edits, manager sync, Xero tracking categories,
UI work and live customer mutation.

## Git workflow

- Base branch: `preview` (`origin/preview`), not `main`. Branch from `preview`, commit there, and land the finished work on `preview` — see `plans/README.md` § Execution policy.
- Work directly in this working tree. No isolated git worktree is used for this repo's plan executions.
- Branch: `advisor/086-xero-team-spike`
- Commit: `docs(plans): decide xero employee-group mapping`
- Do not push or open a PR unless instructed.

## Steps

1. Confirm field availability and region differences only from official Xero
   docs/OpenAPI. Record access date and links.
2. Trace current Team ownership, uniqueness, manual edits and person assignment.
3. Decide among: no mapping; initial suggestion only; authoritative ongoing
   mapping. For mapping options specify group rename/deletion, duplicate names,
   blank values, tenant scoping, provenance and opt-out.
4. Write `plans/086-findings.md` with recommendation, evidence, rejected options,
   migration impact, tests and a proposed follow-up plan boundary.

## Test plan

No runtime tests. Verify every external claim links to a primary source and every
code claim names a current path/symbol.

## Done criteria

- [ ] Findings make one explicit recommendation.
- [ ] Manager hierarchy is recorded unsupported, not approximated.
- [ ] Region and lifecycle limitations are documented.
- [ ] Only plan files changed; index updated.

## STOP conditions

Stop if official schemas conflict or access-controlled documentation prevents
confirming the field contract. Record the gap rather than using secondary claims.

## Maintenance notes

Do not revive manager sync unless Xero adds a documented stable identifier and
relationship contract.
