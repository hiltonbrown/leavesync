# Plan 044: Schedule bounded AU Xero synchronisation

> **Executor instructions**: This plan introduces cross-tenant orchestration.
> Read the tenancy and rate-limit constraints before editing. Follow each step,
> run its verification, and stop on any listed STOP condition. Update the plan
> status row when complete.
>
> **Drift check (run first)**:
> `git diff --stat b261792..HEAD -- PRODUCT.md packages/database packages/jobs 'apps/app/app/(authenticated)/settings/integrations/xero/connect'`
> If the scheduler or cadence now exists, reconcile rather than adding a second
> scheduler.

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: HIGH
- **Depends on**: plans 003 and 006 before activation; plans 007, 018 and 038
  before scheduling approval-state reconciliation
- **Category**: bug, jobs, direction
- **Planned at**: commit `b261792`, 2026-08-04

## Why this matters

The product is pull-first because Xero provides no leave webhooks. Today the
people, leave-record and leave-balance handlers run only when an event is sent.
No production scheduler sends those events, and a newly connected tenant gets
only an initial people event. Leave, balances and direct Xero changes can remain
stale indefinitely unless an admin manually starts each job.

This is a launch blocker for the core promise that Xero data stays current and
approved availability reaches subscribed calendars.

## Current state

- `PRODUCT.md:579-583` requires inbound sync every 15 minutes during business
  hours, every 60 minutes outside, hourly balances, and nightly reconciliation.
- `packages/jobs/src/handlers/sync-xero-people.ts:46-59` is event-triggered.
- `packages/jobs/src/handlers/sync-xero-leave-records.ts:105-120` is
  event-triggered.
- `packages/jobs/src/handlers/sync-xero-leave-balances.ts:73-88` is
  event-triggered.
- `packages/jobs/src/handlers/send-notification-emails.ts:5-15` is the only
  registered Inngest cron.
- `packages/jobs/src/functions.ts:11-20` registers no scheduler.
- `apps/app/app/(authenticated)/settings/integrations/xero/connect/_actions.ts`
  dispatches an initial people sync only, while its comment says scheduled
  syncs will catch up.
- `packages/database/prisma/schema.prisma:475-495` already stores pause and
  last-success timestamps needed for due-work decisions.

The existing event payload is the correct downstream contract:

```typescript
{
  clerkOrgId,
  organisationId,
  runType,
  triggerType: "scheduled",
  xeroTenantId,
}
```

Every downstream handler revalidates both tenant keys. Preserve that boundary.

## Cadence decision to encode

Use one coordinator cron every 15 minutes with up to five minutes of jitter.
For each active, unpaused AU tenant:

- people and leave records are due after 15 minutes from 07:00 through 18:59
  local time on weekdays;
- people and leave records are due after 60 minutes at other times;
- leave balances are due after 60 minutes at all times;
- approval reconciliation is due once per local night, between 01:00 and 02:59,
  only after plans 007, 018 and 038 are DONE;
- a null last-success timestamp is immediately due;
- a missing or invalid organisation timezone is a configuration error, not a
  reason to guess an Australian timezone.

This plan makes the previously undefined phrase “business hours” explicit.
Update `PRODUCT.md` with the chosen window. If the product owner rejects this
window, stop before implementation and record the replacement decision.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Scheduler tests | `bunx vitest run packages/jobs/src/handlers/schedule-xero-syncs.test.ts` | all pass |
| Event tests | `bunx vitest run packages/jobs/src/events.test.ts` | all pass |
| Connect tests | `bunx vitest run 'apps/app/app/(authenticated)/settings/integrations/xero/connect/_actions.test.ts'` | all pass |
| Jobs tests | `bunx vitest run packages/jobs` | all unit tests pass |
| Integration | `bun run test:integration` | exit 0 against disposable DB |
| Typecheck | `bun run typecheck` | exit 0 |
| Lint | `bun run check` | exit 0 |

## Suggested executor toolkit

- Use current Inngest official documentation for cron triggers, jitter,
  multi-tenant concurrency and event IDs. Event IDs deduplicate for 24 hours,
  so each ID must include tenant, run type and cadence slot.
- Match the Result, Zod and structured logging conventions in
  `packages/jobs/src/events.ts`.

## Scope

**In scope:**

- `PRODUCT.md` (business-hours definition only)
- `packages/database/src/queries/schedulable-xero-tenants.ts` (create)
- `packages/database/src/queries/schedulable-xero-tenants.test.ts` (create)
- `packages/database/package.json` only if a root export entry is required
- `packages/jobs/src/handlers/schedule-xero-syncs.ts` (create)
- `packages/jobs/src/handlers/schedule-xero-syncs.test.ts` (create)
- `packages/jobs/src/events.ts`
- `packages/jobs/src/events.test.ts`
- `packages/jobs/src/functions.ts`
- `packages/jobs/index.ts`
- `apps/app/app/(authenticated)/settings/integrations/xero/connect/_actions.ts`
- its co-located test

**Out of scope:**

- Changing Xero API rate limits.
- Supporting NZ or UK payroll writes.
- Enabling approval reconciliation before plans 007, 018 and 038 are DONE.
- Scheduling feed reconciliation or cache rebuild globally. Record changes
  already enqueue targeted feed work.
- Session/auth context inside a job.
- Unbounded `findMany` or one Inngest step containing all tenants.

## Git workflow

- Branch: `feat/scheduled-au-xero-sync`
- Commits:
  1. `feat(database): add bounded schedulable Xero tenant query`
  2. `feat(jobs): schedule due AU Xero syncs`
  3. `feat(app): enqueue the complete initial Xero sync`
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Add the single audited cross-tenant enumeration boundary

