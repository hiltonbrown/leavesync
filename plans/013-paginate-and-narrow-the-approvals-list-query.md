# Plan 013: Paginate the approvals list and stop shipping Xero payload blobs to the browser

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report, do not improvise. When done, update this plan's status row in
> `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 75202db..HEAD -- packages/availability/src/approvals/approval-service.ts "apps/app/app/(authenticated)/leave-approvals"`
> If any changed since this plan was written, compare the "Current state"
> excerpts against the live code before proceeding. On a mismatch, treat it as a
> STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `75202db`, 2026-07-25
- **Reconciled**: 2026-08-05 against `2095b1f`. Finding confirmed still present.
  `approval-service.ts:258-278` is still an unbounded
  `database.availabilityRecord.findMany` with no `take`, and it still uses
  `include: recordInclude` (defined at line 1706), which selects every scalar
  column on the record including `source_payload_json` and
  `xero_write_error_raw`. Both the service file and
  `leave-approvals-client.tsx` changed since this plan was written (plans 004
  and 007), so re-read them before editing.

## Why this matters

`listForApprover` is the query behind the leave-approvals page, the highest
frequency manager surface in the product. It has no `take`, no cursor and no
default date bound, and its default status filter includes `approved` and
`withdrawn`. It therefore returns the organisation's entire historical leave
table, not a queue of things needing attention.

It also uses `include` with no `select` on the record itself, so every row drags
`source_payload_json` (the full raw Xero response, stored for audit) and
`xero_write_error_raw`. The page component passes the whole result into a client
component, so all of that is serialised into the RSC payload and shipped to the
browser.

Cost grows monotonically with the tenant's leave history and never plateaus. A
three-year-old tenant with 200 people loads tens of thousands of rows with JSON
blobs attached on every page view. The same shape is reached from the dashboard
service.

There is also a privacy dimension: `xero_write_error_raw` is documented as admin
audit data that must never be exposed to employees, and `source_payload_json` is
the raw payroll payload. Neither should be crossing the network to a client
component at all, even if the UI does not render them.

## Drift warning

**The `## Current state` excerpts in this plan were verified on 2026-08-06
against `fb9f1cc`, and that verification expires as soon as plan 011 merges.
Re-verify immediately before executing.**

Three queued plans modify
`packages/availability/src/approvals/approval-service.ts`: plan 011 at position
11, this one at position 12 and plan 012 at position 14. **Plan 011 lands
first**, changing the two `settingsResult.ok &&` sites, one of which is the
`showDeclinedOnApprovals` default quoted here at lines 239-243. Expect that
excerpt in particular to have changed shape, not merely moved.

Plan 018 runs at position 13. It is grouped with this set by execution order
only: it edits the job handlers in `packages/jobs` and does not modify
`approval-service.ts`.

This plan also edits
`apps/app/app/(authenticated)/leave-approvals/page.tsx` and
`leave-approvals-client.tsx`, which plan 038 quotes at position 15. Plan 038
carries the matching warning.

Before executing this plan:

1. Re-run the drift check at the top of this file against current `HEAD`, not
   against the commit named in the Status block.
2. Re-read every file quoted under `## Current state` and confirm the excerpts
   still match. Line numbers alone are not enough; check the code shape.
3. Treat a mismatch as a refresh task, not a licence to improvise. Update the
   excerpts, then execute.

## Current state

### Relevant files

- `packages/availability/src/approvals/approval-service.ts` — the unbounded
  query (line 258), the status defaults (line 239), `recordInclude` (line 1706),
  and `toApprovalListItem`, which defines what the UI actually needs.
- `apps/app/app/(authenticated)/leave-approvals/page.tsx` — passes the result
  into the client component (around line 143).
- `apps/app/app/(authenticated)/leave-approvals/leave-approvals-client.tsx` —
  the consumer.
- `packages/availability/src/analytics/leave-reports-service.ts` — contains the
  cursor-pagination pattern this repo already uses (lines 277-281). Copy it.
- `packages/database/prisma/schema.prisma` — the index
  `[organisation_id, approval_status, submitted_at]` at line 622 already
  supports the keyset order.

### The unbounded query

`packages/availability/src/approvals/approval-service.ts:258-281`:

```typescript
    const records = await database.availabilityRecord.findMany({
      where: {
        ...scoped(parsed.data),
        archived_at: null,
        source_type: { in: ["team_calendar_leave", "xero_leave"] },
        approval_status: { in: filters.status },
        ...(filters.personId?.length
          ? { person_id: { in: filters.personId } }
          : {}),
        ...(filters.recordType?.length
          ? { record_type: { in: filters.recordType } }
          : {}),
        ...(filters.dateFrom ? { ends_at: { gte: filters.dateFrom } } : {}),
        ...(filters.dateTo ? { starts_at: { lte: filters.dateTo } } : {}),
        ...(parsed.data.role === "manager"
          ? { person_id: { in: managedPersonIds } }
          : {}),
      },
      include: recordInclude,
      orderBy: [{ submitted_at: "asc" }, { starts_at: "asc" }],
    });
```

No `take`. No `cursor`. `include` with no record-level `select`.

### The status defaults pull in full history

`packages/availability/src/approvals/approval-service.ts:239-243`:

```typescript
      settingsResult.ok && settingsResult.value.showDeclinedOnApprovals;
    const defaultStatus: z.infer<typeof ApprovalStatusSchema>[] = showDeclined
      ? ["submitted", "approved", "xero_sync_failed", "withdrawn", "declined"]
      : ["submitted", "approved", "xero_sync_failed", "withdrawn"];
```

`approved` and `withdrawn` are terminal states. Every record that has ever been
approved is returned, forever.

### `recordInclude` does not constrain the record's own columns

`packages/availability/src/approvals/approval-service.ts:1706-1729`:

```typescript
const recordInclude = {
  person: {
    select: {
      clerk_user_id: true,
      email: true,
      first_name: true,
      id: true,
      last_name: true,
      location_id: true,
      manager: {
        select: {
          clerk_user_id: true,
          id: true,
        },
      },
      manager_person_id: true,
      team: {
        select: {
          name: true,
        },
      },
    },
  },
} as const;
```

The nested `person` selection is tight. The record itself has no `select`, so
Prisma returns all scalar columns including the two JSON blobs.

### The columns that must not be shipped

`packages/database/prisma/schema.prisma` declares `source_payload_json` (line
577) and `xero_write_error_raw` (line 595) on `availability_records`.

### Repo conventions that apply here

- Service functions return `Result<T, E>`.
- Every tenant-scoped query filters by `clerk_org_id` and `organisation_id`; the
  local `scoped()` helper does this. Keep it in every new query.
- Raw Xero payloads are stored for audit and must never be exposed to employees.
- Server Components by default; `"use client"` only where interactivity requires
  it.
- Cursor pagination pattern to copy:
  `packages/availability/src/analytics/leave-reports-service.ts:277-281`.
- TypeScript strict mode, no `any`, named exports only.
- Australian English in copy and comments. No em dashes anywhere.
- Tests are co-located; extend
  `packages/availability/src/approvals/approval-service.test.ts`.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `bun install` | exit 0 |
| Typecheck | `bun run typecheck` | exit 0, no errors |
| Availability tests | `bunx vitest run packages/availability` | all pass |
| App tests | `bunx vitest run apps/app` | all pass |
| Full unit tests | `bun run test` | exit 0 |
| Lint | `bun run check` | exit 0 |

If `bun run typecheck` or `bun run test` fails before you have made any change
with an error mentioning `Cannot find module '@repo/observability/log'`, run
`bun install` first. That error is a stale-install artifact, not a code defect.

## Scope

**In scope** (the only files you may modify):

- `packages/availability/src/approvals/approval-service.ts`
- `packages/availability/src/approvals/approval-service.test.ts`
- `apps/app/app/(authenticated)/leave-approvals/page.tsx`
- `apps/app/app/(authenticated)/leave-approvals/leave-approvals-client.tsx`
- `apps/app/app/(authenticated)/leave-approvals/leave-approvals-client.test.tsx`
  (if it exists)

**Out of scope** (do NOT touch, even though they look related):

- `packages/availability/src/dashboard/dashboard-service.ts`. It reaches a
  similar shape around line 445, but changing the dashboard's data contract in
  the same pass doubles the blast radius. Record it as follow-up.
