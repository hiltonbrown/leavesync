# Plan 059: Make the notification stream fail loudly and stop paying for two of them

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the next
> step. If anything in "STOP conditions" occurs, stop and report — do not
> improvise. When done, update this plan's row in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 121da2a..HEAD -- apps/api/app/api/notifications packages/notifications "apps/app/app/(authenticated)/notifications"`
> If any in-scope file changed, compare the "Current state" excerpts against the
> live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: bug, perf
- **Planned at**: commit `121da2a`, 2026-08-12
- **Covers findings**: C-08, P-02

## Why this matters

**Reliability.** The SSE endpoint discards every polling error and keeps sending
keep-alive comments regardless. If the notification event store becomes
unreachable, the connection stays `open`, the client's provider reports a healthy
status, and nothing is ever delivered. Because the client already implements
exponential-backoff reconnect, swallowing the error converts a transient outage
into a **silent permanent** one for every connected session — strictly worse than
failing.

**Cost.** Each connection polls KV every 2 seconds forever, whether or not
anything is happening: roughly 30 REST requests per minute, 43k per day, per
user, billed per request. On top of that, the notifications page nests a second
`NotificationsProvider` inside the one the authenticated layout already provides.
Nesting shadows the React context but does not close the outer `EventSource`, so
a user sitting on that page holds two streaming functions open and doubles the
poll cost.

## Current state

`apps/api/app/api/notifications/stream/route.ts:101-132`:

```ts
let lastId = `${Date.now()}-0`;
let polling = false;
const pollEvents = async (): Promise<void> => {
  if (polling) { return; }
  polling = true;
  try {
    const events = await pollNotificationStream(
      { organisationId: organisation.id, userId: user.id },
      lastId
    );
    for (const entry of events) {
      lastId = entry.id;
      safeEnqueue(/* ... */);
    }
  } finally {
    polling = false;
  }
};
pollEvents().catch(() => undefined);
poll = setInterval(() => {
  pollEvents().catch(() => undefined);
}, 2000);
keepAlive = setInterval(() => {
  safeEnqueue(encoder.encode(": keep-alive\n\n"));
}, 25_000);
```

Note there is no `catch` inside `pollEvents` — only a `finally` — so every error
propagates to the two `.catch(() => undefined)` call sites and vanishes. Note
also `lastId` is seeded from wall-clock time, so any event published between page
load and stream establishment is skipped.

**The duplicate provider**:
- `apps/app/app/(authenticated)/layout.tsx:40` wraps the whole authenticated tree
  in `NotificationsProvider`.
- `apps/app/app/(authenticated)/notifications/page.tsx:97` wraps that page's
  children in a **second** `NotificationsProvider` with a `streamUrl` built at
  `:88`.
- `packages/notifications/components/provider.tsx:73` opens
  `new EventSource(streamUrl, { withCredentials: true })` in a `useEffect` keyed
  on `streamUrl`, unconditionally per instance. Reconnect/backoff is at `:80-86`
  and the status the UI reads is at `:75-79`.

**The poll transport**: `packages/notifications/src/sse/redis-stream.ts:80` —
each poll is one Upstash REST `xrange` call. There is no blocking read.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Lint | `bun run check` | exit 0 |
| Typecheck | `bun run typecheck` | exit 0 |
| Unit tests | `bun run test` | exit 0, 17/17 tasks |
| API suite | `cd apps/api && bunx vitest run` | 13 files / 101 tests baseline, plus new |

## Scope

**In scope**:
- `apps/api/app/api/notifications/stream/route.ts` and its co-located test
- `apps/app/app/(authenticated)/notifications/page.tsx`
- `packages/notifications/src/sse/redis-stream.ts` and its test

**Out of scope**:
- `packages/notifications/components/provider.tsx` — the client reconnect logic
  is correct. The fix is to stop creating a second provider, not to teach the
  provider to detect duplicates.
- `apps/app/app/(authenticated)/layout.tsx` — the layout-level provider is the
  one that should survive.
- Switching transports away from Upstash REST. Out of proportion to the problem.
- `packages/notifications/keys.ts` — plan 065 owns the env consolidation.

## Git workflow

- Branch: `advisor/059-sse-reliability`
- Conventional commits, e.g. `fix(api): surface notification stream failures to the client`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Delete the duplicate provider

