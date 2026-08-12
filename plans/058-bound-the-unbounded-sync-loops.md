# Plan 058: Bound the two sync loops that cannot finish for a large tenant

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the next
> step. If anything in "STOP conditions" occurs, stop and report — do not
> improvise. When done, update this plan's row in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 121da2a..HEAD -- packages/jobs/src/handlers/sync-xero-leave-balances.ts packages/jobs/src/handlers/sync-xero-leave-records.ts packages/xero/src/au/read.ts`
> If any in-scope file changed, compare the "Current state" excerpts against the
> live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: plan 053 (same file for the archive half; land 053 first)
- **Category**: bug, perf
- **Planned at**: commit `121da2a`, 2026-08-12
- **Covers findings**: C-07, P-04

## Why this matters

Two loops in the sync handlers have no ceiling, and both fail in the same shape:
they work fine in testing and cannot complete at all past a certain tenant size.

**Balance sync.** It loads every non-archived person with a Xero employee id, no
`take` and no cursor, then fetches balances one employee at a time with a
deliberate one-second gap to respect Xero's 60-calls-per-minute limit. Xero
access tokens live 30 minutes, and the connection is refreshed **once**, before
the loop starts. Past roughly 1,500 employees the run outlives its token, every
subsequent request fails auth, and the run aborts — discarding every balance
fetched up to that point, because the failure happens before any persistence.
It fails at the same point every time, so the tail of the employee list never
gets balances. Balances are what the approver's remaining-balance display
depends on.

**Stale-record archive.** A Xero-side bulk change can mark thousands of records
stale in one run. The handler inlines every fetched remote id into a single
`NOT IN`, then materialises publications strictly one record at a time — two
Postgres round trips each — inside one Inngest step. That is the standard path to
a step timeout, after which Inngest retries and repeats the whole thing.

The one-second pacing is **correct and deliberate** and must not be removed; it
is what keeps the sync inside Xero's rate limit.

## Current state

**Balance sync** — `packages/jobs/src/handlers/sync-xero-leave-balances.ts:130-138`:

```ts
const people = await database.person.findMany({
  select: { id: true, xero_employee_id: true },
  where: {
    ...scoped(context),
    archived_at: null,
    ...(context.personId ? { id: context.personId } : {}),
    xero_employee_id: { not: null },
  },
});
```

No `take`, no cursor. The whole list then goes into one call at `:149-152`, and
a failure at `:153-165` completes the run as `failed` **before** `processBalances`
runs, so nothing fetched is persisted.

`ensureFreshXeroConnection` is called exactly once, at `:481`. Verified:
`grep -n "ensureFreshXeroConnection"` in that file returns the import and that
single call site.

The pacing, `packages/xero/src/au/read.ts:28-34`:

```ts
// Xero permits 60 calls/min per connected organisation. Space the per-employee
// detail reads at least this far apart so a full balance sync stays within that
// ceiling instead of bursting into a 429 partway through.
const XERO_CALLS_PER_MINUTE = 60;
const LEAVE_BALANCE_READ_INTERVAL_MS = Math.ceil(60_000 / XERO_CALLS_PER_MINUTE);
```

and the loop at `:249-253`.

**Stale archive** — `packages/jobs/src/handlers/sync-xero-leave-records.ts:710-718`:

```ts
const stale = await database.availabilityRecord.findMany({
  select: { id: true, person_id: true },
  where: {
    ...scoped(context),
    archived_at: null,
    source_remote_id: { notIn: fetchedRemoteIds },
    source_type: "xero_leave",
  },
});
```

The archive write itself is already a single `updateMany` (`:723-734`) — that
part is fine. The problem is the loop at `:739-751`, one
`materialiseSyncedPublication` per record, each of which is a `findFirst` plus a
`create`/`update` in `packages/feeds/src/publication/publication-service.ts:41,56`.

**The bounding pattern to copy** is the one plan 034 established in
`packages/jobs/src/handlers/reconcile-feed-publications.ts` — read it before
writing this change.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Lint | `bun run check` | exit 0 |
| Typecheck | `bun run typecheck` | exit 0 |
| Unit tests | `bun run test` | exit 0, 17/17 tasks |
| These handlers | `cd packages/jobs && bunx vitest run src/handlers/sync-xero-leave-balances.test.ts src/handlers/sync-xero-leave-records.test.ts` | all pass |

## Scope

**In scope**:
- `packages/jobs/src/handlers/sync-xero-leave-balances.ts` and its `.test.ts`
- `packages/jobs/src/handlers/sync-xero-leave-records.ts` and its `.test.ts`
  (the archive function only)

**Out of scope**:
- `packages/xero/src/au/read.ts` — do **not** change the pacing constant or the
  loop. It is deliberate rate-limit compliance.
- The inbound upsert guard in `sync-xero-leave-records.ts` — plan 053 owns it.
  If 053 has not landed, expect to rebase.
