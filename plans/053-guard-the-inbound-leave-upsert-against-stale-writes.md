# Plan 053: Stop inbound sync overwriting a newer local approval state

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the next
> step. If anything in "STOP conditions" occurs, stop and report — do not
> improvise. When done, update this plan's row in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 121da2a..HEAD -- packages/jobs/src/handlers/sync-xero-leave-records.ts`
> If the file changed, compare the "Current state" excerpt against the live code
> before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: MED
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `121da2a`, 2026-08-12

## Why this matters

This is the **only** path in the codebase that mutates `availability_records`
without an optimistic-concurrency guard. Every other transition — the approval
state machine and the approval reconciler — commits with a `where` clause that
pins both `approval_status` and `derived_sequence`.

A leave-records sync run holds a page of results fetched from Xero before a
manager approves a request. When the run reaches its upsert, it writes the stale
Xero status straight over the freshly approved local record. The result is a
record with `approval_status: "submitted"` alongside a populated `approved_at`
and `approved_by_person_id` — a state the state machine cannot produce and does
not know how to interpret. It also silently drops the event from every published
feed, because the projection requires `approval_status: "approved"`.

The column needed to prevent this is already persisted on every write and is
simply never read back.

## Current state

`packages/jobs/src/handlers/sync-xero-leave-records.ts:607-623` builds the
Xero-owned payload, which already includes the timestamp this plan needs:

```ts
const xeroOwned = {
  all_day: normalised.allDay,
  approval_status: approvalStatusToPersist,
  ...clearedWriteError,
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
```

`sync-xero-leave-records.ts:642-645` is the unguarded write:

```ts
await database.availabilityRecord.updateMany({
  data: updateData,
  where: { ...scoped(context), id: recordId },
});
```

Nothing else is in that `where`: no status precondition, no `derived_sequence`,
no comparison against `source_last_modified_at`.

**The pattern to match.** `packages/availability/src/approvals/approval-service.ts:1734-1741`
(`transitionWhere`) and `packages/jobs/src/handlers/reconcile-xero-approval-state.ts:470-478`
both guard on `approval_status` **and** `derived_sequence`. Read `transitionWhere`
before writing this change; the guard style should be recognisably the same.

**Existing partial awareness.** `sync-xero-leave-records.ts:583-589` already
carves out one specific race (a failed `withdraw`), which shows the author was
reasoning about this class of problem but covered only one case of it. Do not
remove that carve-out.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Lint | `bun run check` | exit 0 |
| Typecheck | `bun run typecheck` | exit 0 |
| Unit tests | `bun run test` | exit 0, 17/17 tasks |
| This handler | `cd packages/jobs && bunx vitest run src/handlers/sync-xero-leave-records.test.ts` | all pass |

## Scope

**In scope**:
- `packages/jobs/src/handlers/sync-xero-leave-records.ts`
- `packages/jobs/src/handlers/sync-xero-leave-records.test.ts`

**Out of scope**:
- `packages/availability/src/approvals/approval-service.ts` — read it for the
  pattern, do not modify it.
- `packages/jobs/src/handlers/reconcile-xero-approval-state.ts` — plan 056 owns
  that file. Touching it here will conflict.
- The `parseXeroDate` end-of-day convention — plan 054 owns it.
- Adding a `derived_sequence` bump to the inbound path. Inbound sync is not a
  user-visible transition; do not start incrementing sequences here without an
  explicit decision, since it would churn feed SEQUENCE values.

## Git workflow

- Branch: `advisor/053-guard-inbound-upsert`
- Conventional commits, e.g. `fix(jobs): skip inbound writes older than local state`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add a failing test for the race

In `sync-xero-leave-records.test.ts`, add a case where the existing local record
has a `source_last_modified_at` **newer** than the incoming normalised payload,
and the local `approval_status` is `approved` while the incoming status is
`submitted`. Assert the local record is left unchanged.

Run it and confirm it **fails** today (the local record is overwritten).

