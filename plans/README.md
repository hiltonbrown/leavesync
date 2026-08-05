# Team Calendar implementation and go-live plans

This directory is the implementation backlog produced by the `improve` skill.
Every plan is self-contained and must be drift-checked before execution.

This index was reconciled on 2026-08-05 against local `main` at commit
`f1884db`. It classifies all 49 plans by release stage and records the current
go-live decision.

## What changed in this reconciliation

Eight plans that the previous index recorded as BLOCKED are **DONE**. They were
implemented, merged and verified; every one of them was blocked on the same two
environmental problems rather than on anything wrong with the change itself.
Those problems have been traced to root cause and given their own plans.

**Three cross-cutting blockers owned what was previously mislabelled as eight
separate plan failures. One is now resolved; two remain:**

| Blocker | Evidence | Owner | State |
|---|---|---|---|
| The dependency refresh that fixes the test gate was **uncommitted** | 25 modified manifests plus `bun.lock`; CI installs `--frozen-lockfile` from the committed one | [047](047-land-the-uncommitted-dependency-refresh.md) | **RESOLVED**, committed as `f1884db` |
| `bun run check` fails with **2,589 diagnostics across 381 files** | CI runs it at `.github/workflows/ci.yml:49`, before typecheck and tests, so CI never reaches the test step | [048](048-make-the-lint-gate-passable.md) | TODO |
| `bun run build` **crashes** the Bun runtime on `apps/app` | `panic: Segmentation fault at address 0x13CB0`; the identical build under Node 24 exits 0 | [049](049-run-next-build-under-node.md) | TODO |

The first is why plans 002, 004, 006, 007 and 008 were each reported blocked on
"installed `react` and `react-dom` patch versions differ": the manifests pinned
`react@19.2.7` against `react-dom@19.2.8`, an unsatisfiable peer pair that broke
test setup before any app test file loaded. Committing `f1884db` fixed that and
also cleared the `sharp` advisory that blocked plan 005, so plans 002 to 008 are
all now verifiably DONE.

The second and third are pre-existing and repo-wide. Neither was caused by any
plan. Both were being absorbed silently by executors, which is worse than
failing loudly.

**Verified state at `f1884db`, 2026-08-05:**

| Gate | Result |
|---|---|
| `bun run test` | exit 0, `10 successful, 10 total`, app 53 files / 175 tests, api 13 files / 101 tests |
| `bun run typecheck` | exit 0 |
| `bun audit` | **2 vulnerabilities (1 moderate, 1 low)**, down from 43; no `next`, `hono`, `fast-uri` or `sharp` |
| `bun run check` | exit 1, 2,589 diagnostics, see plan 048 |
| `bun run build` | exit 137, Bun segfault on `apps/app`, see plan 049 |

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
| Unblock the verification baseline | Complete plans 048 and 049 | **Do these first.** Plan 047 is done; nothing else can be honestly verified until the other two land |
| Closed AU early access | Complete plans 010-013, 015-020, 027, 035, 038 and 042-046 | NO-GO, all TODO |
| Broader cohort or public GA | Complete plans 028, 029, 034 and 036 after the early-access gate | Not started |
| Scale-triggered work | Reassess and execute plan 030 when production data shows the named round trips matter | Deferred pending evidence |
| Architecture maintenance | Complete plans 031 and 039 when launch stabilises or the affected area changes | Deferred |
| NZ or UK launch | Complete plan 037 and create follow-on implementation plans from the spike | Outside AU scope |

Completed plans remain part of the release baseline. Plan 024 is rejected and
must not be executed because plan 041 supersedes it.

## Execute these first: the verification baseline

Nothing below this section can be honestly verified until these three are done.
Every plan in the backlog lists `bun run check` and most list `bun run build`
among their done criteria, and both currently fail for reasons unrelated to any
plan.

| Plan | Required outcome | Priority | Status |
|---|---|---|---|
| [047](047-land-the-uncommitted-dependency-refresh.md) | The react pins, `next 16.3.0` and the refreshed lockfile are committed, so CI and fresh worktrees install the same working dependency set | P0 | **DONE** (`f1884db`) |
| [048](048-make-the-lint-gate-passable.md) | `bun run check` exits 0, so the lint gate stops blocking every plan and CI reaches its test step | P0 | TODO |
| [049](049-run-next-build-under-node.md) | `bun run build` exits 0 for all four tasks, unblocking plans 005, 016 and 046 | P0 | TODO |

