# Plan 007: Guard reconciler transitions with an optimistic-concurrency predicate

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report, do not improvise. When done, update this plan's status row in
> `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 7821f3a..HEAD -- packages/jobs/src/handlers/reconcile-xero-approval-state.ts packages/availability/src/approvals/approval-service.ts`
> If either changed since this plan was written, compare the "Current state"
> excerpts against the live code before proceeding. On a mismatch, treat it as a
> STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `7821f3a`, 2026-08-05 (refreshed after the shared
  tenant-scoping helper replaced the local helper, and after confirming the
  handler interface must explicitly carry the already-loaded sequence)
- **Execution status**: BLOCKED on 2026-08-05. Isolated implementation passes
  typecheck and the four focused regression tests, but the required root unit
  test gate fails before app tests load because installed `react` and
  `react-dom` patch versions differ. The root lint gate also reports pre-existing
  diagnostics outside this plan's scope. Resolve the verification baseline and
  rerun the full gate before accepting the change.

## Why this matters

The Xero approval-state reconciler reads every active leave record into memory
up front, then walks that snapshot one record at a time, issuing a Xero HTTP
call per record with a pause between batches. For a tenant with many active
records the run takes minutes to hours, so by the time a later record is
written, the snapshot the decision was based on can be badly out of date.

The write itself has no concurrency guard. It updates by `id` alone, so it
applies unconditionally regardless of what happened to the record in the
meantime.

The concrete failure: the reconciler snapshots record R as `submitted`. The
employee then withdraws R, which moves it to `withdrawn` locally and rejects it
in Xero. Minutes later the reconciler reaches R, fetches the Xero status
`REJECTED`, matches the stale `submitted` branch, and overwrites the withdrawal
with `approval_status: "declined"` and `approval_note: "Declined in Xero
Payroll"`, then sends the employee a "Leave declined" notification. The person's
own withdrawal has been silently converted into a manager decline, with an audit
event asserting it.

Every other transition in this codebase already guards against exactly this. The
approval service pins both `approval_status` and `derived_sequence` in its update
predicate. The reconciler is the outlier.

## Current state

### Relevant files

- `packages/jobs/src/handlers/reconcile-xero-approval-state.ts` — the snapshot
  read (line 226), the per-record loop (line 274), the decision function
  `reconcileRecord` (line 371), the unguarded `transitionRecord` (line 458) and
  the unguarded `archiveMissing` (line 486).
- `packages/availability/src/approvals/approval-service.ts` — contains the
  correct guarded predicate, `transitionWhere` (line 1585). Use it as the
  reference shape.
- `packages/jobs/src/handlers/reconcile-xero-approval-state.integration.test.ts`
  — existing integration coverage for this handler.

### The snapshot is read once, up front

`packages/jobs/src/handlers/reconcile-xero-approval-state.ts:226-244`:

```typescript
    const records = await database.availabilityRecord.findMany({
      where: {
        ...scoped(context),
        archived_at: null,
        approval_status: { in: [...ACTIVE_STATUSES] },
        source_remote_id: { not: null },
      },
      include: {
        person: {
          select: {
            clerk_user_id: true,
            first_name: true,
            id: true,
            last_name: true,
            manager: { select: { clerk_user_id: true, id: true } },
          },
        },
      },
      orderBy: { created_at: "asc" },
    });
```

Because this uses `include` with no `select`, every scalar column is loaded,
including `approval_status` and `derived_sequence`. The narrower
`ReconciliationRecord` interface currently omits `derived_sequence`; add
`derived_sequence: number` to that interface before using it in the guarded
predicate. Do not widen the query.

### The decision branches on the stale snapshot

`packages/jobs/src/handlers/reconcile-xero-approval-state.ts:393-410` is the
branch that produces the reported failure:

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
      notificationType: "leave_declined",
      xeroLeaveApplicationId: xero.xeroLeaveApplicationId,
    });
    return "declined";
  }
