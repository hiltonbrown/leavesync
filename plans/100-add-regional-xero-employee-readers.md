# Plan 100: Add NZ and UK Xero employee readers

> **Executor instructions**: Execute only after Plans 097 and 098 are DONE.
> Re-stamp this plan's SHA and reconcile expected predecessor drift before
> editing. Do not enable OAuth or scheduling.
>
> **Drift check (run first)**:
> `git diff --stat ecd49f5..HEAD -- packages/xero/src/read/employees.ts packages/xero/src/read/employees.test.ts packages/xero/src/read/dispatch.ts packages/xero/src/read/dispatch.test.ts packages/xero/src/nz/read.ts packages/xero/src/nz/read.test.ts packages/xero/src/uk/read.ts packages/xero/src/uk/read.test.ts packages/jobs/src/handlers/sync-xero-people.ts packages/jobs/src/handlers/sync-xero-people.test.ts packages/jobs/src/handlers/sync-xero-people.integration.test.ts`
> Plans 097/098 changes are expected. Stop if their final employee result or
> missing-person contracts differ from the handoff below.

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: MED
- **Depends on**: `plans/097-harden-returned-xero-employee-import.md` DONE and `plans/098-confirm-missing-xero-people-before-archival.md` DONE
- **Category**: migration
- **Planned at**: commit `ecd49f5`, 2026-08-24; re-stamp after dependencies
- **Execution status**: TODO
- **Supersedes**: employee-reader slice of rejected Plan 071

## Why this matters

The regional modules are status-only stubs and employee dispatch returns
not-available errors for NZ/UK. The people handler also turns those regions into
successful no-ops. A complete employee reader is the first independently
testable regional slice and must preserve the safe import/lifecycle boundary.

## Current state and required handoff

- `packages/xero/src/read/dispatch.ts:45-78` supports employee reads only for AU.
- `packages/xero/src/nz/read.ts` and `packages/xero/src/uk/read.ts` expose only
  placeholder status reads.
- The v2 endpoint is `/payroll.xro/2.0/employees`, with lower-camel envelopes
  and pages of at most 100. See Xero's official
  [NZ overview](https://developer.xero.com/documentation/api/payrollnz/overview),
  [NZ employees](https://developer.xero.com/documentation/api/payrollnz/employees)
  and [UK employees](https://developer.xero.com/documentation/api/payrolluk/employees).
- Consume Plan 097's final result: valid canonical employees, ordered per-item
  failures, raw item count, raw seen non-empty EmployeeIDs and complete flag.
  Raw page cardinality, not valid count, controls pagination. Consume Plan 098's
  rule that seen IDs clear missing markers before record validation.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Xero | `bunx vitest run packages/xero/src/read/employees.test.ts packages/xero/src/read/dispatch.test.ts packages/xero/src/nz/read.test.ts packages/xero/src/uk/read.test.ts` | all AU/NZ/UK reader and dispatch cases pass |
| Job | `bunx vitest run packages/jobs/src/handlers/sync-xero-people.test.ts packages/jobs/src/handlers/sync-xero-people.integration.test.ts` | regional import/lifecycle cases pass |
| Gates | `bun run check && bun run typecheck && bun run test && bun run test:integration && bun run build && git diff --check` | every command exits 0 |

## Scope

Modify only drift-check paths, `packages/xero/index.ts` if a root export is
needed, and plan bookkeeping. Do not change OAuth, schedulable-tenant queries,
leave/balance/status readers, UI, currency schema or public support wording.

## Git workflow

- Branch: `feat/100-regional-employee-readers`
- Commit: `feat(xero): add regional employee readers`
- Do not push or open a pull request unless instructed.

## Steps

### Step 1: Pin regional fixtures and envelopes

Add sanitised NZ/UK v2 fixtures for first/full/final page, empty page, mixed
valid/malformed items, 401/403/429 and malformed envelope. Zod-validate external
data before mapping; no payload type leaves `@repo/xero`.

**Verify**: the Xero command fails only for unimplemented regional cases.

### Step 2: Implement paginated readers

Implement NZ/UK `/employees?page=N` readers with the Plan 097 result contract.
Continue when raw page count is 100 and stop below 100. Do not claim mid-request
cancellation: the current job checks cancellation after the complete read.

**Verify**: NZ/UK page and mixed-row tests pass, including a malformed item on a
full page followed by a later page.

### Step 3: Wire dispatch and the people job

Replace NZ/UK dispatch errors with the new readers and remove only the regional
people success-no-op. Preserve both tenant keys, reactivation, raw seen-ID marker
clearing, partial-success accounting and complete-snapshot absence gating.

**Verify**: Job tests prove valid neighbours import, regional errors are visible,
and an incomplete read performs no absence pass.

### Step 4: Run all gates

Run the commands table and confirm only in-scope files plus plan bookkeeping are
modified.

**Verify**: every command exits 0; `git status --short` matches Scope.

## Test plan

Follow AU reader fixture style. Cover 99/100/101 items, raw-vs-valid cardinality,
lower-camel fields, missing IDs/names/emails, partial rows, complete/incomplete,
typed HTTP errors, returned archived people, missing markers and cross-tenant
integration. AU regressions must remain unchanged.

## Done criteria

- [ ] Three regions satisfy the same complete employee-result contract.
- [ ] Pagination uses raw cardinality and never loses valid neighbours.
- [ ] NZ/UK are no longer successful job no-ops.
- [ ] No activation/support surface changed.
- [ ] Every command in the table passes and the index row is updated.

## STOP conditions

Stop on predecessor mismatch, undocumented envelope/pagination semantics, a
required canonical Person divergence, out-of-scope OAuth/scheduler work, or a
verification that fails twice after one in-scope correction.

## Maintenance notes

If cancellation between provider pages becomes necessary, design one shared
reader cancellation contract for AU/NZ/UK rather than adding regional callbacks.

