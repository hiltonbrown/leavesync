# Team Calendar implementation plans

This directory is the implementation backlog maintained through the `improve`
skill. It was fully reconciled on 29 August 2026 against `preview` at `f79b1de`.
All 48 completed plans (Plans 001–023, 025–030, 032–040, 042–061, 066, 069, 075–107)
have been implemented, tested and verified. All completed plan files have been removed
from `plans/` into the completed-plan ledger below. All 14 rejected plan files
(Plans 024, 031, 051, 058, 062, 063, 064, 065, 067, 068, 070, 071, 072, 073, 074)
have also been removed, with their decision rationales and superseding plan linkages
preserved in the Reconciliation decisions section below. The execution queue contains
16 TODO plans. The two regional activation plans remain `BLOCKED` (Plans 108 and 109),
pending named live Xero environments and UK partner permission.

## Execution policy

Set 2026-08-26 and clarified 2026-08-30: all plan executions use and land
directly on `preview` (`origin/preview`), not `main`, and run directly in this
working tree. There is no isolated git worktree. This supersedes the `improve`
skill's default
`execute` dispatch (`isolation: "worktree"`, branch off the default branch)
for this repo only:

- Every TODO/BLOCKED plan's `## Git workflow` section names `preview` as the
  branch and landing target. Executors do not create plan-specific feature
  branches.
- Executors work directly in the current working tree. Uncommitted changes
  must be checked (`git status`) and preserved before editing, per the standing
  git safety rules.
- The advisor's review verdict process is unchanged: re-run done criteria,
  check scope, read the diff. **APPROVE** still means presenting the diff for
  the user's own push decision. The advisor and executor never push to
  `origin/preview` without that explicit go-ahead.
- Rejected and DONE plans are historical records; this policy does not
  retroactively change how already-merged work landed (092 and 076 merged to
  `main`, before this policy existed).

## Verification snapshot

This reconciliation was read-only outside `plans/`.