```

There are four such branches in `reconcileRecord` (approved, declined,
withdrawn-from-failed, withdrawn-from-Xero), all calling `transitionRecord`.

### The write has no guard

`packages/jobs/src/handlers/reconcile-xero-approval-state.ts:458-484`:

```typescript
  record: ReconciliationRecord,
  options: {
    action: string;
    data: Record<string, unknown>;
    notificationType: "leave_approved" | "leave_declined" | "leave_withdrawn";
    xeroLeaveApplicationId: string;
  }
) {
  await database.$transaction(async (tx) => {
    await tx.availabilityRecord.updateMany({
      data: options.data,
      where: { ...scoped(context), id: record.id },
    });
    await tx.auditEvent.create({
      data: {
        ...auditBase(context, options.action, runId, record.id),
        payload: {
          runId,
          xeroLeaveApplicationId: options.xeroLeaveApplicationId,
        },
      },
    });
    await notifyRecordOwner(tx, context, record, options.notificationType);
  });
}
```

`archiveMissing` at line 486 has the same unguarded `where`:

```typescript
  await database.$transaction(async (tx) => {
    await tx.availabilityRecord.updateMany({
      data: {
        archived_at: new Date(),
        publish_status: "archived",
      },
      where: { ...scoped(context), id: record.id },
    });
```

### The correct shape, already used in this codebase

`packages/availability/src/approvals/approval-service.ts:1585-1592`:

```typescript
function transitionWhere(input: CommandInput, record: LoadedApprovalRecord) {
  return {
    ...scoped(input),
    approval_status: record.approval_status,
    derived_sequence: record.derived_sequence,
    id: record.id,
  };
}
```

`packages/availability/src/plans/submit-service.ts:222-231` uses the same
pattern.

### Repo conventions that apply here

- Jobs live in `packages/jobs`; inbound operations must be idempotent and safe
  under Inngest retries.
- Record-level failures must not fail the whole run.
- Every tenant-scoped query carries `clerk_org_id` and `organisation_id` via the
  imported `scoped(context)` helper from `@repo/database`.
- Service and handler code returns `Result`; do not throw for expected outcomes.
- Structured logging via `@repo/observability/log`. No `console.log`.
- TypeScript strict mode, no `any`, named exports only.
- Australian English in comments. No em dashes anywhere.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `bun install` | exit 0 |
| Typecheck | `bun run typecheck` | exit 0, no errors |
| Jobs unit tests | `bun --cwd packages/jobs run test` | all pass (integration tests excluded by the package script) |
| Full unit tests | `bun run test` | exit 0 |
| Lint | `bun run check` | exit 0 |

If `bun run typecheck` or `bun run test` fails before you have made any change
with an error mentioning `Cannot find module '@repo/observability/log'`, run
`bun install` first. That error is a stale-install artifact, not a code defect.

## Scope

**In scope** (the only files you may modify):

- `packages/jobs/src/handlers/reconcile-xero-approval-state.ts`
- `packages/jobs/src/handlers/reconcile-xero-approval-state.test.ts` (create if
  absent; note only an `.integration.test.ts` exists today)

**Out of scope** (do NOT touch, even though they look related):

- `packages/availability/src/approvals/approval-service.ts` — it is the
  reference for the correct pattern, not a target.
- The `reconcileRecord` decision branches themselves. Their conditions are
  correct; the problem is that the write does not re-check them. Do not change
  which Xero status maps to which local status.
- The Xero fetch loop, its batching, or the 150ms inter-batch pause.
- `packages/jobs/src/handlers/reconcile-xero-approval-state.integration.test.ts`
  — leave it alone unless it fails, in which case STOP and report.

## Git workflow

- Branch: `advisor/007-reconciler-optimistic-concurrency`
- Conventional commits, one logical change per commit. Example from `git log`:
  `fix(xero): protect rotated refresh token against transaction abort`
- Do NOT push or open a PR unless the operator instructs it.

## Steps

### Step 1: Make `transitionRecord` guard on the snapshot state

First add `derived_sequence: number` to `ReconciliationRecord`. Then change
`transitionRecord` so its `updateMany` predicate pins the values the decision
was based on, and so it does nothing further when the row has moved on. The
snapshot query already supplies this scalar, so no query change is required.

Target shape:

```typescript
  await database.$transaction(async (tx) => {
    const updated = await tx.availabilityRecord.updateMany({
      data: options.data,
      where: {
        ...scoped(context),
        approval_status: record.approval_status,
        derived_sequence: record.derived_sequence,
        id: record.id,
      },
    });

    // The record changed between the snapshot and this write, so the decision
    // that produced options.data was made against stale state. Skip the audit
    // event and the notification; the next reconciliation run re-reads the row.
    if (updated.count !== 1) {
      return false;
    }

    await tx.auditEvent.create({ /* unchanged */ });
    await notifyRecordOwner(tx, context, record, options.notificationType);
    return true;
  });
```

Make `transitionRecord` return the boolean out of the transaction so the caller
can tell whether the transition happened.

The audit event and the notification must both be inside the `count === 1`
guard. Writing an audit event for a transition that did not occur, or telling an
employee their leave was declined when it was not, are the two most visible
symptoms of this bug.

**Verify**: `bun run typecheck` → exit 0.

### Step 2: Report a skipped transition as `matched`, not as a transition

In `reconcileRecord`, each of the four branches currently does:

```typescript
    await transitionRecord(context, runId, record, { /* ... */ });
    return "approved";
```

Change each to use the return value, so a skipped write is not counted as a
completed transition:

```typescript
    const transitioned = await transitionRecord(context, runId, record, { /* ... */ });
    return transitioned ? "approved" : "matched";
```

Apply the same to all four branches, using each branch's own outcome string
(`"approved"`, `"declined"`, `"withdrawn"`, `"withdrawn"`).

`"matched"` is the correct fallback: it means "no action taken this run", which
is exactly what happened. It keeps the run's counts honest and leaves the record
for the next run.

**Verify**: `bun run typecheck` → exit 0.

### Step 3: Apply the same guard to `archiveMissing`

Give `archiveMissing`'s `updateMany` the same predicate:

```typescript
      where: {
        ...scoped(context),
        approval_status: record.approval_status,
        derived_sequence: record.derived_sequence,
        id: record.id,
      },
```

and skip its audit event when `count !== 1`. A record that was legitimately
re-created or re-submitted between the snapshot and the write must not be
archived.

**Verify**: `bun run typecheck` → exit 0.

### Step 4: Log skipped transitions

When a transition is skipped, emit a single `log.info` (not a warning; this is
expected, benign contention) with `clerkOrgId`, `organisationId`, the record id,
the snapshot `approval_status` and the attempted action. Without this, a
persistent conflict is invisible.

Use the logger already imported in this file. Do not add `console.log`.

**Verify**: `grep -n "log\." packages/jobs/src/handlers/reconcile-xero-approval-state.ts`
shows your new call alongside the existing ones.

### Step 5: Add unit tests

Create `packages/jobs/src/handlers/reconcile-xero-approval-state.test.ts` if it
does not exist, following the `vi.hoisted` + `vi.mock` pattern used by
`packages/jobs/src/handlers/sync-xero-leave-records.test.ts`.

Cases:

1. **The regression test**: snapshot record is `submitted`, Xero returns
   `REJECTED`, and the mocked `updateMany` resolves `{ count: 0 }` (simulating
   the row having moved to `withdrawn` in the meantime). Assert that
   `auditEvent.create` was NOT called, that the notification dispatch was NOT
   called, and that the record's outcome is counted as `matched` rather than
   `declined`.
2. Happy path: same setup but `updateMany` resolves `{ count: 1 }`. Assert the
   audit event and the notification WERE created and the outcome is `declined`.
3. Assert the `updateMany` `where` clause contains `approval_status` and
   `derived_sequence` matching the snapshot values, plus `clerk_org_id` and
   `organisation_id`. Use `expect.objectContaining`.
4. `archiveMissing` with `{ count: 0 }`: assert no audit event is written.

**Verify**: `bunx vitest run packages/jobs/src/handlers/reconcile-xero-approval-state.test.ts`
→ 4 tests pass, then `bun --cwd packages/jobs run test` → all package unit
tests pass (the package script excludes `*.integration.test.ts`).

### Step 6: Confirm nothing else regressed

**Verify**: `bun run test` → exit 0, `bun run typecheck` → exit 0, and
`bun run check` → exit 0.

## Test plan

- New tests: 4 cases in a new
  `packages/jobs/src/handlers/reconcile-xero-approval-state.test.ts`.
- Structural pattern to copy:
  `packages/jobs/src/handlers/sync-xero-leave-records.test.ts` for the handler
  mocking style, including how it mocks `database.$transaction` to invoke the
  callback with a stub transaction client.
- The load-bearing assertion: when the guarded `updateMany` matches zero rows,
  no audit event is written and no notification is sent. That is what turns a
  silent data corruption into a no-op.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `bun run typecheck` exits 0
- [ ] `bun run test` exits 0
- [ ] `bun run check` exits 0
- [ ] `grep -c "derived_sequence: record.derived_sequence" packages/jobs/src/handlers/reconcile-xero-approval-state.ts`
      returns 2 (one in `transitionRecord`, one in `archiveMissing`)
- [ ] `grep -n "updated.count !== 1\|count !== 1" packages/jobs/src/handlers/reconcile-xero-approval-state.ts`
      returns at least 2 matches
- [ ] `bunx vitest run packages/jobs/src/handlers/reconcile-xero-approval-state.test.ts`
      passes 4 new test cases
- [ ] `bun --cwd packages/jobs run test` passes (the package's unit-test script
      excludes integration suites that require `DATABASE_URL`)
- [ ] `git status --short` shows only in-scope files modified
- [ ] Status row for plan 007 updated in `plans/README.md`

## STOP conditions

Stop and report back (do not improvise) if:

- `transitionRecord` or `archiveMissing` does not match the excerpts above.
- The snapshot query no longer uses `include` without a scalar-limiting
  `select`, or its result cannot supply `derived_sequence`. Confirm the query
  still loads the scalar before adding it to `ReconciliationRecord`; if it does
  not, report rather than widening the query yourself.
- The existing integration test
  (`reconcile-xero-approval-state.integration.test.ts`) fails after your change.
  It runs against a real Postgres and may not run in your environment at all; if
  it does run and fails, report the failure rather than adjusting the test.
- Making `transitionRecord` return a value causes a type error at a call site
  you did not expect. Confirm the call sites with
  `grep -n "transitionRecord(" packages/jobs/src/handlers/reconcile-xero-approval-state.ts`
  which should return five lines (the definition plus four branches).

## Maintenance notes

- The invariant this establishes: **any write derived from a snapshot must pin
  the snapshot's `approval_status` and `derived_sequence` in its predicate**.
  Three places in the codebase now do this (`approval-service.ts`,
  `submit-service.ts`, and this handler). A fourth writer added later must do
  the same, and a reviewer should treat a bare `where: { id }` on
  `availability_records` as a defect.
- A reviewer should specifically check that the audit event and the notification
  are both inside the `count === 1` branch, not just the `updateMany`.
- What will interact with this: any change that lengthens the reconciler run
  (more records, slower Xero responses) widens the conflict window and makes
  skipped transitions more common. That is safe by design, but if the skip log
  from Step 4 becomes noisy, the right response is to shorten the snapshot
  lifetime (re-read each record immediately before its write), not to remove the
  guard.
- Deliberately deferred: re-reading each record just before its transition would
  close the window almost entirely, at the cost of one extra query per record.
  Given the handler already issues one Xero HTTP call per record, that cost is
  marginal and it is a reasonable follow-up. It is out of scope here because the
  guard alone makes the failure safe, and a smaller change is easier to verify.
