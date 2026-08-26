# Team Calendar implementation plans

This directory is the implementation backlog maintained through the `improve`
skill. It was fully reconciled on 24 August 2026 against `main` at `ecd49f5`.
Every current source claim was either rechecked, narrowed, made executable,
completed or rejected. Rejected plan files remain as decision records and must
not be executed. All design and decomposition blockers are resolved. Only the
two regional activation plans remain `BLOCKED`, on named live Xero environments
and UK partner permission that repository analysis cannot supply.

## Execution policy

Set 2026-08-26: all plan executions land directly on `preview`
(`origin/preview`), not `main`, and run directly in this working tree — no
isolated git worktree. This supersedes the `improve` skill's default
`execute` dispatch (`isolation: "worktree"`, branch off the default branch)
for this repo only:

- Every TODO/BLOCKED plan's `## Git workflow` section now opens with a "Base
  branch: `preview`" bullet ahead of its own branch name — branch from
  `preview`, not `main`.
- Executors work directly in the current working tree. Uncommitted changes
  must be checked (`git status`) and any in-progress work stashed or
  committed before a plan's branch is checked out, per the standing git
  safety rules.
- The advisor's review verdict process is unchanged: re-run done criteria,
  check scope, read the diff. **APPROVE** still means presenting the diff for
  the user's own merge decision — the user merges into `preview` themselves;
  the advisor and executor never merge, push, or land on `preview` without
  that explicit go-ahead.
- Rejected and DONE plans are historical records; this policy does not
  retroactively change how already-merged work landed (092 and 076 merged to
  `main`, before this policy existed).

## Verification snapshot

This reconciliation was read-only outside `plans/`.

