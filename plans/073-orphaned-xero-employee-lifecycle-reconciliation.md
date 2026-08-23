# Plan 073: Soft-archive Xero employees missing from a complete payroll snapshot

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report. Do not improvise. When done, update the status row for this plan in
> `plans/README.md`, unless a reviewer dispatched you and told you they maintain
> the index.
>
> **Dependency-aware drift check (run first)**:
> `git diff --stat 2e82ef4..HEAD -- packages/jobs/src/handlers/sync-xero-people.ts packages/jobs/src/handlers/sync-xero-people.integration.test.ts docs/architecture/xero-people-sync.md`
> Plan 072 must be `DONE` before this plan starts, so its changes to all three
> files are expected drift. Confirm the live code matches the "Required Plan
> 072 handoff" below. Treat any other in-scope drift, or a mismatch with that
> handoff, as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: 072, which transitively depends on 071
- **Category**: bug
- **Planned at**: commit `2e82ef4`, 2026-08-23

## Why this matters

The people sync imports and updates employees returned by Xero, but an employee
deleted, merged or removed from a payroll file can remain visible in Team
Calendar indefinitely. Absence is also a dangerous signal: a failed or
truncated provider read can make many valid employees appear missing.

This plan adds one guarded absence pass after the complete import from Plan 072.
It soft-archives only Xero-sourced people whose stable EmployeeID is genuinely
absent from an authoritative snapshot, while preserving historical records and
allowing Plan 072 to reactivate the same `Person` if that EmployeeID returns.

## Lifecycle contract shared with Plan 072

The two plans modify the same handler but own opposite, non-overlapping edges:

| Xero employee state after a complete read | Owner | Required result |
|---|---|---|
| EmployeeID is returned, including `INACTIVE` or `TERMINATED` | 072 | Upsert the Xero person, set `archived_at: null`, and map `is_active` from Xero status. |
| EmployeeID returns after archival | 072 | Update and unarchive the same `Person` ID. Never create a replacement row. |
| EmployeeID is absent | 073 | Soft-archive the existing unarchived Xero person only after the safety checks in this plan pass. |
| Read fails, is cancelled, or cannot prove complete pagination | Neither | Do not run absence reconciliation. |
| Person has `source_system: "MANUAL"` | Neither | Never mutate it from Xero lifecycle reconciliation. |

An inactive or terminated employee that Xero still returns is present, not
orphaned. Status must never be used as the archival predicate. Plan 073 must
preserve `source_person_key` and `xero_employee_id`; Plan 072 needs those keys to
find and reactivate the same row later.

## Required Plan 072 handoff

Before changing code, verify all of the following in the live branch:

- The Plan 072 row in `plans/README.md` is `DONE`.
- The Plan 071 row is also `DONE` through Plan 072's dependency, and all three
  regional employee readers satisfy the complete-success contract.
- `processBatch` upserts by
  `(organisation_id, source_system: "XERO", source_person_key: EmployeeID)` and
  the update block sets `archived_at: null`.
- Valid returned employees are upserted regardless of active status or email.
- One malformed row is recorded as a record-level failure without discarding
  valid siblings from the fetched page.
- The integration test proves a previously archived Xero person is restored
  with the same `Person` ID.
- No missing-ID archival pass already exists in the handler.

If any item is false, stop. Do not reproduce, partially reimplement or work
around Plan 072 inside this plan.

## Current state

- `packages/xero/src/au/read.ts:41-105` returns `ok: true` only after every page
  has been mapped and a terminal page shorter than `XERO_PAGE_SIZE` is reached.
  HTTP errors, parse errors and the maximum-page guard return `ok: false`.
  Therefore a successful AU adapter result is the current authoritative
  snapshot boundary. Do not reach into adapter-local variables such as
  `mappedPage` or `XERO_PAGE_SIZE` from the job.
