# Team Calendar implementation and go-live plans

This directory is the implementation backlog produced by the `improve` skill.
Every plan is self-contained and must be drift-checked before execution.

This index was reconciled on 2026-08-05 against local `main` at commit
`f1884db`. It classifies all 49 plans by release stage and records the current
go-live decision.

**Plans 047 and 048 re-reconciled on 2026-08-06 at commit `454ded7`.** Both
remain DONE: every done criterion was re-run on current `HEAD` and passed. The
reconciliation also corrected the local test command that plan 048 published and
that later plans were inheriting; see "Verified state" below.

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
| `bun run check` fails with **2,589 diagnostics across 381 files** | CI runs it at `.github/workflows/ci.yml:49`, before typecheck and tests, so CI never reaches the test step | [048](048-make-the-lint-gate-passable.md) | **RESOLVED**, merged as `b015511` |
| `bun run build` **crashes** the Bun runtime on `apps/app` | `panic: Segmentation fault at address 0x13CB0`; the identical build under Node 24 exits 0 | [049](049-run-next-build-under-node.md) | **RESOLVED**, merged as `8adeaa5`, verified at `44c2eb6` |

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
| `bun run check` | **exit 0** on `main` since `b015511` (plan 048). Keep it that way: it is now a real gate |
| `bun run test` | **Not a usable local gate.** Ten concurrent workspaces starve the vitest forks pool and the `app` suite dies with `Failed to start forks worker`, on clean `main` too. Turbo's `10 successful, 10 total` is a task count, not a test count. Use the per-package commands in the next table |
| `bun run build` | **exit 0, `4 successful, 4 total`** on `main` since `8adeaa5` (plan 049), verified at `44c2eb6` on 2026-08-06. It is now a real gate |
| `bun run test:integration` | **exit 1** in `@repo/database` against live Neon. Independent of plans 047 to 049; needs its own plan |

**How to run tests locally. Corrected 2026-08-06 at `454ded7`; supersedes the
command previously published in plan 048.** Both of the old forms produce
output that looks like a regression but is not, which is the exact failure mode
that cost this backlog eight wrongly-blocked plans:

| Suite | Command | Expected |
|---|---|---|
| `app` | `cd apps/app && bunx vitest run --maxWorkers=1 --testTimeout=60000` | `Test Files 53 passed (53)`, `Tests 175 passed (175)` |
| every other package | `cd <pkg> && NODE_ENV=test bunx vitest run --exclude '**/*.integration.test.ts' --maxWorkers=2 --testTimeout=30000` | the baseline table in plan 048 |

- `--maxWorkers=2` is **too high for the `app` suite** on a loaded workstation.
  It returned `49 passed (49)` / `156 passed (156)` with a separate `Errors 4`
  line: four files were never collected, yet every collected file passed.
  **Read the `Errors` line, not just the pass counts.** At `--maxWorkers=1` the
  same tree returns the full 53 / 175.
- A bare `bunx vitest run` outside `apps/app` runs **more** than that package's
  own `test` script, which sets `NODE_ENV=test` and
  `--exclude '**/*.integration.test.ts'`. Without the exclusion, integration
  tests needing a live `DATABASE_URL` are swept in and fail:
  `4 failed | 4 passed` in `@repo/database`, `1 failed | 12 passed` in
  `@repo/jobs`. With it, both match baseline exactly.

All ten packages were confirmed against the plan 048 baseline at `454ded7`:
core 2/18, database 3/8, notifications 6/28, feeds 9/70, billing 1/4,
availability 33/228, xero 16+1 skipped / 159+3 skipped, app 53/175, jobs 9/40,
api 13/101.

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

**All three P0 baseline plans are now DONE.** Plan 047 landed the dependency
refresh, plan 048 restored `bun run check`, and plan 049 restored `bun run
build`. The verification baseline is established: `check`, `typecheck` and
`build` are all real, passing gates on `main`.

