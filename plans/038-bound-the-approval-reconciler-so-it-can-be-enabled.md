# Plan 038: Bound the approval reconciler so it can be enabled

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report, do not improvise. When done, update this plan's status row in
> `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 75202db..HEAD -- packages/jobs/src/handlers/reconcile-xero-approval-state.ts "apps/app/app/(authenticated)/leave-approvals"`
> If either changed since this plan was written, re-check the "Current state"
> facts before proceeding.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: plan 007 (optimistic concurrency in the reconciler) should
  land first; plan 018 touches the same `data` objects. See "Git workflow".
- **Category**: direction, performance
- **Planned at**: commit `75202db`, 2026-07-25
- **Reconciled**: 2026-08-05 against `2095b1f`. Plan 007 has since landed and
  changed this handler. Two things in the sections below are now partly done and
  three are not; read this note before Step 1.
  - **Already present**: `BATCH_SIZE = 50` at line 53, an in-memory batching
    loop at lines 258-330, a per-batch cancellation check against `syncRun`,
    and a `limit: 100` on the Xero-side call at line 613.
  - **Also new from plan 007**: `transitionRecord` returns a `boolean`,
    `OptimisticConflictError` exists, and each branch of `reconcileRecord`
    returns `transitioned ? "<outcome>" : "matched"`. Preserve that shape.
  - **Still unbounded, and still this plan's job**: the candidate query at
    lines 228-247 is a bare `database.availabilityRecord.findMany` with
    `orderBy: { created_at: "asc" }` and **no `take` and no cursor**. It loads
    every active record with a `source_remote_id` into memory before the
    batching loop ever runs, so the batching bounds concurrency but not the
    working set or the total request volume for a run.
  - **Still true**: `reconciliationEnabled={false}` is hard-coded at
    `apps/app/app/(authenticated)/leave-approvals/page.tsx:151`, and the job is
    still not scheduled.
  Scope your change to the candidate query, resumability and the run-level
  request budget. Do not re-add batching that already exists.

## Why this matters

The Xero approval reconciler is fully built. It has a handler, an Inngest
function, an event name, unit tests, an integration test, an audit trail, a
cancellation check, and a "Sync approval state" button in the leave approvals
UI. It compares each locally tracked leave application against its state in
Xero and corrects drift in four directions (approved, declined, withdrawn,
archived-missing).

It is unreachable. The page hard-codes the flag that enables the button:

```tsx
          reconciliationEnabled={false}
```

**This is deliberate, not an oversight.** A previous spike in this repository
(`plans/005-findings.md`, recorded in commit `3772377`) investigated scheduling
the Xero syncs and stopped at a rate-limit STOP condition. Its conclusion named
this job specifically:

> Prerequisites before scheduling remain: approval reconciliation performs one
> unbounded, sequential request per candidate record, and leave-record sync
> rewrites and republishes every fetched record even when its calculated
> `changed` flag is false.

and

> Do not wire a schedule until the maintainer chooses a revised cadence and
> prerequisite work reduces or bounds request volume.

So the flag is a gate, and the gate is correct while the job is unbounded.

**This plan does not remove the gate. It removes the reason for the gate.** It
bounds the reconciler's Xero request volume so that enabling it becomes a
decision about cadence rather than a decision to exceed a rate limit.

Why it matters that this gets unblocked: without reconciliation, any divergence
between Team Calendar and Xero is permanent. A manager who approves leave
directly in Xero Payroll, or an administrator who deletes a leave application
there, leaves Team Calendar showing a stale state forever, and Team Calendar's
availability feeds are what the rest of the business plans around. The
reconciler is the only mechanism that closes that loop, and it is switched off.

## Current state

### The gate

`apps/app/app/(authenticated)/leave-approvals/page.tsx` line 151:

