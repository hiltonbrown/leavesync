# Plan 036: Stop returning a cross-tenant existence oracle to callers

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report, do not improvise. When done, update this plan's status row in
> `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 75202db..HEAD -- packages/feeds/src/feed-service.ts packages/feeds/src/tokens/token-service.ts packages/availability/src/calendar/calendar-service.ts packages/feeds/index.integration.test.ts`
> If any changed since this plan was written, re-check the "Current state"
> facts before proceeding.

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `75202db`, 2026-07-25

## Why this matters

Several services distinguish "this record does not exist" from "this record
exists but belongs to another organisation", and return that distinction to the
caller as a `cross_org_leak` error code that reaches the browser.

The implementation is explicit about it. `feedNotFoundOrLeak` runs a
deliberately **unscoped** lookup by id and branches on the tenant columns:

```typescript
  const exists = await client.feed.findFirst({
    where: { id: input.feedId },
    select: { clerk_org_id: true, organisation_id: true },
  });
  if (
    exists &&
    (exists.clerk_org_id !== input.clerkOrgId ||
      exists.organisation_id !== input.organisationId)
  ) {
    return {
      ok: false,
      error: {
        code: "cross_org_leak",
        message: "Feed is outside this organisation.",
      },
    };
  }
```

So a caller who supplies an arbitrary feed id learns whether a feed with that
id exists anywhere in the system, across every customer. The same shape exists
for feed tokens (`tokenNotFoundOrLeak`) and the error code is declared in at
least six other services.

**The intent behind this is good.** Detecting that someone asked for a resource
in another tenant is genuinely valuable: it is the signal that distinguishes a
stale bookmark from a compromised session or a probing client. The mistake is
where the signal goes. It should be logged and alertable server-side, not
returned to the party doing the asking.

**How bad is it?** Low, and it should be reported as low. Feed and token ids
are UUIDv4, so there is nothing to enumerate: an attacker cannot walk the id
space in any useful time, and confirming that a random UUID exists somewhere
tells them nothing actionable. Every affected call path also sits behind Clerk
authentication and, in most cases, an admin role check. This is a design
principle violated rather than a hole anyone can walk through.

It is worth fixing because it is cheap, because the fix keeps the useful half
of the behaviour, and because the current shape teaches the wrong pattern: the
next service to copy `feedNotFoundOrLeak` will copy the disclosure along with
the detection.

## Current state

### The two implementations

`packages/feeds/src/feed-service.ts` line 937 onwards and
`packages/feeds/src/tokens/token-service.ts` line 436 onwards define
`feedNotFoundOrLeak` and `tokenNotFoundOrLeak`. Both have the same shape.
`token-service.ts`:

```typescript
async function feedNotFoundOrLeak(
  client: Prisma.TransactionClient | typeof database,
  input: { clerkOrgId: string; feedId: string; organisationId: string }
): Promise<Result<never, TokenServiceError>> {
  const exists = await client.feed.findFirst({
    where: { id: input.feedId },
    select: { clerk_org_id: true, organisation_id: true },
  });
  if (
    exists &&
    (exists.clerk_org_id !== input.clerkOrgId ||
      exists.organisation_id !== input.organisationId)
  ) {
    return {
      ok: false,
      error: {
        code: "cross_org_leak",
        message: "Feed is outside this organisation.",
      },
    };
  }
  return {
    ok: false,
    error: { code: "feed_not_found", message: "Feed not found." },
  };
}

async function tokenNotFoundOrLeak(
  tx: Prisma.TransactionClient,
  input: { clerkOrgId: string; organisationId: string; tokenId: string }
): Promise<Result<never, TokenServiceError>> {
  const exists = await tx.feedToken.findFirst({
    where: { id: input.tokenId },
    select: { clerk_org_id: true, organisation_id: true },
  });
  if (
    exists &&
    (exists.clerk_org_id !== input.clerkOrgId ||
      exists.organisation_id !== input.organisationId)
  ) {
    return {
      ok: false,
      error: {
        code: "cross_org_leak",
```

Note both `findFirst` calls are unscoped by design: they must be, to answer the
question they are asking. That is the tell.

### Where it is called

`packages/feeds/src/feed-service.ts` calls `feedNotFoundOrLeak` at lines 555,
699, 820 and 854.

### The code reaches the client

`packages/feeds/src/feed-service.ts` lines 1009-1010 map it through:

```typescript
  if (error.code === "cross_org_leak") {
    return { code: "cross_org_leak", message: error.message };
  }
```

and `apps/app/app/(authenticated)/feeds/_actions.ts` returns service results to
the caller directly, so both the code and the message text reach the browser.

