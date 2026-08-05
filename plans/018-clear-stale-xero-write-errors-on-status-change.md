# Plan 018: Clear stale Xero write errors when sync moves a record out of the failed state

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report, do not improvise. When done, update this plan's status row in
> `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 75202db..HEAD -- packages/jobs/src/handlers/sync-xero-leave-records.ts packages/jobs/src/handlers/reconcile-xero-approval-state.ts`
> If either changed since this plan was written, re-check the "Current state"
> facts before proceeding.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none (but see the note about plan 007 under "Maintenance
  notes" if both are in flight)
- **Category**: correctness
- **Planned at**: commit `75202db`, 2026-07-25

## Why this matters

Three fields on `availability_records` record the outcome of the last failed
outbound Xero write: `failed_action`, `xero_write_error` (plain language, shown
to users) and `xero_write_error_raw` (full payload, admin audit only). They are
meaningful only while `approval_status` is `xero_sync_failed`. Once the record
moves to a settled status they are stale.

Three code paths move a record out of `xero_sync_failed` without clearing them:

1. **Inbound leave sync.** When Xero reports a state that differs from the local
   one, `processLeaveRecord` writes a `data` object that sets
   `approval_status` but never touches the three error fields. A record whose
   approve write failed locally, and which a manager then approved directly in
   Xero, ends up `approved` while still carrying the failure message.
2. **The reconciler's decline branch.** It clears `failed_action` but leaves
   `xero_write_error` and `xero_write_error_raw` populated. This branch
   explicitly matches records in `xero_sync_failed`, so those fields are
   guaranteed to be set when it runs.
3. **The reconciler's withdraw-from-Xero branch.** It clears none of the three.

`xero_write_error` is not an internal field. It is read out to users in four
places: `packages/availability/src/plans/plan-service.ts:322`,
`packages/availability/src/calendar/calendar-service.ts:753`,
`packages/availability/src/people/people-service.ts:849` and
`apps/app/app/(authenticated)/plans/_actions.ts:406`. `failed_action` drives
`mutedNoteForRecord` in `packages/availability/src/approvals/approval-service.ts:1327-1335`.

The visible result is an approved or declined leave record that still displays
"this failed to sync to Xero". Users cannot tell whether the record is settled
or broken, and the natural response is to raise a support ticket about a record
that is in fact fine. It also poisons any future debugging: `xero_write_error_raw`
is meant to be the audit trail of the last real failure, and a stale value
attached to a settled record makes that trail unreliable.

The fix is small and mechanical. It is worth doing because the same three
fields are already cleared correctly everywhere else, which makes these three
sites look intentional to a reader when they are not.

## Current state

### Inbound sync never clears the error fields

`packages/jobs/src/handlers/sync-xero-leave-records.ts` lines 577-623.

The status decision first:

```typescript
    const existing = existingRecordsBySourceRemoteId.get(
      normalised.sourceRemoteId
    );
    let approvalStatusToPersist = normalised.approvalStatus;
    if (
      existing?.approval_status === "xero_sync_failed" &&
      existing.failed_action === "withdraw" &&
      normalised.approvalStatus === "approved"
    ) {
      approvalStatusToPersist = "xero_sync_failed";
    }
```

That special case is correct and must be preserved: a failed *withdraw* means
Xero still shows the application as approved, so the local record must stay in
the failed state until the withdraw succeeds or is reconciled. It is the only
case where the record deliberately remains `xero_sync_failed`.

Then the update payload. **Refreshed 2026-08-05**: plan 006 split this object
into `xeroOwned` and `locallyOwned` so that inbound sync stops overwriting
user-owned privacy, feed and title choices. The shape below is the current code
at lines 591-630, and it is the shape you must edit:

```typescript
    const xeroOwned = {
      all_day: normalised.allDay,
      approval_status: approvalStatusToPersist,
      archived_at: normalised.publishStatus === "archived" ? new Date() : null,
      contactability: normalised.contactability,
      derived_uid_key: normalised.derivedUidKey,
      ends_at: normalised.endsAt,
      person_id: normalised.personId,
      publish_status: normalised.publishStatus,
      record_type: normalised.recordType,
      source_last_modified_at: normalised.sourceLastModifiedAt,
      source_payload_json: toPrismaJsonValue(normalised.rawPayload),
      source_remote_hash: normalised.sourceRemoteHash,
      starts_at: normalised.startsAt,
      updated_at: new Date(),
    };
    // Privacy mode, feed inclusion and title are set by the person who owns the
    // record. Xero is not the source of truth for them, so they are seeded on
    // create and on Xero-sourced records, but never overwritten on a record the
    // user authored in Team Calendar.
    const locallyOwned = {
      include_in_feed:
        normalised.includeInFeed && person.include_in_feeds_by_default,
      privacy_mode: person.default_privacy_mode,
      title: normalised.title,
    };
    const data = { ...xeroOwned, ...locallyOwned };

    const recordId = existing?.id;
    if (recordId) {
      const updateData =
        existing.source_type === "team_calendar_leave"
          ? xeroOwned
          : { ...xeroOwned, ...locallyOwned };
      await database.availabilityRecord.updateMany({
        data: updateData,
        where: { ...scoped(context), id: recordId },
      });
      existingRecordsBySourceRemoteId.set(normalised.sourceRemoteId, {
        approval_status: approvalStatusToPersist,
        failed_action: existing?.failed_action ?? null,
        id: recordId,
        source_remote_hash: normalised.sourceRemoteHash,
        source_remote_id: normalised.sourceRemoteId,
        source_type: existing.source_type,
      });
```

No `failed_action`, no `xero_write_error`, no `xero_write_error_raw`.

**Where your change belongs**: the three error fields are Xero-owned state, not
user-owned, so they go in `xeroOwned` and are therefore applied on **both**
update branches. Do not add them to `locallyOwned`; a Team Calendar authored
record that failed a Xero write must still have its error cleared when Xero
later reports success.

The existing-record lookup already selects `failed_action`, so the information
needed to decide is in hand. It now also selects `source_type` (added by plan
006). Lines 468-490:

```typescript
async function loadExistingRecordsBySourceRemoteId(
  context: SyncXeroLeaveRecordsInput,
  sourceRemoteIds: string[]
) {
  const records = await database.availabilityRecord.findMany({
    where: {
      ...scoped(context),
      source_remote_id: { in: [...new Set(sourceRemoteIds)] },
      source_type: { in: ["xero_leave", "team_calendar_leave"] },
    },
    select: {
      approval_status: true,
      failed_action: true,
      id: true,
      source_remote_hash: true,
      source_remote_id: true,
      source_type: true,
    },
  });
```

### The reconciler is inconsistent across its four branches

`packages/jobs/src/handlers/reconcile-xero-approval-state.ts` lines 362-455.

**Refreshed 2026-08-05**: plan 007 added optimistic concurrency to this handler.
`transitionRecord` now returns a `boolean` indicating whether the transition
actually applied, and every branch reads
`return transitioned ? "<outcome>" : "matched";`. The `data` objects quoted
below are otherwise unchanged, and they remain exactly where your edit belongs.
Preserve the `transitioned` return shape.

Branch 1, approved. **Correct** — clears all three:

```typescript
    await transitionRecord(context, runId, record, {
      action: "availability_records.reconciled_to_approved",
      data: {
        approval_status: "approved",
        approved_at: xero.approvedAt ?? new Date(),
        derived_sequence: { increment: 1 },
        failed_action: null,
        xero_write_error: null,
        xero_write_error_raw: Prisma.DbNull,
      },
```

Branch 2, declined. **Clears `failed_action` only.** Note the guard admits
records in `xero_sync_failed`, which by definition have the error fields set:

```typescript
  if (
    xero.status === "REJECTED" &&
    (record.approval_status === "submitted" ||
      (record.approval_status === "xero_sync_failed" &&
        record.failed_action === "decline"))
  ) {
    await transitionRecord(context, runId, record, {
      action: "availability_records.reconciled_to_declined",
      data: {
        approval_note: "Declined in Xero Payroll",
        approval_status: "declined",
        derived_sequence: { increment: 1 },
        failed_action: null,
      },
```

Branch 3, withdrawn after a failed withdraw. **Correct** — clears all three:

```typescript
      data: {
        approval_status: "withdrawn",
        derived_sequence: { increment: 1 },
        failed_action: null,
        withdrawn_at: new Date(),
        xero_write_error: null,
        xero_write_error_raw: Prisma.DbNull,
      },
```

Branch 4, withdrawn or deleted in Xero. **Clears none of the three:**

```typescript
  if (
    (xero.status === "WITHDRAWN" || xero.status === "DELETED") &&
    record.approval_status !== "withdrawn" &&
    record.approval_status !== "xero_sync_failed"
  ) {
    await transitionRecord(context, runId, record, {
      action: "availability_records.reconciled_to_withdrawn",
      data: {
        approval_status: "withdrawn",
        derived_sequence: { increment: 1 },
        withdrawn_at: new Date(),
      },
```

Branch 4's guard excludes `xero_sync_failed`, so in the common case there is
nothing to clear. It is included here for consistency, not because a concrete
stale-data path through it has been demonstrated. Treat it as defence in depth:
the invariant should be "any transition to a settled status clears the write
error fields", enforced uniformly rather than reasoned about per branch.

### The correct pattern already exists in the codebase

`packages/availability/src/approvals/approval-service.ts` lines 566-573, the
revert-to-submitted path, is the exemplar to match:

```typescript
          approval_note:
            record.failed_action === "decline" ? null : record.approval_note,
          ...
          failed_action: null,
          ...
          xero_write_error: null,
```

## Commands you will need

All run from the repo root.

```
bun install                # run first if you hit "Cannot find module '@repo/observability/log'"
bun run check              # Biome/Ultracite lint (check mode)
bun run typecheck          # tsc --noEmit across the monorepo
bun run test               # Vitest across the monorepo
bunx vitest run packages/jobs/src/handlers/sync-xero-leave-records.test.ts
bunx vitest run packages/jobs/src/handlers/reconcile-xero-approval-state.test.ts
```

> If a test or typecheck fails with `Cannot find module
> '@repo/observability/log'`, that is a stale local `node_modules` symlink, not
> a repository defect. Run `bun install` once and retry.

## Scope

**In scope:**

- `packages/jobs/src/handlers/sync-xero-leave-records.ts`
- `packages/jobs/src/handlers/sync-xero-leave-records.test.ts`
- `packages/jobs/src/handlers/reconcile-xero-approval-state.ts`
- `packages/jobs/src/handlers/reconcile-xero-approval-state.test.ts`

**Explicitly out of scope:**

- The database schema. No migration is needed; all three columns already exist
  and are nullable.
- Any change to the `failed_action === "withdraw"` special case in
  `processLeaveRecord`. It is correct.
- Any change to the reconciler's *guards* (which records each branch matches).
  This plan changes only what each branch writes. Changing the guards is plan
  007's territory.
- Any user-facing copy, any service in `packages/availability`, any UI.
- A backfill migration for records already carrying stale values. See
  "Maintenance notes".

## Git workflow

```
git checkout -b fix/clear-stale-xero-write-errors
```

Commit message:

```
fix(jobs): clear stale Xero write errors when a record leaves the failed state
```

Do not push or open a pull request unless the user asks.

## Steps

### Step 1: Establish the baseline

```
bun run check
bun run typecheck
bun run test
```

**Expected**: all three exit 0. Record the total test count. If any fails
before you have changed anything, go to STOP conditions.

### Step 2: Clear the error fields in inbound sync

Edit `packages/jobs/src/handlers/sync-xero-leave-records.ts`.

Immediately after the `approvalStatusToPersist` block (which ends at line 587,
the closing brace of the `if`), add the derived clearing values. Then spread
them into `data`.

```typescript
    // The write-error fields describe the last failed outbound write and are
    // only meaningful while the record sits in xero_sync_failed. Any status
    // Xero reports that settles the record must clear them, or the UI keeps
    // showing a sync failure on a record that is fine. The one exception is the
    // failed-withdraw case handled above, which deliberately stays in the
    // failed state.
    const clearedWriteError =
      approvalStatusToPersist === "xero_sync_failed"
        ? {}
        : {
            failed_action: null,
            xero_write_error: null,
            xero_write_error_raw: Prisma.DbNull,
          };

    const data = {
      all_day: normalised.allDay,
      approval_status: approvalStatusToPersist,
      ...clearedWriteError,
      archived_at: normalised.publishStatus === "archived" ? new Date() : null,
      // ... every other existing field unchanged
    };
```

Keep every other property of `data` exactly as it is, in the same order.

Then fix the in-memory map update a few lines below so the cached
`failed_action` matches what was written. Current code:

```typescript
      existingRecordsBySourceRemoteId.set(normalised.sourceRemoteId, {
        approval_status: approvalStatusToPersist,
        failed_action: existing?.failed_action ?? null,
        id: recordId,
        source_remote_hash: normalised.sourceRemoteHash,
        source_remote_id: normalised.sourceRemoteId,
      });
```

becomes:

```typescript
      existingRecordsBySourceRemoteId.set(normalised.sourceRemoteId, {
        approval_status: approvalStatusToPersist,
        failed_action:
          approvalStatusToPersist === "xero_sync_failed"
            ? (existing?.failed_action ?? null)
            : null,
        id: recordId,
        source_remote_hash: normalised.sourceRemoteHash,
        source_remote_id: normalised.sourceRemoteId,
      });
```

**`Prisma` import**: check whether the file already imports `Prisma` from
`@repo/database/generated/client`. If not, add it, matching the import style
used in `packages/jobs/src/handlers/reconcile-xero-approval-state.ts`. Verify
with:

```
grep -n "^import\|Prisma" packages/jobs/src/handlers/sync-xero-leave-records.ts | head -20
```

**Verify**:

```
bun run typecheck
```

**Expected**: exits 0.

### Step 3: Clear the error fields in the reconciler's decline branch

Edit `packages/jobs/src/handlers/reconcile-xero-approval-state.ts`. In the
`xero.status === "REJECTED"` branch (line 399), extend the `data` object:

```typescript
      data: {
        approval_note: "Declined in Xero Payroll",
        approval_status: "declined",
        derived_sequence: { increment: 1 },
        failed_action: null,
        xero_write_error: null,
        xero_write_error_raw: Prisma.DbNull,
      },
```

This now matches branches 1 and 3 exactly.

### Step 4: Clear the error fields in the reconciler's withdraw branch

In the same file, the final branch (line 441), extend the `data` object:

```typescript
      data: {
        approval_status: "withdrawn",
        derived_sequence: { increment: 1 },
        failed_action: null,
        withdrawn_at: new Date(),
        xero_write_error: null,
        xero_write_error_raw: Prisma.DbNull,
      },
```

All four branches now write the same three clearing fields.

**Verify** the uniformity:

```
grep -c "xero_write_error_raw: Prisma.DbNull" packages/jobs/src/handlers/reconcile-xero-approval-state.ts
```

**Expected**: `4`.

```
bun run typecheck
bun run check
```

**Expected**: both exit 0.

### Step 5: Test the inbound sync behaviour

Extend `packages/jobs/src/handlers/sync-xero-leave-records.test.ts`. Read the
whole file first and match its existing mock setup, fixture builders and naming
exactly. This repo uses `vi.hoisted` for mock handles plus `vi.mock` module
factories; do not introduce a different mocking style.

Add three cases:

1. **Settling status clears the fields.** An existing record with
   `approval_status: "xero_sync_failed"` and `failed_action: "approve"`, where
   the Xero payload maps to `approved`. Assert the `updateMany` call receives
   `data` containing `failed_action: null`, `xero_write_error: null` and
   `xero_write_error_raw: Prisma.DbNull`, and `approval_status: "approved"`.
2. **The failed-withdraw special case still holds.** An existing record with
   `approval_status: "xero_sync_failed"` and `failed_action: "withdraw"`, where
   the Xero payload maps to `approved`. Assert the `data` has
   `approval_status: "xero_sync_failed"` and does **not** contain
   `failed_action`, `xero_write_error` or `xero_write_error_raw` keys at all.
   This is the regression test that protects the exception; without it, a later
   simplification will delete it.
3. **A create is unaffected.** A leave record with no existing local row still
   goes through `create` and the created row has no error fields set.

### Step 6: Test the reconciler branches

Extend `packages/jobs/src/handlers/reconcile-xero-approval-state.test.ts`,
again matching the existing file's conventions.

Add two cases:

1. **Decline branch clears the error fields.** A record in `xero_sync_failed`
   with `failed_action: "decline"`, Xero status `REJECTED`. Assert the
   `updateMany` `data` includes `xero_write_error: null` and
   `xero_write_error_raw: Prisma.DbNull` alongside the existing
   `approval_status: "declined"` and `failed_action: null`.
2. **Withdraw branch clears the error fields.** A record in `approved`, Xero
   status `WITHDRAWN`. Assert the `data` includes `failed_action: null`,
   `xero_write_error: null` and `xero_write_error_raw: Prisma.DbNull`.

**Verify**:

```
bunx vitest run packages/jobs/src/handlers/sync-xero-leave-records.test.ts
bunx vitest run packages/jobs/src/handlers/reconcile-xero-approval-state.test.ts
```

**Expected**: both pass, including the five new cases.

### Step 7: Full verification

```
bun run check
bun run typecheck
bun run test
```

**Expected**: all exit 0, with at least five more tests than the Step 1
baseline.

## Test plan

| File | New tests |
|---|---|
| `packages/jobs/src/handlers/sync-xero-leave-records.test.ts` | 3: settling status clears the three fields; failed-withdraw exception preserved; create path unaffected |
| `packages/jobs/src/handlers/reconcile-xero-approval-state.test.ts` | 2: decline branch clears the fields; withdraw branch clears the fields |

Test 2 in the sync file is the one that matters most in the long run. The
failed-withdraw exception is the only reason `processLeaveRecord` cannot simply
always clear the fields, and it is not obvious from reading the code why it
exists. Pin it.

Use existing fixture builders from the test files rather than raw literals, per
`CLAUDE.md`. If neither file has one, add a small local builder in the test
file rather than a new shared module.

## Done criteria

All of the following, verbatim:

1. `bun run check` exits 0.
2. `bun run typecheck` exits 0.
3. `bun run test` exits 0 with at least five more tests than the Step 1
   baseline.
4. `grep -c "xero_write_error_raw: Prisma.DbNull" packages/jobs/src/handlers/reconcile-xero-approval-state.ts`
   prints `4`.
5. `grep -c "xero_write_error" packages/jobs/src/handlers/sync-xero-leave-records.ts`
   prints `2` or more (the `clearedWriteError` object).
6. `grep -n "approvalStatusToPersist = \"xero_sync_failed\"" packages/jobs/src/handlers/sync-xero-leave-records.ts`
   still matches, confirming the failed-withdraw exception survived.
7. `git diff --name-only` lists exactly the four files in the "In scope" list
   (or fewer, if a test file needed no change).

## STOP conditions

Stop and report back rather than improvising if any of these occur:

- **The baseline in Step 1 is not green.** Report what fails; change nothing.
- **`sync-xero-leave-records.test.ts` or `reconcile-xero-approval-state.test.ts`
  does not exist.** Both should. If one is missing, report it: creating a test
  file for a job handler from scratch is a larger task than this plan assumes,
  and you would be inventing the mock harness rather than following one.
- **An existing test asserts that `failed_action` survives a settling
  transition.** That would mean the current behaviour is deliberate and
  documented somewhere this plan did not find. Report the test verbatim and
  stop rather than deleting it.
- **You find a fourth site that moves a record out of `xero_sync_failed`
  without clearing the fields.** Report it; do not expand the diff beyond the
  two files in scope without saying so.

## Maintenance notes

- **The invariant to hold in review**: any write that sets `approval_status` to
  something other than `xero_sync_failed` must also null `failed_action`,
  `xero_write_error` and `xero_write_error_raw`. All four reconciler branches
  and both service-layer transition paths now do this. A new transition that
  does not is a bug.
- **Existing rows are not backfilled.** Records that already carry stale error
  fields keep them until the next sync or reconciliation touches them, which
  for active records is within a scheduled cycle. A one-off `UPDATE` clearing
  the fields on every row where `approval_status <> 'xero_sync_failed'` would
  fix the rest, but it is a data migration with no rollback and it is not
  required for correctness going forward. Raise it with the user rather than
  including it here.
- **Interaction with plan 007** (guard reconciler transitions with optimistic
  concurrency): that plan changes the `where` clause of the same `updateMany`
  calls in `transitionRecord`; this plan changes their `data`. They touch
  adjacent lines in the same function. If both are in flight, land 007 first
  and rebase this one, since 007's change is structural and this one is
  additive.
- **The `failed_action === "withdraw"` exception** in `processLeaveRecord` is
  the single carve-out. If withdraw write-back is ever made idempotent or moved
  to a reconciliation-first model, revisit whether the carve-out is still
  needed rather than assuming it.
