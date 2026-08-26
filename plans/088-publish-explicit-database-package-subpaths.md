# Plan 088: Publish explicit database package subpaths and remove src imports

> **Executor instructions**: Follow each step and verification. Stop on a STOP
> condition. Update `plans/README.md` when done.
>
> **Drift check**: `git diff --stat ecd49f5..HEAD -- packages/database/package.json packages/database/index.ts apps packages`

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: Plans 066 and 079
- **Category**: tech-debt
- **Planned at**: commit `ecd49f5`, 2026-08-24
- **Replaces**: package-boundary half of rejected Plan 031

## Why this matters

Apps import `@repo/database/src/queries/*` and a test imports a private fixture
path. These paths bypass an intentional package API and make refactors dependent
on internal layout. Generated Prisma client/enums are widespread legitimate
subpaths and should be declared explicitly rather than collapsed into a huge
root barrel.

## Current state

At the planning commit, `packages/database/package.json` has `main` and `types`
but no `exports` map. Current private imports are found with
`rg -n '@repo/database/src/' apps packages`. Generated imports use
`@repo/database/generated/client` and `/enums` throughout the monorepo.

## Commands you will need

| Purpose | Command | Expected result |
|---|---|---|
| Inventory | `rg -n '@repo/database/src/' apps packages` | current callers before; none after |
| Gates | `bun run check && bun run typecheck && bun run test && bun run test:integration` | exit 0 |
| Build | `bun run build` | exit 0 on a verified build runner |

## Scope

**In scope**: database package manifest, explicit query/fixture public entry
points, all current `@repo/database/src/*` callers/mocks and a boundary test.

**Out of scope**: Prisma model types in client components (Plan 089), changing
query behaviour, root-exporting every generated symbol and schema changes.

## Git workflow

- Base branch: `preview` (`origin/preview`), not `main`. Branch from `preview`, commit there, and land the finished work on `preview` — see `plans/README.md` § Execution policy.
- Work directly in this working tree. No isolated git worktree is used for this repo's plan executions.
- Branch: `advisor/088-database-subpaths`
- Commit: `refactor(database): publish explicit package subpaths`
- Do not push or open a PR unless instructed.

## Steps

1. Freeze the exact private-import and generated-subpath inventories.
2. Add an explicit `exports` map for root, generated client/enums, named query
   modules and the one test-fixture entry point. Prefer public adapters over
   exposing the entire `src` tree. Confirm Bun, TypeScript and Next resolve it.
3. Rewrite each private caller and matching `vi.mock` string to the public
   subpath. Do not alter query code.
4. Add a boundary test or static check proving `@repo/database/src/` imports are
   rejected while declared subpaths resolve.
5. Run all gates and build on a runner without the known workspace symlink issue.

## Test plan

Public query imports, generated imports, fixture import, mocks and rejection of
private `src` paths. Existing query tests remain green.

## Done criteria

- [ ] No `@repo/database/src/` import remains.
- [ ] Manifest declares every supported subpath explicitly.
- [ ] Generated imports remain narrow and working.
- [ ] Four gates and build pass; index updated.

## STOP conditions

Stop if an exports map breaks Prisma generation/runtime loading, a private caller
needs an undocumented module, or the current host's environmental build failure
prevents proving package resolution. Use a verified runner, do not mark done.

## Maintenance notes

New database APIs require a deliberate public subpath; never expose all of `src`.
