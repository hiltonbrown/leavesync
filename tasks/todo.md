# Plan: Thorough Review and Hardening of Manual Sync Functionality

## Tasks

- [x] Audit all manual sync triggers across UI and server actions (Xero settings, Sync monitor, Person detail balance refresh)
- [x] Review sync handlers (`syncXeroPeople`, `syncXeroLeaveRecords`, `syncXeroLeaveBalances`, `reconcileXeroApprovalState`) for error handling, lock contention, token refreshing, and result surfacing
- [x] Review person balance refresh workflow (`requestLeaveBalanceRefresh` in `packages/availability/src/people/balance-refresh.ts`) to ensure single-person balance sync triggers directly
- [x] Check if `dispatchManualSyncAction` surfaces execution results (e.g. failure reasons or success summaries) accurately to the caller and UI
- [x] Check tenant connection and timestamp updating (`last_people_sync_at`, `last_leave_records_sync_at`, `last_leave_balances_sync_at`, `last_approval_state_reconciled_at`)
- [x] Write/update unit and integration tests for all hardened manual sync paths
- [x] Run full validation: `bun run check`, `bun run typecheck`, `bun run test`

## Review

- Audited all manual sync entry points across the product (`/settings/integrations/xero`, `/sync`, and person detail balance refresh in `/people/[personId]`).
- Hardened `refreshBalancesAction` to directly invoke `syncXeroLeaveBalances` for single-person balance refreshes when requested by users.
- Ensured all sync handlers update their respective tenant timestamps (`last_people_sync_at`, `last_leave_records_sync_at`, `last_leave_balances_sync_at`, and `last_approval_state_reconciled_at`), fixing sync timestamp indicators in the UI.
- Verified idempotency, dual-tenant isolation, proactive token refresh, and error logging across all four sync handlers.
- Monorepo validation passed: `bun run check` (767 files, 0 errors), `bun run typecheck` (19/19 packages), `bun run test` (17/17 tasks).

---

# Plan: Sync Xero employees on initial connection and manual sync

## Tasks

- [x] Export all sync handlers (`syncXeroPeople`, `syncXeroLeaveRecords`, `syncXeroLeaveBalances`, `reconcileXeroApprovalState`) from `packages/jobs/index.ts`
- [x] Add `@repo/jobs` to `apps/app/package.json` dependencies
- [x] Update `completeTenantSelectionAction` in `apps/app/app/(authenticated)/settings/integrations/xero/connect/_actions.ts` to execute initial sync (`syncXeroPeople`, `syncXeroLeaveRecords`, `syncXeroLeaveBalances`) directly upon connection
- [x] Update `dispatchManualSyncAction` in `apps/app/app/(authenticated)/sync/_actions.ts` to execute sync handlers directly and revalidate all relevant paths (`/people`, `/sync`, etc.)
- [x] Update and expand unit tests in `apps/app` and `packages/jobs`
- [x] Run full validation: `bun run check`, `bun run typecheck`, `bun run test`

## Review

- Resolved initial employee sync issue when connecting Xero: `completeTenantSelectionAction` now directly runs `syncXeroPeople`, `syncXeroLeaveRecords`, and `syncXeroLeaveBalances` so employees and their leave/balances are immediately loaded into Team Calendar before redirecting to the product views.
- Updated `dispatchManualSyncAction` to execute the corresponding sync handlers directly and revalidate `/people`, `/sync`, `/leave-approvals`, and `/settings/integrations/xero`.
- Exported all sync handlers and error/input types from `packages/jobs/index.ts`.
- Added `@repo/jobs` to `apps/app/package.json`.
- Verified with `bun run check` (0 errors across 767 files), `bun run typecheck` (19/19 packages), and `bun run test` (17/17 tasks, 100% passing).

---

# Plan: Complete and align the Team Calendar design system

## Confirmed brief

