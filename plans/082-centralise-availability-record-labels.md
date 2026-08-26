# Plan 082: Centralise availability record labels without merging service logic

> **Executor instructions**: Follow each step and verification. Stop on a STOP
> condition. Update `plans/README.md` when done.
>
> **Drift check**: `git diff --stat ecd49f5..HEAD -- packages/core packages/availability/src packages/feeds/src apps/app`

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: Plans 060 and 061
- **Category**: tech-debt
- **Planned at**: commit `ecd49f5`, 2026-08-24
- **Covers finding**: A-01

## Why this matters

Multiple services and UI surfaces maintain their own record-type label switches.
The wording can drift even though the mapping is pure domain vocabulary. A
single helper removes that duplication without forcing unlike analytics services
behind one abstraction.

## Current state

Search `rg -n 'work_from_home|client_site|travelling|training' apps packages`
and inventory each switch or mapping. Feed publication may prefer a custom
record title; retain that override and use the helper only as its fallback.

## Commands you will need

| Purpose | Command | Expected result |
|---|---|---|
| Core | `cd packages/core && bunx vitest run` | all pass |
| Gates | `bun run check && bun run typecheck && bun run test && bun run test:integration` | exit 0 |

## Scope

**In scope**: a core helper/test/root export and only the inventoried label
callers in availability, feeds and app UI.

**Out of scope**: analytics aggregation, public-holiday applicability, custom
title precedence and database enums.

## Git workflow

- Base branch: `preview` (`origin/preview`), not `main`. Branch from `preview`, commit there, and land the finished work on `preview` — see `plans/README.md` § Execution policy.
- Work directly in this working tree. No isolated git worktree is used for this repo's plan executions.
- Branch: `advisor/082-record-labels`
- Commit: `refactor(core): centralise availability labels`
- Do not push or open a PR unless instructed.

## Steps

1. Record every current mapping and resolve any wording disagreement before
   coding. Australian English is required.
2. Add a pure exhaustive helper typed from the canonical record type. Include a
   compile-time exhaustive guard and table-driven tests.
3. Replace callers one at a time. Preserve custom feed titles and surface-
   specific sentence casing outside the domain helper.
4. Run each affected package suite and all repository gates.

## Test plan

One row per enum value, exhaustive failure protection, feed custom-title
precedence and snapshot-equivalent labels on each adopted surface.

## Done criteria

- [ ] One core mapping owns canonical labels.
- [ ] No duplicate full mapping remains in inventoried callers.
- [ ] Observable labels are unchanged unless the decision log says otherwise.
- [ ] Four gates pass; index updated.

## STOP conditions

Stop if two surfaces intentionally use different domain terms or the helper
would require core to import Prisma/database code.

## Maintenance notes

Keep presentation grammar local; centralise only the domain noun mapping.
