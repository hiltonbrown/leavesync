# Plan 115: Make shipped and planned payroll regions unmistakable

> **Executor instructions**: Follow every step and verification. Touch only
> in-scope files. The reviewer maintains the index.
>
> **Drift check (run first)**:
> `git diff --stat ddbebd0..HEAD -- apps/web/app/integrations/page.tsx apps/web/app/integrations/capabilities.ts apps/web/app/integrations/integrations.test.ts apps/web/app/styles/features.css`

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: Plans 113 and 114 DONE
- **Category**: tech-debt
- **Planned at**: commit `ddbebd0`, 2026-08-30; reconciled after Plan 114

## Why this matters

Australia, New Zealand and the United Kingdom currently render with identical
visual weight even though only AU is supported at launch. Status must remain
clear during a six-second scan and cannot rely on colour alone.

## Current state

- `apps/web/app/integrations/page.tsx:194-203` renders every region with the
  same article structure.
- `apps/web/app/styles/features.css:2960-2988` applies the same treatment to all
  region cards.
- `apps/web/app/(home)/components/calendar-integration-section.tsx:35-43`
  already pairs `planned` with a visible `Coming soon` label.
- Plan 113 supplies typed `shipped | planned` status.
- DESIGN.md requires tonal layering, green as a scarce signal, 12px compact
  status shapes and text alongside status colour.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Focused | `bunx vitest run apps/web/app/integrations` | all pass |
| Lint/typecheck | `bunx ultracite check apps/web/app/integrations/page.tsx apps/web/app/styles/features.css && bun run --cwd apps/web typecheck` | exit 0 |
| Visual | run web dev server and capture `/integrations` at 390x844, 820x1180 and 1440x1000 in light and dark modes | AU is visibly supported; NZ/UK visibly planned; no overflow |
| Gates | `bun run check && bun run typecheck && bun run test && bun run test:integration` | all exit 0 |

## Suggested executor toolkit

- Use `impeccable` in Persuade mode. Read `polish`, then `craft-floor`
  immediately before editing. Use browser verification in one bounded desktop
  and mobile batch, then at most one confirmation batch.

## Scope

**In scope**:
- `apps/web/app/integrations/page.tsx`
- `apps/web/app/integrations/integrations.test.ts`
- `apps/web/app/styles/features.css`

**Read-only**:
- `apps/web/app/integrations/capabilities.ts`

**Out of scope**:
- Changing which regions are shipped.
- Activating NZ/UK or editing the homepage pattern.
- Decorative flags or country imagery.

## Git workflow

- Branch: `codex/115-show-region-launch-status`
- Commit: `fix(web): distinguish planned payroll regions`
- Do not push or merge.

## Steps

### Step 1: Render semantic status

Use capability status to add `data-status` and visible status text to every
region. Use concise labels such as `Supported at launch` and `Planned`; keep the
country name as the heading.

**Verify**: static-render tests assert all three labels and data statuses.

### Step 2: Apply status-aware hierarchy

Give AU measured primary emphasis and planned regions a quieter neutral tonal
treatment. Pair all colour differences with the visible labels. Preserve dark
mode, forced colours and text contrast.

**Verify**: targeted lint passes and visual captures meet the stated result.

### Step 3: Run gates

Run web typecheck, four repository gates and `git diff --check`.

## Test plan

- AU renders `data-status="shipped"` and a supported label.
- NZ/UK render `data-status="planned"` and planned labels.
- Status meaning remains in rendered text.

## Done criteria

- [x] Region availability is unambiguous without reading body copy.
- [x] Colour is not the sole status cue.
- [ ] Light/dark and three viewport captures are clean. Capture was blocked by
  the recorded local browser/tooling constraints.
- [x] Available tests and gates pass, subject to the recorded disposable-
  worktree deviations below.

## STOP conditions

- Plans 113/114 are not landed.
- The capability model no longer marks only AU shipped.
- Meeting contrast requires changing global tokens.

## Maintenance notes

When a planned region ships, changing its model status should automatically
select the shipped treatment and test expectation.

## Execution review

- **Verdict**: APPROVE at `d8f84cf` on
  `codex/115-show-region-launch-status`, with visual capture explicitly blocked.
- Every region card now renders a semantic `data-status` plus visible
  `Supported at launch` or `Planned` text. Australia receives measured primary
  emphasis; planned regions use quieter neutral surfaces. Dark mode is tuned
  explicitly and forced-colour mode restores boundaries, so colour is never the
  sole cue.
- Executor verification passed 9 focused tests, targeted Ultracite, web
  type-check, all 17 unit tasks, the full integration suite and
  `git diff --check`. Reviewer inspected the three-file diff, confirmed all
  referenced tokens exist, and independently reran 2 files and 9 tests.
- Full `check` reproduced four unrelated public-holiday diagnostics. Full
  type-check encountered duplicate Prisma types caused by externally mounted
  dependencies; the app-level type-check passed.
- No screenshots are claimed. `agent-browser` is unavailable, and Turbopack
  rejects the disposable worktree's external `apps/web/node_modules` symlink.
  The server reached ready state on port 3115 before route compilation failed.
  Temporary mounts and generated artefacts were removed; the worktree is clean.