| Evidence | Result |
|---|---|
| Availability focused tests | 2 files, 89 tests passed |
| Jobs leave-record focused tests | 1 file, 20 tests passed |
| Feed projection/render focused tests | 2 files, 40 tests passed |
| Next config, Xero and observability focused tests | 6 files, 91 tests passed |
| Additional Xero plan-review suite | 6 files, 96 tests passed |
| `DATABASE_URL` | absent, so current integration gates were not rerun |
| Default `bun run build` | failed on this host because Turbopack followed a workspace TypeScript symlink cycle; no application compile defect was established |
| Blocked-plan cold review | 9 plans reviewed; 3 rewritten, 6 rejected and split |
| Plan 076 execution | focused tests 15/15; full check, typecheck, unit, database integration and default build gates passed |
| Plan 092 execution | approved at `c680fc2`, merged as `1122457`; focused test 2/2, check, typecheck, unit, live database integration, build and diff gates passed; app, web and API each returned one exact HSTS header |
| Plan 097 execution | approved at `ecd49f5`, merged as `e5ed63c`; focused mapper 21/21, focused job integration 8/8, check, typecheck, unit and live database integration gates passed; `api` build (the plan's actual consumer) passed in isolation, default monorepo `bun run build` still blocked by the pre-existing Turbopack symlink issue above |
| Current indexed plans | 64: 37 TODO, 11 DONE, 14 REJECTED, 2 BLOCKED |

Historical green gates remain useful evidence, but are not represented as fresh
proof on `ecd49f5`. A plan requiring build or database integration must run on a
host that can satisfy those gates before it can become `DONE`.

## Execution queue

This queue contains TODO plans only and is topologically ordered: every plan
appears after its TODO plan dependencies. Plans without plan dependencies may be
executed in parallel when their file scopes are disjoint. Merge each dependency
before starting its dependent plan.

| Plan | Outcome | Priority | Depends on | Status |
|---|---|---:|---|---|
| [097](097-harden-returned-xero-employee-import.md) | Harden payroll import and reactivation | P1 | none | DONE |
| [101](101-add-currency-leave-balance-contract.md) | Add currency balance schema contract | P1 | migration runner | TODO |
| [030](030-remove-three-avoidable-round-trip-patterns.md) | Remove manager-dashboard query amplification | P2 | none | TODO |
| [056](056-give-the-approval-reconciler-a-cursor.md) | Fair per-record approval reconciliation | P2 | integration database | TODO |
| [059](059-make-the-notification-stream-reliable-and-affordable.md) | Surface SSE failures and reduce idle polling | P2 | none | TODO |
| [060](060-project-explicit-columns-in-the-analytics-services.md) | Exclude audit blobs from analytics queries | P2 | none | TODO |
| [066](066-test-the-untested-money-and-tenancy-paths.md) | Test billing SQL, tenancy and contact logic | P2 | integration database | TODO |
| [087](087-complete-xero-people-sync-regression-tests.md) | Complete Plan 069 test promises | P2 | integration database | TODO |
| [089](089-map-xero-matches-to-a-client-view-model.md) | Map Xero matches to a browser-safe view model | P2 | none | TODO |
| [090](090-bulk-stale-xero-leave-archival.md) | Bulk stale leave archival and feed invalidation | P2 | none | TODO |
| [037](037-spike-nz-and-uk-payroll-write-back.md) | Decide NZ/UK write-back capability from primary sources | P3 | none | TODO |
| [039](039-decide-what-to-do-with-the-html-feed-renderer.md) | Delete the out-of-scope HTML feed prototype | P3 | none | TODO |
| [078](078-delete-dead-feed-token-helpers.md) | Delete unused token service surface | P3 | none | TODO |
| [084](084-remove-the-production-workspaces-override.md) | Remove redundant root `ws` override | P3 | none | TODO |
| [085](085-correct-repository-guidance-and-package-tables.md) | Correct commands and package ownership docs | P3 | none | TODO |
| [086](086-spike-xero-employee-group-team-mapping.md) | Decide EmployeeGroupName team mapping | P3 | none | TODO |
| [098](098-confirm-missing-xero-people-before-archival.md) | Confirm absence before person archival | P1 | 097 | TODO |
| [107](107-present-currency-safe-leave-balances.md) | Present balances with currency-safe formatting | P1 | 101 | TODO |
| [061](061-halve-the-work-on-the-ics-feed-read-path.md) | Resolve feed/cache once and narrow holiday reads | P2 | 057, 066 | TODO |
| [077](077-validate-availability-route-identifiers.md) | Validate availability UUIDs before queries | P2 | 066 | TODO |
| [079](079-cross-check-stripe-webhook-tenant-identity.md) | Cross-check Stripe customer and Clerk org | P1 | 066 | TODO |
| [081](081-minimise-and-delimit-support-issue-data.md) | Minimise/delimit support issue data | P2 | 066 | TODO |
| [091](091-page-scheduled-xero-balance-sync.md) | Page scheduled balance sync across runs | P2 | 076 | TODO |
| [093](093-observe-a-nonce-ready-csp.md) | Observe a privacy-safe nonce CSP | P2 | 057 | TODO |
| [099](099-reconcile-clerk-access-and-invitations.md) | Link active people and guard Clerk invitations | P1 | 097, 098 | TODO |
| [100](100-add-regional-xero-employee-readers.md) | Add NZ/UK employee readers | P1 | 097, 098 | TODO |
| [088](088-publish-explicit-database-package-subpaths.md) | Publish database subpaths, remove `/src/` imports | P2 | 066, 079 | TODO |
| [094](094-enforce-the-observed-csp.md) | Enforce the observed nonce CSP | P2 | 093 plus observation evidence | TODO |
| [095](095-centralise-the-supported-holiday-rule.md) | Centralise the supported holiday rule | P2 | 061 | TODO |
| [082](082-centralise-availability-record-labels.md) | Centralise record labels only | P3 | 060, 061 | TODO |
| [083](083-share-redis-rest-transport-and-notification-keys.md) | Share Redis transport and declare notification keys | P3 | 059, 061 | TODO |
| [102](102-add-new-zealand-xero-read-adapters.md) | Add NZ leave/balance/status adapters | P1 | 100, 101 | TODO |
| [080](080-rate-limit-public-feed-token-probes.md) | Rate-limit public feed probes | P2 | 061, 066, 083 plus operator limits | TODO |
| [096](096-align-current-status-holiday-consumers.md) | Align status/dashboard holiday consumers | P2 | 095 | TODO |
| [103](103-add-united-kingdom-xero-read-adapters.md) | Add UK leave/balance/status adapters | P1 | 102 | TODO |
| [104](104-orchestrate-regional-leave-sync.md) | Page and reconcile regional leave | P1 | 090, 102, 103 | TODO |
| [105](105-reconcile-regional-approval-state.md) | Reconcile regional approval state | P1 | 056, 102, 103 | TODO |
| [106](106-orchestrate-regional-balance-sync.md) | Orchestrate regional balance pages | P1 | 091, 101, 102, 103 | TODO |

The unnumbered [go-to-market plan](gtm-team-calendar-go-to-market-plan.md) is a
business strategy document, not an executor plan. It was refreshed on 24 August:
the missed instrumentation milestone and absent application flow are launch
blockers, and calendar adoption is measured through observed feed-token access.

## Recommended sequence

```text
Ready roots, grouped by priority:
  P1: 097, 101
  P2: 030, 056, 059, 060, 066, 087, 089, 090, 093
  P3: 037, 039, 078, 084, 085, 086

Security and boundary chain:
  066 -> 077
  066 -> 079 -> 088
  066 -> 081
  057 DONE -> 093 -> seven-day observation -> 094

Feed and Redis chain:
  057 DONE + 066 -> 061
  059 + 061 -> 083
  061 + 066 + 083 + operator limits -> 080

Shared domain chain:
  060 + 061 -> 082
  061 -> 095 -> 096

Xero sync chain:
  076 DONE -> 091
  097 -> 098 -> 099
  097 -> 098 -> 100
  100 + 101 -> 102 -> 103
  090 + 102 + 103 -> 104
  056 + 102 + 103 -> 105
  091 + 101 + 102 + 103 -> 106
  101 -> 107
```

Database/build and deployed-observation gates remain executable TODO preflights.
Blocked regional activation work is documented separately below and is not part
of the recommended TODO sequence.

## Remaining unblock checklist

- **Plan 108**: record a sanctioned NZ demo/verification payroll tenant, Xero
  preview credential types, payroll-admin authoriser and preview callback/deploy
  path. Do not place credential values or tenant data in plans.
- **Plan 109**: record Xero partner permission for Payroll UK plus the equivalent
  sanctioned UK tenant and preview path. NZ live rollout is not a prerequisite.

Every other former blocker has an executable replacement or an explicit
predecessor/preflight contract in its plan.

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
| C-05 approval reconciliation starvation | 056 |
| C-06 approval failure visibility | 057 DONE |
| C-07 unbounded balance work | 091 |
| C-08 silent SSE poll failures | 059 |
| C-09 not-found counted as failure | 056 |
| S-01 exact `error` channel not scrubbed | 057 DONE |
| S-02 inert CSP and no HSTS | 092–094 |
| S-03 unvalidated availability identifiers | 077 |
| S-04 dead ungated token helpers | 078 |
| S-05 Stripe metadata as sole tenant key | 079 |
| S-06 proxy/documentation mismatch | dangerous debug handlers removed by 075; guidance in 085 |
| S-07 public feed exposure | 410 retained by design; rate limiting in 080 |
| S-08 support issue data boundary | 081 |
| P-01 analytics audit-blob projection | 060 |
| P-02 SSE polling cost | duplicate provider fixed; residual in 059 |
| P-03 duplicate feed/cache lookup | 061 |
| P-04 unbounded stale archive | 090 |
| P-05 broad holiday reads | 061 |
| A-01 duplicate record labels | 082 |
| A-02 divergent holiday predicates | 095–096 |
| A-03 duplicate Redis REST mechanics | 083 |
| A-04 twin analytics services | 068 rejected; reassess after 060/082/095 |
| T-01 fixture collision | 051 rejected, independently fixed |
| T-02 billing SQL coverage | 066 |
| T-03 Xero tenancy uniqueness coverage | 066 |
| T-04 duplicate API route suites | 066 |
| T-05 alternative-contact service coverage | 066 |
| R-058-01 scheduled provider/database tenant mismatch | 076 DONE |
| R-058-02 bounded sync/product contract mismatch | 091, contract resolved |
| M-01 duplicate `ws` ownership | 084 |
| D-01 stale test command guidance | 085 |
| D-02 missing preflight env examples | 055 DONE |
| DOC-01 package-table drift | 085 |
| R-069-01 missing Plan 069 regression seams | 087 |
| R-031-01 private database `/src/` imports | 088 |
| R-031-02 Prisma model types cross a client boundary | 089 |
| R-071-01 NZ/UK adapters and rollout | 100–109 |
| R-072-01 returning people and Clerk access ordering | 097–099 |
| R-073-01 unsafe one-pass missing-person archival | 098 |

## Completed-plan ledger

Plans 001–023, 025–029, 032–036, 038, 040–050 are complete and their plan files
were removed in an earlier reconciliation. Recover a historical file with
`git show <relevant-commit>:plans/<filename>` when needed. The following outcomes
remain important dependencies:

| Plan | Outcome |
|---|---|
| 013 | Approval list uses an explicit projection; audit payloads do not cross the manager browser boundary |
| 021 | Shared dual-tenant scoping helper adopted |
| 034 | Feed publication reconciliation bounded and batched |
| 038 | Approval reconciliation capped safely; Plan 056 owns fairness |
| 041 | Empty-string env handling moved to package-owned schemas |
| 043 | Transient feed failures return retryable 503 behaviour |
| 044 | Scheduled AU sync orchestration established; it does not prove bounded whole-organisation balance work |
| 045–046 | Closed AU early-access product and go-live baseline |
| 049 | Default build previously passed on a suitable runner |
| 050 | Xero person-match surface scoped to one Organisation |
| 057 | Exact `error` channels scrubbed at every nesting level; approved as `782c2b5` and merged as `409fd10` after all gates passed |
| 076 | Scheduled sync payloads and event IDs use the database tenant UUID; approved as `a2c3afb` and merged as `d608a12` after distinct-ID integration coverage and all gates passed |

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
