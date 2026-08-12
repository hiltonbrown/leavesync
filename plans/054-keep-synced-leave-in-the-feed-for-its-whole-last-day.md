# Plan 054: Keep Xero-synced leave in the feed for the whole of its last day

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the next
> step. If anything in "STOP conditions" occurs, stop and report — do not
> improvise. When done, update this plan's row in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 121da2a..HEAD -- packages/feeds/src/projection packages/jobs/src/handlers/sync-xero-leave-records.ts`
> If any in-scope file changed, compare the "Current state" excerpts against the
> live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: MED
- **Depends on**: none. Land plan 053 first if both are queued — same handler file.
- **Category**: bug
- **Planned at**: commit `121da2a`, 2026-08-12

## Why this matters

Two write paths populate `ends_at` with different conventions for "the last day
of leave", and the feed projection's horizon filter turns that inconsistency
into a customer-visible defect.

A Xero-synced record's `ends_at` is **midnight** on the last day of leave. The
projection filters `ends_at > now`. So from one second past midnight UTC on the
final day — around 11am in Sydney — the record fails the filter and the event
disappears from the published ICS feed. Subscribers see the person as available
while they are still on approved leave. An identical record authored inside Team
Calendar, whose `ends_at` is `23:59:59.999`, survives the whole day.

The ICS *rendering* is already correct for both shapes. This is purely the
horizon filter meeting an inconsistent stored value.

## Current state

**Inbound convention** —
`packages/jobs/src/handlers/sync-xero-leave-records.ts:876-881`:

```ts
function parseXeroDate(value: string): Date | null {
  if (!DATE_ONLY_REGEX.test(value)) {
    return parseOptionalDateTime(value);
  }
  return parseOptionalDateTime(`${value}T00:00:00.000Z`);
}
```

**Team Calendar convention** —
`apps/app/app/(authenticated)/plans/_schemas.ts:130-132`: an all-day end is
`` `${date}T23:59:59.999Z` ``.

**The filter that exposes the difference** —
`packages/feeds/src/projection/feed-projection.ts:93` and `:107`:

```ts
const horizonStart = new Date();
// ...
where: {
  approval_status: "approved",
  archived_at: null,
  clerk_org_id: input.clerkOrgId,
  ends_at: { gt: horizonStart },
  // ...
}
```

**Rendering is already correct for both** —
`packages/feeds/src/projection/feed-projection.ts:171-179`:

```ts
function exclusiveAllDayEnd(inclusiveEnd: Date): Date {
  return new Date(
    Date.UTC(
      inclusiveEnd.getUTCFullYear(),
      inclusiveEnd.getUTCMonth(),
      inclusiveEnd.getUTCDate() + 1
    )
  );
}
```

For a Xero-sourced end of `2026-01-09T00:00:00Z` this yields `2026-01-10`, and
for a Team Calendar end of `2026-01-09T23:59:59.999Z` it also yields
`2026-01-10`. Both correct. Plan 042 established this behaviour; do not disturb it.

## The decision this plan makes

There are two possible fixes and they are **not** equivalent:

1. **Change the projection filter** to compare against the start of the current
   day rather than the current instant.
2. **Normalise inbound `ends_at`** to end-of-day on write.

This plan chooses **option 1**. Option 2 changes stored values, which alters
`source_remote_hash` comparisons and would mark every existing record as changed
on the next sync, triggering a mass feed-rebuild wave. Option 1 is behaviour-
preserving everywhere else and needs no migration.

Do not implement option 2 under this plan.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Lint | `bun run check` | exit 0 |
| Typecheck | `bun run typecheck` | exit 0 |
| Unit tests | `bun run test` | exit 0, 17/17 tasks |
| This package | `cd packages/feeds && bunx vitest run` | 10 files / 108 tests baseline, plus new |

## Scope

**In scope**:
- `packages/feeds/src/projection/feed-projection.ts`
- `packages/feeds/src/projection/feed-projection.test.ts`

**Out of scope**:
- `packages/jobs/src/handlers/sync-xero-leave-records.ts` — do not change
  `parseXeroDate`. See "The decision this plan makes".
- `exclusiveAllDayEnd` and anything else plan 042 established. The rendering is
  correct.
