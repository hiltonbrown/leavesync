# Plan 034: Bound and batch the feed publication reconciler

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report, do not improvise. When done, update this plan's status row in
> `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 75202db..HEAD -- packages/jobs/src/handlers/reconcile-feed-publications.ts packages/feeds/src/publication/publication-service.ts`
> If either changed since this plan was written, re-check the "Current state"
> facts before proceeding.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: performance, correctness
- **Planned at**: commit `75202db`, 2026-07-25

## Why this matters

`reconcileFeedPublications` re-materialises every availability publication for
an organisation. It does three things that stop working as a tenant grows:

1. **It loads every record with no bound.** One `findMany` with no `take`, no
   `archived_at` filter and no date window. An organisation with 50,000
   availability records gets 50,000 rows in memory before any work starts.
2. **Its batching does nothing.** The code slices the records into
   `BATCH_SIZE` chunks and then iterates each chunk with a sequential `await`.
   Slicing a list and then awaiting each element in order is identical to
   awaiting each element in order. There is no concurrency, so `BATCH_SIZE`
   changes nothing but the loop structure.
3. **The whole run is one Inngest step.** Everything happens inside a single
   `step.run("reconcile-feed-publications", ...)`. Inngest checkpoints between
   steps, not within them, so a failure at record 49,999 discards all
   preceding work and retries from the beginning. With enough records the step
   cannot finish inside its execution limit at all, and the job becomes
   permanently unable to complete for exactly the tenants that most need it.

There is also a smaller issue at the end: one `inngest.send` per affected feed,
sequentially, when the API accepts an array.

The consequence is not a wrong result. It is a job that works in development
and on small tenants and silently stops working on large ones, in a way that
looks like an Inngest timeout rather than a design problem.

## Current state

`packages/jobs/src/handlers/reconcile-feed-publications.ts` lines 41-136.

The Inngest wrapper, one step for the whole run:

```typescript
export const reconcileFeedPublicationsFunction: InngestFunction.Any =
  inngest.createFunction(
    {
      id: "reconcile-feed-publications",
      triggers: { event: "reconcile-feed-publications" },
    },
    async ({ event, step }) =>
      await step.run("reconcile-feed-publications", async () =>
        reconcileFeedPublications(event.data)
      )
  );
```

The unbounded query:

```typescript
    const records = await database.availabilityRecord.findMany({
      orderBy: { id: "asc" },
      select: { id: true, person_id: true },
      where: {
        clerk_org_id: context.clerkOrgId,
        organisation_id: context.organisationId,
      },
    });
```

Correctly tenant-scoped and correctly narrow in its `select`. No `take`, and no
filter on `archived_at`.

The batching that is not batching:

```typescript
    for (let index = 0; index < records.length; index += BATCH_SIZE) {
      const batch = records.slice(index, index + BATCH_SIZE);
      for (const record of batch) {
        // Record-level isolation: a single record's failure must not abort the run.
        // Skip cache invalidation per record; we batch one rebuild per affected feed below.
        try {
          const result = await materialiseAvailabilityPublication({
            availabilityRecordId: record.id,
            clerkOrgId: context.clerkOrgId,
            invalidateCache: false,
            organisationId: context.organisationId,
          });
          if (!result.ok) {
            counts.failed += 1;
            log.error("Failed to reconcile availability publication", {
              availabilityRecordId: record.id,
              clerkOrgId: context.clerkOrgId,
              error: result.error.message,
              organisationId: context.organisationId,
            });
            continue;
          }
          if (result.value.changed) {
            counts.changed += 1;
            changedPersonIds.add(record.person_id);
          }
        } catch (error) {
          counts.failed += 1;
          log.error("Unhandled error reconciling availability publication", {
            availabilityRecordId: record.id,
            clerkOrgId: context.clerkOrgId,
            error,
            organisationId: context.organisationId,
          });
        }
      }
    }
```

The per-record error isolation is correct and matches the repo's rule
("Record-level inbound failures do not fail the entire sync run"). Keep it
exactly as it is; concurrency must not weaken it.

