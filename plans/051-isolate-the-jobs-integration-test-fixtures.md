# Plan 051: Give every integration test file its own primary keys so the lane is trustworthy

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the next
> step. If anything in "STOP conditions" occurs, stop and report — do not
> improvise. When done, update this plan's row in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 121da2a..HEAD -- packages/jobs/src/handlers`
> If any in-scope file changed, compare the "Current state" excerpts against the
> live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: tests
- **Planned at**: commit `121da2a`, 2026-08-12

## Why this matters

Two `packages/jobs` integration test files create rows with the **same six
primary keys**. Their teardown deletes by `clerk_org_id`, but `organisations`,
`xero_connections` and `xero_tenants` are keyed by `id`, so neither file's
cleanup can reach the other file's rows. Vitest runs test files in parallel by
default, so whichever `organisation.create` lands second fails with a P2002
unique violation in a test that has nothing wrong with it. Against a shared Neon
database it also leaves orphaned rows that no teardown will ever remove.

`bun run test:integration` is the only gate in this repo that is not currently
green and trustworthy. This plan removes the most likely cause. Every other plan
that touches a job handler depends on being able to believe that lane.

## Current state

- `packages/jobs/src/handlers/schedule-xero-syncs.integration.test.ts:36-38`
  declares tenant A:

  ```ts
  organisationId: "50000000-0000-4000-8000-000000000001",
  xeroConnectionId: "50000000-0000-4000-8000-000000000002",
  xeroTenantId: "50000000-0000-4000-8000-000000000003",
  ```

- `packages/jobs/src/handlers/sync-xero-leave-records.integration.test.ts:42-46`
  declares **the identical three UUIDs**, plus `…0004` and `…0005`:

  ```ts
  organisationId: "50000000-0000-4000-8000-000000000001",
  personId:       "50000000-0000-4000-8000-000000000004",
  xeroConnectionId: "50000000-0000-4000-8000-000000000002",
  xeroEmployeeId: "50000000-0000-4000-8000-000000000005",
  xeroTenantId:   "50000000-0000-4000-8000-000000000003",
  ```

  and returns more `50000000-…` ids at `:481` and `:485`.

- Cleanup in both files is scoped to file-local Clerk org ids
  (`org_test_schedule_sync_*` and `org_test_leave_sync_*`), which cannot match
  the other file's rows.

- `packages/jobs` has no `vitest.config.mts`, so Vitest's default parallel file
  pool applies. Confirmed: the only vitest configs in the repo are
  `apps/api`, `apps/app`, `apps/web`, `packages/core`, `packages/database`,
  `packages/feeds` and `tooling`.

**The convention already in use.** Other integration files in this repo pick a
distinct UUID prefix per file: `70000000-*` for leave balances, `a1000000-*` for
the approval reconciler, `73000000-*` for the Xero disconnect test. Follow it.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Lint | `bun run check` | exit 0 |
| Typecheck | `bun run typecheck` | exit 0 |
| Unit tests | `bun run test` | exit 0, 17/17 tasks |
| Integration (needs a live `DATABASE_URL`) | `cd packages/jobs && bunx vitest run --config ../../tooling/vitest.config.mts '**/*.integration.test.ts'` | all pass |

If no `DATABASE_URL` is reachable, the integration files `describe.skip`
themselves. That is not proof of success — see STOP conditions.

## Scope

**In scope**:
- `packages/jobs/src/handlers/schedule-xero-syncs.integration.test.ts`
- `packages/jobs/src/handlers/sync-xero-leave-records.integration.test.ts`
- `packages/jobs/src/handlers/integration-fixture-prefixes.ts` (create)

**Out of scope**:
- Any production handler under `packages/jobs/src/handlers/*.ts` that is not a
  test file. This plan changes test fixtures only.
- The other integration files (`sync-xero-leave-balances`,
  `reconcile-xero-approval-state`, `sync-xero-people`). They already use
  distinct prefixes; only register them in the new prefix module.
- `vitest` concurrency configuration. Do not disable `fileParallelism` — that
  hides the collision rather than fixing it.

## Git workflow

- Branch: `advisor/051-isolate-jobs-integration-fixtures`
- Conventional commits, e.g. `test(jobs): give each integration file its own key prefix`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Record the prefix allocation

