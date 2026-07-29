# Plan 021: Consolidate the eleven local copies of the tenant-scoping helper

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report, do not improvise. When done, update this plan's status row in
> `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 75202db..HEAD -- packages/database/src/tenant-query.ts packages/availability/src packages/jobs/src packages/feeds/src`
> If any changed since this plan was written, re-check the "Current state"
> facts before proceeding.

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: tech debt
- **Planned at**: commit `75202db`, 2026-07-25 (inventory corrected 2026-07-26,
  no re-stamp needed: the correction adds a missed file at the same commit,
  it does not reflect new drift)

## Why this matters

`packages/database` exports `scopedQuery`, a helper whose whole purpose is to
make the repo's central security invariant ("every tenant query filters by both
`clerk_org_id` and `organisation_id`") legible at the call site. Eleven files
reimplement it locally instead, in three different shapes. Some of those local
copies are used *alongside* `scopedQuery` in the same package.

This is not a correctness bug. Every copy produces the same object and every
call site is correctly scoped. It matters for three narrower reasons:

1. **The invariant becomes unsearchable.** `grep -rn "scopedQuery"` does not
   find the seven job and service files that scope their queries through a local
   `scoped()`. Anyone auditing tenant isolation has to know all three spellings.
2. **Two of the copies violate the repo's own `as`-cast rule.**
   `packages/availability/src/plans/plan-service.ts:1205` and
   `packages/availability/src/calendar/calendar-service.ts:1023` wrap
   `scopedQuery` and cast plain `string` arguments to the branded `ClerkOrgId`
   and `OrganisationId` types with no justifying comment. `CLAUDE.md` requires
   "No `as` casts unless justified with a comment". These casts exist purely to
   satisfy the branded signature, which means the branding is providing no
   safety at those call sites, only friction.
3. **It sets the precedent.** Seven of the eleven copies are near-identical
   five-line functions. The next service will add an eleventh rather than
   import one, because copying the neighbouring file is what the codebase
   teaches.

The fix is mechanical, has no runtime behaviour change, and makes the security
invariant greppable with one term.

## Current state

### The canonical helper

`packages/database/src/tenant-query.ts` in full:

```typescript
import type { ClerkOrgId, OrganisationId } from "@repo/core";

/**
 * Creates a scoped query filter that ensures all database queries
 * are filtered by both clerkOrgId and organisationId.
 *
 * Usage:
 *   where: { ...scopedQuery(clerkOrgId, organisationId), status: "active" }
 */
export const scopedQuery = (
  clerkOrgId: ClerkOrgId,
  organisationId: OrganisationId
) => ({
  clerk_org_id: clerkOrgId,
  organisation_id: organisationId,
});

/**
 * Type helper for spreading scoped query results into where clauses.
 */
export type ScopedQueryResult = ReturnType<typeof scopedQuery>;
```

It takes **two positional branded arguments**. That signature is the reason for
most of the divergence: nearly every caller has an input object with
`clerkOrgId` and `organisationId` as plain strings, and adapting to the
positional branded form is more friction than writing five lines.

### The eleven local copies

Verified by reading each definition at commit `75202db`.

**Shape A: object argument, plain strings.** Seven identical bodies:

| File | Line |
|---|---|
| `packages/availability/src/approvals/approval-service.ts` | 1594 |
| `packages/availability/src/plans/submit-service.ts` | 732 |
| `packages/availability/src/sync/sync-monitor-service.ts` | 719 |
| `packages/jobs/src/handlers/sync-xero-leave-records.ts` | 970 |
| `packages/jobs/src/handlers/sync-xero-leave-balances.ts` | 613 |
| `packages/jobs/src/handlers/reconcile-xero-approval-state.ts` | 778 |
| `packages/jobs/src/handlers/sync-xero-people.ts` | 536 |

Corrected 2026-07-26: the original 2026-07-25 audit omitted
`sync-xero-people.ts:536` from this table. It was already present at commit
`75202db` (confirmed via `git diff --stat 75202db..HEAD` showing no change to
`packages/jobs/src`), so this is a missed inventory entry, not drift. An
executor run on the original version of this plan correctly stopped at the
Step 1 STOP condition ("local-definition count is not 10") rather than
improvising past it. Six of the seven are byte-identical:

