# Completed task archive

This file summarises completed plans removed from `tasks/todo.md` during the
2026-08-29 maintenance review. Results below describe the state recorded when
each task finished; they are not claims about the current working tree. Git
history remains the source for the original checklists and full review notes.

## August 2026

### Feed subscription calendar launchpad

The `/feeds` subscription guide is now a feed-aware launchpad for authorised
viewers. It fetches active subscription options independently from table
filters, keeps the complete HTTPS URL visible and copyable, opens Apple and
registered calendar apps through `webcal`, and copies the URL before opening
Google Calendar or Outlook setup. It includes provider-specific recovery,
security guidance, manual instructions, distinct load and empty states, and
clears stale clipboard feedback when the selected feed changes.

Eight focused launchpad tests pass. Full `bun run check`, `bun run typecheck`,
and `bun run test` pass, with 409 app tests. The parallel integration command
encountered shared jobs-fixture collisions; database, availability, feeds, and
Xero passed in that run, then the isolated jobs suite passed all 65 tests. Xero
retained its two configured credential-dependent skips.

The authenticated route correctly redirected a fresh automation browser to
Clerk sign-in, so the launchpad component was reviewed in a temporary local
harness using the current design token values and production component sources.
Desktop, 390px mobile, and dark mode were checked in one bounded pass; feed
selection, copying, and manual disclosure worked, no horizontal overflow or
runtime overlay appeared, and axe-core reported zero WCAG A/AA violations. The
temporary harness was removed after verification.

### Living Team Runway for `/calendar`

The week calendar now combines coverage pressure and calendar detail in one
responsive people-and-span runway derived from the marketing
`TeamTimelineSection`. Desktop has sticky people and date rails, contiguous
multi-day bars, provenance, today and pressure signals, expand-to-all people,
and an anchored detail surface with progressive View Transitions. Mobile
transforms into a day agenda rather than requiring two-dimensional panning. Day
and month views remain focused fallbacks, and legacy `surface=coverage` week
links resolve to the integrated runway.

Focused calendar tests pass 11 assertions across page composition, distinct
coverage, clear people, lane expansion, empty state and non-contiguous spans.
Repository typechecking, all 17 unit-test tasks, and all five integration
packages pass. Calendar-scoped Ultracite and `git diff --check` pass; the full
lint command is blocked only by concurrent formatting findings in the unrelated
untracked `apps/app/.preview-feeds/index.html`. A temporary unauthenticated
fixture was rendered through the real app styles, reviewed at 1440px and 390px
in light, dark and reduced-motion modes, refined once, confirmed, then removed.
The browser reported no page console errors.

### Task-document maintenance

`tasks/lessons.md` was consolidated into durable, topic-based rules, and
`tasks/todo.md` was reduced from an 800-line historical log to active work and
unresolved follow-ups. Contradictory verification claims were time-scoped or
removed, completed plans were summarised here, and buried credential-remediation
work was restored to the active todo. `git diff --check` passed for all three
task documents. The integration gate passed with `TMPDIR=/tmp`; lint, typecheck,
and unit-test failures in the concurrent ambient-calendar implementation were
recorded in its active review rather than attributed to this documentation work.

### Calendar feed URL documentation

The product, screen, security, user-facing, and agent documentation established
the complete active feed URL as an intentional credential shown to authorised
viewers. Event privacy remains independent from URL presentation, and internal
hashes or signing material remain server-only.

### Xero token lifecycle hardening

Token rotation paths were recorded as sharing transaction-scoped advisory locks
and lifecycle-aware persistence. OAuth completion, credential scrubbing,
one-time 401 recovery, terminal 403 handling, and disconnect races received unit
and PostgreSQL integration coverage. All repository gates were recorded as
passing at completion.

### Directly accessible calendar subscribe URLs

Feed list and detail views were changed to show complete, selectable, copyable
subscribe URLs. Signed token reconstruction preserved compatibility without
persisting bearer-token plaintext, and obsolete one-time token UI was removed.
Typechecking, unit tests, integration tests, and targeted linting were recorded
as passing. Rendered browser verification remained open and was moved back to
`tasks/todo.md`.

### Live Xero leave submission

Tracy Green's annual leave for 2 to 4 November 2026 was submitted and read back
from Xero. The exercise corrected the AU write envelope and removed incorrect
caller-supplied leave periods. Team Calendar retained the internal reason and a
single reconciled record with its audit trail. Focused regression coverage was
recorded as passing.

### Xero leave discovery and approval views

The Leave Approvals action was changed to run inbound leave discovery before
approval-state refresh. AU V2 payloads, Pay Items metadata, Xero dates, period
statuses, archival semantics, and idempotency received regression coverage.
Live Review and Upcoming datasets were recorded as populated, with all gates
passing at completion.

### Queued Xero people and balance sync

The Prisma advisory-lock result was made adapter-safe, Xero payroll dates were
normalised, and stale connection handling was corrected. Repeated live people
and leave-balance runs were recorded as successful and idempotent, with persisted
source data verified and all gates passing at completion.

### Local Xero sync dispatch

The Inngest development server was added to the root development workflow, and
non-production dispatch failure received an API-boundary inline fallback.
Production failure remained a 503. Handler, cancellation, error, and response
coverage was added, with all gates recorded as passing at completion.

### Repository credential and history cleanup

Ignore rules were hardened and `.mcp.json` was removed from tracked history.
Authorised heads and the tag were rewritten and audited. GitHub-managed pull
request refs could not be rewritten with a normal push. Credential rotation and
GitHub Support purging remain incomplete and are tracked in `tasks/todo.md`.

### CI and sync hardening

Completed work covered scheduler registration initialisation, web CI config-time
dependencies, generated lint targets, current sync-health modelling, manual
dispatch semantics, and investigation of contradictory Xero sync states. Later
successful gate runs superseded earlier, time-scoped red-gate reports.

## Earlier 2026 work

The following plans were recorded as completed and were removed from the active
todo during maintenance:

- Align web and app sign-in routes, copy, metadata, and static responsive states.
- Page scheduled Xero balance sync across deterministic 40-person runs.
- Harden manual sync triggers, timestamps, failure handling, and direct balance refresh.
- Sync Xero employees and leave on initial connection and manual sync.
- Complete the Team Calendar design-system contract and implementation alignment.
- Create the Team Calendar go-to-market plan.
- Audit authenticated-app accessibility, responsiveness, and component states.
- Polish and clarify the manager calendar workflow.
- Recover failed Xero authorisation migration records.
- Consolidate and prune historical branches and worktrees.
- Increment ICS `SEQUENCE` when published leave dates change.
- Restore the Vercel `ignoreCommand` script.
- Pin `import-in-the-middle` and `require-in-the-middle` overrides for Vercel builds.
- Commit and merge historical feature work into the target branch.

Where an old review claimed browser verification while also recording that no
browser was available, this archive treats the work as source/static verification
only. Where an old checklist claimed more gates than its review evidenced, this
archive does not repeat the unsupported gate claim.
