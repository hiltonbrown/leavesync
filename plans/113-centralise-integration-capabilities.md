# Plan 113: Centralise public integration capability status

> **Executor instructions**: Execute exactly as specified, run every command,
> and stop rather than expanding scope. The reviewer maintains the index.
>
> **Drift check (run first)**:
> `git diff --stat 83ed611..HEAD -- apps/web/app/integrations "apps/web/app/(home)/components/calendar-integration-section.tsx" apps/web/app/features/page.tsx apps/web/app/components/footer.tsx apps/web/app/contact/components/contact-form.tsx`

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: Plan 112 DONE
- **Category**: tech-debt
- **Planned at**: commit `83ed611`, 2026-08-30; reconciled after Plan 112

## Why this matters

AU launch status and planned NZ/UK support are repeated as unrelated strings
across public surfaces. Commit `7ea82490` had to correct region claims across 14
files. A small web-owned capability model should make support status explicit
without coupling the marketing site to server-only Xero adapters.

## Current state

- `apps/web/app/integrations/page.tsx:12-29` defines a page-local region array.
- `apps/web/app/(home)/components/calendar-integration-section.tsx:4-18`
  separately defines shipped/planned integration points.
- `apps/web/app/features/page.tsx:428-429`,
  `apps/web/app/components/footer.tsx:57-59` and
  `apps/web/app/contact/components/contact-form.tsx:14-15` repeat region status.
- Constants in this app use named exports and strict literal types. Do not add a
  barrel file.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Focused tests | `bun run --cwd apps/web test -- app/integrations` | all tests pass |
| Duplicate scan | `rg -n "New Zealand and United Kingdom support is planned|Australia is supported at launch" apps/web/app` | only intentional model-owned/editorial uses remain |
| Lint/typecheck | `bunx ultracite check apps/web/app/integrations apps/web/app/'(home)'/components/calendar-integration-section.tsx apps/web/app/features/page.tsx apps/web/app/components/footer.tsx apps/web/app/contact/components/contact-form.tsx && bun run --cwd apps/web typecheck` | exit 0 |
| Gates | `bun run check && bun run typecheck && bun run test && bun run test:integration` | all exit 0 |

## Suggested executor toolkit

- Use `impeccable` in Persuade mode. Preserve each surface's hierarchy and
  editorial voice; centralise facts, not every sentence.

## Scope

**In scope**:
- `apps/web/app/integrations/capabilities.ts` (create)
- `apps/web/app/integrations/capabilities.test.ts` (create)
- `apps/web/app/integrations/page.tsx`
- `apps/web/app/integrations/integrations.test.ts`
- `apps/web/app/(home)/components/calendar-integration-section.tsx`
- `apps/web/app/features/page.tsx`
- `apps/web/app/components/footer.tsx`
- `apps/web/app/contact/components/contact-form.tsx`

**Out of scope**:
- Backend package imports into `apps/web`.
- Activating NZ or UK.
- A generic multi-provider plugin model.
- Pricing, Xero OAuth or database changes.

## Git workflow

- Branch: `codex/113-centralise-integration-capabilities`
- Commit: `refactor(web): centralise integration capabilities`
- Do not push or merge.

## Steps

### Step 1: Add the typed capability model

Create a named-export module with literal `shipped | planned` status for AU, NZ
and UK, plus reviewed high-level inbound categories and calendar destinations.
Keep it serialisable and presentation-independent. Add unit tests proving AU is
the only shipped payroll region and NZ/UK remain planned.

**Verify**: capability tests pass.

### Step 2: Migrate public consumers

Derive region cards and the homepage integration list from the model. Replace
duplicated factual region strings on features, footer and contact surfaces with
small helpers or model-derived fragments while preserving their local prose.
Do not centralise full paragraphs or JSX.

**Verify**: focused tests and duplicate scan pass.

### Step 3: Run full gates

Run lint, web typecheck, all repository gates and `git diff --check`.

## Test plan

- Exact status map: AU shipped, NZ planned, UK planned.
- Supported region collection contains AU only.
- Public page still renders all three regions and the correct status language.
- No full-page snapshots.

## Done criteria

- [x] One web-owned model defines regional launch status.
- [x] All named public consumers derive factual status from it.
- [x] No server-only package is imported by `apps/web`.
- [x] Focused and full gates pass, subject to the recorded disposable-worktree
  check deviation below.
- [x] Scope is clean.

## STOP conditions

- Any in-scope surface now intentionally differs from AU-only launch.
- A consumer requires server-only code or environment secrets.
- The abstraction starts owning unrelated editorial prose.
- In-scope files drift materially before execution.

## Maintenance notes

When a region launches, update the capability model and its contract test first,
then let consumers render the new status. Live activation evidence remains a
separate prerequisite.

## Execution review

- **Verdict**: APPROVE at `b50f42b` on
  `codex/113-centralise-integration-capabilities`.
- Added one serialisable, web-owned capability model for Xero Payroll regions,
  reviewed inbound data categories and calendar destinations. The integrations
  page, homepage integration section, features FAQ, footer and contact surface
  now derive capability facts from that model while retaining local prose.
- Review required one revision: homepage status rows are now conditional with
  literal statuses, so an empty capability group cannot render an empty or
  mislabelled row; the natural Australian contact sentence was restored.
- Executor verification passed 8 focused tests, targeted Ultracite, web
  type-check, repository type-check, unit tests, integration tests and
  `git diff --check`. The full repository `check` reproduced four unrelated
  `noUnnecessaryConditions` diagnostics in unchanged public-holiday files only
  when dependencies were symlinked into the disposable worktree. The preceding
  isolated base passed the same full check, so no unrelated files were changed.
- Reviewer inspected the complete eight-file diff and independently reran the
  focused integrations suite: 2 files and 8 tests passed. The worktree was clean
  after temporary dependency mounts were removed.
