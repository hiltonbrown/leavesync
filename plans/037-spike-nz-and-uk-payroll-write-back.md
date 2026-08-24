# Plan 037: Decide the NZ and UK Xero Payroll write-back boundary

> **Executor instructions**: This is a read-only spike. Do not change product
> source, schema or external configuration. Write only
> `plans/037-nz-uk-write-back-findings.md` and update `plans/README.md`.
>
> **Drift check**: `git diff --stat ecd49f5..HEAD -- packages/xero/src/adapter packages/xero/src/nz packages/xero/src/uk packages/availability/src/approvals PRODUCT.md`

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none. Rejected Plan 071 is research history and Plans 100–109
  own read-side implementation; reconcile its official evidence rather than
  repeating the read design here.
- **Category**: direction
- **Planned at**: commit `ecd49f5`, 2026-08-24
- **Execution status**: TODO, research only

## Why this matters

AU payroll write-back is implemented while NZ and UK adapters remain
unsupported. Read synchronisation is retained as research in rejected Plan 071
and decomposed into Plans 100–109; this spike is only about create/update/cancel
leave writes, approval-state effects and whether
the product should promise them. Mixing inbound and outbound research previously
made Plan 037 overlap the read-side work and impossible to close cleanly.

## Current state

- `packages/xero/src/adapter/xero-write-adapter.ts` dispatches the canonical
  write contract by payroll region.
- AU has a concrete implementation; NZ/UK paths are stubs or unsupported.
- `packages/availability/src/approvals/approval-service.ts` expects synchronous
  Xero write-back for Xero-sourced leave.
- Plans 100–109 own employees, leave and balance reads. Do not redesign those here.
- UK Payroll API access may require partner permission, so fixture feasibility
  and live-access feasibility must be reported separately.

## Commands you will need

| Purpose | Command | Expected result |
|---|---|---|
| Inventory | `rg -n "payrollRegion|createLeave|updateLeave|cancelLeave|write" packages/xero packages/availability/src/approvals` | all write paths recorded |
| Scope | `git status --short` | only plan files changed |

## Suggested executor toolkit

Use Context7 for current library/API documentation as required by AGENTS.md,
then verify every load-bearing claim against official Xero documentation or
official OpenAPI specifications.

## Scope

**In scope**:

- AU write-adapter contract and canonical approval call sites
- official NZ/UK endpoints, payloads, statuses, idempotency and permissions
- a findings document with a recommended implementation boundary

**Out of scope**:

- source/schema changes
- all inbound read/sync work owned by Plans 100–109
- manager hierarchy or team mapping
- live writes against a customer payroll tenant

## Git workflow

- Branch: `advisor/037-nz-uk-writeback-spike`
- Commit: `docs(plans): decide nz and uk xero write-back`
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Freeze the canonical write contract

Trace submit, approve, decline, withdraw and cancellation paths from
availability into the Xero adapter. Record required request/response fields,
expected `Result` errors and database state transitions.

### Step 2: Research each region from primary sources

For NZ and UK, establish whether create, update, approve/decline and delete or
cancel operations exist; their endpoint paths; required scopes; status model;
concurrency/idempotency controls; and partner-access restrictions. Record links
and access date. Do not infer an endpoint from AU naming.

### Step 3: Produce a decision matrix

For every canonical operation, mark supported, emulatable, unsupported or
unverified. Separate fixture-testable work from work requiring an authorised
live tenant. Identify any canonical contract or schema change.

### Step 4: Write the recommendation

In `plans/037-nz-uk-write-back-findings.md`, choose one: implement both regions;
implement one; keep read-only regional support; or defer pending access. Include
sequenced follow-up slices, tests, STOP conditions and documentation corrections.

## Test plan

No runtime tests. Every external claim must cite an official source; every
internal claim must name a current symbol and path. A second reviewer must be
able to reproduce the matrix.

## Done criteria

- [ ] Inbound work is not duplicated.
- [ ] All canonical write operations have a regional disposition.
- [ ] Access limitations are separated from API capability.
- [ ] Findings make one recommendation and bounded follow-up plan sequence.
- [ ] Only plan files changed; index updated.

## STOP conditions

Stop and record the uncertainty if official docs conflict, partner-only material
cannot be verified, or the canonical approval contract is changing under another
active plan.

## Maintenance notes

Do not promise regional write-back from parity assumptions. Treat each Xero
Payroll region as a distinct API.
