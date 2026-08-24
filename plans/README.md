# Team Calendar implementation plans

This directory is the implementation backlog produced by the `improve` skill.
Every plan is self-contained and must be drift-checked before execution.

**Reconciled and re-planned on 2026-08-12 against local `main` at commit
`121da2a`, with targeted reconciliations through 2026-08-24 at `117fb1b`.** The
45 completed plans were verified against current source and their files removed;
their outcomes are in the ledger below. Plans 051 to 068 address the 2026-08-12
audit; plans 069 to 075 record later targeted work and reconciliation findings.

Recover any removed plan with `git show HEAD:plans/<filename>`.

## Verified gate state

Measured on this commit, not inherited from the previous reconciliation:

| Gate | Result |
|---|---|
| `bun run check` | **exit 0** on current `main` at `117fb1b`; removing the debug harness and temporary sync logging cleared all 62 diagnostics |
| `bun run typecheck` | **exit 0** on `117fb1b`, 19/19 tasks |
| `bun run test` | **exit 0** on `117fb1b`, 17/17 tasks; app 71 files / 278 tests |
| `bun run build` | **exit 0** on `8b3efbe`, 4/4 tasks for app, API, web and database generation |
| `bun run test:integration` | **exit 0** on `8b3efbe`, 5/5 tasks and 58 database-backed tests; two credential-gated Xero external tests skipped |

This supersedes the previous index's claim that `bun run test` is "not a usable
local gate". It is now a real gate and should be treated as one. The per-package
commands recorded under plan 048 are no longer necessary, though they remain
valid for narrowing a run.

The full database-backed integration lane is proven on the isolated plan 075
branch, which includes merged plan 052. The non-planning source tree at current
`main` is identical to that reviewed commit. Plan 051's suspected fixture
collision was fixed independently in `37e7231`; its two affected jobs files
also passed together twice consecutively against the live database.

## Execution order and status

Plans are ordered by leverage, with dependencies respected. Each row is merged to
`main` before the next begins unless the parallel note says otherwise.