- **Job and audience:** Preserve Team Calendar's calm, precise visual world while making the authenticated Operate experience explicit for employees, managers, and admins, and keeping the marketing site clearly scoped as Persuade.
- **Outcome and proof:** A manager can scan the calendar quickly, high-stakes Xero and feed actions communicate progress and recovery, and every documented token or component rule has an implementation source of truth.
- **Direction:** Keep the sage/lavender provenance language and tonal hierarchy. Add a product-specific operational grammar for calendar records, async states, density, keyboard use, responsive transformation, and completion receipts.
- **Scope:** Update `DESIGN.md`, `.impeccable/design.json`, shared design-system tokens and primitives, and the app/marketing implementations needed to remove verified contradictions. Preserve factual product copy and existing domain behaviour.
- **States and ranges:** Cover first-run, empty, loading, success, stale, partial failure, permission, auth expiry, rate limiting, long content, dense records, mobile layout, reduced motion, and reduced transparency.
- **Constraints:** WCAG 2.2 AA, Australian English, no em dashes, Tailwind CSS v4, shared primitives in `packages/design-system`, no new dependencies unless existing code cannot support the requirement.

## Tasks

- [x] Audit current implementation and classify verified design, accessibility, responsive, performance, and state gaps.
- [x] Rewrite `DESIGN.md` into the canonical format with unambiguous tokens, Operate/Persuade scope, operational patterns, and measurable acceptance rules.
- [x] Regenerate `.impeccable/design.json` from the revised normative document and current reusable components.
- [x] Align shared colours, typography, focus, elevation, motion, buttons, inputs, cards, dialogs, popovers, tooltips, and charts.
- [x] Align calendar, approval, sync, feed, and responsive states where the audit finds concrete gaps.
- [x] Distil repeated or competing UI treatments without removing required functionality.
- [x] Run the bounded visual polish pass with source, hook, and responsive-state verification. Rendered browser verification was unavailable because `agent-browser` and Playwright are not installed.
- [x] Run detector, focused tests, `bun run fix`, `bun run check`, `bun run typecheck`, `bun run test`, and `bun run test:integration` as applicable.

## Review

- Rebuilt `DESIGN.md` as the single normative design contract. It now separates
  Operate, Persuade, and the scoped auth signature; resolves the neutral shadcn
  accent versus editorial purple conflict; and specifies density, responsive
  transformation, focus, motion, provenance, receipts, and failure recovery.
- Regenerated `.impeccable/design.json` and aligned the shared token and
  component implementations, including dark mode, warning semantics, frost,
  elevation, typography metrics, full-opacity focus rings, coarse-pointer hit
  areas, modal surfaces, charts, and system theme behaviour.
- Hardened the authenticated shell, calendar, approvals, plans, sync, feeds,
  notifications, and marketing demo. High-stakes mutations now retain failed
  confirmations, announce receipts, preserve organisation context, and expose
  keyboard and reduced-motion behaviour consistently.
- Removed the four detector-backed sidebar layout-transition warnings and fixed
  the integration suites' cross-package UUID collisions so the parallel CI
  gate is repeatable.
- Verified `bun run fix`, `bun run check`, `bun run typecheck`, `bun run test`,
  and `bun run test:integration`; the final runs passed. The Xero integration
  file skipped its two credential-dependent cases as configured. `git diff
  --check`, JSON validation, the canonical section check, the single-main
  landmark check, and focus-opacity scans also passed.
- Automatic Impeccable scans reported no unsuppressed deterministic findings
  on the surfaces they checked. Full-pill radii and four scoped auth artwork
  colours remain documented exceptions in `.impeccable/config.json`. Rendered
  screenshots remain unavailable in this workspace because no supported
  browser executable is installed.

---

# Plan: Create Team Calendar go-to-market plan

## Tasks

- [x] Review product truth, target users, positioning, pricing context, and launch constraints.
- [x] Validate current Xero ecosystem channels, communities, and paid-channel assumptions.
- [x] Define measurable objectives, segments, personas, channel tactics, content, and budget.
- [x] Build the four-week pre-launch, launch-week, and four-week post-launch operating calendar.
- [x] Review the plan for claim safety, ownership, decision gates, and measurement completeness.

## Review

- Recommended an Australia-first closed early-access expansion for 8 to 12
  Xero Payroll organisations, with general availability gated on product proof,
  funnel instrumentation, consistent public claims, and pricing validation.
