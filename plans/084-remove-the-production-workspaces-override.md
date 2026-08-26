# Plan 084: Remove the root production workspaces override

> **Executor instructions**: Follow each step and verification. Stop on a STOP
> condition. Update `plans/README.md` when done.
>
> **Drift check**: `git diff --stat ecd49f5..HEAD -- package.json bun.lock`

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security, dx
- **Planned at**: commit `ecd49f5`, 2026-08-24
- **Covers finding**: H-01

## Why this matters

The root package override pins `ws` independently of the direct database-package
dependency. Duplicate ownership makes security upgrades ambiguous and can hide
which constraint controls the lockfile.

## Current state

`packages/database/package.json` directly depends on `ws` at the current safe
floor. Root `package.json` also overrides it. `bun.lock` is generated and must be
updated through Bun, not by hand.

## Commands you will need

| Purpose | Command | Expected result |
|---|---|---|
| Install | `bun install` | exit 0, lockfile consistent |
| Audit | `bun audit` | no vulnerable `ws` resolution |
| Gates | `bun run check && bun run typecheck && bun run test && bun run test:integration` | exit 0 |

## Scope

**In scope**: root `package.json` and generated `bun.lock`.

**Out of scope**: unrelated upgrades, changing database driver or editing the
lockfile manually.

## Git workflow

- Base branch: `preview` (`origin/preview`), not `main`. Branch from `preview`, commit there, and land the finished work on `preview` — see `plans/README.md` § Execution policy.
- Work directly in this working tree. No isolated git worktree is used for this repo's plan executions.
- Branch: `advisor/084-ws-override`
- Commit: `chore(deps): remove redundant ws override`
- Do not push or open a PR unless instructed.

## Steps

1. Use `bun why ws` and record every resolved version.
2. Remove only the root `ws` override; retain the database package constraint.
3. Run `bun install`, `bun why ws` and `bun audit`. Confirm no resolution falls
   below the approved safe version.
4. Run all gates and inspect the lockfile diff for only related changes.

## Test plan

Dependency resolution and the four gates are the verification; no source test is
required.

## Done criteria

- [ ] Root override is absent.
- [ ] All resolved `ws` versions meet the safe floor.
- [ ] Lockfile has no unrelated churn.
- [ ] Audit and four gates pass; index updated.

## STOP conditions

Stop if Bun resolves a vulnerable version, install rewrites unrelated packages,
or another workspace relies on the override.

## Maintenance notes

Keep dependency ownership at the package that imports the library.
