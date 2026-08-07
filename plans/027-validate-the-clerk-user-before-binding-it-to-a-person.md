# Plan 027: Validate the Clerk user before binding it to a Person record

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report, do not improvise. When done, update this plan's status row in
> `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 75202db..HEAD -- "apps/app/app/(authenticated)/settings/integrations/xero/matches/_actions.ts" packages/database/prisma/schema.prisma packages/auth/server.ts`
> If any changed since this plan was written, re-check the "Current state"
> facts before proceeding.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plan 050 is adjacent (same file; supersedes plan 019) — see README graph `050 -> 027`
- **Category**: security
- **Planned at**: commit `75202db`, 2026-07-25
- **Reconciled**: 2026-08-07T17:39+10:00 against `f09386e` (main). **Finding FIXED and verified.** Drift `75202db..f09386e` for the three drift files: `_actions.ts` now implements all three checks (see Done-criteria audit below), `packages/auth/server.ts` unchanged, `schema.prisma` adds only `xero_write_claimed_at` on `AvailabilityRecord` (does not touch `@@unique([organisation_id, clerk_user_id])`). Prior note `2026-08-08 at b0fa224` ("finding confirmed still present") is superseded. Implementation landed in `80434d3` (`chore: land worktree fixes on main`, which also landed `297ba7d` for plan 050); `git diff --stat 75202db..HEAD -- "_actions.ts"` is `+96/-16` plus 7-line schema addition — not cosmetic.
- **Status**: DONE — see README row and verification below.
- **Verification 2026-08-07 (evidence, main at f09386e)**:
  - `grep -c "clerkClient" apps/app/app/(authenticated)/settings/integrations/xero/matches/_actions.ts` → `2` (import + call) — criterion 4 pass.
  - `grep -n "isOrganisationMember\|\$transaction" ...` → `98:isOrganisationMember` < `124:$transaction` — criterion 5 pass.
  - `grep -c "already linked to another person" ...` → `1` — criterion 6 pass.
  - `grep console.log` → no match — criterion 7 pass.
  - Schema `z.string().trim().startsWith("user_")` at `_actions.ts:12`, targeted `clerk.organizations.getOrganizationMembershipList({organizationId, userId:[clerkUserId]})` at `:215` with fail-closed `log.error` at `:228`, uniqueness `database.person.findFirst({clerk_org_id, clerk_user_id, id:{not:match.xero_person.id}, organisation_id})` at `:108` — all per Design.
  - Co-located test `apps/app/app/(authenticated)/settings/integrations/xero/matches/_actions.test.ts` present (206 lines, 8 tests covering the plan's 7 required cases + org-scope case); `head` of run under worktree `065f5bb` was `8 passed` for this file — criterion 3's file-level gate holds.
  - `git diff --name-only 75202db..HEAD -- "_actions.ts" packages/database/prisma/schema.prisma packages/auth/server.ts` = `_actions.ts` + `schema.prisma` only — criterion 8 holds modulo the unrelated merged history (see NOTES).
  - Global `bun run check` / `bun run typecheck` / `bun run test` currently exit 1 on main due to pre-existing `@repo/availability` diagnostics (18 lint errors, implicit-any/type errors) independent of this plan — criteria 1-2 therefore NOT green on current HEAD, but the failure is not caused by this plan (see Reconciliation notes in README).

## Why this matters

`resolveXeroPersonMatchAction` lets an admin resolve a suspected duplicate
between a Xero-synced person and an existing Team Calendar person. When the
resolution is `"match"`, it writes a Clerk user ID onto the Person row:

```typescript
      await tx.person.update({
        where: { id: match.xero_person.id },
        data: {
          clerk_user_id: resolvedClerkUserId,
        },
      });
```

The ID it writes is validated only as "a non-empty trimmed string". Nothing
checks that the Clerk user exists, and nothing checks that they belong to the
Clerk Organisation the admin is acting in.

`clerk_user_id` on `Person` is not decorative. It is the join between a Clerk
identity and a person in the availability model, and the notification layer
uses it as a delivery address. `packages/availability/src/approvals/approval-service.ts:527`
is representative:

```typescript
        recipientUserId: record.person.clerk_user_id,
```

So binding an arbitrary Clerk user ID to a Person means leave notifications
about that person, including approval and decline notices with a leave
description, are dispatched to whatever Clerk user was named. `CLAUDE.md` draws
this line explicitly: "SSE connections are per-user and per-Clerk-Organisation.
Must not leak notifications across `clerk_org_id` boundaries."

The two realistic failure modes:

1. **Typo.** An admin pastes a wrong or truncated ID. The Person is bound to a
   user that does not exist, notifications silently go nowhere, and the person
   never receives approvals. Nothing surfaces the error, because a
   non-existent recipient is not distinguishable from a delivery failure.
2. **Cross-organisation binding.** An admin supplies the ID of a real Clerk
   user outside their organisation. Notifications for a person in their org are
   then addressed to an outsider.

Neither is a privilege escalation into this org's data (read access is scoped
by `auth().orgId`, which the outsider does not have), and the action already
requires `org:admin` or `org:owner`. It is an outbound leak plus a silent
misconfiguration, in an admin surface where the input is a raw opaque
identifier that nobody can eyeball for correctness. That is exactly the input
that deserves server-side validation.