- At planned commit `2e82ef4`, `packages/xero/src/read/dispatch.ts:45-76`
  returns the employee array from the supported regional adapter, with NZ and UK
  still stubbed. The required Plan 071 and Plan 072 handoffs replace those stubs
  and prove the same complete-success contract for every supported region
  before this plan starts.
- `packages/jobs/src/handlers/sync-xero-people.ts:159-231` fetches employees,
  processes them in batches and finalises the run. After Plan 072 it restores a
  matching archived row, but there is no post-import comparison with existing
  unarchived Xero people.
- `packages/jobs/src/handlers/sync-xero-people.ts:273-320` validates each row
  before upsert. The returned-ID protection set must be collected before that
  validation. A present employee with a valid EmployeeID but a malformed name
  must not cause its existing person to be archived in the same run.
- `packages/jobs/src/handlers/sync-xero-people.ts:396-422` writes final counts
  and `error_summary`. A reconciliation warning must be passed into this final
  call; a separate earlier update would be overwritten with `null`.
- `packages/database/prisma/schema.prisma:362-409` gives `Person` stable Xero
  keys and soft archival. Availability records relate to `Person`; this plan
  must not delete the person, clear payroll identity keys or mutate historical
  availability.

## Authoritative snapshot and safety rules

1. Reconcile only after `fetchEmployeesForRegion` returns `ok: true`, every
   returned row has been processed, and a final cancellation check confirms the
   run is still active.
2. Build the returned-ID protection set from every non-empty EmployeeID in the
   successful adapter result before row validation or upsert. Record-level
   failures do not make a present ID absent.
3. Query only unarchived people with `source_system: "XERO"` in both
   `clerk_org_id` and `organisation_id`. Never use Clerk Organisation scope
   alone.
4. A Xero person with a null or empty `source_person_key` cannot be compared
   safely. Leave it unchanged, emit a warning and make the run
   `partial_success` for operator review.
5. The safety denominator is the number of currently unarchived, keyed,
   Xero-sourced people in the exact organisation, not total tenant headcount and
   not manual people. If `missingCount / existingKeyedXeroCount > 0.5`, archive
   none. Exactly 50% is within the permitted threshold. An empty snapshot with
   any existing keyed Xero people is therefore blocked as 100% missing.
6. If the guard passes, archive the selected rows with one scoped `updateMany`:
   set `archived_at` to one shared timestamp, `is_active: false` and
   `clerk_user_id: null`. Keep `source_person_key`, `xero_employee_id`, local
   ownership fields and all related history unchanged.
7. A guard warning, unkeyed Xero row or update-count mismatch makes the run
   `partial_success` and is written to `sync_runs.error_summary`. It does not
   convert returned employee upserts into failures.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| People sync integration | `bunx vitest run packages/jobs/src/handlers/sync-xero-people.integration.test.ts` | all pass with `DATABASE_URL` configured |
| Check | `bun run check` | exit 0 |
| Typecheck | `bun run typecheck` | exit 0 |
| Unit tests | `bun run test` | all workspaces pass |
| Integration gate | `bun run test:integration` | all workspaces pass with `DATABASE_URL` configured |

## Suggested executor toolkit

- Read `PRODUCT.md` sections "Inbound sync flow", "people" and "SyncRun"
  before editing lifecycle or count semantics.
- Use Plan 072 as a dependency contract, not as a second implementation scope.
  Preserve its import, reactivation and Clerk-access behaviour unchanged.

## Scope

**In scope** (the only files to modify):

- `packages/jobs/src/handlers/sync-xero-people.ts`
- `packages/jobs/src/handlers/sync-xero-people.integration.test.ts`
- `docs/architecture/xero-people-sync.md`
- `plans/README.md` for status only

**Out of scope** (do not touch):

- `packages/xero/**`. Plan 071 owns regional adapters and Plan 072 owns the
  employee mapper and AU pagination regression. Stop if their success contract
  is not sufficient for authoritative absence reconciliation.
