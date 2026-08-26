# Plan 061: Stop doing the ICS feed lookups twice and fetching two years of holidays

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the next
> step. If anything in "STOP conditions" occurs, stop and report — do not
> improvise. When done, update this plan's row in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat ecd49f5..HEAD -- packages/feeds/src/render packages/feeds/src/projection "apps/api/app/ical"`
> If any in-scope file changed, compare the "Current state" excerpts against the
> live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: Plan 054 (DONE), Plan 057 and Plan 066. Plan 066 deletes the
  duplicate route suite before this plan changes the canonical route tests.
- **Category**: perf
- **Planned at**: commit `ecd49f5`, 2026-08-24
- **Covers findings**: P-03, P-05

## Why this matters

This is the highest-request-rate endpoint in the product and the one whose
latency is least under anyone's control: Outlook, Google and Apple poll it
continuously, unauthenticated, on their own schedules.

**Double work per request.** When a conditional request arrives, the route calls
`cachedEtagForToken`, which does a `findUnique` on the feed token and a KV read.
If the ETag does not match, the route then calls `renderFeedForToken`, which does
the **byte-identical** `findUnique` and the **byte-identical** KV read again.
Every poll that does not 304 — every poll after any invalidation, and every poll
after the KV TTL lapses — pays two Postgres round trips and two KV round trips
before any useful work starts. Both lookups also use `include: { feed: true }`,
hydrating every Feed column when four fields are read.

**Two years of holidays per render.** The projection issues one query per
calendar year touched by the horizon, each fetching the whole year, with an
`include` of a `jurisdiction` relation that is never read. It then filters the
horizon window and `archived_at` **in JavaScript**, after the rows are already on
the wire. The default horizon is 366 days, so a cold render fetches two full
years and discards about half — on the public feed path and on every
`rebuild-feed-cache` execution.

## Current state

`apps/api/app/ical/[token]/route.ts:38-52`:

```ts
const ifNoneMatch = request.headers.get("if-none-match");
if (ifNoneMatch) {
  const cachedEtag = await cachedEtagForToken(token);
  if (cachedEtag && etagMatches(ifNoneMatch, `"${cachedEtag}"`)) {
    return new Response(null, { /* 304 */ });
  }
}

// Render the feed for this token
const feedResult = await renderFeedForToken(token);
```

`packages/feeds/src/render/render-feed.ts:108` — `cachedEtagForToken` does
`database.feedToken.findUnique({ include: { feed: true }, where: { token_hash } })`
then `getCachedFeedBody(key)` at `:125`.
`render-feed.ts:136` and `:171` — `renderFeedForToken` repeats both.

`packages/feeds/src/projection/feed-projection.ts:237-252`:

```ts
const holidayResults = await Promise.all(
  [...years].map((year) =>
    database.publicHoliday.findMany({
      include: { assignments: true, jurisdiction: true },
      orderBy: { holiday_date: "asc" },
      where: {
        clerk_org_id: input.clerkOrgId,
        holiday_date: {
          gte: new Date(Date.UTC(year, 0, 1)),
          lt: new Date(Date.UTC(year + 1, 0, 1)),
        },
        organisation_id: input.organisationId,
      },
    })
  )
);
```

`feed-projection.ts:266-273` then filters in memory:

```ts
if (
  holiday.archived_at ||
  holiday.holiday_date < input.horizonStart ||
  holiday.holiday_date > input.horizonEnd ||
  !locations.some((location) => holidayAppliesToLocation(holiday, location))
) {
```

That in-memory filter is the specification for the SQL predicate — it tells you
exactly what the `where` clause should say.

`jurisdiction` is never read: the predicate at `:314-344` touches only
`assignments`, `default_classification`, `country_code` and `region_code`, and the
event builder at `:283-308` touches only `id`, `name` and `holiday_date`.

The serving index already exists:
`@@index([organisation_id, holiday_date])` at
`packages/database/prisma/schema.prisma:777`.

The default horizon is 366 days
(`packages/feeds/src/render/render-feed.ts:51`).

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Lint | `bun run check` | exit 0 |
| Typecheck | `bun run typecheck` | exit 0 |
| Unit tests | `bun run test` | exit 0, 17/17 tasks |
| Feeds suite | `cd packages/feeds && bunx vitest run` | 10 files / 108 tests baseline, plus new |

## Scope

**In scope**:
- `packages/feeds/src/render/render-feed.ts` and its tests
- `packages/feeds/src/projection/feed-projection.ts` and its tests
- `apps/api/app/ical/[token]/route.ts` and its co-located test

**Out of scope**:
- The 404/410/503 response decision table. PRODUCT.md explicitly requires 410
  for expired or revoked tokens; keep every current status exactly as-is.
- KV cache TTL, cache keys or invalidation policy.
- `holidayAppliesToLocation` semantics, owned by replacement Plans 095–096.
  Coordinate: narrow the holiday projection to exactly the fields that predicate
  reads **today**, so Plan 095 can widen it for the supported unified rule.
