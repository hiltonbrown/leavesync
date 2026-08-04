# Team Calendar implementation and go-live plans

This directory is the implementation backlog produced by the `improve` skill.
Every plan is self-contained and must be drift-checked before execution.

This index was reconciled on 2026-08-04 against local `main` at commit
`b261792`. It classifies all 46 plans by release stage and records the current
go-live decision.

## Current go-live decision

**NO-GO for production today.**

The recommended first production release is a **closed AU early access**, not
unrestricted general availability:

- AU Xero Payroll only;
- a small, named customer cohort with guided onboarding;
- no paid self-service checkout;
- monitored support and explicit incident ownership;
- cohort expansion only after the later gates in this index are complete.

Go-live becomes a **GO** only when every plan in the required go-live table is
DONE on the release commit and plan 046 completes its deployment and 72-hour
review. A small cohort is not permission to waive an authorisation, payroll,
privacy, feed, test, migration, backup or support gate.

## At a glance

| Stage | Requirement | Current state |
|---|---|---|
| Closed AU early access | Complete plans 002-008, 010-013, 015-020, 027, 035, 038 and 042-046 | NO-GO, all listed plans are TODO |
| Broader cohort or public GA | Complete plans 028, 029, 034 and 036 after the early-access gate | Not started |
| Scale-triggered work | Reassess and execute plan 030 when production data shows the named round trips matter | Deferred pending evidence |
| Architecture maintenance | Complete plans 031 and 039 when launch stabilises or the affected area changes | Deferred |
| NZ or UK launch | Complete plan 037 and create follow-on implementation plans from the spike | Outside AU scope |

Completed plans remain part of the release baseline. Plan 024 is rejected and
must not be executed because plan 041 supersedes it.

## Required before closed AU early-access go-live

These are release blockers. `TODO` means the app remains a no-go.

### Product safety, privacy and payroll integrity

| Plan | Required outcome | Status |
|---|---|---|
| [002](002-fix-null-actor-authorisation-bypass.md) | An unlinked Clerk user cannot pass the nullable manager check | TODO |
| [003](003-stop-mass-archive-on-unparseable-xero-page.md) | A malformed Xero page cannot be treated as a complete sync or trigger mass archive | TODO |
| [004](004-prevent-manager-self-approval.md) | Managers cannot approve or decline their own leave | TODO |
| [006](006-stop-sync-overwriting-user-owned-privacy-fields.md) | Inbound sync preserves user-owned privacy and feed choices | TODO |
| [007](007-guard-reconciler-transitions-with-optimistic-concurrency.md) | Approval reconciliation cannot overwrite a newer local transition | TODO |
| [008](008-bind-xero-oauth-state-to-nonce-expiry-and-session.md) | Xero OAuth state is time-bound, browser-bound and replay-resistant | TODO |
| [010](010-return-auth-error-instead-of-throwing-on-token-decrypt.md) | Token decryption failures remain typed, diagnosable Xero errors | TODO |
| [011](011-fail-closed-on-decline-reason-policy.md) | A settings failure cannot disable the decline-reason policy | TODO |
| [012](012-move-failure-notifications-out-of-the-state-transaction.md) | Notification failure cannot roll back durable Xero failure state | TODO |
| [013](013-paginate-and-narrow-the-approvals-list-query.md) | Raw Xero and write-error audit payloads never cross the manager browser boundary; the list is bounded | TODO |
| [017](017-make-leave-submission-idempotent.md) | Retries and concurrent requests cannot create duplicate Xero leave applications | TODO |
| [018](018-clear-stale-xero-write-errors-on-status-change.md) | Reconciled records do not retain misleading stale write errors | TODO |
| [019](019-close-two-tenant-scoping-gaps-in-server-actions.md) | Feed and Xero-match actions enforce both tenant keys | TODO |
| [027](027-validate-the-clerk-user-before-binding-it-to-a-person.md) | A Person can bind only to a valid Clerk member of the active organisation | TODO |
| [038](038-bound-the-approval-reconciler-so-it-can-be-enabled.md) | Approval reconciliation is bounded, resumable and safe to schedule | TODO |
| [042](042-correct-all-day-ics-date-boundaries.md) | One-day and multi-day all-day leave emit correct exclusive ICS end dates | TODO |
| [043](043-preserve-retryable-feed-errors.md) | Transient feed failures return a retryable response instead of permanent 404 | TODO |

