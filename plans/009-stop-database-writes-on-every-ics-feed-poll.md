# Plan 009: Stop writing to the database on every ICS feed poll

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report, do not improvise. When done, update this plan's status row in
> `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 75202db..HEAD -- packages/feeds/src/render/render-feed.ts "apps/api/app/ical/[token]/route.ts"`
> If either changed since this plan was written, compare the "Current state"
> excerpts against the live code before proceeding. On a mismatch, treat it as a
> STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `75202db`, 2026-07-25

## Why this matters

`GET /ical/:token.ics` is the product's highest-traffic endpoint and the only
unauthenticated one. Outlook, Google Calendar and Apple Calendar poll subscribed
feeds on their own schedules, typically every few minutes, per subscriber,
forever. That traffic is not user-initiated and does not stop.

Every one of those requests currently writes to Postgres. On a KV cache hit, the
handler still awaits `markTokenUsed`, which is a `feedToken.update`. On a cache
miss it writes twice. And the `If-None-Match` comparison happens in the route
*after* `renderFeedForToken` has already run, so even a 304 Not Modified
response, which returns no body at all, has paid for a full render and its
writes.

The result is a permanently hot write path whose volume scales with subscriber
count rather than with actual change, producing row churn and vacuum pressure on
`feed_tokens` for no benefit. `last_used_at` is telemetry: nothing reads it to
make a decision, and one-hour granularity is as useful as one-second
granularity.

This is also the availability and cost exposure on the endpoint: an
unauthenticated request that causes a database write is a free write amplifier
for anyone who can reach the deployment.

## Current state

### Relevant files

- `packages/feeds/src/render/render-feed.ts` — the token lookup (line 81), the
  cache-hit path (line 116), the render path's paired writes (line 137) and
  `markTokenUsed` (line 166).
- `apps/api/app/ical/[token]/route.ts` — the route handler, where the
  `If-None-Match` check happens after rendering.
- `packages/database/prisma/schema.prisma` — `FeedToken.last_used_at` is
  nullable (line 858).

### The cache-hit path still writes

`packages/feeds/src/render/render-feed.ts:110-120`:

```typescript
  const key = feedCacheKey({
    feedId: feedToken.feed.id,
    privacyMode: feedToken.feed.privacy_mode,
  });
  const cached = await getCachedFeedBody(key);
  if (cached.ok && cached.value) {
    await markTokenUsed(feedToken);
    return { ok: true, value: { ...cached.value, status: "active" } };
  }
```

### The render path writes twice

`packages/feeds/src/render/render-feed.ts:136-152`:

```typescript
  await Promise.all([
    markTokenUsed(feedToken),
    database.feed.update({
      data: {
        last_etag: etag,
        last_rendered_at: new Date(),
      },
      // Scope the write by clerk_org_id and organisation_id as well as the unique id,
      // per the tenant-isolation rule that every tenant-data query filters by clerk_org_id.
      where: {
        id: feedToken.feed_id,
        clerk_org_id: feedToken.clerk_org_id,
        organisation_id: feedToken.organisation_id,
      },
    }),
  ]);
```

### `markTokenUsed` is unconditional

`packages/feeds/src/render/render-feed.ts:166-180`:

```typescript
function markTokenUsed(token: {
  id: string;
  clerk_org_id: string;
  organisation_id: string;
}): Promise<unknown> {
  return database.feedToken.update({
    data: { last_used_at: new Date() },
    // Scope the write by clerk_org_id and organisation_id as well as the unique id.
    where: {
      id: token.id,
      clerk_org_id: token.clerk_org_id,
      organisation_id: token.organisation_id,
    },
  });
}
```

Note this function is correctly tenant-scoped. Preserve that.

### The 304 check happens too late

`apps/api/app/ical/[token]/route.ts:23-53`:

```typescript
  // Render the feed for this token
  const feedResult = await renderFeedForToken(token);

  if (!feedResult.ok) {
    // Token not found or feed inactive
    return new Response("Not found", { status: 404 });
  }

  const { body, etag, status } = feedResult.value;

  // Handle expired or revoked tokens
  if (status === "expired" || status === "revoked") {
    return new Response("Gone", { status: 410 });
  }

  const quotedEtag = `"${etag}"`;
  const ifNoneMatch = request.headers.get("if-none-match");
  const matches = ifNoneMatch
    ?.split(",")
    .map((candidate) => candidate.trim().replace(weakEtagPrefixPattern, ""))
    .includes(quotedEtag);

  if (matches) {
    return new Response(null, {
      status: 304,
      headers: {
        ETag: quotedEtag,
        "Cache-Control": "max-age=3600, must-revalidate",
      },
    });
  }
```

The ETag parsing here (handling weak ETags and comma-separated lists) is correct
and must be preserved exactly.

### Repo conventions that apply here

- All ICS generation and feed caching lives in `packages/feeds`.
- The KV cache is a performance layer; a cache failure must never fail the
  response. The existing `try`/`log.warn` around `setCachedFeedBody` shows the
  intended posture. Preserve it.
- Every tenant-scoped query carries `clerk_org_id` and `organisation_id`, even
  when keyed by a unique id.
- Service functions return `Result<T, E>`.
- Structured logging via `@repo/observability/log`. No `console.log`.
- TypeScript strict mode, no `any`, named exports only.
- Australian English in comments. No em dashes anywhere.
- Tests are co-located; `packages/feeds/src/render/render-feed.test.ts` already
  exists and is the file to extend.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `bun install` | exit 0 |
| Typecheck | `bun run typecheck` | exit 0, no errors |
| Feeds tests | `bunx vitest run packages/feeds` | all pass |
| API tests | `bunx vitest run apps/api` | all pass |
| Full unit tests | `bun run test` | exit 0 |
| Lint | `bun run check` | exit 0 |

If `bun run typecheck` or `bun run test` fails before you have made any change
with an error mentioning `Cannot find module '@repo/observability/log'`, run
`bun install` first. That error is a stale-install artifact, not a code defect.

## Scope

**In scope** (the only files you may modify):

- `packages/feeds/src/render/render-feed.ts`
- `packages/feeds/src/render/render-feed.test.ts`
- `apps/api/app/ical/[token]/route.ts`
- `apps/api/app/ical/[token]/route.test.ts` (create if absent)

**Out of scope** (do NOT touch, even though they look related):

- The token lookup by `token_hash` at line 81, the revocation checks, or the
  expiry check. Those are correctness-critical and already right.
- `packages/feeds/src/cache/feed-cache.ts` and
  `packages/feeds/src/cache/feed-invalidation.ts` — plan 014 covers those.
- The ETag computation itself, or the `Cache-Control` header values.
- The tenant scoping on either write. Both are correct.
- Any schema change. `last_used_at` stays nullable and stays a `DateTime?`.
- Edge or WAF rate-limit configuration. See "Maintenance notes" for why that is
  recorded but not done here.

## Git workflow

- Branch: `advisor/009-ics-poll-write-amplification`
- Conventional commits, one logical change per commit. Example from `git log`:
  `feat(availability): allow withdraw of approved leave and harden sync boundaries`
- Do NOT push or open a PR unless the operator instructs it.

## Steps

### Step 1: Debounce `markTokenUsed`

Add a module-level constant next to the other constants in
`packages/feeds/src/render/render-feed.ts`:

```typescript
// last_used_at is telemetry, not a correctness input. Writing it on every
// calendar-client poll produces one row update per subscriber every few
// minutes, forever. Hourly granularity carries the same information.
const TOKEN_USE_DEBOUNCE_MS = 60 * 60 * 1000;
```

Change `markTokenUsed` to take the current `last_used_at` and skip the write
when it is recent:

```typescript
function markTokenUsed(token: {
  id: string;
  clerk_org_id: string;
  last_used_at: Date | null;
  organisation_id: string;
}): Promise<unknown> {
  if (
    token.last_used_at &&
    Date.now() - token.last_used_at.getTime() < TOKEN_USE_DEBOUNCE_MS
  ) {
    return Promise.resolve();
  }

  return database.feedToken.update({
    data: { last_used_at: new Date() },
    // Scope the write by clerk_org_id and organisation_id as well as the unique id.
    where: {
      id: token.id,
      clerk_org_id: token.clerk_org_id,
      organisation_id: token.organisation_id,
    },
  });
}
```

The `feedToken.findUnique` at line 81 uses `include: { feed: true }` with no
`select`, so `last_used_at` is already loaded. You do not need to widen the
query.

**Verify**: `bun run typecheck` → exit 0.

### Step 2: Do not block the response on the telemetry write

On the cache-hit path, the write is pure telemetry and the body is already in
hand. Stop awaiting it, and make sure a rejection cannot produce an unhandled
promise rejection:

```typescript
  const cached = await getCachedFeedBody(key);
  if (cached.ok && cached.value) {
    // Telemetry only: never block or fail the feed response on it.
    void markTokenUsed(feedToken).catch((error) => {
      log.warn(`Feed token use write failed: ${String(error)}`);
    });
    return { ok: true, value: { ...cached.value, status: "active" } };
  }
```

Leave the render path's `Promise.all` awaited. That path already did the
expensive work, the `feed.update` genuinely persists the new ETag, and the extra
latency is immaterial on a cache miss.

**Verify**: `bun run typecheck` → exit 0.

### Step 3: Return the ETag from the cache before materialising the body

The route cannot short-circuit to 304 today because it only learns the ETag by
rendering. Add a cheap way to get it.

In `packages/feeds/src/render/render-feed.ts`, export a new function that
resolves a token to its cached ETag without rendering:

```typescript
export async function cachedEtagForToken(
  token: string
): Promise<null | string> {
```

It should: hash the token, look up the `feedToken` with its `feed`, return
`null` if the token is missing, not `active`, expired, or the feed is not
`active`, then read the cached entry for the feed's cache key and return its
`etag`, or `null` on a cache miss.

Do NOT duplicate the validation logic. Extract the shared token-and-feed
resolution from `renderFeedForToken` into a private helper that both functions
call, so there is exactly one definition of "is this token usable".

This function must not write anything.

**Verify**: `bun run typecheck` → exit 0.

### Step 4: Short-circuit 304 in the route

In `apps/api/app/ical/[token]/route.ts`, move the `If-None-Match` handling ahead
of the render. Extract the existing ETag-matching logic into a small local
function so it is used identically in both places, then:

```typescript
  const ifNoneMatch = request.headers.get("if-none-match");
  if (ifNoneMatch) {
    const cachedEtag = await cachedEtagForToken(token);
    if (cachedEtag && etagMatches(ifNoneMatch, `"${cachedEtag}"`)) {
      return new Response(null, {
        status: 304,
        headers: {
          ETag: `"${cachedEtag}"`,
          "Cache-Control": "max-age=3600, must-revalidate",
        },
      });
    }
  }

  const feedResult = await renderFeedForToken(token);
  // ... the rest unchanged, including its own 304 check as a fallback
```

Keep the existing post-render 304 check as well. It still handles the case where
the cache missed but the rendered ETag happens to match what the client holds.

The weak-ETag prefix stripping and comma-separated list handling must behave
exactly as they do today. Reuse the existing `weakEtagPrefixPattern`.

**Verify**: `bun run typecheck` → exit 0.

### Step 5: Add tests

In `packages/feeds/src/render/render-feed.test.ts`, following the existing mock
setup in that file, add:

1. **The regression test**: a cache hit where `last_used_at` is 5 minutes ago.
   Assert `feedToken.update` was NOT called.
2. A cache hit where `last_used_at` is 2 hours ago. Assert `feedToken.update`
   WAS called once, with a `where` containing `clerk_org_id` and
   `organisation_id`.
3. A cache hit where `last_used_at` is `null` (never used). Assert the update
   WAS called.
