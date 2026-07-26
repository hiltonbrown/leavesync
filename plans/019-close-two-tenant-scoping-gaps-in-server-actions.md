# Plan 019: Close two tenant-scoping gaps in server actions

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report, do not improvise. When done, update this plan's status row in
> `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 75202db..HEAD -- "apps/app/app/(authenticated)/feeds/_actions.ts" "apps/app/app/(authenticated)/settings/integrations/xero/matches/_actions.ts" packages/database/src/tenant-query.ts`
> If any changed since this plan was written, re-check the "Current state"
> facts before proceeding.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `75202db`, 2026-07-25

## A note on scope, read this first

The audit that produced this plan initially reported a large number of
"unscoped writes". That was over-reported. Every `update`, `delete` and
`create` call in `packages/*` was opened and checked, and they fall into two
correct categories:

- writes whose `where` clause spreads a scoping helper (`...scoped(context)`)
  or whose `data` comes from a helper that injects both tenant IDs
  (`auditData(...)`, `auditBase(...)`), and
- writes that use `where: { id }` inside a transaction that begins with a
  tenant-scoped read of that same row. Prisma's `update` accepts only unique
  fields in `where`, so this check-then-act shape is the idiomatic way to
  express it. Examples: `packages/feeds/src/feed-service.ts:447` is preceded by
  `loadFeedForUpdate(tx, parsed.data)` at line 420;
  `packages/availability/src/people/alternative-contact-service.ts:283` is
  preceded by a scoped `existing` read.

**Those are not defects and this plan does not change them.** Converting them
to `updateMany` for defence in depth is a legitimate but separate discussion,
recorded under "Maintenance notes" rather than executed here.

What survives verification is two reads that genuinely do not carry the full
tenant key. Both are in `apps/app` server actions. That is what this plan
fixes.

## Why this matters

`CLAUDE.md` states the invariant plainly: "Every database query that touches
tenant data must filter by `clerk_org_id`", and the query-scoping section
requires both `clerk_org_id` **and** `organisation_id` on every tenant-scoped
query. The value of an invariant like this is that it is uniform: a reviewer
scanning a diff can spot a missing scope without reasoning about whether some
earlier line already constrained the row. Two exceptions are enough to make
that scan unreliable, and they are the two places a future copy-paste will
start from.

Neither gap is trivially exploitable. Both are constrained by a UUID the caller
must supply, and the surrounding actions verify the caller's org membership and
role first. The realistic impact is a narrow existence-and-metadata oracle: a
caller who somehow learns a feed UUID belonging to another Clerk Organisation
inside the same `organisation_id` scope, or a match UUID inside the same
`clerk_org_id` but a different Organisation, gets back data they should not
see. That is worth closing on its own terms, and it is a two-line change.

## Current state

### Gap 1: feed lookup filtered by `organisation_id` only

`apps/app/app/(authenticated)/feeds/_actions.ts`, inside `rotateTokenAction`,
lines 154-172:

```typescript
  // Fetch feed name cheaply to include in notification body
  let feedName: string | null = null;
  try {
    const feed = await database.feed.findFirst({
      where: {
        id: parsed.data.feedId,
        organisation_id: context.value.organisationId,
      },
      select: { name: true },
    });
    if (feed) {
      feedName = feed.name;
    }
  } catch (err) {
    log.error("Failed to fetch feed name for token rotation notification", {
      feedId: parsed.data.feedId,
      error: err,
    });
  }
```

No `clerk_org_id`. The rest of the same function is correct: it resolves an
admin context, and `rotateToken` (in `packages/feeds`) receives both
`clerkOrgId` and `organisationId`. Lines 138-148:

```typescript
  const context = await resolveAdminContext(parsed.data.organisationId);
  if (!context.ok) {
    return context;
  }
  const result = await rotateToken({
    ...parsed.data,
    actingRole: context.value.role,
    actingUserId: context.value.userId,
    clerkOrgId: context.value.clerkOrgId,
    organisationId: context.value.organisationId,
  });
```