| # | Plan | Priority | Effort | Risk | Depends on | Status |
|---|---|---|---|---|---|---|
| 1 | [075](075-remove-the-committed-xero-debug-harness.md) Remove the committed Xero debug harness and restore the quality gate | P1 | S | LOW | — | MERGED (`3040948`; implementation `8b3efbe`; review approved) |
| 2 | [051](051-isolate-the-jobs-integration-test-fixtures.md) Isolate the jobs integration fixtures | P1 | S | LOW | — | REJECTED (2026-08-24: fixed independently in `37e7231`; live pair passed twice at `b590de2`) |
| 3 | [052](052-correct-the-timezone-contract-for-working-day-units.md) Correct the timezone contract for working-day units | P1 | S | MED | — | DONE (2026-08-24 at `117fb1b`; merge `660b1a6`; current check/typecheck/test and focused 32/32 pass; integration proven on identical source tree at `8b3efbe`) |
| 4 | [053](053-guard-the-inbound-leave-upsert-against-stale-writes.md) Guard the inbound leave upsert | P1 | M | MED | 075 | MERGED (`6a5e9d0`; implementation `27b739b`; review approved) |
| 5 | [054](054-keep-synced-leave-in-the-feed-for-its-whole-last-day.md) Keep synced leave in the feed for its last day | P1 | S | MED | — | MERGED (`85756fe`; implementation `07885a5`; review approved) |
| 6 | [055](055-make-launch-mode-safe-in-the-browser.md) Make launch mode safe in the browser | P1 | S | LOW | — | MERGED (`1f507b9`; implementation `e4c5997`; review approved) |
| 7 | [057](057-make-failures-visible-and-scrub-what-is-logged.md) Make failures visible, scrub what is logged | P1 | S | LOW | — | TODO |
| 8 | [056](056-give-the-approval-reconciler-a-cursor.md) Give the approval reconciler a cursor | P2 | M | LOW | needs `DATABASE_URL` | TODO |
| 9 | [058](058-bound-the-unbounded-sync-loops.md) Bound the unbounded sync loops | P2 | L | MED | 053 | TODO (reconciled 2026-08-23 at `206af7b`: one cursor page per run; bulk stale archive) |
| 10 | [059](059-make-the-notification-stream-reliable-and-affordable.md) Make the notification stream reliable | P2 | M | MED | — | TODO |
| 11 | [060](060-project-explicit-columns-in-the-analytics-services.md) Project explicit columns in analytics | P2 | S | LOW | — | TODO |
| 12 | [061](061-halve-the-work-on-the-ics-feed-read-path.md) Halve the work on the ICS read path | P2 | S | LOW | 054 | TODO |
| 13 | [063](063-close-the-validation-and-authorisation-gaps.md) Close the validation and authorisation gaps | P2 | M | LOW | — | TODO |
| 14 | [066](066-test-the-untested-money-and-tenancy-paths.md) Test the money and tenancy paths | P2 | M | LOW | — | TODO (reconciled 2026-08-24: allocate a unique local fixture prefix; no registry dependency) |
| 15 | [062](062-enforce-a-content-security-policy.md) Enforce a Content Security Policy | P2 | M | MED | — | TODO |
| 16 | [067](067-consolidation-and-hygiene.md) Consolidation and hygiene | P3 | S | LOW | — | TODO |
| 17 | [064](064-harden-the-public-feed-and-support-surfaces.md) Harden the public feed and support surfaces | P3 | M | LOW | 061 | TODO |
| 18 | [065](065-unify-the-public-holiday-predicate.md) Unify the public holiday predicate | P3 | M | **MED** | 060, 061 | TODO, **decision required** |
| 19 | [068](068-merge-the-twin-analytics-services.md) Merge the twin analytics services | P3 | L | MED | 060, 065 | TODO |
| 20 | [069](069-fix-xero-people-sync-and-directory-ui.md) Fix Xero people sync and directory UI gaps | P1 | M | LOW | — | DONE (2026-08-23, commit 5993283, verified: check/typecheck/test pass) |
| 21 | [070](070-xero-token-and-refresh-token-management-architecture.md) Xero token & refresh token management architecture | P1 | M | LOW | — | DONE (2026-08-23, branch `advisor/070-xero-token-refresh-management`, commit `0514f71`, review approved; not merged) |
| 22 | [071](071-nz-and-uk-xero-payroll-read-and-sync-expansion.md) NZ & UK Xero payroll read and sync expansion | P1 | XL | HIGH | 058, 069 | TODO (reconciled 2026-08-23: monetary balances included as `currency` plus ISO 4217 code) |
| 23 | [072](072-automated-clerk-user-matching-and-bulk-invitations.md) Import every missing Xero employee before reconciling Clerk access | P1 | M | MED | 069, 071 | TODO |
| 24 | [073](073-orphaned-xero-employee-lifecycle-reconciliation.md) Soft-archive Xero employees missing from a complete payroll snapshot | P2 | M | MED | 072 | TODO |
| 25 | [074](074-xero-tracking-category-team-and-manager-hierarchy-sync.md) Xero tracking category team & manager hierarchy sync | P2 | M | LOW | 073 | TODO |

## Companion reference docs (not executable)

Not part of the execution queue — same pattern as `gtm-team-calendar-go-to-market-plan.md` (business strategy doc). Kept for audit and implementation correctness.

- [xero-people-sync architecture](../docs/architecture/xero-people-sync.md) — companion to **069** (`069-fix-xero-people-sync-and-directory-ui.md`), reconciled 2026-08-23 at `18a8bae`; moved from `plans/069-xero-people-sync-architecture-and-reconciliation.md` to resolve duplicate numbering. Updated to reflect `person_type` mapping and `syncResult` error surfacing.

**Plan 051 is retired.** The original fixture collision is gone and the affected
pair has live database proof. Plans 056 and 066 no longer depend on it, although
their own database-backed done criteria still require a reachable `DATABASE_URL`.

Every numbered file in this directory is an executable implementation plan.
`gtm-team-calendar-go-to-market-plan.md` is deliberately unnumbered: it is a
business strategy document, not work for an executor, and is not part of this
queue.

**Plan 065 must not start without an operator decision.** It changes what
customers see on three surfaces by design. Its "The decision this plan must make
first" section has to be agreed before any code is written.

### Dependency notes