Create a database-package query that returns only the fields needed to emit
tenant-scoped events:

- `clerk_org_id`, `organisation_id`, tenant id and payroll region;
- organisation timezone;
- connection status/revocation state;
- pause and last-success timestamps.

The query must:

- include only active, non-archived organisations;
- include only active, non-revoked, non-disconnected connections;
- exclude paused tenants;
- include only AU for the launch slice;
- order by tenant id and page with a stable cursor;
- cap each page at 100.

This is the only deliberate system-level enumeration query. Document why it
cannot receive a session `clerk_org_id`: its job is to discover tenant keys,
then fan out isolated events. It must not return token ciphertext, people,
availability, payload JSON, or other tenant data.

Add tests with two Clerk organisations proving both appear as separate output
contexts, while paused, inactive and archived fixtures do not.

**Verify**: database query tests pass and the select contains no token columns.

### Step 2: Make event dispatch idempotent by cadence slot

Extend `dispatchSyncEvent` with an optional event ID. Pass it to
`inngest.send`. Keep manual callers unchanged.

For scheduled events, construct a deterministic ID from:

```text
scheduled-sync:<xeroTenantId>:<runType>:<UTC cadence slot>
```

The 15-minute slot must differ four times per hour. Hourly and nightly work use
hour/day slots. Do not include user data or secret values.

Add tests proving a slot is stable, the next slot differs, and two tenants or
run types never collide.

**Verify**: event tests pass.

### Step 3: Implement the bounded coordinator

Create `schedule-xero-syncs.ts` with:

- an Inngest cron trigger every 15 minutes and jitter;
- a small pure `dueRunTypes(tenant, now)` decision function;
- cursor-paged tenant enumeration;
- one durable step per page;
- batched event sends, capped so no send contains an unbounded tenant list;
- `triggerType: "scheduled"` and both tenant keys on every event;
- structured counts for scanned, dispatched, skipped and invalid-timezone
  tenants;
- no plaintext tokens or raw Xero payloads in logs.

Use rate-limit-aware staggering or concurrency keys so one tenant has no more
than five concurrent Xero operations and bulk launch does not produce an
app-wide burst. Match the repository's Xero rate-limit constants rather than
copying unexplained numbers.

For this step, schedule people, leave records and leave balances only.

**Verify**: scheduler tests cover due/not-due, weekday business hours,
after-hours, weekend, first sync, invalid timezone, paused/inactive tenant,
pagination, deterministic IDs and dispatch failure isolation.

### Step 4: Register the coordinator

Add the function to `packages/jobs/src/functions.ts` and the appropriate root
export. Assert its registered ID and cron in a unit test.

**Verify**: jobs tests pass and the function list contains exactly one sync
coordinator.

### Step 5: Enqueue the complete initial sync after Xero connection

After a successful tenant connection, enqueue people, leave-record and
leave-balance events with `triggerType: "manual"` or a dedicated bootstrap
value only if the shared schema is deliberately extended. Do not report the
connection as failed when a best-effort enqueue fails; log it and let the
scheduler recover, matching the current intent.

Use deterministic bootstrap event IDs so a repeated confirmation does not
duplicate work.

**Verify**: the connect action test asserts all three event types with both
tenant keys.

### Step 6: Enable nightly approval reconciliation only after its prerequisites

Drift-check and execute plans 007, 018 and 038 first. Once all are DONE, add the
nightly due decision and event dispatch to the coordinator. Until then, keep
the code path absent rather than hiding an unsafe trigger behind a boolean.

**Verify**: reconciliation is dispatched once per local day only after the
bounded handler is in place.

### Step 7: Run full gates and a disposable-database integration test

Run every command in the table. The integration test must create at least two
tenants, run one scheduler page, capture emitted events, and prove every event
contains the matching Clerk Organisation and Organisation ids.

## Test plan

- Pure cadence boundaries and timezone/DST behaviour.
- Null last-sync timestamps.
- Paused, inactive, disconnected, revoked and non-AU tenants.
- Stable cursor pagination beyond 100 tenants.
- Deterministic event IDs and duplicate coordinator runs.
- One tenant dispatch failure does not drop the rest.
- Complete initial sync on connection.
- Nightly reconciliation dependency gate.
- Cross-tenant integration assertion on every emitted payload.

## Done criteria

- [x] Active AU tenants receive scheduled people, leave and balance events.
- [x] Paused/inactive tenants receive none.
- [x] Every event carries matching `clerkOrgId`, `organisationId` and
      `xeroTenantId`.
- [x] Coordinator work is paginated, staggered and idempotent.
- [x] Initial connection enqueues all three inbound jobs.
- [x] Nightly approval reconciliation is absent until plans 007, 018 and 038
      are DONE, then is tested and enabled.
- [x] Full repository and integration gates pass.
- [x] No token ciphertext, raw payload or user data enters scheduler logs.

## STOP conditions

- The product owner rejects the documented business-hours window.
- Organisation timezone is not reliably populated for launch tenants.
- Inngest event IDs or concurrency semantics differ from the current official
  documentation.
- A bounded tenant enumerator cannot be isolated inside `@repo/database`.
- Activation would precede plans 003 and 006.
- Approval reconciliation would precede plans 007, 018 and 038.

## Maintenance notes

The coordinator is a system boundary, not a tenant-data service. Keep its
select minimal and its fan-out explicit. Review Xero quotas before changing
cadence or batch size, and alert on scheduler freshness rather than relying on
the API liveness endpoint.