So `context.value.clerkOrgId` is in hand at the point of the unscoped read. The
omission is an oversight, not a constraint.

### Gap 2: match lookup filtered by `clerk_org_id` only

`apps/app/app/(authenticated)/settings/integrations/xero/matches/_actions.ts`,
lines 40-57:

```typescript
  const match = await database.xeroPersonMatch.findFirst({
    where: {
      clerk_org_id: orgId,
      id: parsed.data.matchId,
    },
    include: {
      candidate_person: {
        select: {
          clerk_user_id: true,
          id: true,
        },
      },
      xero_person: {
        select: {
          id: true,
        },
      },
    },
  });
```

`XeroPersonMatch` carries both tenant columns.
`packages/database/prisma/schema.prisma` lines 689-693:

```prisma
model XeroPersonMatch {
  id                     String                   @id @default(uuid()) @db.Uuid
  clerk_org_id           String
  organisation_id        String                   @db.Uuid
  xero_person_id         String                   @db.Uuid
```

This matters more than gap 1 in principle, because the tenancy model in
`CLAUDE.md` explicitly allows one Clerk Organisation to own several
Organisation rows ("A Clerk Org with two Xero files has two Organisation rows,
two XeroConnections, two XeroTenants"). Filtering by `clerk_org_id` alone
therefore spans payroll entities that are meant to be separate scopes, and the
row it returns is then written to by the transaction that follows.

Whether an `organisationId` is available at that point in the action needs
checking during execution: read the lines above line 40 to see what the action
resolves. If only `orgId` is in scope, the fix requires resolving the active
Organisation the same way the other settings actions do. See Step 3.

### The scoping helper that already exists

`packages/database/src/tenant-query.ts` in full (21 lines):

```typescript
export const scopedQuery = (clerkOrgId: ClerkOrgId, organisationId: OrganisationId) => ({
  clerk_org_id: clerkOrgId,
  organisation_id: organisationId,
});
```

It is advisory: nothing forces a query to use it. Prefer it in the fixed call
sites so the intent is legible, provided it is already imported or importable
in `apps/app` without adding a new package dependency. If importing it means
adding a dependency edge that does not exist yet, write the two fields
literally instead and note that in your report.

### The correct exemplar in the same app

`apps/app/app/(authenticated)/settings/general/_actions.ts` resolves a context
and uses `context.value.organisationId` for its reads and writes. Read that
file before editing either target file; it is the shape both should match.

## Commands you will need

All run from the repo root.

```
bun install                # run first if you hit "Cannot find module '@repo/observability/log'"
bun run check              # Biome/Ultracite lint (check mode)
bun run typecheck          # tsc --noEmit across the monorepo
bun run test               # Vitest across the monorepo
```

> If a test or typecheck fails with `Cannot find module
> '@repo/observability/log'`, that is a stale local `node_modules` symlink, not
> a repository defect. Run `bun install` once and retry.

## Scope

**In scope:**

- `apps/app/app/(authenticated)/feeds/_actions.ts` (one `where` clause)
- `apps/app/app/(authenticated)/settings/integrations/xero/matches/_actions.ts`
  (one `where` clause, plus whatever is needed to have an `organisationId` in
  scope)

**Explicitly out of scope:**

- Every `update`/`delete` that uses `where: { id }` after a scoped read. These
  were verified and are correct. Do not convert them to `updateMany`.
- `packages/feeds/src/render/render-feed.ts:101`. The feed token is looked up
  by its own digest, which is a globally unique credential; tenant scoping is
  neither available nor meaningful before the token is resolved.
- `packages/xero/src/oauth/service.ts`. Several of its writes run during OAuth
  bootstrap, before an Organisation row necessarily exists. Plan 008 covers
  that file.
- `packages/database/src/tenant-query.ts`. Consolidating the duplicated local
  copies of this helper is plan 021.
- Any schema change, any migration, any service in `packages/*`.

## Git workflow

```
git checkout -b fix/tenant-scoping-in-server-actions
```

Commit message:

```
fix(app): scope feed and Xero match lookups by both tenant keys
```

Do not push or open a pull request unless the user asks.

## Steps

### Step 1: Establish the baseline

```
bun run check
bun run typecheck
bun run test
```

**Expected**: all three exit 0. Record the total test count. If any fails
before you have changed anything, go to STOP conditions.

### Step 2: Scope the feed lookup

Edit `apps/app/app/(authenticated)/feeds/_actions.ts`. In `rotateTokenAction`,
change the `where` clause to carry both tenant keys:

```typescript
    const feed = await database.feed.findFirst({
      where: {
        clerk_org_id: context.value.clerkOrgId,
        id: parsed.data.feedId,
        organisation_id: context.value.organisationId,
      },
      select: { name: true },
    });
```

Change nothing else in the function: not the `try`/`catch`, not the logging,
not the notification dispatch below it.

**Verify**:

```
bun run typecheck
grep -n -A5 "database.feed.findFirst" "apps/app/app/(authenticated)/feeds/_actions.ts"
```

**Expected**: typecheck exits 0, and the printed `where` clause contains
`clerk_org_id`, `id` and `organisation_id`.

### Step 3: Scope the Xero match lookup

Edit
`apps/app/app/(authenticated)/settings/integrations/xero/matches/_actions.ts`.

First, read lines 1-45 and establish where `orgId` comes from and whether an
`organisationId` is already resolved in the same function.

**If an `organisationId` is already in scope**, add it to the `where`:

```typescript
  const match = await database.xeroPersonMatch.findFirst({
    where: {
      clerk_org_id: orgId,
      id: parsed.data.matchId,
      organisation_id: <the resolved organisation id>,
    },
```

**If it is not**, resolve it the same way the neighbouring settings actions do.
`apps/app/app/(authenticated)/settings/general/_actions.ts` and
`apps/app/app/(authenticated)/feeds/_actions.ts` both resolve a context object
that carries `organisationId`; find the shared helper they use (look for
`getActiveOrgContext` or `resolveAdminContext` in
`apps/app/lib/server/`) and use the same one. Do not invent a new resolution
path, and do not read the Organisation directly from the database in this
action.

If resolving the Organisation here would change the action's authorisation
behaviour (for example because the helper also enforces a role the action did
not previously require), go to STOP conditions rather than deciding it
yourself.

**Verify**:

```
bun run typecheck
bun run check
grep -n -A6 "database.xeroPersonMatch.findFirst" "apps/app/app/(authenticated)/settings/integrations/xero/matches/_actions.ts"
```

**Expected**: both commands exit 0, and the printed `where` clause contains
`clerk_org_id`, `id` and `organisation_id`.

### Step 4: Confirm no other read in `apps/app` is missing a tenant key

Run this sweep and read every result:

```
grep -rn -A6 "database\.\w*\.\(findFirst\|findMany\|findUnique\)({" "apps/app/app" | grep -B1 -A5 "where:"
```

For each hit, confirm the `where` clause either carries both tenant keys, or
targets a model that is not tenant-scoped (check
`packages/database/prisma/schema.prisma`: a tenant-scoped model has a
`clerk_org_id` column).

**Expected**: after Steps 2 and 3, every tenant-scoped read carries both keys.

If you find a third gap, **report it and stop before fixing it**. This plan
claims two sites based on verification; a third means the verification was
incomplete and the user should decide whether to widen the scope.

### Step 5: Full verification

```
bun run check
bun run typecheck
bun run test
```

**Expected**: all exit 0, with the same test count as the Step 1 baseline plus
any tests you added in the test plan below.

## Test plan

Both changes are one-line `where` clause additions in server actions.

A test harness for server actions **already exists** in this app.
`apps/app/app/(authenticated)/feeds/_actions.test.ts` covers the very file
Step 2 edits, and
`apps/app/app/(authenticated)/settings/general/_actions.test.ts` shows the
`vi.hoisted` plus `vi.mock` idiom for mocking `@repo/database` and
`@repo/auth/server`. Read whichever is closer to the file you are editing
before adding to it.

Add one test per fixed site, in the existing co-located test file where there
is one:

1. **`feeds/_actions.test.ts`**: call `rotateTokenAction` and assert the mocked
   `database.feed.findFirst` received a `where` containing `clerk_org_id`,
   `id` and `organisation_id`. Assert on the argument, not on the result: the
   lookup is inside a `try`/`catch` whose failure path is silent, so a
   result-level assertion would pass even if the query were wrong.
2. **The matches action** has no test file at `75202db`. Creating one is plan
   027's job (it needs the same file and builds the harness there). If plan 027
   has landed, add the equivalent `where`-clause assertion to its test file. If
   it has not, note in your report that the matches fix is covered by
   `typecheck` only, and say so plainly rather than implying otherwise.

Also add a one-line comment at each fixed site recording why both keys are
required, so the next reader does not "simplify" it back:

```typescript
      // Both tenant keys: one Clerk Organisation can own several Organisation
      // rows (one per Xero file), so clerk_org_id alone spans payroll entities.
```

`bun run typecheck` is a genuine second gate here: Prisma's generated `where`
types are strict, so a misspelled column is a compile error rather than a
silent no-op.

## Done criteria

All of the following, verbatim:

1. `bun run check` exits 0.
2. `bun run typecheck` exits 0.
3. `bun run test` exits 0.
4. `grep -A5 "database.feed.findFirst" "apps/app/app/(authenticated)/feeds/_actions.ts" | grep -c clerk_org_id`
   prints `1`.
5. `grep -A6 "database.xeroPersonMatch.findFirst" "apps/app/app/(authenticated)/settings/integrations/xero/matches/_actions.ts" | grep -c organisation_id`
   prints `1`.
6. The Step 4 sweep finds no tenant-scoped read in `apps/app/app` missing
   either key.
7. `git diff --name-only` lists at most the two files in the "In scope" list.

## STOP conditions

Stop and report back rather than improvising if any of these occur:

- **The baseline in Step 1 is not green.** Report what fails; change nothing.
- **No `organisationId` is resolvable in the matches action without changing
  its authorisation behaviour** (Step 3). Report exactly what the action
  currently resolves and what the available helpers require. Getting this wrong
  would either lock out legitimate admins or widen access.
- **The Step 4 sweep finds a third tenant-scoped read missing a key.** Report
  the file and line; do not fix it in this plan.
- **`organisation_id` turns out not to exist on a model you are scoping.**
  Check `schema.prisma` before assuming; some models are Clerk-Organisation
  scoped only. If so, `clerk_org_id` alone is correct for that model and you
  should say so rather than adding a column that does not exist.

## Maintenance notes

- **The check-then-act pattern is the repo's norm and it is fine, but it is
  fragile.** Roughly thirty `update`/`delete` calls use `where: { id }` and
  depend on a scoped read earlier in the same transaction for their tenant
  guarantee. Deleting or reordering that read silently removes the guarantee
  with no compile error and no test failure. In review, treat any change that
  moves or removes a scoped read inside a transaction as a security-relevant
  change. If this ever needs hardening, the mechanical conversion is
  `update({ where: { id } })` to `updateMany({ where: { ...scoped, id } })`
  with an assertion that `count === 1`; that is a large, low-risk, mostly
  automatable diff and deserves its own plan rather than being smuggled into a
  fix like this one.
- **`scopedQuery` in `packages/database/src/tenant-query.ts` is advisory
  only.** Nothing enforces its use. Plan 021 consolidates the eleven local
  reimplementations of the same shape; neither that plan nor this one makes it
  mandatory. If the user wants enforcement, the realistic mechanism is a Prisma
  client extension that rejects queries on tenant-scoped models without both
  keys, which is a design decision, not a cleanup.
- **`apps/app` server actions read the database directly** via `@repo/database`
  rather than going through a service in `packages/*`. That is the boundary
  question plan 031 covers. Both sites fixed here are examples of it: the feed
  name lookup exists in the action only because the service does not return it.
  If plan 031 lands, this lookup may move into `packages/feeds` entirely, at
  which point the scoping is inherited from the service's existing context.
