# Plan 014: Batch feed-cache invalidation and replace keyspace scans with keyed deletes

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report, do not improvise. When done, update this plan's status row in
> `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 75202db..HEAD -- packages/feeds/src/cache packages/feeds/src/scope/feed-scope.ts`
> If any changed since this plan was written, compare the "Current state"
> excerpts against the live code before proceeding. On a mismatch, treat it as a
> STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `75202db`, 2026-07-25

## Why this matters

Feed cache invalidation runs on the hot path of every leave approval, every plan
submission, and every manual record edit. It currently costs, for an
organisation with N active feeds:

- one `feed.findMany`, then
- N separate `person.findMany` queries, because the batch loader that exists for
  exactly this purpose is not passed to the resolver, and
- N sequential Redis `SCAN` cursor loops, each walking the KV keyspace looking
  for `feed:<id>:*`.

The `SCAN` is the worse half. The cache key is fully derivable: it is
`feed:<feedId>:<privacyMode>`, and `privacy_mode` is a small enum already stored
on the feed row. Scanning for a key you can compute means the cost of
invalidating one feed scales with the total number of keys in the KV store across
all tenants, not with anything about that feed.

At twenty feeds, one approval click costs roughly forty network round trips, most
of them serialised, before the user sees a response.

## Current state

### Relevant files

- `packages/feeds/src/cache/feed-invalidation.ts` — the per-feed loop (lines
  31-52) and the sequential invalidation loop (lines 66-71).
- `packages/feeds/src/cache/feed-cache.ts` — `feedCacheKey` (line 33) and the
  `SCAN`-based `invalidateFeedCache` (lines 80-99).
- `packages/feeds/src/scope/feed-scope.ts` — `resolvePeopleForFeed` (line 146),
  which accepts an optional `preloaded`, and `loadFeedScopeData` (line 189),
  the batch loader that is never passed to it here.

### The per-feed query fan-out

`packages/feeds/src/cache/feed-invalidation.ts:31-52`:

```typescript
  const matching: string[] = [];
  for (const feed of feeds) {
    const people = await resolvePeopleForFeed({
      clerkOrgId: input.clerkOrgId,
      createdByUserId: feed.created_by_user_id,
      organisationId: input.organisationId,
      scopes: feed.scopes.map((scope) => ({
        scopeType: scope.scope_type,
        scopeValue: scope.scope_value,
      })),
    });
    // If scope resolution fails we cannot prove the person is out of scope; invalidate
    // defensively so a transient error never leaves a stale feed body in the cache.
    if (!people.ok) {
      matching.push(feed.id);
      continue;
    }
    if (people.value.some((person) => wanted.has(person.id))) {
      matching.push(feed.id);
    }
  }
  return matching;
```

No `preloaded` is passed. The defensive branch on `!people.ok` is deliberate and
correct; it must be preserved exactly.

### The resolver already supports batching

`packages/feeds/src/scope/feed-scope.ts:146-162`:

```typescript
export async function resolvePeopleForFeed(input: {
  actingPersonId?: string | null;
  clerkOrgId: string;
  createdByUserId?: string | null;
  organisationId: string;
  preloaded?: FeedScopeData;
  scopes: FeedScopeInput[];
}): Promise<Result<ScopedFeedPerson[], FeedScopeError>> {
  try {
    const people =
      input.preloaded?.people.filter((person) => person.is_active) ??
      (await database.person.findMany({
        orderBy: [{ last_name: "asc" }, { first_name: "asc" }, { id: "asc" }],
        select: personSelect,
        where: peopleWhereForFeedScope(input),
      }));
```

When `preloaded` is supplied it issues no query at all.

### The sequential invalidation loop

`packages/feeds/src/cache/feed-invalidation.ts:60-73`:

```typescript
  const feedIds = await feedIdsForPeople({
    clerkOrgId: input.clerkOrgId,
    organisationId: input.organisationId,
    personIds: [input.personId],
  });
  for (const feedId of feedIds) {
    const result = await invalidateFeedCache({ feedId });
    if (!result.ok) {
      return result;
    }
  }
  return { ok: true, value: { feedIds } };
```

### The key is derivable but the code scans for it

`packages/feeds/src/cache/feed-cache.ts:33-38`:

```typescript
export function feedCacheKey(input: {
  feedId: string;
  privacyMode: string;
}): string {
  return `feed:${input.feedId}:${input.privacyMode}`;
}
```

`packages/feeds/src/cache/feed-cache.ts:80-103`:

```typescript
  try {
    const client = getFeedCacheClient();
    if (!client) {
      return { ok: true, value: { deletedCount: 0 } };
    }

    const keys: string[] = [];
    let cursor = 0;
    do {
      const [nextCursor, batch] = await client.scan(cursor, {
        count: 100,
        match: `feed:${input.feedId}:*`,
      });
      cursor = nextCursor;
      keys.push(...batch);
    } while (cursor !== 0);

    if (keys.length > 0) {
      await client.del(...keys);
    }
    return { ok: true, value: { deletedCount: keys.length } };
  } catch {
    return cacheError("Failed to invalidate feed cache.");
  }
}
```