The sequential fan-out at the end:

```typescript
    if (changedPersonIds.size > 0) {
      const feedIds = await feedIdsForPeople({
        clerkOrgId: context.clerkOrgId,
        organisationId: context.organisationId,
        personIds: [...changedPersonIds],
      });
      for (const feedId of feedIds) {
        await inngest.send({
          data: {
            clerkOrgId: context.clerkOrgId,
            feedId,
            organisationId: context.organisationId,
            reason: "publication_reconciled",
          },
          name: "rebuild-feed-cache",
        });
      }
      counts.feedsQueued = feedIds.length;
    }
```

## Design

Four changes, in increasing order of risk. **Land them in this order and verify
between each**; the first two are nearly free and the last is the one that can
go wrong.

**A. Send the rebuild events as one array.** `inngest.send` accepts an array.
One call instead of N.

**B. Make the concurrency real.** Replace the sliced-then-sequential loop with
`Promise.all` over each chunk, so `BATCH_SIZE` becomes an actual concurrency
limit. Keep the per-record `try`/`catch` inside the mapped function so one
failure still cannot abort the run: `Promise.all` over already-caught promises
never rejects.

Pick the chunk size conservatively. `materialiseAvailabilityPublication` writes
to the database, so the limit that matters is the connection pool, not CPU.
Read the current `BATCH_SIZE` constant and keep its value unless you have a
reason; the change is that it now means something.

**C. Bound and page the query.** Add a `take` and iterate by cursor, processing
each page as it arrives rather than materialising the whole list. That caps
memory regardless of tenant size. Use the existing `orderBy: { id: "asc" }`,
which is already cursor-friendly.

Also consider whether archived records should be excluded. **Check what
`materialiseAvailabilityPublication` does with an archived record before
adding a filter**: if it archives the publication in turn, excluding them from
the scan would leave stale publications behind. If it skips them, filtering
them out in SQL is strictly better. Read the service and decide with evidence;
if it is not clear, leave the filter out and say so.

**D. Split the Inngest step.** Move from one `step.run` covering everything to
one `step.run` per page, so Inngest checkpoints between pages and a failure
retries only the page that failed.

This is the change with real semantics attached, because Inngest step outputs
are memoised across retries and must be serialisable. The accumulator
(`counts`, `changedPersonIds`) has to be threaded through step boundaries
rather than held in a closure. **If that restructuring turns out to be more
than a contained change, stop after C and report.** A bounded, concurrent
single-step job is already a large improvement over an unbounded sequential
one.

## Commands you will need

All run from the repo root.

```
bun install                # run first if you hit "Cannot find module '@repo/observability/log'"
bun run check
bun run typecheck
bun run test
bunx vitest run packages/jobs/src/handlers/reconcile-feed-publications.test.ts
bun run test:integration   # needs DATABASE_URL
```

## Scope

**In scope:**

- `packages/jobs/src/handlers/reconcile-feed-publications.ts`
- `packages/jobs/src/handlers/reconcile-feed-publications.test.ts`

**Explicitly out of scope:**

- `materialiseAvailabilityPublication` in
  `packages/feeds/src/publication/publication-service.ts`. This plan changes
  how it is called, not what it does.
- `feedIdsForPeople`.
- The `rebuild-feed-cache` handler.
- The per-record error isolation semantics. They are correct and must survive
  unchanged.
- Feed cache invalidation. Plan 014 owns that, including the `invalidateCache:
  false` flag this handler passes.
- Any other job handler. `sync-xero-leave-records` and
  `reconcile-xero-approval-state` have their own plans (003, 007, 018).
- Any database index or migration.

## Git workflow

```
git checkout -b perf/bound-the-feed-publication-reconciler
```

One commit per change, so a bisect can land between them:

```
perf(jobs): send feed rebuild events in one batch
perf(jobs): make the publication reconciler batch concurrently
perf(jobs): page the publication reconciler instead of loading every record
perf(jobs): checkpoint the publication reconciler per page
```

