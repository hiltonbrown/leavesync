# Plan 071: Expand New Zealand and United Kingdom Xero Payroll Reads and Sync

> **Executor instructions**: Follow this plan in order. Run every verification
> command and confirm its expected result before moving on. If a STOP condition
> occurs, stop and report it. Do not improvise around API, tenancy, migration,
> or monetary-balance contract failures. When complete, update this plan's row
> in `plans/README.md`, unless a reviewer has said they maintain the index.
>
> **Dispatch gate**: Plan 069 must remain `DONE` and plan 058 must be `DONE`.
> Plan 058 changes the balance handler named below, so re-read its completed
> implementation before starting this plan. Its 40-person cap is provisional as
> of the 2026-08-24 reconciliation; if the operator approves another cap or
> continuation architecture, replace every 40-person assumption in this plan
> before dispatch.
>
> **Drift check (run first)**:
> `git diff --stat 206af7b..HEAD -- PRODUCT.md README.md docs/architecture/xero-people-sync.md packages/database/prisma/schema.prisma packages/database/src/queries/leave-balances.ts packages/database/src/queries/schedulable-xero-tenants.ts packages/xero/src/read packages/xero/src/nz packages/xero/src/uk packages/xero/src/oauth/service.ts packages/jobs/src/handlers/sync-xero-people.ts packages/jobs/src/handlers/sync-xero-leave-records.ts packages/jobs/src/handlers/sync-xero-leave-balances.ts packages/jobs/src/handlers/reconcile-xero-approval-state.ts packages/jobs/src/handlers/schedule-xero-syncs.ts packages/availability/src/people/people-service.ts packages/availability/src/approvals/approval-service.ts apps/app/components/dashboard/balances-card.tsx apps/app/components/people/person-profile-content.tsx apps/app/app/'(authenticated)'/leave-approvals/leave-approvals-client.tsx`
>
> Changes from completed plan 058 are expected. Compare them with the contracts
> and invariants below. Stop if plan 058 did not preserve resumable balance
> paging, tenant scoping, token refresh, or partial-failure reporting, or if any
> other drift invalidates a current-state claim or a named test seam.

## Status

- **Priority**: P1
- **Effort**: XL
- **Risk**: HIGH
- **Depends on**: 058, 069
- **Category**: migration
- **Planned at**: commit `206af7b`, 2026-08-23
- **Execution status**: TODO, reconciled after the product decision to include
  monetary leave balances for jurisdictions where users expect them.

## Decision record

The previous preflight blocker is resolved. Team Calendar will retain and
present monetary leave balances rather than exclude them.

The canonical contract is:

- extend `leave_balance_unit` from `hours | days` to
  `hours | days | currency`;
- add nullable `currency_code` using an uppercase ISO 4217 code;
- require `currency_code` when `balance_unit = currency`, and require it to be
  null for hour/day balances at service and ingestion boundaries;
- map Xero Payroll NZ `typeOfUnits: Dollars` to `currency` with `NZD`;
- preserve the complete Xero object in `source_payload_json` for audit;
- format currency through `Intl.NumberFormat`, never by concatenating a dollar
  sign or assuming all dollar-denominated values are the same currency;
- never subtract a duration in days from a monetary balance;
- keep manual balance editing limited to hours and days in this slice. Currency
  is an externally sourced payroll entitlement, not a manually calculated one.

This is a display and sync model only. Team Calendar continues to read balances
from Xero and never calculates accruals or converts between hours, days, or
money.

## Evidence and API constraints

Official Xero Payroll NZ and UK documentation and OpenAPI specifications were
checked on 2026-08-23. They establish the following constraints:

- both regions use the v2 base path `/payroll.xro/2.0`;
- employees are read from `GET /Employees`;
- leave is employee-scoped at
  `GET /Employees/{EmployeeID}/Leave`, not an organisation-wide
  `/LeaveApplications` endpoint;
- balances are employee-scoped at
  `GET /Employees/{EmployeeID}/LeaveBalances`;
- v2 responses use lower-camel-case fields such as `employees`, `employeeID`,
  `leave`, `leaveID`, `periods`, `leaveBalances`, `balance`, and
  `typeOfUnits`, unlike the AU PascalCase payloads;