Remove the `NotificationsProvider` wrapper at
`apps/app/app/(authenticated)/notifications/page.tsx:97` (and its closing tag at
`:123`). The page's children already sit inside the layout's provider and will
read the same context.

If the page needs a `streamUrl` the layout does not supply, STOP — that would
mean the two providers are not equivalent and deleting one changes behaviour.

**Verify**:
`grep -c "NotificationsProvider" "apps/app/app/(authenticated)/notifications/page.tsx"`
→ `0`. Then `bun run test` → exit 0, 17/17 tasks.

### Step 2: Add a failing test for the swallowed error

In the stream route's co-located test, add a case where
`pollNotificationStream` rejects repeatedly and assert the stream **errors**
rather than continuing to emit keep-alives indefinitely.

**Verify**: the new case fails today (the stream stays open).

### Step 3: Log poll failures and close the stream after a threshold

Track consecutive poll failures. On each failure, `log.error` with the user and
organisation identifiers. After a small threshold (3 is a reasonable default —
state the number as a named constant with a comment), call `controller.error(...)`
so the browser's `EventSource` retry takes over and the client's existing backoff
path at `provider.tsx:80-86` engages.

Reset the counter on any successful poll, so a single blip does not accumulate
toward a disconnect over hours.

**Verify**: the Step 2 case passes; `cd apps/api && bunx vitest run` → all pass.

### Step 4: Reduce the idle poll cost

Add adaptive backoff: keep the 2-second interval while events are flowing, and
lengthen it (to around 10 seconds) once a connection has been idle for a minute,
returning to 2 seconds as soon as an event arrives.

State the latency trade-off in a comment. Do **not** switch to a blocking
`XREAD BLOCK` under this plan — that interacts with the Vercel function timeout
and deserves its own change with its own measurements.

**Verify**: a test asserting the interval lengthens after sustained idleness and
resets on an event.

### Step 5: Seed `lastId` from a real position

Replace the wall-clock seed with the caller-supplied last-seen id where the
client can provide one, falling back to the current behaviour only when it
cannot. This closes the gap where an event published between page load and stream
establishment is skipped.

If the client has no such value to send, note it and leave the fallback — do not
invent a persistence layer for it under this plan.

**Verify**: `bun run test` → exit 0, 17/17 tasks.

## Test plan

- stream route: repeated poll failure → error after the threshold, with a log
- stream route: one failure then success → no disconnect, counter reset
- stream route: successful poll emits events and advances `lastId`
- stream route: idle connection lengthens its interval, resets on an event
- `redis-stream`: `readSince` surfaces a transport error rather than returning
  an empty array (verify the current behaviour first; if it already throws,
  assert that and say so)
- `apps/app`: the notifications page renders inside the layout provider with no
  second `EventSource`

Verification: `bun run test` → exit 0, with at least 5 new tests.

## Done criteria

ALL must hold:

- [ ] `bun run check` exits 0
- [ ] `bun run typecheck` exits 0
- [ ] `bun run test` exits 0, 17/17 tasks, with at least 5 new tests
- [ ] `grep -c "NotificationsProvider" "apps/app/app/(authenticated)/notifications/page.tsx"` prints `0`
- [ ] `grep -c "catch(() => undefined)" apps/api/app/api/notifications/stream/route.ts` prints `0`
- [ ] The consecutive-failure threshold is a named constant with a comment
- [ ] `git diff packages/notifications/components/provider.tsx` is empty
- [ ] `plans/README.md` row updated

## STOP conditions

Stop and report if:

- The notifications page's `streamUrl` differs meaningfully from the layout's, so
  the two providers are not interchangeable.
- `controller.error()` on an already-closed stream throws in a way `safeEnqueue`
  does not already handle. Report the shape; do not add a bare `try {}` around it.
- Adaptive backoff makes an existing timing-sensitive test flaky. Fix the test's
  determinism with fake timers rather than reverting the backoff.

## Maintenance notes

- The rule worth enforcing in review: a streaming endpoint must never keep
  emitting keep-alives after its data source has failed. A healthy-looking
  connection that delivers nothing is the worst available outcome.
- Deliberately deferred: blocking reads (`XREAD BLOCK`) and per-user persisted
  stream positions. Both are the right long-term shape; both need measurement
  against the function timeout first.
- If a third `NotificationsProvider` appears anywhere, that is the signal the
  provider should assert it is not being nested.