One gap remains in that baseline. `bun run test` and `bun run test:integration`
both exit 1, for reasons independent of plans 047 to 049: the vitest forks pool
starves under ten concurrent workspaces, and the live-Neon integration suites
fail and pollute shared database state. Use the per-package commands above.
**This is the next thing to plan.**

| Plan | Required outcome | Priority | Status |
|---|---|---|---|
| [047](047-land-the-uncommitted-dependency-refresh.md) | The react pins, `next 16.3.0` and the refreshed lockfile are committed, so CI and fresh worktrees install the same working dependency set | P0 | **DONE** (`f1884db`). **Re-verified 2026-08-06** at `454ded7` and `44c2eb6`: pins all `19.2.8`, one copy of each in `node_modules`, lockfile clean and frozen-install clean, typecheck 0, audit unchanged at 2 |
| [048](048-make-the-lint-gate-passable.md) | `bun run check` exits 0, so the lint gate stops blocking every plan and CI reaches its test step | P0 | **DONE**, reviewed and merged to `main` as `b015511` (6 commits, 373 files). **Re-verified 2026-08-06** at `454ded7` and `44c2eb6`: `check` exit 0, `typecheck` exit 0, all ten packages match baseline. Its published test command was wrong and is corrected above |
| [049](049-run-next-build-under-node.md) | `bun run build` exits 0 for all four tasks, unblocking plans 005, 016 and 046 | P0 | **DONE and VERIFIED**: implementation `71fa962`, merged as `8adeaa5`, verified on the operator host at `44c2eb6` on 2026-08-06. `bun run build` exit 0, `4 successful, 4 total`; `apps/app` prints `ƒ Proxy (Middleware)`. The earlier "review host blocks Turbopack" report was a misdiagnosis: a stale `apps/web/.next` carrying a `dev/lock`, which reproduced under the old `bun --bun` command too |

Plan 047 is done and needs no execution; it is retained as the record of the
misdiagnosis and for the Dependabot grouping recommendation in its maintenance
notes. **048 and 049 are independent and may run in parallel.**

## Required before closed AU early-access go-live

These are release blockers. `TODO` means the app remains a no-go.

### Product safety, privacy and payroll integrity

| Plan | Required outcome | Status |
|---|---|---|
| [010](010-return-auth-error-instead-of-throwing-on-token-decrypt.md) | Token decryption failures remain typed, diagnosable Xero errors | DONE |
| [011](011-fail-closed-on-decline-reason-policy.md) | A settings failure cannot disable the decline-reason policy | DONE |
| [012](012-move-failure-notifications-out-of-the-state-transaction.md) | Notification failure cannot roll back durable Xero failure state | DONE |
| [013](013-paginate-and-narrow-the-approvals-list-query.md) | Raw Xero and write-error audit payloads never cross the manager browser boundary; the list is bounded | TODO, finding re-verified |
| [017](017-make-leave-submission-idempotent.md) | Retries and concurrent requests cannot create duplicate Xero leave applications | TODO, finding re-verified |
| [018](018-clear-stale-xero-write-errors-on-status-change.md) | Reconciled records do not retain misleading stale write errors | DONE, executed and reviewed 2026-08-07, worktree `agent-a456001f35e41133c` branch `fix/clear-stale-xero-write-errors-018` (`08ea636`), unmerged |
| [019](019-close-two-tenant-scoping-gaps-in-server-actions.md) | Feed and Xero-match actions enforce both tenant keys | BLOCKED, partial: feed-lookup fix done and verified in worktree `agent-aedc7188b1fab86c5` (`af2c344`), unmerged; Xero-match fix hit a genuine STOP (no `organisationId` resolvable without a scope/design change) and needs a follow-up plan |
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
| [015](015-enable-the-test-harness-in-six-untestable-workspaces.md) | Root and CI tests enter every owned workspace, including auth and web | DONE |
| [016](016-add-a-build-step-to-ci.md) | CI requires a production build for all deployable apps | TODO, **unblocked**: plan 049 is done and `bun run build` exits 0 |
| [020](020-run-the-xero-disconnect-integration-test.md) | Destructive Xero disconnect isolation runs in the integration lane | TODO, finding re-verified |
| [035](035-fix-the-turborepo-task-graph.md) | Test and typecheck tasks express their real dependencies and do not false-green | TODO, finding re-verified |