Do not push or open a pull request unless the user asks.

## Steps

### Step 1: Establish the baseline

```
bun run check
bun run typecheck
bun run test
bunx vitest run packages/jobs/src/handlers/reconcile-feed-publications.test.ts
```

**Expected**: all exit 0. Record the test count and read
`reconcile-feed-publications.test.ts` in full: it is the regression net for
everything below, and you need to know what it already asserts before changing
the code it covers.

Note the current `BATCH_SIZE` value.

### Step 2: Change A, batch the event send

Replace the loop:

```typescript
      for (const feedId of feedIds) {
        await inngest.send({
          data: { ... },
          name: "rebuild-feed-cache",
        });
      }
```

with a single call:

```typescript
      // One send with an array rather than one send per feed: the events are
      // independent and the API takes a list.
      await inngest.send(
        feedIds.map((feedId) => ({
          data: {
            clerkOrgId: context.clerkOrgId,
            feedId,
            organisationId: context.organisationId,
            reason: "publication_reconciled",
          },
          name: "rebuild-feed-cache" as const,
        }))
      );
```

**Confirm the array form is supported** by the installed Inngest version before
relying on it:

```
grep -rn "send(" node_modules/inngest/types.d.ts node_modules/inngest/components/Inngest.d.ts 2>/dev/null | head
```

If it is not, skip change A and say so.

**Verify**:

```
bun run typecheck
bunx vitest run packages/jobs/src/handlers/reconcile-feed-publications.test.ts
```

**Expected**: both exit 0. If a test asserted the number of `inngest.send`
calls, it will now fail: update it to assert on the events sent rather than the
call count, and note the change.

### Step 3: Change B, real concurrency

Replace the nested loop with a chunked `Promise.all`, keeping the per-record
`try`/`catch` inside the mapped function:

```typescript
    for (let index = 0; index < records.length; index += BATCH_SIZE) {
      const batch = records.slice(index, index + BATCH_SIZE);
      // Promise.all over already-caught promises: a single record's failure is
      // recorded and the run continues, matching the record-level isolation
      // rule for sync jobs. BATCH_SIZE is now a real concurrency limit rather
      // than a cosmetic slice, and it is bounded by the database connection
      // pool, not by CPU.
      await Promise.all(batch.map((record) => reconcileOne(context, record, counts, changedPersonIds)));
    }
```

Extract the body into a `reconcileOne` helper with the same `try`/`catch` it
has today. **Two correctness notes:**

- `counts` and `changedPersonIds` are mutated from concurrent callbacks. In a
  single-threaded JavaScript runtime that is safe for `+= 1` and `Set.add`
  because neither yields mid-operation, but it is worth a comment saying so,
  because it looks unsafe.
- `Promise.all` rejects on the first rejection. That is why the `try`/`catch`
  must stay **inside** `reconcileOne`, not around the `Promise.all`. If it
  moved out, one record's failure would abort the batch, which is exactly the
  behaviour the existing comment says must not happen.

**Verify**:

```
bun run typecheck
bunx vitest run packages/jobs/src/handlers/reconcile-feed-publications.test.ts
```

**Expected**: both exit 0, with the same counts as before for the same
fixtures.

### Step 4: Test that isolation survived concurrency

Before going further, pin the behaviour change B could have broken. Add a test:

- a fixture of several records where `materialiseAvailabilityPublication` is
  mocked to reject for one of them;
- assert `counts.failed` is 1, `counts.scanned` is the full number, and the
  other records were still processed.

Add a second where the mock returns `{ ok: false, ... }` rather than rejecting,
since the handler treats those differently.

**Verify**:

```
bunx vitest run packages/jobs/src/handlers/reconcile-feed-publications.test.ts
```

**Expected**: passes. Then temporarily move the `try`/`catch` outside the
`Promise.all`, confirm the new test **fails**, and revert. That mutation check
is what proves the test is load-bearing.

```
git diff packages/jobs/src/handlers/reconcile-feed-publications.ts
```

Confirm the revert left only your intended change.