- `packages/database/prisma/schema.prisma`, migrations and new persistence
  fields. The existing soft-archive fields and sync-run summary are sufficient.
- `packages/availability/**`, feed projection and historical availability.
- Clerk invitation, membership discovery and email matching. Plan 072 owns
  access reconciliation; this plan only clears a Clerk link when its Xero
  person is archived.
- Automatic merging, deletion or identity-key clearing for Xero people.
- Manual people, including a manual person with the same email as a Xero
  person.
- Xero disconnect behaviour. Disconnect is a separate destructive lifecycle
  with different identity-key rules.

## Git workflow

- Branch: `advisor/073-guarded-xero-employee-archival`
- Commit per logical unit using Conventional Commits, for example:
  `fix(jobs): archive missing xero employees safely`.
- Do not push or open a pull request unless explicitly instructed.

## Steps

### Step 1: Preserve every returned EmployeeID before processing records

1. In `syncXeroPeople`, immediately after the successful employee fetch, build
   a `Set<string>` from every non-empty returned `employee.employeeId` before
   entering the batch loop. Use the same EmployeeID representation that Plan
   072 persists as `source_person_key`; do not switch to email or
   `xero_employee_id` as a second identity rule.
2. Do not add only successfully upserted IDs to the set. An employee that is
   present but fails record-level validation, or whose upsert fails, remains
   protected from absence-based archival for this run.
3. After the batch loop, read the scoped `syncRun.cancel_requested_at` one more
   time. If cancellation was requested, complete and return `cancelled` without
   querying or archiving missing people.
4. Do not call reconciliation on any adapter error path, unsupported-region
   path, early preparation result or exception path.

**Verify**:
`bunx vitest run packages/jobs/src/handlers/sync-xero-people.integration.test.ts`
passes the existing Plan 072 import, record-failure and cancellation tests
before archival assertions are added.

### Step 2: Add one guarded, dual-tenant absence helper

1. Add a private helper in `sync-xero-people.ts`, for example
   `reconcileMissingXeroPeople`. It accepts the dual-tenant context, the
   returned-ID set and one `now` timestamp. It returns:

   ```typescript
   {
     archived: number;
     warning: string | null;
   }
   ```

2. Query `database.person.findMany` with all of:
   `...scoped(context)`, `source_system: "XERO"`, and `archived_at: null`.
   Select only `id` and `source_person_key`.
3. Separate unkeyed rows from keyed rows. Exclude unkeyed rows from both the
   orphan list and threshold denominator, keep them unchanged, and include a
   plain-language warning with their count. Accumulate warnings rather than
   replacing an earlier data-quality warning with a later threshold or
   update-count warning.
4. Compute missing keyed rows by exact membership in the returned-ID set. If
   there are no keyed rows or no missing rows, return without writing.
5. If more than half of keyed existing Xero rows are missing, skip the entire
   archival write and return a warning containing `missingCount` and
   `existingKeyedXeroCount`. Do not silently lower, cap or batch the candidate
   set to get under the threshold.
6. Otherwise issue one `database.person.updateMany` scoped again by both tenant
   keys, `source_system: "XERO"`, `archived_at: null`, and the exact candidate
   IDs. Set only:

   ```typescript
   {
     archived_at: now,
     clerk_user_id: null,
     is_active: false,
   }
   ```

7. Return the actual `updateMany.count` as `archived`. If it differs from the
   candidate count, append a warning and make the run partial. Log structured
   counts and scoped identifiers through `@repo/observability/log`; do not log
   raw Xero payloads or Clerk data.

**Verify**:
`bunx vitest run packages/jobs/src/handlers/sync-xero-people.integration.test.ts`
passes tests for one-of-two archival, the greater-than-50% guard, exact-50%
behaviour, manual-person isolation and dual-tenant isolation.

### Step 3: Finalise the run once without losing reconciliation state

