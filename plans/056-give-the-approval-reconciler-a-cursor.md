# Plan 056: Give the approval reconciler a cursor so it stops starving records

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the next
> step. If anything in "STOP conditions" occurs, stop and report — do not
> improvise. When done, update this plan's row in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 121da2a..HEAD -- packages/jobs/src/handlers/reconcile-xero-approval-state.ts packages/database/prisma/schema.prisma`
> If any in-scope file changed, compare the "Current state" excerpts against the
> live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none. Requires a reachable `DATABASE_URL` (adds a migration).
- **Category**: bug
- **Planned at**: commit `121da2a`, 2026-08-12
- **Covers findings**: C-05, C-09

## Why this matters

Plan 038 bounded this handler with a `take:` so it could be safely scheduled.
That was the right first step and it worked. But a cap without a cursor means the
run reads **the same first 500 records every time**.

The ordering is deterministic (`approval_status` then `created_at`), and
`approved` and `declined` remain in the active status set, so a record that
reconciles successfully never leaves the candidate pool. For any organisation
with more than 500 active-status records inside the 90-day window — a ~200-person
org reaches that easily — the tail is **permanently** starved. Leave approved or
declined directly in Xero never reconciles back, and records stuck in
`xero_sync_failed` with `failed_action: "withdraw"` never recover, because this
handler is the only path that clears them.

The run also reports `Reconciliation capped at 500 records; rerun to continue`,
which is misleading: rerunning re-reads the identical rows.

Second, smaller defect in the same file: when Xero returns `not_found_error`, the
handler archives the record as the intended resolution *and* counts it as a
failure, forcing the run to `partial_success` and writing a `failed_records` row
for a case needing no operator action.

## Current state

`packages/jobs/src/handlers/reconcile-xero-approval-state.ts:47-52,66-67`:

```ts
const ACTIVE_STATUSES = [
  "submitted",
  "approved",
  "declined",
  "xero_sync_failed",
] as const;
// ...
const MAX_REQUESTS_PER_RUN = 500;
```

`:246-267` — the candidate query, with a cap but no cursor:

```ts
const records = await database.availabilityRecord.findMany({
  include: { person: { select: { /* ... */ } } },
  orderBy: [{ approval_status: "asc" }, { created_at: "asc" }],
  take: MAX_REQUESTS_PER_RUN,
  where: {
    ...scoped(context),
    approval_status: { in: [...ACTIVE_STATUSES] },
    archived_at: null,
    ends_at: { gte: windowStart },
    source_remote_id: { not: null },
  },
});
```

`:318-327` — the misleading summary:

```ts
const finalStatus: "partial_success" | "succeeded" =
  partial || counts.failed > 0 ? "partial_success" : "succeeded";
await completeRun(context, run.id, {
  counts,
  errorSummary: partial
    ? `Reconciliation capped at ${MAX_REQUESTS_PER_RUN} records; rerun to continue`
    : undefined,
  // ...
});
```

`:854-867` — the not-found double count:

```ts
await recordFailure(context, { /* ... */ });
if (status.error.code === "not_found_error") {
  await archiveMissing(context, runId, record, xeroLeaveApplicationId);
  counts.archivedMissing += 1;
}
counts.failed += 1;
return {};
```

Note `counts.failed += 1` is outside the `if`, so the archived-and-resolved case
increments both counters.

**Existing infrastructure to prefer over inventing new state**: the schema
already has an `XeroSyncCursor` model used by the inbound sync handlers. Read it
before adding a column.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Lint | `bun run check` | exit 0 |
| Typecheck | `bun run typecheck` | exit 0 |
| Unit tests | `bun run test` | exit 0, 17/17 tasks |
| Migrate | `bun run migrate` | migration created and applied |
| This handler | `cd packages/jobs && bunx vitest run src/handlers/reconcile-xero-approval-state.test.ts` | all pass |

## Scope

**In scope**:
- `packages/jobs/src/handlers/reconcile-xero-approval-state.ts`
- `packages/jobs/src/handlers/reconcile-xero-approval-state.test.ts`
- `packages/database/prisma/schema.prisma` (one nullable column, if that is the
  chosen mechanism)
- The one generated migration directory under
  `packages/database/prisma/migrations/`

**Out of scope**:
- `packages/jobs/src/handlers/sync-xero-leave-records.ts` — plan 053 owns it.
- The `reconciliationEnabled` gate in
  `apps/app/app/(authenticated)/leave-approvals/page.tsx`. **Do not move it.**
  Plan 038 explicitly required it stay `false`, and enabling reconciliation is a
  product decision, not a side effect of this fix.
- `MAX_REQUESTS_PER_RUN` and `RECONCILE_LOOKBACK_DAYS` values. The budget is
  correct; the problem is which 500 records it spends itself on.
- Any change to `reconcileRecord`'s transition guards. They are already correct.

## Git workflow

- Branch: `advisor/056-reconciler-cursor`
- Conventional commits, e.g. `fix(jobs): reconcile records in least-recently-checked order`
- Do NOT push or open a PR unless the operator instructed it.
- Never hand-edit a generated migration.

