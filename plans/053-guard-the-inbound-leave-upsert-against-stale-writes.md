# Plan 053: Prevent stale inbound leave snapshots overwriting newer state

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report. Do not improvise. When done, update this plan's row in
> `plans/README.md`, unless a reviewer has said they maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat 206af7b..HEAD -- packages/jobs/src/handlers/sync-xero-leave-records.ts packages/jobs/src/handlers/sync-xero-leave-records.test.ts packages/jobs/src/handlers/sync-xero-leave-records.integration.test.ts`
> If an in-scope file changed, compare the "Current state" excerpts with the
> live code. Stop if the record snapshot, normalisation, update, or count
> contracts no longer match this plan.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: plan 075 (`075-remove-the-committed-xero-debug-harness.md`)
- **Category**: bug
- **Planned at**: commit `206af7b`, 2026-08-23
- **Covers finding**: C-02
- **Review status**: DONE on 2026-08-24 as `6a5e9d0`. Implementation commit
  `27b739b` on `advisor/053-guard-inbound-upsert-v2` was independently reviewed
  and approved.

## Execution outcome

- **Worktree**: `/tmp/teamcalendar-plan-053`
- **Branch**: `advisor/053-guard-inbound-upsert-v2`
- **Commit**: `27b739b` (`fix(jobs): reject stale inbound leave snapshots`)
- **Merge**: `6a5e9d0` (`merge: guard inbound leave upserts`)
- **Scope**: exactly the three in-scope source and test files; worktree clean.
- **Independent verification**: targeted unit 20/20; targeted database
  integration 8/8; `bun run check` checked 767 files; typecheck 19/19 tasks;
  unit suite 17/17 tasks; integration 5/5 tasks, including jobs 27/27; build
  4/4 tasks; `git diff --check` passed. Two credential-gated external Xero
  tests remained skipped and were unrelated to this plan.
- **Verdict**: APPROVE. The stale-remote and concurrent-local-write windows are
  both guarded and proven by meaningful database tests.

## Why this matters

The inbound leave handler fetches a remote snapshot, loads the matching local
records, and then updates each row without pinning the state it read. A manager
can approve, decline, withdraw, or otherwise update a record while that work is
in flight. The stale inbound write can then restore an older Xero status while
leaving local approval metadata populated, producing a state the approval
machine never creates and removing an approved event from feeds.

There are two separate race windows to close:

1. a local change can happen after the sync run starts but before the handler
   loads its database snapshot;
2. a local change can happen after that snapshot is loaded but before
   `updateMany` executes.

Remote freshness checks address the first window. A database compare-and-swap
against the loaded row addresses the second. Either mechanism on its own is
incomplete.

## Current state

`packages/jobs/src/handlers/sync-xero-leave-records.ts:132-166` records a
`startedAt` value before the remote read, then fetches all AU leave pages before
loading matching local records:

```ts
const context = parsed.data;
const startedAt = new Date();
// ...
const leaveRecordsResult = await fetchLeaveRecordsForRegion(
  xeroTenant.payroll_region,
  { xeroTenant }
);
```

For every batch, `:209-217` loads existing records only after the remote
snapshot has been fetched.

`loadExistingRecordsBySourceRemoteId` at `:473-499` does not select the fields
needed for freshness or optimistic concurrency:

```ts
select: {
  approval_status: true,
  failed_action: true,
  id: true,
  source_remote_hash: true,
  source_remote_id: true,
  source_type: true,
},
```

The normaliser already provides both remote freshness signals at `:617-632`:

```ts
const xeroOwned = {
  approval_status: approvalStatusToPersist,
  // ...
  source_last_modified_at: normalised.sourceLastModifiedAt,
  source_payload_json: toPrismaJsonValue(normalised.rawPayload),
  source_remote_hash: normalised.sourceRemoteHash,
  updated_at: new Date(),
};
```

The write at `:646-655` is unconditional once the row ID is known:

```ts
await database.availabilityRecord.updateMany({
  data: updateData,
  where: { ...scoped(context), id: recordId },
});
```

The return value is ignored. The handler updates its in-memory snapshot,
materialises a publication, and increments `counts.upserted` even if a future
guard makes `updateMany` return `{ count: 0 }`.

The compare-and-swap pattern to match is
`packages/availability/src/approvals/approval-service.ts:1734-1740`:

```ts
return {
  ...scoped(input),
  approval_status: record.approval_status,
  derived_sequence: record.derived_sequence,
  id: record.id,
};
```

The approval reconciler uses the same guard and treats a zero-row update as a
normal stale-snapshot skip at
`packages/jobs/src/handlers/reconcile-xero-approval-state.ts:480-498`.

The existing failed-withdraw carve-out at
`sync-xero-leave-records.ts:592-599` is load-bearing and must remain intact.

## Required update contract

For an existing record, classify the remote snapshot before writing:

- if the local row's `updated_at` is later than the sync run's `startedAt`, skip
  the inbound write because the local row changed after this run began;
- if both remote timestamps exist and the incoming
  `source_last_modified_at` is earlier than the stored value, skip it;
- if the remote timestamps are equal and the remote hashes are equal, skip the
  duplicate snapshot;
- if the incoming timestamp is null and the hashes are equal, skip the
  duplicate snapshot;
- if the incoming timestamp is null but the hash changed, allow the guarded
  update but retain the existing non-null `source_last_modified_at` rather than
  erasing the only ordering marker;
- otherwise attempt the update through a compare-and-swap that pins the loaded
  `approval_status`, `derived_sequence`, `updated_at`,
  `source_last_modified_at`, and `source_remote_hash` as well as both tenant
   scopes and the record ID.

An update count of zero is a normal stale-snapshot skip. It is not a database
failure. A skipped write must not mutate the in-memory snapshot, materialise a
publication, enqueue a feed rebuild, or increment `upserted`.

Creates remain unchanged. Do not add a `derived_sequence` increment to inbound
sync.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Targeted unit tests | `cd packages/jobs && bunx vitest run src/handlers/sync-xero-leave-records.test.ts` | all tests pass |
| Targeted integration | `cd packages/jobs && bunx vitest run src/handlers/sync-xero-leave-records.integration.test.ts` | database cases run and pass, not skipped |
| Check | `bun run check` | exit 0 |
| Typecheck | `bun run typecheck` | exit 0 |
| Unit suite | `bun run test` | exit 0 |
| Integration suite | `bun run test:integration` | exit 0 with database tests executed |
| Build | `bun run build` | exit 0 |

The targeted unit baseline was 17 passing tests across this handler and the
balance handler when the plan was reconciled. Do not encode a repository-wide
test-count total in assertions or done criteria because workspace counts change.

## Scope

**In scope**:

- `packages/jobs/src/handlers/sync-xero-leave-records.ts`
- `packages/jobs/src/handlers/sync-xero-leave-records.test.ts`
- `packages/jobs/src/handlers/sync-xero-leave-records.integration.test.ts`
- `plans/README.md` for the final status update only

**Out of scope**:

- `packages/availability/src/approvals/approval-service.ts`, read it for the
  compare-and-swap pattern but do not modify it
- `packages/jobs/src/handlers/reconcile-xero-approval-state.ts`, its stale guard
  is already correct
- `packages/availability/src/sync/inbound-leave-normaliser.ts`, its stable hash
  and remote timestamp contract already provide the required inputs
- stale-record archival and balance paging, owned by Plans 090 and 091
- date-only end semantics, owned by plan 054
- changes to feed UID or `derived_sequence`
- any schema or migration change

## Git workflow

- Suggested branch: `advisor/053-guard-inbound-upsert`
- Use a conventional commit such as
  `fix(jobs): reject stale inbound leave snapshots`.
- Do not push or open a pull request unless explicitly instructed.

## Steps

### Step 1: Add explicit outcomes and the missing snapshot fields

1. Replace the current `ProcessedLeaveRecord | null` ambiguity with an explicit
   internal outcome that distinguishes `applied`, `skipped`, and `failed`.
   Carry `changed`, `personId`, and `sourceRemoteId` only where downstream work
   needs them.
2. Extend the existing-record selection with:
   `derived_sequence`, `source_last_modified_at`, and `updated_at`.
3. Pass the run's existing `startedAt` value into `processLeaveRecord`. Do not
   create a separate time after the Xero fetch, because that would miss local
   writes that occurred while remote pages were being read.
4. Update the outer loop so:
   - `applied` increments `upserted` and can contribute a changed person;
   - `skipped` increments `skipped` only;
   - `failed` increments `failed` only.

**Verify**:

- `bun run typecheck` exits 0
- targeted unit tests still pass before new race assertions are added

### Step 2: Add a pure remote-freshness decision

1. Add a small private helper in the handler that compares the loaded row,
   normalised remote record, and run start time according to "Required update
   contract" above.
2. Return a reason code for skips, such as `local_changed_after_run_started`,
   `older_remote_snapshot`, or `duplicate_remote_snapshot`. Use it only in a
   structured `log.info` entry with record and tenant identifiers. Do not log
   the raw payload.
3. When the incoming timestamp is null and the changed hash is allowed through,
   set `source_last_modified_at` in `updateData` to the stored timestamp. Never
   replace a known timestamp with null.
4. Keep the failed-withdraw status carve-out before constructing the final
   Xero-owned data, as it is today.

**Verify**: targeted unit tests cover each decision branch and pass.

### Step 3: Add the database compare-and-swap

1. Extend the existing `updateMany.where` with the loaded snapshot's:
   `approval_status`, `derived_sequence`, `updated_at`,
   `source_last_modified_at`, and `source_remote_hash`.
2. Keep `...scoped(context)` and `id` in the predicate. Every snapshot and scope
   predicate is part of the guard, not optional diagnostics.
3. Inspect `updateMany.count`:
   - `1` means the update applied;
   - `0` means another write won, so return `skipped`;
   - any thrown database error follows the existing failed-record path.
4. Only after count `1`, update `existingRecordsBySourceRemoteId`, materialise
   the publication, and return `applied`.
5. Do not reload and retry a zero-row update in this run. Retrying with a fresh
   snapshot would risk reapplying the stale remote state that the guard rejected.

**Verify**: the unit race test makes the mock return `{ count: 0 }`, then proves
`skipped: 1`, `upserted: 0`, no failed record, no publication materialisation,
and no feed rebuild.

### Step 4: Add database-level race coverage

In `sync-xero-leave-records.integration.test.ts`:

1. Add a stale-source case with an existing record whose
   `source_last_modified_at` is newer than the incoming Xero fixture. Assert the
   local status, timestamp, hash, and approval metadata remain unchanged, and
   the result counts one skip.
2. Add a real compare-and-swap race. Spy on the first
   `database.availabilityRecord.findMany` used to load existing records, call
   the original query, update the same row's `approval_status`,
   `derived_sequence`, and `updated_at` before returning the stale rows to the
   handler, then let the handler continue. Assert its guarded `updateMany`
   affects zero rows and the concurrent state survives.
3. Restore the spy in `finally` or test cleanup so later integration cases use
   the real client.
4. Keep the fixture IDs and cleanup scoped to this file. Do not introduce a new
   UUID prefix.

**Verify**:

`cd packages/jobs && bunx vitest run src/handlers/sync-xero-leave-records.integration.test.ts`
exits 0 and the database-backed suite is not skipped.

### Step 5: Preserve existing behaviour and run all gates

Add or retain unit coverage for:

- a current, changed remote snapshot updates normally;
- a create still succeeds and materialises once;
- an equal timestamp with a different hash may update through the guard;
- a null incoming timestamp with an unchanged hash skips;
- a null incoming timestamp with a changed hash applies without erasing a known
  stored timestamp;
- a Team Calendar sourced record still preserves its local title/privacy/feed
  fields when a current Xero snapshot applies;
- the failed-withdraw carve-out still retains `xero_sync_failed` and its error
  fields;
- every query and update includes both Clerk Organisation and Organisation
  scope.

Then run, in order:

1. `bun run check`
2. `bun run typecheck`
3. `bun run test`
4. `bun run test:integration`
5. `bun run build`
6. `git diff --check`

Every command must exit 0. Review the final diff before updating the plan index.

## Test plan

Use `sync-xero-leave-records.test.ts` for branch and count behaviour. Use the
existing real-database structure in
`sync-xero-leave-records.integration.test.ts:68-309` for persistence and
compare-and-swap proof.

Required assertions:

| Case | Expected result |
|---|---|
| Local row changed after run start | skip, no inbound write |
| Incoming remote timestamp is older | skip, no inbound write |
| Equal timestamp and equal hash | duplicate skip |
| Null incoming timestamp, equal hash | duplicate skip |
| Null incoming timestamp, changed hash | guarded update, stored timestamp retained |
| Snapshot changes after `findMany` | CAS count zero, concurrent state survives |
| Current changed remote snapshot | one upsert and one materialisation |
| CAS throws | failed record and `failed` count, not `skipped` |
| Failed withdrawal | existing carve-out unchanged |
| Cross-tenant record with same remote ID | never selected or updated |

## Done criteria

- [x] `loadExistingRecordsBySourceRemoteId` selects `derived_sequence`,
      `source_last_modified_at`, and `updated_at`.
- [x] The update predicate pins both tenant scopes, ID, approval status,
      sequence, local update time, remote timestamp, and remote hash.
- [x] A zero-row update increments `skipped`, not `failed` or `upserted`.
- [x] A skipped update does not mutate the in-memory snapshot, materialise a
      publication, or enqueue a feed rebuild.
- [x] Known remote timestamps are never overwritten with null.
- [x] Unit and database-backed tests prove both race windows.
- [x] Existing create, current-update, tenant-isolation, local-field, and
      failed-withdraw cases pass.
- [x] `bun run check`, `bun run typecheck`, `bun run test`,
      `bun run test:integration`, `bun run build`, and `git diff --check` exit 0.
- [x] Before the plan-index update, only the three in-scope source/test files
      are modified; afterwards only `plans/README.md` is additionally modified.
- [x] `plans/README.md` is updated to `DONE` with date, commit, and verification
      evidence.

## STOP conditions

Stop and report if:

- `UpdatedDateUTC` proves routinely non-monotonic in available fixtures or live
  evidence. Keep the local compare-and-swap, but do not invent a new remote
  ordering rule without review.
- product or test evidence requires an unchanged remote snapshot to rewrite
  Xero-sourced person defaults on every poll. That behaviour conflicts with a
  clean duplicate skip and needs an explicit local-only update contract.
- the ORM cannot express nullable snapshot equality for
  `source_last_modified_at` or `source_remote_hash` in the guarded
  `updateMany`.
- the database-backed race cannot be injected without changing production
  exports or adding a test-only production hook.
- the fix requires a schema migration, approval-service change, or reconciler
  change.
- a mandatory integration test is skipped because `DATABASE_URL` is absent.
- any mandatory gate fails twice after a reasonable correction.

## Maintenance notes

- Any future field added to `xeroOwned` must participate in the same freshness
  decision. Do not add a second unguarded update path around this helper.
- `derived_sequence` remains a local publication/transition sequence. Inbound
  sync observes it in the compare-and-swap but does not increment it.
- Plan 090 changes the archive half of this handler. Preserve this update guard
  verbatim when executing it.
- Plans 100–109 add regional readers/rollout and depend on these stale-write and
  bounded-loop contracts remaining region-agnostic.