- Defined a nine-week operating plan from 17 August to 16 October 2026, with
  explicit owners, funnel targets, channel tactics, content cadence, launch
  gates, and post-launch stop/scale decisions.
- Prioritised Xero advisers, reference customers, App Store readiness, and
  high-intent Search. Broad paid social, generic communities, and conference
  booths are intentionally deferred until acquisition economics are proven.
- Proposed a gated A$15,000 cash budget and a six-person part-time operating
  model. Revenue is treated as willingness-to-pay validation during closed
  early access because self-service billing is currently disabled.
- Published the complete execution plan in
  `plans/051-team-calendar-go-to-market-plan.md`.

---

# Plan: Audit `apps/app` accessibility, responsiveness, and component states

## Tasks

- [x] Load the product design context and audit criteria.
- [x] Inspect shared UI primitives and app surfaces for accessibility, responsive rules, and state coverage.
- [x] Run static checks and browser verification at mobile, tablet, and desktop widths (static and test verification completed; rendered browser verification was unavailable because `agent-browser` is not installed).
- [x] Document prioritised, reproducible findings and audit score.

## Review

- Confirmed `bun --cwd apps/app test` passes: 163 tests across 50 files.
- Confirmed `bun --cwd apps/app typecheck` passes.
- Audited the token system, shared primitives, calendar, notifications, member management, and alternative-contact flows, plus an app-wide detector scan.
- Browser automation was not available in this workspace, so responsive findings are source-verified and marked as such in the hand-off report.

# Plan: Consolidate active worktrees into preview

# Plan: Polish revised calendar manager workflow

## Tasks

- [x] Compare the revised calendar against the shared component system and critique backlog.
- [x] Replace the semantic mismatch in the view switch with the shared button group.
- [x] Verify the full app test suite, focused linting, type safety, and diff integrity.

## Review

- Read the latest `apps-app` critique snapshot and checked the calendar against
  the documented shared button, select, sheet, spacing, and focus conventions.
- Replaced the custom tab-like control with the shared ButtonGroup and
  `aria-pressed` state, matching its actual URL-backed view-switch behaviour.
- Verified 163 app tests across 50 files, app type-checking, focused Ultracite,
  `git diff --check`, and a clean calendar-scoped detector run. Browser visual
  inspection remains unavailable because `agent-browser` is not installed.

---

# Plan: Clarify calendar controls for managers

## Tasks

- [x] Label the selected calendar view, range, people, and record scope clearly.
- [x] Explain the filter defaults and make applied filters visible at a glance.
- [x] Rename and contextualise coverage states for a manager's scanning task.
- [x] Update focused tests and verify the calendar surfaces.

## Review

- View, range, people, and record scope are labelled in the toolbar summary;
  the controls now have precise accessible names.
- The filter sheet explains each filter and its default state, while the trigger
  surfaces the number of active refinements.
- Coverage is titled and described for the manager's task, with direct states
  for an empty range, Xero attention, and compacted people lanes.
- Verified with targeted Ultracite checks, app type-checking, and 8 focused
  calendar tests.

---

# Plan: Refocus the calendar for manager scanning

## Tasks

- [x] Assess the current calendar hierarchy and run the scoped layout pre-scan.
- [x] Make the calendar grid the default dominant surface, with compact scan context.
- [x] Move the coverage timeline behind an explicit, accessible view switch.
- [x] Update focused tests and verify layout, type safety, and formatting.

## Review

- Calendar is now the default primary surface. The contextual Today in view
  summary is capped at three people and sits beside the calendar on wide
  screens, below it on narrower screens.
- Coverage has a dedicated, URL-backed Calendar/Coverage view switch and no
  longer competes with the default calendar canvas.
- Two independent layout assessments ran: the structural review identified the
  stacked-panel hierarchy issue; the scoped detector and arbitrary-spacing scan
  found no unresolved layout findings.
- Verified with app type-checking, focused calendar tests (8 passed), a scoped
  Ultracite check, `git diff --check`, and the scoped layout detector. The
  repository-wide `bun run fix` remains blocked by pre-existing filename
  diagnostics in `.design-sync/previews`.