Create `packages/jobs/src/handlers/integration-fixture-prefixes.ts` exporting a
documented map of file to UUID prefix, so a future file cannot silently collide:

```ts
/**
 * Every integration test file in this package owns a distinct UUID prefix.
 * Rows are keyed by `id`, and teardown is scoped by `clerk_org_id`, so two
 * files sharing a prefix cannot clean up after each other.
 * Claim a new prefix here before writing a new integration test file.
 */
export const INTEGRATION_FIXTURE_PREFIXES = {
  reconcileApprovalState: "a1000000",
  scheduleXeroSyncs: "51000000",
  syncXeroLeaveBalances: "70000000",
  syncXeroLeaveRecords: "50000000",
  xeroDisconnect: "73000000",
} as const;
```

**Verify**: `bun run typecheck` → exit 0.

### Step 2: Renumber `schedule-xero-syncs.integration.test.ts`

Replace every `50000000-` literal in that file with `51000000-`. Keep the
trailing segments unchanged so the fixtures stay readable. Leave
`sync-xero-leave-records.integration.test.ts` on `50000000-`, since it owns more
ids and changing it is the larger diff.

**Verify**:
`grep -c "50000000-" packages/jobs/src/handlers/schedule-xero-syncs.integration.test.ts`
→ `0`.

### Step 3: Add id-scoped teardown alongside the org-scoped teardown

In **both** files, extend the existing cleanup so it also deletes by the exact
ids the file created, in foreign-key-safe order (children before parents:
availability records and people before organisations; xero tenants before xero
connections before organisations). Keep the existing `clerk_org_id` deletes —
this is belt and braces, not a replacement.

**Verify**: `bun run check` → exit 0.

### Step 4: Prove the two files no longer collide

Run the two files together, in parallel, against a live database twice in a row.
The second run is the one that matters: it proves teardown actually removed
everything.

**Verify**:
`cd packages/jobs && bunx vitest run --config ../../tooling/vitest.config.mts 'src/handlers/schedule-xero-syncs.integration.test.ts' 'src/handlers/sync-xero-leave-records.integration.test.ts'`
→ all pass, run twice consecutively with no P2002 error.

## Test plan

No new test cases. This plan fixes existing tests' isolation. The verification
*is* the test: two consecutive parallel runs of both files against a live
database must pass, where today the second file to insert fails P2002.

If you want a regression guard, add one assertion to each file's teardown
confirming its own organisation row is gone after cleanup.

## Done criteria

ALL must hold:

- [ ] `bun run check` exits 0
- [ ] `bun run typecheck` exits 0
- [ ] `bun run test` exits 0, 17/17 tasks
- [ ] `grep -c "50000000-" packages/jobs/src/handlers/schedule-xero-syncs.integration.test.ts` prints `0`
- [ ] The two integration files run together twice consecutively against a live
      `DATABASE_URL` with no P2002 and no leftover rows
- [ ] `packages/jobs/src/handlers/integration-fixture-prefixes.ts` exists and
      lists all five files
- [ ] `git status --short` lists only the three in-scope files
- [ ] `plans/README.md` row updated

## STOP conditions

Stop and report if:

- No `DATABASE_URL` is reachable. Do **not** mark this plan done on a skipped
  suite — `describe.skip` produces a green run that proves nothing, which is the
  exact failure mode this plan exists to remove. Report that the change is
  written but unverified.
- The two files still collide after renumbering, which would mean a third file
  or a seed script also claims the `50000000-` or `51000000-` space.
- Fixing teardown appears to require changing a production handler.

## Maintenance notes

- Any new integration test file in `packages/jobs` must claim a prefix in
  `integration-fixture-prefixes.ts` first. A reviewer should reject a new
  integration file that hard-codes a UUID prefix not listed there.
- The same collision class may exist in `packages/database` and `packages/xero`.
  This plan deliberately does not audit them; if the lane is still flaky after
  this lands, that is where to look next.
- Deliberately deferred: making the eight files that `describe.skip` without a
  `DATABASE_URL` fail loudly instead. That is a separate decision about how the
  integration lane should behave in a database-less environment.