- `apps/app/app/(authenticated)/plans/_schemas.ts` — plan 052 owns that file.
- The KV cache invalidation policy. A filter change alters what a rebuild
  produces but not when rebuilds happen.

## Git workflow

- Branch: `advisor/054-feed-horizon-last-day`
- Conventional commits, e.g. `fix(feeds): keep leave published for its full last day`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add failing tests for both conventions

In `packages/feeds/src/projection/feed-projection.test.ts`, add cases with the
clock fixed to mid-morning UTC on the final day of leave:

1. A Xero-sourced approved record with `ends_at = <lastDay>T00:00:00.000Z`
   → must still be projected.
2. A Team Calendar-authored record with `ends_at = <lastDay>T23:59:59.999Z`
   → must still be projected (this already passes; it is the control).
3. A record that genuinely ended the previous day → must **not** be projected.

Use fake timers so the assertion does not depend on wall-clock time.

Run and confirm case 1 **fails** today.

**Verify**: `cd packages/feeds && bunx vitest run src/projection` → case 1 fails,
cases 2 and 3 pass.

### Step 2: Move the horizon start to the beginning of the current UTC day

Change `horizonStart` so the query filter compares against the start of today
rather than the current instant. Keep `horizonEnd` computed from the same base so
the horizon length is unchanged.

Be explicit that this is a **filter** change: the value used for
`horizonStart` in the `where` clause is the one that moves. If `horizonStart` is
also used to compute `horizonEnd` or is passed to the holiday query, check each
use site and keep the horizon width at `input.horizonDays`.

**Verify**: `bun run typecheck` → exit 0, and Step 1 case 1 now passes.

### Step 3: Confirm nothing else shifted

Run the whole feeds suite. The 108 existing tests must all still pass —
especially the plan 042 all-day boundary tests and any ETag or publication tests
that assume a particular record set.

**Verify**: `cd packages/feeds && bunx vitest run` → all pass, no regressions
against the 10 files / 108 tests baseline.

## Test plan

New cases in `packages/feeds/src/projection/feed-projection.test.ts`, modelled on
the existing projection tests in that file:

- Xero-sourced record on its last day, clock at 10:00 UTC → projected
- Team Calendar record on its last day, clock at 10:00 UTC → projected
- record whose last day was yesterday → not projected
- record starting tomorrow → projected (horizon start must not exclude future work)
- a record exactly at the far edge of `horizonDays` → still bounded as before

Verification: `bun run test` → exit 0, with at least 4 new tests, and the feeds
package at 108 + new.

## Done criteria

ALL must hold:

- [ ] `bun run check` exits 0
- [ ] `bun run typecheck` exits 0
- [ ] `bun run test` exits 0, 17/17 tasks
- [ ] `cd packages/feeds && bunx vitest run` passes with at least 112 tests
- [ ] `git diff packages/jobs/` is empty — `parseXeroDate` untouched
- [ ] Reverting only the Step 2 change makes the Xero-sourced last-day test fail
      (mutation check; restore afterwards)
- [ ] `git status --short` lists only the two in-scope files
- [ ] `plans/README.md` row updated

## STOP conditions

Stop and report if:

- `horizonStart` turns out to be used somewhere that genuinely needs the current
  instant rather than the start of the day. Report the use site; do not add a
  second variable without saying so.
- Moving the filter changes the ETag for feeds with no relevant records, which
  would mean the horizon value is leaking into the cache key in a way this plan
  did not anticipate.
- You conclude option 2 (normalising inbound `ends_at`) is the better fix. That
  may well be true long-term, but it needs a migration and rebuild-wave decision
  from the operator — report rather than implementing it.

## Maintenance notes

- The underlying inconsistency is still there: two write paths, two conventions
  for `ends_at`. This plan makes the feed robust to it; it does not remove it.
  If a third consumer of `ends_at` appears, it will hit the same trap. Unifying
  the conventions is the deferred follow-up, and it needs a backfill plan.
- A reviewer should confirm the horizon *width* is unchanged — it is easy to
  accidentally extend the feed by a day while fixing its start.
- Plan 052 fixes a related but distinct timezone defect in duration
  calculation. Neither plan fixes the other's problem.
