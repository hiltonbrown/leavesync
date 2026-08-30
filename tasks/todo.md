# Current work

Last reviewed: 2026-08-30

Keep this file limited to active work and unresolved follow-ups. Each plan must
state an outcome, use verifiable checkboxes, and end with a review containing the
evidence actually collected. Completed plans move to `tasks/archive.md`.

## Active plan: Deliver Plans 110 through 143 to preview

Status: Complete

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
- [x] Plan 125: characterise Blog landmarks, guide-led positioning, navigation
  and stable sitemap dates with failing tests.
- [x] Plan 125: replace `mdx-bundler` with the supported Next MDX Server
  Component pipeline and one validated static catalogue.
- [x] Plan 125: correct both articles, build the Read-mode index/article system,
  metadata, social image, RSS and error recovery.
- [x] Plan 125: run Impeccable, React, browser, build and repository verification;
  commit, document and push before Plan 126.
- [x] Plan 126: lock Careers applicant truth, landmark, email and responsive
  contracts with focused failing tests.
- [x] Plan 126: rebuild Careers as a candid applicant page with one-or-three
  practice composition and route-aware bypass target.
- [x] Plan 126: run Impeccable, React, Axe, browser, build and repository
  verification; commit, document and push before Plan 127.
- [x] Plan 127: lock feed privacy, direct-person visibility, role assignment,
  holiday administration, observability and route-boundary contracts with
  failing tests.
- [x] Plan 127: implement the stricter privacy projection, central person
  authorisation, owner-aware mutations, Sentry scrubbing and default-protected
  Clerk route matrices.
- [x] Plan 127: rebuild `/security` from verified evidence and align the private
  vulnerability-reporting policy.
- [x] Plan 127: run Impeccable, React, browser, build and repository verification;
  commit, document and push before Plan 128.
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
- Plan 125 replaces the client-evaluated `mdx-bundler` path with official
  `@next/mdx` Server Components and one Zod-validated static catalogue. The
  catalogue now owns published ordering, explicit feature state, related
  reading, metadata, stable sitemap dates and static RSS. Both articles use AU
  launch truth, withdrawal vocabulary and a shared Read-mode article ending.
- Plan 125 focused verification passed 7 files and 15 tests. The web build
  prerendered the Blog, both articles, `/blog/opengraph-image`, `/rss.xml` and
  `/sitemap.xml`. Chromium returned HTTP 200 for all five public checks and
  captured 390×844, 820×1180 and 1440×1000 light/dark views; server-rendered
  prose remained present with JavaScript disabled. The Impeccable detector
  returned no findings and the critique improved from 18/32 to 32/32 with no
  P0 or P1 issues.
- Plan 125 full check, typecheck and unit gates passed. The first integration
  command lost Linux temporary-directory values at Turborepo's strict
  environment boundary and collected no tests; the unchanged loose-environment
  rerun passed all 119 integration tests with the two configured Xero skips.
  The optional `agent-browser` executable and Node browser bridge were
  unavailable, so the required browser matrix used the installed headless
  Chromium directly.
- Plan 126 makes the no-vacancy and no-timeline state explicit, replaces generic
  product values with three factual working practices, and adds a bounded
  low-data email introduction path. The practice grid stays one column below
  64rem and changes directly to three columns at 64rem.
- Plan 126 focused verification passed 4 files and 25 tests; web tests passed 23
  files and 75 tests. Axe 4.12.1 reported 36 passes, zero violations and zero
  incomplete checks at desktop and mobile. The first Tab reached the Careers
  bypass link, Enter focused `careers-main`, the CTA measured 44px, and 720px
  reflow plus 320px mobile both reported zero horizontal overflow. The
  Impeccable detector returned `[]` and the final critique scored 32/32 with no
  P0 or P1 issues.
