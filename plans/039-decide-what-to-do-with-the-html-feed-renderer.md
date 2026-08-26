# Plan 039: Remove the unused HTML feed renderer

> **Executor instructions**: Delete only the internal HTML feed prototype and
> its co-located test after proving they have no caller or package export.
>
> **Drift check (run first)**:
> `git diff --stat ecd49f5..HEAD -- PRODUCT.md packages/feeds/src/render packages/feeds/index.ts`
> If a live caller, export or changed product decision appears, stop.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: tech debt
- **Planned at**: commit `ecd49f5`, 2026-08-24
- **Execution status**: TODO

## Why this matters

`PRODUCT.md:103-105` places HTML calendar views outside the initial build.
`render-html.ts` is a 391-line internal prototype with no production caller and
no root-package export; only its 59-line test imports it. Retaining it imposes
type-check, test and maintenance cost for a product surface that is explicitly
out of scope. Git history keeps it recoverable if that decision changes.

## Current state

- `packages/feeds/src/render/render-html.ts` exports the internal renderer.
- `packages/feeds/src/render/render-html.test.ts` is its only consumer.
- `packages/feeds/index.ts` does not export it.
- Repository-wide searches find no route or production call site.

## Scope

**In scope**:

- deleting `packages/feeds/src/render/render-html.ts`;
- deleting `packages/feeds/src/render/render-html.test.ts`;
- updating plan bookkeeping after every gate passes.

**Out of scope**:

- adding an HTML route or productising the renderer;
- changing feed projection, privacy, preview or ICS behaviour;
- removing other unused code.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Baseline | `bunx vitest run packages/feeds/src/render/render-html.test.ts` | existing renderer tests pass before deletion |
| Feed regression | `bunx vitest run packages/feeds/src` | all remaining feed-package tests pass after deletion |
| Reference search | `rg -n "renderFeedHtml|RenderFeedHtmlInput|render-html" apps packages` | before: target/test matches only; after: no matches |
| Gates | `bun run check && bun run typecheck && bun run test && bun run test:integration && bun run build && git diff --check` | every command exits 0 |

## Git workflow

- Base branch: `preview` (`origin/preview`), not `main`. Branch from `preview`, commit there, and land the finished work on `preview` — see `plans/README.md` § Execution policy.
- Work directly in this working tree. No isolated git worktree is used for this repo's plan executions.
- Branch: `chore/039-remove-html-feed-prototype`
- Commit: `chore(feeds): remove unused HTML feed prototype`
- Do not push or open a pull request unless instructed.

## Steps

### Step 0: Confirm the execution lane before deletion

Run `test -n "${DATABASE_URL:-}"` without printing the value, then run the default build
as a baseline. If either is unavailable, stop before deletion and use a suitable
runner; keep this plan TODO.

**Verify**: `test -n "${DATABASE_URL:-}" && bun run build` exits 0.

### Step 1: Reconfirm the product and dependency boundary

Read `PRODUCT.md:103-105`. Use `rg` to prove `renderFeedHtml`,
`RenderFeedHtmlInput` and `render-html` have no caller or export outside the two
target files. Stop on contradictory evidence.

**Verify**: the reference-search command returns only the target and test.

### Step 2: Record a focused baseline

Run `bunx vitest run packages/feeds/src/render/render-html.test.ts` and record
the passing test count. This proves the deletion removes only the tested
prototype, not a pre-existing broken file.

**Verify**: the baseline command exits 0 with the existing tests.

### Step 3: Delete the prototype

Delete the renderer and its test. Do not replace them with a placeholder,
header comment, barrel export or route.

**Verify**: `test ! -e` succeeds for both target paths.

### Step 4: Prove complete removal

Run the repository-wide `rg` search again. There must be no source match for
the renderer symbols or module path and no stale test/config reference.

**Verify**: the reference-search command returns no matches.

### Step 5: Run repository gates

Run the focused feeds suite, `bun run check`, `bun run typecheck`,
`bun run test`, `bun run test:integration` and `bun run build`.

**Verify**: the exact feed-regression and full-gates commands exit 0.

## Test plan

No new source test is required for deletion. Record the passing two-test
baseline, delete both files, then require the complete remaining feed package
suite and repository gates to pass.

## Done criteria

- [ ] The product boundary still excludes HTML calendar views.
- [ ] Both prototype files are deleted and no source reference remains.
- [ ] ICS, preview and privacy tests remain unchanged and pass.
- [ ] All repository-required gates pass.
- [ ] `plans/README.md` records DONE with commit and gate evidence.

## STOP conditions

Stop if PRODUCT.md now includes an HTML calendar view, a production caller or
package export exists, or either target file contains behaviour used by another
supported feed surface.

## Maintenance notes

If an HTML calendar becomes a product requirement, recover useful design ideas
from git history and plan the route, token, caching and privacy contracts as a
new feature rather than restoring an unreachable renderer.
