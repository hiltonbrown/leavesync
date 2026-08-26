# Plan 083: Share Redis REST transport and give notifications validated keys

> **Executor instructions**: Follow each step and verification. Stop on a STOP
> condition. Update `plans/README.md` when done.
>
> **Drift check**: `git diff --stat ecd49f5..HEAD -- packages/core packages/feeds/src/cache packages/notifications/src/sse packages/notifications/keys.ts`

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: MED
- **Depends on**: Plans 059 and 061
- **Category**: tech-debt, security
- **Planned at**: commit `ecd49f5`, 2026-08-24
- **Covers findings**: A-03, A-04

## Why this matters

Feeds and notifications each hand-roll Redis REST request/error handling, while
only feeds has a declared environment-key module. Shared transport mechanics
should have one tested contract, but feature-specific commands and key naming
must remain in their owning packages.

## Current state

- `packages/feeds/src/cache/kv-client.ts` and
  `packages/notifications/src/sse/redis-stream.ts` each call Redis REST.
- `packages/feeds/keys.ts` declares feed configuration.
- notifications consumes its Redis URL/token without an equivalent keys file.
- Both packages already depend on `@repo/core`; core must remain database-free.

## Commands you will need

| Purpose | Command | Expected result |
|---|---|---|
| Packages | `bunx vitest run packages/core packages/feeds packages/notifications` | all pass |
| Gates | `bun run check && bun run typecheck && bun run test && bun run test:integration` | exit 0 |

## Scope

**In scope**: a small core Redis REST command transport/test/export, both current
transport callers/tests and `packages/notifications/keys.ts`.

**Out of scope**: command semantics, cache keys/TTL, SSE policy, provider choice,
rate limits (Plan 080) and new dependencies.

## Git workflow

- Base branch: `preview` (`origin/preview`), not `main`. Branch from `preview`, commit there, and land the finished work on `preview` — see `plans/README.md` § Execution policy.
- Work directly in this working tree. No isolated git worktree is used for this repo's plan executions.
- Branch: `advisor/083-redis-rest`
- Commit: `refactor(core): share redis rest transport`
- Do not push or open a PR unless instructed.

## Steps

1. Characterise URL construction, auth headers, response envelopes, timeouts and
   error redaction in both clients.
2. Add a dependency-free core transport accepting URL/token and a command array.
   It returns `Result`, validates the REST envelope and never logs credentials.
3. Add notification key declarations matching the repo env-key convention;
   optional formatted values must be absent, not empty strings.
4. Migrate feeds, then notifications, preserving their command-level types and
   feature-specific error mapping.
5. Run package suites and all gates; confirm no third REST implementation exists.

## Test plan

Success, non-2xx, malformed JSON/envelope, abort/timeout and credential redaction;
existing cache and stream command tests remain unchanged in behaviour.

## Done criteria

- [ ] One shared transport owns HTTP/envelope mechanics.
- [ ] Feature packages still own command and key semantics.
- [ ] Notification env keys are declared and validated.
- [ ] No credentials enter logs/errors; four gates pass; index updated.

## STOP conditions

Stop if the providers use incompatible response contracts, core would need a
feature dependency, or environment ownership cannot be determined from deploy
configuration.

## Maintenance notes

The shared unit is transport, not a universal Redis repository.
