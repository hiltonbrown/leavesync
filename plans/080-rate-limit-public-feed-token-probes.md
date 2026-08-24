# Plan 080: Rate-limit public feed probes without weakening token semantics

> **Executor instructions**: Follow each step and verification. Stop on a STOP
> condition. Update `plans/README.md` when done.
>
> **Drift check**: `git diff --stat ecd49f5..HEAD -- apps/api/app/ical apps/api/proxy.ts packages/core/src/redis-rest.ts packages/feeds/src`

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: Plans 061, 066 and 083
- **Category**: security
- **Planned at**: commit `ecd49f5`, 2026-08-24
- **Covers finding**: S-06

## Why this matters

`GET /ical/:token.ics` is intentionally unauthenticated and expensive enough to
touch database, cache and render paths. It has no application rate limit, so a
client can probe arbitrary tokens or amplify cold-render work.

## Current state

The route has explicit 404, 410, 503 and success contracts. PRODUCT.md requires
410 for expired or revoked tokens. `apps/api/proxy.ts` composes Clerk routing but
does not limit this public path. Plan 083 supplies the shared Redis REST command
transport; do not create a third client.

## Commands you will need

| Purpose | Command | Expected result |
|---|---|---|
| Focused | `cd apps/api && bunx vitest run 'app/ical/[token]/route.test.ts'` | all pass |
| Gates | `bun run check && bun run typecheck && bun run test && bun run test:integration` | exit 0 |

## Scope

**In scope**: ICS route/test and a small API-local rate-limit helper/test.

**Out of scope**: changing response semantics, token format, Vercel Firewall,
authenticated routes and cache policy.

## Git workflow

- Branch: `advisor/080-feed-rate-limit`
- Commit: `fix(api): rate limit public feed probes`
- Do not push or open a PR unless instructed.

## Steps

1. Add tests for allowed, exhausted and store-unavailable requests. Prove rate
   limiting happens before feed lookup.
2. Define reviewed limits for two dimensions: a keyed digest of the feed token
   and the platform-provided client IP. Never place plaintext tokens in keys or
   logs. Use only a Vercel-authenticated forwarding header contract.
3. Implement atomic fixed-window or sliding-window commands through Plan 083's
   client. Return 429 with `Retry-After`; choose and document fail-open versus
   fail-closed for limiter outages before code.
4. Run all gates and verify 404/410/503/200 headers remain unchanged below the
   limit.

## Test plan

Limit dimensions, boundary count, window reset, spoofed forwarding header,
Redis failure policy, no feed lookup after rejection and unchanged feed statuses.

## Done criteria

- [ ] Keys contain only digests and normalised network identifiers.
- [ ] Rejection occurs before database/cache/render work.
- [ ] 429 includes `Retry-After`.
- [ ] Existing feed semantics and four gates pass; index updated.

## STOP conditions

Stop if no trustworthy client-IP header is available, limits lack operator
approval, Redis cannot make the operation atomic, or the outage policy is not
decided.

## Maintenance notes

Application limiting complements, but does not replace, platform abuse controls.