```typescript
function scoped(input: { clerkOrgId: string; organisationId: string }) {
  return {
    clerk_org_id: input.clerkOrgId,
    organisation_id: input.organisationId,
  };
}
```

One of the seven, `sync-xero-leave-balances.ts:613`, differs only by an
explicit return type annotation:

```typescript
function scoped(context: { clerkOrgId: string; organisationId: string }): {
  clerk_org_id: string;
  organisation_id: string;
} {
  return {
    clerk_org_id: context.clerkOrgId,
    organisation_id: context.organisationId,
  };
}
```

**Shape B: positional wrapper around `scopedQuery`, with unjustified casts.**
Two copies:

`packages/availability/src/plans/plan-service.ts:1205`:

```typescript
function scoped(clerkOrgId: string, organisationId: string) {
  return scopedQuery(
    clerkOrgId as ClerkOrgId,
    organisationId as OrganisationId
  );
}
```

`packages/availability/src/calendar/calendar-service.ts:1023` is the same
shape.

**Shape C: feed-specific, adds `id`.** Two copies:

`packages/feeds/src/tokens/token-service.ts:425` and
`packages/feeds/src/feed-service.ts:965`, both:

```typescript
function scopedFeed(input: {
  clerkOrgId: string;
  feedId: string;
  organisationId: string;
}) {
  return {
    clerk_org_id: input.clerkOrgId,
    id: input.feedId,
    organisation_id: input.organisationId,
  };
}
```

### Direct use of the canonical helper

`scopedQuery` is also imported and used directly in at least these files, all
in `packages/availability`:

```
packages/availability/src/people/people-service.ts (4 call sites)
packages/availability/src/people/current-user-service.ts
packages/availability/src/people/alternative-contact-service.ts (4 call sites)
packages/availability/src/people/manual-balance-service.ts
packages/availability/src/people/balance-refresh.ts
packages/availability/src/analytics/out-of-office-service.ts
```

So `packages/availability` currently uses all three spellings at once.

## Design

Add an **object-argument overload** to `packages/database/src/tenant-query.ts`
and migrate every local copy to it. Do not change the existing positional
signature; the files listed under "Direct use" already depend on it and
rewriting them is unnecessary churn.

The new export handles the shape that seven of the eleven copies already want:

```typescript
export const scopedTo = (input: {
  clerkOrgId: string;
  organisationId: string;
}) => ({
  clerk_org_id: input.clerkOrgId,
  organisation_id: input.organisationId,
});
```

Plain `string` parameters, deliberately. The branded types on `scopedQuery`
buy nothing here: every current caller has plain strings and reaches the
branded signature only by casting, which is the very thing this plan removes.
Accepting `string` is honest about what the callers hold. Record that reasoning
in a comment on the export so it does not get "tightened" back into a cast
factory later.

Shape C (`scopedFeed`) is **not** consolidated into the shared helper: adding
an `id` field is feed-specific and belongs in `packages/feeds`. The two copies
are deduplicated within that package instead.

## Commands you will need

All run from the repo root.

```
bun install                # run first if you hit "Cannot find module '@repo/observability/log'"
bun run check
bun run typecheck
bun run test
```

> If a test or typecheck fails with `Cannot find module
> '@repo/observability/log'`, that is a stale local `node_modules` symlink, not
> a repository defect. Run `bun install` once and retry.

## Scope

**In scope:**

- `packages/database/src/tenant-query.ts` (add one export)
- The package root export for `packages/database`, if `scopedQuery` is
  re-exported there and `scopedTo` must be too. Check
  `packages/database/index.ts` (or whatever the package root entry is) and
  match how `scopedQuery` is exposed.
- The seven Shape A files (remove the local function, import `scopedTo`)
- The two Shape B files (remove the local function and the casts, import
  `scopedTo`, adapt the two call-site argument styles)
