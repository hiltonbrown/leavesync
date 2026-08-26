# Plan 097: Harden returned Xero employee import and reactivation

> **Executor instructions**: Fix the current AU/generic import boundary only.
> Do not add regional activation or Clerk mutations.
>
> **Drift check (run first)**:
> `git diff --stat ecd49f5..HEAD -- packages/xero/src/read/employees.ts packages/xero/src/read/employees.test.ts packages/xero/src/read/dispatch.ts packages/xero/src/au/read.ts packages/xero/src/au/read.test.ts packages/xero/index.ts packages/jobs/src/handlers/sync-xero-people.ts packages/jobs/src/handlers/sync-xero-people.integration.test.ts docs/architecture/xero-people-sync.md`
> Stop if Plan 069's additive upsert or stable source-key contract changed.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: `plans/069-fix-xero-people-sync-and-directory-ui.md` DONE
- **Category**: bug
- **Planned at**: commit `ecd49f5`, 2026-08-24
- **Execution status**: DONE, merged as `e5ed63c` (approved at commit `ecd49f5`, no drift)
- **Supersedes**: import half of rejected Plan 072

## Why this matters

One malformed AU employee can reject an otherwise usable page, and the person
upsert does not clear `archived_at` when the same stable EmployeeID returns.
These are current AU/generic defects and do not depend on NZ/UK support.

## Current state

- `packages/xero/src/read/employees.ts:15-48` parses a whole employee page as one
  schema result, so one malformed row can discard valid neighbours.
- `packages/xero/src/au/read.ts:82-101` converts that parse result into a whole-
  fetch failure, and the people job receives only valid employees.
- `packages/jobs/src/handlers/sync-xero-people.ts:281-318` updates existing
  people but does not clear `archived_at`.
- The database identity is Organisation plus Xero source key. Email matching is
  a separate Clerk-access concern and manual same-email people remain separate.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Mapper | `bunx vitest run packages/xero/src/read/employees.test.ts packages/xero/src/au/read.test.ts` | mixed valid/malformed page cases pass |
| Job | `bunx vitest run packages/jobs/src/handlers/sync-xero-people.integration.test.ts` | import/reactivation cases pass on database |
| Gates | `bun run check && bun run typecheck && bun run test && bun run test:integration && bun run build && git diff --check` | every command exits 0 |

## Scope

Modify only drift-check files and plan bookkeeping. Do not add a schema field,
absence reconciliation, Clerk matching/invitations, NZ/UK adapters or scheduler
changes.

## Git workflow

- Base branch: `preview` (`origin/preview`), not `main`. Branch from `preview`, commit there, and land the finished work on `preview` — see `plans/README.md` § Execution policy.
- Work directly in this working tree. No isolated git worktree is used for this repo's plan executions.
- Branch: `fix/097-xero-person-reactivation`
- Commit: `fix(jobs): preserve valid Xero people and reactivate returns`
- Do not push or open a pull request unless instructed.

## Steps

1. Add mapper fixtures containing valid and malformed records in the same page.
   Require record-level failures with valid neighbours preserved and complete
   pagination/accounting retained.
2. Keep EmployeeID plus provider-required names as the import boundary. Email is
   not identity; continue the deterministic no-email fallback.
3. Update existing Xero people by organisation/source key and set
   `archived_at: null` whenever their EmployeeID is returned. Preserve Person ID,
   historical records and manual same-email people.
4. Assert active, inactive and terminated returned employees are represented,
   with `is_active` mapped independently from archival state.
5. On a database-capable runner, execute focused mapper/job tests and every
   repository-required gate.

Change the employee read result to expose `employees`, ordered per-item
`failures`, `rawItemCount`, `seenEmployeeIds` from non-empty raw IDs before
record validation, and `complete`. Pagination termination uses raw page length,
never valid employee count. `fetched` equals raw items; mapping, handler
validation and persistence failures remain distinguishable. Any item failure
makes the run `partial_success` while valid neighbours still upsert. Names are
Team Calendar import requirements, not an asserted provider requirement.

## Step verification

1. Mapper tests fail only for the new mixed-page expectation before the fix.
2. Mapper tests prove EmployeeID/name validation, email fallback, raw-cardinality
   pagination and completion independently.
3. Job integration test proves the existing Person ID is reused and
   `archived_at` becomes null.
4. Job tests cover active/inactive/terminated and manual same-email rows.
5. Mapper, job and full gates commands exit 0.

## Test plan

Use existing employee fixture builders. Add valid-invalid-valid orderings,
missing EmployeeID/name/email, all provider statuses, previously archived
return, same email across manual/Xero people, partial-success counts and both
tenant isolation keys.

## Done criteria

- [ ] One malformed record cannot discard valid page neighbours.
- [ ] Returning employees reuse and unarchive the same Person.
- [ ] Email never suppresses or merges payroll import.
- [ ] Run accounting exposes record-level failures as partial success.
- [ ] All required gates pass.

## STOP conditions

Stop if the adapter cannot distinguish a complete page from a failed page or if
reactivation would require replacing a Person rather than updating it.

## Maintenance notes

Every later regional employee reader must satisfy this same record-level parse
and reactivation contract before activation.
