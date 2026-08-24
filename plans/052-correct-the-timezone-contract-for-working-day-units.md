# Plan 052: Stop writing wrong working-day units into Xero payroll

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the next
> step. If anything in "STOP conditions" occurs, stop and report. Do not
> improvise. When done, update this plan's row in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat b590de2..HEAD -- packages/availability/src/duration/working-days.ts packages/availability/src/duration/working-days.test.ts`
> If either in-scope file changed, compare the "Current state" excerpts against
> the live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: MED
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `b590de2`, 2026-08-24
- **Reconciled**: 2026-08-24. The original plan's `buildFormDate` change was
  rejected because it would alter persisted timestamp semantics and required
  out-of-scope data flow. The corrected plan preserves the established floating
  wall-clock contract and fixes its interpretation in the duration calculator.
- **Execution verdict**: **BLOCKED at review**, 2026-08-24. Executor commit
  `d1d4a94` is scope-clean and passes the focused suite, mutation check,
  typecheck, unit tests and live integration tests. The mandatory full
  `bun run check` gate exits 1 on 62 pre-existing diagnostics outside this
  plan's diff. The two changed files pass a scoped Ultracite check. Re-run the
  full gate after the baseline diagnostics are resolved, then reconcile this
  plan before merging.
- **Reconciled again**: 2026-08-24 at `b590de2`. The blocker is unchanged and
  now has an executable owner, plan 075. Scoped checks attribute 60 errors to
  seven unsafe debug-route files and two errors to temporary console output in
  the manual sync action. Plan 052's focused suite remains 32/32 green.
- **Operator disposition**: merged into `main` as merge commit `660b1a6` on
  2026-08-24 before plan 075. Post-merge duration tests pass 32/32. The plan is
  merged but not fully verified because `bun run check` still reports the same
  62 out-of-scope diagnostics. After plan 075 is DONE, run every plan 052 gate
  on `main` before changing this status to DONE.
- **Final reconciliation**: **DONE**, 2026-08-24 at `117fb1b`. The two in-scope
  files are unchanged from reviewed executor commit `d1d4a94`. On current
  `main`, the duration suite passes 32/32, `bun run check` exits 0,
  `bun run typecheck` passes 19/19 tasks, and `bun run test` passes 17/17 tasks.
  The non-planning source tree is identical to reviewed plan 075 commit
  `8b3efbe`, where `bun run test:integration` passed 5/5 tasks and 58
  database-backed tests. The former quality-gate blocker is resolved.

## Why this matters

The number of working days Team Calendar writes into a customer's Xero payroll
file is wrong for every organisation whose location timezone is ahead of UTC,
including every AU and NZ customer supported for payroll write-back.

Team Calendar deliberately stores dates and times from the leave form as UTC
fields whose UTC components preserve the local wall-clock values the user
entered. For example, a Brisbane 09:00 start is stored as
`2026-01-05T09:00:00.000Z`, not the real instant `2026-01-04T23:00:00.000Z`.
Inbound Xero leave dates use the same date-preserving convention. The duration
calculator violates that contract by formatting those stored values through the
location timezone a second time.

In `Australia/Sydney`, `Australia/Brisbane` and `Pacific/Auckland`, an all-day
end value of `...T23:59:59.999Z` is therefore reinterpreted as the following
calendar day. A timed value of `09:00Z-17:00Z` is reinterpreted as evening to
early morning, producing no overlap with the 09:00-17:00 working window. These
wrong units are sent to Xero and shown in approval balance calculations.

The correct boundary is narrow: `starts_at`, `ends_at` and `holiday_date` are
date or wall-clock carrier values in this calculation, so use their UTC
components directly. Location data remains necessary for country, region and
location holiday assignment rules, but its timezone must not shift these
carrier values.

## Current state

**The form establishes the carrier-value contract** in
`apps/app/app/(authenticated)/plans/_schemas.ts:124-134`:

```ts
export function buildFormDate(
  date: string,
  time: string | undefined,
  allDay: boolean,
  isEnd = false
): Date {
  if (allDay) {
    return new Date(`${date}T${isEnd ? "23:59:59.999" : "00:00:00.000"}Z`);
  }
  return new Date(`${date}T${time || (isEnd ? "17:00" : "09:00")}:00.000Z`);
}
```

Do not change this function under this plan. Editing it would change stored
values used by calendar, feed, hashes and Xero date serialisation.

**The duration calculator currently shifts carrier values** in
`packages/availability/src/duration/working-days.ts:89-91`:

```ts
const timezone = location.timezone ?? "UTC";
const startParts = getLocalDateParts(input.startsAt, timezone);
const endParts = getLocalDateParts(input.endsAt, timezone);
```

