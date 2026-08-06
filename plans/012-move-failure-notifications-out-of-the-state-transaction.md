# Plan 012: Move failure notifications out of the transaction that records Xero write failures

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report, do not improvise. When done, update this plan's status row in
> `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 75202db..HEAD -- packages/availability/src/approvals/approval-service.ts packages/availability/src/plans/submit-service.ts`
> If either changed since this plan was written, compare the "Current state"
> excerpts against the live code before proceeding. On a mismatch, treat it as a
> STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `75202db`, 2026-07-25
- **Reconciled**: 2026-08-05 against `2095b1f`. Finding confirmed still present:
  notification calls still sit inside `database.$transaction` at
  `approval-service.ts:523-524` and `931-955`. Both files changed since this
  plan was written (plans 004, 007 and 017's neighbours), so re-read them before
  editing; the transaction boundaries themselves are unchanged.

## Why this matters

When a Xero write fails, the application records that fact: it moves the record
to `xero_sync_failed`, stores a plain-language `xero_write_error` for display and
the raw payload in `xero_write_error_raw` for admin audit, sets `failed_action`
so the right retry becomes available, and writes an audit event. That state is
what makes the failure recoverable.

All of that happens in a single transaction that also dispatches notifications.
The notification helper throws a `NotificationCreateError` whenever the
notification insert returns a failure, so an expected failure is raised as an
exception inside the transaction, and the whole transaction rolls back.

The result is the worst possible outcome for a failed Xero write: the record
stays `submitted` or `draft`, `xero_write_error` and `failed_action` are never
persisted, the audit event is discarded, and the record does not appear in the
failed-sync queue. The retry and revert actions all require
`approval_status === "xero_sync_failed"` plus a matching `failed_action`, so they
are unreachable. The user sees only the generic "Failed to approve this leave."
and there is no diagnostic trail at all.

The success paths in these same two files already get this right: they notify
*outside* the transaction through best-effort helpers that catch and log. The
failure paths are the only ones that do not, which makes this an inconsistency
to remove rather than a design question to settle.

## Drift warning

**The `## Current state` excerpts here were verified on 2026-08-06 against
`fb9f1cc`, and that verification expires as soon as any earlier plan in the queue
merges. Re-verify immediately before executing.**

This plan runs last of the four that touch the approvals area, at position 14,
and it is the only one that edits two shared files:

- `packages/availability/src/approvals/approval-service.ts` is edited by plan 011
  at position 11 and plan 013 at position 12 before you open it. 013 in
  particular replaces the list query's `include` with an explicit projection and
  adds pagination, so line numbers through the front half of the file will move.
- `packages/availability/src/plans/submit-service.ts` is edited by plan 017 at
  position 8, which adds a claim before the Xero write and touches the same
  `persistXeroFailure` region this plan quotes.

This plan is ordered last deliberately: moving notifications out of the state
transaction is the largest structural change of the four, so it absorbs the
drift rather than creating it for the others. Expect the excerpts to have moved
and re-read both files in full.

Before executing this plan:

1. Re-run the drift check at the top of this file against current `HEAD`, not
   against the commit named in the Status block.
2. Re-read every file quoted under `## Current state` and confirm the excerpts
   still match. Line numbers alone are not enough; check the code shape.
3. Treat a mismatch as a refresh task, not a licence to improvise. Update the
   excerpts, then execute.

## Current state

### Relevant files

- `packages/availability/src/approvals/approval-service.ts` —
  `persistApprovalFailure` (line 922), the throwing `notifyUser` (its
  `NotificationCreateError` throw is at line 1396),
  the existing best-effort helper `notifyApprovalBestEffort` (line 1443) and the
  catch that swallows the detail (line 754).
- `packages/availability/src/plans/submit-service.ts` — `persistXeroFailure`
  (line 446) and the equivalent best-effort helper `notifyManagerBestEffort`
  (line 643).

### The failure transaction in the approval service

`packages/availability/src/approvals/approval-service.ts:930-963`:

```typescript
  const plainMessage = input.error.userMessage;
  await database.$transaction(async (tx) => {
    const update = await tx.availabilityRecord.updateMany({
      data: {
        approval_note: input.approvalNote ?? input.record.approval_note,
        approval_status: "xero_sync_failed",
        failed_action: input.failedAction,
        updated_by_user_id: input.input.actingUserId,
        xero_write_error: plainMessage,
        xero_write_error_raw: { /* ... */ },
      },
      where: transitionWhere(input.input, input.record),
    });
    if (update.count !== 1) {
      throw new OptimisticConflictError();
    }

    await notifyOwnerAndApprover(tx, input.input, input.record, {
      actionUrl: `/leave-approvals?recordId=${input.record.id}`,
    });
    await tx.auditEvent.create({
      data: auditData(input.input, input.auditAction, {
        errorCode: input.error.code,
      }),
    });
  });
```

Note the ordering: the notification runs *before* the audit event, so a
notification failure discards the audit event too.

The `OptimisticConflictError` throw at `update.count !== 1` is deliberate and
correct. Keep it.

### The notification helper throws on an expected failure

`packages/availability/src/approvals/approval-service.ts:1395-1397`:

```typescript
  if (!result.ok) {
    throw new NotificationCreateError();
  }
```

### The catch discards the real error

`packages/availability/src/approvals/approval-service.ts:754-761`:

```typescript
  } catch (error) {
    if (error instanceof OptimisticConflictError) {
      return invalidState(
        options.retry ? "invalid_state_for_retry" : "invalid_state_for_approve"
      );
    }
    return unknownError("Failed to approve this leave.");
  }
```

A `NotificationCreateError` falls through to `unknownError`, so the original
`ProviderWriteError` from Xero is lost.

### The identical shape in the submit service

`packages/availability/src/plans/submit-service.ts:456-495`:

```typescript
  await database.$transaction(async (tx) => {
    const update = await tx.availabilityRecord.updateMany({
      data: { /* xero_sync_failed, failed_action, xero_write_error, ... */ },
      where: {
        ...scoped(input.input),
        approval_status: input.expectedStatus,
        derived_sequence: input.record.derived_sequence,
        id: input.record.id,
      },
    });
    if (update.count !== 1) {
      throw new OptimisticConflictError();
    }

    await notifyOwnerAndManager(
      tx,
      input.input,
      input.record,
      "leave_xero_sync_failed",
      { actionUrl: input.actionUrl }
    );
    await tx.auditEvent.create({
      data: auditData(input.input, input.auditAction, {
        errorCode: input.error.code,
      }),
    });
  });
```

### The correct pattern, already used on the success paths

`packages/availability/src/approvals/approval-service.ts:1444-1472`:

```typescript
async function notifyApprovalBestEffort(
  input: CommandInput,
  record: LoadedApprovalRecord,
  options: {
    actionUrl: string;
    payload?: Record<string, string | number | boolean | null>;
    type: "leave_approved" | "leave_declined";
  }
): Promise<void> {
  try {
    await notifyUser(database, input, record, {
      actionUrl: options.actionUrl,
      payload: options.payload,
      recipientUserId: record.person.clerk_user_id,
      type: options.type,
    });
  } catch (error) {
    logApprovalNotificationFailure(error, input, record, options.type);
  }

  try {
    await notifyManagersIfEnabled(database, input, record, {
      actionUrl: `/leave-approvals?recordId=${record.id}`,
      type: options.type,
    });
  } catch (error) {
    logApprovalNotificationFailure(error, input, record, options.type);
  }
}
```

Note it passes `database` rather than a transaction client, and catches per
recipient so one failure does not suppress the other.

`packages/availability/src/plans/submit-service.ts:645-662` has the equivalent
`notifyManagerBestEffort`.

### Repo conventions that apply here

- Service functions return `Result<T, E>`; do not throw for expected failures.
- Notification logic lives in `packages/notifications`; these services dispatch
  through it.
- Every tenant-scoped write carries `clerk_org_id` and `organisation_id`.
- Structured logging via `@repo/observability/log`. No `console.log`.
- Raw Xero error payloads are stored in `xero_write_error_raw` for admin audit
  only and must never be shown to employees. Preserve that split.
- TypeScript strict mode, no `any`, named exports only.
- Australian English in copy and comments. No em dashes anywhere.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `bun install` | exit 0 |
| Typecheck | `bun run typecheck` | exit 0, no errors |
| Availability tests | `bunx vitest run packages/availability` | all pass |
| Full unit tests | `bun run test` | exit 0 |
| Lint | `bun run check` | exit 0 |

If `bun run typecheck` or `bun run test` fails before you have made any change
with an error mentioning `Cannot find module '@repo/observability/log'`, run
`bun install` first. That error is a stale-install artifact, not a code defect.

## Scope

**In scope** (the only files you may modify):

- `packages/availability/src/approvals/approval-service.ts`
- `packages/availability/src/approvals/approval-service.test.ts`
- `packages/availability/src/plans/submit-service.ts`
- `packages/availability/src/plans/submit-service.test.ts`

**Out of scope** (do NOT touch, even though they look related):

- The `OptimisticConflictError` throw at `update.count !== 1` in either file. It
  is the concurrency guard and must stay inside the transaction.
- `notifyUser`'s throw at line 1396. Other callers rely on it, and the
  best-effort wrappers exist precisely to catch it. Do not change it to return a
  `Result`.
- The success paths and their existing best-effort helpers.
- `packages/notifications` and anything to do with SSE delivery or email
  dispatch.
- The `xero_write_error` / `xero_write_error_raw` split, or the wording of any
  user-facing message.

## Git workflow

- Branch: `advisor/012-failure-notifications-outside-transaction`
- Conventional commits, one logical change per commit. Example from `git log`:
  `fix(availability): withhold xero write errors from peers on the calendar`
- Do NOT push or open a PR unless the operator instructs it.

## Steps

### Step 1: Add a best-effort wrapper for the approval failure notification

In `packages/availability/src/approvals/approval-service.ts`, add a helper
modelled exactly on `notifyApprovalBestEffort` but for the failure notification:

```typescript
async function notifyApprovalFailureBestEffort(
  input: CommandInput,
  record: LoadedApprovalRecord,
  options: { actionUrl: string }
): Promise<void> {
  try {
    await notifyOwnerAndApprover(database, input, record, {
      actionUrl: options.actionUrl,
    });
  } catch (error) {
    logApprovalNotificationFailure(
      error,
      input,
      record,
      "leave_xero_sync_failed"
    );
  }
}
```

Pass `database`, not a transaction client. If
`logApprovalNotificationFailure`'s type parameter does not accept
`"leave_xero_sync_failed"`, widen that parameter's union rather than casting.

**Verify**: `bun run typecheck` → exit 0.

### Step 2: Move the notification out of the approval failure transaction

In `persistApprovalFailure`, remove the `notifyOwnerAndApprover` call from inside
the transaction, leaving the update, the conflict guard, and the audit event.
Then call the new helper after the transaction has committed:

```typescript
  await database.$transaction(async (tx) => {
    const update = await tx.availabilityRecord.updateMany({ /* unchanged */ });
    if (update.count !== 1) {
      throw new OptimisticConflictError();
    }
    await tx.auditEvent.create({ /* unchanged */ });
  });

  // Notifications are at-most-once and must never roll back the failure state.
  // Without the persisted xero_sync_failed status and failed_action, the retry
  // and revert actions are unreachable and the failure has no diagnostic trail.
  await notifyApprovalFailureBestEffort(input.input, input.record, {
    actionUrl: `/leave-approvals?recordId=${input.record.id}`,
  });

  const updated = await loadRecord(input.input);
```

**Verify**: `bun run typecheck` → exit 0.

### Step 3: Do the same in the submit service

In `packages/availability/src/plans/submit-service.ts`, add the equivalent
best-effort wrapper (model it on `notifyManagerBestEffort` at line 645), remove
the `notifyOwnerAndManager` call from inside `persistXeroFailure`'s transaction,
and call the wrapper after the transaction commits.

Keep the `OptimisticConflictError` throw and the audit event inside the
transaction.

**Verify**: `bun run typecheck` → exit 0.

### Step 4: Add regression tests for the approval path

In `packages/availability/src/approvals/approval-service.test.ts`, using the
existing `mocks.dispatchNotification`, add:

1. **The regression test**: a Xero approve write that fails, with
   `dispatchNotification` mocked to return `{ ok: false, ... }`. Assert that
   `availabilityRecord.updateMany` WAS called with
   `data` containing `approval_status: "xero_sync_failed"`, `failed_action`, and
   `xero_write_error`; that `auditEvent.create` WAS called; and that the returned
   `Result` reports the Xero failure rather than a rolled-back state. Before Step
   2 this test fails because the transaction rolls back.
2. The same but with `dispatchNotification` succeeding: assert the state write,
   the audit event, and the notification all happened.
3. Assert the notification is dispatched with the shared `database` client
   rather than a transaction client. If the mock setup makes that hard to observe
   directly, assert instead that the notification call happens after the
   transaction callback has resolved.
4. Assert that a notification failure does not change the returned `Result`
   error code, so the user still sees the Xero error rather than a generic one.

### Step 5: Add the equivalent tests for the submit path

In `packages/availability/src/plans/submit-service.test.ts`, add cases 1 and 2
from Step 4 for `persistXeroFailure` (a failed submit whose notification insert
fails must still persist `xero_sync_failed` and `failed_action: "submit"`).

**Verify**: `bunx vitest run packages/availability` → all pass.

### Step 6: Confirm nothing else regressed

**Verify**: `bun run test` → exit 0, `bun run typecheck` → exit 0, and
`bun run check` → exit 0.

## Test plan

- New tests: 4 cases in `approval-service.test.ts`, 2 in
  `submit-service.test.ts`.
- Structural pattern to copy: the existing Xero-failure tests in
  `approval-service.test.ts`, which already mock
  `approveLeaveApplicationForRegion` to return a failure and assert on the
  persisted state. `mocks.dispatchNotification` is already declared in the
  hoisted mocks at the top of the file.
- The load-bearing assertion: with the notification insert failing, the record
  still reaches `xero_sync_failed` with its `failed_action` and
  `xero_write_error` persisted. That is the difference between a recoverable
  failure and an invisible one.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `bun run typecheck` exits 0
- [ ] `bun run test` exits 0
- [ ] `bun run check` exits 0
- [ ] `grep -n "notifyOwnerAndApprover(tx" packages/availability/src/approvals/approval-service.ts`
      returns no matches
- [ ] `grep -n "notifyOwnerAndManager(\s*tx" packages/availability/src/plans/submit-service.ts`
      returns no matches
- [ ] `bunx vitest run packages/availability` passes with at least 6 new cases
- [ ] `git status --short` shows only the four in-scope files modified
- [ ] Status row for plan 012 updated in `plans/README.md`

## STOP conditions

Stop and report back (do not improvise) if:

- Either transaction body does not match the excerpts above.
- `notifyOwnerAndApprover` or `notifyOwnerAndManager` cannot accept the shared
  `database` client because its parameter type is transaction-specific. Check the
  signature: the success-path helpers already pass `database`, so it should be
  fine. If the types genuinely differ, report it rather than casting.
- Moving the notification out changes the behaviour of a test that asserts
  notifications are rolled back with the transaction. That test encodes the
  current defect; report it by name rather than deleting it.
- `logApprovalNotificationFailure` cannot accept the
  `"leave_xero_sync_failed"` type and widening its union causes errors
  elsewhere.

## Maintenance notes

- The rule this establishes, now applied uniformly across both services:
  **state and audit are transactional; notifications are best-effort and happen
  after commit.** A notification is a side effect that informs a human, and it
  must never be able to undo the record of what happened. Any new
  notify-inside-transaction call should be treated as a defect in review.
- The trade-off accepted here is explicit: notifications become at-most-once. If
  the insert fails, nobody is told, and the failure is logged instead. That is
  already the semantics of every success path in these files, so this change
  makes the behaviour consistent rather than introducing a new risk.
- A reviewer should check that the `OptimisticConflictError` throw and the audit
  event both remain inside their transactions, and that the notification call
  sits after the `await database.$transaction(...)` rather than inside a
  `.then()`.
- What will interact with this: if notification delivery ever becomes something
  users can rely on for compliance (for example, a legal requirement to notify on
  decline), at-most-once stops being acceptable and the right answer is an
  outbox table written inside the transaction and drained by a job, not moving
  the dispatch back inside.