### The code is declared across seven services

```
grep -rn "cross_org_leak" packages apps --include=*.ts | grep -v node_modules
```

At commit `75202db` this finds declarations or uses in:

```
packages/feeds/src/feed-service.ts
packages/feeds/src/tokens/token-service.ts
packages/availability/src/calendar/calendar-service.ts
packages/availability/src/approvals/approval-service.ts
packages/availability/src/dashboard/dashboard-service.ts
packages/availability/src/analytics/leave-reports-service.ts
packages/notifications/src/preferences-service.ts
```

plus assertions in `packages/feeds/index.integration.test.ts` (lines 298, 311,
399), `packages/availability/src/calendar/calendar-service.test.ts` line 253
and `packages/availability/src/people/balance-refresh.test.ts` line 85.

**Read each of the seven before changing anything.** Some may declare the code
in their error union without ever producing it, and some may produce it from a
scoped query (where it means something different and is not an oracle). Only
the ones that perform an unscoped existence check are in scope.

## Design

Keep the detection, stop returning it.

For each site that currently produces `cross_org_leak` from an unscoped lookup:

1. **Log it, at error level, with the tenant context.** This is the valuable
   half and it currently exists only as a return value. A structured log entry
   naming the acting `clerk_org_id`, the acting `organisation_id`, the resource
   type and the resource id is what an operator needs, and it is exactly what a
   Sentry alert can key on.
2. **Return the indistinguishable `not_found` error** to the caller. Same code,
   same message, same timing characteristics as a genuine miss.
3. **Keep the unscoped lookup**, because the log entry needs it. This is not a
   performance-motivated change and removing the query would remove the signal.

The `cross_org_leak` error code can then be deleted from the service error
unions, or retained as an internal-only value that never crosses a service
boundary. **Prefer deletion**: a code that must never be returned is a trap,
and the type system is the only thing that can enforce "never".

Timing side channels are out of scope. The extra query on the miss path makes
the cross-tenant case marginally slower than a plain miss. Closing that would
require constant-time behaviour across a database query, which is not
achievable and not warranted for a UUID-keyed lookup.

## Commands you will need

All run from the repo root.

```
bun install                # run first if you hit "Cannot find module '@repo/observability/log'"
bun run check
bun run typecheck
bun run test
bun run test:integration   # needs DATABASE_URL; the feeds integration tests assert on this code
```

## Scope

**In scope:**

- `packages/feeds/src/tokens/token-service.ts` (`feedNotFoundOrLeak`,
  `tokenNotFoundOrLeak`)
- `packages/feeds/src/feed-service.ts` (`feedNotFoundOrLeak` and the error
  mapping at lines 1009-1010)
- Whichever of the other five services turn out to perform an unscoped
  existence check (determined in Step 2)
- The test files that assert on `cross_org_leak`
- `packages/feeds/index.integration.test.ts`

**Explicitly out of scope:**

- Any query that is already tenant-scoped. Those are correct.
- The authorisation checks in any action or service. This plan changes what a
  refusal *says*, never who is refused.
- `apps/app` UI copy. If a client currently renders a distinct message for
  `cross_org_leak`, it will now render the not-found message; that is the
  intended outcome and needs no separate UI work.
- Timing side channels.
- Adding alerting or Sentry rules. This plan emits the log; wiring an alert to
  it is an operational task.
- Rate limiting on id-guessing. Not warranted for UUIDv4 keys.

## Git workflow

```
git checkout -b fix/no-cross-tenant-existence-oracle
```

Commit message:

```
fix: log cross-tenant access attempts instead of reporting them to the caller
```

Do not push or open a pull request unless the user asks.

## Steps

### Step 1: Establish the baseline

```
bun run check
bun run typecheck
bun run test
bun run test:integration
```

**Expected**: all four exit 0. Record the test count.

The integration suite matters here: `packages/feeds/index.integration.test.ts`
asserts `cross_org_leak` in three places and those assertions will change.

### Step 2: Classify every `cross_org_leak` site

```
grep -rn "cross_org_leak" packages apps --include=*.ts | grep -v node_modules
```

For each hit, open the file and classify it:

- **Producer from an unscoped lookup**: performs a `findFirst`/`findUnique`
  without tenant filters, then branches on the tenant columns. **In scope.**
