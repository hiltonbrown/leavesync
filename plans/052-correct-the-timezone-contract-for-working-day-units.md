# Plan 052: Stop writing wrong working-day units into Xero payroll

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the next
> step. If anything in "STOP conditions" occurs, stop and report — do not
> improvise. When done, update this plan's row in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 121da2a..HEAD -- packages/availability/src/duration "apps/app/app/(authenticated)/plans"`
> If any in-scope file changed, compare the "Current state" excerpts against the
> live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none (run plan 051 first if the integration lane is needed)
- **Category**: bug
- **Planned at**: commit `121da2a`, 2026-08-12

## Why this matters

The number of working days Team Calendar writes into a customer's Xero payroll
file is wrong for every organisation whose location timezone is not UTC — which
is every AU and NZ customer, the only regions with write-back today.

Two things disagree. The form builds a **UTC instant** from what the user typed
as local wall-clock time. The duration calculator then reinterprets that instant
**in the location's timezone**. In `Australia/Sydney`, `Australia/Brisbane` and
`Pacific/Auckland` the all-day end instant `…T23:59:59.999Z` lands on the
*following* calendar day, so an all-day request counts one extra working day
whenever that next day is a weekday. A timed request is worse: `09:00Z–17:00Z`
becomes `20:00–04:00` local, which has zero overlap with the 09:00–17:00 working
window, so the request submits **0 units**.

Those units go to Xero as payroll data and drive the approver's remaining
balance. The client-side preview computes in pure UTC and shows the *correct*
number, so the UI and the payroll write silently disagree — the user has no
signal anything is wrong.

## Current state

**Where the instants are built** —
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

**Where they are reinterpreted** —
`packages/availability/src/duration/working-days.ts:89-91`:

```ts
const timezone = location.timezone ?? "UTC";
const startParts = getLocalDateParts(input.startsAt, timezone);
const endParts = getLocalDateParts(input.endsAt, timezone);
```

`getLocalDateParts` (`working-days.ts:422-449`) formats the instant with
`Intl.DateTimeFormat` in `timezone` and returns `dateOnly`. The loop at
`working-days.ts:111-123` then iterates
`dateRange(startParts.dateOnly, endParts.dateOnly)` inclusively, adding 1 per
working day for all-day records and `fractionalWorkingDay(...)` otherwise.

**Where the result goes** —
`packages/availability/src/plans/submit-service.ts:461-471` calls
`computeWorkingDays` and passes the value to Xero as `units` (`:339`).

**Confirmed by execution**, not inference:

| Instant | Timezone | Local date |
|---|---|---|
| `2026-01-07T23:59:59.999Z` | `Australia/Sydney` | **08/01/2026** |
| `2026-01-07T23:59:59.999Z` | `Australia/Brisbane` | **08/01/2026** |
| `2026-01-07T23:59:59.999Z` | `Pacific/Auckland` | **08/01/2026** |
| `2026-01-07T23:59:59.999Z` | `Europe/London` | 07/01/2026 |
| `2026-01-05T09:00:00.000Z` | `Australia/Sydney` | hour **20** |
| `2026-01-05T17:00:00.000Z` | `Australia/Sydney` | hour **04** |

**Why no test caught it**: the only duration fixture,
`packages/availability/src/duration/working-days.test.ts:30`, uses
`timezone: "UTC"`, where the bug cannot manifest.

**Seed data proves the target configuration is affected**:
`packages/database/src/seed/data.ts:93,100,173` use `Australia/Brisbane` and
`:184,222` use `Australia/Sydney`.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Lint | `bun run check` | exit 0 |
| Typecheck | `bun run typecheck` | exit 0 |
| Unit tests | `bun run test` | exit 0, 17/17 tasks |
| This package only | `cd packages/availability && bunx vitest run src/duration` | all pass |

## Scope

**In scope**:
- `packages/availability/src/duration/working-days.ts`
- `packages/availability/src/duration/working-days.test.ts`
- `apps/app/app/(authenticated)/plans/_schemas.ts`
- `apps/app/app/(authenticated)/plans/record-form.tsx` (the preview only)

**Out of scope** even though they look related:
- **The stored column semantics of `starts_at` / `ends_at`.** Changing what is
  *stored* would ripple into the feed projection, the calendar, the inbound sync
  and `source_remote_hash` change detection, and would require a backfill
  decision. This plan fixes *interpretation*, not storage. Plan 054 handles the
  separate feed-side inconsistency.
- `packages/jobs/src/handlers/sync-xero-leave-records.ts` — inbound date parsing
  is plan 054's territory.
- The approval-side balance display. It consumes the corrected number
  automatically once this lands.

## Git workflow

- Branch: `advisor/052-timezone-working-days`
- Conventional commits, e.g. `fix(availability): interpret leave dates in the location timezone`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Pin the current wrong behaviour with failing tests