### Step 5: Change C, page the query

Replace the single `findMany` with a cursor loop that processes each page as it
arrives:

```typescript
// Page size for the record scan. The reconciler must not materialise an entire
// organisation's availability records: a large tenant would exhaust memory
// before doing any work.
const PAGE_SIZE = 500;

// Ceiling on pages per run. A cursor that fails to advance would otherwise loop
// forever inside a job with no external timeout of its own.
const MAX_PAGES = 1000;
```

then:

```typescript
    let cursor: string | null = null;
    let pages = 0;

    while (pages < MAX_PAGES) {
      const records = await database.availabilityRecord.findMany({
        orderBy: { id: "asc" },
        select: { id: true, person_id: true },
        skip: cursor ? 1 : 0,
        cursor: cursor ? { id: cursor } : undefined,
        take: PAGE_SIZE,
        where: {
          clerk_org_id: context.clerkOrgId,
          organisation_id: context.organisationId,
        },
      });
      if (records.length === 0) {
        break;
      }
      counts.scanned += records.length;
      // ... the chunked Promise.all from Step 3, over this page
      cursor = records.at(-1)?.id ?? null;
      pages += 1;
      if (records.length < PAGE_SIZE) {
        break;
      }
    }
```

Note `counts.scanned` moves from `records.length` (set once) to an accumulator.
Check every other use of `counts` for the same problem.

**On `MAX_PAGES`**: if the ceiling is hit, the run has processed 500,000
records and something is wrong. Log an error naming the organisation and return
the counts rather than silently truncating; a caller that cannot tell a
complete run from a truncated one will draw the wrong conclusion. Consider
adding a `truncated: boolean` to `ReconcileCounts`; if you do, update the type
and every consumer.

**On the archived filter**: read
`packages/feeds/src/publication/publication-service.ts` and determine what
`materialiseAvailabilityPublication` does with an archived record. Add
`archived_at: null` to the `where` **only** if it skips them. If it archives
the publication in response, filtering them out would strand stale
publications; leave the filter off and say so in your report.

**Verify**:

```
bun run typecheck
bunx vitest run packages/jobs/src/handlers/reconcile-feed-publications.test.ts
bun run test
```

**Expected**: all exit 0. Add a test with more records than `PAGE_SIZE` to
prove the paging works and that `counts.scanned` still equals the total.

### Step 6: Change D, checkpoint per page

Restructure the Inngest wrapper so each page is its own `step.run`.

Read the Inngest documentation for the installed version before attempting
this. The constraints that matter:

- step outputs are memoised and must be JSON-serialisable, so a `Set` cannot
  cross a step boundary (convert to an array);
- steps must be invoked in a deterministic order with stable ids, so the step
  id needs the page number in it;
- work inside a step must be idempotent, because a step can re-run.

`materialiseAvailabilityPublication` is idempotent by design (it materialises a
projection), so re-running a page is safe.

**If this restructuring is not contained**, stop and report. Changes A, B and C
are the bulk of the benefit and are independently shippable. A half-finished
step split is worse than none, because it looks like checkpointing and is not.

**Verify**:

```
bun run typecheck
bun run test
bun run test:integration
```

**Expected**: all exit 0.

### Step 7: Full verification

```
bun run check
bun run typecheck
bun run test
bun run test:integration
git diff --name-only
```

**Expected**: the first four exit 0; the last lists only the two in-scope
files.

## Test plan

| Test | Why |
|---|---|
| Existing suite passes unchanged | The counts (`scanned`, `changed`, `failed`, `feedsQueued`) must not move for the same fixtures. This is the primary regression net. |
| One record rejects, others still processed (Step 4) | Proves concurrency did not break per-record isolation. Verified by mutation. |
| One record returns `{ ok: false }`, others still processed | The handler treats a failed `Result` differently from a thrown error; both paths need coverage. |
| More records than `PAGE_SIZE` (Step 5) | Proves the cursor advances and `counts.scanned` totals correctly across pages. |
| Exactly `PAGE_SIZE` records | The off-by-one case: the loop must terminate rather than issuing an extra empty query. |
| Zero records | `counts.feedsQueued` is 0 and no `inngest.send` occurs. |
| Feed rebuild events sent once as an array | Pins change A. |