- NZ examples include Holiday Pay with `typeOfUnits: Dollars`;
- UK Payroll API access requires Xero partner permission. Fixture coverage can
  prove mapping and orchestration, but not live UK tenant access.

Primary references:

- https://developer.xero.com/documentation/api/payrollnz/employeeleave
- https://developer.xero.com/documentation/api/payrollnz/leavebalances
- https://developer.xero.com/documentation/api/payrolluk/employeeleave
- https://developer.xero.com/documentation/api/payrolluk/employeeleavebalances
- https://developer.xero.com/documentation/api/payrolluk/overview
- https://github.com/XeroAPI/Xero-OpenAPI/blob/master/xero-payroll-nz.yaml
- https://github.com/XeroAPI/Xero-OpenAPI/blob/master/xero-payroll-uk.yaml

## Why this matters

NZ and UK tenant selection is currently rejected and their read adapters are
stubs. As a result, those payroll entities cannot populate people, leave, or
balances. A partial implementation that only imports employees would create a
misleading connection state. This plan delivers a complete read-only vertical
slice, including regional scheduling, bounded employee-scoped reads, balance
storage and presentation, and status reconciliation.

## Current state

- `packages/xero/src/read/dispatch.ts` dispatches AU readers but returns
  not-available failures for NZ and UK employees, leave, and balances.
- `packages/xero/src/nz/read.ts` and `packages/xero/src/uk/read.ts` only expose
  placeholder leave-status readers.
- `packages/xero/src/oauth/service.ts` rejects any selected payroll region other
  than AU.
- `packages/database/src/queries/schedulable-xero-tenants.ts` filters scheduling
  to `payroll_region: "AU"`, so removing handler skips alone would not schedule
  NZ or UK.
- `packages/database/prisma/schema.prisma` restricts
  `leave_balance_unit` to `hours | days`, and `LeaveBalance` has no currency
  code.
- `packages/xero/src/read/leave-balances.ts` restricts `unitType` to
  `days | hours | null`.
- `sync-xero-leave-balances.ts` persists the numeric amount and unit but cannot
  retain a monetary unit or ISO currency.
- the dashboard and person profile concatenate the numeric amount and unit;
  there is no shared currency formatter.
- approval previews subtract a working-day duration from every numeric balance,
  and the client labels the result as days. That operation is invalid for
  currency balances.
- `XeroSyncCursor` already provides one cursor per tenant and entity type. Reuse
  it for regional employee-scoped leave and balance paging rather than adding a
  second cursor model.

## Scope

### In scope

- `packages/database/prisma/schema.prisma`
- one generated Prisma migration under `packages/database/prisma/migrations/`
- Prisma generated output produced by the repository's generation command,
  never hand-edited
- `packages/database/src/queries/leave-balances.ts`
- `packages/database/src/queries/schedulable-xero-tenants.ts` and its test
- `packages/xero/src/read/leave-balances.ts` and its test
- `packages/xero/src/read/leave-application-status.ts` and its test
- a small shared v2 read helper under `packages/xero/src/read/` if it removes
  duplicated lower-camel response validation and employee-scoped orchestration
- `packages/xero/src/nz/read.ts` and `read.test.ts`
- `packages/xero/src/uk/read.ts` and `read.test.ts`
- `packages/xero/src/read/dispatch.ts` and dispatcher tests
- `packages/xero/src/oauth/service.ts` and its test
- people, leave-record, leave-balance, scheduler, and approval-reconciliation
  handlers in `packages/jobs/src/handlers/`, with unit and integration tests
- `packages/availability/src/people/people-service.ts` and its test
- `packages/availability/src/approvals/approval-service.ts` and its test
- a tested shared leave-balance formatter under `apps/app/lib/`
- `apps/app/components/dashboard/balances-card.tsx`
- `apps/app/components/people/person-profile-content.tsx`
- `apps/app/app/(authenticated)/leave-approvals/leave-approvals-client.tsx`
  and its existing test
- `PRODUCT.md`, `README.md`, and
  `docs/architecture/xero-people-sync.md`

### Out of scope

- NZ or UK outbound leave submission, approval, decline, or other payroll
  writes
