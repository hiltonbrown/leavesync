# Plan 030: Remove manager-dashboard query amplification

> **Executor instructions**: Follow this plan step by step. Preserve the exact
> manager visibility, status-bucket and attention-list behaviour. Do not expand
> this plan into auth-context caching or holiday-import batching.
>
> **Drift check (run first)**:
> `git diff --stat ecd49f5..HEAD -- packages/availability/src/dashboard/dashboard-service.ts packages/availability/src/people/people-service.ts packages/availability/src/people/current-status.ts packages/availability/src/settings/manager-scope.ts`
> Reconcile any drift with the evidence below before editing.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: performance, availability
- **Planned at**: commit `ecd49f5`, 2026-08-24
- **Execution status**: TODO

## Why this matters

`getManagerView` already resolves the complete visible-person scope, then calls
`listAllPeople`, which pages through the same population. Every page resolves
manager scope again and repeats failure aggregation and current-status queries.
Managers with more than 200 visible people therefore pay the same hierarchy and
status-query costs once per page. This is deterministic amplification, not a
hypothesis that requires production traces.

## Current state

- `dashboard-service.ts:430-434` computes `scopePersonIds`.
- `dashboard-service.ts:448-453` separately calls `listAllPeople`.
- `dashboard-service.ts:1078-1105` pages the full manager-visible population.
- `people-service.ts:258-310` resolves scope, counts/group failures and computes
  statuses on every page.
- `manager-scope.ts:12-25` reads settings and active people on every scope
  resolution.
- `current-status.ts:134` exports `computeCurrentStatusForPeople`, which already
  provides the batch boundary this plan needs.
- `dashboard-service.ts:1144-1163` derives the attention list, so replacing the
  loop must preserve more than aggregate counts.

Auth-context memoisation remains unmeasured. Holiday import pre-reads are a
small, independent optimisation. Both are explicitly deferred.

## Scope

**In scope**:

- a dashboard-specific query for the minimal person projection: `id`,
  `first_name`, `last_name`, and `location_id`;
- tenant isolation by both `clerk_org_id` and `organisation_id`, plus the
  already-resolved `scopePersonIds`;
- one grouped Xero-failure read and one batch current-status calculation;
- exact preservation of team-today cards, counts and attention ordering;
- focused query-count and characterisation tests.

**Out of scope**:

- changes to the public `listPeople`/`listAllPeople` contract;
- auth or organisation-context memoisation;
- holiday-import batching;
- schema changes, UI redesign or new dashboard fields.

**Writable files**:

- `packages/availability/src/dashboard/dashboard-service.ts`
- `packages/availability/src/dashboard/dashboard-service.test.ts`
- `plans/README.md` for completed status evidence

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Focused | `bunx vitest run packages/availability/src/dashboard/dashboard-service.test.ts` | characterisation and query-count cases pass |
| Gates | `bun run check && bun run typecheck && bun run test && bun run test:integration && bun run build && git diff --check` | every command exits 0 |

## Git workflow

- Branch: `perf/030-manager-dashboard-query-amplification`
- Commit: `perf(availability): batch manager dashboard people queries`
- Do not push or open a pull request unless instructed.

## Steps

### Step 0: Confirm the execution lane before editing

Run `test -n "${DATABASE_URL:-}"` without printing the value, then run the default build
as a baseline. If either is unavailable, stop before editing and move execution
to a suitable runner; keep this plan TODO.

**Verify**: `test -n "${DATABASE_URL:-}" && bun run build` exits 0.

### Step 1: Characterise the existing result

Add fixtures covering direct reports, transitive reports, more than 200 visible
people, every current-status bucket, Xero failures and attention ordering.
Assert the complete existing manager-dashboard result before changing queries.

**Verify**: run the focused command; all pre-change characterisation cases pass.

### Step 2: Add the minimal scoped person read

Within the dashboard service, load the four required person fields in one query
filtered by `clerk_org_id`, `organisation_id`, active state and
`id in scopePersonIds`. Preserve the existing stable ordering. Do not call
`listAllPeople` or resolve manager scope again.

**Verify**: focused tests prove direct/transitive scope and 200/201-person output.

### Step 3: Batch derived state

Group Xero failures once for the scoped IDs and call
`computeCurrentStatusForPeople` once. Map those results into the existing input
shape for team-today and attention builders. Do not duplicate status rules in
the dashboard service.

**Verify**: focused status/failure/attention cases pass.

### Step 4: Prove bounded query behaviour

Instrument repository mocks or the existing query harness. Assert one scope
resolution and a constant query count for 1, 200 and 201 visible people. The
test must fail against the old paging implementation.

**Verify**: focused tests prove one scope resolution and the same query count at
1, 200 and 201 people; temporarily restoring the loop fails that assertion.

### Step 5: Run repository gates

Run the focused dashboard tests, `bun run check`, `bun run typecheck`,
`bun run test`, `bun run test:integration` and `bun run build`.

**Verify**: the focused and full gates commands exit 0.

## Test plan

Extend `dashboard-service.test.ts` using its existing mocks and fixtures. Add
direct/transitive scope, 201-person boundary, every status bucket, grouped Xero
failure, attention ordering and query-count assertions. No snapshot-only proof.

## Done criteria

- [ ] Dashboard output is unchanged for every characterisation fixture.
- [ ] The dashboard reuses the already-resolved `scopePersonIds`.
- [ ] Both tenant keys constrain every new data read.
- [ ] Query count is constant across the pagination boundary.
- [ ] All focused and repository-required gates pass.
- [ ] `plans/README.md` records DONE with commit and gate evidence.

## STOP conditions

Stop if preserving output requires changing the public people-list contract,
manager visibility cannot be constrained by both tenant keys, or query-count
proof cannot distinguish the old and new implementations.

## Maintenance notes

Profile auth-context resolution and holiday-import batching independently if
telemetry later shows either crosses an agreed performance threshold.