4. A cache hit where the telemetry write rejects. Assert the function still
   returns `ok: true` with the cached body, and that a warning was logged.
5. `cachedEtagForToken` returns `null` for a revoked token, an expired token, an
   inactive feed, and a cache miss; and returns the etag on a cache hit.

In `apps/api/app/ical/[token]/route.test.ts` (create if absent), add:

6. A request with a matching `If-None-Match` returns 304 and `renderFeedForToken`
   is NOT called.
7. A request with a non-matching `If-None-Match` returns 200 with a body.
8. A request with no `If-None-Match` returns 200 and does not call
   `cachedEtagForToken`.
9. A weak ETag (`W/"abc"`) in `If-None-Match` still matches.

**Verify**: `bunx vitest run packages/feeds apps/api` → all pass.

### Step 6: Confirm nothing else regressed

**Verify**: `bun run test` → exit 0, `bun run typecheck` → exit 0, and
`bun run check` → exit 0.

## Test plan

- New tests: 5 cases in `packages/feeds/src/render/render-feed.test.ts`, 4 in a
  new `apps/api/app/ical/[token]/route.test.ts`.
- Structural pattern to copy: the existing mock setup in
  `render-feed.test.ts`, which already mocks the database and the KV cache
  client.
- The two load-bearing assertions: a recently-used token on a cache hit produces
  zero database writes, and a conditional request that matches never calls the
  renderer.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `bun run typecheck` exits 0
- [ ] `bun run test` exits 0
- [ ] `bun run check` exits 0
- [ ] `grep -n "TOKEN_USE_DEBOUNCE_MS" packages/feeds/src/render/render-feed.ts`
      returns at least two matches
- [ ] `grep -n "cachedEtagForToken" "apps/api/app/ical/[token]/route.ts"`
      returns a match
- [ ] `bunx vitest run packages/feeds apps/api` passes with at least 9 new cases
- [ ] `git status --short` shows only in-scope files modified
- [ ] Status row for plan 009 updated in `plans/README.md`

## STOP conditions

Stop and report back (do not improvise) if:

- Any excerpt in "Current state" does not match the live code.
- Extracting the shared token-resolution helper in Step 3 would change the
  behaviour of `renderFeedForToken` for any status (`expired`, `revoked`,
  `not_found`). The status semantics drive 404 versus 410 responses and must be
  byte-identical. If you cannot extract it without changing behaviour, implement
  `cachedEtagForToken` by calling the existing code path and simply not writing,
  and report the duplication.
- The `feedToken.findUnique` at line 81 turns out to use an explicit `select`
  that omits `last_used_at`.
- An existing feeds test asserts that `last_used_at` is written on every call.
  Report it; that test encodes the current behaviour and a human should confirm
  the change.

## Maintenance notes

- `last_used_at` now has hourly resolution. If anything ever starts making a
  decision from it (for example, auto-revoking tokens unused for 90 days), that
  is still fine at this granularity, but the debounce constant becomes
  load-bearing and should be documented at the consumer.
- A reviewer should check that the telemetry write on the cache-hit path is not
  awaited, that its rejection is caught, and that the render path's
  `Promise.all` is still awaited.
- Deliberately deferred, and worth recording: this endpoint still has no rate
  limiting. After this plan a cached poll costs one indexed `findUnique` plus one
  KV read and zero writes, which is a much better floor, but it is still
  unauthenticated and unbounded. The right control is a per-IP rate-limit rule at
  the edge (Vercel WAF) on `/ical/:token.ics`, set permissively at first because
  legitimate calendar clients poll on schedules you do not control. That is
  infrastructure configuration rather than a code change, which is why it is not
  a step here. Do not add an in-process rate limiter to this route: it would run
  after the request has already reached compute, and `packages/rate-limit` is on
  the repo's not-in-use list.
- The token itself is sound and needs no work: 30 random bytes, only the SHA-256
  digest persisted, lookup by indexed hash, revocation honoured on both token and
  parent feed. Brute force is not a credible threat and should not be conflated
  with the abuse-control point above.
