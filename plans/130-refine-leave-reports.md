# Plan 130: Make leave reports trustworthy, accessible and decision-led

> **Executor instructions**: Read this plan fully. Run the drift check first and every verification gate. Stop on a named STOP condition. Before UI edits, read `.agents/skills/impeccable/SKILL.md`, run `node .agents/skills/impeccable/scripts/context.mjs --target 'apps/app/app/(authenticated)/analytics/leave-reports'` once, then read `reference/critique.md` and `reference/craft-floor.md`. Use Impeccable in Operate mode. The user has authorised the vetted P1 and P2 recommendations below.
>
> **Drift check**: `git diff --stat e7ee7c7..HEAD -- 'apps/app/app/(authenticated)/analytics/leave-reports' 'apps/app/app/(authenticated)/analytics/analytics-filters.tsx'`

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: bug, accessibility, design, tests
- **Planned at**: commit `e7ee7c7`, 2026-08-30

## Why this matters

The visible period and exported period disagree. `analytics-filters.tsx:34-54` writes the selected range to the URL, while `_actions.ts:68-71,126` always exports `this_year` as `leave-report-this-year.csv`. The chart at `leave-days-by-team-chart.tsx:30-61` also exposes exact values only graphically. A manager must be able to trust the download and inspect the same data without relying on a tooltip.

## Current state and design contract

- `page.tsx:165-177` provides strong period-led context and `page.tsx:219-222` reports freshness.
- `page.tsx:180-199` uses four equal metric cards, a documented anti-reference in `DESIGN.md`.
- Preserve manager/admin/owner scoping, approved-leave semantics, Australian English, the chart token ramp, and the export cap.
- Use tonal grouping, one lead measure, 20px persistent containers, 12px chips, 3px focus rings, 44px coarse-pointer targets, and a semantic exact-value alternative.

## Scope

**In scope**: `page.tsx`, `export-csv-button.tsx`, `_actions.ts`, `_actions.test.ts`, `leave-days-by-team-chart.tsx`, `analytics-filters.tsx`, new co-located UI tests.

**Out of scope**: aggregation formulas, tenancy/role rules, database schema, other analytics routes except a shared filter fix that Plan 131 can consume.

## Git workflow

- Branch: `preview` (`origin/preview`), not `main` or a plan-specific feature
  branch. The completed plan lands on `preview`.
- Work and commit directly in the current working tree after checking `git status` and preserving unrelated user changes.
- Do not push to `origin/preview` without explicit operator instruction.

## Steps

1. Thread validated `preset`, `from`, and `to` values into `ExportCsvButton`; resolve the identical date range server-side and generate a truthful filename. Add pending, success, and actionable failure receipts. Verify with `bunx vitest run 'apps/app/app/(authenticated)/analytics/leave-reports/_actions.test.ts'`.
2. Validate custom dates beside the controls before navigation: require both dates, reject an inverted range, preserve input, and associate errors with fields. Keep `org` and unrelated query state. Add filter component tests.
3. Add a concise accessible chart summary and semantic table/list containing every team, day value, and people count. Keep the graphic supplementary and test long team names.
4. Replace the four equal hero cards with one decision-led summary band: lead with leave days, group approved records, people and average as supporting facts, and retain the selected-period label.
5. Run one bounded Impeccable visual pass at desktop and mobile, fix the batch, then confirm once. Check dark mode, 200% zoom, empty data, long labels, keyboard focus and narrow header action wrapping.

## Verification and done criteria

- `bun run check`, `bun run typecheck`, `bun run test`, and `bun run test:integration` all exit 0.
- Export tests prove every preset and a valid custom range produce matching data and filename.
- Invalid custom ranges stay on the filter surface with field-linked errors.
- Every plotted value exists in a semantic exact-value representation.
- `node .agents/skills/impeccable/scripts/detect.mjs --json 'apps/app/app/(authenticated)/analytics/leave-reports'` returns no untriaged findings.
- No out-of-scope files change; update this plan row in `plans/README.md`.

## STOP conditions

Stop if the analytics service cannot resolve the same range as the page without changing its public contract, if tenancy/role filtering would need alteration, or if live browser access is unavailable after source and detector verification. Record the missing visual gate rather than inventing evidence.

## Maintenance notes

Plan 131 should reuse the validated filter and compact summary pattern. Reviewers should compare the displayed range, export request, CSV rows and filename as one contract.
