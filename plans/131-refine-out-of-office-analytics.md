# Plan 131: Make out-of-office analytics accessible and insight-led

> **Executor instructions**: Run the drift check and all gates. Before editing, read `.agents/skills/impeccable/SKILL.md`, run its context loader once for `apps/app/app/(authenticated)/analytics/out-of-office`, then read `reference/critique.md` and `reference/craft-floor.md`. Work in Operate mode and implement the vetted recommendations below.
>
> **Drift check**: `git diff --stat e7ee7c7..HEAD -- 'apps/app/app/(authenticated)/analytics/out-of-office' 'apps/app/app/(authenticated)/analytics/analytics-filters.tsx'`

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: Plan 130
- **Category**: accessibility, design, tests
- **Planned at**: commit `e7ee7c7`, 2026-08-30

## Why this matters

The page gives managers useful type and monthly views, but `ooo-days-monthly-chart.tsx:21-71` distinguishes identical stacked bars by colour alone and both charts expose exact values only through graphical interaction. Five equal metrics at `page.tsx:192-212` also obscure the managerial takeaway.

## Current state and contract

- Preserve the selected-period narrative (`page.tsx:177-190`), manual availability terminology, empty states, freshness metadata and chart token ramp.
- `page.tsx:123-126` hardcodes `personType: "all"` even though the reporting input supports segmentation.
- Multi-series data must have a non-colour cue plus a semantic exact-value representation. Operate surfaces must reflow at 200% and avoid generic hero-metric grids.

## Scope

**In scope**: `page.tsx`, `ooo-days-by-type-chart.tsx`, `ooo-days-monthly-chart.tsx`, `analytics-filters.tsx`, co-located tests.

**Out of scope**: new aggregation formulas, database/schema work, speculative traveller rankings not supplied by the current service.

## Git workflow

- Branch: `preview` (`origin/preview`), not `main` or a plan-specific feature
  branch. The completed plan lands on `preview`.
- Work and commit directly in the current working tree after checking `git status` and preserving unrelated user changes.
- Do not push to `origin/preview` without explicit operator instruction.

## Steps

1. Extend the shared filter with a compact person-type control, preserve URL and organisation context, and pass the validated value into `aggregateOutOfOffice`.
2. Add semantic summaries/tables for both charts using the same labels and values. Add a non-colour series cue or direct label to the monthly series; do not rely on colour or tooltips alone.
3. Replace five equal cards with a lead presence measure and compact supporting facts. Associate “most common type” with the type view.
4. Delay the two-column chart layout until each plot and legend remains legible. On narrow screens, prioritise summaries before graphics and verify long labels and five series.
5. Run one desktop/mobile Impeccable inspection, batch-fix issues, then confirm once in light and dark modes.

## Verification and done criteria

- Add tests proving person-type URL state reaches the aggregation input and preserves `org`.
- Tests assert every type/month/value is available semantically and series are not colour-only.
- `bun run check`, `bun run typecheck`, `bun run test`, and `bun run test:integration` pass.
- Detector returns no untriaged findings for the target.
- At mobile width and 200% zoom, summaries, legends and plots do not clip or require two-dimensional panning.
- Only in-scope files and `plans/README.md` change.

## STOP conditions

Stop if person type is not actually supported by the service contract, if Plan 130 changed the shared filter incompatibly, or if a chart primitive requires a repository-wide redesign. Report the dependency instead of forking a local primitive.

## Maintenance notes

Keep the semantic data representation derived from the same array as the chart so future series changes cannot drift.