- `apps/api/__tests__/ical-route.test.ts` — plan 066 owns the duplicate tests.

## Git workflow

- Base branch: `preview` (`origin/preview`), not `main`. Branch from `preview`, commit there, and land the finished work on `preview` — see `plans/README.md` § Execution policy.
- Work directly in this working tree. No isolated git worktree is used for this repo's plan executions.
- Branch: `advisor/061-feed-read-path`
- Conventional commits, e.g. `perf(feeds): resolve the feed token once per request`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Count the round trips today

Add a test that spies on the Prisma client and the KV client and asserts the
number of calls for a conditional request that misses the cache. Record the
current numbers in the test as the baseline being improved.

**Verify**: the test passes with today's counts (2 token lookups, 2 KV reads),
documenting the starting point.

### Step 2: Resolve token, feed and cache once

Replace the two exported functions with a single resolution step that returns
`{ token, feed, cached }`, and let the route decide 304 / 200 / 410 / 404 from
that one result. Keep `cachedEtagForToken` and `renderFeedForToken` exported as
thin wrappers if other callers exist — check with
`grep -rn "cachedEtagForToken\|renderFeedForToken"` before removing anything.

The decision table must not change. Same statuses, same headers, same
`Retry-After` on the 503 path that plan 043 established.

Preserve all expiry mutations, observability calls, feed-access metadata writes
and cache writes. The single-resolution result must carry enough state to avoid
re-querying without bypassing those side effects.

**Verify**: the Step 1 test now asserts 1 token lookup and 1 KV read; all
existing feeds and api tests pass.

### Step 3: Narrow both feed lookups

Replace `include: { feed: true }` with a `select` of exactly the fields read
(`id`, `name`, `status`, `privacy_mode` — confirm by reading the use sites rather
than trusting this list).

**Verify**: `bun run typecheck` → exit 0.

### Step 4: Query holidays by the horizon window

Replace the per-year `Promise.all` with a single `findMany` whose `where`
expresses what the in-memory filter at `:266-273` currently expresses:
`holiday_date: { gte: horizonStart, lte: horizonEnd }` and `archived_at: null`,
scoped by both tenant keys as today.

Replace `include: { assignments: true, jurisdiction: true }` with a `select` of
the fields actually read, dropping `jurisdiction` entirely and narrowing
`assignments` to the fields the predicate uses.

Remove the now-redundant date and `archived_at` checks from the JS filter. Keep
the `holidayAppliesToLocation` call — that stays in JS.

**Verify**: `cd packages/feeds && bunx vitest run` → all pass with no change in
projected output for a fixed dataset.

## Test plan

- round-trip counts: 1 token lookup and 1 KV read on a conditional cache miss
- the 304 path still returns 304 with the same headers
- the 410 path (expired/revoked) and the 404 path are unchanged
- the 503 retryable path from plan 043 is unchanged
- expired-token mutation, access metadata, telemetry and cache writes occur
  exactly once on their existing paths
- holiday projection: a holiday inside the horizon appears; one outside does not;
  an archived one does not — driven by the SQL predicate, not the JS filter
- a fixed dataset produces byte-identical ICS output before and after

Verification: `bun run test` → exit 0, with at least 6 new tests.

## Done criteria

ALL must hold:

- [ ] `bun run check` exits 0
- [ ] `bun run typecheck` exits 0
- [ ] `bun run test` exits 0, 17/17 tasks, with at least 6 new tests
- [ ] `grep -c "jurisdiction" packages/feeds/src/projection/feed-projection.ts` prints `0`
- [ ] `grep -c "include: { feed: true }" packages/feeds/src/render/render-feed.ts` prints `0`
- [ ] A conditional cache-miss request performs exactly one feed-token lookup and
      one KV read, asserted by test
- [ ] ICS output for a fixed dataset is byte-identical to before
- [ ] `plans/README.md` row updated

## STOP conditions

Stop and report if:

- `cachedEtagForToken` or `renderFeedForToken` has an external caller outside
  `apps/api` that constrains the signature.
- Byte-identical ICS output cannot be achieved — that means a projection change
  altered content, which is out of scope here.
- The holiday `where` clause needs a field `holidayAppliesToLocation` does not
  read today, implying Plan 095's predicate is already partly landed.
  Rebase or report.

## Maintenance notes

- The general rule: an unauthenticated, machine-polled endpoint should do exactly
  one lookup per request. A reviewer should count round trips on any change to
  this route.
- Narrowing the holiday `select` couples this file to whatever
  `holidayAppliesToLocation` reads. Plan 095 unifies that predicate; when it
  lands, the `select` must be checked against the unified field set.
- Deliberately deferred: short-circuiting to KV before the token lookup on
  `If-None-Match` hits. It would remove the last DB round trip on the hot path
  but changes revocation latency, which needs a decision.
