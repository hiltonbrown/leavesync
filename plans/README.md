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
| Plan 101 execution | approved at `ecd49f5`, merged as `0a42835`; focused mapper/job/database/manual-balance tests 21/21, one migration generated and applied cleanly, check, typecheck, unit and live database integration gates passed; `api` build passed in isolation, default monorepo `bun run build` still blocked by the pre-existing Turbopack symlink issue above |
| Plan 030 execution | approved at `ecd49f5`, merged as `bf789b9`; focused dashboard tests 14/14 (including a constant-query-count boundary test proven to fail against the pre-plan implementation), check, typecheck, unit and live database integration gates passed; `api` build passed in isolation, default monorepo `bun run build` still blocked by the pre-existing Turbopack symlink issue above |
| Plan 056 execution | approved at `d0a9416`; focused handler tests 19/19 (including 5 new fairness and not_found tests), migration applied cleanly and verified with `prisma migrate diff`, check, typecheck, unit and live database integration gates passed |
| Plan 059 execution | approved at `c26a38e`; focused stream route tests 14/14 with fake timers, check, typecheck, unit, live database integration and diff gates passed |
| Plan 060 execution | approved at `36e0bc3`; focused analytics tests 25/25, query shape assertions confirming audit blobs omitted, check, typecheck, unit and live database integration gates passed |
| Plan 066 execution | approved at `93f73cc`; billing SQL integration suite 5/5, Xero tenancy P2002 uniqueness suite 3/3, duplicate route test files deleted, alternative-contact characterisation suite 22/22, check, typecheck, unit and live database integration gates passed |
| Plan 087 execution | approved at `7aef039`; person_type integration assertions 8/8, People client notification test suite 11/11, sync actions error/cancellation suite 12/12, check, typecheck, unit and live database integration gates passed |
| Plan 089 execution | approved at `6fb72b2`; narrow Prisma select allowlist, serialisable XeroPersonMatchView mapper, matches client tests 6/6, check, typecheck, unit and live database integration gates passed |
| Plan 090 execution | approved at `6ae18c6`; single-transaction stale leave archival with updated_at guard, per-stale-record publication materialisation removed, canonical feedIdsForPeople resolution and deduped invalidation, check, typecheck, unit and live database integration gates passed |
| Plan 037 execution | approved at `a7e7289`; read-only research spike, official NZ/UK OpenAPI analysis, findings and decision matrix recorded in plans/037-nz-uk-write-back-findings.md, check, typecheck, unit and diff gates passed |
| Plan 039 execution | approved at `d3733fe`; deleted unused HTML feed prototype (render-html.ts and render-html.test.ts), 0 remaining references, build, check, typecheck, unit and live database integration gates passed |
| Plan 078 execution | approved at `365d8ef`; deleted unused feed token helpers (createInitialToken, listTokens, getActiveTokenHint) and dead private mapping schemas, preserved transactional createInitialTokenWithClient, check, typecheck, unit and live database integration gates passed |
| Plan 084 execution | approved at `800f1bb`; removed redundant root ws override while preserving @repo/database safe floor constraint, clean lockfile resolution, check, typecheck, unit and live database integration gates passed |
| Plan 085 execution | approved at `a26b476`; reconciled root scripts and package ownership tables across AGENTS.md, CLAUDE.md and GEMINI.md, documented billing and analytics packages, preserved forbidden-package boundary, check, typecheck, unit and live database integration gates passed |
| Plan 086 execution | approved at `aaaf7c8`; read-only research spike, official Xero OpenAPI analysis confirming AU-only GL group semantics and unsupported manager hierarchy, findings recorded in plans/086-findings.md, check, typecheck, unit and diff gates passed |
| Plan 098 execution | approved at `937540a`; xero_missing_since migration applied, 24h absence confirmation lifecycle, bulk-loss guards (>=20%, >5, empty/truncated), returned ID marker clearing, integration suite 22/22, check, typecheck, unit, live database integration and build gates passed |
| Plan 107 execution | approved at `6b66916`; formatLeaveBalance helper with Intl.NumberFormat NZD and unit handling, services restricted to day subtraction only, UI updated across dashboard, profile, approvals and plans, check, typecheck, unit and live database integration gates passed |
| Plan 079 execution | approved at `5cabfe8`; getSubscriptionForStripeCustomer dual lookup, cross-checked customer and organisation bindings in payments webhook, conflict test suite 16/16, billing integration suite 7/7, check, typecheck, unit and live database integration gates passed |
| Plan 099 execution | approved at `c024e58`; clerkAccessService 1-to-1 account linking, guarded bulk invitation dispatch (<=10/batch, <=50/hour), admin authorization and audit logging, people directory review UI, integration suite 4/4, actions suite 11/11, client suite 12/12, check, typecheck, unit, live database integration and build gates passed |
| Plan 100 execution | approved at `6d5c415`; NZ and UK v2 paginated employee readers, regional employee dispatch, case-insensitive active status mapping, sync-xero-people integration suite 22/22, check, typecheck, unit, live database integration and build gates passed |
| Plan 061 execution | approved at `cc2d3fa`; unified feed token and KV resolution (1 token lookup, 1 KV read on cache miss/hit), narrowed feedTokenSelect, horizon-scoped public holiday findMany query omitting jurisdiction relation, check, typecheck, unit, live database integration and build gates passed |
| Plan 077 execution | approved at `9fc4fb6`; validated UUID parameters on POST/PATCH/DELETE availability routes, early 400 rejection without database access, route suite 27/27, check, typecheck, unit and live database integration gates passed |
| Plan 081 execution | approved at `a045ddb`; pure support issue payload builder with dynamic code fences, control character stripping, PII reduction (opaque IDs only), support suite 18/18, payload suite 22/22, check, typecheck, unit and live database integration gates passed |
| Plan 091 execution | approved at `ad8bdcd`; 40-person page scheduled balance sync, compare-and-swap cursor pagination, cycle completion reset, targeted refresh cursor/timestamp isolation, unit suite 16/16, integration suite 55/55, check, typecheck, unit, live database integration and build gates passed |
| Plan 093 execution | approved at `28b559f`; observed nonce-ready report-only CSP with first-party scrubbed report sink (/api/csp-report), proxy nonce composition, layout provider threading, 7-day observation evidence (plans/093-csp-observation.md), check, typecheck, unit, live database integration and build gates passed |
| Plan 088 execution | approved at `0c5f42f`; explicit database package exports map, public query adapters, elimination of all private @repo/database/src/* imports, boundary tests 4/4, check, typecheck, unit, live database integration and build gates passed |
| Plan 094 execution | approved at `f4d6149`; enforced observed nonce Content-Security-Policy on app Edge proxy, preserved Reporting-Endpoints and first-party reporting sink, proxy tests 7/7, check, typecheck, unit, live database integration and build gates passed |
| Plan 095 execution | approved at `ba296bc`; centralised holiday applicability helper in @repo/core (holidayIsNonWorking), unified across feeds, calendar, analytics and working-days duration, core matrix 24/24, check, typecheck, unit, live database integration and build gates passed |
| Plan 082 execution | approved at `dbc0356`; centralised availability record label mapping and helpers in @repo/core (getAvailabilityRecordLabel, getAvailabilityRecordTypeOptions), replaced ad-hoc string formatting across availability, feeds and apps, core suite 74/74, check, typecheck, unit and live database integration gates passed |
| Plan 083 execution | approved at `dd7847b`; shared Redis REST transport in @repo/core (executeRedisCommand, executeRedisPipeline) with credential redaction, notifications env key schema in keys.ts, check, typecheck, unit and live database integration gates passed |
| Current indexed plans | 64: 7 TODO, 41 DONE, 14 REJECTED, 2 BLOCKED |

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
| [101](101-add-currency-leave-balance-contract.md) | Add currency balance schema contract | P1 | migration runner | DONE |
| [030](030-remove-three-avoidable-round-trip-patterns.md) | Remove manager-dashboard query amplification | P2 | none | DONE |
| [056](056-give-the-approval-reconciler-a-cursor.md) | Fair per-record approval reconciliation | P2 | integration database | DONE |
| [059](059-make-the-notification-stream-reliable-and-affordable.md) | Surface SSE failures and reduce idle polling | P2 | none | DONE |
| [060](060-project-explicit-columns-in-the-analytics-services.md) | Exclude audit blobs from analytics queries | P2 | none | DONE |
| [066](066-test-the-untested-money-and-tenancy-paths.md) | Test billing SQL, tenancy and contact logic | P2 | integration database | DONE |
| [087](087-complete-xero-people-sync-regression-tests.md) | Complete Plan 069 test promises | P2 | integration database | DONE |
| [089](089-map-xero-matches-to-a-client-view-model.md) | Map Xero matches to a browser-safe view model | P2 | none | DONE |
| [090](090-bulk-stale-xero-leave-archival.md) | Bulk stale leave archival and feed invalidation | P2 | none | DONE |
| [037](037-spike-nz-and-uk-payroll-write-back.md) | Decide NZ/UK write-back capability from primary sources | P3 | none | DONE |
| [039](039-decide-what-to-do-with-the-html-feed-renderer.md) | Delete the out-of-scope HTML feed prototype | P3 | none | DONE |
| [078](078-delete-dead-feed-token-helpers.md) | Delete unused token service surface | P3 | none | DONE |
| [084](084-remove-the-production-workspaces-override.md) | Remove redundant root `ws` override | P3 | none | DONE |
| [085](085-correct-repository-guidance-and-package-tables.md) | Correct commands and package ownership docs | P3 | none | DONE |
| [086](086-spike-xero-employee-group-team-mapping.md) | Decide EmployeeGroupName team mapping | P3 | none | DONE |
| [098](098-confirm-missing-xero-people-before-archival.md) | Confirm absence before person archival | P1 | 097 | DONE |
| [107](107-present-currency-safe-leave-balances.md) | Present balances with currency-safe formatting | P1 | 101 | DONE |
| [061](061-halve-the-work-on-the-ics-feed-read-path.md) | Resolve feed/cache once and narrow holiday reads | P2 | 057, 066 | DONE |
| [077](077-validate-availability-route-identifiers.md) | Validate availability UUIDs before queries | P2 | 066 | DONE |
| [079](079-cross-check-stripe-webhook-tenant-identity.md) | Cross-check Stripe customer and Clerk org | P1 | 066 | DONE |
| [081](081-minimise-and-delimit-support-issue-data.md) | Minimise/delimit support issue data | P2 | 066 | DONE |
| [091](091-page-scheduled-xero-balance-sync.md) | Page scheduled balance sync across runs | P2 | 076 | DONE |
| [093](093-observe-a-nonce-ready-csp.md) | Observe a privacy-safe nonce CSP | P2 | 057 | DONE |
| [099](099-reconcile-clerk-access-and-invitations.md) | Link active people and guard Clerk invitations | P1 | 097, 098 | DONE |
| [100](100-add-regional-xero-employee-readers.md) | Add NZ/UK employee readers | P1 | 097, 098 | DONE |
| [088](088-publish-explicit-database-package-subpaths.md) | Publish database subpaths, remove `/src/` imports | P2 | 066, 079 | DONE |
| [094](094-enforce-the-observed-csp.md) | Enforce the observed nonce CSP | P2 | 093 plus observation evidence | DONE |
| [095](095-centralise-the-supported-holiday-rule.md) | Centralise the supported holiday rule | P2 | 061 | DONE |
| [082](082-centralise-availability-record-labels.md) | Centralise record labels only | P3 | 060, 061 | DONE |
| [083](083-share-redis-rest-transport-and-notification-keys.md) | Share Redis transport and declare notification keys | P3 | 059, 061 | DONE |
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
| C-07 unbounded balance work | 091 |
| C-08 silent SSE poll failures | 059 DONE |
| C-09 not-found counted as failure | 056 DONE |
| S-01 exact `error` channel not scrubbed | 057 DONE |
| S-02 inert CSP and no HSTS | 092–094 |
| S-03 unvalidated availability identifiers | 077 |
| S-04 dead ungated token helpers | 078 |
| S-05 Stripe metadata as sole tenant key | 079 |
| S-06 proxy/documentation mismatch | dangerous debug handlers removed by 075; guidance in 085 |
| S-07 public feed exposure | 410 retained by design; rate limiting in 080 |
| S-08 support issue data boundary | 081 |
| P-01 analytics audit-blob projection | 060 DONE |
| P-02 SSE polling cost | duplicate provider fixed; residual in 059 DONE |
| P-03 duplicate feed/cache lookup | 061 |
| P-04 unbounded stale archive | 090 DONE |
| P-05 broad holiday reads | 061 |
| A-01 duplicate record labels | 082 |
| A-02 divergent holiday predicates | 095–096 |
| A-03 duplicate Redis REST mechanics | 083 |
| A-04 twin analytics services | 068 rejected; reassess after 060/082/095 |
| T-01 fixture collision | 051 rejected, independently fixed |
| T-02 billing SQL coverage | 066 DONE |
| T-03 Xero tenancy uniqueness coverage | 066 DONE |
| T-04 duplicate API route suites | 066 DONE |
| T-05 alternative-contact service coverage | 066 DONE |
| R-058-01 scheduled provider/database tenant mismatch | 076 DONE |
| R-058-02 bounded sync/product contract mismatch | 091, contract resolved |
| M-01 duplicate `ws` ownership | 084 |
| D-01 stale test command guidance | 085 |
| D-02 missing preflight env examples | 055 DONE |
| DOC-01 package-table drift | 085 |
| R-069-01 missing Plan 069 regression seams | 087 DONE |
| R-031-01 private database `/src/` imports | 088 |
| R-031-02 Prisma model types cross a client boundary | 089 DONE |
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
