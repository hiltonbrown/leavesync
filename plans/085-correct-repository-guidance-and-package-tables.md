# Plan 085: Correct repository commands and package ownership guidance

> **Executor instructions**: Follow each step and verification. Stop on a STOP
> condition. Update `plans/README.md` when done.
>
> **Drift check**: `git diff --stat ecd49f5..HEAD -- AGENTS.md CLAUDE.md README.md package.json apps/*/package.json packages/*/package.json`

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: docs, dx
- **Planned at**: commit `ecd49f5`, 2026-08-24
- **Covers findings**: H-02, H-03

## Why this matters

Agent and contributor guidance contains commands or package ownership tables that
have drifted from the workspace manifests. Incorrect instructions waste time and
can push changes into forbidden packages.

## Current state

The root manifest is authoritative for runnable scripts. `AGENTS.md` and
`CLAUDE.md` list domain/infrastructure packages but need current billing and
analytics ownership. Their explicit “not in use” warning remains architecturally
correct and must not be deleted.

## Commands you will need

| Purpose | Command | Expected result |
|---|---|---|
| Inventory | `bun run` | documented root scripts are listed |
| Docs check | `bun run check` | exit 0 |

## Scope

**In scope**: `AGENTS.md`, `CLAUDE.md` and README command text only when the
inventory proves it stale.

**Out of scope**: adding scripts merely to validate old prose, source changes,
architecture changes and removal of the forbidden-package list.

## Git workflow

- Base branch: `preview` (`origin/preview`), not `main`. Branch from `preview`, commit there, and land the finished work on `preview` — see `plans/README.md` § Execution policy.
- Work directly in this working tree. No isolated git worktree is used for this repo's plan executions.
- Branch: `advisor/085-repo-guidance`
- Commit: `docs: reconcile repository guidance`
- Do not push or open a PR unless instructed.

## Steps

1. Build a table from root/workspace manifests: command, owning workspace and
   whether it is a CI gate.
2. Correct only statements contradicted by that table. Keep Australian English
   and no em dashes.
3. Add `packages/billing` and `packages/analytics` to the correct ownership
   tables in both agent-guidance files. Preserve “not in use” entries.
4. Search all three docs for removed command/package claims and run checks.

## Test plan

Every documented command must resolve in a manifest or be explicitly labelled a
direct tool invocation. Markdown and repository checks pass.

## Done criteria

- [ ] Guidance matches live manifests.
- [ ] Billing and analytics ownership is documented consistently.
- [ ] Forbidden-package warning remains.
- [ ] No JSON comments or invented scripts; checks pass; index updated.

## STOP conditions

Stop if AGENTS.md and CLAUDE.md intentionally serve different agent contracts or
a command's intended ownership cannot be established.

## Maintenance notes

Update guidance in the same change that adds or removes a root command/package.