1. Call `reconcileMissingXeroPeople` only after Step 1's post-batch cancellation
   check and before updating `xeroTenant.last_people_sync_at`.
2. Keep the public `syncXeroPeople` result shape unchanged. Pass the internal
   archived count separately to `completeRun`, and set
   `records_synced = counts.upserted + archived` while leaving
   `records_upserted = counts.upserted`.
3. Compose the final status once:
   - `partial_success` when `counts.failed > 0` or reconciliation returns a
     warning;
   - `succeeded` otherwise.
4. Pass the reconciliation warning into that same final `completeRun` call as
   `errorSummary`. Do not write `sync_runs.error_summary` earlier and then
   overwrite it during finalisation.
5. Preserve the existing meaning of `fetched`, `upserted`, `skipped` and
   `failed`. Archival is not an upsert, skipped import or record-level failure.

**Verify**:
`bunx vitest run packages/jobs/src/handlers/sync-xero-people.integration.test.ts`
passes and proves successful archival increments `records_synced` but not
`records_upserted`; guarded reconciliation finishes `partial_success` with a
persisted warning.

### Step 4: Prove the two-plan lifecycle is idempotent and reversible

Extend `sync-xero-people.integration.test.ts` using the existing dual-tenant
fixtures and Plan 072 employee builders:

1. Run a complete snapshot with two employees and capture both `Person` IDs.
2. Run a second complete snapshot containing only one employee. Exactly 50% is
   permitted, so assert the missing row is archived, inactive and unlinked,
   while its stable Xero identity keys and historical availability remain
   unchanged.
3. Run a third complete snapshot containing both EmployeeIDs. Assert Plan 072's
   upsert restores the archived row with the original `Person` ID and creates
   no duplicate.
4. Add focused cases proving:
   - a returned `INACTIVE` or `TERMINATED` employee is unarchived but inactive,
     never orphaned;
   - a returned row with a non-empty stable EmployeeID and a record-level name
     validation failure protects the existing Xero person from archival;
   - three existing keyed Xero people with only one returned exceed the
     threshold, archive none, finish `partial_success` and persist the warning;
   - an empty successful snapshot with existing Xero people is also blocked;
   - an already archived Xero person is excluded from the denominator and is
     not rewritten;
   - an unkeyed Xero person remains unchanged and produces a partial-success
     warning;
   - manual people, including same-email records, remain unchanged;
   - another organisation and another Clerk Organisation remain unchanged;
   - adapter failure and post-batch cancellation perform no archival query or
     mutation.

**Verify**:
`bunx vitest run packages/jobs/src/handlers/sync-xero-people.integration.test.ts`
passes all lifecycle, safety and isolation cases with `DATABASE_URL` configured.

### Step 5: Reconcile the architecture document and run every gate

1. Update Scenario B in `docs/architecture/xero-people-sync.md` after Plan
   072's documentation changes. Replace the additive-only statement for
   missing Xero employees with this plan's authoritative-snapshot, threshold
   and soft-archive rules.
2. Add the shared lifecycle table or equivalent prose: returned status is owned
   by Plan 072; completed-snapshot absence is owned by Plan 073; manual people
   are never touched; incomplete or failed reads never infer absence.
3. State explicitly that archival keeps both stable Xero identity keys and all
   historical availability, and that a later returned EmployeeID reactivates
   the same `Person` row.
4. Run every command in the verification table. Do not treat unit tests as a
   substitute for the integration gate.

**Verify**:
`bun run check && bun run typecheck && bun run test && bun run test:integration`
exits 0 for every command.

## Test plan

