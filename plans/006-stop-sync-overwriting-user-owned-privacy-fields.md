# Plan 006: Stop the inbound Xero sync overwriting user-owned privacy and feed fields

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report, do not improvise. When done, update this plan's status row in
> `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 7821f3a..HEAD -- packages/jobs/src/handlers/sync-xero-leave-records.ts packages/jobs/src/handlers/sync-xero-leave-records.test.ts`
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
  tenant-scoping helper moved from this handler into `@repo/database`)
- **Execution status**: BLOCKED on 2026-08-05. Isolated implementation
  `f903a8f` passes typecheck, lint and the targeted 9-test handler suite, but
  the required root unit-test gate fails before app tests load because installed
  `react` and `react-dom` patch versions differ. Resolve the dependency baseline
  and rerun the full gate before accepting this change.

## Why this matters

The inbound leave sync writes a fixed set of columns on every run, including
`privacy_mode`, `include_in_feed` and `title`. Two of those are user-owned:
`privacy_mode` is set per record by the person who created it, and
`include_in_feed` reflects a deliberate choice about whether a record appears in
published calendar feeds.

The sync sets `privacy_mode` to `person.default_privacy_mode`, a person-level
default, rather than preserving whatever the record already holds. It also
selects records with `source_type` in `["xero_leave", "team_calendar_leave"]`,
so locally authored records are in the update set even though Xero is not their
source of truth.

The result is a silent privacy regression: someone marks a leave record as
`masked` or `private`, the next scheduled sync resets it to the person default,
and `materialiseSyncedPublication` republishes the record to every subscribed
calendar under the reset privacy mode. Nothing surfaces an error, and the change
is invisible until a colleague sees a detail that was meant to be hidden.

This is a privacy defect on the product's core promise, and the fix is small:
split the write into fields Xero owns and fields the user owns.

## Current state

### Relevant files

- `packages/jobs/src/handlers/sync-xero-leave-records.ts` — contains the
  existing-record loader (line 463), the unconditional write payload (line 590)
  and the update path (line 612).
- `packages/jobs/src/handlers/sync-xero-leave-records.test.ts` — existing
  co-located unit tests; new tests go here. Its database mock now also exposes
  `scopedTo`, which the handler imports as `scoped` from `@repo/database`.
- `packages/availability/src/plans/plan-service.ts` — the user-facing setter
  that this sync currently overwrites (line 544).

### The existing-record loader pulls in locally authored records

`packages/jobs/src/handlers/sync-xero-leave-records.ts:463-488`:

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
    },
  });
```

Note that `source_type` is filtered on but **not selected**, so the update path
downstream cannot currently tell which kind of record it is holding. Step 1
fixes that.

### The write payload sets user-owned fields unconditionally

`packages/jobs/src/handlers/sync-xero-leave-records.ts:588-610`:

```typescript
    const changed =
      existing?.source_remote_hash !== normalised.sourceRemoteHash;
    const data = {
      all_day: normalised.allDay,
      approval_status: approvalStatusToPersist,
      archived_at: normalised.publishStatus === "archived" ? new Date() : null,
      contactability: normalised.contactability,
      derived_uid_key: normalised.derivedUidKey,
      ends_at: normalised.endsAt,
      include_in_feed:
        normalised.includeInFeed && person.include_in_feeds_by_default,
      person_id: normalised.personId,
      privacy_mode: person.default_privacy_mode,
      publish_status: normalised.publishStatus,
      record_type: normalised.recordType,
      source_last_modified_at: normalised.sourceLastModifiedAt,
      source_payload_json: toPrismaJsonValue(normalised.rawPayload),
      source_remote_hash: normalised.sourceRemoteHash,
      starts_at: normalised.startsAt,
      title: normalised.title,
      updated_at: new Date(),
    };
