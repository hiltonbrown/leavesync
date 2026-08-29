# Plan 112: Align advertised Xero reads with the AU adapter

> **Executor instructions**: Follow every step and STOP condition. Modify only
> in-scope files. The reviewer maintains the plan index.
>
> **Drift check (run first)**:
> `git diff --stat 5fa417a1..HEAD -- apps/web/app/integrations/page.tsx apps/web/app/integrations/integrations.test.ts packages/xero/src/au/read.ts PRODUCT.md`

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: Plan 111 DONE
- **Category**: docs
- **Planned at**: commit `5fa417a1`, 2026-08-30; reconciled after Plan 111
- **Execution status**: DONE, approved after one revision at `83ed611` on 2026-08-30
- **Preview landing**: PENDING; `preview` is user-provisioned

## Why this matters

The public page claims payroll-calendar and pay-period ingestion that does not
exist. It also presents leave types as an independently synced resource when
the AU reader only fetches leave-type names as metadata while mapping leave.
The public data contract must match the current AU-only launch.

## Current state

- `apps/web/app/integrations/page.tsx:52-60` advertises payroll calendars and
  pay periods under `Reads from Xero`.
- `apps/web/app/integrations/page.tsx:80-84` says the first sync runs for leave
  types as if a dedicated sync exists.
- `packages/xero/src/au/read.ts:66-185` reads employees.
- `packages/xero/src/au/read.ts:187-337` reads leave applications and PayItems
  leave-type names used for mapping.
- `packages/xero/src/au/read.ts:339-438` reads leave balances.
- `PRODUCT.md:583-593` defines the inbound flow as people, leave records,
  supporting leave metadata and balances.

## Commands you will need

Use Plan 110's focused, lint, web typecheck and four repository gate commands.
Add `rg -n "Payroll calendar|pay period information" apps/web/app/integrations`
and expect no matches after the edit.

## Suggested executor toolkit

- Use `impeccable` with `clarify`. Keep buyer-facing language and avoid leaking
  adapter endpoint names into the page.

## Scope

**In scope**:
- `apps/web/app/integrations/page.tsx`
- `apps/web/app/integrations/integrations.test.ts`

**Read-only evidence, never modify**:
- `packages/xero/src/au/read.ts`
- `PRODUCT.md`

**Out of scope**:
- Adding payroll-calendar or pay-period ingestion.
- NZ or UK support wording.
- Xero OAuth scope changes.

## Git workflow

- Target branch: user-created `preview`; do not create or reset it.
- Branch: `codex/112-align-advertised-xero-reads`
- Commit: `fix(web): align Xero data access claims`
- Approved landing commit: `83ed611`.
- Executor: do not push or merge. Stop if `preview` or `origin/preview` is absent.
- Landing owner: after Plan 111 is reachable from `origin/preview`, update local
  `preview`, fast-forward it to the working branch with `git merge --ff-only`,
  run the plan gates, then push `preview`. Stop and reconcile on divergence.
- Completion proof: `git merge-base --is-ancestor 83ed611 origin/preview` must
  exit 0 before this plan is considered landed.

## Steps

### Step 1: Add capability assertions

Extend the focused test to reject payroll-calendar/pay-period claims and assert
the current public inbound categories: employees, leave records and balances.

**Verify**: the negative assertion fails before the page edit.

### Step 2: Correct the data and setup copy

Remove the unsupported data bullet. Describe leave-type names only as supporting
metadata if it remains useful; do not call them a separate synced configuration.
Update the first-sync step to employees, leave and balances.

**Verify**: focused test, `rg` and targeted lint pass.

### Step 3: Run all gates

Run web typecheck, the four repository gates and `git diff --check`.

## Test plan

- Assert unsupported data categories are absent.
- Assert each authoritative inbound category is present.
- Keep the test independent of exact sentence punctuation.

## Done criteria

- [ ] No payroll-calendar or pay-period ingestion is advertised.
- [ ] First-sync wording matches registered sync operations.
- [ ] Focused test and all gates pass.
- [ ] Only in-scope files changed.

## STOP conditions

- A committed adapter reader for payroll calendars/pay periods is discovered.
- Product owners confirm a separately shipped, undocumented ingestion path.
- The change would require altering OAuth scopes or backend behaviour.

## Maintenance notes

Future public data-scope changes should follow a shipped reader and persistence
path, not precede them.

## Review record

- Executor commit: `83ed611` on branch
  `codex/112-align-advertised-xero-reads`.
- Scope: exactly the integrations page and focused test.
- Reviewer required one revision to remove the residual `entitlements` claim;
  final copy now matches employees, approved leave applications and balances.
- Three focused tests, targeted Ultracite, web typecheck and diff checks passed.
  Unit and integration gates passed after reruns; full-check/typecheck noise was
  isolated to the disposable workspace dependency mount and unchanged files.
