# Plan 119: Load integrations styling only with the integrations route

> **Executor instructions**: Follow this plan step by step, preserve rendered
> output and stop on scope expansion. The reviewer maintains the index.
>
> **Drift check (run first)**:
> `git diff --stat 5dcaa72..HEAD -- apps/web/app/styles/features.css apps/web/app/integrations/page.tsx apps/web/app/integrations/integrations.module.css`

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: MED
- **Depends on**: Plan 118 DONE
- **Category**: perf
- **Planned at**: commit `5dcaa72`, 2026-08-30; reconciled after Plan 118
- **Preview landing**: PENDING; approved commit `a65db00`; `preview` is
  user-provisioned

## Why this matters

Integrations-only selectors live inside a 74 KB source stylesheet imported by
the root marketing layout, so unrelated routes download and participate in its
cascade. Next.js 16 supports route-imported CSS Modules and recommends them for
custom scoped styles. Extracting this section should reduce global CSS without
changing the page’s visual world.

## Current state

- `apps/web/app/styles.css:1-5` imports all marketing CSS globally.
- `apps/web/app/styles/features.css:2822-3175` owns integrations base styles.
- `apps/web/app/styles/features.css:3215-3227`, `3313-3356` and relevant
  accessibility media blocks contain integrations responsive overrides mixed
  with other routes.
- `apps/web/app/integrations/page.tsx` uses global BEM class strings plus shared
  global primitives such as `fmkt-page`, `fmkt-container`, `fmkt-overline` and
  `fmkt-section-title`.
- Next.js 16 documentation recommends importing `*.module.css` from a page or
  component for route-scoped custom CSS. Keep truly shared primitives global.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Selector scan | `rg -n "\.fmkt-integrations" apps/web/app/styles/features.css` | no matches after extraction |
| Focused | `bunx vitest run apps/web/app/integrations` | all pass |
| Lint/typecheck | `bunx ultracite check apps/web/app/integrations/page.tsx apps/web/app/integrations/integrations.module.css apps/web/app/styles/features.css && bun run --cwd apps/web typecheck` | exit 0 |
| Production build | `bun run --cwd apps/web build` | exit 0 |
| Bundle comparison | record integrations, homepage, features and pricing CSS assets before/after using `.next` build output | integrations renders correctly; unrelated routes no longer carry extracted rules |
| Gates | `bun run check && bun run typecheck && bun run test && bun run test:integration` | all exit 0 |

## Suggested executor toolkit

- Use `impeccable` with `optimize` and `polish`; read `craft-floor` immediately
  before editing. Use browser verification at 390x844, 820x1180 and 1440x1000,
  light and dark together in one bounded batch.
- Use Context7 Next.js documentation if module/import behaviour differs from
  the installed Next 16 build. Do not guess.

## Scope

**In scope**:
- `apps/web/app/integrations/page.tsx`
- `apps/web/app/integrations/integrations.test.ts` (update only the hero boundary
  used by the existing scoped copy assertion)
- `apps/web/app/integrations/integrations.module.css` (create)
- `apps/web/app/styles/features.css`

**Out of scope**:
- Shared `fmkt-*` primitives used by multiple routes.
- Styling redesign, class-name cleanup outside integrations or token changes.
- Extracting pricing, features or homepage CSS.
- Checking in `.next` or screenshot artifacts.

## Git workflow

- Target branch: user-created `preview`; do not create or reset it.
- Branch: `codex/119-extract-integrations-css`
- Commit: `refactor(web): scope integrations styles`
- Approved landing commit: `a65db00`.
- Executor: do not push or merge. Stop if `preview` or `origin/preview` is absent.
- Landing owner: after Plan 118 is reachable from `origin/preview`, update local
  `preview`, fast-forward it to the working branch with `git merge --ff-only`,
  run the plan gates, then push `preview`. Stop and reconcile on divergence.
- Completion proof: `git merge-base --is-ancestor a65db00 origin/preview` must
  exit 0 before this plan is considered landed.

## Steps

### Step 1: Record the baseline

Build the web app and record CSS asset names/sizes for `/`, `/features`,
`/pricing` and `/integrations`. Capture the three representative integration
viewports in light and dark mode before editing.

**Verify**: baseline evidence is reported in executor NOTES, not committed.

### Step 2: Extract local selectors

Move every integrations-only base and responsive selector into
`integrations.module.css`. Import the module in `page.tsx` and replace only
integration-specific class strings with module references. Keep shared global
classes as strings and use `:global(...)` only where a local rule deliberately
targets a shared descendant. Preserve cascade order within the extracted file.

**Verify**: selector scan shows no integration selector left in `features.css`;
focused tests and typecheck pass.

### Step 3: Compare production output and visuals

Build again, compare CSS assets and capture the same viewports. Fix all visual
differences from the baseline in one batch, then perform at most one final
confirmation batch. The expected visual diff is zero.

**Verify**: unrelated route CSS no longer includes extracted integration rules;
integrations screenshots match baseline in layout, type, colour and responsive
behaviour.

### Step 4: Run full gates

Run targeted lint, all repository gates and `git diff --check`.

## Test plan

- Existing static-render integration tests continue to pass.
- Production build proves module resolution and route output.
- Before/after browser captures are the regression check for styling parity.

## Done criteria

- [ ] No `.fmkt-integrations*` selector remains in global `features.css`.
- [ ] All integration-specific classes are locally scoped.
- [ ] Visual output is unchanged at all three viewports and both themes.
- [ ] Production bundle evidence shows unrelated routes shed the rules.
- [ ] Build and all gates pass; no artifacts are committed.

## STOP conditions

- A supposedly integration selector is used by another route.
- CSS Modules change specificity in a way that requires unrelated file edits.
- Production build does not provide measurable route CSS separation.
- Visual parity requires a redesign rather than extraction.

## Maintenance notes

Keep future integrations-only styling in the module. Shared primitives belong in
the global shell only after at least two real route consumers need them.
