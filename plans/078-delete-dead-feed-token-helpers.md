# Plan 078: Delete unused feed-token helpers before they become unsafe entry points

> **Executor instructions**: Follow each step and verification. Stop on a STOP
> condition. Update `plans/README.md` when done.
>
> **Drift check**: `git diff --stat ecd49f5..HEAD -- packages/feeds/src/tokens packages/feeds/src/feed-service.ts packages/feeds/index.ts`

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security, tech-debt
- **Planned at**: commit `ecd49f5`, 2026-08-24
- **Covers finding**: S-04

## Why this matters

`createInitialToken` can disclose a plaintext feed token without an acting-role
contract, but has no production caller. `listTokens` and `getActiveTokenHint`
are also unused. Deleting dead public surface is safer than inventing authority
parameters for paths the product does not use.

## Current state

`packages/feeds/src/tokens/token-service.ts` exports the three helpers. Current
repository search finds only their definitions and tests. The transactional
`createInitialTokenWithClient` is live through role-checked feed-service calls
and must remain.

## Commands you will need

| Purpose | Command | Expected result |
|---|---|---|
| Inventory | `rg -n "createInitialToken\\b|listTokens\\b|getActiveTokenHint\\b" apps packages` | definitions/tests only before edit |
| Focused | `cd packages/feeds && bunx vitest run src/tokens/token-service.test.ts` | all pass |
| Gates | `bun run check && bun run typecheck && bun run test && bun run test:integration` | exit 0 |

## Scope

**In scope**: token service, its tests and package-root exports if present.

**Out of scope**: `createInitialTokenWithClient`, rotation, revocation and
feed-service authorisation.

## Git workflow

- Base branch: `preview` (`origin/preview`), not `main`. Branch from `preview`, commit there, and land the finished work on `preview` — see `plans/README.md` § Execution policy.
- Work directly in this working tree. No isolated git worktree is used for this repo's plan executions.
- Branch: `advisor/078-delete-token-helpers`
- Commit: `refactor(feeds): delete unused token helpers`
- Do not push or open a PR unless instructed.

## Steps

1. Run the inventory. If any production caller exists, stop.
2. Delete the three helpers, their private-only schemas and tests that exist
   solely for them. Preserve shared utilities.
3. Run focused tests, all gates and a final inventory.

## Test plan

Existing live creation, rotation, revocation and validation tests remain green.
No replacement test is needed for deleted unreachable behaviour.

## Done criteria

- [ ] Final inventory returns no three helper names.
- [ ] `createInitialTokenWithClient` and its tests remain.
- [ ] Four repository gates and `git diff --check` pass.
- [ ] Only in-scope files changed; index row updated.

## STOP conditions

Stop if a production caller, documented public API or package consumer requires
one of the helpers.

## Maintenance notes

Token disclosure must stay behind the feed service's role-checked transaction.