Before changing any production code, add tests to
`packages/availability/src/duration/working-days.test.ts` parameterised over
`Australia/Sydney`, `Pacific/Auckland` and `Europe/London`, covering:

1. An all-day request Mon 5 Jan 2026 to Wed 7 Jan 2026 → expect **3**.
2. An all-day request ending on a Friday → expect no weekend spill.
3. A timed request 09:00–17:00 local on a single weekday → expect **1**.
4. A timed half-day 09:00–13:00 local → expect **0.5**.

Run them and confirm they **fail** in the AU/NZ timezones and pass in UTC. A
test that passes before the fix is not testing this bug.

**Verify**: `cd packages/availability && bunx vitest run src/duration` → the new
AU/NZ cases fail with the over-count and the zero-unit results described above.

### Step 2: Make the wall-clock contract explicit and timezone-aware

Change `buildFormDate` so the instant it produces round-trips back to the date
and time the user typed when read in the organisation's timezone, rather than
being pinned to `Z`. The form already knows the record's person; the location
timezone must reach this function rather than being assumed.

The target property, stated as an invariant to hold in tests:
`getLocalDateParts(buildFormDate(d, t, allDay, isEnd), tz).dateOnly === d` for
every timezone under test.

If threading the timezone into `buildFormDate` turns out to require restructuring
the form's data flow more than trivially, STOP and report rather than
half-threading it.

**Verify**: `bun run typecheck` → exit 0.

### Step 3: Make the calculator agree

With Step 2 in place, re-run the Step 1 tests. They must now pass in all three
timezones. Do not "fix" the calculator by special-casing `23:59:59.999` — that
reintroduces the same class of bug the moment a different end convention appears.

**Verify**: `cd packages/availability && bunx vitest run src/duration` → all
pass, including the new AU/NZ cases.

### Step 4: Align the client preview with the server

`apps/app/app/(authenticated)/plans/record-form.tsx:574-596`
(`estimateWorkingDays`) computes in pure UTC. Once the server is correct, the
preview must use the same rule, or the UI will now disagree in the opposite
direction. Make it call the same shared logic, or delete the local estimate and
show the server-computed value.

**Verify**: `bun run test` → exit 0, 17/17 tasks.

## Test plan

New tests in `packages/availability/src/duration/working-days.test.ts`,
following the structure of the existing fixture at `:30` but parameterised over
timezone:

- all-day, 3 weekdays, in `Australia/Sydney`, `Pacific/Auckland`, `Europe/London`, `UTC`
- all-day ending Friday (no weekend spill), same four timezones
- timed 09:00–17:00 local, single weekday → 1
- timed 09:00–13:00 local → 0.5
- all-day spanning a public holiday, confirming holiday exclusion still applies
- the round-trip invariant from Step 2

Verification: `bun run test` → exit 0, with at least 8 more tests than the
Step 1 baseline.

## Done criteria

ALL must hold:

- [ ] `bun run check` exits 0
- [ ] `bun run typecheck` exits 0
- [ ] `bun run test` exits 0, 17/17 tasks, with at least 8 new duration tests
- [ ] `grep -c 'timezone: "UTC"' packages/availability/src/duration/working-days.test.ts`
      is no longer the only timezone appearing in that file; `Australia/Sydney`
      and `Pacific/Auckland` both appear
- [ ] Reverting only the Step 2/3 production change makes the new AU/NZ tests
      fail (run this as a mutation check and restore afterwards)
- [ ] `git status --short` lists only the four in-scope files
- [ ] `plans/README.md` row updated

## STOP conditions

Stop and report if:

- Threading the timezone into `buildFormDate` requires changing what is stored in
  `starts_at` / `ends_at`. That is explicitly out of scope and needs a backfill
  decision from the operator.
- You discover existing production rows would need migrating for the new
  interpretation to be correct. Report the row-shape evidence; do not write a
  migration under this plan.
- The assumption "`location.timezone` is populated for AU customers" turns out
  to be false and locations are relying on the `?? "UTC"` fallback. That changes
  the severity and the correct fix; report it.
- Step 1's tests pass before the fix. That means the bug is not where this plan
  says it is — re-read and report.

## Maintenance notes

- This is the highest-consequence date code in the product: its output is
  payroll data. Any future change to `buildFormDate`, `getLocalDateParts` or the
  `dateRange` loop needs the timezone-parameterised tests re-run, not just the
  UTC ones.
- A reviewer should check that no new test in this area uses `timezone: "UTC"`
  as its only case — that is precisely what masked this defect.
- Plan 054 fixes a *different* date inconsistency (inbound vs Team Calendar
  `ends_at` conventions meeting the feed horizon filter). The two plans touch
  adjacent concepts; land this one first and re-read 054's excerpts afterwards.
- Deliberately deferred: unifying the stored `ends_at` convention across the two
  write paths. Recorded as the maintenance question behind both this plan and 054.
