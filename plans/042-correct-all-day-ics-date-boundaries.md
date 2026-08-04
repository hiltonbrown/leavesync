# Plan 042: Correct all-day ICS date boundaries

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on. If a
> STOP condition occurs, stop and report rather than changing the canonical
> date model. Update this plan's row in `plans/README.md` when complete.
>
> **Drift check (run first)**:
> `git diff --stat b261792..HEAD -- packages/feeds/src/projection/feed-projection.ts packages/feeds/src/projection/feed-projection.test.ts packages/feeds/src/render/render-feed.test.ts`
> Reconcile any changed all-day date handling before editing.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: MED
- **Depends on**: none
- **Category**: bug, feeds
- **Planned at**: commit `b261792`, 2026-08-04

## Why this matters

Team Calendar stores availability end dates inclusively. An all-day form stores
the selected last day at `23:59:59.999`, while an inbound Xero date-only end is
stored at midnight on the named last day. ICS `DTEND;VALUE=DATE` is exclusive.
Passing either canonical shape directly to `ical-generator` produces a
zero-duration one-day event or drops the final day from a multi-day event.

Public holidays are already projected with an exclusive end. The fix belongs
at the availability-to-publication projection boundary and must not change the
database representation, UID formula, Xero mapping, form semantics, or public
holiday path.

## Current state

- `apps/app/app/(authenticated)/plans/_schemas.ts:125-134` stores an all-day
  form end at `23:59:59.999` on the selected final date.
- `packages/jobs/src/handlers/sync-xero-leave-records.ts:842-846` stores a Xero
  date-only end at midnight on the named final date.
- `packages/feeds/src/projection/feed-projection.ts:171-201` copies
  `record.ends_at` directly into the projected event.
- `packages/feeds/src/render/render-feed.ts:63-75` passes that value to
  `ical-generator` with `allDay: true`.
- `packages/feeds/src/projection/feed-projection.ts:277-278` already advances
  public-holiday ends by one day. Do not advance those a second time.

The relevant current projection is:

```typescript
return {
  allDay: record.all_day,
  endsAt: record.ends_at,
  isPublicHoliday: false,
  startsAt: record.starts_at,
  // ...
};
```

The renderer then uses:

```typescript
calendar.createEvent({
  allDay: event.allDay,
  end: event.endsAt,
  start: event.startsAt,
  // ...
});
```

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Focused tests | `bunx vitest run packages/feeds/src/projection/feed-projection.test.ts packages/feeds/src/render/render-feed.test.ts` | all tests pass |
| Package tests | `bunx vitest run packages/feeds` | all unit tests pass |
| Typecheck | `bun run typecheck` | exit 0 |
| Lint | `bun run check` | exit 0 |

## Scope

**In scope:**

- `packages/feeds/src/projection/feed-projection.ts`
- `packages/feeds/src/projection/feed-projection.test.ts`
- `packages/feeds/src/render/render-feed.test.ts`

**Out of scope:**

- Form parsing and canonical storage in `apps/app`.
- Xero date parsing in `packages/jobs`.
- Prisma schema or migrations.
- UID and SEQUENCE rules.
- Public-holiday projection semantics.
- Timed events. They retain their exact timestamps.

## Git workflow

- Branch: `fix/all-day-ics-exclusive-end`
- Commit: `fix(feeds): emit exclusive end dates for all-day events`
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Pin the broken calendar contract with tests

In `feed-projection.test.ts`, add availability-record cases for:

1. A one-day all-day record from `2026-05-07T00:00:00.000Z` through
   `2026-05-07T23:59:59.999Z`. The projected end must be
   `2026-05-08T00:00:00.000Z`.
2. A three-day all-day record whose canonical end is midnight on the named
   final Xero date. The projected end must be midnight on the following day.
3. A timed record. Its end must remain byte-for-byte unchanged.
4. A public holiday. Its existing one-day exclusive end must remain unchanged.

In `render-feed.test.ts`, add an exact serialisation assertion for a one-day
all-day event:

```text
DTSTART;VALUE=DATE:20260507
DTEND;VALUE=DATE:20260508
```

Add the equivalent multi-day assertion. Do not use a broad snapshot when exact
date lines express the contract more clearly.

**Verify**: run the focused test command. The new availability projection test
must fail before the fix for the expected end-date mismatch.

### Step 2: Convert inclusive availability ends at projection time

Add a small named helper in `feed-projection.ts` that converts an inclusive
all-day canonical end to the following UTC midnight. Construct the result from
`Date.UTC(year, month, day + 1)` so a `23:59:59.999` local-form value and a
midnight Xero value converge on the same exclusive ICS boundary.

Call it only from `projectAvailabilityRecord` when `record.all_day` is true.
Leave timed records and `projectPublicHolidays` untouched.

**Verify**: the focused tests all pass.

### Step 3: Run the package and repository gates

Run the package tests, typecheck and lint commands from the table above.

**Expected**: every command exits 0 and no unrelated file changes.

## Test plan

- One-day local all-day record.
- Multi-day Xero-shaped all-day record.
- Timed record regression guard.
- Public-holiday no-double-extension guard.
- Exact one-day and multi-day ICS `DTSTART` and `DTEND` lines.

Use the existing factories and database mocks in
`feed-projection.test.ts`; use the existing mocked projection pattern in
`render-feed.test.ts`.

## Done criteria

- [ ] A one-day availability record serialises with the next calendar day as
      `DTEND;VALUE=DATE`.
- [ ] A multi-day record includes its selected final day.
- [ ] Timed records are unchanged.
- [ ] Public holidays are not extended twice.
- [ ] Focused and package tests, `bun run typecheck`, and `bun run check` pass.
- [ ] Only in-scope files and the plan status row changed.

## STOP conditions

- The canonical model has changed to store exclusive ends since `b261792`.
- `ical-generator` no longer treats all-day ends as exclusive.
- Correctness requires changing UID inputs or persisted dates.
- A public-holiday regression cannot be avoided without changing its projection.

## Maintenance notes

Any new all-day source must declare whether its end is inclusive before it
reaches feed projection. Reviewers should reject source-specific day additions
inside the renderer; the projection boundary owns this conversion.