- `getApprovalSummaryCounts` (line 336). The counts must remain accurate over the
  full unpaginated set, so it must keep querying the whole range. Do NOT make the
  counts reflect only the current page: that would silently change what managers
  see. If it currently derives counts from an in-memory list, convert it to a
  database `groupBy` instead.
- Any change to which statuses are *available* as filters. This plan changes the
  default, not the options.
- The approval command paths (`approve`, `decline`, and friends).
- `packages/database/prisma/schema.prisma`. The needed index already exists.

## Git workflow

- Branch: `advisor/013-paginate-approvals-list`
- Conventional commits, one logical change per commit. Example from `git log`:
  `feat(analytics): add CSV export to leave reports`
- Do NOT push or open a PR unless the operator instructs it.

## Steps

### Step 1: Derive the exact column set the UI needs

Read `toApprovalListItem` in
`packages/availability/src/approvals/approval-service.ts` and list every field
it reads from the record. Also check `ApprovalListItem`'s type definition.

Write that list down before you change anything. It is the specification for
Step 2. `xero_write_error` (the plain-language one) IS read and must stay;
`xero_write_error_raw` and `source_payload_json` must not appear in your list. If
either does appear, that is a STOP condition.

**Verify**: you have an explicit list of column names.

### Step 2: Add an explicit `select` to the query

Replace `include: recordInclude` with a `select` that contains exactly the
columns from Step 1 plus the nested `person` selection that `recordInclude`
already defines. Define it once as a module-level constant next to
`recordInclude`:

```typescript
// Explicit projection: source_payload_json and xero_write_error_raw are audit
// data and must never cross the RSC boundary to a client component.
const approvalRecordSelect = {
  // ... the scalar columns from Step 1
  person: recordInclude.person,
} as const;
```

Keep `recordInclude` if other call sites use it; check with
`grep -n "recordInclude" packages/availability/src/approvals/approval-service.ts`.

**Verify**: `bun run typecheck` → exit 0, and
`bunx vitest run packages/availability` → all pass. TypeScript will tell you if
you missed a column that `toApprovalListItem` reads.

### Step 3: Bound the terminal statuses by date

Terminal statuses (`approved`, `withdrawn`, `declined`) should default to a
recent window rather than all history. Actionable statuses (`submitted`,
`xero_sync_failed`) must never be date-bounded: an old pending request is exactly
what a manager needs to see.

Add a module constant and apply it only when the caller supplied no explicit
date filter:

```typescript
const TERMINAL_STATUS_WINDOW_DAYS = 90;
```

Implement it as an `OR` in the `where` clause: either the record is in an
actionable status, or it is in a terminal status and `ends_at` is within the
window. Keep all existing filters intact, including the manager person scope.

If `filters.dateFrom` or `filters.dateTo` was supplied by the caller, do not
apply the default window; the caller has been explicit.

**Verify**: `bun run typecheck` → exit 0.

### Step 4: Add cursor pagination

Follow the pattern at
`packages/availability/src/analytics/leave-reports-service.ts:277-281`.

Add optional `cursor` and `pageSize` to the input schema (default page size 50,
maximum 200), add `take: pageSize + 1` and the `cursor`/`skip` handling, and
return `{ items, nextCursor }` instead of a bare array.

The `orderBy` must stay `[{ submitted_at: "asc" }, { starts_at: "asc" }]` and you
must add `{ id: "asc" }` as a final tiebreaker so the keyset order is total and
pagination cannot skip or repeat rows when two records share a `submitted_at`.

**Verify**: `bun run typecheck` → exit 0.

### Step 5: Update the page and client component

`apps/app/app/(authenticated)/leave-approvals/page.tsx` now receives
`{ items, nextCursor }`. Pass `items` where the array was passed before, and pass
`nextCursor` to the client component.

In `leave-approvals-client.tsx`, add a "Load more" control that is rendered only
when `nextCursor` is non-null. Use the shared button primitive from
`@repo/design-system/components/ui/*`; do not create a new base control. It must
have an accessible name and a visible focus state, consistent with the rest of
the page.