- Plan 126 production build, check, typecheck, unit and all 119 integration
  tests passed, with two configured Xero skips. The mandated `127.0.0.1` Axe
  sessions caused repeated cross-origin development-resource warnings and an
  eventual Turbopack HMR panic after evidence collection; the process was
  stopped, port 3001 was freed, and the subsequent clean production build
  passed. This is recorded as a development-tooling issue, not a route defect.
- Plan 127 closes six control gaps before publishing the rewritten trust page:
  effective feed privacy, direct-person scope, owner assignment and holiday
  actions, observability scrubbing and default route protection. The public
  page now distinguishes access, protection, processing and response with only
  implemented or deliberately qualified claims.
- Plan 127 focused verification passed 9 files and 91 tests. All three affected
  production builds, repository check, typecheck, unit and 119 integration
  tests passed, with the two configured Xero skips. Impeccable returned no
  findings. True 1440px and 390px Chrome emulation in light and dark modes
  reported zero overflow, one main, one H1, four topics and 44px visible
  actions. The shared header's missing `/security` bypass mapping and absent
  workspace Axe dependency are recorded in `plans/README.md` without blocking
  the authorised sequence.

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

## Active plan: Make the calendar timezone-correct and mobile-operable

Status: Complete

### Tasks

- [x] Confirm Plan 132 drift, timezone contract and Impeccable guidance.
- [x] Place timed events in the organisation timezone with off-hours groups.
- [x] Complete compact event accessible names with type, source and status.
- [x] Add a chronological mobile month agenda with complete day paths.
- [x] Add a safe-area mobile create action and responsive toolbar grouping.
- [x] Add calendar-shaped loading and retry recovery surfaces.
- [x] Complete detector, build and repository verification.
- [x] Commit Plan 132 and prepare it to push to `origin/preview` before Plan 133.

### Review

- Plan 132 landed at `e159764`; the Plan 131 Next route-export correction found
  by the build gate landed separately at `93fef28`.
- Twenty-three focused tests cover Brisbane and New York local-hour placement,
  UTC boundaries, off-hours groups, complete event labels, agenda navigation,
  safe-area creation, loading and retry.
- Impeccable detection, canonical production build, repository check/typecheck,
  447 app tests and all 119 integration tests pass. Two configured live-Xero
  checks remain skipped.
- Turbopack twice panicked on a cached source-map task. Moving the generated
  `.next` directory to `/tmp/teamcalendar-app-next-plan132-panic` allowed the
  canonical build to complete. The protected browser route then correctly
  redirected to Clerk with `dev-browser-missing`; authenticated visual claims
  remain unmade.

## Active plan: Make out-of-office analytics accessible and insight-led

Status: Complete

### Tasks

- [x] Confirm Plan 131 drift, dependency and Impeccable Operate direction.
- [x] Add validated employee and contractor segmentation to the shared filter.
- [x] Add exact semantic values and non-colour labels to both charts.
- [x] Replace equal cards with a decision-led presence summary.
- [x] Delay the two-chart layout until wide screens and cover long labels.
- [x] Complete detector, build and repository verification.
- [x] Commit Plan 131 and prepare it to push to `origin/preview` before Plan 132.

### Review

- Plan 131 implementation landed at `b5031c9`.
- Nine focused tests cover person-type URL state, aggregation input, invalid
  values, long labels and exact semantic values across both charts.
- Impeccable detection, production build, repository check/typecheck, 439 app
  tests and all 119 integration tests pass. The two configured live-Xero checks
  remain skipped.
- The production route correctly redirects a signed-out browser to Clerk with
  `x-clerk-auth-reason: dev-browser-missing`. Authenticated desktop, mobile,
  dark-mode and 200% rendered checks remain unclaimed and are recorded here as
  requested.

## Active plan: Make leave reports trustworthy, accessible and decision-led

Status: Complete

### Tasks

