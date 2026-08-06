# Plan 046: Execute closed AU early-access go-live

> **Executor instructions**: This is the release-control plan. Do not waive a
> failed gate, deploy from a dirty checkout or combine database migration and
> application rollback assumptions. Record evidence and accountable names in
> the review section before marking this plan DONE.
>
> **Drift check (run first)**:
> `git diff --stat b261792..HEAD -- plans .github/workflows package.json bun.lock apps/app apps/api apps/web packages/database packages/jobs packages/xero packages/feeds`
> Reconcile the plan ledger and current release artefact before scheduling the
> launch window.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: HIGH
- **Depends on**: plans 048 and 049 first, then 002, 003, 004, 005, 006, 007,
  008, 010, 011, 012, 013, 015, 016, 017, 018, 019, 020, 027, 035, 038 and 042
  through 045
- **Category**: operations, release
- **Planned at**: commit `b261792`, 2026-08-04

## Why this matters

Go-live is a controlled production change, not the point when a branch happens
to build. Team Calendar writes approved leave to payroll, publishes private
calendar data and serves multiple Clerk organisations. A launch therefore
needs demonstrated tenant isolation, idempotent Xero writes, trustworthy feeds,
scheduled synchronisation, recoverable database operations, monitored
integrations and a rehearsed rollback.

This plan releases a small, closed AU early-access cohort. It does not approve
paid self-service, NZ or UK write-back, or unrestricted general availability.

## Current readiness decision

At commit `b261792`, unrestricted general availability is a no-go. The launch
ledger still contains unresolved P1 authorisation, self-approval, pagination,
privacy-overwrite, OAuth-state, duplicate-write, dependency and feed defects.
Scheduled Xero sync is absent, CI does not enforce all production gates, and
production configuration can omit core integrations.

The local audit established this baseline:

- `bun run check`: pass;
- `bun run typecheck`: pass;
- `bun run test`: not a repository verdict because the runner attempted to
  create files under a read-only host temp path;
- dependency audit: not current because outbound registry access was not
  approved;
- manifest/lockfile versions: require plan 005 drift reconciliation before a
  frozen install can be accepted.

Re-run every result from a clean release environment. Do not carry these local
results forward as release evidence.

## Required plan ledger

The following must be DONE and merged into the release candidate:

| Area | Plans | Gate |
|---|---|---|
| Verification baseline | 048, 049 | `bun run check` and `bun run build` both exit 0, so every gate below is trustworthy rather than absorbed |
| Authorisation, privacy and tenancy | 002, 004, 013, 019, 027 | linked actor required, no self-approval, narrow browser payloads, tenant-isolated actions |
| Xero read/write integrity | 003, 006, 007, 010, 011, 012, 017, 018, 038 | safe pagination, preserved user fields, idempotent and reconciled writes |
| OAuth and dependencies | 005, 008 | current clean audit, frozen lockfile, bound OAuth state |
| Verification and CI | 015, 016, 020, 035 | real test lanes and a required production build |
| Feeds | 042, 043 | correct all-day dates and retryable internal failures |
| Operations and launch state | 044, 045 | scheduled sync and truthful, fail-safe early access |

Plans 028, 029, 030, 031, 034, 036, 037 and 039 may remain deferred for
the initial small cohort only if an owner and review date are recorded. Plan
034 becomes mandatory before enabling global feed-publication reconciliation
or materially expanding tenant count. Plans 037 and paid-mode work are outside
the AU launch scope.

## Commands you will need

Run in a clean clone at the exact release commit with the repository's pinned
Bun version:

| Gate | Command | Required result |
|---|---|---|
| Install | `bun install --frozen-lockfile` | exit 0, no lockfile change |
| Dependency audit | `bun audit --production` | no unresolved high or critical advisory; every exception is time-bound and owner-approved |
| Lint | `bun run check` | exit 0 |
| Typecheck | `bun run typecheck` | exit 0 |
| Unit tests | `bun run test` | exit 0, no empty workspace suites |
| Integration tests | `bun run test:integration` | exit 0 against a disposable database |
| Build | `bun run build` | exit 0 with production-mode synthetic config |
| Migration ledger | from `packages/database`, `bunx prisma migrate status` | the target is reachable and every expected migration is applied before release changes |
| Migration | `bun run migrate:deploy` | exit 0 against the release rehearsal branch, then production |

Capture the commit, Bun version, command, timestamp and durable log URL for
every gate. Redacted screenshots are supporting evidence, not a replacement
for command logs.

## Scope

**In scope:**

- reconciling the plan ledger and release commit;
- production configuration for app, API and web deployments;
- Clerk, Xero, Inngest, Neon, KV, Resend, Sentry and uptime-monitor setup;
- database backup, migration and restore rehearsal;
- a complete pilot-tenant acceptance script;
- staged deployment, rollback, monitoring and incident ownership;
- release evidence and a written go/no-go decision.

**Out of scope:**

- implementing unresolved dependency plans during the launch window;
- paid checkout or public recurring pricing;
- NZ or UK payroll write-back;
- adding unreviewed production data processors;
- destructive rollback of production migrations;
- accepting known P1 defects because the first cohort is small.