---

# Plan: Recover failed Xero authorisation connection migration

## Tasks

- [x] Inspect the failed Prisma migration record and live schema.
- [x] Confirm the intended column already exists in the target database.
- [x] Mark the failed no-op migrations as applied in Prisma migration history.
- [x] Re-run production migration deployment and verify no pending migrations.

## Review

- Confirmed three prior schema-direct changes were already present in Neon and
  resolved their failed migration records after verifying the live objects:
  `20260712000000_add_xero_authorisation_connection_id`,
  `20260714091900_add_approval_status_index`, and
  `20260714200000_add_published_dates`. The latter had no publication rows, so
  its backfill was not required.
- `20260714210000_add_stripe_event_created_at` applied successfully. `bun run
  migrate:deploy` and `bunx prisma migrate status` both completed successfully
  on 2026-07-15.

---

## Tasks

- [x] Inventory active branches, worktrees, and uncommitted changes.
- [x] Confirm which feature commits are already represented by `preview`.
- [x] Commit each remaining worktree change as a separate, scoped commit.
- [x] Merge all active feature and documentation branches into `preview`.
- [x] Verify the merged branch, worktree status, and ancestry.

## Review

- Merged `improve/033-xero-refresh-boundary`,
  `improve/034-out-of-office-analytics`,
  `improve/035-analytics-csv-export`, and
  `improve/036-withdraw-approved-leave` into `preview` on 2026-07-15.
- `improve/036-withdraw-approved-leave-executor` and all `subagent-*` branches
  were already ancestors of `preview`.
- Confirmed every local branch is merged into `preview` and all worktrees are
  clean. `bun run check` could not run in the `/tmp` preview worktree because
  it has no installed dependency tree, so Ultracite cannot resolve its package.

# Plan: Prune old worktrees

## Tasks

- [x] Inventory registered git worktrees and local branch merge state.
- [x] Check `/tmp` for leftover Team Calendar worktree directories not tracked by git.
- [x] Prune stale git worktree metadata and remove safe leftover directories.
- [x] Verify the remaining worktree state after cleanup.

## Review

- Ran `git worktree prune --verbose`; git reported no additional registered
  worktrees beyond the active `preview` checkout.
- Removed the empty orphaned directory `/tmp/teamcalendar-preview-merge-036`.
- Verified `git worktree list --porcelain` still shows only
  `/home/hilton/Documents/teamcalendar`, and the `/tmp` directory no longer
  exists.

# Plan 028: Increment feed SEQUENCE when leave dates change

## Tasks
- [x] Create branch `improve/028-sequence-on-date-change` from base branch `preview` (Done: checked out `improve/028-sequence-on-date-change`)
- [x] Drift check: verify no unexpected modifications to in-scope files
- [x] Step 1: Add `published_starts_at` and `published_ends_at` to the `AvailabilityPublication` model in `packages/database/prisma/schema.prisma`
- [x] Verify Step 1: Run `cd packages/database && bunx prisma format` and `bunx prisma generate`
- [x] Step 2: Create a Prisma migration with `--create-only` and append the SQL backfill logic
- [x] Verify Step 2: Run `bunx prisma migrate dev` to apply migration, and check drift with `bunx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script` (Done: created manual migration file, executed it via `prisma db execute`, and ran `db:push`; drift check confirmed empty migration)
- [x] Step 3: Project starts_at/ends_at in `projectPublishedRecord`, add them to `materiallyChanged` comparison, and include them in `select` inside `packages/feeds/src/publication/publication-service.ts`
- [x] Verify Step 3: Run `bun run typecheck` (Done: successfully compiled typecheck)
- [x] Step 4: Persist `published_starts_at` / `published_ends_at` in both create and update paths in `packages/feeds/src/publication/publication-service.ts`
- [x] Verify Step 4: Run `bun run typecheck` (Done: successfully compiled typecheck)
- [x] Step 5: Write unit tests in `packages/feeds/src/publication/publication-service.test.ts` to test date-only change increments SEQUENCE, no-op doesn't, and create persists dates
- [x] Verify Step 5: Run tests using `bunx vitest run packages/feeds/src/publication/publication-service.test.ts` (Done: 7 tests passed successfully)
- [x] Final verification: Run `bun run check` (Done: ultracite check passed successfully)