- UK statutory-leave endpoints beyond the ordinary employee leave and balance
  reads named above
- manual entry or editing of currency balances
- foreign-exchange conversion or balance/accrual calculation
- feed rendering changes
- public marketing claims that UK access is generally available before partner
  permission has been proven in the intended Xero app

## Architecture invariants

- Every query and mutation carries both `clerk_org_id` and `organisation_id`.
- Resolve `XeroTenant` through the Organisation foreign key, never by bare
  `clerk_org_id`.
- Validate every external payload with Zod before mapping it.
- Regional Xero response types remain in `packages/xero`; they do not leak into
  availability, database, feed, or UI packages.
- Record-level validation or employee-specific failures produce scoped failed
  records and `partial_success`; authentication, permission, or rate-limit
  failures fail the run so Inngest can retry.
- Upserts are idempotent and retain `source_payload_json`.
- Stale leave archival for an employee-scoped page is limited to the people
  successfully read in that page. A partial page must never archive another
  person's records.
- A regional cursor advances only after its page is safely persisted. At the
  end of a complete cycle it resets so the next cycle begins from the first
  employee.
- Existing AU payload parsing and behaviour remain unchanged.

## Rate-budget contract

NZ and UK leave and balance reads cost one request per employee. Do not fetch
every employee on every scheduled run.

- Regional leave runs process at most 20 employees every 15 minutes. Ninety-six
  successful scheduled pages form a 1,920-request daily baseline before
  retries.
- Regional balance runs inherit Plan 058's operator-approved cap. Under the
  provisional 40-person hourly draft, 24 successful scheduled pages form a
  960-request daily baseline before retries. Retries, manual or targeted runs,
  initial-connection work, and other Xero traffic are additional, so 960 is not
  a hard maximum. This is not executable until Plan 058 records operator
  approval of its rolling-best-effort contract.
- Keep the existing daily approval reconciliation cap at no more than 500
  status requests.
- Together with employee-page reads, this leaves material headroom below the
  repository's 5,000-request daily per-organisation budget. All calls still go
  through the existing per-organisation concurrency and rate limiter.
- Put the regional page-size constants next to the handlers or regional
  orchestrator and test that a run cannot exceed them.

If plan 058 implements a different balance page size or cursor contract, adapt
to the limits above without creating a second paging system. Stop if doing so
would weaken plan 058's bounded execution, token-refresh, or resume guarantees.

## Implementation steps

### Step 1: Migrate the canonical balance model

1. Update the technical balance schema in `PRODUCT.md` before changing code:
   document `currency` as a valid balance unit and `currency_code` as a nullable
   ISO 4217 field with the service invariant described in the decision record.
2. Add `currency` to the Prisma `leave_balance_unit` enum and add nullable
   `currency_code` (`Char(3)`) to `LeaveBalance`.
3. Generate one migration with the repository's Prisma migration workflow. The
   migration should only add the enum value and nullable column. Existing
   hour/day rows need no data rewrite.
4. Regenerate Prisma output. Do not edit a generated migration or generated
   client by hand.
5. Extend database balance query selections and return contracts to include
   `currency_code` where consumers need it.
6. Add boundary validation so `currency` requires an uppercase three-letter
   code and hour/day units reject a currency code. Do not rely on the nullable
   database column alone to express this cross-field invariant.

**Verify**:

- `bunx prisma validate --schema packages/database/prisma/schema.prisma`
- the generated SQL contains only the intended enum and nullable-column change
- targeted database and service tests cover existing rows plus a `currency` /
  `NZD` row

### Step 2: Extend canonical Xero read contracts

1. Extend `XeroLeaveBalance` with `unitType: "days" | "hours" | "currency" |
   null` and `currencyCode: string | null`.
2. Keep the AU mapper behaviour unchanged and have it explicitly return
   `currencyCode: null`.
3. Extend the leave-status input contract with the Xero employee ID required by
   v2 employee-scoped status reads. Preserve the AU dispatch contract.
4. Define strict Zod schemas for v2 employee, leave, period, balance, and status
   payloads. Prefer a small shared v2 module for shapes genuinely common to NZ
   and UK, while keeping region-specific enumerations and mappings in their
   regional files.