Plan 013 is deliberately in this table, not the later performance table. Its
pagination work is scale-related, but its explicit projection also prevents
`source_payload_json` and `xero_write_error_raw` from being serialised to a
client component. That data-minimisation boundary is required before the first
customer.

Plans 007, 018 and 038 are also deliberate launch gates because the current
release decision includes nightly approval reconciliation through plan 044.
Moving that chain later requires an explicit product decision to launch with
reconciliation disabled, followed by consistent changes to PRODUCT.md, plans
044 and 046, the pilot acceptance script and the customer support model.

### Reproducible verification and dependency safety

| Plan | Required outcome | Status |
|---|---|---|
| [005](005-refresh-vulnerable-dependency-pins.md) | Manifests, overrides and lockfile agree; a fresh approved production audit and build pass | TODO, drift review required |
| [015](015-enable-the-test-harness-in-six-untestable-workspaces.md) | Root and CI tests enter every owned workspace, including auth and web | TODO |
| [016](016-add-a-build-step-to-ci.md) | CI requires a production build for all deployable apps | TODO |
| [020](020-run-the-xero-disconnect-integration-test.md) | Destructive Xero disconnect isolation runs in the integration lane | TODO |
| [035](035-fix-the-turborepo-task-graph.md) | Test and typecheck tasks express their real dependencies and do not false-green | TODO |

Plan 005 was written against older dependency versions. Reconcile it against
the current manifests and `bun.lock` before execution. The release requirement
is the outcome in this table, not the stale version numbers in its old audit
excerpt.

### Production behaviour and launch controls

| Plan | Required outcome | Status |
|---|---|---|
| [044](044-schedule-au-xero-syncs.md) | Active AU tenants receive bounded people, leave and balance syncs; nightly approval reconciliation is enabled only after 007, 018 and 038 | TODO |
| [045](045-make-closed-au-early-access-truthful-and-deployable.md) | Public journeys, billing controls, production preflight, help and telemetry match closed early access | TODO |
| [046](046-execute-closed-au-early-access-go-live.md) | Clean release gates, migration and restore rehearsal, production configuration, pilot acceptance, staged deployment, rollback and 72-hour review all pass | TODO |

Plan 046 is the final release-control plan. It must not be used to discover or
implement an unfinished dependency during the launch window.

## Recommended execution order

Different owners may run independent plans in parallel, but preserve these
hard sequences:

1. **Establish trustworthy gates**: 035, then 015; also complete 016 and 020.
   Refresh and execute 005 once the build gate is available.
2. **Close direct product risks**: 002, 004, 008, 010-013, 017, 019, then 027,
   plus 042 and 043.
3. **Make inbound sync safe**: complete 003 and 006 before activating any
   scheduler.
4. **Make reconciliation safe**: execute 007, then 018, then 038.
5. **Add production scheduling**: execute 044 only after 003 and 006. Enable
   nightly approval reconciliation only after the 007, 018 and 038 chain.
6. **Make the release truthful and operable**: execute 045. It can proceed in
   parallel with most code fixes but must be complete before deployment.
7. **Release**: execute 046 only after every preceding go-live row is DONE on
   the same release commit.

### Hard dependency graph

```text
035 -> 015
040 (DONE) -> 016 -> 005 verification

019 -> 027
007 -> 018 -> 038
003 + 006 -> 044 inbound scheduling
007 + 018 + 038 -> 044 nightly approval reconciliation

002 + 003 + 004 + 005 + 006 + 007 + 008
+ 010 + 011 + 012 + 013 + 015 + 016 + 017
+ 018 + 019 + 020 + 027 + 035 + 038
+ 042 + 043 + 044 + 045
-> 046
```