`getLocalDateParts` at `working-days.ts:422-449` calls
`Intl.DateTimeFormat(..., { timeZone: timezone })`. The same reinterpretation is
also present in `workingDayYearsForInput` and
`computeWorkingDaysFromReferenceData`, so all three paths must be corrected
together.

**Holiday dates are shifted through the same helper** in
`addExcludedHolidayDate` and `shouldExcludeHoliday`. `holiday_date` is a
date-only database value represented as a `Date`; preserve its UTC date
components rather than formatting it through a location timezone.

**Where the result goes**:
`packages/availability/src/plans/submit-service.ts:461-471` calls
`computeWorkingDays` and sends the result to Xero as `units`. Approval list
loading also calls the reference-data variants in
`packages/availability/src/approvals/approval-service.ts:1214-1360`.

**Confirmed at the reconciled baseline**:

| Stored carrier value | Timezone | Current reinterpretation |
|---|---|---|
| `2026-01-07T23:59:59.999Z` | `Australia/Sydney` | 8 Jan 2026 |
| `2026-01-07T23:59:59.999Z` | `Australia/Brisbane` | 8 Jan 2026 |
| `2026-01-07T23:59:59.999Z` | `Pacific/Auckland` | 8 Jan 2026 |
| `2026-01-05T09:00:00.000Z` | `Australia/Sydney` | 20:00 |
| `2026-01-05T17:00:00.000Z` | `Australia/Sydney` | 04:00 on 6 Jan |

The existing duration fixture at
`packages/availability/src/duration/working-days.test.ts:25-30` uses only
`timezone: "UTC"`, where the contract violation is invisible.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install in a fresh worktree | `bun install --frozen-lockfile` | exit 0; lockfile unchanged |
| Duration tests | `cd packages/availability && bunx vitest run src/duration` | all pass after the fix |
| Lint | `bun run check` | exit 0 |
| Typecheck | `bun run typecheck` | exit 0 |
| Unit tests | `bun run test` | exit 0 |
| Integration tests | `bun run test:integration` | exit 0; requires reachable `DATABASE_URL` |

## Scope

**In scope**:

- `packages/availability/src/duration/working-days.ts`
- `packages/availability/src/duration/working-days.test.ts`

**Out of scope**, even though they look related:

- `apps/app/app/(authenticated)/plans/_schemas.ts` and `_actions.ts`. Preserve
  the carrier values produced by `buildFormDate`.
- `apps/app/app/(authenticated)/plans/record-form.tsx`. Its all-day weekday
  preview already uses the entered date-only values without a timezone shift.
  Holiday-aware or timed previews would be a separate product enhancement.
- Stored `starts_at` / `ends_at` semantics, schema changes and data migrations.
- Feed projection and inbound Xero parsing. Plan 054 owns the separate
  all-day-end feed inconsistency.
- Working-hour configuration. This plan preserves the existing 09:00-17:00
  window and quarter-day rounding.

## Existing conventions to follow

- Keep `computeWorkingDays`, `workingDayYearsForInput` and
  `computeWorkingDaysFromReferenceData` behaviour aligned. The first loads live
  data; the other two are the batched approval-list path.
- Return the existing `Result` variants. Do not introduce throws for expected
  failures.
- Use named helpers and UTC getters for the carrier-value conversion. Do not
  set `process.env.TZ`, parse through the host timezone, or add a dependency.
- Keep tests co-located and use the existing Vitest mocks and `it.each` style
  where parameterisation removes repetition.
- Use Australian English and do not add em dashes.

## Git workflow

- Branch: `advisor/052-timezone-working-days`
- Commit with a conventional message, for example
  `fix(availability): preserve wall-clock working-day values`
- Do not push, merge or open a PR.

## Steps

### Step 1: Pin the wrong interpretation with failing tests

Extend `packages/availability/src/duration/working-days.test.ts`. Make the
mocked location timezone configurable per test, and parameterise the following
cases over `UTC`, `Australia/Sydney`, `Australia/Brisbane`,
`Pacific/Auckland` and `Europe/London`:

1. All-day Monday 5 January through Wednesday 7 January 2026, using the same
   carrier values as the form (`00:00:00.000Z` start and `23:59:59.999Z` end),
   returns `3`.
2. All-day Monday through Friday, with Friday ending at `23:59:59.999Z`,
   returns `5` and does not count a shifted weekday.
3. Timed 09:00-17:00 on one weekday returns `1`.
4. Timed 09:00-13:00 on one weekday returns `0.5`.

Add a public-holiday case using the existing `holiday` fixture, confirming the
stored holiday date excludes the same date in every timezone. Each assertion
must call `computeWorkingDays`; do not test a duplicate helper in isolation.

Before changing production code, run:

```bash
cd packages/availability && bunx vitest run src/duration
```

Expected before the fix: the existing UTC cases pass, while at least the AU/NZ
all-day and timed cases fail. If every new case passes, STOP.