- The two Shape C files in `packages/feeds` (deduplicate `scopedFeed` into one
  location within that package)

**Explicitly out of scope:**

- Changing the existing `scopedQuery` signature or its branded parameter types.
  Files that already use it correctly stay as they are.
- Migrating the "Direct use" files listed above from `scopedQuery` to
  `scopedTo`. Both are correct; churning them adds diff for no gain.
- Any `where` clause contents, any query, any behaviour.
- `packages/availability/src/settings/manager-scope.ts` and anything to do with
  authorisation. Different concern entirely.
- Making the helper mandatory or enforcing it with lint or a Prisma extension.
  See "Maintenance notes".

## Git workflow

```
git checkout -b refactor/consolidate-tenant-scoping-helper
```

Suggested commits:

```
feat(database): add object-argument scopedTo helper
refactor(availability): use the shared tenant-scoping helper
refactor(jobs): use the shared tenant-scoping helper
refactor(feeds): deduplicate scopedFeed
```

Do not push or open a pull request unless the user asks.

## Steps

### Step 1: Establish the baseline

```
bun run check
bun run typecheck
bun run test
```

**Expected**: all three exit 0. Record the total test count; it must be
identical at the end, since this plan adds no tests and removes none.

Record the current count of local definitions:

```
grep -rn "^function scoped\|^function scopedFeed" packages/*/src --include=*.ts | grep -v "\.test\." | wc -l
```

**Expected**: `11`.

### Step 2: Add `scopedTo`

Edit `packages/database/src/tenant-query.ts`. Append below the existing
exports, keeping the file's JSDoc style:

```typescript
/**
 * Object-argument form of scopedQuery, for the common case where the caller
 * already holds a context object with clerkOrgId and organisationId.
 *
 * Parameters are plain strings by design. Every caller in this repository holds
 * plain strings at this point and would otherwise have to cast to the branded
 * ClerkOrgId and OrganisationId types, which provides no safety and violates
 * the repo's no-unjustified-cast rule. Use scopedQuery where branded values are
 * genuinely in hand.
 *
 * Usage:
 *   where: { ...scopedTo(input), id: recordId }
 */
export const scopedTo = (input: {
  clerkOrgId: string;
  organisationId: string;
}) => ({
  clerk_org_id: input.clerkOrgId,
  organisation_id: input.organisationId,
});
```

Then check how `scopedQuery` is exposed to other packages and expose `scopedTo`
the same way:

```
grep -rn "scopedQuery" packages/database --include=*.ts --include=*.json | grep -v "\.test\." | grep -v "tenant-query.ts"
```

If it is re-exported from a package-root barrel, add `scopedTo` beside it.
`CLAUDE.md` permits barrel files at the package root only, so do not create a
new one anywhere else.

**Verify**:

```
bun run typecheck
```

**Expected**: exits 0. Nothing imports `scopedTo` yet, so this only proves the
new export compiles.

### Step 3: Migrate the seven Shape A files

For each of these, in this order:

1. `packages/jobs/src/handlers/sync-xero-leave-records.ts` (line 970)
2. `packages/jobs/src/handlers/sync-xero-leave-balances.ts` (line 613)
3. `packages/jobs/src/handlers/reconcile-xero-approval-state.ts` (line 778)
4. `packages/jobs/src/handlers/sync-xero-people.ts` (line 536)
5. `packages/availability/src/approvals/approval-service.ts` (line 1594)
6. `packages/availability/src/plans/submit-service.ts` (line 732)
7. `packages/availability/src/sync/sync-monitor-service.ts` (line 719)

do exactly this:

- Delete the local `function scoped(...)` definition.
- Add `scopedTo` to the file's existing `@repo/database` import, or add the
  import if there is none. Match the file's existing import style.
- Add a local alias so every call site stays untouched:

```typescript
import { database, scopedTo as scoped } from "@repo/database";
```

Using the import alias means **zero call sites change**. Each of these files
has many `...scoped(context)` spreads; rewriting them all would turn a
mechanical change into a large reviewable diff for no benefit.