```text
075 -> 053                 (removes unsafe debug routes before the stale-write branch resumes)
053 -> 058                 (same handler file; 053 is the smaller diff)
054 -> 061                 (same projection file)
060 + 061 -> 065           (065 narrows what the predicate reads; both must land first)
060 + 065 -> 068           (068 adopts the shared projection and shared predicate)
058 + 069 -> 071           (bounded sync foundations and AU people fixes precede regional employee-scoped reads)
069 + 071 -> 072           (071 establishes all regional readers; 072 then locks their shared import/reactivation contract)
072 -> 073                 (same handler and tests; 072 owns returned-ID import/reactivation, then 073 adds guarded absence archival)
073 -> 074                 (same mapper, handler and tests; 074 adds hierarchy only after the employee lifecycle is stable)
```

Everything not named above is independent and may run in any order.

### May run in parallel

055, 057 and 059 touch disjoint files and can run concurrently if throughput
matters. Do **not** parallelise 053 with 058, 054 with 061, any pair of 071,
072, 073 and 074, or anything with 065 and 068.

## Deferred plans from the earlier backlog

Still valid, still TODO, unchanged by this audit.

| Plan | Required outcome | Trigger |
|---|---|---|
| [030](030-remove-three-avoidable-round-trip-patterns.md) | Remove avoidable round trips in organisation lookup, holiday import and the people directory | Re-profile after real early-access traffic; execute only the parts supported by measured cost |
| [031](031-fix-the-database-package-boundary.md) | Correct the `packages/database` export and client boundary | Before the next material database export/client-boundary refactor |
| [037](037-spike-nz-and-uk-payroll-write-back.md) | Spike NZ and UK payroll write-back and produce follow-on plans | Before committing to an NZ or UK launch |
| [039](039-decide-what-to-do-with-the-html-feed-renderer.md) | Decide whether to expose, extend or delete the HTML feed renderer | Before relying on the renderer; otherwise choose deletion as maintenance |

Do not execute plan 030 solely because it exists. Capture production timings
first. The current release must continue to present AU as the only supported
payroll write-back region until plan 037 is done and its follow-ons land.

## Rejected

| Plan | Rationale |
|---|---|
| [024](024-harden-env-validation-in-the-app-and-web-apps.md) | An outer app `createEnv()` cannot repair values already validated by package-level `createEnv()` calls. Plan 041 was the implemented replacement and is done. **Do not execute.** Retained only as the record of why the approach fails; safe to delete |

## Finding to plan map

Every finding from the 2026-08-12 audit, and where it is addressed. Findings were
verified by reading the cited code, not taken from a subagent report.

