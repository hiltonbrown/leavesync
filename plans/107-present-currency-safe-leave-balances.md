# Plan 107: Present currency-safe leave balances

> **Executor instructions**: Carry unit/currency through every balance client
> boundary and perform remaining-balance arithmetic only for day units.
>
> **Drift check (run first)**:
> `git diff --stat ecd49f5..HEAD -- packages/availability/src/people/people-service.ts packages/availability/src/people/people-service.test.ts packages/availability/src/approvals/approval-service.ts packages/availability/src/approvals/approval-service.test.ts packages/availability/src/plans/plan-service.ts packages/availability/src/plans/plan-service.test.ts apps/app/lib/format-leave-balance.ts apps/app/lib/format-leave-balance.test.ts apps/app/components/dashboard/balances-card.tsx apps/app/components/people/person-profile-content.tsx 'apps/app/app/(authenticated)/leave-approvals/leave-approvals-client.tsx' 'apps/app/app/(authenticated)/leave-approvals/leave-approvals-client.test.tsx' apps/app/components/approvals/approve-confirmation-modal.tsx 'apps/app/app/(authenticated)/plans/plans-client.tsx' 'apps/app/app/(authenticated)/plans/record-form.tsx' 'apps/app/app/(authenticated)/plans/record-form-data.ts' 'apps/app/app/(authenticated)/plans/record-form.test.tsx' apps/app/components/plans/submit-confirmation-modal.tsx apps/app/components/plans/submit-confirmation-modal.test.tsx`
> Re-stamp after Plan 101 is DONE.

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: HIGH
- **Depends on**: `plans/101-add-currency-leave-balance-contract.md` DONE
- **Category**: bug
- **Planned at**: commit `ecd49f5`, 2026-08-24; re-stamp after dependency
- **Execution status**: TODO
- **Supersedes**: balance-presentation slice of rejected Plan 071

## Why this matters

Approval and leave-planning services subtract working days from every numeric
balance, and several clients hard-code “days”. That would present or calculate
currency as leave duration. All surfaces need an explicit amount/unit/code view
model and one formatter before regional monetary values reach users.

## Current state and presentation contract

- Approval arithmetic is at `approval-service.ts:1500-1506`; approval UI
  hard-codes days in `leave-approvals-client.tsx:699-705` and
  `approve-confirmation-modal.tsx:164-168`.
- Planning arithmetic is at `plan-service.ts:879-918`; related hard-coded labels
  are in `plans-client.tsx:712-718`, `record-form.tsx:233-235`,
  `record-form-data.ts:143` and `submit-confirmation-modal.tsx:216-224`.
- Carry `{ amount, unit, currencyCode }` to every client. Compute `remaining`
  only when `unit === "days"`; hours/currency show formatted available value and
  null remaining. Manual editing stays hours/days.
- `formatLeaveBalance` uses `Intl.NumberFormat` with explicit NZD. It never
  concatenates symbols or infers currency from locale.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Services | `bunx vitest run packages/availability/src/people/people-service.test.ts packages/availability/src/approvals/approval-service.test.ts packages/availability/src/plans/plan-service.test.ts` | unit/arithmetic projections pass |
| UI | `bunx vitest run apps/app/lib/format-leave-balance.test.ts 'apps/app/app/(authenticated)/leave-approvals/leave-approvals-client.test.tsx' apps/app/components/approvals/approval-modals.test.tsx apps/app/components/plans/submit-confirmation-modal.test.tsx` | formatting/UI cases pass |
| Gates | `bun run check && bun run typecheck && bun run test && bun run test:integration && bun run build && git diff --check` | every command exits 0 |
| Browser | authenticated dashboard, profile, approval and plan flows | accessible values/units are correct |

## Scope

Modify only drift-check files, their existing co-located tests when omitted from
the command for brevity, and plan bookkeeping. The legacy `/leave-balances` page
is a redirect and out of scope. No sync, schema, FX or manual-currency editing.

## Git workflow

- Branch: `fix/107-currency-safe-balances`
- Commit: `fix(app): present leave balances by unit`
- Do not push or open a pull request unless instructed.

## Steps

### Step 1: Define the formatter and view model

Add table tests for days, hours, NZD, zero/negative, null unit and invalid/
missing code. Invalid currency fails before the client boundary.

**Verify**: formatter tests pass with explicit accessible text.

### Step 2: Fix service arithmetic

Project amount/unit/code in people, approval and plan services. Subtract working
days only for day balances; return null remaining otherwise.

**Verify**: service tests prove hours/currency never enter day arithmetic.

### Step 3: Adopt every UI surface

Use the view model/formatter across dashboard, profile, approval modal/list and
plan form/list/confirmation. Preserve hours/days wording and manual controls.

**Verify**: UI tests and browser matrix pass without raw enum/currency payloads.

### Step 4: Run all gates

**Verify**: every command exits 0 and scope is clean.

## Test plan

Add service and component cases for all units, null/invalid data, amount zero/
negative, NZD formatting, accessible names, no remaining value for hours/money,
unchanged day subtraction and manual hours/days controls.

## Done criteria

- [ ] Every balance client receives amount, unit and currency code.
- [ ] Only day balances participate in working-day subtraction.
- [ ] All named UI surfaces use one tested formatter.
- [ ] Manual currency/FX was not introduced.
- [ ] Focused, browser and full gates pass.

## STOP conditions

Stop if any surface cannot receive the explicit view model, invalid data reaches
the client, or correct display requires conversion/accrual policy.

## Maintenance notes

New balance surfaces must consume the formatter/view model. Never use a numeric
balance without checking its unit.