### Step 2: Interpret stored date and time components consistently

In `working-days.ts`, replace the timezone-formatting conversion used by the
duration algorithm with a helper that reads `Date` UTC components directly:
year, month, day, hour and minute, plus the `YYYY-MM-DD` value. Give the helper
a name that documents the stored wall-clock carrier contract.

Apply that helper consistently in:

- `computeWorkingDays`
- `workingDayYearsForInput`
- `computeWorkingDaysFromReferenceData`
- holiday date set construction and holiday matching

Keep the location lookup and its country, region and assignment checks intact.
It is acceptable to retain the selected `timezone` field as reference metadata,
but no duration or holiday date may be shifted through `Intl.DateTimeFormat`.
Remove dead timezone parameters and helpers if they are no longer used.

Do not special-case `23:59:59.999`. The same component-preserving rule must
handle all-day and timed values.

Verify:

```bash
cd packages/availability && bunx vitest run src/duration
```

Expected: all existing and new duration tests pass in every parameterised
timezone.

### Step 3: Run a mutation check

Temporarily restore only `packages/availability/src/duration/working-days.ts`
to its pre-change contents while leaving the new tests in place. Run the
duration suite and confirm the AU/NZ cases fail. Restore the production change
immediately afterwards and rerun the suite to green.

Do not commit or report with the production file reverted.

### Step 4: Run repository gates

From the repository root, run in order:

```bash
bun run check
bun run typecheck
bun run test
bun run test:integration
```

If the integration lane cannot connect because `DATABASE_URL` is unavailable,
report that verification as skipped with the exact non-secret reason. Do not
invent credentials or print an environment value.

## Done criteria

All must hold:

- [x] Duration tests fail before the production change in AU/NZ and pass after it.
- [x] At least 8 new parameterised assertions cover non-UTC timezones across
      all-day and timed carrier values.
- [x] Public-holiday exclusion is stable across the timezone matrix.
- [x] The production algorithm no longer formats stored carrier values through
      `Intl.DateTimeFormat`.
- [x] `computeWorkingDays`, `workingDayYearsForInput` and
      `computeWorkingDaysFromReferenceData` use the same component contract.
- [x] `bun run check` exits 0.
- [x] `bun run typecheck` exits 0.
- [x] `bun run test` exits 0.
- [x] `bun run test:integration` exits 0, or is explicitly reported skipped
      only because no reachable `DATABASE_URL` is available.
- [x] `git diff --check` exits 0.
- [x] `git status --short` lists only the two in-scope source files before the
      executor's commit.
- [x] The executor commits the work and does not modify `plans/README.md`.

## STOP conditions

Stop and report if:

- Correctness requires changing `buildFormDate` or persisted `starts_at` /
  `ends_at` values. That requires a separate storage-contract and backfill
  decision.
- The pre-fix AU/NZ tests pass, meaning the defect is no longer where this plan
  says it is.
- Existing production rows contain a different date/time encoding from both the
  form and inbound Xero carrier values shown above.
- Fixing the three duration paths consistently requires editing a file outside
  the two-file scope.
- Location lookup or holiday jurisdiction behaviour must be removed to make the
  tests pass.

## Maintenance notes

- These values reach payroll. Any future change to form date construction,
  inbound Xero date parsing, duration expansion or Xero date serialisation must
  preserve one explicit contract end to end.
- A reviewer should reject duration tests that exercise only `timezone: "UTC"`.
- Plan 054 addresses a separate all-day end convention at the feed horizon.
  Re-read its excerpts after this plan lands, but do not fold it into this diff.

## Review evidence from the blocked execution

- Isolated branch: `advisor/052-timezone-working-days`
- Worktree: `/tmp/teamcalendar-plan-052`
- Executor commit: `d1d4a94 fix(availability): preserve wall-clock working-day values`
- Scope: exactly `working-days.ts` and `working-days.test.ts`; worktree clean.
- Focused duration suite: 32/32 passed.
- Independent mutation check: restoring the pre-fix production file caused 12
  AU/NZ assertions to fail; restoring `d1d4a94` returned the suite to 32/32.
- Scoped Ultracite check on both changed files: passed.
- `bun run typecheck`: 19/19 tasks passed.
- `bun run test`: 17/17 tasks passed, including 280 availability tests.
- `bun run test:integration`: 5/5 tasks passed against the configured live test
  database, covering 60 integration tests.
- `git diff --check`: passed.
- Blocking gate, re-confirmed 2026-08-24: `bun run check` found the same 62
  diagnostics in files unchanged by `d1d4a94`. Scoped checks attribute 60 to
  the committed debug-route harness and two to temporary console output in
  `sync/_actions.ts`. Fixing those files is outside plan 052's two-file boundary
  and is now plan 075.
