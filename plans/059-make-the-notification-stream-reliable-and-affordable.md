# Plan 059: Make notification stream failures visible and reduce idle polling

> **Executor instructions**: Follow this plan in order. Run each verification
> command before proceeding. Stop on a STOP condition rather than improvising.
> Update this plan and `plans/README.md` when complete.
>
> **Drift check (run first)**:
> `git diff --stat ecd49f5..HEAD -- apps/api/app/api/notifications/stream packages/notifications/src/sse`
> Any in-scope drift requires re-reading the live implementation before work.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: none. Complete before Plan 083, which touches the transport.
- **Category**: bug, performance
- **Planned at**: commit `ecd49f5`, 2026-08-24
- **Covers findings**: C-08, P-02

## Why this matters

The SSE route discards polling failures and keeps emitting keep-alives. A broken
event store therefore looks healthy to the browser and notifications can stop
permanently. Each open connection also polls the REST-backed stream every two
seconds while idle.

The former duplicate `NotificationsProvider` is already gone: the authenticated
layout owns the only provider and the notifications page no longer creates one.
That resolved finding is not part of this continuation plan.

## Current state

At the planning commit:

- `apps/api/app/api/notifications/stream/route.ts` seeds `lastId` with
  `${Date.now()}-0`, polls every two seconds and sends keep-alives every 25
  seconds.
- Both calls to `pollEvents()` end with `.catch(() => undefined)`, so transport
  failures are invisible.
- `packages/notifications/src/sse/redis-stream.ts` performs one REST `xrange`
  request per poll and surfaces non-successful responses as errors.
- `packages/notifications/components/provider.tsx` already reconnects with
  backoff when the `EventSource` closes.

## Commands you will need

| Purpose | Command | Expected result |
|---|---|---|
| Focused tests | `cd apps/api && bunx vitest run app/api/notifications/stream/route.test.ts` | all pass |
| Checks | `bun run check && bun run typecheck` | exit 0 |
| Unit suite | `bun run test` | exit 0 |
| Integration suite | `bun run test:integration` | exit 0 |

## Scope

**In scope**:

- `apps/api/app/api/notifications/stream/route.ts`
- its co-located test
- `packages/notifications/src/sse/redis-stream.ts` and its test only if a test
  proves the transport currently hides an error

**Out of scope**:

- the already-correct provider ownership in the authenticated layout
- persisted per-user stream positions
- changing away from the current Redis REST transport
- Redis configuration and shared transport extraction, owned by Plan 083

## Git workflow

- Base branch: `preview` (`origin/preview`), not `main`. Branch from `preview`, commit there, and land the finished work on `preview` — see `plans/README.md` § Execution policy.
- Work directly in this working tree. No isolated git worktree is used for this repo's plan executions.
- Branch: `advisor/059-sse-reliability`
- Suggested commit: `fix(api): surface notification stream failures`
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Characterise failure and timer behaviour

Use fake timers and a mocked `pollNotificationStream` to add failing cases for:

1. three consecutive failures close the stream;
2. a success resets the consecutive-failure count;
3. sustained idleness increases the poll delay;
4. receiving an event restores the short delay;
5. stream cancellation clears every scheduled timer.

Do not assert internal implementation details when observable chunks, closure
and poll calls are sufficient.

### Step 2: Replace swallowed errors with an explicit failure policy

Introduce named constants for the short delay, idle delay, idle threshold and
maximum consecutive failures. Log each failed poll with opaque Clerk user and
organisation identifiers. After the threshold, stop scheduling polls and error
the stream so the browser's existing reconnect path takes over. Reset the count
after a successful poll.

Use a recursive `setTimeout` scheduled after each poll, not `setInterval`, so a
slow request cannot overlap the next one. The cancellation path must be
idempotent.

### Step 3: Back off idle connections

Keep the current two-second cadence while events are moving. After one minute
without an event, use a ten-second cadence; return to two seconds immediately
after an event. Keep the 25-second SSE comment interval because it serves a
different connection-liveness purpose.

### Step 4: Preserve the replay contract honestly

Do not claim wall-clock seeding closes the page-load race. Inspect whether the
browser supplies `Last-Event-ID` on reconnect and, if present, validate and use
it. When no position is available, retain the current wall-clock fallback and
document that this stream is live notification delivery, not durable replay.
Persisted replay is a separate product and storage decision.

### Step 5: Run all gates and inspect scope

Run the focused test, four repository gates and `git diff --check`. Confirm no
provider or page files changed.

## Test plan

- consecutive errors close and log after the named threshold
- an intermittent success resets the threshold
- no event for one minute selects the idle cadence
- an event restores the active cadence
- cancellation and terminal failure clear all timers
- a valid reconnect position is honoured, malformed input uses the documented
  fallback
- a successful poll still emits and advances event IDs

## Done criteria

- [ ] Focused tests pass with deterministic fake timers.
- [ ] `bun run check`, `bun run typecheck`, `bun run test` and
      `bun run test:integration` pass.
- [ ] No `.catch(() => undefined)` remains on stream polling.
- [ ] Polls cannot overlap.
- [ ] Failure and idle policies use named constants.
- [ ] The stream errors after repeated store failures instead of sending
      healthy-looking keep-alives forever.
- [ ] Provider and notifications page files are unchanged.
- [ ] `git diff --check` passes and `plans/README.md` is updated.

## STOP conditions

Stop and report if:

- the runtime does not deliver a trustworthy reconnect position;
- `controller.error()` produces an unsafe double-close path that cannot be
  solved with one idempotent cleanup function;
- fake-timer tests reveal timer behaviour that differs between the supported
  runtimes;
- the implementation requires a different Redis command or configuration,
  which belongs in Plan 083.

## Maintenance notes

Keep-alives prove only that the HTTP connection exists. They must not continue
after the source of truth has crossed the terminal failure threshold.