## Steps

### Step 1: Add failing tests for both defects

In `reconcile-xero-approval-state.test.ts`:

1. Seed more than `MAX_REQUESTS_PER_RUN` candidate records. Run the handler
   twice. Assert the second run processes a **different** set from the first.
   This fails today — both runs process the same rows.
2. Assert that a `not_found_error` outcome increments `archivedMissing` and does
   **not** increment `failed`, and that the run can still finish `succeeded`.
   This fails today.

**Verify**: `cd packages/jobs && bunx vitest run src/handlers/reconcile-xero-approval-state.test.ts`
→ both new cases fail, for the reasons stated.

### Step 2: Choose and record the progress mechanism

Prefer reusing `XeroSyncCursor` if it can express "last reconciled position" for
this handler without distorting its existing meaning. If it cannot, add a single
nullable column `last_reconciled_at DateTime?` to `availability_records`.

Write a one-paragraph comment at the top of the handler stating which mechanism
was chosen and why, so the next reader does not have to re-derive it.

**Verify**: `bun run migrate` → migration created and applied; `bun run typecheck`
→ exit 0.

### Step 3: Order by progress, and stamp every record the run touches

Order the candidate query by the progress marker ascending, nulls first, so
never-reconciled records go first and the least-recently-checked follow.

Stamp the marker on **every** record the run touches — including `matched`
no-ops. This is the crux: if matched records are not stamped, they stay at the
front of the queue forever and nothing changes.

**Verify**: Step 1 case 1 passes — two consecutive runs process disjoint sets.

### Step 4: Fix the not-found counter and the run summary

Move `counts.failed += 1` into an `else` branch so the archived-and-resolved case
is not counted as a failure. Reconsider the `recordFailure` write for that case:
either downgrade it to an audit event or give it an explicit resolved
classification, so genuine failures stay distinguishable in the
`failed_records` surface.

Replace the `rerun to continue` summary with a real progress figure — how many
were processed and roughly how many remain — now that rerunning genuinely
continues.

**Verify**: Step 1 case 2 passes; `bun run test` → exit 0, 17/17 tasks.

### Step 5: Verify the migration is clean

**Verify**:
```
cd packages/database && bunx prisma migrate diff \
  --from-config-datasource --to-schema prisma/schema.prisma --script
```
→ prints "This is an empty migration", matching the CI drift check.

## Test plan

New cases in `packages/jobs/src/handlers/reconcile-xero-approval-state.test.ts`,
following the existing structure of that file:

- more than `MAX_REQUESTS_PER_RUN` candidates: run 1 and run 2 process disjoint
  record sets
- a matched no-op is stamped, so it does not reappear at the front next run
- a full cycle: enough runs eventually cover every candidate
- `not_found_error` → `archivedMissing` incremented, `failed` not incremented,
  run can be `succeeded`
- a genuine failure still increments `failed` and forces `partial_success`
- an existing optimistic-concurrency case still behaves (regression guard for
  plan 007's work)

Verification: `bun run test` → exit 0, with at least 5 new tests.

## Done criteria

ALL must hold:

- [ ] `bun run check` exits 0
- [ ] `bun run typecheck` exits 0
- [ ] `bun run test` exits 0, 17/17 tasks, with at least 5 new tests
- [ ] `bun run migrate` succeeded and the drift check prints "This is an empty
      migration"
- [ ] `grep -c "rerun to continue" packages/jobs/src/handlers/reconcile-xero-approval-state.ts`
      prints `0`
- [ ] `grep -B2 -A2 "counts.failed += 1" packages/jobs/src/handlers/reconcile-xero-approval-state.ts`
      shows it inside an `else` branch, not unconditional
- [ ] `grep -c "reconciliationEnabled" "apps/app/app/(authenticated)/leave-approvals/page.tsx"`
      prints `1` and its value is still `false`
- [ ] `git status --short` lists no file under
      `apps/app/app/(authenticated)/leave-approvals/`
- [ ] `plans/README.md` row updated

## STOP conditions

Stop and report if:

- No `DATABASE_URL` is reachable. This plan generates a migration and cannot be
  completed or verified without one.
- `XeroSyncCursor` looks like the right home but adapting it would change
  behaviour for the inbound sync handlers that already use it. Report rather
  than overloading it.
- Stamping every touched record materially increases write volume per run beyond
  what the rate-limit budget allows. Report the measured figure.
- You find yourself wanting to flip `reconciliationEnabled` to prove the fix.
  Do not. Prove it with tests.

## Maintenance notes

- The general lesson: a `take:` without an ordering that advances is a cap, not
  pagination. A reviewer seeing `take:` on a recurring job should ask what makes
  the next run pick different rows.
- If `ACTIVE_STATUSES` is ever narrowed so terminal states leave the pool, the
  cursor becomes less critical but should stay — it is what makes the run's cost
  predictable.
- Enabling nightly approval reconciliation remains a separate product decision.
  This plan removes a reason it was unsafe; it does not make the call.
