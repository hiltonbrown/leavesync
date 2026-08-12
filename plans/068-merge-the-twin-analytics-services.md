# Plan 068: Merge the two near-identical analytics services

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

- **Priority**: P3
- **Effort**: L
- **Risk**: MED
- **Depends on**: plan 060 (shared projection) and plan 065 (shared holiday
  predicate). **Do not start this before both have landed** — see "Why the
  dependencies are hard".
- **Category**: tech-debt
- **Planned at**: commit `121da2a`, 2026-08-12
- **Covers findings**: A-04

## Why this matters

`out-of-office-service.ts` (709 lines) and `leave-reports-service.ts` (809 lines)
are twins. They declare **16 identically-named functions**, the same row types,
the same schemas and the same caching plumbing. Roughly 600 of the ~1,500 lines
are copy-paste.

The real differences are small: which record-type enum they filter on, and
whether public holidays are subtracted from working days.

The cost is not aesthetic. Every analytics change is a two-file change with no
compiler linkage, and the copies have **already** drifted in ways that produced
two separate audit findings: the over-fetching projection appeared in both
(finding P-01), and the holiday predicate diverged between them (finding A-02,
where one compares country only when the location's country is truthy, so a
Location with a null country matches every country's holidays).

This plan is last in the queue on purpose. It is the largest change, it touches
two production-facing report surfaces at once, and its value is preventing
*future* drift rather than fixing a present defect.

## Why the dependencies are hard

Plans 060 and 065 each fix a defect that currently exists **twice**, once in each
twin. If this merge lands first, those plans have to be rewritten against a
different structure. If it lands after, they will already have produced the
shared projection and the shared predicate that this merge should adopt.

Landing this first also means merging two files while one of them still contains
a known-wrong holiday rule, which makes "is the output identical?" impossible to
answer honestly.

## Current state

Both files declare these 16 identically-named functions:
`loadDataset`, `loadDatasetUncached`, `loadPeople`, `countRecordsByPerson`,
`donut`, `labelForRecordType`, `monthKeys`, `monthlyByType`,
`mostCommonRecordType`, `normaliseFilters`, `recordListItem`, `recordWhere`,
`round`, `sum`, `unknownError`, `validationError`.

Both declare the same `PersonRow` (`out-of-office-service.ts:143`,
`leave-reports-service.ts:157`), the same `RecordRow` (`:150` / `:164`), the same
`recordInclude` (`:427` / `:465`), the same `Dataset` interface, the same
`AggregateSchema`/`DrilldownSchema` shape and the same `AggregationCache`
plumbing.

The genuine differences:
- the record-type set: `LOCAL_ONLY_TYPES` versus `XERO_LEAVE_TYPES`
- whether public holidays are subtracted from working days

Existing drift, both already owned by other plans:
- `holidayAppliesToLocation` exists at `leave-reports-service.ts:522` with the
  truthy-country bug, and the equivalent differs in the twin (plan 065)
- `workingDaysByRecord` is `async` in one and sync in the other
- `labelForRecordType` is one of the eight copies plan 067 consolidates

Line counts verified: 709 and 809.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Lint | `bun run check` | exit 0 |
| Typecheck | `bun run typecheck` | exit 0 |
| Unit tests | `bun run test` | exit 0, 17/17 tasks |
| This package | `cd packages/availability && bunx vitest run src/analytics` | all pass |

## Scope

**In scope**:
- `packages/availability/src/analytics/analytics-dataset.ts` (create)
- `packages/availability/src/analytics/out-of-office-service.ts`
- `packages/availability/src/analytics/leave-reports-service.ts`
- their co-located tests

**Out of scope**:
- `apps/app/app/(authenticated)/analytics/**` — the two pages must keep their
  current public service interfaces. If a page needs changing, the façade is
  wrong.
- `analytics-csv.ts` beyond importing the shared label helper from plan 067.
- Any change to the aggregation **maths**. This is a structural merge. If a
  number changes, something is wrong.
- Adding `take` to the aggregate queries (out of scope in plan 060 too, for the
  same reason: bounding an aggregate changes reported figures).

## Git workflow

- Branch: `advisor/068-merge-analytics-services`
- Commit per step. The characterisation baseline commit must come first and stay
  separate, so it can be re-run against both the old and new code.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Build the characterisation baseline

Before touching either service, write tests that capture the **observable
output** of both, for a fixed seeded dataset, across: the aggregate response, the
drilldown response, `donut`, `monthlyByType`, `countRecordsByPerson`,
`mostCommonRecordType`, and the CSV export.

Serialise the outputs and assert against stored snapshots of the current values.
These tests must pass on unmodified `main` before you change anything.

This step is the whole safety net. Do not shorten it.

**Verify**: `cd packages/availability && bunx vitest run src/analytics` → the new
baseline tests pass against unmodified code.

### Step 2: Extract the shared dataset module

Create `analytics-dataset.ts` holding the shared schemas, the projection from
plan 060, `loadPeople`, `loadDataset`, `recordWhere` and the numeric helpers,
parameterised by an explicit options object:

```ts
interface AnalyticsDatasetOptions {
  readonly recordTypes: readonly RecordType[];
  readonly subtractPublicHolidays: boolean;
}
```

Do not add options speculatively. Two differences exist; the interface should
express exactly those two.

**Verify**: `bun run typecheck` → exit 0; baseline tests still pass.

### Step 3: Convert one service to a façade

Convert `out-of-office-service.ts` (the smaller of the two) to a thin façade over
the shared module, keeping its exported signatures byte-identical.

**Verify**: the out-of-office baseline snapshots are unchanged. If any snapshot
moves, stop and find out why before continuing.

### Step 4: Convert the second service

Repeat for `leave-reports-service.ts`.

**Verify**: the leave-reports baseline snapshots are unchanged.

### Step 5: Confirm the duplication is actually gone

**Verify**:
`grep -c "^function \|^const .* = (" packages/availability/src/analytics/out-of-office-service.ts`
and the same for `leave-reports-service.ts` — both files should now be
substantially smaller, and none of the 16 shared function names should be
defined in either.

`grep -n "loadDataset\|recordWhere\|monthlyByType" packages/availability/src/analytics/*.ts`
should show definitions only in `analytics-dataset.ts`.

## Test plan

- the Step 1 characterisation suite, unchanged, passing after every step
- a test asserting the two façades pass different `recordTypes` and different
  `subtractPublicHolidays` values, so the parameterisation is exercised in both
  directions rather than only one
- the existing analytics tests, unchanged

Verification: `bun run test` → exit 0, 17/17 tasks, with the characterisation
suite green and no snapshot updated.

## Done criteria

ALL must hold:

- [ ] `bun run check` exits 0
- [ ] `bun run typecheck` exits 0
- [ ] `bun run test` exits 0, 17/17 tasks
- [ ] **No characterisation snapshot was updated.** `git diff` on the snapshot
      files is empty
- [ ] None of the 16 shared function names is defined in either service file
- [ ] The two services' exported signatures are unchanged
      (`git diff` shows no change under `apps/app/app/(authenticated)/analytics/`)
- [ ] Combined line count of the three files is materially below 1,518
- [ ] `plans/README.md` row updated

## STOP conditions

Stop and report if:

- Plans 060 and 065 have **not** landed. Read "Why the dependencies are hard"
  and stop.
- Any characterisation snapshot changes. Updating a snapshot to make this plan
  pass would defeat its only safety mechanism. Find the cause; if the old
  behaviour was wrong, that is a separate finding and a separate plan.
- A third difference between the services emerges that is not `recordTypes` or
  `subtractPublicHolidays`. Report it; do not add a third option without saying
  so, because a third option is a signal these services may deserve to stay
  separate.
- The merge requires changing `apps/app` analytics pages.

## Maintenance notes

- After this lands, an analytics change is one edit with compiler linkage instead
  of two edits with none. That is the entire return on the work; a reviewer
  should push back on any change that re-forks the two services.
- The `AnalyticsDatasetOptions` interface is deliberately minimal. Each option
  added to it is evidence the abstraction is being stretched — three or more
  should prompt a re-think rather than a fourth.
- This plan intentionally changes no behaviour. If a genuine analytics defect is
  found while doing it, write it up separately rather than fixing it inside a
  structural merge, where it would be invisible in review.