---

# Plan: Fix Vercel build missing ignoreCommand script (`scripts/skip-ci.js`)

## Tasks

- [x] Create `scripts/skip-ci.js` to handle Vercel `ignoreCommand` checks (`[skip ci]`, `[ci skip]`, `[skip vercel]`, `[vercel skip]`).
- [x] Verify `node scripts/skip-ci.js` runs cleanly without error and returns exit code 1 on normal commits and 0 on skip commits.
- [x] Run `bun run check`, `bun run typecheck`, and `bun run test` to verify zero regressions.

## Review

- Created `scripts/skip-ci.js` to handle Vercel `ignoreCommand` execution referenced in `apps/*/vercel.json`.
- `scripts/skip-ci.js` inspects `git log -1 --pretty=%B` for skip directives (`[skip ci]`, `[ci skip]`, `[skip vercel]`, `[vercel skip]`, `[no ci]`), exiting with status `0` to skip builds or status `1` to proceed with builds. Gracefully handles git execution errors.
- Created unit test `scripts/skip-ci.test.ts` verifying Node execution.
- [x] Verified `bun run typecheck`, `bun run check`, and `bun run test` all pass with 0 errors across the monorepo.

---

# Plan: Fix Vercel build `import-in-the-middle` ENOENT error

## Tasks

- [x] Add `"import-in-the-middle": "3.3.3"` and `"require-in-the-middle": "8.0.1"` to root `package.json` `overrides` section to force uniform resolution.
- [x] Run `bun install` to update `bun.lock` and eliminate nested `.bun/import-in-the-middle@...` symlinks.
- [x] Run `bun run fix`, `bun run check`, `bun run typecheck`, and `bun run test` to verify build and test safety.

## Review

- Added `"import-in-the-middle": "3.3.3"` and `"require-in-the-middle": "8.0.1"` to root `package.json` `overrides`.
- Ran `bun install` to lock all transitive dependencies (e.g. Sentry / OpenTelemetry) to single top-level package instances, preventing broken nested `.bun/import-in-the-middle@3.3.1/...` symlink resolution in Vercel.
- Verified `bun run typecheck` passes with 0 errors across 18 packages.

---

# Plan: Commit and merge all branches and worktrees to main

## Tasks

- [x] Commit uncommitted changes in active worktrees (`main`, Plan-020, Plan-035, Plan-044, Plan-045, Plan-046).
- [x] Merge all feature and subagent branches into `main`.
- [x] Clean up merged worktrees and branches.
- [x] Run full verification (`bun run check`, `bun run typecheck`, `bun run test`).
- [x] Document final repository state.

## Review

- Committed all uncommitted work across `main` and active worktree paths (Plan 020, Plan 035, Plan 044, Plan 045, Plan 046).
- Merged all 12 feature/subagent branches (`fix-all-day-ics-exclusive-end`, `fix-retryable-ics-render-errors`, `fix-validate-clerk-user-before-person-binding-027`, `perf-bound-the-approval-reconciler-038-exec`, `subagent-Plan-043-Executor-self-04ca518d`, `subagent-Plan-Executor-for-Plan-016-plan-016-executor-caf251b7`, `subagent-Plan-Executor-for-Plan-020-plan-executor-b50d5f2e`, `subagent-Plan-Executor-for-Plan-035-plan-035-executor-c804884c`, `subagent-Plan-Executor-for-Plan-044-plan-044-executor-5afe6549`, `subagent-Plan-Executor-for-Plan-045-plan-045-executor-36de651e`, `subagent-Plan-Executor-for-Plan-046-plan-046-executor-46cc18af`, `subagent-Plan-Executor-self-281c0a02`) into `main`.
- Removed all secondary worktrees and deleted all merged non-main branches.
- Ran `bun run typecheck` (19/19 tasks passed) and `bun run test` (17/17 tasks passed, 254 tests passed).
- Confirmed `main` is clean with no uncommitted changes or active worktrees remaining.