**Verify**: `cd packages/jobs && bunx vitest run src/handlers/sync-xero-leave-records.test.ts`
→ the new case fails, showing `submitted` where `approved` was expected.

### Step 2: Make the update conditional on the incoming payload being newer

Extend the `where` at `:642-645` so the write only lands when the incoming
`source_last_modified_at` is strictly newer than the stored one, with an explicit
branch for the case where the stored value is null:

```ts
where: {
  ...scoped(context),
  id: recordId,
  OR: [
    { source_last_modified_at: null },
    { source_last_modified_at: { lt: normalised.sourceLastModifiedAt } },
  ],
},
```

Handle the case where **the incoming** `sourceLastModifiedAt` is null explicitly
— Xero does not always populate `UpdatedDateUTC`. When it is null, fall back to
comparing `source_remote_hash`: if the hash is unchanged, skip; if it differs,
write. Do not silently stop updating records whose payload omits the timestamp.

**Verify**: `bun run typecheck` → exit 0, and the Step 1 test now passes.

### Step 3: Count skipped writes separately from failures

`updateMany` returns `{ count }`. A `count` of 0 now means "a newer local state
won", which is a normal outcome, not an error. Track it as its own counter and
surface it in the sync run summary so the divergence is visible to an operator
rather than invisible.

Do not increment the failure counter for a skip.

**Verify**: `cd packages/jobs && bunx vitest run src/handlers/sync-xero-leave-records.test.ts`
→ all pass, including an assertion that a skipped write reports as skipped and
not as failed.

### Step 4: Confirm the existing carve-out still holds

Re-run the whole handler suite and confirm the failed-`withdraw` carve-out at
`:583-589` still behaves as before. The new guard must not shadow it.

**Verify**: `bun run test` → exit 0, 17/17 tasks.

## Test plan

New cases in `packages/jobs/src/handlers/sync-xero-leave-records.test.ts`,
following the structure of the existing tests in that file:

- newer local state wins: incoming older `source_last_modified_at`, local record
  unchanged, skip counted
- incoming newer payload wins: record updated as today
- incoming `source_last_modified_at` is null and the hash is unchanged → skip
- incoming `source_last_modified_at` is null and the hash differs → write
- stored `source_last_modified_at` is null → write (first sync of an existing row)
- the failed-`withdraw` carve-out is unaffected

Verification: `bun run test` → exit 0, with at least 5 new tests.

## Done criteria

ALL must hold:

- [ ] `bun run check` exits 0
- [ ] `bun run typecheck` exits 0
- [ ] `bun run test` exits 0, 17/17 tasks, with at least 5 new tests
- [ ] `grep -A8 'availabilityRecord.updateMany' packages/jobs/src/handlers/sync-xero-leave-records.ts`
      shows `source_last_modified_at` inside the `where`
- [ ] Reverting only the Step 2 guard makes the Step 1 test fail (mutation check;
      restore afterwards)
- [ ] The sync run summary reports skipped writes distinctly from failures
- [ ] `git status --short` lists only the two in-scope files
- [ ] `plans/README.md` row updated

## STOP conditions

Stop and report if:

- The live Xero payloads in `source_payload_json` show `UpdatedDateUTC` is
  routinely absent or non-monotonic. The timestamp guard is then unsafe as the
  primary mechanism and the hash comparison must lead instead; report before
  choosing.
- The fix appears to require touching `approval-service.ts` or the reconciler.
- The Step 1 test passes before the fix — that means the race is already guarded
  somewhere you have not found, and this plan's premise is wrong.

## Maintenance notes

- Anyone adding a new field to `xeroOwned` should ask whether Xero really owns
  it. The `locallyOwned` split at `:628-632` exists because plan 006 found the
  same class of problem with privacy fields.
- A reviewer should check that the skip path cannot mask a genuine sync failure:
  skipped and failed must remain distinguishable in the run summary.
- Plan 056 changes the neighbouring reconciler. If both are in flight, land this
  one first — it is the smaller diff and the reconciler already has its guard.
