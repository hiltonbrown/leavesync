# Plan 076: Route scheduled syncs by the database Xero tenant ID

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report. Do not improvise. When done, update this plan's row in
> `plans/README.md`, unless a reviewer has said they maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat 1c0d0d2..HEAD -- packages/database/src/queries/schedulable-xero-tenants.ts packages/database/src/queries/schedulable-xero-tenants.test.ts packages/jobs/src/handlers/schedule-xero-syncs.ts packages/jobs/src/handlers/schedule-xero-syncs.test.ts packages/jobs/src/handlers/schedule-xero-syncs.integration.test.ts`
> If any path changed, compare the live code with "Current state" and stop on a
> contract mismatch.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: —
- **Category**: bug, tests
- **Planned at**: commit `1c0d0d2`, 2026-08-24
- **Covers finding**: R-058-01
- **Review status**: TODO. Execution requires a reachable `DATABASE_URL` and a
  runner on which the repository's default Turbopack build can bind its loader
  loopback port.

## Why this matters

`XeroTenant.id` is Team Calendar's database UUID. `XeroTenant.xero_tenant_id`
is Xero's provider identifier. The scheduled-sync query exposes both, but the
scheduler currently puts the provider identifier into an event field that all
four handlers interpret as the database UUID. In production, where the two
values differ, scheduled people, leave-record, balance, and approval
reconciliation runs cannot resolve their tenant.

Plan 058 depends on hourly scheduled events to resume its balance cursor, so
this routing contract must be corrected and database-backed before Plan 058 is
dispatched.

## Current state

- `packages/database/prisma/schema.prisma:475-480` defines distinct `id` and
  `xero_tenant_id` columns on `XeroTenant`.
- `packages/database/src/queries/schedulable-xero-tenants.ts:4-18` returns an
  ambiguous `id` plus `xeroTenantId`.
- `packages/database/src/queries/schedulable-xero-tenants.ts:187-199` maps
  `id: item.id` but maps `xeroTenantId: item.xero_tenant_id`.
- `packages/jobs/src/handlers/schedule-xero-syncs.ts:291-307` uses
  `tenant.xeroTenantId` in the event ID and payload.
- Every scheduled handler treats the event field as the database primary key.
  The balance handler exemplar is
  `packages/jobs/src/handlers/sync-xero-leave-balances.ts:600-619`:

```ts
where: {
  ...scoped(context),
  id: context.xeroTenantId,
  organisation_id: context.organisationId,
}
```

- `packages/jobs/src/handlers/schedule-xero-syncs.integration.test.ts:67-76`
  currently seeds `id` and `xero_tenant_id` with the same value, hiding the
  production mismatch.
- The unit fixture already demonstrates that the values can differ, but its
  expectation currently requires the wrong provider value:
  `packages/jobs/src/handlers/schedule-xero-syncs.test.ts:38-52,263-272`.

The repository convention is that event payload `xeroTenantId` means the
database `XeroTenant.id`; provider API calls obtain the provider identifier
from the loaded tenant row. Preserve that convention.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Query unit test | `bunx vitest run packages/database/src/queries/schedulable-xero-tenants.test.ts` | all tests pass |
| Scheduler unit test | `cd packages/jobs && bunx vitest run src/handlers/schedule-xero-syncs.test.ts` | all tests pass |
| Scheduler integration | `cd packages/jobs && bunx vitest run src/handlers/schedule-xero-syncs.integration.test.ts` | database suite runs and passes, not skipped |
| Check | `bun run check` | exit 0 |
| Typecheck | `bun run typecheck` | exit 0 |
| Unit suite | `bun run test` | exit 0 |
| Integration suite | `bun run test:integration` | exit 0 with database suites executed |
| Build | `bun run build` | exit 0 using the default Turbopack configuration |

At `1c0d0d2`, the focused unit baselines are 4 passing query tests and 10
passing scheduler tests, verified on 2026-08-24.

## Scope

**In scope** (the only source/test files to modify):

- `packages/database/src/queries/schedulable-xero-tenants.ts`
- `packages/database/src/queries/schedulable-xero-tenants.test.ts`
- `packages/jobs/src/handlers/schedule-xero-syncs.ts`
- `packages/jobs/src/handlers/schedule-xero-syncs.test.ts`
- `packages/jobs/src/handlers/schedule-xero-syncs.integration.test.ts`

**Bookkeeping only**:

- `plans/README.md` for the final status update after every gate passes

**Out of scope**:

- changing any handler's input schema or tenant lookup;
- changing the provider `xero_tenant_id` stored in the database;
- changing cadence, event names, event-ID slotting, or scheduler pagination;
- Plan 058's balance cursor and stale-archive work;
- schema or migration changes.

## Git workflow

- Suggested branch: `advisor/076-scheduled-tenant-routing`
- Use a conventional commit such as
  `fix(jobs): route scheduled syncs by tenant primary key`.
- Do not push or open a pull request unless explicitly instructed.

## Steps

### Step 0: Prove the verification lane before editing

1. Run the scheduler integration test on the unmodified baseline and confirm
   its database suite executes rather than skips.
2. Run the default `bun run build`. Do not substitute `next build --webpack`:
   the repository gate is the default Turbopack build.

**Verify**: both commands exit 0. If `DATABASE_URL` is unavailable or Turbopack
cannot bind its loader loopback port, stop before source edits and report the
environmental blocker.

### Step 1: Give the database primary key an unambiguous query contract

In `schedulable-xero-tenants.ts`:

1. Replace the ambiguous public `id`/provider `xeroTenantId` pair with one
   explicit `databaseTenantId` field.
2. Map `databaseTenantId` from `XeroTenant.id`.
3. Stop selecting and returning `xero_tenant_id`; the scheduler does not make
   provider calls. The handler loads the row by database ID and then receives
   the provider identifier from that row.
4. Keep query pagination on `XeroTenant.id` exactly as it is.

Update `schedulable-xero-tenants.test.ts` so its fixtures use deliberately
different database and provider identifiers. Assert the returned
`databaseTenantId` is the row's `id`, and assert the select does not request
`xero_tenant_id` or any token field.

**Verify**:

`bunx vitest run packages/database/src/queries/schedulable-xero-tenants.test.ts`
exits 0.

### Step 2: Route every scheduled event by `databaseTenantId`

In `schedule-xero-syncs.ts`, use `tenant.databaseTenantId` for:

- the deterministic scheduled event ID;
- the event payload's `xeroTenantId` field;
- invalid-timezone and dispatch-failure diagnostic `xeroTenantId` fields.

Do not change the external event field name. Its established meaning is the
database tenant UUID.

Update `schedule-xero-syncs.test.ts` so `baseTenant` has a
`databaseTenantId` distinct from any synthetic provider identifier. Assert all
due events, not only `people`, receive the database value and that their event
IDs are keyed by that same value.

**Verify**:

`cd packages/jobs && bunx vitest run src/handlers/schedule-xero-syncs.test.ts`
exits 0.

### Step 3: Remove the integration-test blind spot

In `schedule-xero-syncs.integration.test.ts`:

1. Give each fixture separate `databaseTenantId` and `providerTenantId`
   constants.
2. Seed `XeroTenant.id` from `databaseTenantId` and
   `XeroTenant.xero_tenant_id` from `providerTenantId`.
3. Use a fixed time in each fixture's local 01:00-02:59 reconciliation window
   so the exact emitted run-type set is `people`, `leave_records`,
   `leave_balances`, and `approval_state_reconciliation`. Do not retain the
   current `>= 3` assertion.
4. For every emitted event belonging to the fixture, assert
   `event.data.xeroTenantId === databaseTenantId` and is not the provider value.
5. For every run type, assert the event ID equals
   `getScheduledSyncEventId(databaseTenantId, runType, now)`, so deduplication
   and handler routing use the same identity.

**Verify**:

`cd packages/jobs && bunx vitest run src/handlers/schedule-xero-syncs.integration.test.ts`
exits 0 with the database suite executed, not skipped.

### Step 4: Run all gates and inspect scope

Run, in order:

1. `bun run check`
2. `bun run typecheck`
3. `bun run test`
4. `bun run test:integration`
5. `bun run build`
6. `git diff --check`

Then confirm `git status --short` lists only the five in-scope source/test files
and, after bookkeeping, `plans/README.md`.

## Test plan

| Case | Required proof |
|---|---|
| Query mapping | returned `databaseTenantId` equals `XeroTenant.id` |
| Data minimisation | scheduler query does not select provider or token fields |
| Event payload | people, leave-record, balance, and reconciliation events carry the database ID |
| Event deduplication | deterministic event IDs use the same database ID as the payload |
| Fixture realism | database and provider tenant IDs are different in integration coverage |
| Tenancy | Clerk Org and Organisation IDs remain paired with the database tenant ID |

## Done criteria

- [ ] `SchedulableXeroTenant` exposes an unambiguous database tenant ID and no
      unused provider tenant ID.
- [ ] All scheduled event payloads and event IDs use `XeroTenant.id`.
- [ ] Provider `xero_tenant_id` remains available only after handlers load the
      tenant row; no provider persistence or API contract changes.
- [ ] Unit and database-backed integration tests use distinct identifiers and
      fail if the scheduler routes by the provider value.
- [ ] No handler input, cadence, schema, or migration changed.
- [ ] `bun run check`, `bun run typecheck`, `bun run test`,
      `bun run test:integration`, `bun run build`, and `git diff --check` exit 0.
- [ ] `plans/README.md` records completion with date, commit, and verification
      evidence.

## STOP conditions

Stop and report if:

- any scheduled handler expects the provider `xero_tenant_id` rather than the
  database primary key;
- another scheduler consumer requires the provider identifier from
  `SchedulableXeroTenant`;
- the fix appears to require changing an event schema, cadence, database schema,
  or migration;
- the integration suite skips because `DATABASE_URL` is unavailable;
- the default Turbopack build cannot run on the available host;
- any mandatory gate fails twice after one reasonable correction.

## Maintenance notes

- Keep database identity and provider identity explicitly named at every
  boundary. Event routing uses the database UUID; Xero HTTP headers use the
  provider tenant identifier loaded from that row.
- Integration fixtures for provider-backed entities must use different local
  and remote IDs. Equal values erase exactly this class of contract bug.
- Plan 058 must not start until this plan is merged and its distinct-ID
  integration test passes.
