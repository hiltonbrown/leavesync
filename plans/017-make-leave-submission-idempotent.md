# Plan 017: Stop leave submission creating duplicate leave applications in Xero

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report, do not improvise. When done, update this plan's status row in
> `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 75202db..HEAD -- packages/availability/src/plans/submit-service.ts packages/xero/src/au/write.ts packages/xero/src/rate-limit/xero-fetch.ts packages/database/prisma/schema.prisma`
> If any changed since this plan was written, re-check the "Current state"
> facts before proceeding.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: correctness
- **Planned at**: commit `75202db`, 2026-07-25
- **Reconciled**: 2026-08-05 against `2095b1f`. Finding confirmed still present:
  `packages/availability/src/plans/submit-service.ts` has no idempotency key and
  no unique constraint guarding a concurrent second submit. The file changed
  slightly since this plan was written (an 11-line diff in the notification
  path), so re-read it before editing.
  `packages/xero/src/au/write.ts`, `packages/xero/src/rate-limit/xero-fetch.ts`
  and `packages/database/prisma/schema.prisma` are unchanged.

## Why this matters

Submitting leave POSTs a new `LeaveApplication` to Xero. That call creates a
row in the customer's payroll system and Xero's Payroll AU 1.0 API offers no
idempotency key. There are two independent paths in this repo that can fire
that POST more than once for a single user action, and each produces a real
duplicate leave application in the customer's payroll file.

**Path 1: automatic retry of a non-idempotent POST.** `xeroFetch` is the single
choke point for every Xero HTTP call. It retries up to four times on 429, on
any 5xx, and on a thrown network error. For a `GET` that is correct. For the
`POST /LeaveApplications` that creates a leave application it is not: a 502
from a gateway, or a socket reset after Xero accepted the request, means Xero
already created the application and the retry creates a second one. Team
Calendar records only the ID from the last attempt, so the earlier duplicates
are invisible to the product and only surface later when inbound sync pulls
them in as unexplained extra leave.

**Path 2: no claim before the external write.** `performSubmission` reads the
record, checks its status, calls Xero, and only *then* runs the optimistic
concurrency guard. Two concurrent requests for the same record (a double-click,
a retried form post, two browser tabs) both pass the status check, both POST to
Xero, and only then does one lose the guarded update and get told
`invalid_state_for_submit`. The user sees one apparent failure and Xero has two
leave applications. The concurrency guard is in the right shape but in the
wrong place: it protects the database row, not the payroll system.

The consequence is the same for both: an employee is recorded as taking leave
twice, their Xero balance is drawn down twice, and a manager has two
approvals to action. Correcting it requires manual intervention in Xero. This
is the most expensive class of defect this product can produce, because the
damage lands outside the system and cannot be repaired by fixing the code.

Approve, decline and withdraw are not affected in the same way. They POST to
`/LeaveApplications/{id}/approve` or `/reject`, which target an existing
application: a duplicate call fails with a conflict rather than creating
anything. Only submission creates.

## Current state

### `xeroFetch` retries every request, including creating POSTs

`packages/xero/src/rate-limit/xero-fetch.ts` lines 3-7:

```typescript
// Default reactive-retry budget for transient failures (429 and 5xx). The first
// attempt is the real call; the rest are backed-off retries.
const DEFAULT_MAX_ATTEMPTS = 4;
const BACKOFF_BASE_MS = 500;
const BACKOFF_CAP_MS = 8000;
```

Lines 15-25 define the input type:

```typescript
export interface XeroFetchInput {
  init?: RequestInit;
  // Reactive-retry attempts including the first call. Defaults to
  // DEFAULT_MAX_ATTEMPTS. Pass 1 to disable inline retry (used where the caller
  // owns retry semantics, e.g. the per-employee balance loop).
  maxAttempts?: number;
  // Identity the limiter buckets are keyed by. Built from the connected
  // organisation so one org cannot starve another.
  orgKey: string;
  url: string;
}
```

Lines 74-106 are the retry loop:

```typescript
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const gate = await limiter.acquire(input.orgKey);
    if (!gate.ok) {
      return rateLimitedResponse(gate.reason);
    }

    let response: Response;
    try {
      response = await fetchImpl(input.url, input.init);
    } catch (error) {
      gate.release();
      if (attempt < maxAttempts) {
        await sleep(backoffMs(attempt));
        continue;
      }
      throw error;
    }
    gate.release();

    if (attempt < maxAttempts && isTransientStatus(response.status)) {
      const retryAfterMs =
        response.status === 429
          ? parseRetryAfter(response.headers.get("Retry-After"))
          : null;
      // Drain the discarded response so the underlying connection can be reused
      // rather than leaked while we back off.
      await cancelBody(response);
      await sleep(retryAfterMs ?? backoffMs(attempt));
      continue;
    }

    return response;
  }
```

