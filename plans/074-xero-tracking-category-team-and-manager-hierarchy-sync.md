# Plan 074: Xero Tracking Category Team & Manager Hierarchy Sync

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 5993283..HEAD -- packages/jobs/src/handlers/sync-xero-people.ts packages/database/prisma/schema.prisma packages/xero/src/au/read.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW
- **Depends on**: 069
- **Category**: direction
- **Planned at**: commit `5993283`, 2026-08-22

---

## Why this matters

Currently, `syncXeroPeople` imports flat employee records. Teams and reporting lines (`manager_person_id`) must be manually configured in Team Calendar for every employee.

In Xero Payroll, organisations group employees by Tracking Categories (e.g. "Department" or "Division") and assign supervisors. Synchronising tracking categories directly into Team Calendar `Team`s and linking reporting managers eliminates manual configuration for multi-team organisations and enables instant role-based approval routing.

---

## Current state

- `schema.prisma` models `Team` and `Person.team_id`, as well as `Person.manager_person_id`.
- `packages/xero/src/au/read.ts` parses raw employee payloads. In Xero AU, `Employee.TrackingCategory[1..2]` contains department/division options.

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
- `packages/xero/src/read/employees.ts` (extract tracking category options from raw payload)
- `packages/jobs/src/handlers/sync-xero-people.ts` (upsert matching `Team` records and bind `team_id`)
- Tests in `packages/jobs` and `packages/xero`.

**Out of scope**:
- Overwriting manual team assignments if an admin explicitly detached a person from a Xero tracking category.

---

## Git workflow

- Branch: `advisor/074-team-manager-hierarchy-sync`
- Commit style: Conventional Commits (`feat(jobs): sync xero tracking categories to teams and map reporting managers`)
- Do NOT push or open a PR unless explicitly instructed.

---

## Steps

### Step 1: Parse Tracking Categories in Employee Mappers

1. In `packages/xero/src/read/employees.ts`:
   - Extend `XeroEmployee` interface with `trackingCategoryName: string | null`.
   - Parse `TrackingCategory1` or `TrackingCategory2` from the raw Xero employee response.

---

### Step 2: Auto-Provision Teams and Bind `team_id`

1. In `packages/jobs/src/handlers/sync-xero-people.ts`:
   - For each unique tracking category option encountered during employee sync:
     - Find or create a `Team` row with that name for the organisation (`where: { organisation_id, name }`).
   - Bind `team_id` on the `Person` record during upsert if `team_id` is currently null (preserving manual overrides).

**Verify**: `bunx vitest run packages/jobs/src/handlers/sync-xero-people.integration.test.ts` → all pass.

---

## Test plan

- Test employee with Tracking Category creates and binds to a corresponding `Team`.
- Test existing manual `team_id` assignments are not overwritten.

**Verification Command**: `bun run test` → all tests pass.

---

## Done criteria

- [ ] `bun run check` exits 0.
- [ ] `bun run typecheck` exits 0.
- [ ] `bun run test` exits 0.
- [ ] Xero employees with tracking categories are automatically assigned to matching Teams in Team Calendar.
- [ ] `plans/README.md` status row updated.

---

## STOP conditions

Stop and report back if:
- Xero organisation uses multiple tracking categories with identical option names across different dimensions.
