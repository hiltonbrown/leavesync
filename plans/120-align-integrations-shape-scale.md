# Plan 120: Align integrations surfaces with the documented shape scale

> **Executor instructions**: Follow every step, classify each surface before
> changing it and touch only in-scope files. The reviewer maintains the index.
>
> **Drift check (run first)**:
> `git diff --stat a65db00..HEAD -- apps/web/app/integrations/integrations.module.css apps/web/app/styles/shell.css`

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: MED
- **Depends on**: Plan 119 landed on `origin/preview`
- **Category**: tech-debt
- **Planned at**: commit `a65db00`, 2026-08-30; reconciled after Plan 119
- **Preview landing**: PENDING EXECUTION; `preview` is user-provisioned

## Why this matters

The integrations page uses 12px and 16px corners interchangeably for compact
rows, standalone cards and major grouped surfaces. Shared marketing buttons use
16px instead of the 14px control shape. Applying the documented scale restores
clear surface hierarchy without redesigning the page.

## Current state

- After Plan 119, integration styles live in
  `apps/web/app/integrations/integrations.module.css`.
- Current source locations before extraction are
  `features.css:2865-2884` (path group/rows), `2960-2971` (region/destination),
  `3041-3046` (data panels), `3081-3102` (steps), `3110-3163` (sync group/cards).
- `apps/web/app/styles/shell.css:223-242` gives shared marketing buttons 16px.
- DESIGN.md assigns 20px to standalone persistent cards, 16px to major grouped
  surfaces, 14px to buttons/controls and 12px to compact rows/small containers.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Lint/typecheck | `bunx ultracite check apps/web/app/integrations/integrations.module.css apps/web/app/styles/shell.css && bun run --cwd apps/web typecheck` | exit 0 |
| Visual | capture `/integrations` at 390x844, 820x1180 and 1440x1000 in light/dark; inspect header/footer buttons on one adjacent page | hierarchy is coherent; no clipping or pill-like drift |
| Build | `bun run --cwd apps/web build` | exit 0 |
| Gates | `bun run check && bun run typecheck && bun run test && bun run test:integration` | all exit 0 |

## Suggested executor toolkit

- Use `impeccable` with `polish`; read `craft-floor` immediately before
  editing. Classify each item as card, grouped surface, control or compact row
  before applying a radius.

## Scope

**In scope**:
- `apps/web/app/integrations/integrations.module.css`
- `apps/web/app/styles/shell.css`

**Out of scope**:
- Spacing, colours, typography, shadows or content changes.
- Radius changes on unrelated specialised marketing components.
- New radius tokens; the documented scale already exists.

## Git workflow

- Target branch: user-created `preview`; do not create or reset it.
- Branch: `codex/120-align-integrations-shape-scale`
- Commit: `style(web): align integrations shape scale`
- Execution base: begin only after Plan 119's approved commit is reachable from
  `origin/preview`, then branch from the updated local `preview`.
- Executor: do not push or merge. Stop if `preview` or `origin/preview` is absent.
- Landing owner: after approval, update local `preview`, fast-forward it to the
  working branch with `git merge --ff-only`, run the plan gates, then push
  `preview`. Stop and reconcile on divergence.
- Completion proof: record the approved commit SHA, then require
  `git merge-base --is-ancestor <approved-sha> origin/preview` to exit 0 before
  this plan is considered landed.

## Steps

### Step 1: Classify and update integration surfaces

Use 16px for the pathway and security/sync grouped surfaces, 20px for standalone
data cards when they read as cards, and 12px for nested compact rows such as
path items, region/destination rows, steps and sync detail rows. Do not apply
20px mechanically to every rectangle.

**Verify**: inspect all three viewports in both themes; nested hierarchy remains
clear and no corner clips content.

### Step 2: Correct shared marketing buttons

Change the shared marketing button radius to 14px. Inspect primary, tertiary and
outline variants in header, hero and footer contexts.

**Verify**: adjacent-page buttons remain coherent and focus rings from Plan 117
remain unclipped at 200% zoom.

### Step 3: Run build and gates

Run targeted lint, web typecheck, production build, all repository gates and
`git diff --check`.

## Test plan

- Visual regression is the appropriate proof for shape hierarchy.
- Existing route tests and production build must remain green.
- Report exact viewport/theme coverage in executor NOTES.

## Done criteria

- [ ] Every changed radius maps to a documented component role.
- [ ] Shared marketing buttons use 14px.
- [ ] Integration card hierarchy is coherent at all viewports/themes.
- [ ] Focus remains unclipped at 200% zoom.
- [ ] Build and all gates pass; scope is clean.

## STOP conditions

- Plan 119 is not landed or the module path differs.
- A surface’s role cannot be classified from DESIGN.md and neighbouring pages.
- Fixing clipping requires spacing or component changes outside scope.

## Maintenance notes

Future radius changes should follow interaction scale, not visual novelty. Keep
12px for compact nested rows and 20px for true standalone cards.