| Finding | Summary | Plan |
|---|---|---|
| C-01 | Working-day units written to Xero payroll are wrong for every AU/NZ org | 052 |
| C-02 | Inbound leave sync overwrites newer local approval state | 053 |
| C-03 | Xero-synced leave leaves the ICS feed part-way through its last day | 054 |
| C-04 | `getLaunchMode()` throws inside client components when the env var is unset | 055 |
| C-05 | Approval reconciler starves records past the first 500 (residual after plan 038) | 056 |
| C-06 | Seven bare catches discard the post-Xero-write failure | 057 |
| C-07 | Leave-balance sync is unbounded and outlives its Xero token | 058 |
| C-08 | SSE poll errors swallowed; stream stays open and silent | 059 |
| C-09 | Resolved not-found reconciliation also counted as a failure | 056 |
| S-01 | The log scrubber is wired to no sink at all | 057 |
| S-02 | CSP is report-only, unenforceable, and not reporting; no HSTS | 062 |
| S-03 | Availability routes read the tenant key outside the Zod schema | 063 |
| S-04 | `createInitialToken` mints a plaintext token with no role check, no callers | 063 |
| S-05 | Stripe webhook trusts `metadata.clerk_org_id` as sole tenant key | 063 |
| S-06 | `proxy.ts` protects nothing while `CLAUDE.md` says it does | 067 (doc half); see note |
| S-07 | ICS endpoint distinguishes 404 from 410; no rate limit | 064 |
| S-08 | Support form exports tenant PII and interpolates untrusted text | 064 |
| P-01 | Analytics pulls raw Xero payloads into the RSC | 060 |
| P-02 | Duplicate `NotificationsProvider` plus a 2s KV poll per connection | 059 |
| P-03 | ICS cache miss does the token lookup and KV read twice | 061 |
| P-04 | Stale-record archive is unbounded | 058 |
| P-05 | Holidays fetched a whole year at a time with an unused join | 061 |
| A-01 | Eight `labelForRecordType` copies; `Wfh` vs `WFH` reaches subscribers | 067 |
| A-02 | Five divergent holiday predicates; four schema scopes ignored | 065 |
| A-03 | Two hand-rolled KV clients; notifications has no `keys.ts` | 067 |
| A-04 | The twin analytics services | 068 |
| T-01 | Two integration test files claimed the same six primary keys | 051 (REJECTED: fixed independently in `37e7231`, verified 2026-08-24) |
| T-02 | Stripe ordering guard and idempotency SQL untested | 066 |
| T-03 | XeroConnection/XeroTenant uniqueness invariants untested | 066 |
| T-04 | Duplicate route tests in `apps/api/__tests__/` have drifted | 066 |
| T-05 | `alternative-contact-service.ts`: 599 lines, no co-located test | 066 |
| M-01 | Root `ws` override conflicts with the range `packages/database` declares | 067 |
| D-01 | The documented single-test command fails on all 28 `.tsx` tests | 067 |
| D-02 | `.env.example` omits all seven variables preflight requires | 055 |
| DOC-01 | `CLAUDE.md` omits two real packages, warns against ten that don't exist | 067 |
| R-S-01 | Committed Xero debug routes perform unscoped reads and writes and fabricate sync history | 075 |
| R-D-01 | The debug harness and temporary sync logging break `bun run check` with 62 errors | 075 |

The `R-` findings were discovered during the 2026-08-24 reconciliation of plan
052, after the original audit.

**Note on S-06.** `apps/app/proxy.ts` is bare `clerkMiddleware()`, which protects
nothing, while `CLAUDE.md:336` states route protection is composed there. The
`(authenticated)` layout guards pages but does not protect route handlers. At
`b590de2`, the committed debug route handlers make that exposure concrete; plan
075 deletes them. Plan 067 still corrects the documentation. Any future route
handler that accesses protected data must add resource-level authentication and
both tenant scopes. A framework-level gate remains a separate operator decision.

Confidence was HIGH on every finding except S-05, S-07 and S-08, which are MED
because they depend on facts outside the repository: whether a legitimate flow
re-points a Clerk Org at a new Stripe customer, what Vercel Firewall rules exist,
and whether the configured GitHub issue repo is private. Each of those is a STOP
condition in its plan.

## Direction options, not defects

Recorded for the maintainer to weigh. No plans written; none of these is a
defect.

- **Recurrence is UI-only.** A full recurrence editor and a tested expansion
  module exist (`apps/app/app/(authenticated)/recurrence.ts`,
  `components/recurrence-fields.tsx`), but there are no recurrence columns in
  `schema.prisma` and no `RRULE` anywhere in `packages/feeds`. Occurrences become
  independent records, so there is no edit-series or cancel-series, one VEVENT
  per occurrence reaches subscribers, and a series has no identity in the UID
  strategy.
- **The holiday assignment model is four-fifths unused.**
  `public_holiday_assignment_scope_type` models organisation, location, team,
  person and feed, and `include_in_feeds` is written on every assignment, but
  only the dashboard honours non-location scopes and nothing reads
  `include_in_feeds`. Plan 065 does most of the work; turning it into a feature
  is the smaller remaining step.
- **Paid-launch readiness is the real gate, not the launch-mode flag.** Stripe is
  fully wired and gated off. Flipping to `paid` today lights up four unverified
  paths at once: T-02, D-02, S-05 and C-04 — plans 066, 055 and 063.

## Completed plans

Verified against `main` at `121da2a`. Files removed in this reconciliation;
recover any with `git show HEAD:plans/<filename>`. Their behaviour remains part
of the release baseline.