- `packages/jobs/src/handlers/sync-xero-people.integration.test.ts`:
  - complete present, missing, present-again round trip preserves one Person ID;
  - one of two missing archives at exactly 50%;
  - two of three missing and an empty snapshot trigger the greater-than-50%
    guard with no archival;
  - returned inactive or terminated employees are not classified as missing;
  - present IDs are protected even when their row fails later validation;
  - unkeyed Xero rows warn and remain unchanged;
  - archived Xero rows are outside the active denominator;
  - manual and cross-tenant rows remain untouched;
  - fetch failure and cancellation do not reconcile absence;
  - archival clears the Clerk link but preserves Xero keys and historical
    availability;
  - `records_synced`, `records_upserted`, final status and `error_summary`
    reflect the reconciliation outcome without changing import counts.

## Done criteria

All items must hold:

- [ ] Plan 072 is `DONE`, and its import/reactivation integration tests still
      pass unchanged in intent.
- [ ] Every non-empty returned EmployeeID is protected before record-level
      validation and upsert.
- [ ] Reconciliation runs only after a complete successful adapter result and a
      final negative cancellation check.
- [ ] Only unarchived, keyed, Xero-sourced people in both tenant scopes enter
      the comparison and threshold.
- [ ] More than 50% missing archives no one; exactly 50% follows the documented
      archival path.
- [ ] Returned inactive and terminated employees remain unarchived with
      `is_active: false`.
- [ ] Archival clears `clerk_user_id` but preserves `source_person_key`,
      `xero_employee_id`, the original `Person` ID and historical availability.
- [ ] A later complete snapshot containing the same EmployeeID restores the
      same person without a duplicate.
- [ ] Manual people and every out-of-scope tenant remain unchanged.
- [ ] Guard and data-quality warnings survive finalisation in
      `sync_runs.error_summary` and produce `partial_success`.
- [ ] `records_synced` includes successful archival while
      `records_upserted` remains the returned-employee upsert count.
- [ ] `bun run check`, `bun run typecheck`, `bun run test` and
      `bun run test:integration` all exit 0.
- [ ] The union of `git diff --name-only 2e82ef4..HEAD`,
      `git diff --cached --name-only`, `git diff --name-only` and
      `git ls-files --others --exclude-standard` contains no Plan 073 changes
      outside the in-scope list, apart from completed Plan 072 dependency
      changes and `plans/README.md` status-only changes.
- [ ] The Plan 073 row in `plans/README.md` is updated to `DONE` only after all
      gates pass.

## STOP conditions

Stop and report back without improvising if:

- Plan 072 is not `DONE`, its handler does not set `archived_at: null` for a
  returned EmployeeID, or its same-row reactivation test is absent.
- An employee adapter can return `ok: true` with a partial or truncated employee
  list. Correct that adapter under its owning plan before enabling absence
  reconciliation for the region.
- Plan 071 is not `DONE`, or any AU, NZ or UK employee reader lacks tested
  complete-pagination and error semantics.
- Live data can identify Xero people only by email, or contains conflicting rows
  where one row owns `source_person_key = EmployeeID` and another owns
  `xero_employee_id = EmployeeID`. This needs a separate data-reconciliation
  decision, not automatic archival.
- Product requires a different mass-archival threshold or wants exactly 50% to
  be blocked. Record that decision and revise the plan before implementation.
- Archival requires deleting a `Person`, clearing either Xero identity key,
  mutating availability or feed history, or changing Xero disconnect semantics.
- A schema migration or change outside the in-scope files appears necessary.
- `bun run test:integration` cannot run because `DATABASE_URL` is unavailable.
  Report the missing gate and do not mark the plan complete.

## Maintenance notes

- Every new employee adapter must preserve the rule that success means a fully
  paginated authoritative snapshot. A partial-success employee result must
  disable absence reconciliation explicitly.
- Keep the threshold denominator limited to current, keyed, unarchived Xero
  people in one payroll organisation. Manual headcount must never dilute it.
- Keep the lifecycle reversible. Archival hides an absent payroll person and
  removes login linkage; it does not destroy payroll identity or history.
- Review Plan 072 and Plan 073 together whenever the people sync's identity key,
  status mapping, pagination contract or archival policy changes.