5. Treat unknown or internally inconsistent units as record failures. Do not
   coerce unknown units to hours/days or silently drop monetary values.

**Verify**:

- AU mapper tests still pass unchanged except for the explicit null currency
  field
- contract tests reject malformed IDs, amounts, unit/currency combinations,
  dates, and response envelopes

### Step 3: Implement New Zealand readers

1. Implement paginated employee reads from `GET /Employees` and map active,
   terminated, and archived state through the existing canonical employee
   contract.
2. Implement employee-scoped leave reads from
   `GET /Employees/{EmployeeID}/Leave`. Map lower-camel fields, dates, leave
   type identifiers, periods, and period status into `XeroLeaveRecord`.
3. Map NZ `Approved`, `Completed`, and `Estimated` period states according to
   the existing canonical imported-leave status semantics. Keep the raw object
   for audit and fail explicitly on an unrecognised state.
4. Implement employee-scoped balance reads. Map `Hours` and `Days` to their
   canonical units and `Dollars` to `currency` with `currencyCode: "NZD"`.
5. Implement the employee-scoped single-leave status reader used by approval
   reconciliation.
6. Route every request through the existing token-aware Xero client and rate
   limiter.
7. Add official-shape fixtures covering pagination, empty collections,
   Holiday Pay in dollars, ordinary hour/day balances, date formats, status
   variants, malformed envelopes, 404/validation failures, auth failures, and
   rate limits.

**Verify**: `bunx vitest run packages/xero/src/nz/read.test.ts`

### Step 4: Implement United Kingdom readers

1. Implement the same employee, employee-scoped leave, balance, and single
   leave-status capabilities against the UK v2 schemas.
2. Keep UK-specific response validation and status enumerations separate where
   the official specification differs from NZ.
3. Map UK hour/day balance units with `currencyCode: null`. If an official UK
   payload returns a monetary unit, accept it only when a documented ISO
   currency mapping exists; otherwise produce a scoped failure and stop rollout
   verification rather than guessing.
4. Preserve permission failures distinctly from validation and not-found
   failures so the UI and sync log do not report partner-access denial as an
   empty payroll file.
5. Add the same fixture categories as NZ, including an explicit UK partner
   permission failure.

**Verify**: `bunx vitest run packages/xero/src/uk/read.test.ts`

### Step 5: Wire dispatch, connection, and regional scheduling

1. Replace NZ/UK not-available branches in `read/dispatch.ts` with the regional
   readers for employees, leave, balances, and status.
2. Remove the AU-only rejection in `completeXeroTenantSelection` only after all
   four dispatch paths are wired and tested. Continue enforcing that the Xero
   payroll region matches the Clerk Organisation country contract.
3. Remove regional no-op branches from the three sync handlers.
4. Remove the AU-only scheduler query filter so eligible AU, NZ, and UK tenants
   are considered. Keep all existing active-connection, disconnection, and
   organisation-scoping predicates.
5. Add scheduler tests proving each supported region is included and an
   unsupported, disconnected, or cross-organisation tenant is excluded.
6. Add OAuth tests for valid NZ and UK selection, country mismatch, unsupported
   region, and UK permission failures returned by the first read.

**Verify**:

- `bunx vitest run packages/xero/src/read packages/xero/src/oauth/service.test.ts packages/database/src/queries/schedulable-xero-tenants.test.ts packages/jobs/src/handlers/schedule-xero-syncs.test.ts`
- expected result: all supported-region dispatch, connection, and scheduling
  cases pass without changing AU behaviour

### Step 6: Make employee-scoped jobs bounded and idempotent

1. Reuse the scoped people already persisted by the people sync. Do not call
   `GET /Employees` again inside every leave or balance reader.
2. For NZ/UK leave runs, load the next deterministic page of at most 20 scoped
   people using the regional `leave_records` cursor. Fetch each person's leave,
   isolate record-level failures, and persist successful results idempotently.
3. Archive stale leave only for person IDs whose remote leave collection was
   fetched successfully in that page. Do not run tenant-wide stale archival
   until a complete regional cycle can prove completeness.
4. Advance the cursor only after persistence and scoped archival succeed. Reset
   it after the final page so a later schedule starts a new full cycle.
