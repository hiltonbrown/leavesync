# Plan 090: Bulk stale Xero leave archival and feed invalidation

> **Executor instructions**: Replace only the per-record work after a complete
> leave snapshot. Preserve Plan 053's freshness guard and every incomplete or
> empty-snapshot safeguard.
>
> **Drift check (run first)**:
> `git diff --stat ecd49f5..HEAD -- packages/jobs/src/handlers/sync-xero-leave-records.ts packages/jobs/src/handlers/sync-xero-leave-records.test.ts packages/jobs/src/handlers/sync-xero-leave-records.integration.test.ts packages/feeds/src/cache/feed-invalidation.ts`
> Stop if stale archival no longer follows a complete-fetch gate or the named
> feed resolver contract changed.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: MED
- **Depends on**: `plans/053-guard-the-inbound-leave-upsert-against-stale-writes.md` DONE
- **Category**: perf
- **Planned at**: commit `ecd49f5`, 2026-08-24
- **Execution status**: TODO
- **Supersedes**: stale-archive half of rejected Plan 058

## Why this matters

`sync-xero-leave-records.ts:829-883` archives stale records in bulk, then calls
publication materialisation once per archived row. Feed projection already
excludes archived records, so those row-by-row reads and writes cannot remove
events. The supported feed rebuild is the required invalidation boundary.

## Current state

- `packages/jobs/src/handlers/sync-xero-leave-records.ts:829-883` performs one
  bulk archive and then materialises each stale publication individually.
- The handler captures `startedAt` at `:144`, but `archiveStaleRecords` is called
  without it at `:263-268`.
- `packages/feeds/src/projection/feed-projection.ts:101-113` filters archived
  canonical records before publication.
- `packages/feeds/src/cache/feed-invalidation.ts:17-65` exports
  `feedIdsForPeople`, the existing all-scope resolver.
- Plan 053's completed handler uses the run start time to prevent an older
  snapshot overwriting a concurrent fresh write. Preserve that predicate.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Focused unit | `bunx vitest run packages/jobs/src/handlers/sync-xero-leave-records.test.ts packages/feeds/src/cache/feed-invalidation.test.ts` | all pass |
| Focused integration | `bunx vitest run packages/jobs/src/handlers/sync-xero-leave-records.integration.test.ts` | all database cases execute and pass |
| Gates | `bun run check && bun run typecheck && bun run test && bun run test:integration && bun run build && git diff --check` | every command exits 0 |

## Scope

**In scope**: the leave-record handler, its unit/integration tests, and feed
invalidation mocks. **Out of scope**: balance paging, reader pagination,
publication schema changes, pricing and settings UI.

## Git workflow

- Base branch: `preview` (`origin/preview`), not `main`. Branch from `preview`, commit there, and land the finished work on `preview` — see `plans/README.md` § Execution policy.
- Work directly in this working tree. No isolated git worktree is used for this repo's plan executions.
- Branch: `perf/090-bulk-stale-leave-archival`
- Commit: `perf(jobs): bulk stale leave archival work`
- Do not push or open a pull request unless instructed.

## Steps

1. Characterise complete, incomplete, empty, cancelled and concurrent snapshot
   outcomes, including the feeds rebuilt for stale people.
2. Pass the sync run's existing `startedAt` into archival. In one transaction,
   select distinct affected `person_id` values and run `updateMany` with one
   dual-tenant predicate that also requires `updated_at <= startedAt`.
3. Remove only stale-row calls to `materialiseSyncedPublication`. Resolve feed
   IDs once through `feedIdsForPeople`, deduplicate them, and enqueue rebuilds.
4. Preserve `source_remote_id: { notIn: fetchedRemoteIds }`. Do not claim the
   database parameter count is bounded by this change.
5. Prove a concurrent fresh update is not archived, an incomplete or empty
   fetch archives nothing, and work after the bulk update is person/feed-sized,
   not stale-record-sized.
6. Run focused tests and all repository-required gates.

The transaction's authoritative archive count is `updateMany.count`. The
pre-update distinct person IDs are a safe invalidation superset under
concurrency; rebuilding an unaffected feed is acceptable, missing an affected
feed is not. Replace the handler's local org/person/team feed query with the
imported `feedIdsForPeople({ clerkOrgId, organisationId, personIds })`; do not
change that helper's signature.

## Step verification

| After step | Verification | Expected result |
|---|---|---|
| 1 | focused unit command above | new characterisation cases pass before refactor |
| 2 | focused integration command | concurrent row remains active; `updateMany.count` is the reported archive count |
| 3 | `rg -n "materialiseSyncedPublication" packages/jobs/src/handlers/sync-xero-leave-records.ts` | no match in stale-archive loop |
| 4 | focused integration command | empty/incomplete safeguards still pass |
| 5 | focused unit and integration commands | query mocks/counts prove person/feed-sized follow-up |
| 6 | full gates command | every command exits 0 |

## Test plan

Extend the two existing leave-record handler suites, following their current
factory style. Cover complete, incomplete, empty, cancelled and concurrent
snapshots; multiple stale rows for one person; people mapped to overlapping
feeds; a safe invalidation superset; and a fresh row updated after `startedAt`.
With many stale records, assert zero stale-path materialisation calls and one
canonical feed-resolution call.

## Done criteria

- [ ] One transaction identifies people and archives stale rows safely.
- [ ] No per-stale-record materialisation remains.
- [ ] Affected feeds are resolved canonically and rebuilt once.
- [ ] Plan 053 freshness and snapshot-completeness tests pass.
- [ ] Check, typecheck, unit, integration and build gates pass.

## STOP conditions

Stop if the live handler no longer exposes a run-start timestamp, the canonical
feed resolver cannot accept the affected people, or correctness would require
changing the remote snapshot reader.

## Maintenance notes

Review the `notIn` parameter count separately if remote snapshots become large.
This plan removes follow-up N-per-record work but does not bound that predicate.