Plan 016 was gated on plan 049 so that CI would not gain a build step that
failed on its first run. Plan 049 is now done and verified, so plan 016 is free
to execute.

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

**Execution is serial. One plan at a time, merged to `main` before the next
begins.**

Fan-out across plans is not used. Four of the queued plans (011, 013, 018 and
012) all modify `packages/availability/src/approvals/approval-service.ts`, so
running them concurrently produces conflicts in a single file that carries the
approval state machine. Parallel execution would also invalidate the drift
excerpts of whichever plan lands second. The cost of serialising the whole queue
is lower than the cost of resolving conflicts in that file, and the queue is
short enough that the throughput loss does not matter.

### Before the queue: run manually and merge

**Both prerequisites are now DONE and merged. The queue is clear to start.**

1. **049**, so `bun run build` stops crashing the Bun runtime on `apps/app`.
   Merged as `8adeaa5`, verified at `44c2eb6`: `bun run build` exits 0,
   `4 successful, 4 total`.
2. **048**, so `bun run check` exits 0. Merged as `b015511`, re-verified at
   `44c2eb6`.

Queued plans can now be honestly evaluated against `bun run check`,
`bun run typecheck` and `bun run build`. The one caveat: `bun run test` and
`bun run test:integration` still exit 1 for unrelated reasons, so use the
per-package test commands above rather than the turbo-wide ones.

Both failures are confirmed live, not theoretical. CI run 31071757693 fails at
its `bun run check` step with `Found 2589 errors` and never reaches typecheck or
either test lane, and every Vercel deployment of `main` since `754a5aac` has
failed the build, including production. Plan 049 is repairing a live deployment
outage.

**Production is confirmed green, 2026-08-07.** All three apps deployed `6ae7291`
to production and reached `READY`, the first green production builds since
`754a5aac`. The crash was platform-sensitive, appearing as a segfault on local
`arm64` and as a module-loading `TypeError` on Vercel's x64 builders, so the
deployment was the authoritative test and it passed.

One lesson worth keeping: the fix sat committed but **unpushed** for a day while
production stayed broken, because a passing local build was mistaken for a
cleared outage. For a deployment-affecting fix, check `git rev-list origin/main..main`
and the newest Vercel deployment commit before calling it done. Neither plan can
deadlock the queue on a
non-reproducing machine.

### The queue

Each row is merged to `main` before the next begins.

