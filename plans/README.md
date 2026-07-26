# Implementation Plans

Advisory plans produced by the `improve` skill. Plan 001 was written on
2026-07-21; plans 002 to 039 were written on 2026-07-25 against commit
`75202db`. Plan 040 was written on 2026-07-26 against commit `887665f`, during
execution of plan 024, when its Step 1 baseline surfaced a pre-existing build
break shared with plan 033.

Every plan is self-contained. An executor needs only the plan file, this
repository, and a shell. Each plan opens with a drift check against the commit
it was written for; run it first.

**These plans are written for an executor who has not read the audit.** They
inline the code excerpts, the conventions to follow, the verification commands
and the stop conditions. If a plan tells you something that contradicts the
repository as you find it, believe the repository and report the discrepancy.

---

## How to use this directory

1. Pick a plan from the execution order below.
2. Run its drift check. If files have moved since `75202db`, re-verify its
   "Current state" section before editing.
3. Follow its steps in order, running every verification command.
4. Update this file's status row when you finish.

**Statuses**: TODO, IN PROGRESS, DONE, BLOCKED, REJECTED.

---

## Recommended execution order

Ordered by leverage, with dependencies respected. The four tranches are
independent of one another; within a tranche, order is a suggestion except
where a dependency is noted.

### Tranche 1: security and data-integrity defects

Land these first. Each is a live defect with a bounded fix.

| Plan | Title | Priority | Effort | Risk | Depends on | Status |
|---|---|---|---|---|---|---|
| [032](032-stop-serialising-encrypted-xero-tokens-to-the-browser.md) | Stop serialising encrypted Xero tokens into the client payload | P1 | S | LOW | none | TODO |
| [002](002-fix-null-actor-authorisation-bypass.md) | Deny record authorisation when the acting user has no linked person | P1 | S | LOW | none | TODO |
| [004](004-prevent-manager-self-approval.md) | Prevent managers from approving or declining their own leave | P1 | S | LOW | none | TODO |
| [017](017-make-leave-submission-idempotent.md) | Stop leave submission creating duplicate leave applications in Xero | P1 | M | MED | none | TODO |
| [003](003-stop-mass-archive-on-unparseable-xero-page.md) | Stop treating an unparseable Xero page as the end of pagination | P1 | M | LOW | none | TODO |
| [007](007-guard-reconciler-transitions-with-optimistic-concurrency.md) | Guard reconciler transitions with an optimistic-concurrency predicate | P1 | S | LOW | none | TODO |
| [006](006-stop-sync-overwriting-user-owned-privacy-fields.md) | Stop the inbound Xero sync overwriting user-owned privacy and feed fields | P1 | S | LOW | none | TODO |
| [008](008-bind-xero-oauth-state-to-nonce-expiry-and-session.md) | Bind the Xero OAuth state to a nonce, an expiry, and the initiating browser | P1 | M | MED | none | TODO |
| [005](005-refresh-vulnerable-dependency-pins.md) | Refresh the root dependency overrides that pin vulnerable versions | P1 | S | LOW | 016 helps | TODO |
| [001](001-accessible-responsive-product-interactions.md) | Make calendar, contact, notification, and motion interactions accessible and responsive | P1 | M | MED | none | DONE (commit `2f8f12a` on branch `advisor/001-accessible-responsive-interactions` in worktree, not merged) |

### Tranche 2: correctness, verification and the CI gates that catch the rest