## Git workflow

- Release branch: `release/au-early-access`
- Tag after acceptance: `au-early-access-YYYY-MM-DD`
- Release commits contain only reviewed plan work and release documentation.
- Do not deploy a local worktree with uncommitted files.

## Steps

### Step 1: Reconcile the ledger and freeze the candidate

For every required plan, verify its DONE claim against `main`, not a detached
worktree or unmerged branch. Run its drift check and confirm the named tests
still exercise the intended behaviour. Correct stale README statuses before
the go/no-go meeting.

Resolve plan 005 against the current manifests and lockfile. Pin one Bun
version consistently in `packageManager`, CI and Vercel. Run a fresh production
dependency audit from an approved network. Record any accepted advisory with
owner, rationale, compensating control and expiry.

Create the release branch from the accepted commit and freeze unrelated
changes. Record the commit SHA in this plan's review section.

**No-go**: any required plan is TODO, DONE only in an unmerged worktree, or no
longer passes its focused tests.

### Step 2: Prove the clean build and CI gates

Use a fresh clone or ephemeral CI worker. Run every command in the gate table
with the exact pinned Bun version. Confirm that all expected workspaces execute
tests and that CI requires the build, typecheck, unit and integration lanes.

Use synthetic production values for the build; do not copy production secrets
into local shell history or CI artefacts. Confirm the build preflight from plan
045 reports missing variable names but never values.

**No-go**: a skipped suite, flaky retry used to obtain green, lockfile mutation,
failed audit policy or build that bypasses production validation.

### Step 3: Rehearse migration, backup and restore

Create a disposable Neon branch from a production-like snapshot. Record the
current migration status and inspect the `_prisma_migrations` ledger before
applying anything. Apply `bun run migrate:deploy`, run the same schema-drift
check used by `.github/workflows/ci.yml`, then execute the core acceptance
queries and integration suite. Review every migration for locks, rewrites,
data backfill and rollback implications before the launch window.

The checked-in migration history is structurally aligned with
`schema.prisma` at `b261792`, including the two intentional migration-only
partial unique indexes. Do not use `db:push` as release evidence: it can mutate
a database into the desired shape without proving the migration ledger is
valid.

If the production database predates the squashed baseline introduced in commit
`7743e3b`, confirm `00000000000000_init` is already recorded as applied before
running `migrate:deploy`. If populated tables exist but the baseline is absent
from `_prisma_migrations`, stop and reconcile the ledger through Prisma's
documented baseline procedure. Do not run the full baseline against populated
tables and do not repair the situation with `db:push`.

Confirm the production backup/PITR policy, retention and accountable operator.
Perform a timed restore to a separate branch, verify tenant and availability
row counts, and connect a non-production API deployment to the restored data.
Record recovery point and recovery time achieved.

Database rollback is forward-only unless a specific migration has a tested,
non-destructive down path. Never delete or rewrite the production database to
match an older application build.

**No-go**: migration drift, an unexpected or failed migration ledger entry, a
missing baseline on a populated database, an unreviewed destructive change,
unproven restore or no operator with production database access during the
window.

### Step 4: Complete and verify the production configuration matrix

For each Vercel project, record the production URL, project owner, release
commit and the variable-name-only output of plan 045's preflight. Then verify:

- Clerk: production instance, Organisations enabled, personal accounts off,
  roles present, app domains allowed and webhook endpoint healthy;
- Xero: production application, exact callback URL, AU scopes, token encryption
  key and revocation/contact owner;
- Inngest: production signing/event keys, registered functions, scheduler
  freshness and failure alerts;
- Neon: production database, pooled and direct connection ownership, backup and
  restore evidence;
- KV: production credentials, feed cache isolation and operational owner;
- Resend: verified sending domain, SPF/DKIM, from/reply-to address, bounce path
  and delivery alert;
- Sentry and uptime monitoring: release/environment tags, alert destinations,
  data scrubbing and external checks for web, authenticated app, API health and
  a synthetic ICS feed;
- DNS and TLS: canonical domains, redirect behaviour and certificate health;
- support: monitored address, responder, hours, escalation path and incident
  communication template.

Use different test and production credentials. Confirm that logs and Vercel
artefacts expose no secret values.

**No-go**: a missing owner, half-configured pair, unverified email domain,
unhealthy webhook or production preflight failure.

### Step 5: Run the pilot tenant acceptance script

Create a dedicated AU early-access pilot Clerk Organisation and Xero demo or
approved test tenant. Keep evidence tenant-scoped. Exercise, in order:

1. sign-in, Organisation switching and owner/admin/manager/viewer boundaries;
2. Clerk webhook person linking and rejection of an invalid Clerk user;
3. Xero OAuth initiation, callback, replay/expiry rejection and disconnect;
4. initial people, leave and balance sync, then scheduled 15-minute/hourly
   freshness and pause behaviour;
5. Xero pagination with a malformed record, proving no mass archive;
6. draft, submit, approve, decline and withdraw, including lost-response retry
   and no duplicate Xero application;
