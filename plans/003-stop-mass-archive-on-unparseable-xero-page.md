# Plan 003: Stop treating an unparseable Xero page as the end of pagination

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report, do not improvise. When done, update this plan's status row in
> `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 75202db..HEAD -- packages/xero/src/read/leave-records.ts packages/xero/src/read/employees.ts packages/xero/src/au/read.ts packages/jobs/src/handlers/sync-xero-leave-records.ts`
> If any of these changed since this plan was written, compare the "Current
> state" excerpts against the live code before proceeding. On a mismatch,
> treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `75202db`, 2026-07-25

## Why this matters

The Xero leave-records sync paginates until it sees a page with fewer than 100
records, then declares the fetch complete and archives every local record whose
remote id was not in the fetched set. Archiving is destructive: it sets
`archived_at`, flips `include_in_feed` to `false`, and sets `publish_status` to
`archived`, so the records disappear from the product and from every subscribed
Outlook, Google and Apple calendar.

The mapper that turns a Xero response into records returns an empty array when
the response fails schema validation. An empty array is indistinguishable from a
genuinely short final page, so a single malformed page-two response, an HTML
error body served with a 200 status, or any Xero schema drift causes the loop to
stop early and report `complete: true`. Every leave record from page two onward
is then archived, and the sync run reports success with no error surfaced.

The empty-first-page case happens to be saved by a `fetchedRemoteIds.length === 0`
guard in the archive function, which is exactly why this failure mode is easy to
miss in testing: the obvious case is safe and the subtle one is not.

## Current state

### Relevant files

- `packages/xero/src/read/leave-records.ts` — the leave-record mapper; returns
  `[]` on parse failure (line 56-60).
- `packages/xero/src/read/employees.ts` — the employee mapper; same pattern at
  lines 36-38.
- `packages/xero/src/au/read.ts` — the AU pagination loops for both leave
  records (lines 138-190) and employees (lines 60-105).
- `packages/xero/src/read/dispatch.ts` — declares the `complete: boolean` field
  in the region dispatch return type (line 86).
- `packages/jobs/src/handlers/sync-xero-leave-records.ts` — consumes `complete`
  (line 182) and gates archiving on it (line 241).

### The mapper swallows parse failure

`packages/xero/src/read/leave-records.ts:50-60`:

```typescript
const LeaveApplicationsResponseSchema = z
  .object({
    LeaveApplications: z.array(LeaveApplicationSchema),
  })
  .passthrough();

export function mapXeroLeaveRecords(payload: unknown): XeroLeaveRecord[] {
  const parsed = LeaveApplicationsResponseSchema.safeParse(payload);
  if (!parsed.success) {
    return [];
  }
```

`packages/xero/src/read/employees.ts:36-38` has the identical shape for
`mapXeroEmployees`.

### The pagination loop cannot tell the two cases apart

`packages/xero/src/au/read.ts:24` defines the page size:

```typescript
const XERO_PAGE_SIZE = 100;
```

`packages/xero/src/au/read.ts:138-190`, the leave-records loop:

```typescript
  try {
    const leaveRecords: XeroLeaveRecord[] = [];
    let page = 1;
    let rawResponse: unknown = null;

    while (true) {
      const response = await xeroFetch({ /* ... */ });
      const rawPayload = await readXeroPayload(response);

      if (!response.ok) {
        return {
          ok: false,
          error: mapXeroReadHttpError(response, rawPayload),
        };
      }

      rawResponse ??= rawPayload;
      const leaveRecordPage = mapXeroLeaveRecords(rawPayload);
      leaveRecords.push(...leaveRecordPage);

      if (leaveRecordPage.length < XERO_PAGE_SIZE) {
        return {
          ok: true,
          value: { complete: true, leaveRecords, rawResponse },
        };
      }

      page += 1;
    }
  } catch (error) {
```

Note three things: `complete` is only ever assigned the literal `true`; the loop
is `while (true)` with no page cap; and a parse failure reaches the
`leaveRecordPage.length < XERO_PAGE_SIZE` branch with length `0`.

The employees loop at `packages/xero/src/au/read.ts:85-100` is the same shape,
except its return value has no `complete` field at all:

```typescript
      rawResponse ??= rawPayload;
      const employeePage = mapXeroEmployees(rawPayload);
      employees.push(...employeePage);

      if (employeePage.length < XERO_PAGE_SIZE) {
        return { ok: true, value: { employees, rawResponse } };
      }
```

### The consumer archives on `complete`

`packages/jobs/src/handlers/sync-xero-leave-records.ts:182`:

```typescript
    const { complete, leaveRecords: fetched } = leaveRecordsResult.value;
```

`packages/jobs/src/handlers/sync-xero-leave-records.ts:241-256`:

```typescript
    const stale = complete
      ? await archiveStaleRecords(
          context,
          fetched.map((record) => record.leaveApplicationId).filter(Boolean)
        )
      : { archived: 0, personIds: [] };
    if (!complete) {
      log.warn(
        "Skipped stale-archive because the Xero leave fetch was truncated",
        {
          clerkOrgId: context.clerkOrgId,
          organisationId: context.organisationId,
          xeroTenantId: context.xeroTenantId,
        }
      );
    }
```

This consumer is already written correctly. The `!complete` branch is currently
dead code purely because the producer never returns `false`. After this plan it
becomes live, which is the point.

### The destructive write

`packages/jobs/src/handlers/sync-xero-leave-records.ts:668-700`:

```typescript
async function archiveStaleRecords(
  context: SyncXeroLeaveRecordsInput,
  fetchedRemoteIds: string[]
): Promise<{ archived: number; personIds: string[] }> {
  if (fetchedRemoteIds.length === 0) {
    return { archived: 0, personIds: [] };
  }

  const stale = await database.availabilityRecord.findMany({
    where: {
      ...scoped(context),
      archived_at: null,
      source_remote_id: { notIn: fetchedRemoteIds },
      source_type: "xero_leave",
    },
    select: { id: true, person_id: true },
  });
```

Do not change this function. It is correct given a trustworthy `complete` flag.

### Repo conventions that apply here

- All Xero-specific logic stays in `packages/xero`. Region-specific code lives in
  `au/`, `nz/`, `uk/` subdirectories.
- Zod validates all external input, including Xero responses.
- Service functions return `Result<T, E>`; do not throw for expected failures.
- `XeroWriteResult` is the Result alias used across the Xero read and write
  paths. Do not introduce a new result type.
- Structured logging via `@repo/observability/log`. No `console.log`.
- Australian English in comments. No em dashes anywhere.
- Tests are co-located. Fixture-based tests are the established pattern for Xero
  response mappers; see `packages/xero/src/au/read.test.ts` (241 lines) for the
  shape to follow.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `bun install` | exit 0 |
| Typecheck | `bun run typecheck` | exit 0, no errors |
| Xero tests | `bunx vitest run packages/xero` | all pass |
| Jobs tests | `bunx vitest run packages/jobs` | all pass |
| Full unit tests | `bun run test` | exit 0 |
| Lint | `bun run check` | exit 0 |

If `bun run typecheck` or `bun run test` fails before you have made any change
with an error mentioning `Cannot find module '@repo/observability/log'`, check
that `packages/xero/package.json` declares `"@repo/observability": "*"` and
run `bun install`. A stale install can cause this error, but an undeclared
workspace dependency must be fixed in the manifest rather than bypassed.

## Scope

**In scope** (the only files you may modify):

- `packages/xero/src/read/leave-records.ts`
- `packages/xero/src/read/employees.ts`
- `packages/xero/src/au/read.ts`
- `packages/xero/src/au/read.test.ts`
- `packages/xero/src/read/leave-records.test.ts` (create if absent)
- `packages/jobs/src/handlers/sync-xero-leave-records.test.ts`
- `packages/xero/package.json`
- `bun.lock`

**Out of scope** (do NOT touch, even though they look related):

- `archiveStaleRecords` in `packages/jobs/src/handlers/sync-xero-leave-records.ts`
  — correct as written; the defect is in the flag it trusts.
- The `!complete` warning branch at `sync-xero-leave-records.ts:247-256` — it is
  already correct and becomes live through this change. Do not rewrite it.
- `packages/xero/src/nz/*` and `packages/xero/src/uk/*` — those regions return
  `region_not_supported_error` and have no pagination loop.
- The Zod schemas' field definitions. Do not loosen `LeaveApplicationSchema` or
  `XeroEmployeesResponseSchema` to make parse failures less likely; the point is
  to handle failure correctly, not to hide it.
- Any change to `source_payload_json` storage or the archive column semantics.

## Git workflow

- Branch: `advisor/003-xero-pagination-completeness`
- Conventional commits, one logical change per commit. Example from `git log`:
  `fix(xero): protect rotated refresh token against transaction abort`
- Do NOT push or open a PR unless the operator instructs it.

## Steps

### Step 1: Make the leave-record mapper report parse failure