And lines 121-123:

```typescript
function isTransientStatus(status: number): boolean {
  return status === 429 || (status >= 500 && status < 600);
}
```

Note the asymmetry that matters: a **429 is safe to retry** because Xero
rejected the request before processing it. A **5xx or a thrown network error is
not**, because the request may have been fully processed and only the response
lost.

### The submit POST has no idempotency key

`packages/xero/src/au/write.ts` lines 32-58:

```typescript
export async function submitLeaveApplication(
  input: SubmitLeaveApplicationInput
): Promise<
  XeroWriteResult<{ rawResponse: unknown; xeroLeaveApplicationId: string }>
> {
  const payload = {
    LeaveApplications: [
      {
        EmployeeID: input.xeroEmployeeId,
        EndDate: dateOnly(input.endsAt),
        LeavePeriods: [
          {
            NumberOfUnits: input.units,
          },
        ],
        LeaveTypeID: input.xeroLeaveTypeId,
        StartDate: dateOnly(input.startsAt),
        Title: input.title ?? "Leave request",
      },
    ],
  };

  const response = await xeroRequest(input.xeroTenant, {
    body: payload,
    method: "POST",
    path: "/payroll.xro/1.0/LeaveApplications",
  });
```

`xeroRequest` (same file, lines 141-190) is the shared helper for all four
write operations, and it calls `xeroFetch` without a `maxAttempts` override,
so the default budget of 4 applies:

```typescript
    const response = await xeroFetch({
      init: {
        body: request.body ? JSON.stringify(request.body) : undefined,
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${decryptedAccessToken}`,
          "Content-Type": "application/json",
          "Xero-Tenant-Id": xeroTenant.xero_tenant_id,
        },
        method: request.method,
      },
      orgKey: orgRateLimitKey({
        clerkOrgId: xeroTenant.clerk_org_id,
        organisationId: xeroTenant.organisation_id,
```

NZ and UK are stubs. `packages/xero/src/nz/write.ts` lines 19-26:

```typescript
export function submitLeaveApplication(
  _input: SubmitLeaveApplicationInput
): Promise<
  XeroWriteResult<{ rawResponse: unknown; xeroLeaveApplicationId: string }>
> {
  // TODO(nz-payroll): implement NZ payroll leave write-back.
  return Promise.resolve({ ok: false, error: writeBackNotAvailableError });
}
```

`packages/xero/src/uk/write.ts` is identical in shape. **Only the AU
implementation needs changing.**

### The concurrency guard runs after the Xero write

`packages/availability/src/plans/submit-service.ts` lines 273-359. The three
phases in order:

```typescript
  try {
    const authorised = await loadAndAuthorise(parsed.data, "manager_allowed");
    if (!authorised.ok) {
      return authorised;
    }
    const record = authorised.value;

    if (
      record.source_type !== "team_calendar_leave" ||
      record.approval_status !== options.validStatus ||
      (options.validStatus === "xero_sync_failed" &&
        record.failed_action !== "submit")
    ) {
      return invalidState(options.invalidStateCode);
    }
```

then the external write:

```typescript
    const submission = await externalWritePort.submitLeaveApplication({
      endsAt: record.ends_at,
      startsAt: record.starts_at,
      title: record.title ?? undefined,
      units: prepared.value.units,
      employeeId: prepared.value.xeroEmployeeId,
      leaveTypeId: prepared.value.xeroLeaveTypeId,
      clerkOrgId: parsed.data.clerkOrgId,
      organisationId: parsed.data.organisationId,
    });
```

and only then the guard:

```typescript
    await database.$transaction(async (tx) => {
      const update = await tx.availabilityRecord.updateMany({
        data: {
          approval_status: "submitted",
          derived_sequence: { increment: 1 },
          failed_action: null,
          source_payload_json: toPrismaJsonValue(submission.value.rawResponse),
          source_remote_id: submission.value.remoteId,
          submitted_at: new Date(),
          updated_by_user_id: parsed.data.actingUserId,
          xero_write_error: null,
          xero_write_error_raw: Prisma.DbNull,
        },
        where: {
          ...scoped(parsed.data),
          approval_status: options.validStatus,
          derived_sequence: record.derived_sequence,
          id: record.id,
        },
      });
      if (update.count !== 1) {
        throw new OptimisticConflictError();
      }
```

`performSubmission` serves two entry points, both of which reach the same POST:

```typescript
export async function submitDraftRecord(
  input: RecordActionInput,
  externalWritePort: ExternalWritePort
): Promise<Result<AvailabilityRecord, SubmitServiceError>> {
  return await performSubmission(input, externalWritePort, {
    failureAuditAction: "availability_records.submission_failed",
    invalidStateCode: "invalid_state_for_submit",
    successAuditAction: "availability_records.submitted",
    validStatus: "draft",
  });
}

export async function retrySubmission(
  input: RecordActionInput,
  externalWritePort: ExternalWritePort
): Promise<Result<AvailabilityRecord, SubmitServiceError>> {
  return await performSubmission(input, externalWritePort, {
    failureAuditAction: "availability_records.submission_retry_failed",
    invalidStateCode: "invalid_state_for_retry",
    successAuditAction: "availability_records.submission_retry_succeeded",
    validStatus: "xero_sync_failed",
  });
}
```

### The failure path also guards on `derived_sequence`

`persistXeroFailure` (line 446) uses the same guard shape at lines 472-478:

```typescript
      where: {
        ...scoped(input.input),
        approval_status: input.expectedStatus,
        derived_sequence: input.record.derived_sequence,
        id: input.record.id,
      },
```

This matters for the design below: **the claim must not change
`derived_sequence`**, or the failure path's guard will stop matching.
`derived_sequence` is also the source of the published ICS `SEQUENCE`
(`packages/feeds/src/projection/feed-projection.ts:191` reads
`record.publication?.published_sequence ?? record.derived_sequence`), so
incrementing it for bookkeeping would spuriously bump the sequence number
published to every subscriber's calendar. Do not use it as a lock.

### The schema has no field to claim with

`packages/database/prisma/schema.prisma` lines 560-598 define
`AvailabilityRecord`. There is no in-flight, lock, or claim column. The
existing timestamp columns (`submitted_at`, `withdrawn_at`, `approved_at`) all
carry business meaning and must not be repurposed.

## Design

Two changes, independent of each other, both required.

**Change A: stop retrying non-idempotent requests on ambiguous failures.** Add
an opt-out to `xeroFetch` so a caller can say "this request creates something;
retry it only when Xero definitively rejected it". Retry on 429 stays (safe),
retry on 5xx and on thrown network errors goes away for write requests.

**Change B: claim the record before calling Xero.** Add a nullable
`xero_write_claimed_at` column. `performSubmission` atomically claims the
record before the Xero call and releases the claim on both outcomes. A second
concurrent request fails the claim and returns `invalid_state` **without
touching Xero**. A claim older than a TTL is treated as abandoned so a crashed
process cannot wedge a record forever.

Change B closes the concurrency window. Change A closes the retry window. Doing
only one leaves the other open.

### What this deliberately does not fix

If the process dies between a successful Xero POST and the local update, the
leave application exists in Xero and Team Calendar does not know its ID. After
the claim TTL expires a retry will create a duplicate. Closing that gap
properly requires querying Xero for a matching application before retrying, and
that is a larger piece of work with its own correctness questions (what counts
as "matching" when a user edits dates between attempts).

Related, `packages/xero/src/au/write.ts` lines 70-79 return `unknown_error`
when Xero responds 200 but the response contains no `LeaveApplicationID`:

```typescript
  if (!xeroLeaveApplicationId) {
    return {
      ok: false,
      error: {
        code: "unknown_error",
        message: "Xero did not return a leave application ID.",
        rawPayload: response.value,
      },
    };
  }
```

In that case the application very probably *was* created. The record lands in
`xero_sync_failed` and the product offers a one-click retry that will duplicate
it. Surfacing "check Xero before retrying" for this specific case requires
threading a new distinction through `toPlainLanguageMessage` in
`packages/xero/src/adapter/xero-write-adapter.ts` and through the retry UI.

**Both of these are out of scope for this plan.** Record them in the plan's
status row as follow-ups; do not attempt them here. This plan closes the two
paths that fire on a healthy system every day.

## Commands you will need

All run from the repo root.

```
bun install                # run first if you hit "Cannot find module '@repo/observability/log'"
bun run check              # Biome/Ultracite lint (check mode)
bun run typecheck          # tsc --noEmit across the monorepo
bun run test               # Vitest across the monorepo
bunx vitest run packages/xero/src/rate-limit/xero-fetch.test.ts
bunx vitest run packages/availability/src/plans/submit-service.test.ts
```

Prisma commands (these DO write to the repo, which is expected for the
migration step):

```
cd packages/database && bunx prisma format
cd packages/database && bunx prisma generate
cd packages/database && bunx prisma migrate dev --name add_xero_write_claim
```

> If a test or typecheck fails with `Cannot find module
> '@repo/observability/log'`, that is a stale local `node_modules` symlink, not
> a repository defect. Run `bun install` once and retry.

### Database connection for the migration step

**Use the `DATABASE_URL` already provided in the execution environment's
environment variables.** This plan adds a column and generates a migration, so
Steps 6 and 7 need a reachable database. Do not ask for a connection string, do
not copy one out of a deployment dashboard, and do not write one into a file in
the repository.

Resolve it in this order:

1. `DATABASE_URL` exported in the environment you are running in. Confirm with
   `[ -n "$DATABASE_URL" ] && echo present` (print the check, never the value).
2. If it is not exported, a `.env` or `.env.local` in `packages/database`, which
   Prisma loads automatically. `packages/database/.env.example` documents the
   expected shape.

Only if neither is available does the "No reachable `DATABASE_URL`" STOP
condition apply. Treat the environment variable as the normal path and stopping
as the exception, not the reverse.

The target must be a **disposable or development** database. `prisma migrate
dev` is destructive on drift: it will offer to reset. Never point it at
production, and never run it against a database whose contents you would mind
losing.

## Scope

**In scope:**

- `packages/xero/src/rate-limit/xero-fetch.ts`
- `packages/xero/src/rate-limit/xero-fetch.test.ts`
- `packages/xero/src/au/write.ts`
- `packages/xero/src/au/write.test.ts`
- `packages/database/prisma/schema.prisma` (one new column)
- `packages/database/prisma/migrations/<new>/migration.sql`
- `packages/availability/src/plans/submit-service.ts`
- `packages/availability/src/plans/submit-service.test.ts` (create if absent)

**Explicitly out of scope:**

- `packages/xero/src/nz/write.ts` and `packages/xero/src/uk/write.ts` (stubs;
  they never reach the network)
- `packages/availability/src/approvals/approval-service.ts`. Approve and
  decline have the same write-then-guard ordering but target an existing
  application, so a duplicate call cannot create anything. Leave them alone.
- `packages/xero/src/au/read.ts` and `packages/xero/src/oauth/service.ts`.
  These are reads and token exchanges; the existing retry behaviour is correct
  for them and must not change.
- `toPlainLanguageMessage` and any user-facing copy
- Any UI or server action
- Any change to `derived_sequence` semantics

## Git workflow

```
git checkout -b fix/idempotent-leave-submission
```

Suggested commits, in this order:

```
fix(xero): do not retry creating writes on ambiguous failures
feat(database): add xero_write_claimed_at to availability_records
fix(availability): claim records before writing leave to Xero
```

Do not push or open a pull request unless the user asks.

## Steps

### Step 1: Establish the baseline

```
bun run check
bun run typecheck
bun run test
```

**Expected**: all three exit 0. If any fails before you have changed anything,
go to STOP conditions.

Record the test count from `bun run test` so you can confirm later that you
added tests rather than replaced them.

### Step 2: Add the retry opt-out to `xeroFetch`

Edit `packages/xero/src/rate-limit/xero-fetch.ts`.

Add a field to `XeroFetchInput`, keeping the existing comment style (comments
in this file explain *why*, not *what*):

```typescript
export interface XeroFetchInput {
  init?: RequestInit;
  // Reactive-retry attempts including the first call. Defaults to
  // DEFAULT_MAX_ATTEMPTS. Pass 1 to disable inline retry (used where the caller
  // owns retry semantics, e.g. the per-employee balance loop).
  maxAttempts?: number;
  // Identity the limiter buckets are keyed by. Built from the connected
  // organisation so one org cannot starve another.
  orgKey: string;
  // Set false for requests that create something in Xero. A 429 is still
  // retried because Xero rejected the request before processing it, but a 5xx
  // or a dropped connection is ambiguous: Xero may have completed the write and
  // only the response was lost. Retrying then creates a duplicate leave
  // application in the customer's payroll file, which cannot be repaired from
  // this side.
  retryOnAmbiguousFailure?: boolean;
  url: string;
}
```

In the body of `xeroFetch`, read the flag alongside the other defaults:

```typescript
  const maxAttempts = input.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const retryOnAmbiguousFailure = input.retryOnAmbiguousFailure ?? true;
```

Change the thrown-error branch so an ambiguous network failure is not retried:

```typescript
    } catch (error) {
      gate.release();
      if (attempt < maxAttempts && retryOnAmbiguousFailure) {
        await sleep(backoffMs(attempt));
        continue;
      }
      throw error;
    }
```

And change the transient-status branch so only 429 is retried when the flag is
off:

```typescript
    const retryableStatus = retryOnAmbiguousFailure
      ? isTransientStatus(response.status)
      : response.status === 429;

    if (attempt < maxAttempts && retryableStatus) {
      const retryAfterMs =
        response.status === 429
          ? parseRetryAfter(response.headers.get("Retry-After"))
          : null;
      // Drain the discarded response so the underlying connection can be reused
      // rather than leaked while we back off.
      await cancelBody(response);
      await sleep(retryAfterMs ?? backoffMs(attempt));
      continue;
    }
```

Leave `isTransientStatus`, `backoffMs`, `parseRetryAfter`,
`rateLimitedResponse` and the limiter interaction exactly as they are.

**Verify**:

```
bun run typecheck
bunx vitest run packages/xero/src/rate-limit/xero-fetch.test.ts
```

**Expected**: typecheck exits 0; the existing xero-fetch tests still pass
unchanged, because the default is `true` and preserves current behaviour.

### Step 3: Test the new retry behaviour

Add tests to `packages/xero/src/rate-limit/xero-fetch.test.ts`, following the
existing tests in that file for structure, mock style and naming. Read the
whole file before adding to it and match what is there.

Add four cases:

1. With `retryOnAmbiguousFailure: false`, a 500 response is returned to the
   caller after **one** fetch call (assert the fetch mock was called once, and
   the returned status is 500).
2. With `retryOnAmbiguousFailure: false`, a 429 response **is** retried, and a
   subsequent 200 is returned (assert two fetch calls, status 200).
3. With `retryOnAmbiguousFailure: false`, a thrown network error propagates
   after one fetch call (assert the promise rejects and the mock was called
   once).
4. With the flag omitted, a 500 is still retried up to the default budget
   (assert four fetch calls). This pins the default so a future change cannot
   silently flip it.

**Verify**:

```
bunx vitest run packages/xero/src/rate-limit/xero-fetch.test.ts
```

**Expected**: all tests pass, including the four new ones.

### Step 4: Use the opt-out for AU writes

Edit `packages/xero/src/au/write.ts`. In `xeroRequest` (the shared helper at
line 141), pass the flag to the `xeroFetch` call:

```typescript
    const response = await xeroFetch({
      init: {
        body: request.body ? JSON.stringify(request.body) : undefined,
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${decryptedAccessToken}`,
          "Content-Type": "application/json",
          "Xero-Tenant-Id": xeroTenant.xero_tenant_id,
        },
        method: request.method,
      },
      orgKey: orgRateLimitKey({
        clerkOrgId: xeroTenant.clerk_org_id,
        organisationId: xeroTenant.organisation_id,
      }),
      // Every request through this helper mutates payroll state. See the field
      // comment in xero-fetch.ts: an ambiguous failure must surface to the user
      // rather than be retried into a duplicate.
      retryOnAmbiguousFailure: false,
      url: ...,
    });
```

Keep the rest of the call site byte-for-byte as it was, including the `url`
expression, which this excerpt truncates. Read the real lines before editing.

**Verify**:

```
bun run typecheck
bunx vitest run packages/xero/src/au/write.test.ts
```

**Expected**: typecheck exits 0. The existing write tests pass. If a write test
asserted retry-on-5xx behaviour it will now fail; that assertion encoded the
bug, so update it to assert a single attempt and note the change in your
report.

### Step 5: Add the claim column to the schema

Edit `packages/database/prisma/schema.prisma`. In the `AvailabilityRecord`
model, add one nullable column next to the other write-error fields (currently
lines 592-593, `xero_write_error` and `xero_write_error_raw`):

```prisma
  xero_write_error         String?
  xero_write_error_raw     Json?
  // Set immediately before an outbound Xero write and cleared once the write
  // has been recorded. A second request that finds a live claim stops before
  // calling Xero, because the create endpoint has no idempotency key and a
  // duplicate call creates a duplicate leave application in payroll. Claims
  // older than the TTL in submit-service.ts are treated as abandoned so a
  // crashed process cannot wedge a record permanently.
  xero_write_claimed_at    DateTime?
```

Then format and generate:

```
cd packages/database && bunx prisma format && bunx prisma generate
```

**Expected**: both exit 0, and `git diff packages/database/prisma/schema.prisma`
shows only the added column plus any alignment reflow `prisma format` applies
to that model.

### Step 6: Create the migration

```
cd packages/database && bunx prisma migrate dev --name add_xero_write_claim
```

**Expected**: a new directory
`packages/database/prisma/migrations/<timestamp>_add_xero_write_claim/` with a
`migration.sql` containing one statement of the form:

```sql
-- AlterTable
ALTER TABLE "availability_records" ADD COLUMN "xero_write_claimed_at" TIMESTAMP(3);
```

Read the generated file and confirm it contains **only** that. Never hand-edit
a generated migration; if it contains anything else, go to STOP conditions.

This requires a reachable `DATABASE_URL`. Use the one in the execution
environment's environment variables, as described under "Database connection for
the migration step". Stop and report only if that variable is genuinely absent
and `packages/database` carries no `.env`; never invent a connection string.

**Verify** the schema and migrations agree:

```
cd packages/database && bunx prisma migrate diff \
  --from-config-datasource \
  --to-schema prisma/schema.prisma \
  --script
```

**Expected**: output containing `This is an empty migration` (this is the same
check CI runs).

### Step 7: Claim the record before the Xero write

Edit `packages/availability/src/plans/submit-service.ts`.

Add the TTL near the top of the file, below the existing schema constant:

```typescript
// How long a claim on an outbound Xero write stays live. Long enough to cover
// the full xeroFetch budget (rate-limiter wait plus backed-off retries) with
// headroom, short enough that a process that dies mid-write does not lock the
// record out of retry indefinitely.
const XERO_WRITE_CLAIM_TTL_MS = 2 * 60 * 1000;
```

Add two helpers below `loadBareRecord`:

```typescript
// Atomically take the write claim. Returns false when another request already
// holds a live claim, in which case the caller must not call Xero. The status
// and derived_sequence predicates keep this consistent with the guarded update
// that follows; the claim itself never changes derived_sequence, because that
// value is published as the ICS SEQUENCE and is the optimistic-concurrency key
// for the failure path.
async function claimXeroWrite(
  input: RecordActionInput,
  record: LoadedRecord,
  expectedStatus: availability_approval_status
): Promise<boolean> {
  const staleBefore = new Date(Date.now() - XERO_WRITE_CLAIM_TTL_MS);
  const claim = await database.availabilityRecord.updateMany({
    data: { xero_write_claimed_at: new Date() },
    where: {
      ...scoped(input),
      approval_status: expectedStatus,
      derived_sequence: record.derived_sequence,
      id: record.id,
      OR: [
        { xero_write_claimed_at: null },
        { xero_write_claimed_at: { lt: staleBefore } },
      ],
    },
  });
  return claim.count === 1;
}

// Clear the claim. Best-effort: the record may legitimately no longer match
// (for example the success path already moved it to submitted and cleared the
// claim in the same transaction), and an uncleared claim self-heals after the
// TTL.
async function releaseXeroWrite(
  input: RecordActionInput,
  record: LoadedRecord
): Promise<void> {
  await database.availabilityRecord.updateMany({
    data: { xero_write_claimed_at: null },
    where: { ...scoped(input), id: record.id },
  });
}
```

In `performSubmission`, insert the claim between `prepareXeroWrite` and the
Xero call, and release it on every exit path after that point. The existing
code from line 298 becomes:

```typescript
    const prepared = await prepareXeroWrite(
      parsed.data,
      record,
      externalWritePort
    );
    if (!prepared.ok) {
      return prepared;
    }

    // Claim before calling Xero, not after. The guarded update further down
    // protects the database row, but by the time it runs the leave application
    // already exists in payroll. Xero's create endpoint has no idempotency key,
    // so two concurrent submissions would create two applications and only one
    // would be recorded here.
    const claimed = await claimXeroWrite(
      parsed.data,
      record,
      options.validStatus
    );
    if (!claimed) {
      return invalidState(options.invalidStateCode);
    }

    let submission: Awaited<
      ReturnType<ExternalWritePort["submitLeaveApplication"]>
    >;
    try {
      submission = await externalWritePort.submitLeaveApplication({
        endsAt: record.ends_at,
        startsAt: record.starts_at,
        title: record.title ?? undefined,
        units: prepared.value.units,
        employeeId: prepared.value.xeroEmployeeId,
        leaveTypeId: prepared.value.xeroLeaveTypeId,
        clerkOrgId: parsed.data.clerkOrgId,
        organisationId: parsed.data.organisationId,
      });
    } catch (error) {
      await releaseXeroWrite(parsed.data, record);
      throw error;
    }

    if (!submission.ok) {
      await releaseXeroWrite(parsed.data, record);
      return await persistXeroFailure({
        actionUrl: `/plans?recordId=${record.id}`,
        auditAction: options.failureAuditAction,
        expectedStatus: options.validStatus,
        input: parsed.data,
        record,
        error: submission.error,
        failedAction: "submit",
      });
    }
```

Then add the claim clear to the success transaction's `data` object, so the
release happens atomically with the transition rather than as a second write:

```typescript
        data: {
          approval_status: "submitted",
          derived_sequence: { increment: 1 },
          failed_action: null,
          source_payload_json: toPrismaJsonValue(submission.value.rawResponse),
          source_remote_id: submission.value.remoteId,
          submitted_at: new Date(),
          updated_by_user_id: parsed.data.actingUserId,
          xero_write_claimed_at: null,
          xero_write_error: null,
          xero_write_error_raw: Prisma.DbNull,
        },
```

Finally, handle the case where the guarded update itself loses the race. In the
`catch` block at the end of `performSubmission`, release the claim before
mapping the error:

```typescript
  } catch (error) {
    if (error instanceof OptimisticConflictError) {
      await releaseXeroWrite(parsed.data, record);
      return invalidState(options.invalidStateCode);
    }
    return unknownError("Failed to submit this record.");
  }
```

**Note**: `record` is declared inside the `try` block in the current code, so it
is not in scope in the `catch`. Hoist the declaration above the `try` (declare
`let record: LoadedRecord | null = null` before it and assign inside), or move
the release into the transaction's own error handling. Choose whichever keeps
the diff smaller and reads more naturally with the surrounding code; do not
change any other control flow.

Also clear the claim in `persistXeroFailure`'s update `data`, so the failure
transition and the release are one write:

```typescript
      data: {
        approval_status: "xero_sync_failed",
        failed_action: input.failedAction,
        updated_by_user_id: input.input.actingUserId,
        xero_write_claimed_at: null,
        xero_write_error: plainMessage,
        xero_write_error_raw: {
```

If you do that, the explicit `releaseXeroWrite` call before
`persistXeroFailure` becomes redundant. Remove it rather than leaving both.

**Verify**:

```
bun run typecheck
bun run check
```

**Expected**: both exit 0.

### Step 8: Test the claim

Add tests for `performSubmission`'s claim behaviour. If
`packages/availability/src/plans/submit-service.test.ts` exists, extend it and
match its existing mock setup exactly. If it does not, create it modelled on an
existing service test in the same package that mocks `@repo/database` (find one
with `ls packages/availability/src/**/*.test.ts` and read it first; this repo
uses `vi.hoisted` for mock handles plus `vi.mock` module factories).

Cover:

1. **Happy path unchanged**: a `draft` record with no claim submits
   successfully, `submitLeaveApplication` is called once, and the final update
   sets `xero_write_claimed_at: null`.
2. **Live claim blocks the write**: when the claim `updateMany` returns
   `count: 0`, `performSubmission` returns the `invalid_state_for_submit` error
   and `submitLeaveApplication` is **never called**. This is the assertion that
   proves the fix; it is the most important test in the plan.
3. **Stale claim is reclaimable**: assert the claim `where` clause includes an
   `OR` with a `lt` predicate on `xero_write_claimed_at`, so a claim older than
   the TTL does not permanently block retry. Assert on the argument passed to
   the mocked `updateMany`.
4. **Xero failure releases the claim**: when `submitLeaveApplication` returns
   `ok: false`, the record ends in `xero_sync_failed` with
   `xero_write_claimed_at: null`.
5. **A thrown Xero error releases the claim**: when
   `submitLeaveApplication` rejects, the claim is cleared and the error
   surfaces as `unknown_error`.
6. **Retry path claims too**: `retrySubmission` on an `xero_sync_failed` record
   with a live claim also returns invalid state without calling Xero.

**Verify**:

```
bunx vitest run packages/availability/src/plans/submit-service.test.ts
```

**Expected**: all tests pass.

### Step 9: Full verification

```
bun run check
bun run typecheck
bun run test
```

**Expected**: all exit 0, and the total test count is higher than the baseline
recorded in Step 1 by at least ten.

## Test plan

Summarised from Steps 3 and 8. New tests, all co-located next to the file they
cover, per the repo convention:

| File | Tests |
|---|---|
| `packages/xero/src/rate-limit/xero-fetch.test.ts` | 4: no-retry on 5xx and on network error with the flag off; 429 still retried with the flag off; default still retries 5xx |
| `packages/availability/src/plans/submit-service.test.ts` | 6: happy path, blocked by live claim (no Xero call), stale claim reclaimable, failure releases claim, throw releases claim, retry path claims |

Use factories or builders for record fixtures rather than repeated raw
literals, as `CLAUDE.md` requires. If the availability package already has a
record builder, use it; if not, add a small local one in the test file rather
than a new shared module.

## Done criteria

All of the following, verbatim:

1. `bun run check` exits 0.
2. `bun run typecheck` exits 0.
3. `bun run test` exits 0 with at least ten more tests than the Step 1
   baseline.
4. `grep -c "retryOnAmbiguousFailure" packages/xero/src/rate-limit/xero-fetch.ts`
   prints `4` or more (interface field, default read, both branch uses).
5. `grep -c "retryOnAmbiguousFailure: false" packages/xero/src/au/write.ts`
   prints `1`.
6. `grep -c "xero_write_claimed_at" packages/database/prisma/schema.prisma`
   prints `1`.
7. `cd packages/database && bunx prisma migrate diff --from-config-datasource
   --to-schema prisma/schema.prisma --script` reports an empty migration.
8. In `packages/availability/src/plans/submit-service.ts`, `claimXeroWrite` is
   called before `externalWritePort.submitLeaveApplication`. Verify with:
   `grep -n "claimXeroWrite\|submitLeaveApplication" packages/availability/src/plans/submit-service.ts`
   and confirm the claim line number is lower.
9. `git diff --name-only` lists only files from the "In scope" list, plus the
   one new migration directory.

## STOP conditions

Stop and report back rather than improvising if any of these occur:

- **The baseline in Step 1 is not green.** Fix nothing; report what fails.
- **`prisma migrate dev` generates anything beyond the single `ALTER TABLE ADD
  COLUMN`.** That means the schema has drifted from the migrations and this
  plan's migration would carry unrelated changes. Report the generated SQL.
- **No reachable `DATABASE_URL`.** Check the environment variables first: this
  plan expects to use the `DATABASE_URL` already present there, and a
  `packages/database/.env` is the documented fallback. Only when neither exists
  can the migration not be generated. Report and stop at that point; do not
  fabricate a connection string or hand-write the migration directory.
- **An existing test in `packages/xero/src/au/write.test.ts` asserts that a 5xx
  is retried.** Updating it is correct (that assertion encodes the bug), but
  say so explicitly in your report rather than quietly changing it.
- **You find that `performSubmission` is called from a code path that already
  holds a database transaction.** The claim uses its own connection and would
  deadlock or see stale state inside an outer transaction. Report the call path
  instead of restructuring it.
- **The claim TTL turns out to be shorter than the worst-case `xeroFetch`
  duration.** With the current constants the retry budget is bounded by roughly
  0.5s + 1s + 2s of backoff plus the limiter wait, well inside two minutes. If
  you change `BACKOFF_CAP_MS` or `DEFAULT_MAX_ATTEMPTS`, or the limiter can
  block for longer than that, report it rather than guessing a new TTL.

## Maintenance notes

- **The claim must always be released.** Any new early return added between the
  claim and the final transaction leaks a claim for up to the TTL. In review,
  treat a new `return` inside that window as a bug unless it clears
  `xero_write_claimed_at`. The atomic clears inside the two transactions are
  the safe pattern; prefer extending those to adding another explicit release.
- **Do not reuse `derived_sequence` as a lock.** It is published as the ICS
  `SEQUENCE` (`packages/feeds/src/projection/feed-projection.ts:191`) and is the
  optimistic-concurrency key in `persistXeroFailure`. Incrementing it for
  bookkeeping changes what subscribers' calendar clients see.
- **When NZ or UK write-back is implemented** (`packages/xero/src/nz/write.ts`
  and `uk/write.ts` are currently stubs; see plan 037), their request helpers
  must pass `retryOnAmbiguousFailure: false` for the same reason. This is easy
  to miss because the AU helper sets it in a shared private function that the
  new region files will not inherit.
- **`retryOnAmbiguousFailure` defaults to `true`** so reads and token exchanges
  keep their current, correct behaviour. Any future caller that creates
  something in Xero must opt out explicitly. A grep for `xeroFetch({` is the
  review check.
- **Two known gaps remain open** and are deliberately not addressed here: a
  crash between a successful POST and the local update, and the 200-without-ID
  response at `packages/xero/src/au/write.ts:70-79`. Both require querying Xero
  for an existing matching application before retrying. If duplicate leave
  applications are still reported after this plan lands, that is the next thing
  to build, not a regression in this work.
