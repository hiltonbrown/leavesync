# Plan 098: Confirm missing Xero people before archival

> **Executor instructions**: Absence is inferred only from a complete snapshot.
> Apply every guard to the whole candidate set; never archive a safe-looking
> subset when a guard fires.
>
> **Drift check (run first)**:
> `git diff --stat ecd49f5..HEAD -- packages/database/prisma/schema.prisma packages/database/prisma/migrations packages/database/generated packages/jobs/src/handlers/sync-xero-people.ts packages/jobs/src/handlers/sync-xero-people.integration.test.ts docs/architecture/xero-people-sync.md`
> Plan 097 changes are expected. Stop if returned IDs are not available before
> record-level validation or complete pagination cannot be proven.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: `plans/097-harden-returned-xero-employee-import.md` DONE
- **Category**: migration
- **Planned at**: commit `ecd49f5`, 2026-08-24; re-stamp after Plan 097
- **Execution status**: TODO
- **Supersedes**: rejected Plan 073

## Resolved safety contract

This conservative default was adopted in response to the operator's 2026-08-24
instruction to reconcile the blocked plans to an executable backlog. Any less
conservative threshold requires a separately recorded approval.

- Add nullable `xero_missing_since` to Person.
- A first complete missing observation marks but archives nobody.
- Archive only after at least 24 continuous hours of absence.
- Block the entire absence pass when the snapshot is empty, missing ratio is
  `>= 20%`, or missing count is `> 5`. Exactly 20% is blocked.
- Guarded runs are `partial_success` with counts for manual review; never cap or
  partially archive the candidate set.
- Any returned non-empty EmployeeID from Plan 097's raw `seenEmployeeIds` clears
  its marker before record validation.

## Why this matters

Missing payroll employees otherwise remain indefinitely, but a transient empty
or truncated provider result can resemble mass deletion. One-pass archival is
too destructive, especially for small organisations. Persistent confirmation
and inclusive loss guards favour delayed cleanup over false access removal.

## Current state

`Person` at `schema.prisma:362-389` has no missing-observation state. The people
handler upserts returned records but performs no authoritative absence pass.
Stable source keys and both tenant identifiers already support safe matching.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Migration | `bun run migrate` | one generated migration applies |
| Generate | `bunx prisma generate` | generated client exits 0 |
| Migration | `bunx prisma migrate status` | new migration recognised; no unexpected pending drift |
| Focused | `bunx vitest run packages/jobs/src/handlers/sync-xero-people.integration.test.ts` | lifecycle matrix passes |
| Gates | `bun run check && bun run typecheck && bun run test && bun run test:integration && bun run build && git diff --check` | every command exits 0 |

## Scope

Modify only the drift-check paths, generated Prisma client output and plan
bookkeeping. Do not delete Person/history, change Clerk membership, create a
manual-review UI, or alter regional adapters.

## Git workflow

- Base branch: `preview` (`origin/preview`), not `main`. Branch from `preview`, commit there, and land the finished work on `preview` — see `plans/README.md` § Execution policy.
- Work directly in this working tree. No isolated git worktree is used for this repo's plan executions.
- Branch: `fix/098-confirm-xero-person-absence`
- Commit: `fix(jobs): confirm missing Xero people before archival`
- Do not push or open a pull request unless instructed.

## Steps

1. Add the nullable timestamp, run `bun run migrate` to generate/apply one
   migration, and regenerate the client. Never hand-edit the generated
   migration. Document the complete-snapshot lifecycle in the architecture guide.
2. After a successful complete employee read and post-batch cancellation check,
   calculate candidates using both tenant keys and stable Xero keys. Manual
   people are always excluded.
3. Clear markers for every returned non-empty EmployeeID before record-level
   validation. For absent people, apply the whole-run guards, mark first
   observations, and archive only markers at least 24 hours old.
4. Preserve Person ID, source keys and history. On archive clear only active or
   login state required by the existing lifecycle contract.
5. Test empty/truncated/failed/cancelled reads, exactly 20%, more than five,
   one-of-two, first/second observation, return before and after archival,
   malformed-but-present records, manual people and tenant isolation.
6. Run migration status, focused tests and every repository-required gate on a
   database-capable runner.

The denominator is the pre-mutation count of unarchived, keyed Xero people in
the same Clerk org and Organisation. A zero denominator is a no-op. The missing
numerator includes previously marked but still unarchived people. A fired guard
blocks all new marking and archival, but returned-ID marker clearing still
commits safely. When no guard fires, mature candidates may archive while newly
missing candidates are marked; “all-or-nothing” describes the guard decision,
not equal treatment across ages.

Use one transaction/database `now()` value for age comparison. Archive sets
`archived_at = now`, `is_active = false`, and retains `clerk_user_id`, source
keys and history. Reactivation from Plan 097 must clear both `archived_at` and
`xero_missing_since`. Keep existing `SyncRun` fields: a guarded run is
`partial_success` with a fixed non-sensitive `error_summary`. Emit allowlisted
numeric `missing`, `newlyMarked`, `archived` and `guardBlocked` values through
the structured logger only; do not add another schema field in this plan.

## Step verification

1. Generate and migration-status commands pass; schema exposes nullable
   `xero_missing_since`.
2. Focused tests prove failed/partial/cancelled snapshots perform no marker or
   archive write.
3. Focused tests prove returned IDs clear first, guards are inclusive, and 24
   hours is measured by the database-backed timestamp contract.
4. Tests prove source keys/history remain and reactivation reuses identity.
5. The complete lifecycle matrix passes, including one-of-two and exactly 20%.
6. Migration, focused and full gates commands exit 0.

## Test plan

Extend the existing people integration suite with a controllable clock and
tenant factories. Assert first observation, 23:59, 24:00, return, reappearance
after archival, empty/truncated/failed/cancelled, exactly/below 20%, five/six,
malformed-but-present, manual rows and cross-tenant isolation.

## Done criteria

- [x] No person is archived on one missing observation.
- [x] Bulk-loss guards are inclusive and all-or-nothing.
- [x] Returned IDs clear markers before validation.
- [x] Reactivation preserves identity and history.
- [x] Migration, integration and all repository gates pass.

## STOP conditions

Stop if the reader cannot prove complete pagination, the database clock cannot
be used consistently, or archival can run after a cancelled/partial fetch.

## Maintenance notes

Threshold changes are product/security decisions. Do not lower them to make a
test or one customer import pass; expose manual review separately if needed.