In `packages/xero/src/read/leave-records.ts`, add a new exported function that
distinguishes failure from an empty page, and keep the existing
`mapXeroLeaveRecords` as a thin wrapper so current callers and tests continue to
compile.

Target shape:

```typescript
export type MapXeroLeaveRecordsResult =
  | { ok: true; records: XeroLeaveRecord[] }
  | { ok: false };

export function tryMapXeroLeaveRecords(
  payload: unknown
): MapXeroLeaveRecordsResult {
  const parsed = LeaveApplicationsResponseSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false };
  }
  return {
    ok: true,
    records: parsed.data.LeaveApplications.map((application) => ({
      /* the existing mapping body, moved here unchanged */
    })),
  };
}

export function mapXeroLeaveRecords(payload: unknown): XeroLeaveRecord[] {
  const result = tryMapXeroLeaveRecords(payload);
  return result.ok ? result.records : [];
}
```

Move the existing mapping body into `tryMapXeroLeaveRecords` without altering
any field mapping. Do not change how individual fields are read.

**Verify**: `bun run typecheck` → exit 0.

### Step 2: Do the same for the employee mapper

In `packages/xero/src/read/employees.ts`, apply the identical treatment: add
`tryMapXeroEmployees` returning `{ ok: true; employees } | { ok: false }`, and
reduce `mapXeroEmployees` to a wrapper returning `[]` on failure.

**Verify**: `bun run typecheck` → exit 0.

### Step 3: Return `complete: false` from the leave-records loop on parse failure

In `packages/xero/src/au/read.ts`, in the leave-records pagination loop
(currently lines 138-190):

Before importing the structured logger, add `"@repo/observability": "*"` to
`packages/xero/package.json` alongside the other `@repo/*` runtime
dependencies, then run `bun install` to update `bun.lock`. `@repo/xero` does
not currently declare this workspace dependency, so importing
`@repo/observability/log` without this manifest change fails the package
typecheck. Keep both manifest files within this plan's scope; do not accept an
unrelated lockfile rewrite.

1. Replace `const leaveRecordPage = mapXeroLeaveRecords(rawPayload);` with a call
   to `tryMapXeroLeaveRecords`.
2. When the result is `{ ok: false }`, log a warning with `clerkOrgId`,
   `organisationId` and the page number, then return
   `{ ok: true, value: { complete: false, leaveRecords, rawResponse } }` so the
   records fetched so far are still upserted but archiving is skipped.
3. When the result is `{ ok: true }`, push the records and keep the existing
   `< XERO_PAGE_SIZE` termination, which still returns `complete: true`.
4. Replace `while (true)` with a bounded loop. Add a module-level
   `const XERO_MAX_PAGES = 200;` next to `XERO_PAGE_SIZE` and loop
   `while (page <= XERO_MAX_PAGES)`. If the loop exits by exhausting the cap,
   return `complete: false` with the records gathered so far, and log a warning.

The critical invariant: `complete: true` must only be returned when every page
parsed successfully AND a short page terminated the loop.

**Verify**: `bun run typecheck` → exit 0.

### Step 4: Apply the same bounding to the employees loop

In the employees loop in `packages/xero/src/au/read.ts` (currently lines 60-105),
use `tryMapXeroEmployees`, and replace `while (true)` with the same
`XERO_MAX_PAGES` bound.

The employees fetch return type has no `complete` field and its consumer
(`packages/jobs/src/handlers/sync-xero-people.ts`) does not archive, so do NOT
add a `complete` field here. Instead, on a parse failure or cap exhaustion,
return a failed `Result`:

```typescript
        return {
          ok: false,
          error: {
            code: "unknown_error",
            message: "Xero returned an employee page that could not be read.",
          },
        };
```

This is safe because a failed employee fetch aborts the run rather than silently
syncing a partial roster, and nothing destructive depends on it.

**Verify**: `bun run typecheck` → exit 0.

### Step 5: Test the mappers

Create `packages/xero/src/read/leave-records.test.ts` if it does not exist. Add
cases for `tryMapXeroLeaveRecords`:

1. A valid payload with two leave applications → `ok: true`, two mapped records.
2. A payload missing the `LeaveApplications` key → `ok: false`.
3. A payload that is an HTML string rather than an object → `ok: false`.
4. A valid payload with an empty `LeaveApplications` array → `ok: true`, zero
   records. This is the case that must NOT be confused with failure.

Add the equivalent four cases for `tryMapXeroEmployees`, in the employees
mapper's co-located test file (create it if absent).

**Verify**: `bunx vitest run packages/xero` → all pass.

### Step 6: Test the pagination completeness contract