```tsx
        <LeaveApprovalsClient
          canDispatchReconciliation={role === "admin"}
          filters={{
            includeFailed: parsedFilters?.includeFailed ?? false,
            status: parsedFilters?.status,
          }}
          items={approvalsResult.value}
          organisationId={organisationId}
          reconciliationEnabled={false}
          summary={summaryResult.value}
        />
```

`leave-approvals-client.tsx` lines 222-234 renders the button disabled with an
explanatory tooltip:

```tsx
        {canDispatchReconciliation && (
          <Button
            disabled={isPending || !reconciliationEnabled}
            onClick={syncApprovalState}
            title={
              reconciliationEnabled
                ? "Sync approval state"
                : "Reconciliation is not yet enabled"
            }
```

and the action handles a `queued: false` response, so the server side has its
own gate too (lines 192-206):

```tsx
      if (!result.value.queued) {
        toast.message("Reconciliation is not yet enabled");
        return;
      }
```

That is a well-built two-layer gate. Both layers must be understood before
either is touched.

### The unbounded candidate query

`packages/jobs/src/handlers/reconcile-xero-approval-state.ts` lines 226-245:

```typescript
    const records = await database.availabilityRecord.findMany({
      where: {
        ...scoped(context),
        archived_at: null,
        approval_status: { in: [...ACTIVE_STATUSES] },
        source_remote_id: { not: null },
      },
      include: {
        person: {
          select: {
            clerk_user_id: true,
            first_name: true,
            id: true,
            last_name: true,
            manager: { select: { clerk_user_id: true, id: true } },
          },
        },
      },
      orderBy: { created_at: "asc" },
    });
```

No `take`. No date window. Every non-archived record in an active approval
status with a Xero id is a candidate, including leave that finished three years
ago and will never change again.

### One Xero request per candidate, sequentially

Lines 256-280:

```typescript
    for (let index = 0; index < records.length; index += BATCH_SIZE) {
      const runState = await database.syncRun.findFirst({
        where: { ...scoped(context), id: run.id },
        select: { cancel_requested_at: true },
      });
      if (runState?.cancel_requested_at) {
        ...
      }

      const batch = records.slice(index, index + BATCH_SIZE);
      for (const record of batch) {
        const xeroLeaveApplicationId = record.source_remote_id;
        if (!xeroLeaveApplicationId) {
          continue;
        }
        const status = await fetchLeaveApplicationStatusForRegion(
```

Two things to note. The **cancellation check per batch is good** and must
survive any change. The **batching is cosmetic**: slicing into chunks and then
awaiting each element in order is the same as awaiting each element in order,
so `BATCH_SIZE` currently only controls how often the cancellation check runs.
(The same shape appears in `reconcile-feed-publications`; plan 034 fixes it
there.)

### The budget

`CLAUDE.md` states the Xero rate limits: "60/min per org, 5,000/day per org,
five concurrent per org". One request per candidate record means a single
reconciliation run for a tenant with 4,000 historical leave records consumes
most of the daily budget, and a tenant with more than 5,000 cannot complete a
run at all.

## Design

Bound the candidate set, then make the request loop respect the budget. Do not
touch the gate.

**A. Window the candidates by date.** A leave record whose end date is well in
the past cannot meaningfully change in Xero, and if it does, the change does
not affect any future availability. Reconciling it every run is pure cost.
Introduce a lookback window and a lookahead limit on `ends_at` / `starts_at`.

The window is a product decision with a defensible default. Suggested:
reconcile records whose `ends_at` is within the last 90 days or in the future.
That covers the entire period where a correction still changes what the
calendar publishes, plus a margin for late payroll edits. **State the value as
a named constant with a comment explaining the reasoning**, and flag it in your
report as a number the user may want to change.

**B. Prefer records most likely to have drifted.** After the window, order by
what is most likely to be wrong: `submitted` records (awaiting a decision that
may have been made in Xero) before `approved` ones (already settled). The
existing `orderBy: { created_at: "asc" }` is arbitrary with respect to drift
likelihood.