```

`privacy_mode: person.default_privacy_mode` is a person-level default with no
reference to the record's stored value.

### The write runs on every sync regardless of change

`packages/jobs/src/handlers/sync-xero-leave-records.ts:611-624`:

```typescript
    const recordId = existing?.id;
    if (recordId) {
      await database.availabilityRecord.updateMany({
        data,
        where: { ...scoped(context), id: recordId },
      });
      existingRecordsBySourceRemoteId.set(normalised.sourceRemoteId, {
        approval_status: approvalStatusToPersist,
        failed_action: existing?.failed_action ?? null,
        id: recordId,
        source_remote_hash: normalised.sourceRemoteHash,
        source_remote_id: normalised.sourceRemoteId,
      });
```

The `changed` flag computed at line 588 only gates feed-rebuild enqueueing later
in the handler; it does not gate this write.

### The create path is correct and must keep the defaults

`packages/jobs/src/handlers/sync-xero-leave-records.ts:624-636`:

```typescript
    } else {
      const created = await database.availabilityRecord.create({
        data: {
          ...data,
          clerk_org_id: context.clerkOrgId,
          organisation_id: context.organisationId,
          source_remote_id: normalised.sourceRemoteId,
          source_type: normalised.sourceType,
        },
        select: { id: true },
      });
```

For a brand-new record there is no user-set value to preserve, so seeding from
the person defaults is right. Do not change this path.

### What the user sets, and this sync clobbers

`packages/availability/src/plans/plan-service.ts:544`:

```typescript
      ...(patch.privacyMode && { privacy_mode: patch.privacyMode }),
```

### Repo conventions that apply here

- Jobs live in `packages/jobs`; all inbound upserts must be idempotent.
- Record-level failures must not fail the whole sync run. The surrounding
  `try`/`recordFailure`/`continue` structure already does this; preserve it.
- All database access goes through `packages/database`.
- Every tenant-scoped query carries `clerk_org_id` and `organisation_id`. The
  local `scoped(context)` helper does this; keep using it.
- TypeScript strict mode, no `any`, named exports only.
- Australian English in comments. No em dashes anywhere.
- Tests are co-located and use Vitest with `vi.hoisted` mock objects plus
  `vi.mock` module factories. Follow the setup already in
  `packages/jobs/src/handlers/sync-xero-leave-records.test.ts`.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `bun install` | exit 0 |
| Typecheck | `bun run typecheck` | exit 0, no errors |
| Handler tests | `bunx vitest run packages/jobs/src/handlers/sync-xero-leave-records.test.ts` | all pass |
| Jobs tests | `bunx vitest run packages/jobs` | all pass |
| Full unit tests | `bun run test` | exit 0 |
| Lint | `bun run check` | exit 0 |

If `bun run typecheck` or `bun run test` fails before you have made any change
with an error mentioning `Cannot find module '@repo/observability/log'`, run
`bun install` first. That error is a stale-install artifact, not a code defect.

## Scope

**In scope** (the only files you may modify):

- `packages/jobs/src/handlers/sync-xero-leave-records.ts`
- `packages/jobs/src/handlers/sync-xero-leave-records.test.ts`

**Out of scope** (do NOT touch, even though they look related):

- The `create` path at lines 624-636. Seeding a new record from person defaults
  is correct.
- `archiveStaleRecords` and the `complete` flag handling. Those are plan 003's
  territory; if plan 003 has already landed, leave its changes alone.
- `materialiseSyncedPublication` and anything in `packages/feeds`. The
  republication behaviour is correct; this plan fixes the value being published.
- `packages/availability/src/plans/plan-service.ts`. The user-facing setter is
  correct; it is the victim, not the cause.
- The `source_type` filter in `loadExistingRecordsBySourceRemoteId`. Locally
  authored records genuinely can carry a `source_remote_id` once submitted to
  Xero, so they must stay in the result set. The fix is to treat them
  differently, not to exclude them.

## Git workflow

- Branch: `advisor/006-preserve-user-owned-record-fields`
- Conventional commits, one logical change per commit. Example from `git log`:
  `fix(availability): withhold xero write errors from peers on the calendar`
- Do NOT push or open a PR unless the operator instructs it.

## Steps

### Step 1: Select `source_type` on the existing-record loader

In `loadExistingRecordsBySourceRemoteId`, add `source_type: true` to the
`select` block. The update path needs it to decide which fields it may write.

Then update the two `existingRecordsBySourceRemoteId.set(...)` calls in
`processLeaveRecord` (around lines 617 and 636) so the objects they store also
carry `source_type`, keeping the map's value shape consistent with the loader's.
For the create path, the value is `normalised.sourceType`.

**Verify**: `bun run typecheck` → exit 0.

### Step 2: Split the write payload into Xero-owned and locally-owned fields

In `processLeaveRecord`, restructure the `data` object so that the three
user-owned fields are only written when it is safe to do so.

Xero owns, and must always be written: `all_day`, `approval_status`,
`archived_at`, `contactability`, `derived_uid_key`, `ends_at`, `person_id`,
`publish_status`, `record_type`, `source_last_modified_at`,
`source_payload_json`, `source_remote_hash`, `starts_at`, `updated_at`.

The user owns: `privacy_mode`, `include_in_feed`, `title`.

Target shape:

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
```

Keep `const data = { ...xeroOwned, ...locallyOwned }` for the create path so
new records are unchanged.

**Verify**: `bun run typecheck` → exit 0.

### Step 3: Write only the Xero-owned fields when updating a locally authored record

In the update branch (currently line 612), choose the payload based on the
existing record's `source_type`:

```typescript
    const recordId = existing?.id;
    if (recordId) {
      const updateData =
        existing?.source_type === "team_calendar_leave"
          ? xeroOwned
          : { ...xeroOwned, ...locallyOwned };
      await database.availabilityRecord.updateMany({
        data: updateData,
        where: { ...scoped(context), id: recordId },
      });
```

A `xero_leave` record keeps its current behaviour: Xero authored it, so Xero's
title and the person's feed defaults still apply. A `team_calendar_leave` record
keeps whatever the user set.

**Verify**: `bun run typecheck` → exit 0.

### Step 4: Add regression tests

In `packages/jobs/src/handlers/sync-xero-leave-records.test.ts`, following the
existing mocking pattern in that file, add:

1. **The regression test**: an existing record with
   `source_type: "team_calendar_leave"` and a person whose
   `default_privacy_mode` differs from the record's stored value. Run the
   handler and assert the `updateMany` call's `data` contains **no**
   `privacy_mode`, **no** `include_in_feed` and **no** `title` key. Use
   `expect(data).not.toHaveProperty("privacy_mode")` so a future reordering
   cannot make the assertion pass vacuously.
2. Same setup but `source_type: "xero_leave"`. Assert the `updateMany` `data`
   **does** contain `privacy_mode` set to `person.default_privacy_mode`. This
   pins that Xero-sourced records keep their existing behaviour.
3. A record that does not exist yet (create path). Assert the `create` call's
   `data` contains `privacy_mode`, `include_in_feed` and `title`, so new records
   are still seeded from the defaults.
4. Assert that in case 1 the Xero-owned fields (`starts_at`, `ends_at`,
   `approval_status`, `source_remote_hash`) **are** written, so the change
   narrowed the payload without disabling the sync.

**Verify**: `bunx vitest run packages/jobs/src/handlers/sync-xero-leave-records.test.ts`
→ all pass, including the 4 new cases.

### Step 5: Confirm nothing else regressed

**Verify**: `bun run test` → exit 0, `bun run typecheck` → exit 0, and
`bun run check` → exit 0.

## Test plan

- New tests: 4 cases in
  `packages/jobs/src/handlers/sync-xero-leave-records.test.ts`.
- Structural pattern to copy: the `vi.hoisted` + `vi.mock` setup already in that
  file. `packages/jobs/src/handlers/sync-xero-leave-balances.test.ts` is a second
  example of the same shape if you need it.
- The load-bearing assertion: a `team_calendar_leave` record with a non-default
  privacy mode survives a sync run unchanged, while its dates and approval
  status still update from Xero.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `bun run typecheck` exits 0
- [ ] `bun run test` exits 0
- [ ] `bun run check` exits 0
- [ ] `grep -n "source_type: true" packages/jobs/src/handlers/sync-xero-leave-records.ts`
      returns a match inside `loadExistingRecordsBySourceRemoteId`
- [ ] `grep -n "locallyOwned" packages/jobs/src/handlers/sync-xero-leave-records.ts`
      returns at least three matches
- [ ] `bunx vitest run packages/jobs` passes with at least 4 new test cases
- [ ] `git status --short` shows only the two in-scope files modified
- [ ] Status row for plan 006 updated in `plans/README.md`

## STOP conditions

Stop and report back (do not improvise) if:

- The `data` object at `sync-xero-leave-records.ts:590` does not match the
  excerpt above.
- An existing test fails because it asserts that `privacy_mode` is written on
  every update. That test encodes the current defect; report it with its name
  and location rather than deleting it, so a human can confirm the behaviour
  change is intended.
- `source_type` on the loaded record turns out to be a type that is neither
  `"xero_leave"` nor `"team_calendar_leave"`. Confirm the enum with
  `grep -n "source_type" packages/database/prisma/schema.prisma`. If there are
  other members, report them; the ternary in Step 3 needs to handle them
  deliberately rather than by falling through.
- The fix appears to require touching `packages/feeds` or `packages/availability`.

## Maintenance notes

- The durable rule this establishes: **the inbound sync may only write fields
  Xero is the source of truth for**. Any column added to the sync payload in
  future must be classified as Xero-owned or user-owned before it is added. The
  two named objects make that a visible decision rather than an accident.
- A reviewer should check that the create path still spreads both objects, and
  that `title` moved into `locallyOwned` (it is easy to miss because it reads
  like Xero data, but users can rename their own records).
- Related work that will interact with this: plan 003 changes the `complete`
  flag handling in the same handler, and plan 018 clears stale `failed_action`
  and `xero_write_error` columns in the same `data` payload. If those land
  first, rebase carefully; all three touch `processLeaveRecord`.
- Deliberately deferred: making the update conditional on the `changed` flag so
  unchanged records skip the write entirely. That is a performance improvement
  with its own correctness questions (the flag only compares
  `source_remote_hash`), and it should not ride along with a privacy fix.
