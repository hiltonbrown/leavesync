# Plan 060: Stop pulling raw Xero payloads into the analytics render

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the next
> step. If anything in "STOP conditions" occurs, stop and report — do not
> improvise. When done, update this plan's row in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 121da2a..HEAD -- packages/availability/src/analytics`
> If any in-scope file changed, compare the "Current state" excerpts against the
> live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none. Land before plan 068, so the projection is fixed once.
- **Category**: perf, security
- **Planned at**: commit `121da2a`, 2026-08-12
- **Covers findings**: P-01

## Why this matters

Both analytics services load availability records with a bare Prisma `include`
and no `take`. In Prisma, `include` without a sibling `select` returns **every
scalar column** — which here means `source_payload_json`, the raw Xero leave
payload, and `xero_write_error_raw`, the raw Xero error payload, for every
approved record in a window that can legitimately be three years long. Each
record also drags four fully hydrated related rows.

About ten scalars per record are actually consumed. The rest is billed Neon
egress and serverless-function memory, and on a 200-person organisation over
twelve months it is tens of megabytes per page render, almost all of it JSON
nobody reads.

The team already established the opposite rule for the approvals list. This is
the same class of exposure in a service that never received the same treatment.

## Current state

`packages/availability/src/analytics/leave-reports-service.ts:354`:

```ts
const records = await database.availabilityRecord.findMany({
  include: recordInclude,
  orderBy: [{ starts_at: "asc" }, { id: "asc" }],
  where: recordWhere(input, filters, personIds),
});
```

`leave-reports-service.ts:465`:

```ts
const recordInclude = {
  approved_by: true,
  person: {
    include: {
      location: true,
      team: true,
```

`packages/availability/src/analytics/out-of-office-service.ts:328` and `:427`
are the identical query and the identical `recordInclude`.

The paginated drilldown queries at `leave-reports-service.ts:275` and
`out-of-office-service.ts:257` use the same fat `recordInclude`, so even the
`take`-bounded path drags the audit blobs.

Only about ten fields are consumed, per `AnalyticsRecordListItem` at
`leave-reports-service.ts:102-118`.

**The pattern to copy** —
`packages/availability/src/approvals/approval-service.ts:1881-1903`, whose
comment states the rule verbatim:

> Explicit projection: source_payload_json and xero_write_error_raw are audit
> data and must never cross the RSC boundary to a client component.

Read that projection before writing this one, and carry the same comment across
so the rule stays discoverable.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Lint | `bun run check` | exit 0 |
| Typecheck | `bun run typecheck` | exit 0 |
| Unit tests | `bun run test` | exit 0, 17/17 tasks |
| This package | `cd packages/availability && bunx vitest run src/analytics` | all pass |

## Scope

**In scope**:
- `packages/availability/src/analytics/leave-reports-service.ts`
- `packages/availability/src/analytics/out-of-office-service.ts`
- their co-located test files
- a new shared `packages/availability/src/analytics/analytics-record-select.ts`

**Out of scope**:
- Deduplicating the two twin services. Plan 068 owns that, and doing it here
  makes this change unreviewable.
- Adding `take` to the aggregate queries. Bounding an aggregate changes the
  reported numbers, which is a product decision, not a projection fix. The
  drilldown queries are already bounded.
- The holiday predicate divergence in these files — plan 065 owns it.
- `apps/app` analytics pages. They consume named fields already.

## Git workflow

- Branch: `advisor/060-analytics-projection`
- Conventional commits, e.g. `perf(availability): project explicit columns in analytics`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Write the shared projection

Create `analytics-record-select.ts` exporting an
`analyticsRecordSelect` typed with `satisfies Prisma.AvailabilityRecordSelect`,
listing only the scalars the two services consume, plus narrow sub-selects for
`person` (with `location` and `team`) and `approved_by`.

Derive the field list from `AnalyticsRecordListItem`
(`leave-reports-service.ts:102-118`) and from every property access on a record
row in both files — not from guesswork. Carry across the approvals-service
comment naming the two audit columns.

**Verify**: `bun run typecheck` → exit 0.

### Step 2: Switch both aggregate queries

Replace `include: recordInclude` with `select: analyticsRecordSelect` at
`leave-reports-service.ts:354` and `out-of-office-service.ts:328`, and update
the two `RecordRow` type aliases (`leave-reports-service.ts:164`,
`out-of-office-service.ts:150`) to derive from the projection.

The compiler is the safety net here: any field the projection misses becomes a
type error at the use site. Fix each by adding the field to the projection, not
by casting.

**Verify**: `bun run typecheck` → exit 0, with no new `as` casts
(`git diff | grep -c " as "` should not increase).

### Step 3: Switch both drilldown queries

Do the same at `leave-reports-service.ts:275` and
`out-of-office-service.ts:257`. Keep their existing `take`.

**Verify**: `cd packages/availability && bunx vitest run src/analytics` → all pass.

### Step 4: Assert the audit columns are gone

Add a test to each service's test file asserting the Prisma call is made with a
`select` that does **not** contain `source_payload_json` or
`xero_write_error_raw`. Assert on the query shape, since the point is what
crosses the wire.

**Verify**: `bun run test` → exit 0, 17/17 tasks.

## Test plan

New cases in both analytics test files, following their existing structure:

- the aggregate query is issued with `select`, not `include`
- the projection omits `source_payload_json` and `xero_write_error_raw`
- the drilldown query keeps its `take` and uses the same projection
- existing aggregate maths (`donut`, `monthlyByType`, `countRecordsByPerson`)
  produces identical output for a fixed dataset before and after — this is the
  regression that matters most

Verification: `bun run test` → exit 0, with at least 4 new tests.

## Done criteria

ALL must hold:

- [ ] `bun run check` exits 0
- [ ] `bun run typecheck` exits 0
- [ ] `bun run test` exits 0, 17/17 tasks, with at least 4 new tests
- [ ] `grep -c "recordInclude" packages/availability/src/analytics/leave-reports-service.ts packages/availability/src/analytics/out-of-office-service.ts`
      prints `0` for both
- [ ] `grep -rn "source_payload_json" packages/availability/src/analytics/` returns
      only the comment naming it as excluded
- [ ] No new `as` casts introduced
- [ ] `git status --short` lists only the in-scope files
- [ ] `plans/README.md` row updated

## STOP conditions

Stop and report if:

- A consumer spreads a record row (`{ ...record }`) rather than destructuring
  named fields. A spread hides which fields are needed and the compiler will not
  catch a missing one; report the site rather than guessing the field list.
- The aggregate maths output changes for a fixed dataset. That means a field
  feeding a calculation was dropped — find it, do not adjust the expected values.
- The projection needs `source_payload_json` for something real. That would be a
  genuine finding and needs discussion, not a quiet re-inclusion.

## Maintenance notes

- The rule to enforce in review, now stated in three places: `include` without
  `select` on `availability_records` pulls audit blobs. Prefer an explicit
  projection on any query whose result reaches a render path.
- Plan 068 will merge these two services. Landing this first means the shared
  projection already exists for it to adopt.
- If a new audit-shaped column is added to `availability_records`, it inherits
  the correct behaviour here automatically — which is the point of projecting
  rather than excluding.