Plan 047 is done and needs no execution; it is retained as the record of the
misdiagnosis and for the Dependabot grouping recommendation in its maintenance
notes. **048 and 049 are independent and may run in parallel.**

## Required before closed AU early-access go-live

These are release blockers. `TODO` means the app remains a no-go.

### Product safety, privacy and payroll integrity

| Plan | Required outcome | Status |
|---|---|---|
| [010](010-return-auth-error-instead-of-throwing-on-token-decrypt.md) | Token decryption failures remain typed, diagnosable Xero errors | TODO, finding re-verified |
| [011](011-fail-closed-on-decline-reason-policy.md) | A settings failure cannot disable the decline-reason policy | TODO, finding re-verified |
| [012](012-move-failure-notifications-out-of-the-state-transaction.md) | Notification failure cannot roll back durable Xero failure state | TODO, finding re-verified |
| [013](013-paginate-and-narrow-the-approvals-list-query.md) | Raw Xero and write-error audit payloads never cross the manager browser boundary; the list is bounded | TODO, finding re-verified |
| [017](017-make-leave-submission-idempotent.md) | Retries and concurrent requests cannot create duplicate Xero leave applications | TODO, finding re-verified |
| [018](018-clear-stale-xero-write-errors-on-status-change.md) | Reconciled records do not retain misleading stale write errors | TODO, excerpts refreshed after plans 006 and 007 |
| [019](019-close-two-tenant-scoping-gaps-in-server-actions.md) | Feed and Xero-match actions enforce both tenant keys | TODO, finding re-verified |
| [027](027-validate-the-clerk-user-before-binding-it-to-a-person.md) | A Person can bind only to a valid Clerk member of the active organisation | TODO, no drift |
| [038](038-bound-the-approval-reconciler-so-it-can-be-enabled.md) | Approval reconciliation is bounded, resumable and safe to schedule | TODO, scope narrowed after plan 007 landed batching |
| [042](042-correct-all-day-ics-date-boundaries.md) | One-day and multi-day all-day leave emit correct exclusive ICS end dates | TODO, no drift |
| [043](043-preserve-retryable-feed-errors.md) | Transient feed failures return a retryable response instead of permanent 404 | TODO, no drift |

Plan 013 is deliberately in this table, not the later performance table. Its
pagination work is scale-related, but its explicit projection also prevents
`source_payload_json` and `xero_write_error_raw` from being serialised to a
client component. That data-minimisation boundary is required before the first
customer. Re-verified on 2026-08-05: the query at `approval-service.ts:258`
still has no `take` and still uses `include`, which selects every scalar column.

Plans 018 and 038 are also deliberate launch gates because the current release
decision includes nightly approval reconciliation through plan 044. Moving that
chain later requires an explicit product decision to launch with reconciliation
disabled, followed by consistent changes to PRODUCT.md, plans 044 and 046, the
pilot acceptance script and the customer support model.

### Reproducible verification and dependency safety

| Plan | Required outcome | Status |
|---|---|---|
| [015](015-enable-the-test-harness-in-six-untestable-workspaces.md) | Root and CI tests enter every owned workspace, including auth and web | TODO, finding re-verified |
| [016](016-add-a-build-step-to-ci.md) | CI requires a production build for all deployable apps | TODO, **execute after plan 049** |
| [020](020-run-the-xero-disconnect-integration-test.md) | Destructive Xero disconnect isolation runs in the integration lane | TODO, finding re-verified |
| [035](035-fix-the-turborepo-task-graph.md) | Test and typecheck tasks express their real dependencies and do not false-green | TODO, finding re-verified |

Plan 016 must not run before plan 049. Adding `bun run build` to CI while the
build crashes would add a step that fails on its first run.

### Production behaviour and launch controls