**C. Cap the request volume per run.** Add an explicit ceiling on how many Xero
requests one run may make, well under the daily budget. When the cap is hit,
finish cleanly, record that the run was partial, and leave the remainder for
the next run. **A partial run must be distinguishable from a complete one** in
the `SyncRun` record and in the returned counts, or nobody can tell a healthy
system from a permanently truncated one.

**D. Make the batching real.** Replace the sliced-then-sequential loop with a
bounded-concurrency batch, respecting the "five concurrent per org" limit. The
rate limiter in `packages/xero` already enforces this
(`packages/xero/src/rate-limit/limiter.ts`), so the change is to stop
serialising unnecessarily rather than to add a new limit.

**Keep the per-batch cancellation check.** It is what makes a long run
abortable.

**Do not enable the flag.** After this plan, enabling reconciliation is a
one-line change plus a cadence decision, and both belong to the user. Say so in
your report and give them the numbers they need: requests per run under the new
bounds, for a small, medium and large tenant.

## Commands you will need

All run from the repo root.

```
bun install                # run first if you hit "Cannot find module '@repo/observability/log'"
bun run check
bun run typecheck
bun run test
bunx vitest run packages/jobs/src/handlers/reconcile-xero-approval-state.test.ts
bun run test:integration   # needs DATABASE_URL
```

## Scope

**In scope:**

- `packages/jobs/src/handlers/reconcile-xero-approval-state.ts`
- `packages/jobs/src/handlers/reconcile-xero-approval-state.test.ts`
- `packages/jobs/src/handlers/reconcile-xero-approval-state.integration.test.ts`
  if its fixtures need adjusting for the new window

**Explicitly out of scope:**

- **`reconciliationEnabled={false}`. Do not change it.** The gate is the user's
  decision and this plan exists to make that decision safe, not to make it.
- The server-side `queued: false` gate in the dispatch action. Same reason.
- Any Inngest cron trigger. The prior spike's conclusion stands: cadence is a
  maintainer decision.
- `packages/xero/src/rate-limit/`. The limiter is correct; this plan stops
  making unnecessary requests rather than changing how requests are limited.
- The four transition branches' `data` objects. Plan 018 owns those.
- The `updateMany` `where` clauses. Plan 007 owns those.
- `sync-xero-leave-records`'s republish-on-unchanged behaviour, the other
  prerequisite the prior spike named. That deserves its own plan.

## Git workflow

```
git checkout -b perf/bound-the-approval-reconciler
```

Suggested commits:

```
perf(jobs): window approval reconciliation candidates by date
perf(jobs): cap Xero requests per reconciliation run
perf(jobs): reconcile candidates with bounded concurrency
```

**Ordering with plans 007 and 018**: all three edit this file. Plan 007 changes
the `updateMany` `where` clauses (structural), plan 018 changes their `data`
(additive), this plan changes the query and the loop above them. Land 007
first, then 018, then this. If that ordering is not possible, land this one
last and rebase; its changes are the furthest from theirs.

Do not push or open a pull request unless the user asks.

## Steps

### Step 1: Establish the baseline and read the prior spike

```
bun run check
bun run typecheck
bun run test
bunx vitest run packages/jobs/src/handlers/reconcile-xero-approval-state.test.ts
```

**Expected**: all exit 0. Record the test count.

Then read the prior spike's findings:

```
git show 3772377:plans/005-findings.md
```

It is the reason this plan exists and it contains the request-volume analysis
you are working against. Do not restate its conclusions in your report; build
on them.

Read `reconcile-xero-approval-state.test.ts` in full. It is the regression net
for everything below.

### Step 2: Measure the current candidate set

Establish what the query actually selects today, so the windowing change can be
justified with numbers rather than intuition.

If a database is available, run:

```sql
SELECT
  count(*) FILTER (WHERE ends_at >= now() - interval '90 days') AS within_window,
  count(*) AS total
FROM availability_records
WHERE archived_at IS NULL
  AND source_remote_id IS NOT NULL;
```

