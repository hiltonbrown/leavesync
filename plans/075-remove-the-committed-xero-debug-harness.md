# Plan 075: Remove the committed Xero debug harness and restore the quality gate

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report. Do not improvise. When done, update this plan's row in
> `plans/README.md`, unless a reviewer has said they maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat b590de2..HEAD -- "apps/app/app/(authenticated)/debug" apps/app/app/api/debug "apps/app/app/(authenticated)/sync/_actions.ts"`
> If an in-scope path changed, compare the "Current state" excerpts with the
> live code. Stop if the debug routes, unscoped database operations or sync
> action logging no longer match this plan.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security, dx
- **Planned at**: commit `b590de2`, 2026-08-24
- **Unblocks**: plan 053; restores the full quality gate for merged plan 052

## Why this matters

Seven one-off Xero verification routes were committed to the application in
`2e82ef4`. They contain production-looking fixed record identifiers and perform
database operations without the required Clerk Organisation and Organisation
scope. The most dangerous route accepts an arbitrary Xero tenant ID, rewrites
the associated connection state, inserts a fabricated successful sync run and
returns exception stacks.

The app's `proxy.ts` exports bare Clerk `clerkMiddleware()` without calling
`auth.protect()`. The installed Clerk package explicitly separates middleware
request authentication from resource protection, and route handlers do not
inherit the `(authenticated)` React layout's user guard. The API debug route is
therefore reachable without an in-route authorisation check; the route handlers
inside the route group also have no in-route protection or tenant scope.

The same debug harness accounts for every current `bun run check` failure: 60
diagnostics are in the seven debug files and two are in temporary logging in
the real sync action. This blocks the already-reviewed plan 052 payroll fix and
plan 053 stale-write fix. Delete the harness instead of formatting or
"securing" one-off verification code.

## Current state

The committed debug surface consists of exactly seven files:

- `apps/app/app/(authenticated)/debug/auto-bump/page.tsx`
- `apps/app/app/(authenticated)/debug/bump/route.ts`
- `apps/app/app/(authenticated)/debug/page.tsx`
- `apps/app/app/(authenticated)/debug/sync-runs/route.ts`
- `apps/app/app/(authenticated)/debug/verify-full/page.tsx`
- `apps/app/app/(authenticated)/debug/verify/page.tsx`
- `apps/app/app/api/debug/run-sync/route.ts`

Repository-wide search at `b590de2` finds no production import, navigation or
test that depends on these paths outside the seven files themselves.

**Unscoped connection mutation**,
`apps/app/app/(authenticated)/debug/bump/route.ts:5-15`:

```ts
const newExpiry = new Date(Date.now() + 30 * 60 * 1000);
const upd = await database.xeroConnection.update({
  where: { id: "<fixed connection UUID>" },
  data: {
    expires_at: newExpiry,
    status: "active",
    last_error_code: null,
    last_error_message: null,
  },
});
```

Both `GET` and `POST` call this mutation. The `auto-bump` page performs the
same write during page rendering.

**Arbitrary tenant access and fabricated sync history**,
`apps/app/app/api/debug/run-sync/route.ts:5-59`:

```ts
const xeroTenantId =
  (body.xeroTenantId as string) ||
  url.searchParams.get("xeroTenantId") ||
  "<fixed tenant UUID>";
const tenant = await database.xeroTenant.findUnique({
  where: { id: xeroTenantId },
});
await database.xeroConnection.update({
  where: { id: tenant.xero_connection_id },
  data: { expires_at: new Date(Date.now() + 30 * 60 * 1000), status: "active" },
});
await database.syncRun.create({
  data: {
    clerk_org_id: tenant.clerk_org_id,
    organisation_id: tenant.organisation_id,
    records_fetched: 5,
    records_upserted: 5,
    status: "succeeded",
  },
});
```

The handler does not call `auth()`, validate the body with Zod, verify an
organisation role, or apply `scopedQuery`. Its error response includes an
exception stack.

**Unscoped sync-run read**,
`apps/app/app/(authenticated)/debug/sync-runs/route.ts:4-26` accepts an Xero
tenant ID from the query string and filters only by `xero_tenant_id`.

**Temporary production logging**,
`apps/app/app/(authenticated)/sync/_actions.ts:71,131,141` uses two
`console.log` calls and one `console.error` call around manual sync execution.
Production code must use the observability logger, but these statements are
diagnostic dumps rather than durable telemetry. Remove them; do not replace
them with another sink under this plan.

**Measured quality-gate attribution at `d1d4a94`**:

| Scope | Result |
|---|---|
| Seven debug files | 60 Ultracite errors |
| `sync/_actions.ts` | 2 Ultracite errors |
| Full repository | 62 Ultracite errors |

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Targeted sync tests | `cd apps/app && bunx vitest run "app/(authenticated)/sync/_actions.test.ts" "app/(authenticated)/sync/sync-client.test.tsx"` | all pass |
| Check | `bun run check` | exit 0 |
| Typecheck | `bun run typecheck` | exit 0 |
| Unit tests | `bun run test` | exit 0 |
| Integration tests | `bun run test:integration` | exit 0; database suites execute |
| Build | `bun run build` | exit 0 |

## Scope

**In scope**:

- Delete `apps/app/app/(authenticated)/debug/` and all six files below it.
- Delete `apps/app/app/api/debug/run-sync/route.ts` and remove the empty
  `apps/app/app/api/debug/` directory.
- `apps/app/app/(authenticated)/sync/_actions.ts`, only to remove the three
  temporary `console` statements and correct adjacent punctuation/formatting.
- `plans/README.md`, status only, unless the reviewer maintains it.

**Out of scope**:

- Changing manual sync dispatch, inline development fallback, result payloads,
  revalidation or UI messages in `sync/_actions.ts`.
- Adding a replacement debug endpoint, feature flag or admin diagnostics page.
- Changing `apps/app/proxy.ts` or Clerk middleware. Resource-level protection is
  still required on every route that accesses protected data.
- Editing Xero connection or sync-run data. This is source removal only.
- The broader changes introduced by `2e82ef4`; review them separately if needed.
- Merged plan 052 source and the plan 053 source branch. This plan removes their
  shared baseline blocker without changing either implementation.

## Existing conventions to follow

- Production routes validate external input with Zod and apply both
  `clerk_org_id` and `organisation_id`; these debug routes do neither, so do not
  use them as an exemplar.
- Production code does not use `console.log` or `console.error`. Diagnostic
  logging belongs in `@repo/observability`, but deletion is the correct outcome
  for these temporary dumps.
- Use Australian English and do not add em dashes.
- Keep the change deletion-first. Formatting unsafe debug routes would preserve
  the security problem and is not an acceptable substitute.

## Git workflow

- Branch: `advisor/075-remove-xero-debug-harness`
- One conventional commit, for example
  `fix(app): remove unsafe Xero debug routes`
- Do not push, merge or open a PR.

## Steps

### Step 1: Confirm the harness has no real caller

Search outside the debug directories for route strings and exported page names:

```bash
rg -n 'debug/(bump|verify|sync-runs|run-sync)|AutoBump|VerifyFullPage|DebugXeroPage' apps packages \
  --glob '!apps/app/app/(authenticated)/debug/**' \
  --glob '!apps/app/app/api/debug/**'