### Repo conventions that apply here

- All ICS generation and feed caching lives in `packages/feeds`.
- The KV cache is a performance layer; a cache failure must never fail the user's
  request. Note that the current code returns early on the first invalidation
  error, which is stricter than that posture. See Step 4.
- Cache is invalidated only when a relevant `availability_record` changes.
- Every tenant-scoped query filters by `clerk_org_id` and `organisation_id`.
- Service functions return `Result<T, E>`.
- TypeScript strict mode, no `any`, named exports only.
- Australian English in comments. No em dashes anywhere.
- Tests are co-located. `packages/feeds/src/scope/feed-scope.test.ts` and the
  other tests in `packages/feeds/src` are the patterns to follow.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `bun install` | exit 0 |
| Typecheck | `bun run typecheck` | exit 0, no errors |
| Feeds tests | `bunx vitest run packages/feeds` | all pass |
| Full unit tests | `bun run test` | exit 0 |
| Lint | `bun run check` | exit 0 |

If `bun run typecheck` or `bun run test` fails before you have made any change
with an error mentioning `Cannot find module '@repo/observability/log'`, run
`bun install` first. That error is a stale-install artifact, not a code defect.

## Scope

**In scope** (the only files you may modify):

- `packages/feeds/src/cache/feed-invalidation.ts`
- `packages/feeds/src/cache/feed-cache.ts`
- `packages/feeds/src/cache/feed-cache.test.ts` (create if absent)
- `packages/feeds/src/cache/feed-invalidation.test.ts` (create if absent)

**Out of scope** (do NOT touch, even though they look related):

- `resolvePeopleForFeed` and `loadFeedScopeData` in
  `packages/feeds/src/scope/feed-scope.ts`. They already support what this plan
  needs; the fix is to call them correctly.
- The defensive `if (!people.ok) { matching.push(feed.id); continue; }` branch.
  Invalidating when scope resolution fails is deliberately conservative and must
  stay.
- `packages/feeds/src/render/render-feed.ts` — plan 009 covers it.
- The cache TTL, the cached body shape, or `feedCacheKey`'s format.
- Any change to when invalidation is triggered from
  `packages/availability`.

## Git workflow

- Branch: `advisor/014-batch-feed-cache-invalidation`
- Conventional commits, one logical change per commit. Example from `git log`:
  `chore(design-sync): refresh component previews`
- Do NOT push or open a PR unless the operator instructs it.

## Steps

### Step 1: Load the scope data once and pass it to every resolution

In `feedIdsForPeople`, call `loadFeedScopeData` once before the loop and pass the
result as `preloaded` to every `resolvePeopleForFeed` call.

```typescript
  const preloadedResult = await loadFeedScopeData({
    clerkOrgId: input.clerkOrgId,
    organisationId: input.organisationId,
  });
  const preloaded = preloadedResult.ok ? preloadedResult.value : undefined;
```

Passing `undefined` when the batch load fails preserves today's behaviour
exactly: the resolver falls back to its own per-feed query. Do not treat a failed
preload as a reason to skip invalidation.

**Verify**: `bun run typecheck` → exit 0.

### Step 2: Select `privacy_mode` on the feed query

The keyed delete in Step 3 needs each feed's `privacy_mode`. Add
`privacy_mode: true` to `feedScopeSelect` in
`packages/feeds/src/cache/feed-invalidation.ts`, and change `feedIdsForPeople` to
return `{ id, privacyMode }` pairs rather than bare ids.

Update `invalidateFeedCachesForPerson` and any other caller accordingly. Find
them with:

```
grep -rn "feedIdsForPeople" packages apps --include=*.ts
```

**Verify**: `bun run typecheck` → exit 0.

### Step 3: Replace the `SCAN` with a keyed delete

In `packages/feeds/src/cache/feed-cache.ts`, change `invalidateFeedCache` to
accept the privacy modes to delete and issue a single `del` over computed keys:

```typescript
export async function invalidateFeedCache(input: {
  feedId: string;
  privacyModes: string[];
}): Promise<Result<{ deletedCount: number }, FeedCacheError>> {
  try {
    const client = getFeedCacheClient();
    if (!client) {
      return { ok: true, value: { deletedCount: 0 } };
    }

    const keys = input.privacyModes.map((privacyMode) =>
      feedCacheKey({ feedId: input.feedId, privacyMode })
    );
    if (keys.length === 0) {
      return { ok: true, value: { deletedCount: 0 } };
    }

    await client.del(...keys);
    return { ok: true, value: { deletedCount: keys.length } };
  } catch {
    return cacheError("Failed to invalidate feed cache.");
  }
}
```

Callers pass the feed's current `privacy_mode`. To be safe against a feed whose
privacy mode changed while a body was cached under the old mode, pass **every**
member of the privacy-mode enum rather than just the current one. Get the enum
members from `packages/database/prisma/schema.prisma`; deleting a key that does
not exist is free.

That keeps the correctness property the `SCAN` was providing (catch bodies
cached under any mode) while making the cost constant and independent of
keyspace size.