5. Integrate NZ/UK balances with plan 058's completed paging contract, capped at
   its operator-approved employees per hourly run. Persist `balance`, `balance_unit`,
   `currency_code`, `as_at`, `last_fetched_at`, and `source_payload_json`.
6. Mark a run `partial_success` for employee-specific validation/not-found
   failures and retain the scoped failed-record details. Fail the run for auth,
   partner permission, rate-limit exhaustion, or unsafe cursor/persistence
   failures.
7. Ensure initial connection orchestration cannot describe an empty pre-people
   leave page as the final successful regional import. It may defer the page,
   but the next due run must pick it up deterministically.
8. Add integration coverage for tenant and Organisation isolation, idempotent
   reruns, multi-page resume/reset, token refresh, partial employee failures,
   scoped stale archival, monetary persistence, and the regional-leave plus
   operator-approved balance request caps.

**Verify**:

- `bunx vitest run packages/jobs/src/handlers/sync-xero-people.test.ts packages/jobs/src/handlers/sync-xero-leave-records.test.ts packages/jobs/src/handlers/sync-xero-leave-balances.test.ts`
- `bunx vitest run packages/jobs/src/handlers/sync-xero-people.integration.test.ts packages/jobs/src/handlers/sync-xero-leave-records.integration.test.ts packages/jobs/src/handlers/sync-xero-leave-balances.integration.test.ts`

### Step 7: Reconcile imported approval status safely

1. Select the linked person's `xero_employee_id` in
   `reconcile-xero-approval-state.ts` and pass it to the regional status
   dispatcher with both tenant scopes.
2. Keep AU status lookups unchanged. For NZ/UK, call the employee-scoped reader
   and map the official period/status states to the canonical approval status.
3. Preserve the existing daily cap, retry rules, per-record failure isolation,
   and audit behaviour.
4. Add tests for a successful NZ and UK reconciliation, missing employee ID,
   not found, permission failure, unknown status, and cross-tenant isolation.

**Verify**:

- `bunx vitest run packages/xero/src/read/leave-application-status.test.ts packages/jobs/src/handlers/reconcile-xero-approval-state.test.ts`

### Step 8: Present monetary balances without unit arithmetic

1. Add `currencyCode` to the people balance row and approval balance snapshot
   contracts, query selections, and mapper tests.
2. Add a pure shared formatter under `apps/app/lib/` that accepts amount, unit,
   and currency code. Use `Intl.NumberFormat` for currency and retain clear
   hour/day labels. Test decimal values, zero, negative values if accepted from
   Xero, null units, and `NZD` output without asserting locale-fragile spacing.
3. Use the formatter in the dashboard balance card and person profile. Remove
   the profile's hard-coded `en-AU` numeric formatting for all jurisdictions.
4. In approval preview logic, calculate a remaining balance only when
   `balance_unit === "days"`, because the existing duration is measured in
   working days. For hours and currency, expose the current formatted available
   amount and leave `balanceRemainingAfterApproval` null. Do not convert working
   days to hours or money in this plan.
5. Replace the approval client's hard-coded `days remaining` copy with the
   shared unit-aware representation.
6. Keep the manual balance form and manual-balance service restricted to hours
   and days.
7. Add component/service tests proving `$`-style NZD presentation is driven by
   `currencyCode`, hour/day output is unchanged, and no approval preview ever
   performs `currency - days` arithmetic.

**Verify**:

- `bunx vitest run packages/availability/src/people/people-service.test.ts packages/availability/src/approvals/approval-service.test.ts apps/app/lib/format-leave-balance.test.ts apps/app/app/'(authenticated)'/leave-approvals/leave-approvals-client.test.tsx`

### Step 9: Update technical documentation and run full gates

1. Update `README.md` support wording to state that AU, NZ, and UK read sync is
   supported, while regional write-back remains separate. Do not claim general
   live UK availability unless partner permission has been verified.
2. Update `docs/architecture/xero-people-sync.md` with regional dispatch,
   employee-scoped paging, cursor behaviour, rate-budget limits, monetary
   balance representation, and UK permission handling.
3. Run `bun run fix`, review its diff, and revert only unrelated mechanical
   changes.