- [x] Confirm Plan 130 drift, scope and Impeccable Operate direction.
- [x] Thread the selected period through CSV export and truthful filenames.
- [x] Add field-linked custom-range validation that preserves query state.
- [x] Add a semantic exact-value alternative for the team chart.
- [x] Replace equal metric cards with a decision-led summary band.
- [x] Complete focused, visual and repository verification.
- [x] Commit Plan 130 and prepare it to push to `origin/preview` before Plan 131.

### Review

- Plan 130 implementation landed at `4d726fa`.
- Focused action and UI suites pass 19 tests, including every preset, a custom
  range, linked validation errors, query preservation and the semantic chart
  table. App type-checking, production build, Impeccable detection and diff
  checks pass.
- The production route correctly redirects a signed-out browser to Clerk with
  `x-clerk-auth-reason: dev-browser-missing`. No authenticated local browser
  state is available, so desktop, mobile, dark-mode and 200% rendered checks
  remain unclaimed. This named Plan 130 visual-gate limitation is recorded here
  as requested; source, component tests and detector evidence remain valid.
- Repository check, typecheck, 434 app tests and all 119 integration tests pass;
  the two configured live-Xero checks remain skipped.

## Active plan: Rebuild pricing launch modes

Status: Complete

### Tasks

- [x] Confirm Plan 129 drift, prerequisites, approved pricing contract, and Impeccable Persuade direction.
- [x] Centralise the public plan catalogue and database projection with tests.
- [x] Rebuild coherent early-access and paid pricing experiences.
- [x] Isolate the AUD/NZD/GBP selector and add accessible comparison and FAQ surfaces.
- [x] Verify responsive modes, build, full repository gates, commit, and push.

### Review

- Plan 129 landed through `c03bc44`, `f63ddc4` and `ddef650`. The shared
  catalogue, database projection, early-access mode, paid AUD mode, regional
  availability states, native FAQ and responsive comparison are implemented.
- Both static builds, Impeccable, browser desktop/tablet/mobile checks, focused
  tests, repository check/typecheck/unit gates and all 119 integration tests
  passed. The two configured Xero checks remained skipped.
- Headless keyboard automation changed and retained the native currency value
  but did not capture the dependent React panel replacement. The pure state
  projections are covered in tests; this harness limitation is recorded in the
  plan README rather than represented as product evidence.

## Active plan: Publish Better Stack service status

Status: In progress

### Tasks

- [x] Confirm Plan 121 and 122 contracts, drift, and current official Better Stack read schemas.
- [x] Lock the provider and environment contracts with focused tests.
- [x] Replace the private-monitor React adapter with a validated public status service.
- [x] Build the accessible `/status` operational hierarchy and route-scoped styles.
- [x] Update support, environment, deployment, and status bookkeeping documentation.
- [x] Run focused checks, visual verification, production build, and all repository gates.
- [x] Commit Plan 128 and push it to `origin/preview` before starting Plan 129.

### Review

- Plan 128 landed at `ad3df8a`. The provider boundary validates public Better
  Stack resources and reports, the page fails closed to Unknown, and only the
  five canonical customer-facing services can appear.
- Focused suites passed 51 tests. Production build, Impeccable, browser
  desktop/mobile light/dark checks, 200% reflow, forced colours, reduced motion,
  check, typecheck, unit and all 119 integration tests passed. The two configured
  Xero credential checks remained skipped.
- Live Better Stack credentials and the five exact public resources are not
  configured locally. Preview remains truthfully Unknown until the documented
  web-deployment trio and provider resources are supplied.

### Calendar subscribe URL verification

- [ ] Review feed list and detail views at desktop and mobile widths using the
  available Chromium installation; verify light and dark modes, selection,
  copying, lifecycle states, and clipboard failure recovery.

### Repository credential cleanup

- [ ] Rotate the credential formerly exposed in `.mcp.json`.
- [ ] Ask GitHub Support to purge retained pull-request refs and cached commit
  views that cannot be rewritten by a normal Git push.
- [ ] Re-audit a fresh remote mirror after the purge and record the result.
