# Plan 071: Implement New Zealand and United Kingdom Xero Payroll Sync Expansion

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 5993283..HEAD -- packages/xero/src/nz packages/xero/src/uk packages/xero/src/read/dispatch.ts packages/jobs/src/handlers/sync-xero-people.ts packages/jobs/src/handlers/sync-xero-leave-records.ts packages/jobs/src/handlers/sync-xero-leave-balances.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: MED
- **Depends on**: 069
- **Category**: migration
- **Planned at**: commit `5993283`, 2026-08-22

---

## Why this matters

The platform currently supports Australian Xero Payroll files while New Zealand (`NZ`) and United Kingdom (`UK`) payroll files are stubbed with *"NZ/UK payroll reads are not yet available"*. Customers with multi-entity payroll files across ANZ and the UK cannot sync their non-AU teams, leaving availability calendars blank.

Implementing full read adapters for NZ and UK payroll unlocks the full multi-tenant market while maintaining strict tenant isolation and canonical availability domain boundaries.

---

## Current state

- `packages/xero/src/read/dispatch.ts` (lines 54–69):
  ```typescript
  case "NZ":
    return { error: { code: "unknown_error", message: "NZ payroll employee reads are not yet available." }, ok: false };
  case "UK":
    return { error: { code: "unknown_error", message: "UK payroll employee reads are not yet available." }, ok: false };
  ```
- `packages/jobs/src/handlers/sync-xero-people.ts` (lines 142–158) short-circuits NZ/UK runs with empty counts.
- `packages/xero/src/oauth/service.ts` (line 324) rejects non-AU files on connection:
  `if (payrollRegion !== "AU") return { error: { code: "invalid_country", message: "Team Calendar currently supports Australian Xero Payroll files only." }, ok: false };`

---

## Commands you will need

| Purpose   | Command                                                      | Expected on success |
|-----------|--------------------------------------------------------------|---------------------|
| Check     | `bun run check`                                              | exit 0              |
| Typecheck | `bun run typecheck`                                          | exit 0              |
| Test NZ   | `bunx vitest run packages/xero/src/nz`                       | all pass            |
| Test UK   | `bunx vitest run packages/xero/src/uk`                       | all pass            |
| Full test | `bun run test`                                               | all pass            |

---

## Scope

**In scope**:
- `packages/xero/src/nz/read.ts` & `packages/xero/src/nz/read.test.ts`
- `packages/xero/src/uk/read.ts` & `packages/xero/src/uk/read.test.ts`
- `packages/xero/src/read/dispatch.ts`
- `packages/xero/src/oauth/service.ts` (enable NZ/UK region connection)
- `packages/jobs/src/handlers/sync-xero-people.ts`
- `packages/jobs/src/handlers/sync-xero-leave-records.ts`
- `packages/jobs/src/handlers/sync-xero-leave-balances.ts`

**Out of scope**:
- Direct outbound payroll write-back for NZ/UK (read-only sync first; write-back is a separate phase)
- Feed generation modifications

---

## Git workflow

- Branch: `advisor/071-nz-uk-payroll-sync`
- Commit style: Conventional Commits (`feat(xero): implement NZ payroll employee and leave read adapters`, `feat(xero): implement UK payroll employee and leave read adapters`)
- Do NOT push or open a PR unless explicitly instructed.

---

## Steps

### Step 1: Implement NZ Payroll Read Adapters

1. In `packages/xero/src/nz/read.ts`:
   - Implement `fetchEmployees`: Calls `GET /payroll.xro/2.0/Employees` (NZ Payroll API 2.0 endpoint) with rate-limited `xeroFetch` and pagination.
   - Implement `fetchLeaveRecords`: Calls `GET /payroll.xro/2.0/LeaveApplications`. Map NZ leave records (`StartDate`, `EndDate`, `LeaveTypeID`, `Status`) into canonical `XeroLeaveRecord`.
   - Implement `fetchLeaveBalances`: Calls `GET /payroll.xro/2.0/Employees/{id}/LeaveBalances`. Map units to `hours` or `days`.
2. Add comprehensive fixture tests in `packages/xero/src/nz/read.test.ts`.

**Verify**: `bunx vitest run packages/xero/src/nz/read.test.ts` → all pass.

---

### Step 2: Implement UK Payroll Read Adapters

1. In `packages/xero/src/uk/read.ts`:
   - Implement `fetchEmployees`: Calls `GET /payroll.xro/2.0/Employees` (UK Payroll API 2.0).
   - Implement `fetchLeaveRecords`: Calls `GET /payroll.xro/2.0/LeaveApplications`.
   - Implement `fetchLeaveBalances`: Calls `GET /payroll.xro/2.0/Employees/{id}/LeaveBalances`.
2. Add fixture-based tests in `packages/xero/src/uk/read.test.ts`.

**Verify**: `bunx vitest run packages/xero/src/uk/read.test.ts` → all pass.

---

### Step 3: Wire Dispatchers & Remove Regional Connection Gates

1. In `packages/xero/src/read/dispatch.ts`:
   - Dispatch `NZ` calls to `packages/xero/src/nz/read.ts`.
   - Dispatch `UK` calls to `packages/xero/src/uk/read.ts`.
2. In `packages/jobs/src/handlers/sync-xero-people.ts`, `sync-xero-leave-records.ts`, and `sync-xero-leave-balances.ts`:
   - Remove region short-circuit skips for `NZ` and `UK`.
3. In `packages/xero/src/oauth/service.ts`:
   - Remove the `if (payrollRegion !== "AU")` connection block in `completeXeroTenantSelection`.

**Verify**: `bun run check` and `bun run typecheck` → exit 0.

---

## Test plan

- Fixture tests for NZ and UK payload parsers in `packages/xero/src/nz/read.test.ts` and `packages/xero/src/uk/read.test.ts`.
- Integration tests in `packages/jobs/src/handlers/sync-xero-people.integration.test.ts` verifying NZ and UK tenants ingest employees and leave records.

**Verification Command**: `bun run test` → all tests pass.

---

## Done criteria

- [ ] `bun run check` exits 0.
- [ ] `bun run typecheck` exits 0.
- [ ] `bun run test` exits 0.
- [ ] NZ Xero files connect and sync employees and leave into `people` and `availability_records`.
- [ ] UK Xero files connect and sync employees and leave into `people` and `availability_records`.
- [ ] `plans/README.md` status row updated.

---

## STOP conditions

Stop and report back if:
- NZ or UK API returns a leave unit representation incompatible with `availability_record_type` or `leave_balance_unit`.
- Xero OAuth session fails to negotiate payroll scopes for NZ/UK organisations.
