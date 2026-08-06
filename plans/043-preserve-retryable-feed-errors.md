# Plan 043: Preserve retryable feed-render failures

> **Executor instructions**: Follow the plan in order. Preserve the deliberate
> 404 and 410 token semantics while making internal failures retryable. Run each
> verification gate and update `plans/README.md` when complete.
>
> **Drift check (run first)**:
> `git diff --stat b261792..HEAD -- packages/feeds/src/projection/feed-projection.ts packages/feeds/src/render/render-feed.ts packages/feeds/src/render/render-feed.test.ts apps/api/app/ical/[token]/route.ts apps/api/app/ical/[token]/route.test.ts`

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug, feeds
- **Planned at**: commit `b261792`, 2026-08-04

## Why this matters

Feed projection already distinguishes a missing feed from an unexpected
failure, but both render layers erase that distinction and the public route
returns 404 for every error. Calendar clients can interpret a 404 as a removed
subscription and stop polling. A transient database or projection failure must
remain a retryable server response.

## Drift warning

Plan 042 runs at position 6 and this plan at position 7. **Both edit
`packages/feeds/src/render/render-feed.test.ts`**: 042 adds exact `DTSTART` and
`DTEND` assertions for all-day events, this plan adds render-error cases.

The two do not conflict, but the file will already contain 042's cases when you
open it. Add to it rather than assuming it matches what is quoted here, and leave
042's all-day assertions intact. If an all-day assertion fails after your change,
that is a real regression in the render path, not a stale test to update.

## Current state

- `packages/feeds/src/projection/feed-projection.ts:142-149` returns
  `unknown_error` for unexpected projection failures.
- `packages/feeds/src/render/render-feed.ts:51-55` converts any projection
  failure to `not_found`.
- `packages/feeds/src/render/render-feed.ts:166-170` converts any body-render
  failure to `not_found` again.
- `apps/api/app/ical/[token]/route.ts:48-54` maps every failed result to 404.
- `apps/api/app/ical/[token]/route.test.ts:92-101` covers only the not-found
  branch.

Current lossy mapping:

```typescript
if (!projected.ok) {
  return {
    ok: false,
    error: { code: "not_found", message: "Feed not found" },
  };
}
```

The token lifecycle contract remains:

- unknown token or genuinely missing feed: 404
- expired or revoked token: 410
- active feed: 200, or 304 when the ETag matches
- unexpected render/projection failure: retryable 503 after this plan

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Feed tests | `bunx vitest run packages/feeds/src/render/render-feed.test.ts` | all pass |
| Route tests | `bunx vitest run 'apps/api/app/ical/[token]/route.test.ts'` | all pass |
| Unit suite | `bun run test` | exit 0 |
| Typecheck | `bun run typecheck` | exit 0 |
| Lint | `bun run check` | exit 0 |

## Scope

**In scope:**

- `packages/feeds/src/render/render-feed.ts`
- `packages/feeds/src/render/render-feed.test.ts`
- `apps/api/app/ical/[token]/route.ts`
- `apps/api/app/ical/[token]/route.test.ts`
- `packages/feeds/index.ts` only if a new exported error type is required

**Out of scope:**

- Token hashing, signing, rotation, expiry, or revocation.
- Changing 404 for an unknown token.
- Changing 410 for revoked or expired tokens.
- Cache key, ETag, or last-used telemetry behaviour.
- Returning internal error details to calendar clients.

## Git workflow

- Branch: `fix/retryable-ics-render-errors`
- Commit: `fix(feeds): return retryable errors for transient render failures`
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Define the render error contract

In `render-feed.ts`, define and use a named error union with exactly:

```typescript
type FeedRenderError =
  | { code: "not_found"; message: string }
  | { code: "unknown_error"; message: string };
```

Apply it to `renderFeedBody` and `renderFeedForToken`. Preserve the error from
`projectFeedEvents` instead of replacing it. Preserve `renderFeedBody` errors
inside `renderFeedForToken` as well.

If `ical-generator` can throw during event creation or serialisation, catch that
inside `renderFeedBody`, log structured context without the plaintext token,
and return `unknown_error`.

**Verify**: feed tests cover both codes and pass.

### Step 2: Map public HTTP responses by error code

In the ICS route:

- return the existing 404 body for `not_found`;
- log an `unknown_error` without logging the feed token;
- return 503 with a neutral `Temporarily unavailable` body and
  `Retry-After: 60` for `unknown_error`.

Do not expose database, projection, or stack details.

Update the route comment to document 503.

**Verify**: route tests assert 404, 410 and 503 independently, including the
`Retry-After` header.

### Step 3: Run the full verification gates

Run both focused commands, then unit tests, typecheck and lint.

## Test plan

- Missing token remains 404.
- Revoked and expired tokens remain 410.
- Projection `unknown_error` reaches the route as 503.
- Render/serialisation exception becomes `unknown_error`.
- 503 contains no internal message and includes `Retry-After: 60`.
- Active and 304 paths remain unchanged.

## Done criteria

- [ ] No `unknown_error` is rewritten as `not_found` in the render path.
- [ ] The ICS route returns 503 for transient render failures.
- [ ] 404 and 410 semantics are unchanged.
- [ ] No plaintext feed token is logged.
- [ ] Focused tests and all repository gates pass.
- [ ] Only in-scope files and the plan status row changed.

## STOP conditions

- A public API consumer depends on all render failures being 404.
- The `Result` error type cannot be narrowed without a broad package-wide API
  change.
- A cache failure must be included but cannot be distinguished from a miss.

## Maintenance notes

Calendar endpoints should prefer retryable 5xx responses for internal outages.
Review any future error mapping at both the package and route boundaries so
typed distinctions are not erased between layers.