| Plan | Required outcome | Status |
|---|---|---|
| [044](044-schedule-au-xero-syncs.md) | Active AU tenants receive bounded people, leave and balance syncs; nightly approval reconciliation is enabled only after 018 and 038 | TODO |
| [045](045-make-closed-au-early-access-truthful-and-deployable.md) | Public journeys, billing controls, production preflight, help and telemetry match closed early access | TODO |
| [046](046-execute-closed-au-early-access-go-live.md) | Clean release gates, migration and restore rehearsal, production configuration, pilot acceptance, staged deployment, rollback and 72-hour review all pass | TODO |

Plan 044's inbound-scheduling prerequisites (plans 003 and 006) are now **DONE**,
so its inbound half is unblocked. Its nightly approval reconciliation still
waits on plans 018 and 038; plan 007, the third member of that chain, is done.

Plan 046 is the final release-control plan. It must not be used to discover or
implement an unfinished dependency during the launch window.

## Recommended execution order

Different owners may run independent plans in parallel, but preserve these
hard sequences:

1. **Restore the verification baseline**: 048 and 049, which are independent and
   may run in parallel. Plan 047 is already done. Nothing else should be marked
   DONE until these two are in.
2. **Establish trustworthy gates**: 035, then 015; then 016 (after 049) and 020.
3. **Close direct product risks**: 010-013, 017, 019, then 027, plus 042 and
   043.
4. **Make reconciliation safe**: execute 018, then 038. Plan 007 is already done.
5. **Add production scheduling**: execute 044. Inbound scheduling is unblocked;
   enable nightly approval reconciliation only after 018 and 038.
6. **Make the release truthful and operable**: execute 045. It can proceed in
   parallel with most code fixes but must be complete before deployment.
7. **Release**: execute 046 only after every preceding go-live row is DONE on
   the same release commit.

### Hard dependency graph