In `packages/xero/src/au/read.test.ts`, following the existing fixture and fetch
mocking pattern already in that file, add:

1. **The regression test**: page 1 returns 100 valid records, page 2 returns a
   malformed body with HTTP 200. Assert the result is `ok: true`,
   `value.complete === false`, and `value.leaveRecords.length === 100`.
2. Page 1 returns 100 valid records, page 2 returns 5 valid records. Assert
   `complete === true` and 105 records.
3. Page 1 returns 5 valid records. Assert `complete === true` and 5 records.
4. Page 1 returns an empty but valid `LeaveApplications` array. Assert
   `complete === true` and 0 records.

**Verify**: `bunx vitest run packages/xero/src/au/read.test.ts` → all pass.

### Step 7: Test that the sync handler does not archive on an incomplete fetch

In `packages/jobs/src/handlers/sync-xero-leave-records.test.ts`, the current
suite already has both required directions: its `"skips stale archival when the
Xero leave fetch is truncated"` test verifies an incomplete result does not
issue the archive-shaped `findMany` query, and `"uses a notIn query for stale
archival when Xero returns records"` verifies the complete path. Keep those
assertions passing. Strengthen either test only if the changed behaviour makes
its intent unclear; do not add duplicate tests merely to satisfy a count.

The incomplete fixture shape is:
`{ ok: true, value: { complete: false, leaveRecords: [...], rawResponse: {} } }`.

**Verify**: `bunx vitest run packages/jobs` → all pass.

### Step 8: Confirm nothing else regressed

**Verify**: `bun run test` → exit 0, `bun run typecheck` → exit 0, and
`bun run check` → exit 0.

## Test plan

- New tests: `packages/xero/src/read/leave-records.test.ts` (4 cases), the
  employees mapper test (4 cases), `packages/xero/src/au/read.test.ts` (4 new
  cases), `packages/jobs/src/handlers/sync-xero-leave-records.test.ts` (2 new
  cases).
- Structural patterns to copy: `packages/xero/src/au/read.test.ts` for Xero
  fetch mocking and fixtures; `packages/jobs/src/handlers/sync-xero-leave-records.test.ts`
  for the handler-level database mocks.
- The single most important assertion in this plan: an unparseable page two
  yields `complete: false` and zero archived records.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `bun run typecheck` exits 0
- [ ] `bun run test` exits 0
- [ ] `bun run check` exits 0
- [ ] `grep -n "while (true)" packages/xero/src/au/read.ts` returns no matches
- [ ] `grep -n "complete: false" packages/xero/src/au/read.ts` returns at least
      one match
- [ ] `bunx vitest run packages/xero packages/jobs` passes and covers all four
      mapper outcomes, all four AU-pagination outcomes, and the existing paired
      handler tests for incomplete and complete archival behaviour
- [ ] `git status --short` shows only in-scope files modified
- [ ] Status row for plan 003 updated in `plans/README.md`

## STOP conditions

Stop and report back (do not improvise) if:

- The excerpts in "Current state" do not match the live code.
- `mapXeroLeaveRecords` or `mapXeroEmployees` has callers outside
  `packages/xero/src/au/read.ts` and their own tests. Confirm with
  `grep -rn "mapXeroLeaveRecords\|mapXeroEmployees" packages apps --include=*.ts`.
  If a caller exists elsewhere, report it rather than changing that caller.
- Making the employees fetch return a failed `Result` on parse failure breaks an
  existing `sync-xero-people` test in a way that suggests the handler depends on
  partial results. Report it; do not weaken Step 4 to `complete`-style handling
  without confirmation.
- A step's verification fails twice after a reasonable fix attempt.

## Maintenance notes

- The `complete` flag is now a real contract: it means "every page parsed and
  pagination terminated normally". Any future region implementation
  (`packages/xero/src/nz/read.ts`, `uk/read.ts`) must honour it, and any new
  consumer that performs destructive writes must gate on it the way
  `sync-xero-leave-records.ts:241` does.
- A reviewer should confirm that `complete: true` is not returned from any new
  early-return path added later in the loop.
- The `XERO_MAX_PAGES` cap is a safety bound, not a tuning parameter. At 100
  records per page it allows 20,000 leave applications per sync. If a tenant
  legitimately exceeds it, the correct response is cursor-based resumption
  across runs, not raising the cap.
- Deliberately deferred: the same parse-failure-as-empty pattern may exist in
  other mappers under `packages/xero/src/read/`. This plan covers the two that
  feed pagination loops. A follow-up should audit the rest.