| Plan | Title | Priority | Effort | Risk | Depends on | Status |
|---|---|---|---|---|---|---|
| [040](040-fix-the-node-env-guard-that-breaks-every-local-and-ci-build.md) | Fix the `NODE_ENV` guard in `apps/web` that breaks every local and CI build | P1 | S | LOW | none; unblocks 024, 033, helps 016 | DONE, merged to `main` |
| [041](041-move-emptystringasundefined-to-where-it-actually-works.md) | Move `emptyStringAsUndefined` to every package's own `keys.ts`, where it actually protects anything | P1 | M | LOW | after 040; supersedes 024 | DONE, merged to `main` |
| [016](016-add-a-build-step-to-ci.md) | Add a build step to CI so typecheck sees generated route types | P2 | S | LOW | after 040 | TODO |
| [035](035-fix-the-turborepo-task-graph.md) | Fix the Turborepo task graph for `test` and `typecheck` | P3 | S | LOW | none | TODO |
| [015](015-enable-the-test-harness-in-six-untestable-workspaces.md) | Enable the test harness in the six workspaces that cannot run tests | P2 | M | LOW | 035 helps | TODO |
| [020](020-run-the-xero-disconnect-integration-test.md) | Make the Xero disconnect integration test actually run | P2 | S | LOW | none | TODO |
| [011](011-fail-closed-on-decline-reason-policy.md) | Fail closed when the decline-reason policy cannot be loaded | P2 | S | LOW | none | TODO |
| [012](012-move-failure-notifications-out-of-the-state-transaction.md) | Move failure notifications out of the transaction that records Xero write failures | P2 | S | LOW | none | TODO |
| [018](018-clear-stale-xero-write-errors-on-status-change.md) | Clear stale Xero write errors when sync moves a record out of the failed state | P2 | S | LOW | after 007 | TODO |
| [010](010-return-auth-error-instead-of-throwing-on-token-decrypt.md) | Return a typed auth error instead of throwing when token decryption fails | P2 | S | LOW | none | TODO |
| [019](019-close-two-tenant-scoping-gaps-in-server-actions.md) | Close two tenant-scoping gaps in server actions | P2 | S | LOW | none | TODO |
| [027](027-validate-the-clerk-user-before-binding-it-to-a-person.md) | Validate the Clerk user before binding it to a Person record | P2 | S | LOW | adjacent to 019 | TODO |
| [024](024-harden-env-validation-in-the-app-and-web-apps.md) | Harden env validation in `apps/app` and `apps/web` | P2 | S | LOW | after 023, 040 | REJECTED (superseded by plan 041 — `emptyStringAsUndefined` at the app level cannot protect any field sourced via `extends`, since each extended package's own `createEnv()` call already validates and returns before the outer call's option ever runs; verified against the `@t3-oss/env-core` source. This plan's `billing()` extend insight was correct and is carried forward into plan 041's Step 6) |
| [028](028-fix-three-test-quality-gaps.md) | Fix three test-quality gaps (role hierarchy, feed preview, tenant query helpers) | P2 | M | LOW | none | TODO |
| [029](029-test-the-untested-server-actions.md) | Test the eleven untested server actions in `apps/app` | P2 | L | LOW | none | TODO |

### Tranche 3: performance

Each degrades with tenant size, so none is urgent today and all become urgent
at the same time.

| Plan | Title | Priority | Effort | Risk | Depends on | Status |
|---|---|---|---|---|---|---|
| [009](009-stop-database-writes-on-every-ics-feed-poll.md) | Stop writing to the database on every ICS feed poll | P2 | S | LOW | 014 related | TODO |
| [014](014-batch-feed-cache-invalidation.md) | Batch feed-cache invalidation and replace keyspace scans with keyed deletes | P2 | M | MED | none | TODO |
| [013](013-paginate-and-narrow-the-approvals-list-query.md) | Paginate the approvals list and stop shipping Xero payload blobs to the browser | P2 | M | MED | none | TODO |
| [030](030-remove-three-avoidable-round-trip-patterns.md) | Remove three avoidable round-trip patterns | P2 | M | MED | none | TODO |
| [034](034-bound-and-batch-the-feed-publication-reconciler.md) | Bound and batch the feed publication reconciler | P2 | M | MED | none | TODO |
| [038](038-bound-the-approval-reconciler-so-it-can-be-enabled.md) | Bound the approval reconciler so it can be enabled | P2 | M | MED | after 007, 018 | TODO |

### Tranche 4: hygiene, docs and direction

Cheap, low risk, and each removes a piece of misinformation from the
repository.