```

Expected: no matches. If a production caller exists, STOP rather than deleting
an active dependency without review.

### Step 2: Delete all seven debug files

Delete the six-file `apps/app/app/(authenticated)/debug/` tree and
`apps/app/app/api/debug/run-sync/route.ts`. Remove the now-empty API debug
directory.

Do not retain, relocate or format any part of the harness. Git history already
preserves it if a developer needs to inspect the old diagnostic approach.

Verify:

```bash
test ! -e "apps/app/app/(authenticated)/debug"
test ! -e apps/app/app/api/debug
```

Expected: both commands exit 0.

### Step 3: Remove temporary sync-action console output

In `apps/app/app/(authenticated)/sync/_actions.ts`, remove only these
diagnostic statements:

- the dispatch-result `console.log` after `dispatchManualSync`
- the caught-error `console.error` in the inline execution catch
- the final `console.log` that serialises `syncResult` and `syncError`

Keep the `syncError` assignment and error Result unchanged. Correct the nearby
comment punctuation if needed to satisfy the repository's no-em-dash rule, but
do not restructure the dispatch flow.

Verify:

```bash
rg -n 'console\.(log|error)' "apps/app/app/(authenticated)/sync/_actions.ts"
```

Expected: no matches.

### Step 4: Prove the sync action still behaves the same

Run:

```bash
cd apps/app && bunx vitest run \
  "app/(authenticated)/sync/_actions.test.ts" \
  "app/(authenticated)/sync/sync-client.test.tsx"
```

Expected: all tests pass. No assertion should need changing because console
output is not part of the contract. If a test relies on a debug route, STOP.

### Step 5: Restore and verify the repository baseline

From the repository root, run in order:

```bash
bun run check
bun run typecheck
bun run test
bun run test:integration
bun run build
git diff --check
```

Every command must exit 0. Database-backed integration suites must execute, not
skip. If `bun run check` still reports a file outside this plan's scope, STOP
and report the remaining path rather than expanding this security cleanup.

## Test plan

This change deletes an unreferenced harness rather than adding behaviour.
Verification consists of:

- absence checks for both debug route directories;
- repository search proving no caller remains;
- existing manual sync action and client tests;
- full lint, typecheck, unit, integration and build gates;
- final diff review proving the seven files are deleted and the production sync
  action changed only by removal of diagnostic logging.

No replacement endpoint test should be added because no replacement endpoint
belongs in this plan.

## Done criteria

- [ ] All seven debug files are deleted and both debug directories are absent.
- [ ] Repository search finds no remaining debug harness route or page name.
- [ ] `sync/_actions.ts` contains no `console.log` or `console.error`.
- [ ] Manual sync behaviour is unchanged and its targeted tests pass.
- [ ] `bun run check` exits 0, removing the 62-error baseline blocker.
- [ ] `bun run typecheck`, `bun run test`, `bun run test:integration` and
      `bun run build` exit 0.
- [ ] `git diff --check` exits 0.
- [ ] Before the plan-index update, `git status --short` lists only seven
      deleted debug files and the one in-scope sync action modification.
- [ ] The executor commits the work and updates the plan index only if the
      reviewer has not reserved that responsibility.

## STOP conditions

Stop and report if:

- Any production import, navigation, test or operational script calls one of
  the debug routes.
- The operator requires a permanent diagnostics surface. That needs a separate
  design with explicit owner/admin authorisation, two-key tenant scope,
  read-only defaults and audited mutations.
- Removing the files changes a production sync test or requires altering manual
  sync behaviour.
- `bun run check` still fails after the seven deletions and three console
  removals. Report the remaining files without adding them to scope.
- A required integration suite skips because `DATABASE_URL` is unavailable.

## Maintenance notes

- A route group's name does not authorise a route handler. Every route that
  reads or writes protected data needs an explicit resource-level auth check and
  both tenant keys.
- Never commit one-off verification routes containing fixed customer or tenant
  identifiers. Use tests, disposable local scripts outside shipped route trees,
  or an explicitly designed admin diagnostic surface.
- After this plan lands, re-run all plan 052 gates on `main`. Resume plan 053 at
  its Step 5 on a base that includes this plan.