- **Producer from a scoped lookup**: derives the code some other way. **Read
  carefully.** If it can only occur when the caller's own context is
  inconsistent (rather than when another tenant's row exists), it is not an
  oracle and should be left alone. Report which.
- **Type declaration only**: appears in an error union but is never returned.
  In scope for removal once no producer remains.
- **Test assertion**: in scope for update.

Write the classification down before editing. It is the plan's real scope and
this document can only give you the leads.

### Step 3: Fix `token-service.ts`

Rewrite both helpers. `feedNotFoundOrLeak` becomes:

```typescript
async function feedNotFound(
  client: Prisma.TransactionClient | typeof database,
  input: { clerkOrgId: string; feedId: string; organisationId: string }
): Promise<Result<never, TokenServiceError>> {
  // The lookup is deliberately unscoped: it is how we detect that a caller
  // asked for a resource belonging to another tenant, which is a signal worth
  // alerting on (a stale bookmark looks different from a compromised session).
  // The result is logged, never returned: telling the caller "this exists but
  // not for you" confirms the existence of another tenant's record.
  const exists = await client.feed.findFirst({
    where: { id: input.feedId },
    select: { clerk_org_id: true, organisation_id: true },
  });
  if (
    exists &&
    (exists.clerk_org_id !== input.clerkOrgId ||
      exists.organisation_id !== input.organisationId)
  ) {
    log.error("Cross-tenant resource access attempt", {
      actingClerkOrgId: input.clerkOrgId,
      actingOrganisationId: input.organisationId,
      resourceId: input.feedId,
      resourceType: "feed",
    });
  }
  return {
    ok: false,
    error: { code: "feed_not_found", message: "Feed not found." },
  };
}
```

Do the same for `tokenNotFoundOrLeak`, returning the token-not-found error.

**Do not log the owning tenant's identifiers.** The log should record who
asked and for what, not whose record it was: the operator investigating does
not need another customer's `clerk_org_id` in an entry about this customer's
session, and it would put one tenant's identifiers in another tenant's audit
trail.

Rename the helpers (`feedNotFound`, `tokenNotFound`) so the name no longer
promises a distinction that is not returned. Update the call sites.

Add `import { log } from "@repo/observability/log";` if absent. `CLAUDE.md`
forbids `console.log`.

**Verify**:

```
bun run typecheck
```

**Expected**: type errors at every site that still expects `cross_org_leak` in
the union. That is the compiler enumerating your remaining work; do not
suppress it.

### Step 4: Fix `feed-service.ts`

Apply the same treatment to its `feedNotFoundOrLeak` and to the four call sites
(lines 555, 699, 820, 854).

Then remove the mapping at lines 1009-1010:

```typescript
  if (error.code === "cross_org_leak") {
    return { code: "cross_org_leak", message: error.message };
  }
```

and remove `| { code: "cross_org_leak"; message: string }` from the
`FeedServiceError` union at line 34.

**Verify**:

```
bun run typecheck
grep -c "cross_org_leak" packages/feeds/src/feed-service.ts packages/feeds/src/tokens/token-service.ts
```

**Expected**: typecheck exits 0 (or reports only the remaining services from
Step 2); both greps print `0`.

### Step 5: Fix the other services classified as in scope

Work through the list from Step 2. For each, apply the same shape: log,
return the indistinguishable error, remove the code from the union.

If a service declares `cross_org_leak` in its union but never produces it,
remove the declaration and note it as dead code in your report.

**Verify after each file**:

```
bun run typecheck
```

### Step 6: Update the tests

The existing assertions encode the behaviour being removed, so they must
change. They are also the best place to pin the new behaviour.

`packages/feeds/index.integration.test.ts` lines 298, 311 and 399 assert
`error: { code: "cross_org_leak" }`. Change each to assert the not-found code
**and** add an assertion that it is indistinguishable from a genuine miss:

```typescript
    // A record in another tenant and a record that does not exist must be
    // indistinguishable to the caller. Asserting they are equal, rather than
    // asserting each separately, is what stops the distinction creeping back.
    const otherTenant = await getFeedDetail({ ...ctx, feedId: feedInOtherOrg });
    const nonExistent = await getFeedDetail({ ...ctx, feedId: randomUuid() });
    expect(otherTenant).toEqual(nonExistent);
```

That equality assertion is the durable one. Add the equivalent in
`packages/availability/src/calendar/calendar-service.test.ts` (line 253) and
`packages/availability/src/people/balance-refresh.test.ts` (line 85).

Also add a unit test asserting the log **is** emitted for the cross-tenant
case, so the detection half cannot be deleted as dead code later. Mock
`@repo/observability/log` and assert `log.error` was called with
`resourceType: "feed"`.

**Verify**:

```
bun run test
bun run test:integration
```

**Expected**: both exit 0.

### Step 7: Confirm the code is gone repo-wide

```
grep -rn "cross_org_leak" packages apps --include=*.ts --include=*.tsx | grep -v node_modules
```

**Expected**: no output.

If a hit remains in a service you classified as out of scope in Step 2,
that is fine, but say so explicitly in your report with the reason.

### Step 8: Full verification

```
bun run check
bun run typecheck
bun run test
bun run test:integration
git diff --name-only
```

**Expected**: all four exit 0.

## Test plan

| Test | Why |
|---|---|
| Other-tenant result equals non-existent result, per affected service | The core assertion. Asserting equality rather than two separate codes is what prevents the distinction returning. |
| `log.error` is called with the resource type and the acting tenant on a cross-tenant attempt | Pins the detection half so it is not deleted as unused. |
| `log.error` is **not** called for a genuine miss | Otherwise the log becomes noise and the alert becomes useless. |
| The log payload contains no other tenant's identifiers | One tenant's identifiers must not land in another tenant's audit trail. |
| Existing authorisation tests unchanged | This plan changes what a refusal says, never who is refused. Any change in who is allowed is a defect. |

Follow the repo conventions: co-located test files, `vi.hoisted` plus
`vi.mock`, builders for fixtures.

## Done criteria

All of the following, verbatim:

1. `bun run check` exits 0.
2. `bun run typecheck` exits 0.
3. `bun run test` exits 0 with at least four more tests than the Step 1
   baseline.
4. `bun run test:integration` exits 0.
5. `grep -rn "cross_org_leak" packages apps --include=*.ts --include=*.tsx | grep -v node_modules`
   returns nothing, or returns only sites explicitly classified out of scope
   and named in the report.
6. `grep -c "Cross-tenant resource access attempt" packages/feeds/src/tokens/token-service.ts`
   prints `2` or more (both helpers log).
7. The unscoped `findFirst` calls still exist in both helpers. The detection is
   the point; only the disclosure is removed. Confirm by reading the diff.
8. No `console.log` was added anywhere.
9. `git diff --name-only` lists only files from the "In scope" list.

## STOP conditions

Stop and report back rather than improvising if any of these occur:

- **The baseline in Step 1 is not green.** Report what fails; change nothing.
- **A `cross_org_leak` producer turns out not to be an oracle** (Step 2). Some
  may derive the code from a scoped query, where it means "the caller's own
  context is inconsistent" rather than "another tenant owns this". Report which
  and leave them alone; removing a legitimate diagnostic is not an improvement.
- **A client component branches on `cross_org_leak`** and renders something
  meaningfully different. Report what it renders. The intended outcome is that
  it renders the not-found state, but if the UI does something a user depends
  on, the user should decide.
- **Removing the code from a union cascades into more than a handful of
  files.** Report the count. It may be better to retain the code as an
  internal-only value with a comment, and the user should choose.
- **An authorisation test changes result.** That would mean this plan altered
  who is allowed to do something, which it must not. Stop immediately and
  report.
- **`log.error` is not available** in a service being changed. Check the
  package's dependencies before adding `@repo/observability`; adding a
  dependency edge is a bigger decision than this plan makes.

## Maintenance notes

- **The principle**: detection belongs in the log, not in the response. A
  service can know that a request crossed a tenant boundary and must not tell
  the requester that it did. Any future helper named `somethingNotFoundOrLeak`
  is reproducing the pattern this plan removes.
- **The unscoped query is deliberate and must stay.** Someone reading
  `findFirst({ where: { id } })` with no tenant filter will reasonably flag it
  as a scoping bug. The comment added in Step 3 is what stops that; keep it
  accurate if the helper moves.
- **The equality assertion is the durable test.** Asserting "other tenant
  returns not_found" passes even if a distinguishing detail creeps back into the
  message or the payload. Asserting "other tenant result equals non-existent
  result" does not.
- **The log is only useful if something watches it.** This plan emits a
  structured error-level entry with a stable message. Wiring a Sentry alert to
  it is a separate, worthwhile task: a spike in cross-tenant attempts for one
  `clerk_org_id` is one of the few signals that distinguishes a compromised
  session from ordinary use.
- **Severity was assessed as low and should be reported that way.** UUIDv4 keys
  mean there is nothing to enumerate, and every path is authenticated. If this
  is ever written up, resist inflating it: the fix is worth doing on principle
  and on maintainability grounds, not because anyone can exploit it.
- **Related plans**: 019 (two genuine tenant-scoping gaps in server actions),
  032 (encrypted Xero tokens reaching the browser), 027 (validating a
  caller-supplied Clerk user id). All four are tenancy-boundary work.
