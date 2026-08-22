# Plan 073: Orphaned Xero Employee Lifecycle Reconciliation

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 5993283..HEAD -- packages/jobs/src/handlers/sync-xero-people.ts packages/database/prisma/schema.prisma packages/availability/src/people/people-service.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: 069
- **Category**: tech-debt
- **Planned at**: commit `5993283`, 2026-08-22

---

## Why this matters

The inbound people sync is additive and upsert-based. When an employee is completely deleted, merged, or unassigned from a Xero file (rather than marked `TERMINATED`), their corresponding `Person` record remains in Team Calendar indefinitely.

This plan introduces an automated reconciliation check during full sync runs that detects missing Xero employees, applies safety guards against accidental mass-archival (e.g. from partial API failures), and soft-archives orphaned records.

---

## Current state

- `packages/jobs/src/handlers/sync-xero-people.ts` iterates through fetched Xero employees and upserts them. It contains no pass to reconcile against existing `Person` records with `source_system: "XERO"`.
- Plan 003 previously established the safety threshold rule: if an API read is partial or pagination fails, never execute mass archival.

---

## Commands you will need

| Purpose   | Command                                                      | Expected on success |
|-----------|--------------------------------------------------------------|---------------------|
| Check     | `bun run check`                                              | exit 0              |
| Typecheck | `bun run typecheck`                                          | exit 0              |
| Test jobs | `bunx vitest run packages/jobs/src/handlers/sync-xero-people`| all pass            |
| Full test | `bun run test`                                               | all pass            |

---

## Scope

**In scope**:
- `packages/jobs/src/handlers/sync-xero-people.ts`
- `packages/jobs/src/handlers/sync-xero-people.integration.test.ts`
- `packages/database/src/queries/people.ts`

**Out of scope**:
- Manually created people (`source_system: "MANUAL"`) — these must never be archived by Xero reconciliation.
- Availability records reconciliation (handled by leave sync jobs).

---

## Git workflow

- Branch: `advisor/073-orphaned-employee-reconciliation`
- Commit style: Conventional Commits (`feat(jobs): reconcile and archive orphaned xero employees safely`)
- Do NOT push or open a PR unless explicitly instructed.

---

## Steps

### Step 1: Track Synced Employee IDs During Complete Runs

1. In `packages/jobs/src/handlers/sync-xero-people.ts`:
   - Collect all valid `employeeId`s returned during the full paginated Xero read.
   - Guard condition: Only proceed to reconciliation if all API pages were successfully fetched without truncation (`mappedPage.employees.length < XERO_PAGE_SIZE` reached) and no blanket fetch errors occurred.

---

### Step 2: Identify and Soft-Archive Orphaned Records

1. In `packages/jobs/src/handlers/sync-xero-people.ts`:
   - Query existing unarchived Xero people:
     ```typescript
     const existingXeroPeople = await database.person.findMany({
       select: { id: true, source_person_key: true },
       where: {
         ...scoped(context),
         archived_at: null,
         source_system: "XERO",
       },
     });
     ```
   - Identify records whose `source_person_key` is not present in the fetched Xero `employeeId` set.
   - **Safety Threshold Guard**: If the number of missing records exceeds 50% of the total tenant headcount in a single run, do not automatically archive; log a warning in `sync_runs.error_summary` for admin review.
   - For missing records within the safe threshold: Soft-archive them (`archived_at = new Date()`, `is_active = false`, `clerk_user_id = null`).

**Verify**: `bunx vitest run packages/jobs/src/handlers/sync-xero-people.integration.test.ts` → all pass.

---

## Test plan

- Test happy path: an employee removed from Xero payload is soft-archived with `archived_at` set.
- Test safety guard: when >50% of employees are missing (simulated dropped response), mass-archival is aborted and logged.
- Test isolation: manual people (`source_system: "MANUAL"`) are ignored during reconciliation.

**Verification Command**: `bun run test` → all tests pass.

---

## Done criteria

- [ ] `bun run check` exits 0.
- [ ] `bun run typecheck` exits 0.
- [ ] `bun run test` exits 0.
- [ ] Orphaned Xero employees are soft-archived safely without affecting manual team members.
- [ ] Safety threshold prevents catastrophic data loss during API outages.
- [ ] `plans/README.md` status row updated.

---

## STOP conditions

Stop and report back if:
- Orphaned archival attempts to delete or alter historical leave records that have already been published to feeds.