**Verify**: `grep -n "client.scan" packages/feeds/src/cache/feed-cache.ts`
returns no matches, and `bun run typecheck` → exit 0.

### Step 4: Parallelise invalidation and stop aborting on the first failure

In `invalidateFeedCachesForPerson`, replace the sequential loop with a bounded
parallel run, and collect failures rather than returning on the first one:

```typescript
  const results = await Promise.all(
    feeds.map((feed) =>
      invalidateFeedCache({
        feedId: feed.id,
        privacyModes: ALL_PRIVACY_MODES,
      })
    )
  );
  const failed = results.filter((result) => !result.ok);
  if (failed.length > 0) {
    // Report the failure, but only after attempting every feed. Returning on the
    // first error left later feeds serving stale bodies.
    return failed[0];
  }
```

The current early return means one failing feed leaves every subsequent feed
stale. Attempting all of them first is strictly better.

**Verify**: `bun run typecheck` → exit 0.

### Step 5: Add tests

In `packages/feeds/src/cache/feed-cache.test.ts` (create if absent):

1. `invalidateFeedCache` calls `client.del` once with the computed keys and never
   calls `client.scan`. Assert `client.scan` is not defined on the mock, or
   assert it was not called.
2. With no cache client configured, returns `ok: true` with `deletedCount: 0` and
   touches nothing.
3. A throwing client yields `ok: false` with the cache error, not an exception.

In `packages/feeds/src/cache/feed-invalidation.test.ts` (create if absent):

4. **The batching regression test**: three active feeds, and
   `database.person.findMany` mocked. Assert it is called at most once (by
   `loadFeedScopeData`) rather than once per feed.
5. When `loadFeedScopeData` fails, invalidation still proceeds and still matches
   feeds (falling back to per-feed resolution).
6. The defensive branch: when `resolvePeopleForFeed` returns `ok: false` for a
   feed, that feed IS included in the invalidation set.
7. A person out of scope for a feed does not cause that feed to be invalidated.
8. When one feed's invalidation fails, the others are still attempted. Assert
   `del` was called for all feeds.

**Verify**: `bunx vitest run packages/feeds` → all pass.

### Step 6: Confirm nothing else regressed

**Verify**: `bun run test` → exit 0, `bun run typecheck` → exit 0, and
`bun run check` → exit 0.

## Test plan

- New tests: 3 cases in `feed-cache.test.ts`, 5 in `feed-invalidation.test.ts`.
- Structural pattern to copy: `packages/feeds/src/scope/feed-scope.test.ts` for
  mocking `database.person.findMany`, and
  `packages/feeds/src/render/render-feed.test.ts` for mocking the KV cache
  client.
- The two load-bearing assertions: `person.findMany` is called at most once
  regardless of feed count, and `client.scan` is never called.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `bun run typecheck` exits 0
- [ ] `bun run test` exits 0
- [ ] `bun run check` exits 0
- [ ] `grep -c "client.scan" packages/feeds/src/cache/feed-cache.ts` returns 0
- [ ] `grep -n "preloaded" packages/feeds/src/cache/feed-invalidation.ts`
      returns a match
- [ ] `bunx vitest run packages/feeds` passes with at least 8 new cases
- [ ] `git status --short` shows only in-scope files modified
- [ ] Status row for plan 014 updated in `plans/README.md`

## STOP conditions

Stop and report back (do not improvise) if:

- Any excerpt in "Current state" does not match the live code.
- The KV client's `del` does not accept multiple keys in one call. Check the
  `FeedCacheClient` interface at the top of
  `packages/feeds/src/cache/feed-cache.ts`. If it only takes one key, issue the
  deletes with `Promise.all` instead and note the change; do not fall back to
  `scan`.
- `invalidateFeedCache` has callers outside `feed-invalidation.ts`. Confirm with
  `grep -rn "invalidateFeedCache" packages apps --include=*.ts`. Every caller
  must be updated for the new signature; if one is in a package outside the scope
  list, report it rather than editing it.
- The privacy-mode enum cannot be imported into `packages/feeds` without creating
  a dependency cycle. If so, define the list locally with a comment pointing at
  the schema, and add a test that fails if the two diverge.

## Maintenance notes

- The durable point: **if a cache key is derivable, never scan for it.** A
  `SCAN`-based invalidation looks correct in a small dev keyspace and degrades
  silently as production grows, because its cost is a function of total keys
  rather than of the thing being invalidated.
- The privacy-mode enum is now duplicated between the schema and the
  invalidation call. That is a deliberate trade for constant-cost deletes. If a
  new privacy mode is added and not added here, a stale body could survive
  invalidation, so a reviewer should treat the enum as a coupled pair. The test
  in the STOP-conditions note above is the guard.
- A reviewer should confirm the defensive `!people.ok` branch survived intact and
  that a failed `loadFeedScopeData` still results in invalidation rather than
  silently skipping feeds.
- What will interact with this: plan 009 changes `render-feed.ts`, which writes
  the cache entries this code deletes. They touch different files but share the
  key format; if both land, confirm `feedCacheKey` is still the single definition
  of that format.