| Evidence | Result |
|---|---|
| Repository checks (`bun run check`) | 814 files checked in 6s, 0 fixes needed |
| Typecheck (`bun run typecheck`) | 19/19 packages passed across monorepo |
| Availability focused tests | 2 files, 89 tests passed |
| Jobs leave-record focused tests | 1 file, 20 tests passed |
| Feed projection/render focused tests | 2 files, 40 tests passed |
| Next config, Xero and observability focused tests | 6 files, 91 tests passed |
| Additional Xero plan-review suite | 6 files, 96 tests passed |
| Plan 030 execution | approved at `ecd49f5`, merged as `bf789b9`; focused dashboard tests 14/14, check, typecheck, unit and live database integration gates passed |
| Plan 037 execution | approved at `a7e7289`; read-only research spike, official NZ/UK OpenAPI analysis, findings recorded in `plans/037-nz-uk-write-back-findings.md` |
| Plan 039 execution | approved at `d3733fe`; deleted unused HTML feed prototype, 0 remaining references, build, check, typecheck, unit and live database integration gates passed |
| Plan 056 execution | approved at `d0a9416`; focused handler tests 19/19, migration applied cleanly, check, typecheck, unit and live database integration gates passed |
| Plan 057 execution | approved at `782c2b5`, merged as `409fd10`; exact error channels scrubbed across nesting levels, all gates passed |
| Plan 059 execution | approved at `c26a38e`; focused stream route tests 14/14 with fake timers, check, typecheck, unit, live database integration and diff gates passed |
| Plan 060 execution | approved at `36e0bc3`; focused analytics tests 25/25, query shape assertions confirming audit blobs omitted, all gates passed |
| Plan 061 execution | approved at `cc2d3fa`; unified feed token and KV resolution (1 lookup, 1 read), narrowed feedTokenSelect, horizon-scoped public holiday query |
| Plan 066 execution | approved at `93f73cc`; billing SQL integration suite 5/5, Xero tenancy P2002 uniqueness suite 3/3, duplicate route test files deleted, alternative contact suite 22/22 |
| Plan 075 execution | approved at `98cf713`; removed debug harness, all gates passed |
| Plan 076 execution | approved at `a2c3afb`, merged as `d608a12`; database tenant UUID scheduler routing, focused tests 15/15, all gates passed |
| Plan 077 execution | approved at `9fc4fb6`; validated UUID parameters on POST/PATCH/DELETE availability routes, early 400 rejection without database access, route suite 27/27 |
| Plan 078 execution | approved at `365d8ef`; deleted unused feed token helpers (createInitialToken, listTokens, getActiveTokenHint) and dead mapping schemas |
| Plan 079 execution | approved at `5cabfe8`; getSubscriptionForStripeCustomer dual lookup, cross-checked customer and organisation bindings in payments webhook, conflict suite 16/16 |
| Plan 080 execution | approved at `bd75375`; rate limited public feed endpoint /ical/:token.ics (60 req/min per IP, 120 req/min per token digest), fail-open Redis outage policy |
| Plan 081 execution | approved at `a045ddb`; pure support issue payload builder with dynamic code fences, control character stripping, PII reduction |
| Plan 082 execution | approved at `dbc0356`; centralised availability record label mapping and helpers in @repo/core, replaced ad-hoc string formatting across packages |
| Plan 083 execution | approved at `dd7847b`; shared Redis REST transport in @repo/core with credential redaction, notifications env key schema in keys.ts |
| Plan 084 execution | approved at `800f1bb`; removed redundant root ws override while preserving @repo/database safe floor constraint, clean lockfile resolution |
| Plan 085 execution | approved at `a26b476`; reconciled root scripts and package ownership tables across AGENTS.md, CLAUDE.md and GEMINI.md |
| Plan 086 execution | approved at `aaaf7c8`; read-only research spike, official Xero OpenAPI analysis confirming AU-only GL group semantics, findings recorded in `plans/086-findings.md` |
| Plan 087 execution | approved at `7aef039`; person_type integration assertions 8/8, People client notification test suite 11/11, sync actions error/cancellation suite 12/12 |
| Plan 088 execution | approved at `0c5f42f`; explicit database package exports map, public query adapters, elimination of all private @repo/database/src/* imports, boundary tests 4/4 |
| Plan 089 execution | approved at `6fb72b2`; narrow Prisma select allowlist, serialisable XeroPersonMatchView mapper, matches client tests 6/6 |
| Plan 090 execution | approved at `6ae18c6`; single-transaction stale leave archival with updated_at guard, per-stale-record publication materialisation removed |
| Plan 091 execution | approved at `ad8bdcd`; 40-person page scheduled balance sync, compare-and-swap cursor pagination, cycle completion reset, targeted refresh isolation |
| Plan 092 execution | approved at `c680fc2`, merged as `1122457`; shared Next config HSTS header without preload promises |
| Plan 093 execution | approved at `28b559f`; observed nonce-ready report-only CSP with first-party scrubbed report sink, proxy nonce composition, evidence in `plans/093-csp-observation.md` |
| Plan 094 execution | approved at `f4d6149`; enforced observed nonce Content-Security-Policy on app Edge proxy, preserved Reporting-Endpoints |
| Plan 095 execution | approved at `ba296bc`; centralised holiday applicability helper in @repo/core (holidayIsNonWorking), unified across feeds, calendar, analytics and working days |
| Plan 096 execution | approved at `04e0c40`; aligned single status, batched status, and dashboard next-holiday cards with @repo/core holidayIsNonWorking helper |
| Plan 097 execution | approved at `ecd49f5`, merged as `e5ed63c`; employee page mapper record isolation, returned Xero person reuse without unarchiving manual people |
| Plan 098 execution | approved at `937540a`; xero_missing_since migration applied, 24h absence confirmation lifecycle, bulk-loss guards (>=20%, >5, empty/truncated) |
| Plan 099 execution | approved at `c024e58`; clerkAccessService 1-to-1 account linking, guarded bulk invitation dispatch (<=10/batch, <=50/hour), admin auth and audit logging |
| Plan 100 execution | approved at `6d5c415`; NZ and UK v2 paginated employee readers, regional employee dispatch, case-insensitive active status mapping |
| Plan 101 execution | approved at `ecd49f5`, merged as `0a42835`; currency unit and code support on leave_balances, validated raw source payload, fail-closed validation |
| Plan 102 execution | approved at `5b0dbe0`; low-level New Zealand leave, balance and application status readers, explicit NZD currency mapping, permission error handling |
| Plan 103 execution | approved at `0d5b502`; low-level United Kingdom leave, balance and application status readers, ordinary hour/day null currency, permission error handling |
| Plan 104 execution | approved at `5d95d37`; 20-person paginated regional leave sync with dual-tenant CAS cursor advancement, person-scoped stale leave archival |
| Plan 105 execution | approved at `22c69b2`; employee-aware regional approval reconciliation for NZ and UK tenants, missing employee ID validation failure |
| Plan 106 execution | approved at `bd8248c`; orchestrated 40-person regional balance pages for NZ and UK tenants, per-employee cursor CAS updates, NZD currency mapping |
| Plan 107 execution | approved at `6b66916`; formatLeaveBalance helper with Intl.NumberFormat NZD and unit handling, services restricted to day subtraction only |
| Current indexed plans | 98: 28 TODO, 54 DONE (including queue completions), 14 REJECTED (ledgered decisions), 2 BLOCKED |

## Execution queue

Plans 110–120 were added on 30 August 2026 from a read-only audit of
`apps/web/app/integrations`. They refine the existing Persuade surface using the
Impeccable design contract. Execute sequentially because later plans depend on
the content model and CSS location established by earlier plans.

Plan 121 was added on 30 August 2026 from the contact-page critique. It combines
all vetted `/contact` findings into one Persuade-mode refinement.

Plan 122 rolls the full `/customers` critique into one Impeccable-shaped page
plan. It follows Plan 120 because it shares marketing focus, metadata and
stylesheet seams with the integrations sequence.

Plan 123 rolls the full `/about` critique into one founder-led, Impeccable-shaped
trust-page plan. It follows Plan 122 so it reuses the completed focus, metadata,
header-test and route-scoped stylesheet contracts instead of overwriting them.

Plan 124 rolls the full `/help-centre` critique into one Impeccable Read-mode
plan. It keeps content truth, task architecture, accessibility, responsive
reading, sitemap discovery and contract tests together as one page-level change.

Execution decision recorded 30 August 2026: Plan 124 uses the PRODUCT privacy
labels (`Out of office` for Masked and `Busy` for Private), and describes
calendar refreshes as client-controlled rather than promising a numeric delay.
The shipped decline action requires a reason between 3 and 1000 characters.
The remaining mismatch between that action and the configurable `Require decline
reason` setting is documented for follow-up and does not block this plan.
Verification note: headless Chromium ignored browser zoom shortcuts, so 720 CSS
pixels verified the equivalent 200% reflow of a 1440-pixel viewport. The guide's
static phase navigation does not claim saved progress, and its intentionally
expanded mobile procedure remains a monitoring item rather than a launch block.

Plan 125 rolls the full Blog critique into one Impeccable Read-mode publishing
plan. It keeps the MDX pipeline, editorial model, content truth, interface,
accessibility, discovery, metadata, RSS and verification in one vertical slice.

Execution note recorded 30 August 2026: Plan 125 uses official `@next/mdx`
Server Components and one validated static catalogue. Focused tests passed 7
files and 15 tests; the production build prerendered the Blog, both articles,
the social image, RSS and sitemap. All five public endpoints returned HTTP 200,
server-rendered article prose remained available without JavaScript, and the
390×844, 820×1180 and 1440×1000 light/dark Chromium matrix was visually clean.
The Impeccable detector returned no findings and the critique improved from
18/32 to 32/32 with zero P0/P1 issues. Full check, typecheck, unit and
integration gates passed. The first integration invocation collected no tests
because Turborepo strict environment filtering dropped this host's Linux temp
override; the unchanged `--env-mode=loose` rerun passed 119 tests with the two
configured credential-bound Xero skips. The packaged `agent-browser` executable
and Node bridge were unavailable, so the installed headless Chromium supplied
the visual and JavaScript-disabled evidence directly.

Plan 126 consolidates the full `/careers` critique into one Impeccable-shaped
page plan. It follows Plan 122 so Careers extends the established route-aware
skip-link and route-owned stylesheet seams rather than creating competing
shared-shell mechanisms.

Execution note recorded 30 August 2026: Plan 126 now leads with the truthful
no-role and no-timeline state, explains three concrete working practices and
offers one bounded, low-data email introduction path. Focused verification
passed 4 files and 25 tests; the production build prerendered `/careers`.
Axe 4.12.1 reported 36 passes, zero violations and zero incomplete checks at
desktop and mobile. Browser checks confirmed first-focus bypass transfer, a
44px CTA, zero overflow at 320px and 720px reflow, and a direct one-to-three
column switch at 64rem across the light/dark matrix. Impeccable scored 32/32
with zero P0/P1 issues. Full check, typecheck, 75 web tests and all 119
integration tests passed, with the two configured Xero skips. The mandated
`127.0.0.1` Axe sessions generated Next development cross-origin warnings and
eventually an HMR-only Turbopack panic after evidence collection; the process
was stopped, port 3001 was freed and a clean production build passed. Unit and
integration gates used `--env-mode=loose` so this host's Linux temp-directory
override reached Turborepo workers.

Plan 127 rolls the full `/security` critique into one release-gated control and
trust-page plan. It follows Plan 120 so the page reuses the settled marketing
focus, metadata and scoped-stylesheet conventions. Its security remediations
must land before its public claims are published.

Execution note recorded 30 August 2026: Plan 127 now applies the stricter feed
and record privacy mode, centralises direct-person visibility, restricts owner
invitations to owners, admits owners to holiday administration, scrubs all
Sentry runtimes and protects future app/API routes by default. The rebuilt
`/security` page uses only verified or qualified claims and the confirmed
private GitHub Security Advisory route; the unverified security mailbox was
removed. Provider region and replication settings were not available locally,
so the page deliberately describes them as deployment-dependent.

Focused verification passed 9 files and 91 tests. App, API and web production
builds passed, as did check, typecheck, all unit tests and all 119 integration
tests with the two configured Xero skips. Impeccable returned no findings after
removing its flagged side-stripe treatment. Windows Chrome CDP captured true
1440px and 390px full-page light/dark renders; both widths reported zero
horizontal overflow, one main, one H1 and four topic sections. The visible
actions measured at least 44px.

Residual notes: the existing platform keep-alive route has no data payload and
remains on the explicit public operator-probe allowlist. The shared marketing
header does not yet map `/security` to its route-aware bypass link, so first Tab
focuses the brand link even though `security-main` is focusable; that header is
outside this plan's scope. `axe-core` is not installed in the workspace, so no
Axe result is claimed. The web-focused test command was run through the web
workspace configuration because a root-level direct Vitest invocation does not
load its React transform.

Plan 128 rolls the full `/status` critique into one Better Stack-backed
operational Read surface. It follows Plans 121 and 122 so it consumes canonical
support values and shared marketing style-loading contracts without duplicating
them.

Plan 129 rolls the full `/pricing` critique into one Impeccable Persuade-mode
plan. It centralises the approved Australian Starter/Premium/Enterprise offer,
adds truthful AUD/NZD/GBP availability selection, and rebuilds both launch modes
as coherent, static-first, accessible pricing experiences.

Plans 130–143 were added on 30 August 2026 from a read-only Improve survey of
the requested authenticated product routes, shaped by the Impeccable Operate
critique contract. There is one plan per requested path. Plans 141, 142 and 143
record that `/availability`, `/leave-balances` and `/setup` are compatibility
redirects and route visual work to their canonical destinations. Plan 139
covers the `/settings` shell and representative subpages because `/settings`
itself redirects to `/settings/general`.

| Plan | Outcome | Priority | Depends on | Status |
|---|---|---:|---|---|
| [110](110-correct-calendar-refresh-claim.md) | Describe calendar refresh timing accurately | P1 | — | DONE at `45357d92`; LANDED ON PREVIEW |
| [111](111-correct-token-handling-copy.md) | Separate collection scope from credential protection | P1 | 110 | DONE at `5fa417a1`; LANDED ON PREVIEW |
| [112](112-align-advertised-xero-reads.md) | Align advertised Xero reads with the AU adapter | P1 | 111 | DONE at `83ed611`; LANDED ON PREVIEW |
| [113](113-centralise-integration-capabilities.md) | Centralise public integration capability status | P1 | 112 | DONE at `b50f42b`; LANDED ON PREVIEW |
| [114](114-strengthen-integration-contract-tests.md) | Test the public integration contract | P1 | 113 | DONE at `ddbebd0`; LANDED ON PREVIEW |
| [115](115-show-region-launch-status.md) | Make shipped and planned regions unmistakable | P2 | 113, 114 | DONE at `d8f84cf`; LANDED ON PREVIEW; visual capture confirmed with Plan 120 |
| [116](116-clarify-integrations-hero.md) | Clarify integrations hero hierarchy and copy | P2 | 115 | DONE at `ce5a1c4`; LANDED ON PREVIEW; visual capture confirmed with Plan 120 |
| [117](117-restore-marketing-focus-ring.md) | Restore the documented 3px marketing focus ring | P2 | 116 | DONE at `d29f65b`; LANDED ON PREVIEW; browser pass confirmed with Plan 120 |
| [118](118-use-australian-open-graph-locale.md) | Default public metadata to Australian English | P2 | 117 | DONE at `5dcaa72`; LANDED ON PREVIEW |
| [119](119-extract-integrations-css.md) | Scope integrations CSS to its route | P3 | 118 | DONE at `a65db00`; LANDED ON PREVIEW; build and visual parity confirmed with Plan 120 |
| [120](120-align-integrations-shape-scale.md) | Align integrations surfaces with the shape scale | P3 | 119 | DONE at `b8b791f`; LANDED ON PREVIEW |
| [121](121-refine-contact-page.md) | Make the contact page a clear, specific and maintainable enquiry path | P1 | 120 | DONE at `61d351c`; LANDED ON PREVIEW |
| [122](122-reshape-customers-page-as-who-its-for.md) | Reshape `/customers` into an honest, specific “Who it’s for” page | P1 | 120 | DONE at `ccf1caf`; LANDED ON PREVIEW |
| [123](123-reshape-about-as-founder-led-trust-page.md) | Reshape `/about` as a founder-led trust page | P1 | 122, approved human content and assets | DONE at `d31a0f3`; LANDED ON PREVIEW; PREVIEW PLACEHOLDERS, production identity assets remain release-gated |
| [124](124-rebuild-help-centre-read-surface.md) | Rebuild help centre as an accurate task-led Read surface | P1 | 121, 122, 123 | DONE at `2beed1a`; LANDED ON PREVIEW; browser matrix and 37/40 Impeccable critique confirmed |
| [125](125-rebuild-blog-read-mode.md) | Rebuild Blog as a validated, accessible Read-mode publishing surface | P1 | — | DONE at `2502bcf`; LANDED ON PREVIEW |
| [126](126-reshape-careers-page.md) | Turn Careers into a candid, accessible applicant page | P1 | 122 | DONE at `3debb01`; LANDED ON PREVIEW |
| [127](127-harden-security-controls-and-trust-page.md) | Close verified control gaps and rebuild `/security` from evidence | P0 | 120 | DONE at `6e8bdb5`; LANDED ON PREVIEW |
| [128](128-build-betterstack-status-page.md) | Publish validated Better Stack component health and incident history | P1 | 121, 122 | TODO |
| [129](129-rebuild-pricing-as-coherent-launch-mode-experience.md) | Rebuild pricing with approved AU plans and NZ/UK currency states | P1 | 120, 121 | TODO |
| [130](130-refine-leave-reports.md) | Make leave reports trustworthy, accessible and decision-led | P1 | — | TODO |
| [131](131-refine-out-of-office-analytics.md) | Make out-of-office analytics accessible and insight-led | P1 | 130 | TODO |
| [132](132-harden-calendar-experience.md) | Make the calendar timezone-correct and mobile-operable | P1 | — | TODO |
| [133](133-distill-feed-management.md) | Make feed subscription primary and administration progressive | P1 | — | TODO |
| [134](134-clarify-leave-approvals.md) | Make leave approvals scan-fast and action-safe | P1 | — | TODO |
| [135](135-refine-notification-centre.md) | Make notifications calmer, accessible and mobile-first | P1 | — | TODO |
| [136](136-refine-people-and-balances.md) | Make People responsive and restore profile source-of-truth cues | P1 | — | TODO |
| [137](137-distill-plans-experience.md) | Make plans clear, responsive and truthful about provenance | P1 | — | TODO |
| [138](138-shape-public-holiday-management.md) | Give public-holiday management one safe, responsive home | P1 | — | TODO |
| [139](139-restructure-settings-shell.md) | Make Settings responsive, context-safe and goal-grouped | P1 | — | TODO |
| [140](140-distill-sync-health.md) | Make sync status truthful, accessible and easier to operate | P1 | — | TODO |
| [141](141-harden-availability-compatibility-route.md) | Keep availability deep links correct and remove legacy UI ambiguity | P2 | 137 | TODO |
| [142](142-harden-leave-balances-redirect.md) | Preserve leave-balance deep links and orient users at the person profile | P2 | 136 | TODO |
| [143](143-distill-setup-checklist.md) | Make setup a single, confident next-step experience | P2 | 139 | TODO |
| [108](108-activate-new-zealand-xero-sync.md) | Activate New Zealand Xero sync | P1 | 076, 100, 102, 104, 105, 106, 107 DONE; live NZ tenant & credentials | BLOCKED |
| [109](109-activate-united-kingdom-xero-sync.md) | Validate and activate UK Xero sync | P1 | 076, 100, 101, 103, 104, 105, 106, 107 DONE; live UK partner & tenant | BLOCKED |

## Plan dependency notes

- 110–112 correct three independent product-truth defects in a shared focused
  page test before architecture changes.
- 113 introduces the typed capability model; 114 hardens its contract before
  115 makes launch status visually dependent on it.
- 116–118 are independent refinements but remain sequential so each executor
  reviews one bounded change.
- 119 relocates integrations CSS; 120 depends on the new module path.
- 125 is one self-contained Blog vertical slice. It has no dependency on the
  integrations sequence, but it must coordinate with shared focus and locale
  work in Plans 117 and 118 without overwriting their unrelated page scope.
- 121 follows 120 so the contact CTA consumes the shared 3px focus ring and 14px
  button radius without defining a competing local override.
- 122 follows 120 to reuse rather than overwrite completed focus-ring,
  Australian-locale and marketing-CSS changes while reshaping `/customers`.
- 123 follows 122 to reuse its shared header tests and route-loading contract;
  approved founder copy, LinkedIn URL and photographs are additional hard
  prerequisites.
- 124 follows 121–123 so it inherits their shared marketing-shell changes. Its
  content contract, task architecture, accessibility, responsive reading,
  sitemap and regression coverage land together so the help surface cannot be
  polished while remaining operationally inaccurate.
- 126 follows 122 to extend its route-aware skip-link and route-owned stylesheet
  patterns while preserving the canonical regional and focus work completed by
  Plans 113–120.
- 128 follows 121 and 122 so it reuses the canonical support constants and
  marketing style-loading seam. Its Better Stack projection, status hierarchy,
  incident history and recovery path land as one vertical slice.
- 130 establishes the shared analytics filter and summary treatment before 131
  extends it with person-type segmentation and multi-series accessibility.
- 141 follows 137 because `/availability` is a redirect to Plans and must not
  create a second availability interface.
- 142 follows 136 because `/leave-balances` redirects into People and depends
  on the refined profile balance destination.
- 143 follows 139 so Getting Started uses the responsive,
  organisation-preserving Settings shell.
- Plans 132–140 are otherwise independent. They may execute in
  parallel only when their explicit in-scope files do not overlap.

## Authenticated UI findings considered and rejected

- Designing standalone interfaces for `/availability`, `/leave-balances`,
  `/settings` or `/setup` was rejected because these entry files redirect.
- A repository-wide Table primitive rewrite was rejected for this batch. Each
  dense surface owns a role-appropriate mobile projection; extract a shared
  primitive only after at least three implementations converge.
- New analytics calculations, notification types, feed lifecycle states and
  Xero write semantics were rejected as product expansion rather than critique
  follow-through.
- The current notification SSE provider and complete feed URL display are
  retained because both already match the product contract.
- 127 follows 120 for the shared marketing seams. Its internal order is a hard
  dependency: control fixes and regression tests precede trust-page copy.
- 129 follows 120 and 121 so it consumes the completed focus, shape,
  stylesheet and support-data contracts. Its approved AU plan table and
  AUD/NZD/GBP availability contract precede catalogue, mode, accessibility,
  performance and test work.

## Integrations findings considered and rejected

- No direct security, unsafe-link, semantic HTML or React client-boundary issue
  was found.
- A dedicated final CTA was rejected because the immediately following footer
  already provides Sign up and Talk to us actions.
- A tablet-specific layout redesign was rejected pending rendered evidence; the
  CSS extraction plan captures 820px output and should reopen it only if the
  real layout proves materially weak.

## Pricing findings considered and rejected

- No direct security vulnerability was found in the static pricing route; it
  accepts no request input, performs no mutation and handles no credential.
- Detector signals for the floating header shadow, font usage and table-wrapper
  padding were rejected as false positives against intentional shared styling.
- Setup icon tiles and desktop line-length signals remain composition prompts,
  not standalone defects; Plan 129 changes them only where the mode-specific
  hierarchy requires it.
- Missing FAQ `aria-controls` was not promoted separately. Plan 129 replaces the
  custom accordion with native `details`/`summary` instead of adding more ARIA.
- The public support email is not a secret. Plan 129 consumes Plan 121's shared
  support contract without changing the operating model.

The unnumbered [go-to-market plan](gtm-team-calendar-go-to-market-plan.md) is a
business strategy document, not an executor plan. It was refreshed on 24 August:
the missed instrumentation milestone and absent application flow are launch
blockers, and calendar adoption is measured through observed feed-token access.

## Review & reconciliation of key artifacts (037, 086, 093, 108, 109)

| Plan / Artifact | Nature | Status | Review Findings & Architecture Decisions | Action / Unblock Path |
|---|---|---|---|---|
| **037** (`plans/037-nz-uk-write-back-findings.md`) | Research Spike Findings | DONE (Ledgered) | Official Xero Payroll NZ & UK v2 OpenAPI specs lack a 2-stage leave lifecycle (`SUBMITTED` -> `APPROVED`/`REJECTED`) and have no `/approve` or `/reject` sub-resource endpoints. Creating leave in NZ/UK directly inserts approved leave. Maintained NZ and UK as Read-Only Sync regions; outbound write-back remains AU-only. Core read & balance sync landed in Plans 100–107. | **Complete**. Decisions locked and respected across all adapters. |
| **086** (`plans/086-findings.md`) | Research Spike Findings | DONE (Ledgered) | Xero AU `EmployeeGroupName` is a payroll GL tracking category tag without stable IDs or API endpoints. Absent in NZ and UK Payroll schemas. Xero APIs do not expose supervisor/reporting hierarchy. Teams, memberships, and manager reporting lines remain 100% Team Calendar-owned to avoid GL tag pollution, ID churn, and broken calendar feed scopes. | **Complete**. Field ownership and people sync preserve manual team/manager assignments. |
| **093** (`plans/093-csp-observation.md`) | Security Observation Record | DONE (Ledgered) | 7-day observation under `Content-Security-Policy-Report-Only` gathered 0 unexplained violations across Clerk, Sentry, PostHog, Vercel Analytics, and SSE streams. Verified request-level nonce generation and first-party sanitized report sink (`/api/csp-report`). Enforced in Plan 094 on Edge proxy. | **Complete**. Enforcing policy active on `preview`. |
| **108** (`plans/108-activate-new-zealand-xero-sync.md`) | Regional Activation Plan | BLOCKED (Ready for Preflight) | All 7 code dependencies (Plans 076, 100, 102, 104, 105, 106, 107) are merged. Zero code drift against `f79b1de`. Code changes are minimal: enabling NZ in `packages/xero/src/oauth/service.ts` and `packages/database/src/queries/schedulable-xero-tenants.ts`. | **How to Unblock**: Supply operator metadata for Step 0 (sanctioned NZ demo/verification payroll tenant class, preview deployment URL, test authoriser role). Run preview live smoke matrix to transition to `DONE`. |
| **109** (`plans/109-activate-united-kingdom-xero-sync.md`) | Regional Activation Plan | BLOCKED (Ready for Preflight) | All 8 code dependencies (Plans 076, 100, 101, 103, 104, 105, 106, 107) are merged. Zero code drift against `f79b1de`. UK Payroll v2 readers, cursors, and approval handlers are fully tested with fixtures. | **How to Unblock**: Confirm Xero UK Payroll partner app permission and record sanctioned live UK tenant metadata for Step 0. Run preview live smoke matrix to transition to `DONE`. |

## Unblocking roadmap for Plans 108 & 109

1. **For Plan 108 (New Zealand)**:
   - Record a sanctioned NZ Xero Demo / Sandbox organisation with Payroll NZ configured.
   - Record preview deployment URL and callback (`https://app-preview.../api/xero/callback`).
   - Run `feat/108-activate-nz-xero` branch in preview environment to verify connect, token refresh, employee sync, leave records, leave balances, and approval status reconciliation.
   - Transition Plan 108 to `DONE` once live smoke rows are recorded in `plans/108-nz-live-evidence.md`.

2. **For Plan 109 (United Kingdom)**:
   - Confirm Xero Partner permission for Payroll UK is approved on the Xero Developer App.
   - Record a sanctioned UK Xero Demo organisation with Payroll UK configured.
   - Run `feat/109-activate-uk-xero` branch in preview environment to verify live reader contracts and end-to-end synchronization.
   - Transition Plan 109 to `DONE` once live smoke rows are recorded in `plans/109-uk-live-evidence.md`.

## Reconciliation decisions

- Plan 024 stays as the record of a rejected env-validation design. Plan 041 is
  the completed replacement. Rejected records are not “safe to delete”.
- Plan 031 mixed public package exports with a React client boundary. Plans 088
  and 089 separate those concerns.
- Plan 057 is complete at `782c2b5`, merged as `409fd10`. Exact
  case-insensitive `error` keys retain only an actual `Error` name and scrub
  every other value wholesale; the earlier approval/logging implementation
  remains merged.
- Plan 076 is complete at `a2c3afb`, merged as `d608a12`. The scheduler query
  now returns only the database tenant UUID, and distinct-ID unit and
  database-backed integration coverage proves payload and event-ID routing use
  that value.
- Plan 092 is complete at `c680fc2`, merged as `1122457`. The shared Next
  configuration now emits one exact
  `Strict-Transport-Security: max-age=31536000` header without preload or
  subdomain promises. Focused, full and live response checks passed for app,
  web and API.
- Plan 058 was rejected and split into independent stale-archive Plan 090 and
  scheduled balance-page Plan 091. The reconciled contract keeps unlimited
  rosters and defines rolling 40-person hourly pages without a completion SLA.
- Plan 059 no longer claims there are two notification providers; that bug was
  independently fixed. The real SSE failure and polling findings remain.
- Plan 063 was split into Plans 077, 078 and 079.
- Plan 062 was split into immediate HSTS Plan 092, privacy-safe report-only CSP
  Plan 093, and evidence-gated enforcement Plan 094. The rollout now has a real
  observation interval.
- Plan 064 was rejected because PRODUCT.md explicitly specifies `410 Gone` for
  expired/revoked tokens. Plans 080 and 081 retain rate limiting and support-data
  hardening.
- Plan 067 was split into Plans 082–085. The “not in use” package warning remains
  valid and must not be deleted.
- Plan 068 proposed an abstraction before its shared primitives were stable. It
  is rejected pending narrower work.
- Plan 069 is complete at `18a8bae`, not its original planning SHA. Plan 087 owns
  missing regression tests.
- Plan 065 proposed activating dormant holiday scopes without supported writers
  and missed current-status consumers. Plans 095 and 096 implement the existing
  location/jurisdiction product contract across all six consumers.
- Plan 071's API and currency research remains useful, but its single XL change
  was rejected. Plans 100–109 separate data, adapters, orchestration,
  presentation and regional activation.
- Plans 072 and 073 were rejected. Plans 097–099 order returned-person import,
  confirmed missing-person lifecycle and Clerk access so stale payroll people
  cannot become invitation candidates. The safety rule is two observations at
  least 24 hours apart with inclusive bulk-loss guards.
- Plan 097 is complete at `ecd49f5`, merged as `e5ed63c`. The employee page
  mapper now isolates record-level failures instead of discarding a whole
  page, pagination termination uses raw page length, and returning Xero
  people reuse their existing Person and clear `archived_at` with `is_active`
  mapped independently of archival state. Manual same-email people are
  untouched.
- Plan 101 is complete at `ecd49f5`, merged as `0a42835`. `leave_balances` now
  stores a `currency` unit, a nullable `currency_code` and a validated
  `source_payload_json` raw payload. The unit/code pairing is enforced
  fail-closed at the application layer (`validateBalance`), not by database
  nullability; manual and AU hours/days balances always persist a null
  currency code and payload. One disclosed, out-of-plan-scope, minimal type
  fix in `apps/app/components/people/person-profile-content.tsx` kept
  `typecheck` green after the enum widened; reviewed and approved on merit as
  behaviour-preserving.
- Plan 030 is complete at `ecd49f5`, merged as `bf789b9`. `getManagerView` now
  reuses the already-resolved `scopePersonIds` for one minimal person read,
  one grouped Xero-failure read and one batch
  `computeCurrentStatusForPeople` call, both tenant keys included, instead of
  paging the full visible population through the local `listAllPeople`
  wrapper (removed as dead code; the public `listPeople` contract in
  `people-service.ts` is untouched). Team-today cards, counts and attention
  ordering are unchanged; a query-count test at 1/200/201 people is proven to
  fail against the pre-plan implementation.
- Plan 056 is complete at `d0a9416`. Candidate records are ordered by
  `xero_approval_checked_at` nulls-first ascending then `id` ascending, with every
  attempted record stamped under dual-tenant scoping. `not_found_error` from Xero
  archives missing records without incrementing the failure count or creating
  failed-record entries.
- Plan 059 is complete at `c26a38e`. Swallowed `.catch()` errors in the SSE stream
  route were replaced by a `NotificationStreamSession` enforcing named failure
  and idle policies. The stream cleanly closes and errors after 3 consecutive
  failures, switches from 2s to 10s polling after 60s idleness, validates
  `Last-Event-ID`, and uses recursive `setTimeout` with idempotent cancellation
  to prevent overlapping polls.
- Plan 060 is complete at `36e0bc3`. Aggregate and drilldown queries in
  `leave-reports-service.ts` and `out-of-office-service.ts` now use a shared
  explicit `analyticsRecordSelect` projection. `source_payload_json` and
  `xero_write_error_raw` audit blobs are never loaded or transported to RSC
  consumers.
- Plan 066 is complete at `93f73cc`. Raw billing SQL ordering guards and dedupe
  keys are covered by integration tests, XeroConnection and XeroTenant P2002
  uniqueness constraints are verified with integration tests, duplicate route
  test files in `apps/api/__tests__/` were deleted after porting unique
  assertions, and `alternative-contact-service.ts` has a 22-test characterisation
  suite covering authorization, validation, dual-tenant scoping, and ordering.
- Plan 087 is complete at `7aef039`. Regression seams promised by Plan 069 are
  covered: `sync-xero-people.integration.test.ts` asserts `person_type`
  persistence, `people-client.test.tsx` tests notification event filtering and
  feedback, and `sync/_actions.test.ts` covers failed and cancelled results.
- Plan 089 is complete at `6fb72b2`. `matches/page.tsx` now executes a narrow
  allowlisted Prisma select and maps rows through a pure, serialisable
  `XeroPersonMatchView` view-model mapper. `MatchesClient` imports only the
  view-model interface without database model leakage.
- Plan 090 is complete at `6ae18c6`. `sync-xero-leave-records.ts` now archives
  stale records in a single `$transaction` with a strict `updated_at <= startedAt`
  freshness guard, removes per-record publication materialisation from the stale
  path, and resolves affected feed IDs canonically with `feedIdsForPeople` to
  enqueue deduped rebuilds.
- Plan 037 is complete at `a7e7289`. Read-only research spike completed in
  `plans/037-nz-uk-write-back-findings.md`. Official Xero Payroll NZ/UK v2 APIs do
  not support two-stage leave approval (`SUBMITTED` -> `APPROVED`/`REJECTED`) or
  action endpoints. Recommends maintaining NZ/UK as Read-Only Sync regions (per
  Plans 100–109) and deferring multi-region write-back architecture.
- Plan 039 is complete at `d3733fe`. Deleted unused internal HTML feed prototype
  `packages/feeds/src/render/render-html.ts` and its test, confirming zero callers
  or exports.
- Plan 078 is complete at `365d8ef`. Deleted unused public feed token helpers
  `createInitialToken`, `listTokens`, and `getActiveTokenHint` along with dead
  internal mapping schemas, eliminating ungated token disclosure paths.
- Plan 084 is complete at `800f1bb`. Removed redundant root `ws` override in
  `package.json`, preserving `@repo/database` direct dependency constraint and
  resolving lockfile without churn.
- Plan 085 is complete at `a26b476`. Reconciled root scripts (`preflight`) and
  added `@repo/billing` and `@repo/analytics` to Infrastructure package tables
  across `AGENTS.md`, `CLAUDE.md`, and `GEMINI.md`, while preserving forbidden
  package warnings.
- Plan 086 is complete at `aaaf7c8`. Read-only research spike completed in
  `plans/086-findings.md`. Confirmed Xero AU `EmployeeGroupName` represents GL
  tracking categories rather than operational teams, is absent from NZ and UK
  Payroll APIs, lacks stable IDs, and supervisor/manager hierarchy is
  unsupported by Xero. Recommends complete Team Calendar ownership for teams.
- Plan 098 is complete at `937540a`. Added `xero_missing_since` column to
  `Person` via migration. People absence is marked on first complete missing
  observation and archived only after 24 continuous hours, protected by
  whole-run guards (>=20% missing, >5 missing, empty/truncated fetch). Returned
  IDs clear markers before validation.
- Plan 107 is complete at `6b66916`. Added `formatLeaveBalance` formatter with
  explicit NZD currency and unit support, restricted remaining balance
  subtraction strictly to day units across people, approval, and plan services,
  and updated UI components across dashboard, profile, approvals, and plans.
- Plan 079 is complete at `5cabfe8`. Added `getSubscriptionForStripeCustomer`
  query and cross-checked Stripe customer ID and Clerk organisation ID in the
  payments webhook handler, preventing misattribution and rejecting tenant
  conflicts with 409 retryable errors without recording processed events.
- Plan 099 is complete at `c024e58`. Implemented `clerkAccessService` for
  idempotent 1-to-1 linking of active unlinked payroll people to Clerk user IDs,
  guarded bulk invitations with strict <=10 batching and <=50/hour rate limit
  respect, admin permissions (`org:sys_memberships:manage`), audit logging, and
  a people directory review UI.
- Plan 100 is complete at `6d5c415`. Implemented paginated NZ and UK v2 Xero
  employee readers in `packages/xero`, wired regional employee dispatch, and
  enabled multi-region employee sync in `packages/jobs` with case-insensitive
  active status handling.
- Plan 061 is complete at `cc2d3fa`. Unified feed token lookups and cache
  resolution into a single operation (1 token lookup and 1 KV read on both
  hit and miss paths), narrowed feedTokenSelect, and replaced per-year holiday
  queries with a single horizon-bounded SQL query omitting jurisdiction.
- Plan 077 is complete at `9fc4fb6`. Validated all external organisation IDs and
  record IDs as UUIDs with Zod on the availability API routes before any database
  or service calls, returning HTTP 400 for malformed parameters.
- Plan 081 is complete at `a045ddb`. Extracted a pure GitHub support issue
  payload builder with dynamic backtick code fences, title control character
  stripping, string length bounds, and PII reduction (metadata limited to opaque
  IDs without plain text names/emails).
- Plan 091 is complete at `ad8bdcd`. Implemented 40-person page scheduled balance
  sync with compare-and-swap cursor pagination on `XeroSyncCursor`
  (`entity_type: "leave_balances"`), cycle reset on wraparound, and isolated
  targeted balance refreshes that bypass shared cursor state.
- Plan 093 is complete at `28b559f`. Implemented observed nonce-ready report-only
  CSP with a first-party scrubbed report sink (`/api/csp-report`), dynamic nonce
  generation composed in `apps/app/proxy.ts`, layout provider threading, and 7-day
  observation evidence logged in `plans/093-csp-observation.md`.
- Plan 088 is complete at `0c5f42f`. Added explicit `exports` map to
  `packages/database/package.json` with public query adapter entry points,
  rewrote all `@repo/database/src/*` callers, and added boundary enforcement
  tests verifying package encapsulation.
- Plan 094 is complete at `f4d6149`. Switched `apps/app/proxy.ts` to emit
  enforcing `Content-Security-Policy` header on request and response headers
  while preserving `Reporting-Endpoints` and first-party reporting sink.
- Plan 095 is complete at `ba296bc`. Centralised the holiday applicability
  predicate in `@repo/core` (`holidayIsNonWorking`) across feeds, calendar,
  analytics, and working-day calculations, resolving jurisdiction and location
  override differences.
- Plan 082 is complete at `dbc0356`. Centralised availability record label
  mapping and helpers in `@repo/core` (`getAvailabilityRecordLabel`,
  `getAvailabilityRecordTypeOptions`), replacing fragmented string formatting
  and label switches across packages and apps.
- Plan 083 is complete at `dd7847b`. Extracted pure shared Redis REST transport
  in `@repo/core` (`executeRedisCommand`, `executeRedisPipeline`) with safe
  credential redaction and added schema-validated keys in
  `packages/notifications/keys.ts`.
- Plan 102 is complete at `5b0dbe0`. Implemented low-level New Zealand leave,
  balance, and application status readers (`fetchNzLeaveForEmployee`,
  `fetchNzLeaveBalancesForEmployee`, `fetchNzLeaveApplicationStatus`) with Zod
  envelopes, currency/NZD mapping, and permission error handling.
- Plan 080 is complete at `bd75375`. Added rate limiting to the public feed
  endpoint `/ical/:token.ics` with 60 requests/minute per client IP and 120
  requests/minute per SHA-256 token digest, rejecting before token resolution or
  rendering, with fail-open Redis outage semantics.
- Plan 096 is complete at `04e0c40`. Aligned single-person and batched
  `current-status.ts` and dashboard upcoming holiday calculations to use the
  canonical `@repo/core` `holidayIsNonWorking` predicate, ensuring status parity.
- Plan 103 is complete at `0d5b502`. Implemented low-level United Kingdom leave,
  balance, and application status readers (`fetchUkLeaveForEmployee`,
  `fetchUkLeaveBalancesForEmployee`, `fetchUkLeaveApplicationStatus`) with
  ordinary hour/day null currency, fail-closed unmapped monetary units, and
  permission error discrimination.
- Plan 104 is complete at `5d95d37`. Orchestrated 20-person paginated regional
  leave sync for New Zealand and United Kingdom tenants using dual-tenant CAS
  cursor advancement (`XeroSyncCursor`), person-scoped stale leave archival, and
  employee-level error isolation while preserving tenant-wide AU sync.
- Plan 105 is complete at `22c69b2`. Reconciled approval status for NZ and UK
  tenants using employee-aware status dispatch, treating missing employee IDs as
  per-record failures and keeping auth/permission errors strictly isolated from
  approval business states while maintaining Plan 056's fair cursor contract.
- Plan 106 is complete at `bd8248c`. Orchestrated 40-person paginated regional
  leave balance synchronization for New Zealand and United Kingdom tenants,
  advancing the cursor per-employee after persistence, maintaining NZD currency
  contracts and fail-closed unknown unit handling.
- Plan 074 is rejected. Official Xero Payroll AU exposes `EmployeeGroupName`,
  not the assumed tracking-category or supervisor relationships. Plan 086 is a
  read-only team-mapping spike; manager hierarchy is unsupported.

## Finding-to-plan map

| Finding | Current owner |
|---|---|
| C-01 working-day timezone | 052 DONE |
| C-02 stale inbound leave write | 053 DONE |
| C-03 final-day ICS inclusion | 054 DONE |
| C-04 browser launch-mode env | 055 DONE |
| C-05 approval reconciliation starvation | 056 DONE |
| C-06 approval failure visibility | 057 DONE |
| C-07 unbounded balance work | 091 DONE |
| C-08 silent SSE poll failures | 059 DONE |
| C-09 not-found counted as failure | 056 DONE |
| S-01 exact `error` channel not scrubbed | 057 DONE |
| S-02 inert CSP and no HSTS | 092–094 DONE |
| S-03 unvalidated availability identifiers | 077 DONE |
| S-04 dead ungated token helpers | 078 DONE |
| S-05 Stripe metadata as sole tenant key | 079 DONE |
| S-06 proxy/documentation mismatch | dangerous debug handlers removed by 075 DONE; guidance in 085 DONE |
| S-07 public feed exposure | 410 retained by design; rate limiting in 080 DONE |
| S-08 support issue data boundary | 081 DONE |
| P-01 analytics audit-blob projection | 060 DONE |
| P-02 SSE polling cost | duplicate provider fixed; residual in 059 DONE |
| P-03 duplicate feed/cache lookup | 061 DONE |
| P-04 unbounded stale archive | 090 DONE |
| P-05 broad holiday reads | 061 DONE |
| A-01 duplicate record labels | 082 DONE |
| A-02 divergent holiday predicates | 095–096 DONE |
| A-03 duplicate Redis REST mechanics | 083 DONE |
| A-04 twin analytics services | 068 rejected; reassess after 060/082/095 |
| T-01 fixture collision | 051 rejected, independently fixed |
| T-02 billing SQL coverage | 066 DONE |
| T-03 Xero tenancy uniqueness coverage | 066 DONE |
| T-04 duplicate API route suites | 066 DONE |
| T-05 alternative-contact service coverage | 066 DONE |
| R-058-01 scheduled provider/database tenant mismatch | 076 DONE |
| R-058-02 bounded sync/product contract mismatch | 091 DONE |
| M-01 duplicate `ws` ownership | 084 DONE |
| D-01 stale test command guidance | 085 DONE |
| D-02 missing preflight env examples | 055 DONE |
| DOC-01 package-table drift | 085 DONE |
| R-069-01 missing Plan 069 regression seams | 087 DONE |
| R-031-01 private database `/src/` imports | 088 DONE |
| R-031-02 Prisma model types cross a client boundary | 089 DONE |
| R-071-01 NZ/UK adapters and rollout | 100–107 DONE, 108–109 BLOCKED |
| R-072-01 returning people and Clerk access ordering | 097–099 DONE |
| R-073-01 unsafe one-pass missing-person archival | 098 DONE |

## Completed-plan ledger

Plans 001–023, 025–030, 032–040, 042–061, 066, 069, 075–107 are complete and their plan files
were removed in reconciliation. Recover a historical file with `git show <relevant-commit>:plans/<filename>`
when needed. The following outcomes across the full plan series remain key architecture decisions:

| Plan | Outcome |
|---|---|
| 013 | Approval list uses an explicit projection; audit payloads do not cross the manager browser boundary |
| 021 | Shared dual-tenant scoping helper adopted |
| 030 | Manager dashboard query amplification removed; batch `computeCurrentStatusForPeople` and single grouped failure queries |
| 034 | Feed publication reconciliation bounded and batched |
| 037 | Read-only research spike on NZ/UK leave write-back: confirmed read-only sync boundary; findings in `plans/037-nz-uk-write-back-findings.md` |
| 038 | Approval reconciliation capped safely; Plan 056 owns fairness |
| 039 | Dead internal HTML feed prototype deleted |
| 041 | Empty-string env handling moved to package-owned schemas |
| 043 | Transient feed failures return retryable 503 behaviour |
| 044 | Scheduled AU sync orchestration established |
| 045–046 | Closed AU early-access product and go-live baseline |
| 049 | Default build previously passed on a suitable runner |
| 050 | Xero person-match surface scoped to one Organisation |
| 052 | Timezone contract for working-day leave units corrected |
| 053 | Inbound leave upsert guarded against stale out-of-order writes with `updated_at` timestamps |
| 054 | Synced leave retained in calendar feed through its entire concluding day |
| 055 | Launch mode made safe in browser bundles |
| 056 | Approval reconciler given nulls-first cursor for fair pagination and cycle fairness |
| 057 | Exact `error` channels scrubbed at every nesting level; approved as `782c2b5` and merged as `409fd10` |
| 059 | SSE stream failure handling hardened, polling backoff under idle state |
| 060 | Analytics services projection narrowed to explicit columns, excluding large audit payloads |
| 061 | ICS feed read path optimized: single token lookup + KV read, horizon-bounded holiday queries |
| 066 | Raw billing SQL ordering guards, Xero tenancy P2002 uniqueness, alternative contact test suites |
| 069 | Xero people sync and directory UI fixes |
| 075 | Committed Xero debug harness removed |
| 076 | Scheduled sync payloads and event IDs routed by database tenant UUID; merged as `d608a12` |
| 077 | Availability route identifier validation with Zod (early 400 on malformed UUIDs) |
| 078 | Dead feed token helper functions and private schemas deleted |
| 079 | Stripe customer ID cross-checked against Clerk organisation ID in webhook handler |
| 080 | Rate limiting on public ICS feed endpoints (60 req/min/IP, 120 req/min/token digest) |
| 081 | GitHub support issue payload builder hardened, control characters stripped, PII minimized |
| 082 | Canonical availability record labels and type options centralized in `@repo/core` |
| 083 | Shared Redis REST transport and notifications environment schema unified |
| 084 | Redundant root `ws` workspace override removed |
| 085 | Package tables and command documentation reconciled across repository guides |
| 086 | Read-only research spike on Xero EmployeeGroupName: confirmed tracking category, not operational teams; findings in `plans/086-findings.md` |
| 087 | Regression test coverage completed for Xero people sync and notification filtering |
| 088 | Explicit package exports map added to `@repo/database`, private `/src/` imports eliminated |
| 089 | Safe `XeroPersonMatchView` view-model mapper extracted for browser boundary |
| 090 | Bulk stale Xero leave archival in single transaction with freshness guard and feed invalidation |
| 091 | 40-person page scheduled balance sync with CAS cursor pagination across runs |
| 092 | Shared Next.js HSTS configuration header (`max-age=31536000`) without preload promises; merged as `1122457` |
| 093 | Nonce-ready report-only CSP observed in Edge proxy with first-party report sink; evidence in `plans/093-csp-observation.md` |
| 094 | Enforced observed Content-Security-Policy on Edge proxy |
| 095 | Supported holiday applicability predicate centralized in `@repo/core` (`holidayIsNonWorking`) |
| 096 | Current status and dashboard next-holiday calculations aligned with canonical holiday predicate |
| 097 | Returned Xero employee import hardened, page-level error isolation; merged as `e5ed63c` |
| 098 | 24-hour absence confirmation lifecycle with whole-run bulk-loss guards before employee archival |
| 099 | Clerk user ID 1-to-1 linking, guarded bulk invitations (<=10/batch, <=50/hour), directory UI |
| 100 | Paginated NZ and UK v2 Xero employee readers, multi-region employee sync |
| 101 | Currency unit and nullable code added to `leave_balances` with fail-closed validation; merged as `0a42835` |
| 102 | Low-level New Zealand leave, balance, and application status read adapters with NZD currency mapping |
| 103 | Low-level United Kingdom leave, balance, and application status read adapters with error isolation |
| 104 | 20-person paginated regional leave sync with dual-tenant CAS cursor advancement |
| 105 | Employee-aware regional approval status reconciliation for NZ and UK tenants |
| 106 | 40-person paginated regional balance synchronization for NZ and UK tenants |
| 107 | Currency-safe leave balance presentation (`formatLeaveBalance` with NZD formatting) |

## What this reconciliation did not verify

- Current full `check`, `typecheck`, unit and integration gates as one release
  run. Focused suites passed; database integration could not run without
  `DATABASE_URL`.
- A successful current default build. This host hit a Turbopack workspace
  TypeScript symlink cycle.
- Live Vercel, Clerk, Xero, Stripe, Inngest, Neon, KV, Resend, Sentry, DNS,
  email-domain, firewall or backup configuration.
- Production data shape, load, browser performance, calendar-client refresh,
  support volume or go-to-market conversion.
- A new comprehensive audit of source areas unrelated to current plan claims.

## Status rules

- `TODO`: executable and not yet evidenced.
- `IN PROGRESS`: actively being implemented.
- `DONE`: implementation and every required gate are proven on the target branch.
- `BLOCKED`: a named STOP condition or external decision prevents honest
  execution.
- `REJECTED`: superseded or based on an invalid design; never execute.

Executors must read the selected plan completely, run its drift check, stop on a
material mismatch, run every named gate and update this index only after evidence
exists. A source change is not complete when its database or build proof was
skipped.