| Plan | Outcome | Landed as |
|---|---|---|
| 001 | Core calendar, contact and notification interactions made accessible and responsive | `2f8f12a` |
| 002 | An unlinked Clerk user cannot pass the nullable manager check | `4b84e49` in `b14e7c0` |
| 003 | A malformed Xero page cannot be treated as a complete sync or trigger mass archive | `5f5bdd7` in `3568795`, `2095b1f` |
| 004 | Managers cannot approve or decline their own leave | `f880889` in `c151225` |
| 005 | Manifests, overrides and lockfile agree; the `sharp` advisory is cleared | `daa3985` in `fbaace4`, completed by `f1884db` |
| 006 | Inbound sync preserves user-owned privacy and feed choices | `f903a8f` in `0e0ea09` |
| 007 | Approval reconciliation cannot overwrite a newer local transition | `ef0bdab` in `6f181ff` |
| 008 | Xero OAuth state is time-bound, browser-bound and replay-resistant | `f183e2b` in `832c9ff` |
| 009 | Feed token telemetry debounced; matching ETags short-circuit to 304 | `2e063fe` |
| 010 | Token decryption failures remain typed, diagnosable Xero errors | merged |
| 011 | A settings failure cannot disable the decline-reason policy | merged |
| 012 | Notification failure cannot roll back durable Xero failure state | merged |
| 013 | Approvals list bounded; raw Xero and write-error payloads never cross the manager browser boundary | `96ef8df` |
| 014 | Feed invalidation batched and keyspace scans removed | `df05bf3` |
| 015 | Root and CI tests enter every owned workspace | merged |
| 016 | CI requires a production build for all deployable apps | `e38511f` |
| 017 | Retries and concurrent requests cannot create duplicate Xero leave applications | verified: `xero_write_claimed_at` at `schema.prisma:602` |
| 018 | Reconciled records do not retain misleading stale write errors | verified: `approval-service.ts:688,844,939` |
| 019 | Feed-lookup action enforces both tenant keys; the Xero-match half superseded by 050 | `b56106b`; verified at `_actions.ts:162,164` |
| 020 | Destructive Xero disconnect isolation runs in the integration lane | `431d5e1` |
| 021 | Shared two-key tenant-scoping helper adopted | `6ab940c` |
| 022 | Check and fix commands cover the same source scope | `65afb84` |
| 023 | Environment examples corrected and dead Knock configuration removed | `84d0907`, `c4f5f3b` |
| 025 | Product Help points to the real web help centre | `532ae91` |
| 026 | Repository agent documentation corrected for Team Calendar | `abaded2` |
| 027 | A Person can bind only to a valid Clerk member of the active organisation | `80434d3`, verified at `f09386e` |
| 028 | Role hierarchy, feed-preview privacy and tenant-query behaviour pinned by tests | `91be435`, `f5a12c7` in `9352efd` |
| 029 | Authenticated mutation boundaries covered | `878809d`, `49219ef`, `a06cf63` in `06a595e` |
| 032 | Client Xero connection projection uses an explicit safe allowlist | `2a5b29b` |
| 033 | Dead code and manifest hygiene completed | `fa140b9`, `462f5c9` |
| 034 | Feed publication reconciler bounded and batched | `350e425`, `ab49530`, `8b9134c`, `2f1baef` in `ca6d186` |
| 035 | Test and typecheck tasks express their real dependencies | `d026e01`, `5f9a8ec` |
| 036 | Cross-tenant access is logged server-side, not reported to the caller | `c7f3396` in `52d7d86` |
| 038 | Approval reconciliation bounded and safe to schedule (residual cursor gap is C-05, plan 056) | `cf0e77a` |
| 040 | Web build environment guard corrected | `bad2224` |
| 041 | Empty-string environment handling moved to package-owned schemas | `dc60b1b` |
| 042 | One-day and multi-day all-day leave emit correct exclusive ICS end dates | `f09386e` |
| 043 | Transient feed failures return a retryable response instead of a permanent 404 | `5670ff5` |
| 044 | Active AU tenants receive bounded people, leave and balance syncs | `9928d65` |
| 045 | Public journeys, billing controls, preflight, help and telemetry match closed early access | `2ced190` |
| 046 | Closed AU early access go-live executed | `951e2e2` |
| 047 | React pins aligned, `next 16.3.0` and the refreshed lockfile committed | `f1884db` |
| 048 | `bun run check` exits 0; the lint gate is real | `b015511` |
| 049 | `bun run build` exits 0 for all four tasks | `8adeaa5`, verified at `44c2eb6` |
| 050 | The Xero person-match surface is scoped to a single Organisation | `297ba7d` |

