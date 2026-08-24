# Plan 092: Add HSTS to every supported web surface

> **Executor instructions**: Follow each step and update this plan's index row
> only after all gates pass.
>
> **Drift check (run first)**:
> `git diff --stat ecd49f5..HEAD -- packages/next-config/index.ts packages/next-config apps/app/next.config.ts apps/api/next.config.ts apps/web/next.config.ts`
> Stop if an app no longer composes the shared configuration.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `ecd49f5`, 2026-08-24
- **Execution status**: TODO
- **Supersedes**: HSTS part of rejected Plan 062

## Why this matters

The shared Next.js headers omit HSTS, so the browser receives no persistent
HTTPS-only instruction from `app`, `api` or `web`. This is independent of CSP
reporting and can ship without waiting for browser observation.

## Current state

`packages/next-config/index.ts:5-19` defines the shared security headers without
HSTS. `apps/api/next.config.ts:1-16` and `apps/web/next.config.ts:1-16` consume
the shared configuration directly. `apps/app/next.config.ts:28-44` composes an
app-specific header list from `securityHeaders`. There is no existing header-
contract test, so create `packages/next-config/security-headers.test.ts`.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Focused | `bunx vitest run packages/next-config/security-headers.test.ts` | all header assertions pass |
| Search | `rg -n "Strict-Transport-Security" packages/next-config apps/*/next.config.ts` | one shared definition, no app duplicate |
| Runtime | start the three Next apps, then `curl -sI` ports 3000, 3001 and 3002 | each response has exactly one `Strict-Transport-Security: max-age=31536000` |
| Gates | `bun run check && bun run typecheck && bun run test && bun run test:integration && bun run build && git diff --check` | every command exits 0 |

## Scope

Modify only `packages/next-config/index.ts`, create the co-located test, and
update plan bookkeeping. App configs are read-only verification inputs. Do not
add CSP, preload, `includeSubDomains` or platform configuration. `apps/docs` is
a separately hosted Mintlify surface and does not consume this Next config.

## Git workflow

- Branch: `security/092-shared-hsts`
- Commit: `fix(next-config): add shared HSTS header`
- Do not push or open a pull request unless instructed.

## Steps

1. Add a header-contract test around `packages/next-config/index.ts` proving
   every supported app inherits the shared security headers.
2. Add `Strict-Transport-Security: max-age=31536000` to the shared configuration.
   Do not add `includeSubDomains` or `preload`; domain-wide TLS ownership has not
   been established.
3. Assert app-specific header composition cannot replace or duplicate HSTS.
4. Run focused configuration tests and every repository-required gate.

## Step verification

1. `bunx vitest run packages/next-config/security-headers.test.ts` fails only
   for the missing HSTS assertion.
2. The same command passes with exact value `max-age=31536000`.
3. The search command returns one definition and the test proves all three
   consumers retain it.
4. The runtime checks and full gates command exit 0; stop all dev listeners.

## Test plan

Import the shared header configuration in the new test and assert exact key,
value and one occurrence. Exercise each app's composed headers if they can be
loaded without environment secrets; otherwise assert their existing shared
config import and keep the three-app build as the integration proof.

## Done criteria

- [ ] App, API and web responses inherit one exact HSTS header.
- [ ] No preload or subdomain promise is introduced.
- [ ] Focused and repository-required gates pass.

## STOP conditions

Stop if any supported surface intentionally serves HTTP or if app-specific
configuration replaces the shared header list rather than composing it.

## Maintenance notes

Add `includeSubDomains` or preload only in a separate plan backed by a complete
domain/TLS inventory and an explicit rollback analysis.