## Required after early access

These plans do not block a small, supervised AU cohort. They become mandatory
at the trigger stated below.

### Before broader self-service or unrestricted general availability

| Plan | Trigger and required outcome | Status |
|---|---|---|
| [028](028-fix-three-test-quality-gaps.md) | Before GA: pin role hierarchy, feed-preview privacy and tenant-query behaviour with meaningful tests | TODO |
| [029](029-test-the-untested-server-actions.md) | Before GA: cover authenticated mutation boundaries after plans 019 and 027 settle their final shape | TODO |
| [034](034-bound-and-batch-the-feed-publication-reconciler.md) | Before enabling global feed reconciliation or materially increasing tenant count: bound and batch the job | TODO |
| [036](036-stop-returning-a-cross-tenant-existence-oracle.md) | Before unrestricted GA: keep server-side detection but return indistinguishable not-found errors | TODO |

Plan 034 should move into the go-live gate if global feed-publication
reconciliation is enabled for the first cohort. Plan 028 should move into the
go-live gate if acceptance testing cannot independently prove its role,
privacy-preview and tenant-isolation cases.

### Scale-triggered performance work

| Plan | Trigger and required outcome | Status |
|---|---|---|
| [030](030-remove-three-avoidable-round-trip-patterns.md) | Re-profile after real early-access traffic; execute the affected parts before organisation lookup, holiday import or people-directory costs breach agreed service targets | TODO |

Do not execute plan 030 solely because it exists. Capture production timings
first and retain only the changes supported by measured cost.

### Architecture and product decisions after launch stabilisation

| Plan | When it becomes required | Status |
|---|---|---|
| [031](031-fix-the-database-package-boundary.md) | Before the next material database export/client-boundary refactor; plan 032 is already complete | TODO |
| [039](039-decide-what-to-do-with-the-html-feed-renderer.md) | Before exposing, extending or relying on the HTML renderer; otherwise choose deletion as maintenance | TODO, decision required |

### Before expanding beyond AU Payroll

| Plan | When it becomes required | Status |
|---|---|---|
| [037](037-spike-nz-and-uk-payroll-write-back.md) | Before committing to an NZ or UK launch; use the spike to produce separate implementation plans | TODO |

The current release must continue to present AU as the only supported payroll
write-back region.

## Completed and retired plans

These rows were spot-checked against local `main`. They require no execution,
but their behaviour remains part of the release baseline.

| Plan | Outcome | Status |
|---|---|---|
| [001](001-accessible-responsive-product-interactions.md) | Core calendar, contact and notification interactions made accessible and responsive | DONE, merged (`2f8f12a`) |
| [009](009-stop-database-writes-on-every-ics-feed-poll.md) | Feed token telemetry debounced and matching ETags short-circuit to 304 | DONE, merged (`2e063fe`) |
| [014](014-batch-feed-cache-invalidation.md) | Feed invalidation batched and keyspace scans removed | DONE, merged (`df05bf3`) |
| [021](021-consolidate-the-tenant-scoping-helpers.md) | Shared two-key tenant-scoping helper adopted | DONE, merged (`6ab940c`) |
| [022](022-align-the-lint-check-and-fix-commands.md) | Check and fix commands cover the same source scope | DONE, merged (`65afb84`) |
| [023](023-regenerate-the-env-examples-and-remove-dead-knock-config.md) | Environment examples corrected and dead Knock configuration removed | DONE, merged (`84d0907`, `c4f5f3b`) |
| [024](024-harden-env-validation-in-the-app-and-web-apps.md) | App-level approach was ineffective and replaced by plan 041 | REJECTED, do not execute |
| [025](025-stop-pointing-in-product-help-at-the-mintlify-starter-kit.md) | Product Help now points to the real web help centre | DONE, merged (`532ae91`) |
| [026](026-correct-the-agent-instruction-files.md) | Repository agent documentation corrected for Team Calendar | DONE, merged (`abaded2`) |
| [032](032-stop-serialising-encrypted-xero-tokens-to-the-browser.md) | Client Xero connection projection uses an explicit safe allowlist | DONE, merged (`2a5b29b`) |
| [033](033-dead-code-and-manifest-hygiene.md) | Dead code and manifest hygiene completed | DONE, merged (`fa140b9`, `462f5c9`) |
| [040](040-fix-the-node-env-guard-that-breaks-every-local-and-ci-build.md) | Web build environment guard corrected | DONE, merged (`bad2224`) |
| [041](041-move-emptystringasundefined-to-where-it-actually-works.md) | Empty-string environment handling moved to package-owned schemas | DONE, merged (`dc60b1b`) |