If the file's linter configuration objects to an aliased import, fall back to a
one-line re-export instead:

```typescript
const scoped = scopedTo;
```

**Do this one file at a time**, running `bun run typecheck` after each. A
type error after one file is trivially attributable; a type error after seven
is not.

**Verify after each file**:

```
bun run typecheck
```

**Expected**: exits 0 every time.

**Verify after all seven**:

```
grep -rn "^function scoped(" packages/availability/src packages/jobs/src --include=*.ts | grep -v "\.test\." | wc -l
```

**Expected**: `2` (only the two Shape B copies remain).

### Step 4: Migrate the two Shape B files

`packages/availability/src/plans/plan-service.ts:1205` and
`packages/availability/src/calendar/calendar-service.ts:1023` take **positional**
arguments, so the import-alias trick does not apply directly. Two options; pick
per file based on how many call sites there are.

Count them first:

```
grep -c "scoped(" packages/availability/src/plans/plan-service.ts
grep -c "scoped(" packages/availability/src/calendar/calendar-service.ts
```

**If there are few call sites (roughly ten or fewer)**: delete the local
function, import `scopedTo`, and rewrite each call from
`scoped(clerkOrgId, organisationId)` to
`scopedTo({ clerkOrgId, organisationId })`.

**If there are many**: keep a local positional adapter but drop the casts and
the dependency on the branded signature:

```typescript
function scoped(clerkOrgId: string, organisationId: string) {
  return scopedTo({ clerkOrgId, organisationId });
}
```

Either way, the two `as ClerkOrgId` / `as OrganisationId` casts must be gone,
along with the now-unused `ClerkOrgId` / `OrganisationId` type imports if
nothing else in the file uses them. `bun run check` will flag unused imports.

**Verify**:

```
bun run typecheck
bun run check
grep -n "as ClerkOrgId\|as OrganisationId" packages/availability/src/plans/plan-service.ts packages/availability/src/calendar/calendar-service.ts
```

**Expected**: typecheck and check exit 0; the grep prints nothing.

### Step 5: Deduplicate `scopedFeed` within `packages/feeds`

`packages/feeds/src/tokens/token-service.ts:425` and
`packages/feeds/src/feed-service.ts:965` are identical. Move one copy into a
shared module inside the package and import it in both.

Choose the location by looking at how `packages/feeds` already organises shared
internals. `ls packages/feeds/src` and pick an existing directory that holds
cross-cutting helpers; if none exists, create `packages/feeds/src/scope/`
alongside the existing `packages/feeds/src/scope/feed-scope.ts` and put it
there.

Do **not** export `scopedFeed` from the package root. It is an internal helper
and the feed `id` field makes it specific to one table.

Build it on `scopedTo` so the tenant part has a single definition:

```typescript
import { scopedTo } from "@repo/database";

// Feed queries are always scoped to a single feed within a tenant. The id field
// makes this specific to the feeds table, which is why it lives here rather
// than in @repo/database.
export function scopedFeed(input: {
  clerkOrgId: string;
  feedId: string;
  organisationId: string;
}) {
  return {
    ...scopedTo(input),
    id: input.feedId,
  };
}
```

**Verify**:

```
bun run typecheck
grep -rn "^function scopedFeed\|export function scopedFeed" packages/feeds/src --include=*.ts | grep -v "\.test\." | wc -l
```

**Expected**: typecheck exits 0; the grep prints `1`.

### Step 6: Full verification

```
bun run check
bun run typecheck
bun run test
```

**Expected**: all exit 0, with **exactly** the same test count as the Step 1
baseline. A changed count means this refactor changed behaviour, which it must
not.

Then confirm the consolidation:

```
grep -rn "^function scoped(\|^function scopedFeed(" packages/*/src --include=*.ts | grep -v "\.test\." | wc -l
```

**Expected**: `0` or `2`, depending on which option you took in Step 4 (`2` if
you kept positional adapters in both Shape B files).

```
grep -rln "scopedTo" packages/*/src --include=*.ts | grep -v "\.test\." | wc -l
```