Follow the conventions in the existing test file: `vi.hoisted` mock handles,
`vi.mock` module factories, builders for fixture records.

## Done criteria

All of the following, verbatim:

1. `bun run check` exits 0.
2. `bun run typecheck` exits 0.
3. `bun run test` exits 0 with at least six more tests than the Step 1
   baseline.
4. `bun run test:integration` exits 0.
5. `grep -c "take:" packages/jobs/src/handlers/reconcile-feed-publications.ts`
   prints `1` or more.
6. `grep -c "Promise.all" packages/jobs/src/handlers/reconcile-feed-publications.ts`
   prints `1` or more.
7. `grep -c "MAX_PAGES" packages/jobs/src/handlers/reconcile-feed-publications.ts`
   prints `2` or more (declaration and use).
8. The per-record `try`/`catch` is inside the mapped function, not around
   `Promise.all`. Confirm by reading the diff.
9. Step 4's mutation check was run, the test failed under it, and the file is
   unchanged afterwards.
10. `git diff --name-only` lists exactly two files.
11. If change D was skipped, the report says so and explains why.

## STOP conditions

Stop and report back rather than improvising if any of these occur:

- **The baseline in Step 1 is not green.** Report what fails; change nothing.
- **Any count changes for an existing fixture.** `scanned`, `changed`, `failed`
  and `feedsQueued` must be identical before and after for the same input.
  Report the fixture and both values. Do not adjust the assertion.
- **Change D's step restructuring is not contained.** Stop after change C,
  report what the accumulator threading would require, and say clearly that
  the job is bounded and concurrent but still single-step.
- **`materialiseAvailabilityPublication` turns out not to be idempotent.** That
  blocks change D entirely (Inngest re-runs steps) and it is a finding in its
  own right. Report what makes it non-idempotent.
- **Concurrency causes database connection pool exhaustion** in the integration
  tests. Lower `BATCH_SIZE`, note the value you settled on and why, and report
  it. Do not remove the concurrency.
- **The archived-record question cannot be answered from the code.** Leave the
  filter out, say so, and move on. An unnecessary scan is cheap; a stranded
  stale publication is a published-calendar defect.
- **`inngest.send` does not accept an array** in the installed version. Skip
  change A and note it.

## Maintenance notes

- **The pattern to recognise**: slicing a list into chunks and then awaiting
  each element in order is a no-op. Chunking is only meaningful with
  `Promise.all` (or an explicit concurrency limiter) inside the chunk. This
  shape appears where someone intended concurrency and stopped at the loop
  structure; it is worth a second look anywhere `BATCH_SIZE` appears.
- **`Promise.all` and error isolation interact.** `Promise.all` rejects on the
  first rejection, so any per-item error handling must be inside the mapped
  function. Moving a `try`/`catch` outward here silently converts "one record
  failed" into "the run aborted", with no test failure unless someone wrote the
  test in Step 4.
- **Unbounded `findMany` in a job handler is the recurring shape.** This plan
  bounds one; plan 013 bounds the approvals list; plan 030 bounds the dashboard
  people drain; plan 003 bounds the Xero reader's `while (true)`. Any query in a
  job or a page without a `take` deserves the question "what does this do at
  ten thousand rows?".
- **Single-step Inngest jobs do not checkpoint.** Anything that scales with
  tenant size inside one `step.run` will eventually exceed the step limit for
  the largest tenant, and it will do so silently for everyone else. When adding
  a job that iterates tenant data, the page-per-step shape should be the
  starting point, not the optimisation.
- **Related plans**: 014 (feed cache invalidation batching, which owns the
  `invalidateCache: false` flag this handler passes), 003 and 007 and 018
  (other job handler fixes), 013 and 030 (the same unbounded-query shape
  elsewhere).