## Findings considered and rejected

Recorded to prevent low-value re-audits:

- The recurring "react and react-dom patch versions differ" blocker was one
  uncommitted lockfile, owned by plan 047. Do not re-diagnose it per plan.
- The earlier report of roughly twelve unscoped writes reduced to the two genuine
  action gaps in plan 019. Other id-only writes follow a tenant-scoped read in
  the same transaction.
- `lint/performance/noJsxPropsBind` (240 sites) and
  `lint/performance/noAwaitInLoops` (47 sites) are disabled with recorded
  reasons. React 19 with the React Compiler makes manual `useCallback` wrapping
  unnecessary, and the flagged loops are deliberately sequential because Xero
  allows only five concurrent requests per organisation.
- Constant-time behaviour for a database-backed UUID existence check is not a
  practical goal. Plan 036 kept internal detection and removed the caller
  distinction. S-07 concerns the 404/410 distinction and rate limiting, which is
  a different question.
- A new Playwright lane is not required for the closed cohort.
- Completing the Mintlify documentation application is deferred. `apps/docs`
  declares a `lint` script with no matching `turbo.json` task, so it never runs
  in CI; acceptable while the work is deferred.
- Pinning or downgrading Bun to work around the old build crash is rejected;
  plan 049 removed the `--bun` flag instead.
- The two `bun audit` advisories (`esbuild` low, `uuid` moderate) are build-time
  only and remain accepted. Re-verified 2026-08-12: unchanged, no critical or
  high advisories.
- `country_code: "CUSTOM"` on manual holidays is a deliberate sentinel, handled
  at `feed-projection.ts:335`. Stringly-typed, but not a defect.
- `turbo.json`'s `test` task has no `dependsOn: ["^build"]` while `typecheck`
  does. Not a defect: `packages/database/generated/` is committed and CI
  generates the Prisma client explicitly.
- 34 `apps/app` server components hand-roll Prisma queries alongside the
  `packages/availability` service layer. Real pattern inconsistency, but plan 031
  already owns the boundary question.
- `@types/node` and `@types/react` pinned exactly everywhere except
  `packages/design-system`. Real drift, zero cost, and that package is out of
  scope.
- The outbound-write claim lock exists on submit but not on approve/decline/
  withdraw. Not a defect: those paths are guarded by `approval_status` plus
  `derived_sequence` on commit, and the Xero operations are idempotent state
  transitions rather than creates.
- The `XeroRateLimiter` timeout promise leaves an uncleared `setTimeout` per
  queued waiter. Bounded by concurrency and self-clearing; noise, not a leak.

## What this reconciliation did not verify

- The integration lane. `bun run test:integration` needs a live `DATABASE_URL`
  and the operator host has no local Postgres.
- Live Vercel, Clerk, Xero, Inngest, Neon, KV, Resend, Sentry, DNS, email-domain
  or backup configuration.
- Production data, load, browser performance or support volume.
- `packages/design-system`, `apps/docs`, `apps/email` and `ds-bundle`.
- Marketing-site quality outside the launch-critical pricing, contact, legal and
  help paths.

## Status rules

- `TODO`: not started or not evidenced on the current release commit.
- `IN PROGRESS`: an executor is actively working on it.
- `DONE`: implementation and done criteria are merged into the release branch.
- `BLOCKED`: a STOP condition prevents execution; include a one-line reason.
- `REJECTED`: superseded or no longer worth executing; include a one-line
  rationale.

Executors must:

1. read the selected plan completely;
2. run its drift check against current `HEAD`;
3. stop on a material mismatch and refresh the plan rather than improvising;
4. run every required verification gate;
5. update this index only after evidence exists on the target branch.

If a gate fails for a reason your change could not have caused, say so
explicitly rather than marking the plan blocked. Eight plans were once wrongly
blocked by three environmental problems while being individually correct.

Several plans deliberately require a **mutation check**: revert the fix, confirm
the new test fails, restore. A test that passes both before and after a fix is
not testing the defect. Do not skip that step.