- `packages/feeds/src/publication/publication-service.ts` — batching the
  publication upsert is desirable but changes a shared service used by other
  callers. Do it by calling it fewer times, not by rewriting it.
- `packages/jobs/src/handlers/reconcile-xero-approval-state.ts` — plan 056 owns it.

## Git workflow

- Branch: `advisor/058-bound-sync-loops`
- Conventional commits, e.g. `fix(jobs): page the balance sync and refresh its token`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add failing tests for both loops

In `sync-xero-leave-balances.test.ts`:
- seed more people than one page; assert the handler pages through them
- assert `ensureFreshXeroConnection` is called more than once for a
  multi-page run
- assert balances from an early page are **persisted** even when a later page
  fails, rather than the whole run discarding them

In `sync-xero-leave-records.test.ts`:
- seed more stale records than the archive cap; assert the run archives at most
  the cap and reports a remaining count

Run and confirm all four fail today.

**Verify**: `cd packages/jobs && bunx vitest run src/handlers/sync-xero-leave-balances.test.ts src/handlers/sync-xero-leave-records.test.ts`
→ the new cases fail as described.

### Step 2: Page the balance sync and persist per page

Chunk the employee list into pages. For each page: check connection freshness,
fetch, then **persist that page's balances before moving on**. The existing
`onProgress` heartbeat and `processBalances` already support incremental work —
use them rather than inventing new machinery.

Pick the page size so a page comfortably completes inside the token lifetime at
one second per employee. State the arithmetic in a comment: at 1 call/second, a
page of N employees takes N seconds, and the token has 30 minutes minus the
5-minute refresh buffer.

**Verify**: the first two Step 1 cases pass.

### Step 3: Re-check token freshness at each page boundary

Call `ensureFreshXeroConnection` at the start of each page and reload the tenant
if it refreshed, so a long tenant never carries a lapsed token into a page.

Do not call it per employee — that defeats the point of the freshness buffer.

**Verify**: the third Step 1 case passes — an auth failure on a later page leaves
earlier pages persisted.

### Step 4: Bound and batch the stale archive

Take a bounded page of stale records with an explicit `MAX_ARCHIVE_PER_RUN`
constant, documented the way `MAX_REQUESTS_PER_RUN` is in the approval
reconciler. Replace the strictly sequential publication loop with bounded
concurrency, following plan 034's pattern in
`reconcile-feed-publications.ts`.

Keep the existing per-record `try/catch`: a single publication failure must still
not abort the run. That behaviour is correct and load-bearing.

Report a `remaining` count so the next scheduled run finishes the job.

**Verify**: the fourth Step 1 case passes; `bun run test` → exit 0, 17/17 tasks.

## Test plan

New cases as listed in Step 1, plus:

- a single-page run behaves exactly as today (no regression for small tenants)
- `context.personId` single-person mode still short-circuits correctly
- the archive cap of exactly `MAX_ARCHIVE_PER_RUN` records reports
  `remaining: 0`, not a spurious continuation
- a publication failure inside a batch is logged and does not abort the run

Follow the existing structure of both handler test files. Verification:
`bun run test` → exit 0, with at least 8 new tests.

## Done criteria

ALL must hold:

- [ ] `bun run check` exits 0
- [ ] `bun run typecheck` exits 0
- [ ] `bun run test` exits 0, 17/17 tasks, with at least 8 new tests
- [ ] `grep -c "ensureFreshXeroConnection" packages/jobs/src/handlers/sync-xero-leave-balances.ts`
      shows the call inside the paging loop, not only before it
- [ ] `git diff packages/xero/src/au/read.ts` is empty — pacing untouched
- [ ] `grep -c "MAX_ARCHIVE_PER_RUN" packages/jobs/src/handlers/sync-xero-leave-records.ts`
      prints 2 or more (definition plus use)
- [ ] Both handlers report a remaining/continuation figure when they hit a cap
- [ ] `git status --short` lists only the four in-scope files
- [ ] `plans/README.md` row updated

## STOP conditions

Stop and report if:

- Persisting per page turns out to conflict with how `sync_runs` counters are
  finalised, such that a partially persisted run cannot be represented honestly.
  Report the counter shape; do not invent a new run status.
- Bounding the archive means stale records linger in feeds for longer than a
  scheduling interval. That is a real trade-off and the operator should know the
  number before it ships.
- Plan 053 has not landed and its guard would conflict with your diff in the same
  file. Rebase or report; do not implement 053's change here.
- Removing the one-second pacing looks tempting. It is not an option.

## Maintenance notes

- The invariant worth stating in review: any loop over tenant-sized data inside
  an Inngest step needs a cap, a continuation, and per-page persistence. Three
  handlers now follow that shape (plans 034, 038/056, and this one).
- If Xero's rate limit or token lifetime changes, the page-size arithmetic in
  Step 2's comment is the thing to revisit.
- Deliberately deferred: batching `materialiseAvailabilityPublication` itself.
  That is a shared service with other callers and deserves its own change.