7. manager self-approval denial and null/unlinked actor denial;
8. approvals-list responses contain no raw Xero or write-error audit payloads;
9. privacy-field preservation after inbound sync;
10. manual WFH or training availability creation and update;
11. feed creation, privacy modes, exact all-day dates, ETag/304, token rotation,
    revocation/expiry 410 and injected transient failure 503;
12. subscription in Apple Calendar, Google Calendar and Outlook, checking the
    same dates and privacy projection;
13. in-app/SSE and email notifications, including a failed Xero write;
14. help, privacy, terms and support journeys from both app and web.

Repeat the tenant-isolation cases with a second Clerk Organisation. Query audit
logs for administrative and approval actions. Remove or revoke synthetic feeds
and credentials after acceptance.

**No-go**: any cross-tenant observation, duplicate payroll write, wrong calendar
date, stale scheduled sync, unreported job failure or unavailable support path.

### Step 6: Approve the business and legal launch state

The accountable owner must record approval for:

- closed AU cohort and admission list;
- early-access pricing and no-charge position;
- privacy request and deletion channel, retention practice and subprocessors;
- terms applicable to the cohort;
- support hours, incident severity definitions and customer communication;
- deferred-plan owners and review dates;
- launch, incident commander and rollback authority.

This is approval evidence, not permission for an engineer to invent legal or
commercial terms.

**No-go**: approval is verbal only, the public copy conflicts with the approved
state, or no person can authorise rollback.

### Step 7: Deploy in stages and run smoke checks

At the agreed low-traffic window:

1. announce the change window and freeze;
2. confirm the latest backup and record starting metrics;
3. apply reviewed production migrations;
4. deploy API, then app, then web from the same release commit;
5. verify health, Clerk webhook, Inngest registration, scheduler freshness,
   Resend delivery and the synthetic feed after each relevant deployment;
6. run the short pilot path: sign-in, sync read, one manual availability write,
   one feed fetch and one notification;
7. admit only the named first customer after the pilot remains healthy.

Do not promote all projects simultaneously without intermediate checks. Record
deployment IDs and timestamps.

### Step 8: Roll back safely when a no-go signal appears

Application rollback order is web, app and API to the last known compatible
deployments. Confirm schema compatibility before rolling API or app backward.
Use a forward database fix unless a tested non-destructive migration rollback
was approved in Step 3.

For suspected tenant isolation, feed privacy or token exposure:

- stop cohort onboarding;
- disable affected job or route through an existing reversible control;
- revoke affected feed and Xero credentials where necessary;
- preserve logs and audit evidence;
- notify the incident owner and affected customers under the approved plan.

For sync/write corruption, pause the affected Xero tenant before retrying. Do
not replay events until idempotency and current external state are understood.

### Step 9: Monitor the first 72 hours and close the release

For the first 24 hours, assign an active operator and review at least hourly:

- auth and webhook failure rates;
- scheduler age and last successful people/leave/balance sync by tenant;
- Xero rate limits, retries, write failures and reconciliation lag;
- ICS 5xx, latency, cache health and token failures;
- email bounce/delivery failures;
- database errors, connection pressure and migration anomalies;
- support contacts and any privacy concern.

Continue daily review through 72 hours. Define alert thresholds before launch;
do not invent them after an incident. At 72 hours, record the customer count,
incidents, unresolved errors, deferred-plan decisions and whether the cohort
may expand.

Mark this plan DONE only after the evidence and 72-hour review are linked.

## Evidence checklist

- [ ] Release commit, tag, Bun version and deployment IDs.
- [ ] Required plan ledger merged and current.
- [ ] Clean install, audit, lint, typecheck, unit, integration and build logs.
- [ ] Migration rehearsal and timed backup-restore record.
- [ ] Variable-name-only production preflight for app, API and web.
- [ ] Integration ownership and alert destinations.
- [ ] Two-tenant pilot acceptance results.
- [ ] Business, privacy, support and rollback approvals.
- [ ] Smoke-check timestamps and starting metrics.
- [ ] 24-hour and 72-hour monitoring reviews.

## Done criteria

- [ ] Every required dependency plan is DONE on the release commit.
- [ ] All release gates pass in a clean, reproducible environment.
- [ ] Production backup, restore and migration procedures are proven.
- [ ] Core integrations, alerts and support have accountable owners.
- [ ] The complete two-tenant pilot script passes.
- [ ] Deployment and rollback are rehearsed and recorded.
- [ ] No P1 incident is unresolved at the end of the first 72 hours.
- [ ] Cohort expansion is an explicit post-launch decision.

## STOP conditions

- Any required plan or release gate is incomplete or red.
- A dependency audit is unavailable or has an unaccepted high/critical result.
- A production secret, backup, webhook, scheduler or support path is unverified.
- Migration or restore rehearsal does not complete successfully.
- Tenant isolation, payroll write idempotency, feed privacy or all-day dates fail
  acceptance.
- The release commit differs between app, API and web without an approved
  compatibility reason.
- There is no incident commander or rollback authority for the window.

## Maintenance notes

Repeat this release-control plan for every material expansion in country,
billing mode or cohort size. General availability needs a fresh capacity,
performance, support-load, accessibility and legal review; early-access success
does not imply those gates are satisfied.