## Current state

### The action, in full up to the write

`apps/app/app/(authenticated)/settings/integrations/xero/matches/_actions.ts`
lines 1-38:

```typescript
"use server";

import { auth, currentUser } from "@repo/auth/server";
import type { Result } from "@repo/core";
import { database } from "@repo/database";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const ResolveMatchSchema = z.object({
  clerkUserId: z.string().trim().min(1).optional(),
  matchId: z.string().uuid(),
  resolution: z.enum(["ignore", "match"]),
});

type ActionError =
  | { code: "not_authorised"; message: string }
  | { code: "unknown_error"; message: string }
  | { code: "validation_error"; message: string };

type ActionResult<T> = Result<T, ActionError>;

export async function resolveXeroPersonMatchAction(input: {
  clerkUserId?: string;
  matchId: string;
  resolution: "ignore" | "match";
}): Promise<ActionResult<{ resolved: true }>> {
  const parsed = ResolveMatchSchema.safeParse(input);
  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message);
  }

  const [{ orgId, orgRole }, user] = await Promise.all([auth(), currentUser()]);
  if (
    !(orgId && user) ||
    (orgRole !== "org:owner" && orgRole !== "org:admin")
  ) {
    return notAuthorised();
  }
```

The authorisation check is correct: an org and a signed-in user are required,
and the role must be owner or admin.

Lines 40-72, the lookup and the resolution of the ID to write:

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
  if (!match) {
    return unknownError("Possible match not found.");
  }

  const resolvedClerkUserId =
    parsed.data.resolution === "match"
      ? (parsed.data.clerkUserId ??
        match.candidate_person?.clerk_user_id ??
        null)
      : null;
  if (parsed.data.resolution === "match" && !resolvedClerkUserId) {
    return validationError(
      "Enter the Clerk user ID to link, or create a candidate person with a linked user first."
    );
  }