4. Run all repository CI gates and the build.
5. Inspect `git diff --check`, the migration SQL, generated changes, and the
   final diff for accidental source leakage, unscoped queries, or unrelated
   edits.
6. Add a review section to `tasks/todo.md` with the commands and results, then
   mark this plan `DONE` in `plans/README.md` only when every applicable item
   below is proven.

**Verify**:

- `bun run check`
- `bun run typecheck`
- `bun run test`
- `bun run test:integration`
- `bun run build`
- `git diff --check`

All commands must exit 0. If an integration gate requires unavailable database
or Xero credentials, report the plan as incomplete with the exact missing
precondition. Fixture-only success is not a substitute for a required CI gate.

## Test matrix

| Area | Required proof |
|---|---|
| AU regression | Existing employee, leave, balance, OAuth, and status tests pass |
| NZ mapping | Lower-camel employees, employee leave, statuses, hour/day and NZD balances |
| UK mapping | Lower-camel employees, employee leave, statuses, balances, partner denial |
| Validation | Malformed envelopes, dates, identifiers, amounts, units, and currency pairs fail explicitly |
| Tenancy | Every query and write is isolated by Clerk Organisation and Organisation |
| Paging | Regional leave and operator-approved balance caps, resume, reset, retry, and no duplicate writes |
| Stale data | Only successfully fetched people can have stale leave archived |
| Partial failure | One bad employee does not erase or fail successful employee records |
| Monetary storage | Decimal value, `currency`, `NZD`, dates, and raw source round-trip |
| Presentation | NZD is locale-formatted; hours/days remain legible; nulls are safe |
| Approval preview | Currency is displayed as available and never reduced by day duration |
| Scheduling | AU, NZ, and UK active tenants are due; unsupported/disconnected tenants are not |

## Done criteria

- [ ] Plan 058 and plan 069 are `DONE`, and drift was reconciled.
- [ ] Prisma migration adds `currency` and nullable `currency_code` without
      rewriting existing balances.
- [ ] Currency-unit invariants are validated at ingestion and service
      boundaries.
- [ ] NZ employees, leave, monetary/hour/day balances, and leave status map from
      official v2-shaped fixtures.
- [ ] UK employees, leave, balances, and leave status map from official
      v2-shaped fixtures, with permission denial preserved.
- [ ] NZ/UK reads are dispatched, connected, and scheduled without weakening AU
      behaviour or country matching.
- [ ] Employee-scoped leave and balance jobs honour cursor, request-cap,
      tenancy, idempotency, partial-failure, and scoped-archive contracts.
- [ ] Dashboard, person profile, and approval preview present monetary balances
      correctly and perform no cross-unit arithmetic.
- [ ] Manual balances remain hours/days only; no accrual or currency conversion
      was introduced.
- [ ] `PRODUCT.md`, `README.md`, and the sync architecture document match the
      implemented contract.
- [ ] `bun run check`, `bun run typecheck`, `bun run test`,
      `bun run test:integration`, `bun run build`, and `git diff --check` pass.
- [ ] `plans/README.md` is updated to `DONE` with date, commit, and verification
      evidence.

## STOP conditions

Stop and report if:

- plan 058 is not complete or its paging contract cannot be extended without
  losing bounded execution, token refresh, resume, or partial-failure safety;
- live schema or response fields disagree with the cited official regional
  specifications;
- Xero returns a monetary balance whose currency cannot be derived from the
  payroll region without guessing;
- a balance unit cannot be represented as hours, days, or currency;
- UK partner permission is unavailable when live UK verification is required;
- OAuth scopes or country matching cannot safely distinguish AU, NZ, and UK;
- employee-scoped stale archival cannot be limited to successfully fetched
  people;
- an implementation would query or mutate by bare `clerk_org_id` without the
  Organisation boundary;
- the migration would require destructive data rewriting;
- any mandatory CI gate fails or cannot run because a required service or
  credential is unavailable.

## Git workflow

- Suggested branch: `advisor/071-nz-uk-payroll-read-sync`
- Use conventional commits split by logical concern, for example database
  contract, regional adapters, sync orchestration, and presentation.
- Do not push or open a pull request unless explicitly instructed.