adjusting the `approval_status` filter to match `ACTIVE_STATUSES` (read the
constant in the handler).

**Expected**: `within_window` is substantially smaller than `total`. Record
both. That ratio is the plan's justification and belongs in your report.

If no database is available, say so and proceed; the change is sound on its
own terms but you cannot quantify it.

### Step 3: Window the candidate query

Add the constants near the top of the file, with the reasoning in the comment:

```typescript
// How far back to reconcile. A leave record that finished more than this long
// ago cannot change what the calendar publishes, so re-checking it against Xero
// on every run is pure rate-limit cost. The window is generous enough to catch
// late payroll edits. Records outside it keep whatever state they last synced.
const RECONCILE_LOOKBACK_DAYS = 90;

// Ceiling on Xero requests per run. The per-organisation budget is 5,000 a day
// (see the rate limiting section in CLAUDE.md); this leaves ample headroom for
// the scheduled people, leave-record and balance syncs that share it. A run
// that hits the cap finishes cleanly and reports itself as partial rather than
// truncating silently.
const MAX_REQUESTS_PER_RUN = 500;
```

Then bound the query:

```typescript
    const windowStart = new Date(
      Date.now() - RECONCILE_LOOKBACK_DAYS * 24 * 60 * 60 * 1000
    );

    const records = await database.availabilityRecord.findMany({
      where: {
        ...scoped(context),
        archived_at: null,
        approval_status: { in: [...ACTIVE_STATUSES] },
        ends_at: { gte: windowStart },
        source_remote_id: { not: null },
      },
      include: {
        // ... unchanged
      },
      // Submitted records are the ones most likely to have been decided in Xero
      // since the last run, so reconcile them first: if the request cap is hit,
      // the records left over are the least likely to have drifted.
      orderBy: [{ approval_status: "asc" }, { created_at: "asc" }],
      take: MAX_REQUESTS_PER_RUN,
    });
```

**Check the enum ordering before relying on `approval_status: "asc"`.** Prisma
orders a database enum by its declaration order in the schema, not
alphabetically. Read the `availability_approval_status` enum in
`packages/database/prisma/schema.prisma` and confirm `submitted` sorts before
`approved`. **If it does not, do not use enum ordering**: fetch in two queries
(submitted first, then the rest, with the remaining budget) and say so. A
subtly wrong priority order is worse than an explicit two-query approach.

**Verify**:

```
bun run typecheck
bunx vitest run packages/jobs/src/handlers/reconcile-xero-approval-state.test.ts
```

**Expected**: typecheck exits 0. Some tests may fail if their fixtures use
dates outside the window: fix the **fixtures**, not the window, and note which
ones you changed.

### Step 4: Report partial runs honestly

The `take` now truncates silently. Make it visible.

Add a flag to the result and to the `SyncRun` completion:

```typescript
    const partial = records.length === MAX_REQUESTS_PER_RUN;
```

Include it in the returned counts (extend the counts type and every consumer),
and in `completeRun`'s summary. Read how `completeRun` records
`errorSummary` and `status` and follow that shape; a partial run is not a
failure, so **do not set `status: "failed"`**. If there is a `partial_success`
status available (the `emptyResult` signature in this file suggests there is:
`"cancelled" | "failed" | "partial_success" | "succeeded"`), use it.

**This is the most important part of Step 4.** A cap without a signal converts
"the reconciler is slow" into "the reconciler silently ignores half your data",
and nobody would find out.

**Verify**:

```
bun run typecheck
```

### Step 5: Make the batching real

Replace the sliced-then-sequential inner loop with bounded concurrency, keeping
the per-batch cancellation check exactly where it is:

```typescript
    for (let index = 0; index < records.length; index += BATCH_SIZE) {
      const runState = await database.syncRun.findFirst({
        where: { ...scoped(context), id: run.id },
        select: { cancel_requested_at: true },
      });
      if (runState?.cancel_requested_at) {
        // ... unchanged
      }

      const batch = records.slice(index, index + BATCH_SIZE);
      // Real concurrency: BATCH_SIZE was previously only controlling how often
      // the cancellation check ran, because the inner loop awaited each record
      // in turn. Xero allows five concurrent requests per organisation and the
      // limiter in packages/xero enforces that, so this cannot exceed it.
      await Promise.all(batch.map((record) => reconcileOne(context, run.id, record, counts)));
    }
```

Extract the loop body into `reconcileOne` with its existing error handling
**inside** it, so one record's failure cannot abort the batch. `Promise.all`
rejects on the first rejection; a `try`/`catch` moved outside would silently
convert record-level isolation into run-level failure, which contradicts the
repo rule "Record-level inbound failures do not fail the entire sync run".

Set `BATCH_SIZE` to at most 5 if it is currently higher, matching Xero's
concurrency limit. Read its current value first and note any change.

**Verify**:

```
bun run typecheck
bunx vitest run packages/jobs/src/handlers/reconcile-xero-approval-state.test.ts
bun run test:integration
```

**Expected**: all exit 0.

### Step 6: Prove isolation and cancellation survived

Two mutation checks, each run then reverted:

1. Move the `try`/`catch` outside the `Promise.all`. Confirm the
   "one record fails, others still processed" test **fails**. Revert.
2. Delete the cancellation check. Confirm the cancellation test **fails**.
   Revert.

```
git diff packages/jobs/src/handlers/reconcile-xero-approval-state.ts
```

**Confirm the diff shows only your intended changes** after both reverts.

If either test does not exist, write it first (against the pre-change code for
the cancellation one), watch it pass, then proceed.

### Step 7: Produce the numbers the user needs

The deliverable of this plan is not only the code. Add a short section to your
report:

- requests per run, under the new bounds, for a tenant with 50, 500 and 2,000
  people (use the ratio measured in Step 2 if available, and state the
  assumption otherwise);
- the daily cost at candidate cadences (hourly, every four hours, nightly),
  against the 5,000/day per-organisation budget;
- what share of the budget is left for the people, leave-record and balance
  syncs that share it.

That is what turns "enable reconciliation" from a guess into a decision. The
prior spike stopped precisely because these numbers did not work; this section
is how the user checks whether they now do.

### Step 8: Full verification

```
bun run check
bun run typecheck
bun run test
bun run test:integration
git diff --name-only
```

**Expected**: the first four exit 0; the last lists only in-scope files, and
**does not include** `page.tsx`.

## Test plan

| Test | Why |
|---|---|
| Records outside the lookback window are not fetched | Pins the windowing. Use a fixture with a record whose `ends_at` is 200 days ago. |
| Records inside the window, and future-dated records, are fetched | The other half; a window that excludes future leave would be a serious bug. |
| More candidates than `MAX_REQUESTS_PER_RUN` yields exactly that many requests and a partial result | Pins the cap and its signal. |
| A partial run's `SyncRun` is distinguishable from a complete one | The cap is only safe if this holds. |
| One record's Xero request fails, others still processed | Pins record-level isolation under concurrency. Verified by mutation (Step 6). |
| A cancellation request stops the run mid-way | Pins the existing behaviour under the new loop. Verified by mutation (Step 6). |
| Submitted records are reconciled before approved ones | Pins the priority order, which is what makes truncation safe. |

Follow the existing file's conventions: `vi.hoisted` mock handles, `vi.mock`
module factories, builders for fixture records.

## Done criteria

All of the following, verbatim:

1. `bun run check` exits 0.
2. `bun run typecheck` exits 0.
3. `bun run test` exits 0 with at least seven more tests than the Step 1
   baseline.
4. `bun run test:integration` exits 0.
5. `grep -c "take:" packages/jobs/src/handlers/reconcile-xero-approval-state.ts`
   prints `1` or more.