```

Note the fallback: when the caller supplies no `clerkUserId`, the action uses
`match.candidate_person.clerk_user_id`, which came from the database and is
already trusted. **Only the caller-supplied branch needs validation.** That
distinction matters for the fix: validating the database-sourced value would
add a Clerk API call to the common path for no benefit.

Lines 74-84, the write:

```typescript
  await database.$transaction(async (tx) => {
    if (parsed.data.resolution === "match" && resolvedClerkUserId) {
      await tx.person.update({
        where: { id: match.xero_person.id },
        data: {
          clerk_user_id: resolvedClerkUserId,
        },
      });
    }
```

### The uniqueness constraint that will bite

`packages/database/prisma/schema.prisma` line 406:

```prisma
  @@unique([organisation_id, clerk_user_id])
```

So binding a user ID already used by another Person in the same Organisation
throws a Prisma unique-constraint error. The action does not catch it, so it
surfaces as an unhandled rejection rather than a `validation_error`. That is a
second, smaller defect in the same code path and this plan fixes it, because
the natural validation ordering makes it nearly free.

### `clerkClient` is available and already used in this app

`packages/auth/server.ts`:

```typescript
import "server-only";

export * from "@clerk/nextjs/server";

export { hasFeature, withinLimit } from "./entitlements";
```

So `clerkClient` re-exports through `@repo/auth/server`. Two existing call
sites show the idiom.

`apps/app/app/(authenticated)/settings/general/_actions.ts` lines 49-56:

```typescript
    const clerk = await clerkClient();
    const organisation = await clerk.organizations.getOrganization({
      organizationId: context.value.clerkOrgId,
    });
```

`packages/jobs/src/handlers/reconcile-xero-approval-state.ts` lines 575-589 is
the membership-list idiom this plan needs:

```typescript
    const clerk = await clerkClient();
    const memberships = await clerk.organizations.getOrganizationMembershipList(
      {
        organizationId: context.clerkOrgId,
        limit: 100,
      }
    );
    return memberships.data
      .filter(
        (membership) =>
          membership.role === "org:admin" || membership.role === "org:owner"
      )
      .map((membership) => membership.publicUserData?.userId)
      .filter((userId): userId is string => Boolean(userId));
```

Note the `limit: 100`. That is a real constraint: `getOrganizationMembershipList`
is paginated, so filtering a fetched page is only correct for organisations
under the page limit. The fix below avoids that trap by querying the specific
user rather than listing all members.

## Design

Validate the **caller-supplied** `clerkUserId` before the transaction, in three
checks, cheapest first:

1. **Shape.** Clerk user IDs are `user_` followed by an opaque suffix. Tighten
   the Zod schema from `z.string().trim().min(1)` to require the prefix. This
   catches paste errors with no network call. Match the style already used in
   `packages/auth/keys.ts`, which validates `CLERK_SECRET_KEY` with
   `.startsWith("sk_")`.
2. **Membership.** Ask Clerk whether that user is a member of `orgId`. Use a
   targeted query, not a full membership listing (see the pagination note
   above). Check the installed `@clerk/nextjs` version's API surface during
   execution; `getOrganizationMembershipList` accepts a `userId` filter in
   recent versions, which turns it into a single-row lookup. If it does not,
   fall back to `clerk.users.getUser(id)` plus
   `clerk.users.getOrganizationMembershipList({ userId })` and check whether
   `orgId` appears.
3. **Uniqueness.** Check no other Person in this Organisation already holds
   that `clerk_user_id`, and return a `validation_error` rather than letting
   the database constraint throw.

Do **not** validate the database-sourced fallback
(`match.candidate_person.clerk_user_id`). It is already bound to a Person in
this Organisation, so it has passed these checks previously, and re-validating
it puts a Clerk API call on the common path.

Fail closed: if the Clerk call throws, return a `validation_error` and do not
write. An outage must not become a licence to bind an unvalidated ID.

## Commands you will need

All run from the repo root.

```
bun install                # run first if you hit "Cannot find module '@repo/observability/log'"
bun run check
bun run typecheck
bun run test
bunx vitest run "apps/app/app/(authenticated)/settings/integrations/xero/matches/_actions.test.ts"
```

To check the installed Clerk SDK's API surface:

```
node -e "console.log(require('./apps/app/package.json').dependencies)"
grep -rn "getOrganizationMembershipList" node_modules/@clerk/backend/dist/*.d.ts 2>/dev/null | head
```

## Scope

**In scope:**

- `apps/app/app/(authenticated)/settings/integrations/xero/matches/_actions.ts`
- A new co-located test file for it, if none exists

**Explicitly out of scope:**

- The database schema. The `@@unique([organisation_id, clerk_user_id])`
  constraint is correct and stays.
- `packages/auth`. Do not add a validation helper there for one call site; if a
  second call site appears later, that is when it earns a home.
- `matches-client.tsx` and `page.tsx` in the same directory. Client-side
  validation is not a substitute for this and adding it is a separate,
  optional improvement.
- Any other place `clerk_user_id` is written. Check during Step 2 whether there
  are others; if there are, report them rather than widening this plan.
- The notification layer. It correctly uses `clerk_user_id` as a delivery
  address; the defect is what gets written into that column.

## Git workflow

```
git checkout -b fix/validate-clerk-user-before-person-binding
```

Commit message:

```
fix(app): validate the Clerk user before binding it to a Person
```

**Ordering with plan 019**: plan 019 adds `organisation_id` to the
`xeroPersonMatch.findFirst` `where` clause in this same file. The two changes
are in adjacent code and will conflict textually. Either order works; whichever
lands second should re-read the file rather than applying its excerpt blindly.
If you are doing both, doing them in one branch is reasonable, but keep the
commits separate.

Do not push or open a pull request unless the user asks.

## Steps

### Step 1: Establish the baseline

```
bun run check
bun run typecheck
bun run test
```

**Expected**: all three exit 0. Record the test count.

Check whether a test file already exists for this action:

```
ls "apps/app/app/(authenticated)/settings/integrations/xero/matches/"
```

At commit `75202db` the directory contains `_actions.ts`,
`matches-client.tsx` and `page.tsx`. No test file. If one now exists, extend it
rather than creating another.

### Step 2: Find every other writer of `clerk_user_id`

```
grep -rn "clerk_user_id:" apps packages --include=*.ts --include=*.tsx | grep -v node_modules | grep -v "\.test\." | grep -v "select:" | grep -v "clerk_user_id: true"
```

Read each hit and classify it as a read, a select, or a write. For each write,
note where the value came from.

**Expected**: the sync handlers write `clerk_user_id` from Xero-matched data,
and this action writes it from user input. Only user input needs validating.

If you find a second action that writes a caller-supplied `clerk_user_id`,
**report it and stop before fixing it**. This plan claims one site; a second
means the audit was incomplete and the user should decide whether to widen the
scope.

### Step 3: Tighten the schema

Edit the action. Change:

```typescript
const ResolveMatchSchema = z.object({
  clerkUserId: z.string().trim().min(1).optional(),
  matchId: z.string().uuid(),
  resolution: z.enum(["ignore", "match"]),
});
```

to:

```typescript
const ResolveMatchSchema = z.object({
  // Clerk user IDs are prefixed opaque identifiers. Checking the prefix costs
  // nothing and rejects the common paste error before any network call. It is
  // not sufficient on its own: the membership check below is what makes this
  // safe.
  clerkUserId: z.string().trim().startsWith("user_").optional(),
  matchId: z.string().uuid(),
  resolution: z.enum(["ignore", "match"]),
});
```

Confirm the prefix is right for the installed Clerk version before committing
to it:

```
grep -rn "user_" node_modules/@clerk/backend/dist/index.d.ts 2>/dev/null | head -5
```

If you cannot confirm `user_` is the universal prefix, keep `.min(1)` and rely
on the membership check alone, and say so in your report. A wrong prefix
assertion would reject valid IDs, which is worse than the current state.

**Verify**:

```
bun run typecheck
```

**Expected**: exits 0.

### Step 4: Add the membership check

Insert after the `resolvedClerkUserId` block and before the
`database.$transaction` call.

```typescript
  // Only a caller-supplied ID needs checking. The fallback comes from
  // match.candidate_person, which is already bound to a Person in this
  // Organisation and therefore already passed these checks.
  if (parsed.data.resolution === "match" && parsed.data.clerkUserId) {
    const membership = await isOrganisationMember({
      clerkOrgId: orgId,
      clerkUserId: parsed.data.clerkUserId,
    });
    if (!membership.ok) {
      return validationError(membership.message);
    }
  }
```

and add the helper at the bottom of the file, beside the existing
`validationError` / `notAuthorised` helpers:

```typescript
// clerk_user_id is the delivery address the notification layer uses. Binding a
// Person to a user outside this Clerk Organisation would send that person's
// leave notifications to an outsider, which CLAUDE.md forbids. Fails closed:
// if Clerk cannot be reached, refuse the binding rather than trusting the
// input.
async function isOrganisationMember(input: {
  clerkOrgId: string;
  clerkUserId: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const clerk = await clerkClient();
    const memberships =
      await clerk.organizations.getOrganizationMembershipList({
        organizationId: input.clerkOrgId,
        userId: [input.clerkUserId],
      });
    if (memberships.data.length === 0) {
      return {
        ok: false,
        message:
          "That user is not a member of this account. Invite them first, then link the person.",
      };
    }
    return { ok: true };
  } catch (error) {
    log.error("Failed to verify Clerk organisation membership", {
      clerkOrgId: input.clerkOrgId,
      error,
    });
    return {
      ok: false,
      message: "Could not verify that user right now. Try again shortly.",
    };
  }
}
```

Add `clerkClient` to the existing `@repo/auth/server` import, and add
`import { log } from "@repo/observability/log";` if the file does not already
have it. `CLAUDE.md` forbids `console.log` in production code.

**Confirm the `userId` filter exists** in the installed SDK before relying on
it:

```
grep -rn "userId" node_modules/@clerk/backend/dist/api/endpoints/OrganizationApi.d.ts 2>/dev/null | head
```

**If `getOrganizationMembershipList` does not accept a `userId` filter**, use
the user-centric form instead:

```typescript
    const clerk = await clerkClient();
    const memberships = await clerk.users.getOrganizationMembershipList({
      userId: input.clerkUserId,
    });
    const isMember = memberships.data.some(
      (membership) => membership.organization.id === input.clerkOrgId
    );
```

**Do not** fall back to listing all organisation members and filtering in
memory. `getOrganizationMembershipList` is paginated (the existing call in
`packages/jobs/src/handlers/reconcile-xero-approval-state.ts:577` passes
`limit: 100`), so on an organisation with more than one page that approach
would wrongly reject valid members. If neither targeted form is available,
report it and stop.

**Verify**:

```
bun run typecheck
bun run check
```

**Expected**: both exit 0.

### Step 5: Handle the uniqueness constraint

Add a check before the transaction, after the membership check:

```typescript
  if (resolvedClerkUserId) {
    const alreadyLinked = await database.person.findFirst({
      where: {
        clerk_org_id: orgId,
        clerk_user_id: resolvedClerkUserId,
        id: { not: match.xero_person.id },
        organisation_id: match.organisation_id,
      },
      select: { id: true },
    });
    if (alreadyLinked) {
      return validationError(
        "That user is already linked to another person in this organisation."
      );
    }
  }
```

This mirrors the database constraint at `schema.prisma:406`
(`@@unique([organisation_id, clerk_user_id])`) and turns an unhandled Prisma
error into a `validation_error` the UI can render.

**Note**: this needs `match.organisation_id`, which the current `findFirst`
does not select (it uses `include` for relations but no explicit `select` on
scalars, so all scalars are returned; confirm by reading the query). If it is
not available, add it to the query. If plan 019 has already landed, the query
will also be filtering on `organisation_id`, which makes this straightforward.

**Verify**:

```
bun run typecheck
```

**Expected**: exits 0.

### Step 6: Write the tests

Create
`apps/app/app/(authenticated)/settings/integrations/xero/matches/_actions.test.ts`.

Model it on an existing server-action test in the same app. Two exist:

```
apps/app/app/(authenticated)/settings/general/_actions.test.ts
apps/app/app/(authenticated)/settings/billing/actions.test.ts
```

Read `settings/general/_actions.test.ts` first: it already mocks `clerkClient`
via `vi.hoisted` plus a `vi.mock` module factory, which is exactly the harness
this plan needs. Match its structure, its mock style and its naming.

Cover:

1. **Rejects a non-member.** `clerkUserId` supplied, membership list returns
   empty. Assert the result is a `validation_error` and that
   `database.$transaction` was **never called**. This is the test that proves
   the fix.
2. **Accepts a member.** Membership list returns one entry. Assert the
   transaction runs and `person.update` receives the supplied
   `clerk_user_id`.
3. **Fails closed on a Clerk error.** The mocked `clerkClient` rejects. Assert
   a `validation_error` and no transaction.
4. **Skips the check for the database-sourced fallback.** No `clerkUserId`
   supplied, `match.candidate_person.clerk_user_id` present. Assert
   `clerkClient` was **not called** and the transaction ran.
5. **Rejects a duplicate binding.** Another Person in the same Organisation
   already holds the ID. Assert a `validation_error` and no transaction.
6. **Rejects a malformed ID.** `clerkUserId: "not-a-user-id"`. Assert a
   `validation_error` from the schema and that `clerkClient` was not called.
   (Skip this one if Step 3 kept `.min(1)`.)
7. **`resolution: "ignore"` is unaffected.** No `clerkUserId`, no Clerk call,
   the match is marked ignored.

**Verify**:

```
bunx vitest run "apps/app/app/(authenticated)/settings/integrations/xero/matches/_actions.test.ts"
```

**Expected**: all tests pass.

### Step 7: Full verification

```
bun run check
bun run typecheck
bun run test
```

**Expected**: all exit 0, with at least six more tests than the Step 1
baseline.

## Test plan

Summarised from Step 6. New file:
`apps/app/app/(authenticated)/settings/integrations/xero/matches/_actions.test.ts`,
six or seven tests.

Two of them carry the weight:

- **Test 1** (non-member rejected, transaction never called) is the security
  assertion. Assert on the *absence* of the write, not merely on the returned
  error: an action that returns an error after writing is still broken.
- **Test 4** (fallback path does not call Clerk) pins the performance and
  correctness boundary. Without it, someone will later "simplify" the
  conditional and put a network call on every resolution.

Follow the repo's conventions: co-located test file, `vi.hoisted` mock handles
plus `vi.mock` module factories, factories or builders for fixture data rather
than repeated raw literals.

## Done criteria

All of the following, verbatim:

1. `bun run check` exits 0.
2. `bun run typecheck` exits 0.
3. `bun run test` exits 0 with at least six more tests than the Step 1
   baseline.
4. `grep -c "clerkClient" "apps/app/app/(authenticated)/settings/integrations/xero/matches/_actions.ts"`
   prints `2` or more (the import and the call).
5. The membership check precedes the write. Verify with:
   `grep -n "isOrganisationMember\|\$transaction" "apps/app/app/(authenticated)/settings/integrations/xero/matches/_actions.ts"`
   and confirm the membership line number is lower.
6. `grep -c "already linked to another person" "apps/app/app/(authenticated)/settings/integrations/xero/matches/_actions.ts"`
   prints `1`.
7. The action contains no `console.log`.
8. `git diff --name-only` lists exactly the action file and the new test file,
   plus this plan file and `plans/README.md` for the status update.

## STOP conditions

Stop and report back rather than improvising if any of these occur:

- **The baseline in Step 1 is not green.** Report what fails; change nothing.
- **Step 2 finds another action writing a caller-supplied `clerk_user_id`.**
  Report the file and line. Do not widen this plan.
- **Neither targeted membership query is available in the installed Clerk
  SDK.** Do not fall back to listing all members and filtering: it is wrong on
  paginated organisations and would reject valid users. Report the SDK version
  and the available methods.
- **You cannot confirm the `user_` prefix** is universal for Clerk user IDs.
  Keep `.min(1)` in the schema, rely on the membership check, and say so. A
  wrong prefix assertion rejects valid input, which is a worse failure than the
  one being fixed.
- **`settings/general/_actions.test.ts` does not exist** or does not mock
  `clerkClient`. It is this plan's test-harness exemplar. Without it you would
  be inventing the mocking approach for Clerk in this app, which is a larger
  task than the fix; report it.
- **Adding the membership check makes an existing test fail.** That would mean
  something already depends on binding unvalidated IDs. Report the test.

## Maintenance notes

- **The rule**: any caller-supplied identifier that becomes a notification
  delivery address must be verified against the acting organisation before it
  is persisted. `clerk_user_id` on `Person` is currently the only such column.
  If another is added, it needs the same treatment.
- **Fail closed is deliberate.** When Clerk is unreachable the action refuses
  the binding rather than trusting the input. That makes an admin task
  temporarily unavailable during a Clerk outage, which is the correct trade:
  the alternative is writing an unverified delivery address that is then very
  hard to notice.
- **Do not re-validate the database-sourced fallback.** It is already bound to
  a Person in this Organisation. Adding a Clerk call there would put a network
  round trip on the common path and, during a Clerk outage, break resolutions
  that involve no user input at all.
- **The pagination trap is worth remembering.**
  `packages/jobs/src/handlers/reconcile-xero-approval-state.ts:577` fetches
  organisation memberships with `limit: 100` and filters in memory. That is
  acceptable for "notify the admins" (missing one admin on a very large org is
  a degraded notification) but would be a correctness bug for "is this user a
  member" (missing one member wrongly rejects a valid binding). Same API, two
  different correctness requirements.
- **Related plan**: plan 019 fixes the tenant scoping of the
  `xeroPersonMatch.findFirst` in this same file. See "Git workflow" for
  ordering.