| Plan | Title | Priority | Effort | Risk | Depends on | Status |
|---|---|---|---|---|---|---|
| [023](023-regenerate-the-env-examples-and-remove-dead-knock-config.md) | Regenerate the `.env.example` files and remove the dead Knock configuration | P3 | S | LOW | before 024 | DONE, merged to `main` |
| [026](026-correct-the-agent-instruction-files.md) | Correct `AGENTS.md` and `GEMINI.md`, which describe the wrong product | P2 | S | LOW | none | DONE |
| [025](025-stop-pointing-in-product-help-at-the-mintlify-starter-kit.md) | Stop pointing in-product Help at the Mintlify Starter Kit | P2 | S | LOW | none | DONE (Option B: `helpUrl` repointed at `webUrl("/help-centre")`, a real page; commit `532ae91` on branch `fix/unwire-starter-kit-help-link` in worktree, not merged) |
| [022](022-align-the-lint-check-and-fix-commands.md) | Make `bun run fix` cover the same files as `bun run check` | P3 | S | LOW | none | DONE |
| [033](033-dead-code-and-manifest-hygiene.md) | Dead code and manifest hygiene | P3 | S | LOW | after 040 | DONE (executed with a user-approved deviation: Step 1/2/6 build verification scoped to `bunx turbo build --filter=app --filter=api` instead of plain `bun run build`, since `web#build` fails on the pre-existing `NEXT_PUBLIC_APP_URL` issue plan 040 fixes; commits `fa140b9`, `462f5c9` on branch `chore/dead-code-and-manifest-hygiene` in worktree, not merged) |
| [031](031-fix-the-database-package-boundary.md) | Fix the `@repo/database` package boundary | P3 | M | LOW | after 032 | TODO |
| [021](021-consolidate-the-tenant-scoping-helpers.md) | Consolidate the eleven local copies of the tenant-scoping helper | P3 | M | LOW | none | DONE |
| [036](036-stop-returning-a-cross-tenant-existence-oracle.md) | Stop returning a cross-tenant existence oracle to callers | P3 | M | MED | none | TODO |
| [039](039-decide-what-to-do-with-the-html-feed-renderer.md) | Decide what to do with the HTML feed renderer | P3 | S | LOW | needs a user decision | TODO |
| [037](037-spike-nz-and-uk-payroll-write-back.md) | Spike NZ and UK payroll support | P3 | M | LOW | none | TODO |

---

## Dependency graph

Only hard dependencies are listed. Everything not shown here is independent.

```
040 (fix web build break)  ──> 024 (env validation), 033 (dead code hygiene)
                                 hard: both plans' Step 1 baseline is `bun run
                                 build`, which fails today on `web#build`
                                 regardless of either plan's own changes; 040
                                 fixes the underlying guard in
                                 apps/web/src/lib/auth-links.ts
                            ──> 016 (build step in CI), soft: 016 adds a CI
                                 build gate that would otherwise be red from
                                 its first run

024 (env validation, REJECTED) ──> 041 (fix emptyStringAsUndefined properly)
                                 024's fix didn't work: emptyStringAsUndefined
                                 set on an app's outer createEnv() can't reach
                                 fields sourced via extends(), since each
                                 extended package's own createEnv() call has
                                 already validated and returned by the time
                                 the outer call's options run; 041 fixes it in
                                 each package's own keys.ts instead. 041 also
                                 depends on 040 (needs a working build to
                                 verify against)

032 (token leak)            ──> 031 (database package boundary)
                                 both edit the integrations client components;
                                 the security fix must land first

007 (reconciler concurrency) ──> 018 (clear stale write errors)
                                 ──> 038 (bound the approval reconciler)
                                 all three edit reconcile-xero-approval-state.ts;
                                 007 is structural, 018 additive, 038 above both

023 (env examples)          ──> 024 (env validation)
                                 both edit apps/app/env.ts; 023 removes a line,
                                 024 adds two

035 (turbo task graph)      ──> 015 (test harness in six workspaces)
                                 soft: 015 works either way, but its new test
                                 scripts run in parallel only after 035

016 (build step in CI)      ──> 005 (dependency pins)
                                 soft: 005 needs a green build as its gate, and
                                 016 makes CI enforce it

019 (tenant scoping)        <──> 027 (validate Clerk user)
                                 both edit the Xero matches action; either order,
                                 the second one rebases