## Status rules

- `TODO`: not started or not evidenced on the current release commit.
- `IN PROGRESS`: an executor is actively working on it.
- `DONE`: implementation and done criteria are merged into the release branch.
- `BLOCKED`: a STOP condition prevents execution; include a one-line reason.
- `REJECTED`: the approach is superseded or no longer worth executing; include
  a one-line rationale.

Executors must:

1. read the selected plan completely;
2. run its drift check against current `HEAD`;
3. stop on a material mismatch and refresh the plan rather than improvising;
4. run every required verification gate;
5. update this index only after evidence exists on the target branch.

## Reconciliation notes

- Every TODO finding in the tables above was rechecked against current source.
- Plan 005 still requires a fresh dependency audit. No current vulnerability
  verdict is claimed by this index.
- The checked-in Prisma migration history was compared with `schema.prisma` and
  is structurally aligned. Plan 046 still requires the exact production
  `_prisma_migrations` ledger, drift and restore checks. `db:push` is not
  acceptable release evidence.
- Plans 042 to 046 were added during the 2026-08-04 go-live review and remain
  TODO until implementation and release evidence exist.
- The current working tree also contains unrelated user changes. Executors must
  preserve them and use an isolated branch or worktree where appropriate.

## Findings considered and rejected or deferred

Recorded to prevent low-value re-audits:

- The earlier report of roughly twelve unscoped writes was reduced to the two
  genuine action gaps in plan 019. Other id-only writes follow a tenant-scoped
  read in the same transaction.
- A stale local `node_modules` link previously caused missing-module failures.
  That was an installation artefact, not a repository defect.
- `reconciliationEnabled={false}` is deliberate. Plans 007, 018 and 038 remove
  the reasons it is unsafe; do not merely flip the flag.
- Plan 024 is rejected because an outer app `createEnv()` cannot repair values
  already validated by package-level `createEnv()` calls. Plan 041 is the
  implemented replacement.
- A new Playwright lane is not required for the closed cohort. The immediate
  gaps are the concrete unit, integration and build lanes in plans 015, 016,
  020, 028, 029 and 035.
- Constant-time behaviour for a database-backed UUID existence check is not a
  practical goal. Plan 036 keeps internal detection and removes the caller
  distinction.
- Unrestricted general availability and paid self-service are rejected for the
  first release. Plan 045 encodes a closed, no-checkout early-access state.
- Completing the Mintlify documentation application is deferred. The existing
  web help centre must contain the guided early-access path before launch.

## What this review did not verify

- Live Vercel, Clerk, Xero, Inngest, Neon, KV, Resend, Sentry, DNS, email-domain
  or backup configuration. Plan 046 requires operator evidence for each.
- Production data, load, browser performance or support volume.
- A current third-party dependency audit, because approved registry access was
  unavailable during the review.
- Full marketing-site brand, SEO and accessibility quality outside the
  go-live-critical pricing, contact, legal and help paths.
- The Mintlify documentation content in depth.

These unknowns are not implicit approvals. Plan 046 converts the launch-critical
ones into explicit no-go checks; later expansion requires a fresh capacity,
support, accessibility and legal review.