**Expected**: at least `10`.

## Test plan

**No new tests.** This is a pure refactor with no behaviour change, and the
existing suite is the regression test: every one of the eleven migrated helpers
sits on a query path already covered by unit tests in `packages/availability`,
`packages/jobs` and `packages/feeds`.

The done criterion that carries the weight is "identical test count, all
passing". If a test starts failing during this plan, you have changed
behaviour and should stop rather than adjust the test.

One optional addition, only if `packages/database` already has a test file
alongside `tenant-query.ts`: a two-line test asserting `scopedTo` returns
`{ clerk_org_id, organisation_id }` for a given input. Check with
`ls packages/database/src/tenant-query.test.ts`. If no such file exists, do not
create one for a five-line pure function.

## Done criteria

All of the following, verbatim:

1. `bun run check` exits 0.
2. `bun run typecheck` exits 0.
3. `bun run test` exits 0 with **exactly** the Step 1 baseline test count.
4. `grep -c "export const scopedTo" packages/database/src/tenant-query.ts`
   prints `1`.
5. `grep -rn "as ClerkOrgId\|as OrganisationId" packages/availability/src --include=*.ts | grep -v "\.test\."`
   prints nothing.
6. `grep -rn "^function scopedFeed(\|export function scopedFeed(" packages/feeds/src --include=*.ts | grep -v "\.test\." | wc -l`
   prints `1`.
7. No local `function scoped(input: { clerkOrgId: string; organisationId:
   string })` definition remains in `packages/availability/src` or
   `packages/jobs/src`.
8. `git diff` contains no change to any `where` clause, any `data` object, or
   any control flow. Review the full diff and confirm this before committing.

## STOP conditions

Stop and report back rather than improvising if any of these occur:

- **The baseline in Step 1 is not green**, or the local-definition count is not
  `11`. The second means the file has drifted; re-derive the list before
  proceeding.
- **The test count changes at any point.** This refactor cannot change
  behaviour. Report which suite changed and stop.
- **One of the seven Shape A copies is not actually identical.** Read each before
  deleting it. If one adds a field, omits a field, or applies a transform, it is
  not the same helper and must not be replaced. Report it and leave it alone.
- **`packages/jobs` or `packages/feeds` does not already depend on
  `@repo/database`.** Check the `dependencies` in each `package.json` before
  importing. Adding a package dependency edge is a bigger decision than this
  refactor and should be reported, not made silently. (Both are expected to
  depend on it already, since both import `database`.)
- **A file's `scoped` is used in a `data` object rather than a `where`
  clause.** That is a different concern (populating tenant columns on insert
  versus filtering on read) and the two must not be merged behind one name.
  Report where.

## Maintenance notes

- **Three spellings collapse to two:** `scopedQuery` (positional, branded, for
  callers holding branded IDs) and `scopedTo` (object, plain strings, for
  callers holding a context object). Both live in
  `packages/database/src/tenant-query.ts`. Anyone auditing tenant isolation
  should be able to `grep -rn "scoped"` in that file's importers and see every
  scoped query.
- **Nothing enforces the helper.** A new query can still hand-write
  `where: { clerk_org_id, organisation_id }`, and about 230 lines across the
  repo do exactly that. This plan does not change those and should not. If the
  user wants real enforcement, the mechanism is a Prisma client extension that
  rejects queries on tenant-scoped models missing either key, which is a design
  decision with runtime and testing implications, not a cleanup. Raise it
  rather than bolting it on here.
- **Do not brand `scopedTo`'s parameters later.** The plain-string signature is
  deliberate and the comment on the export says why. Tightening it to
  `ClerkOrgId`/`OrganisationId` would reintroduce exactly the casts this plan
  removes, at every call site instead of two.
- **Related plan**: plan 019 fixes two genuine tenant-scoping gaps in
  `apps/app` server actions. It touches different files and can land in either
  order. If both are in flight, note that plan 019 mentions `scopedQuery` in
  its guidance; after this plan lands, `scopedTo` is the better fit for those
  call sites.