6. `grep -c "RECONCILE_LOOKBACK_DAYS\|MAX_REQUESTS_PER_RUN" packages/jobs/src/handlers/reconcile-xero-approval-state.ts`
   prints `4` or more.
7. `grep -c "reconciliationEnabled" "apps/app/app/(authenticated)/leave-approvals/page.tsx"`
   prints `1`, and the value is still `false`. **The gate must not have moved.**
8. `git diff --name-only` does not list any file under
   `apps/app/app/(authenticated)/leave-approvals/`.
9. Step 6's two mutation checks were run, both tests failed under their
   mutation, and the file is unchanged afterwards.
10. The report contains the Step 7 request-volume table.

## STOP conditions

Stop and report back rather than improvising if any of these occur:

- **The baseline in Step 1 is not green.** Report what fails; change nothing.
- **You are tempted to flip `reconciliationEnabled` to `true`.** Do not. The
  prior spike deliberately gated this pending a cadence decision that is the
  maintainer's to make, and this plan's whole framing is that it removes the
  blocker without making the call. Flipping it would be exactly the kind of
  "while I was in there" change that turns a bounded fix into an incident.
- **The `availability_approval_status` enum does not order `submitted` before
  `approved`.** Use the two-query approach described in Step 3 and say so. Do
  not rely on an ordering you have not verified.
- **Windowing by `ends_at` excludes records the reconciler should still
  check.** Consider open-ended or long-running leave, and records where
  `starts_at` is in the window but `ends_at` is not. Read the data model before
  settling on the predicate; if in doubt, widen the window and say why.
- **A partial run cannot be represented** in the existing `SyncRun` status
  enum. Report what statuses exist. Do not overload `failed`: an operator who
  sees `failed` will investigate an incident that is not happening, and will
  learn to ignore the status.
- **Concurrency causes rate-limit errors in the integration tests.** Lower
  `BATCH_SIZE`, report the value you settled on, and note that the limiter is
  in-process only (the prior spike flagged this: it "is not a reliable
  cross-instance daily-budget enforcement mechanism under serverless fan-out").
- **The Step 2 measurement shows the window excludes almost nothing.** Then
  windowing is not the lever, and the cap is doing all the work. Say so; the
  user should know which mechanism is protecting them.

## Maintenance notes

- **The gate stays until the user moves it.** After this plan, enabling
  reconciliation is: change `reconciliationEnabled` to a real value (an
  organisation setting, an entitlement, or `true`), and decide a cadence. Both
  are product decisions. The engineering blocker the prior spike named is what
  this plan removes.
- **The other prerequisite is still open.** The prior spike named two:
  unbounded reconciliation requests (this plan) and `sync-xero-leave-records`
  rewriting and republishing every fetched record even when `changed` is false.
  The second is untouched and remains a blocker for scheduling that job.
- **A cap without a signal is a silent data-integrity bug.** If the partial-run
  flag is ever dropped in a refactor, the reconciler goes back to quietly
  ignoring whatever falls outside the cap. Treat the flag as load-bearing in
  review.
- **The in-process rate limiter does not enforce a daily budget across
  serverless instances.** The prior spike established this and this plan does
  not change it. `MAX_REQUESTS_PER_RUN` bounds one run, not one day. If
  reconciliation is ever scheduled at a high cadence across many tenants, the
  daily budget needs enforcement that survives instance boundaries, which is a
  separate design problem.
- **The cosmetic-batching shape appears twice.** Here and in
  `reconcile-feed-publications` (plan 034). Both were written as if chunking
  implied concurrency. Worth checking any future `BATCH_SIZE`.
- **Related plans**: 007 (optimistic concurrency on this file's transitions),
  018 (clearing stale write errors in this file's transition branches), 034
  (the same batching and bounding work in the feed publication reconciler), 037
  (NZ and UK support, which would multiply this job's request volume).