| Position | Plan | Reason this position is fixed |
|---|---|---|
| 1 | [035](035-fix-the-turborepo-task-graph.md) | `035 -> 015`. Fixes the Turborepo task graph that false-greens `test` and `typecheck`, so every later gate is trustworthy |
| 2 | [015](015-enable-the-test-harness-in-six-untestable-workspaces.md) | Test harness must exist in all six workspaces before a green `bun run test` means anything |
| 3 | [016](016-add-a-build-step-to-ci.md) | Requires 049, which is merged before the queue starts |
| 4 | [020](020-run-the-xero-disconnect-integration-test.md) | Grouped with the gates, but needs a live `DATABASE_URL`; may be deferred and run standalone without blocking the queue |
| 5 | [010](010-return-auth-error-instead-of-throwing-on-token-decrypt.md) | Isolated in `packages/xero`, no dependencies either way; serves as the loop's smoke test |
| 6 | [042](042-correct-all-day-ics-date-boundaries.md) | `packages/feeds`, independent |
| 7 | [043](043-preserve-retryable-feed-errors.md) | `packages/feeds`, independent |
| 8 | [017](017-make-leave-submission-idempotent.md) | Submission path, independent of the approvals cluster |
| 9 | [019](019-close-two-tenant-scoping-gaps-in-server-actions.md) | `019 -> 027` |
| 10 | [027](027-validate-the-clerk-user-before-binding-it-to-a-person.md) | Depends on 019 |
| 11 | [011](011-fail-closed-on-decline-reason-policy.md) | Approvals cluster. Smallest change, target sites are grep-findable rather than line-dependent |
| 12 | [013](013-paginate-and-narrow-the-approvals-list-query.md) | Approvals cluster |
| 13 | [018](018-clear-stale-xero-write-errors-on-status-change.md) | Approvals cluster. `018 -> 038` |
| 14 | [012](012-move-failure-notifications-out-of-the-state-transaction.md) | Approvals cluster, last. Moving notifications out of the state transaction is the largest structural change and would otherwise shift the other three |
| 15 | [038](038-bound-the-approval-reconciler-so-it-can-be-enabled.md) | Depends on 018 |
| 16 | [044](044-schedule-au-xero-syncs.md) | Depends on 018 and 038 for nightly approval reconciliation |
| 17 | [045](045-make-closed-au-early-access-truthful-and-deployable.md) | Must be complete before deployment |

Positions 11 to 14 are the approvals cluster. They are ordered smallest change
first and largest structural change last, so each one disturbs the next as
little as possible. Every plan in that cluster carries a `## Drift warning`
section: its excerpts must be re-reviewed against current `HEAD` immediately
before that plan executes, because the pass that produced them expires as soon
as the first cluster plan merges.

### After the queue: run manually

**046**, the release-control plan. It must not be used to discover or implement
an unfinished dependency during the launch window.

### Plan 020 may be deferred and run standalone

Plan 020 turns on the Xero disconnect integration test, and its own STOP
conditions require a disposable `DATABASE_URL` to prove the test actually
executes. If no disposable database is available when position 4 comes up, skip
it and continue to position 5. Run it standalone whenever a database becomes
available.

Deferring 020 blocks nothing. No other plan depends on it, and it depends on
nothing beyond the pre-queue gates. It remains a required go-live row, so it
must be DONE before 046 regardless of when it runs.

Plan 017 at position 8 also needs a reachable `DATABASE_URL`, because it adds
`xero_write_claimed_at` and generates a migration. Unlike 020, it is in the
serial path. Its instructions now direct the executor to use the `DATABASE_URL`
already present in the environment, with `packages/database/.env` as the
documented fallback.

### Excluded from the queue, deliberately

- **046**, run by hand after the queue, as above.
- The deferred plans classified below: 028, 029, 030, 031, 034, 036, 037 and
  039. Their triggers are stated in "Required after early access" and are
  unchanged.

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
| [005](005-refresh-vulnerable-dependency-pins.md) | Manifests, overrides and lockfile agree; the `sharp` advisory is cleared | DONE, merged (`daa3985` in `fbaace4`, completed by `f1884db`); its `bun run build` criterion was deferred to plan 049, which is now done and verified, so that criterion is met |
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
- ~~Whether the `apps/app` build crash also occurs on x64 CI and Vercel build
  machines.~~ **Answered on 2026-08-06: it does.** Every Vercel deployment of
  `main` since `754a5aac` has failed, including the production build of
  `fb9f1cc`, and all three deployable apps are affected rather than `apps/app`
  alone. Plan 049 is therefore fixing a live deployment outage, not removing a
  theoretical exposure. Evidence is recorded under "Deployment context" in
  plan 049.
- Full marketing-site brand, SEO and accessibility quality outside the
  go-live-critical pricing, contact, legal and help paths.
- The Mintlify documentation content in depth.

These unknowns are not implicit approvals. Plan 046 converts the launch-critical
ones into explicit no-go checks; later expansion requires a fresh capacity,
support, accessibility and legal review.
