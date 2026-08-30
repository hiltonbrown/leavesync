# Current work

Last reviewed: 2026-08-30

Keep this file limited to active work and unresolved follow-ups. Each plan must
state an outcome, use verifiable checkboxes, and end with a review containing the
evidence actually collected. Completed plans move to `tasks/archive.md`.

## Active plan: Deliver Plans 110 through 143 to preview

Status: In progress

### Outcome

Plans 110 through 143 are executed in dependency order on `preview`. Each plan
uses its specified Impeccable workflow, passes its required verification,
receives a dedicated implementation commit, and is pushed to `origin/preview`
before the next plan begins.

### Tasks

- [x] Reconcile the approved Plan 110 through 119 commits with
  `origin/preview` and record their landing evidence.
- [x] Execute, verify, commit and push Plan 120.
- [x] Execute, verify, commit and push Plans 121 through 123 in dependency
  order.
- [x] Plan 124: lock the help content, markup and sitemap contracts with focused
  failing tests.
- [x] Plan 124: centralise the eight-step AU onboarding content and rebuild the
  task gateway and phased guide.
- [x] Plan 124: add Help centre navigation, route-aware bypass links, focus
  treatment and nested sitemap discovery.
- [x] Plan 124: run the Impeccable audit, bounded browser review, build and all
  repository gates; commit and push both implementation and review evidence.
- [ ] Execute, verify, commit and push Plans 125 through 129 in dependency
  order.
- [ ] Execute, verify, commit and push Plans 130 through 143 in dependency
  order.
- [ ] Run the final preview verification and record exact evidence.

### Review

- Plans 110 through 123 and their bookkeeping commits are on
  `origin/preview`. Plan 124 replaces the generic help cards with a typed,
  four-phase AU onboarding guide and task gateway, then adds exact product
  labels, role boundaries, recovery receipts, Help centre navigation, focus
  transfer and explicit nested sitemap discovery.
- Plan 124 focused verification passed 5 files and 13 tests. The web production
  build prerendered both help routes and `/sitemap.xml`; the Impeccable detector
  returned no findings. The fresh critique improved from 17/40 to 37/40 with
  zero P0 or P1 findings.
- Chromium captured both routes at 390×844, 820×1180 and 1440×1000 in light and
  dark modes. There was no horizontal overflow. Axe reported zero violations,
  the first keyboard target was the 3px skip link, activation focused the main
  landmark, reduced motion was enabled, and forced colours were verified with
  Chromium high-contrast mode. Headless Chromium ignored browser zoom
  shortcuts, so 720 CSS pixels verified the equivalent reflow of a 1440-pixel
  viewport at 200%.
- Full `bun run check`, `bun run typecheck`, `bun run test` and
  `bun run test:integration` gates passed. The two configured credential-bound
  Xero integration checks remained skipped.

## Active plan: Add a role-aware dashboard calendar timeline

Status: Implemented, browser review blocked

### Outcome

Employee, manager, and admin dashboards share an accessible calendar timeline
derived from existing dashboard data. Dates and today remain the primary visual
axis; availability, intensity, and provenance support scanning without changing
product behaviour or introducing a second data-fetch path. Viewer and admin
empty states remain explicit and do not receive a decorative timeline.

### Tasks

- [x] Define typed role adapters and deterministic empty and error fallbacks from
  the existing dashboard projections.
- [x] Implement an accessible timeline with chronological dates, a visible today
  anchor, semantic fallback content, dark mode, and reduced-motion behaviour.
- [x] Pass the feature through employee, manager, and admin compositions while
  preserving explicit viewer and admin empty states.
- [x] Align dashboard hierarchy, skeletons, and responsive layouts.
- [x] Add focused tests for personal and manager data, empty and error data,
  accessibility semantics, and static reduced-motion output.
- [x] Add an explicit manager coverage lane to the horizontal date axis, with
  exact counts, threshold-only peaks, and honest unknown-day states.
- [x] Verify the coverage lane remains horizontally scrollable, keyboard
  navigable, and readable at mobile widths.
- [x] Run targeted formatting plus `bun run check`, `bun run typecheck`,
  `bun run test`, and `bun run test:integration`; record exact results.
- [ ] Run one desktop and mobile Chromium review in light, dark, and reduced-motion
  modes; fix observed defects or record the concrete runtime blocker.

### Review

- The 14-day date axis, keyboard tab interaction, mobile scroll snapping, today
  anchor, confidence labels, public holidays, and honest partial-data states are
  implemented. Manager dates now carry proportional unavailable-person bars and
  visible live or peak counts; unknown future days show `No signal`, never zero.
- View Transitions progressively morph the selected date and are bypassed under
  reduced motion or unsupported browsers. Horizontal overscroll is contained,
  while arrow-key selection still scrolls the focused date into view.
- Targeted Biome checks, app typecheck, `git diff --check`, and 14 focused model
  and interaction tests pass.
- Full `bun run check`, `bun run typecheck`, and `bun run test` pass. The parallel
  integration gate encountered shared fixture collisions in `packages/jobs`;
  the other four packages passed, then the isolated jobs retry passed all 65
  tests. The Xero suite retained its two configured credential-dependent skips.
- Browser automation was attempted again. The CLI is unavailable in the
  workspace, Linux ARM64 exposes only Snap Chromium (which exits before DevTools
  starts), and the Windows control bridge rejects the WSL workspace path. No
  visual screenshot result is claimed.

## Active plan: Standardise plan numbering, Git workflow and Impeccable use

Status: Complete

### Outcome

The active plan batch is numbered contiguously from 121 through 143. Every plan
uses `preview` as its working and landing branch, and every plan explicitly uses
Impeccable for its rendered surface where applicable.

### Tasks

- [x] Inventory the existing plan files and their Git workflow sections.
- [x] Renumber the batch contiguously as Plans 121–143 and update dependencies.
- [x] Replace feature-branch instructions with `preview`.
- [x] Add a consistent `## Git workflow` section to every plan.
- [x] Align `plans/README.md` with the direct-on-`preview` policy.
- [x] Verify every Plan 121–143 has exactly one workflow section and
  no stale branch instruction.
- [x] Verify every Plan 121–143 explicitly invokes Impeccable, with redirect
  plans routing visual work to the canonical rendered destination.

### Review

- Confirmed exactly one file and matching `# Plan` heading for each number from
  121 through 143, with no duplicate numbers.
- Confirmed all 23 plans have one Git workflow, branch `preview`, landing target
  `preview`, and no plan-specific branch reference.
- Confirmed all 23 plans contain explicit Impeccable guidance.
- Confirmed all numbered README links resolve. `git diff --check` passes for
  tracked changes, and a direct whitespace/conflict-marker scan passes for all
  untracked plan files.

## Follow-ups

### Calendar subscribe URL verification

- [ ] Review feed list and detail views at desktop and mobile widths using the
  available Chromium installation; verify light and dark modes, selection,
  copying, lifecycle states, and clipboard failure recovery.

### Repository credential cleanup

- [ ] Rotate the credential formerly exposed in `.mcp.json`.
- [ ] Ask GitHub Support to purge retained pull-request refs and cached commit
  views that cannot be rewritten by a normal Git push.
- [ ] Re-audit a fresh remote mirror after the purge and record the result.
