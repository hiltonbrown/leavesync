# Plan 092: Add HSTS to every supported web surface

> **Executor instructions**: Follow each step and update this plan's index row
> only after all gates pass.
>
> **Drift check (run first)**:
> `git diff --stat b8f89ec..HEAD -- packages/next-config/index.ts packages/next-config apps/app/next.config.ts apps/api/next.config.ts apps/web/next.config.ts`
> Stop if an app no longer composes the shared configuration.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `b8f89ec`, 2026-08-26
- **Execution status**: DONE
- **Implementation**: `c680fc2` on `security/092-shared-hsts`
- **Merged**: `1122457` on `main`
- **Supersedes**: HSTS part of rejected Plan 062

## Previous execution attempt

Execution was attempted on 26 August 2026 in
`/tmp/teamcalendar-plan-092` on branch `security/092-shared-hsts`. The executor
added the intended two-file diff, then stalled without returning verification
evidence or a commit. Two bounded continuation rounds also stalled. The
reviewer stopped the run under the two-revision limit.

Reconciliation on 26 August confirmed that the worktree contains uncommitted
changes only in
`packages/next-config/index.ts` and
`packages/next-config/security-headers.test.ts`, `git diff --check` passes, the
focused test passes 2/2, and every app-local `next` installation resolves inside
the disposable worktree. No code, dependency or Plan 092 STOP condition remains.
The failed session was an executor-orchestration failure, so reconciliation
unblocked the plan. At that point the draft remained untrusted pending a fresh
executor run and commit.

## Execution outcome

Approved on 26 August 2026 at `c680fc2`. The implementation adds one shared
`Strict-Transport-Security: max-age=31536000` definition and a two-test header
contract covering the shared configuration plus all three consumers. Reviewer
verification passed the focused test 2/2, the exact-definition search,
`bun run check`, `bun run typecheck`, `bun run test`, the live Neon-backed
`bun run test:integration`, `bun run build` and `git diff --check`. Built app,
web and API static responses each returned the exact HSTS value once on ports
3000, 3001 and 3002, and all ports were free after shutdown. No preload or
`includeSubDomains` directive was introduced, and the committed worktree is
clean with only the two scoped files changed from `b8f89ec`.

## Recovery preflight

Prefer resuming `/tmp/teamcalendar-plan-092` on
`security/092-shared-hsts`; it already contains the scoped draft and physical
worktree-local dependencies. Before changing anything:

1. Confirm `git status --short` lists only the two scoped Next-config files.
   If any other source file is modified or untracked, STOP and report it.
2. Confirm `readlink -f apps/{app,api,web}/node_modules/next` resolves below the
   current worktree root. Never symlink the primary worktree's root
   `node_modules`; run `bun install --frozen-lockfile` if a physical local
   install is missing.
3. Do not create or commit nested `AGENTS.md` or `CLAUDE.md` files. The prior
   executor created and then removed six such out-of-scope files.
4. Run each persistent server and each full gate as a separate bounded tool
   call. If a command has no active child process and makes no progress for five
   minutes, stop it and report the exact command instead of waiting indefinitely.

If the named worktree no longer exists, start from `b8f89ec` on the planned
branch and implement the same two-file scope from scratch.

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
| Search | `rg -n "Strict-Transport-Security" packages/next-config/index.ts apps/*/next.config.ts` | exactly one production definition, no app duplicate |
| Runtime | start app, web and API one at a time on ports 3000, 3001 and 3002; inspect each with `curl -sSI` | each response has exactly one `Strict-Transport-Security: max-age=31536000` |
| Gates | run `bun run check`, `bun run typecheck`, `bun run test`, `bun run test:integration`, `bun run build` and `git diff --check` as separate commands | every command exits 0 |

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

1. Review or add a header-contract test around `packages/next-config/index.ts`
   proving every supported app inherits the shared security headers.
2. Review or add `Strict-Transport-Security: max-age=31536000` to the shared
   configuration. Do not add `includeSubDomains` or `preload`; domain-wide TLS
   ownership has not been established.
3. Assert app-specific header composition cannot replace or duplicate HSTS.
4. Run focused configuration tests and every repository-required gate.

## Step verification

1. In the recovered worktree, `bunx vitest run
   packages/next-config/security-headers.test.ts` passes 2/2. On a fresh
   implementation, add the test first and confirm only its HSTS assertion fails.
2. The focused command passes with exact value `max-age=31536000`.
3. The search command returns one definition and the test proves all three
   consumers retain it.
4. For each app, start only its package dev server, wait for readiness, run
   `curl -sSI http://127.0.0.1:<port>/`, and confirm the normalised HSTS value
   appears exactly once. Stop that server and confirm its port is free before
   starting the next app.
5. Run every full gate separately, restore tracked generated noise, then confirm
   `git status --short` contains only the two scoped files before committing.

## Test plan

Import the shared header configuration in the new test and assert exact key,
value and one occurrence. Exercise each app's composed headers if they can be
loaded without environment secrets; otherwise assert their existing shared
config import and keep the three-app build as the integration proof.

## Done criteria

- [x] App, API and web responses inherit one exact HSTS header.
- [x] No preload or subdomain promise is introduced.
- [x] Focused and repository-required gates pass.

## STOP conditions

Stop if any supported surface intentionally serves HTTP or if app-specific
configuration replaces the shared header list rather than composing it. Also
stop on out-of-scope source changes, an app-local Next installation resolving
outside the worktree, or a bounded command that stalls as defined above.

## Maintenance notes

Add `includeSubDomains` or preload only in a separate plan backed by a complete
domain/TLS inventory and an explicit rollback analysis.