```

**Independent clusters** that can be worked in parallel by different people:

- 002, 004, 006, 008, 017 (security and Xero write correctness)
- 009, 013, 014, 030, 034 (performance)
- 020, 028, 029 (test coverage)
- 021, 022, 025, 026, 033 (hygiene and docs)

---

## Notes on how these plans were written

**Every excerpt was read from the file it cites**, not taken from a summary.
Line numbers are from commit `75202db`.

**Subagent findings were vetted before they became plans.** Several were
rejected or substantially narrowed:

- An initial report of "roughly twelve unscoped database writes" was checked
  call site by call site and reduced to **two** genuine gaps, both reads, both
  in `apps/app` server actions (plan 019). The rest use a scoping helper or
  follow a check-then-act pattern inside a transaction, which is correct.
  Plan 019 documents this explicitly so the finding is not re-raised.
- A baseline failure of `bun run typecheck` and `bun run test` with
  `Cannot find module '@repo/observability/log'` was investigated and found to
  be a stale local `node_modules` symlink, **not a repository defect**. CI runs
  `bun install --frozen-lockfile` and is unaffected. Every plan's "Commands"
  section carries a note telling the executor to run `bun install` if they hit
  it.
- `reconciliationEnabled={false}` was initially read as an oversight. The git
  history shows it is a **deliberate gate**, recorded in a prior spike
  (`git show 3772377:plans/005-findings.md`) that stopped at a rate-limit STOP
  condition. Plan 038 was reframed to remove the blocker rather than to flip the
  flag, and it explicitly forbids changing the flag.

---

## Findings considered and rejected

Recorded so they are not re-audited on a future run.

**From the 2026-07-21 run (plan 001):**

- The auth panel's gradients and literal colours are documented, scoped brand
  treatment, not theming drift.
- The floating sidebar's stronger shadow is permitted as transient navigation
  elevation by `DESIGN.md`.
- The shared component-library motion system was not changed. Its broader
  review warrants a separately scoped design-system plan.

**From the 2026-07-25 run:**

- **"Twelve unscoped database writes."** Over-reported. Verified down to two
  reads (plan 019). Every `update`/`delete` using `where: { id }` is preceded by
  a tenant-scoped read in the same transaction, which is the idiomatic shape
  given that Prisma's `update` accepts only unique fields in `where`.
- **An end-to-end test lane (Playwright or similar).** Not proposed. The repo
  has roughly fifty test files in `apps/app` alone plus five integration
  suites; the gaps are specific and addressable with the existing harness
  (plans 028, 029). Adding a browser lane would be a large ongoing cost against
  a well-covered codebase.
- **`biome.jsonc` exclusions for `packages/collaboration` and `packages/cms`.**
  Real, but inert: neither package exists. Folded into plan 022 as cleanup
  rather than raised as a defect.
- **A composite index on `xero_person_matches`.** Considered and dropped. The
  table is small, queried by primary key, and adding an index inside an
  unrelated plan hides a schema change in a diff nobody expects one in.
- **Timing side channels on the not-found path** (plan 036). The extra query on
  the cross-tenant path makes it marginally slower than a plain miss. Closing
  that would require constant-time behaviour across a database query, which is
  not achievable and not warranted for UUIDv4 keys. Explicitly out of scope.
- **Rate limiting on resource-id guessing.** Not warranted: all ids are
  UUIDv4 and every path is authenticated.
- **Bulk conversion of `update({ where: { id } })` to
  `updateMany({ where: { ...scoped, id } })`.** Legitimate defence in depth and
  a large, mostly mechanical diff. Recorded in plan 019's maintenance notes as a
  possible follow-up rather than executed, because it would touch about thirty
  call sites for no confirmed defect.
- **`packages/core`'s `vitest` range and the `@types/*` caret drift.** Noted in
  plan 033's "Current state" and deliberately left alone. Neither is worth a
  change on its own.

---

## What was not audited

Stated so nobody assumes coverage that does not exist.

- **`packages/design-system`** beyond the three integrations client components.
  Plan 001 covers some of its interaction and accessibility surface; the
  component library as a whole was not reviewed.
- **`apps/web`** (the marketing site) beyond its `env.ts`.
- **`apps/docs`** content, beyond establishing that it is the unmodified
  Mintlify Starter Kit (plan 025).
- **`packages/email` templates**, `packages/seo`, `packages/analytics`.
- **Export surfaces of packages other than `@repo/database`.** None is
  deep-imported today, but none has an `exports` map either. Noted in plan 031.
- **The Prisma schema as a whole.** Individual models were read where a plan
  needed them; no systematic review of indexes, constraints or normalisation
  was done.
- **Runtime behaviour.** Everything here is derived from reading code, git
  history and configuration. Nothing was profiled, and no production data was
  examined.