Keep the summary counts wired to `getApprovalSummaryCounts`, which still reflects
the full set. Do not compute counts from the loaded page.

**Verify**: `bunx vitest run apps/app` → all pass, and `bun run check` → exit 0.

### Step 6: Add tests

In `packages/availability/src/approvals/approval-service.test.ts`:

1. **Projection regression test**: assert the `findMany` call's `select` does NOT
   contain `source_payload_json` or `xero_write_error_raw`. Use
   `expect(select).not.toHaveProperty("source_payload_json")`.
2. Assert the `select` DOES contain `xero_write_error` (the plain-language one).
3. Assert `take` is present and equals `pageSize + 1`.
4. With more results than the page size, assert `nextCursor` is returned and
   `items.length === pageSize`.
5. With fewer results than the page size, assert `nextCursor` is `null`.
6. Assert an actionable record (`submitted`) with a `ends_at` two years ago IS
   returned, proving the date window does not hide pending work.
7. Assert a terminal record (`approved`) with `ends_at` two years ago is NOT
   returned by default, but IS returned when the caller supplies an explicit
   `dateFrom`.
8. Assert the `where` clause still contains `clerk_org_id` and
   `organisation_id`.

**Verify**: `bunx vitest run packages/availability` → all pass.

### Step 7: Confirm nothing else regressed

**Verify**: `bun run test` → exit 0, `bun run typecheck` → exit 0,
`bun run check` → exit 0, and `bun run build` → exit 0.

The build is worth running here because this plan changes an RSC boundary.

## Test plan

- New tests: 8 cases in `approval-service.test.ts`.
- Structural pattern to copy: the existing `listForApprover` tests in that file
  for constructing input and asserting on the mocked `findMany` arguments; and
  `packages/availability/src/analytics/leave-reports-service.test.ts` for how
  cursor pagination is asserted elsewhere in this repo.
- The two load-bearing assertions: the projection excludes both JSON blobs, and
  a two-year-old `submitted` record is still returned.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `bun run typecheck` exits 0
- [ ] `bun run test` exits 0
- [ ] `bun run check` exits 0
- [ ] `bun run build` exits 0
- [ ] `grep -n "take:" packages/availability/src/approvals/approval-service.ts`
      returns a match inside `listForApprover`
- [ ] `grep -n "approvalRecordSelect" packages/availability/src/approvals/approval-service.ts`
      returns at least two matches
- [ ] `bunx vitest run packages/availability` passes with at least 8 new cases
- [ ] `git status --short` shows only in-scope files modified
- [ ] Status row for plan 013 updated in `plans/README.md`

## STOP conditions

Stop and report back (do not improvise) if:

- `toApprovalListItem` turns out to read `source_payload_json` or
  `xero_write_error_raw`. That would mean the UI depends on audit data and the
  fix needs a product decision about what to expose.
- `getApprovalSummaryCounts` derives its counts by consuming the array returned
  from `listForApprover`. If so, report it: the counts must be converted to a
  database aggregate in the same change, and that widens the plan enough to be
  worth confirming.
- The existing client component assumes it holds every record (for example, it
  filters or sorts client-side across the whole set, or computes totals). Report
  what it assumes; those behaviours need server-side equivalents before
  pagination is safe.
- `bun run build` fails after Step 5.
- A step's verification fails twice after a reasonable fix attempt.

## Maintenance notes

- The general rule: **a list query with no `take` is a defect**, and `include`
  without a record-level `select` on `availability_records` ships audit blobs.
  Both are easy to reintroduce.
- The date-window split is the subtle part of this change. Actionable statuses
  must never be windowed. If someone later adds a new status, they must classify
  it as actionable or terminal, and a reviewer should insist on it.
- A reviewer should check the `orderBy` includes the `id` tiebreaker. Without it,
  cursor pagination over rows sharing a `submitted_at` can drop or duplicate
  records, and that bug is invisible in small test datasets.
- Follow-up deliberately deferred: `packages/availability/src/dashboard/dashboard-service.ts:445-452`
  reaches a similar unbounded shape, and
  `dashboard-service.ts:1051-1096` drains the full people roster through a
  `while (true)` loop to compute aggregates. Both are real and both belong in
  their own plan (see plan 031).