```text
047 (DONE) -> everything with a `bun run test` gate
048 -> everything with a `bun run check` gate
049 -> 016 -> 005 build verification
049 -> everything with a `bun run build` gate

035 -> 015
019 -> 027
018 -> 038

044 inbound scheduling: unblocked (003 and 006 DONE)
018 + 038 -> 044 nightly approval reconciliation

048 + 049
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
| [034](034-bound-and-batch-the-feed-publication-reconciler.md) | Before enabling global feed reconciliation or materially increasing tenant count: bound and batch the job | TODO, finding re-verified: `reconcile-feed-publications.ts:63` still loads every record before its in-memory `BATCH_SIZE = 100` loop |
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

These rows were verified against local `main` at `f1884db`. They require no
execution, but their behaviour remains part of the release baseline.

| Plan | Outcome | Status |
|---|---|---|
| [001](001-accessible-responsive-product-interactions.md) | Core calendar, contact and notification interactions made accessible and responsive | DONE, merged (`2f8f12a`) |
| [002](002-fix-null-actor-authorisation-bypass.md) | An unlinked Clerk user cannot pass the nullable manager check | DONE, merged (`4b84e49` in `b14e7c0`) |
| [003](003-stop-mass-archive-on-unparseable-xero-page.md) | A malformed Xero page cannot be treated as a complete sync or trigger mass archive | DONE, merged (`5f5bdd7` in `3568795`); the missing `@repo/observability` dependency landed in `2095b1f` |
| [004](004-prevent-manager-self-approval.md) | Managers cannot approve or decline their own leave | DONE, merged (`f880889` in `c151225`) |
| [005](005-refresh-vulnerable-dependency-pins.md) | Manifests, overrides and lockfile agree; the `sharp` advisory is cleared | DONE, merged (`daa3985` in `fbaace4`, completed by `f1884db`); its `bun run build` criterion is deferred to plan 049 |
| [006](006-stop-sync-overwriting-user-owned-privacy-fields.md) | Inbound sync preserves user-owned privacy and feed choices | DONE, merged (`f903a8f` in `0e0ea09`) |
| [007](007-guard-reconciler-transitions-with-optimistic-concurrency.md) | Approval reconciliation cannot overwrite a newer local transition | DONE, merged (`ef0bdab` in `6f181ff`) |
| [008](008-bind-xero-oauth-state-to-nonce-expiry-and-session.md) | Xero OAuth state is time-bound, browser-bound and replay-resistant | DONE, merged (`f183e2b` in `832c9ff`) |
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
| [047](047-land-the-uncommitted-dependency-refresh.md) | React pins aligned, `next 16.3.0` and the refreshed lockfile committed | DONE, merged (`f1884db`) |

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

**Before marking anything BLOCKED**, check it against plans 047, 048 and 049.
Eight plans were previously blocked by those three problems while being
individually correct. If a gate fails for a reason your change could not have
caused, say so explicitly rather than blocking the plan.

## Reconciliation notes

- Every TODO finding in the tables above was rechecked against current source on
  2026-08-05 and confirmed still present. Confirmations are recorded in each
  plan's Status block under `**Reconciled**`.
- Plans 018 and 038 had genuine drift and their "Current state" excerpts were
  refreshed. Plan 018's sync-side upsert payload was restructured by plan 006;
  plan 038's handler gained batching and optimistic concurrency from plan 007,
  so its remaining work is narrower than the original text implies.
- Plan 005's dependency audit is now current: `bun audit` reports 2
  vulnerabilities, both build-time only (`esbuild` low, `uuid` moderate). The
  justification is recorded in plan 005's "Advisories accepted at 2026-08-05"
  section, which satisfies its last outstanding done criterion.
- The lint backlog in plan 048 is **pre-existing**, not a regression. The 381
  affected files span commits from April to August 2026, and
  `assist/source/useSortedKeys` is `"on"` identically in Ultracite 7.9.4 and
  7.10.1, so the recent bump did not cause it. The gate was scoped up and wired
  into CI on 2026-06-13 (`12fe5e6`) without a clearing pass, and has been failing
  since.
- The build crash in plan 049 is a **Bun runtime bug**, not a code or Next.js
  problem. `next build` under Node 24 exits 0 on the identical tree.
- The checked-in Prisma migration history was compared with `schema.prisma` and
  is structurally aligned. Plan 046 still requires the exact production
  `_prisma_migrations` ledger, drift and restore checks. `db:push` is not
  acceptable release evidence.
- The dependency refresh described in plan 047 was committed as `f1884db`
  ("version updates") during this reconciliation, so worktree-based execution is
  safe again. Verify `git status --short` is clean of manifest changes before
  dispatching an executor to a worktree.

## Findings considered and rejected or deferred

Recorded to prevent low-value re-audits:

- The recurring "react and react-dom patch versions differ" blocker is not seven
  separate problems. It is one uncommitted lockfile, owned by plan 047. Do not
  re-diagnose it per plan.
- The earlier report of roughly twelve unscoped writes was reduced to the two
  genuine action gaps in plan 019. Other id-only writes follow a tenant-scoped
  read in the same transaction.
- A stale local `node_modules` link previously caused missing-module failures.
  That was an installation artefact, not a repository defect.
- `reconciliationEnabled={false}` is deliberate. Plans 018 and 038 remove the
  remaining reasons it is unsafe; do not merely flip the flag.
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
- `lint/performance/noJsxPropsBind` (240 sites) and `lint/performance/noAwaitInLoops`
  (47 sites) are rejected as fixes and disabled with recorded reasons in plan
  048. React 19 with the React Compiler makes manual `useCallback` wrapping
  unnecessary, and the flagged loops are deliberately sequential because Xero
  allows only five concurrent requests per organisation.
- Pinning or downgrading Bun to work around the build crash is rejected. Plan
  049 removes the `--bun` flag instead, which is a one-line change per app with
  no measurable build-time cost, because `next build` is compiler-bound.

## What this review did not verify

- Live Vercel, Clerk, Xero, Inngest, Neon, KV, Resend, Sentry, DNS, email-domain
  or backup configuration. Plan 046 requires operator evidence for each.
- Production data, load, browser performance or support volume.
- Whether the `apps/app` build crash also occurs on x64 CI and Vercel build
  machines. It was reproduced on `Linux arm64` under WSL2. Plan 049 removes the
  exposure regardless.
- Full marketing-site brand, SEO and accessibility quality outside the
  go-live-critical pricing, contact, legal and help paths.
- The Mintlify documentation content in depth.

These unknowns are not implicit approvals. Plan 046 converts the launch-critical
ones into explicit no-go checks; later expansion requires a fresh capacity,
support, accessibility and legal review.
