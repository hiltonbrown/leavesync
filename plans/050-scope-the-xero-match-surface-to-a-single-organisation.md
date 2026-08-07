# Plan 050: Scope the Xero person-match surface to a single Organisation

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report, do not improvise. When done, update this plan's status row in
> `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat a56fe58..HEAD -- "apps/app/app/(authenticated)/settings/integrations/xero/matches/page.tsx" "apps/app/app/(authenticated)/settings/integrations/xero/matches/matches-client.tsx" "apps/app/app/(authenticated)/settings/integrations/xero/matches/_actions.ts"`
> If any changed since this plan was written, re-check the "Current state"
> facts before proceeding.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: none to execute, but see "Ordering with plan 027" below —
  plan 027 touches the same `_actions.ts` file and whoever lands second must
  re-read the file rather than apply its excerpt blindly.
- **Category**: security
- **Planned at**: commit `a56fe58`, 2026-08-07

## Why this matters

This is the follow-up to plan 019's Gap 2, which that plan's executor
correctly declined to fix because closing it required touching files outside
plan 019's declared scope. This plan widens the scope on purpose, with an
explicit product decision already made: **the Xero person-match surface
should be scoped to a single Organisation, the same way `/feeds` and
`/settings/general` already are, not to the whole Clerk Organisation.**

`CLAUDE.md`'s tenancy model states the reason directly: "A Clerk Org with two
Xero files has two Organisation rows, two XeroConnections, two XeroTenants,"
and every tenant-scoped query "must filter by `clerk_org_id`" **and**
`organisation_id`. Today, three places in this feature only apply the first
half of that:

1. `matches/page.tsx` lists every pending match across every Organisation the
   Clerk Org owns.
2. `matches/matches-client.tsx` never knows which Organisation a match belongs
   to, so it cannot tell the action.
3. `matches/_actions.ts`'s `resolveXeroPersonMatchAction` looks up the match by
   `clerk_org_id` alone, and then writes to `Person` and `XeroPersonMatch` rows
   resolved that way.

The realistic impact, same framing as plan 019: an `org:admin` on a Clerk
Organisation with two Xero files (e.g. "Acme Restaurants" and "Acme Hotels",
per the `CLAUDE.md` example) currently sees and can resolve match records for
*both* payroll entities from one screen, and the write goes through even
though the two Organisations are meant to be separate scopes. This plan makes
the surface behave like the rest of the app: one Organisation at a time,
selected the same way `/feeds` and `/settings/general` already do it.

## Current state

### `page.tsx`, in full (58 lines)

`apps/app/app/(authenticated)/settings/integrations/xero/matches/page.tsx`:

```tsx
import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import type { Metadata } from "next";
import { requirePageRole } from "@/lib/auth/require-page-role";
import { SettingsSectionHeader } from "../../../components/settings-section-header";
import { MatchesClient } from "./matches-client";

export const metadata: Metadata = {
  description:
    "Review possible matches between Xero people and existing manual people.",
  title: "Xero Person Matches - Settings - Team Calendar",
};

export default async function XeroMatchesPage() {
  await requirePageRole("org:admin");

  const { orgId } = await auth();
  if (!orgId) {
    throw new Error("Organisation context is required.");
  }

  const matches = await database.xeroPersonMatch.findMany({
    include: {
      candidate_person: {
        select: {
          clerk_user_id: true,
          email: true,
          first_name: true,
          id: true,
          last_name: true,
        },
      },
      xero_person: {
        select: {
          email: true,
          first_name: true,
          id: true,
          last_name: true,
        },
      },
    },
    orderBy: [{ created_at: "asc" }, { id: "asc" }],
    where: {
      clerk_org_id: orgId,
      status: "pending",
    },
  });

  return (
    <div className="space-y-6">
      <SettingsSectionHeader
        description="Possible matches are never merged automatically. Review and resolve each one explicitly."
        title="Xero Person Matches"
      />
      <MatchesClient matches={matches} />
    </div>
  );
}
```

No `searchParams`, no `organisation_id` in the `where`.

### `matches-client.tsx`, the two call sites (lines 86-118)

`apps/app/app/(authenticated)/settings/integrations/xero/matches/matches-client.tsx`:

```tsx
              onClick={() =>
                startTransition(async () => {
                  const result = await resolveXeroPersonMatchAction({
                    clerkUserId:
                      clerkUserIds[match.id] ??
                      match.candidate_person?.clerk_user_id ??
                      undefined,
                    matchId: match.id,
                    resolution: "match",
                  });
                  ...
```

and the "Keep separate" button, same shape, `resolution: "ignore"`. Neither
call includes an `organisationId`. `MatchesClientProps` (lines 17-27) takes
only `matches`.

### `_actions.ts`, the lookup (lines 22-58)

`apps/app/app/(authenticated)/settings/integrations/xero/matches/_actions.ts`:

```typescript
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

  const match = await database.xeroPersonMatch.findFirst({
    include: {
      candidate_person: { select: { clerk_user_id: true, id: true } },
      xero_person: { select: { id: true } },
    },
    where: {
      clerk_org_id: orgId,
      id: parsed.data.matchId,
    },
  });
  if (!match) {
    return unknownError("Possible match not found.");
  }
  // ...transaction writes to Person and XeroPersonMatch using match.xero_person.id
  // and match.id, both resolved from the under-scoped read above.
```

`ResolveMatchSchema` (lines 9-13) has no `organisationId` field.

### The exemplar to copy: `/settings/general`

`apps/app/app/(authenticated)/settings/general/page.tsx`, lines 13-27:

```tsx
interface GeneralPageProps {
  searchParams: Promise<{
    org?: string;
  }>;
}

const GeneralPage = async ({ searchParams }: GeneralPageProps) => {
  await requirePageRole("org:admin");

  const { org: orgParam } = await searchParams;
  const [{ orgId }, { clerkOrgId, organisationId }] = await Promise.all([
    auth(),
    requireActiveOrgPageContext(orgParam),
  ]);
```

`apps/app/app/(authenticated)/feeds/page.tsx` does the same thing for a page
whose data query needs `organisation_id` (lines 22-38):

```tsx
const FeedPage = async ({ searchParams }: FeedPageProps) => {
  await requirePageRole("org:viewer");
  const params = await searchParams;
  const { orgRole } = await auth();
  const user = await currentUser();
  const { org, ...filterParams } = params;
  const orgParam = Array.isArray(org) ? org[0] : org;
  const { clerkOrgId, organisationId } =
    await requireActiveOrgPageContext(orgParam);
```

`requireActiveOrgPageContext` (`apps/app/lib/server/require-active-org-page-context.ts`,
in full, 66 lines) resolves `organisationId` from the `?org=` query param if
present, validating it against the Clerk Org via `getActiveOrgContext`, and
otherwise falls back to the caller's first/default Organisation. It calls
Next's `notFound()` internally on an invalid or inaccessible `org` param — it
does not return a `Result`, so pages that use it do not need their own error
branch for that case.

For the **action** (not the page), the pattern is `getActiveOrgContext`
(`apps/app/lib/server/get-active-org-context.ts`, in full, 61 lines), which
*does* return a `Result` and is what `settings/general/_actions.ts` uses
(`resolveAdminContext` there wraps it — read that function in full before
writing Step 4's equivalent). It validates a caller-supplied `organisationId`
against the Clerk Org and role rather than discovering one implicitly — the
action must receive `organisationId` from its caller (the client component),
which is why Step 3 threads it through `matches-client.tsx`.

### Test pattern to copy

`apps/app/app/(authenticated)/settings/general/_actions.test.ts`, lines 1-33,
shows the `vi.hoisted` plus `vi.mock` idiom for mocking `@repo/database`,
`@repo/auth/server`, and `@/lib/server/get-active-org-context` together, plus
a `beforeEach` that sets a default happy-path mock for
`getActiveOrgContext.mockResolvedValue({ ok: true, value: { clerkOrgId:
"org_1", organisationId } })`. Model the new `matches/_actions.test.ts` on it.

## Commands you will need

All run from the repo root.

```
bun install                # run first if you hit "Cannot find module '@repo/observability/log'"
bun run check              # Biome/Ultracite lint (check mode)
bun run typecheck          # tsc --noEmit across the monorepo
```

For tests, use the known-good per-package command, not the root `bun run
test` (root is a known false-negative source under worker starvation — see
`plans/README.md` "How to run tests locally"):

```
cd apps/app && bunx vitest run --maxWorkers=1 --testTimeout=60000
```

Expected baseline before you start: `Test Files 53 passed (53)`, `Tests 175
passed (175)`. Record the count after your changes; it should be baseline plus
the tests you add.

## Scope

**In scope:**

- `apps/app/app/(authenticated)/settings/integrations/xero/matches/page.tsx`
- `apps/app/app/(authenticated)/settings/integrations/xero/matches/matches-client.tsx`
- `apps/app/app/(authenticated)/settings/integrations/xero/matches/_actions.ts`
- `apps/app/app/(authenticated)/settings/integrations/xero/matches/_actions.test.ts` (create)

**Explicitly out of scope:**

- Plan 027's work (validating the Clerk user ID before binding it to a
  Person). Different concern, same file — see "Ordering with plan 027".
- Any change to `requireActiveOrgPageContext` or `getActiveOrgContext`
  themselves. They already do what this plan needs.
- Any organisation-switcher UI component. The `?org=` query param convention
  and whatever renders the switcher already exist and are used by `/feeds`
  and `/settings/general`; this plan only needs the matches page to read that
  same param, not build new UI for it.
- Any schema change or migration.

## Ordering with plan 027

Plan 027 also edits `resolveXeroPersonMatchAction` in `_actions.ts` (it adds
Clerk-user validation before the `Person` write). The two plans touch
adjacent lines in the same function. Either order works; whichever lands
second must re-read the file as it exists rather than applying its own
excerpt blindly, since line numbers will have shifted.

## Git workflow

```
git checkout -b fix/scope-xero-matches-to-organisation
```

Commit message:

```
fix(app): scope the Xero person-match surface to a single Organisation
```

Do not push or open a pull request unless the user asks.

## Steps

### Step 1: Establish the baseline

```
bun run check
bun run typecheck
cd apps/app && bunx vitest run --maxWorkers=1 --testTimeout=60000
```

**Expected**: `check` and `typecheck` exit 0. Test run: `Test Files 53 passed
(53)`, `Tests 175 passed (175)`. If not, go to STOP conditions.

### Step 2: Resolve `organisationId` in the page and scope the listing query

Edit `page.tsx`:

1. Add a `searchParams: Promise<{ org?: string }>` prop, matching
   `GeneralPageProps`'s shape.
2. Import `requireActiveOrgPageContext` from
   `@/lib/server/require-active-org-page-context`.
3. Replace the bare `auth()` call with the same pattern
   `settings/general/page.tsx` uses: resolve `{ org: orgParam }` from
   `searchParams`, then `const { clerkOrgId, organisationId } = await
   requireActiveOrgPageContext(orgParam)`.
4. Add `organisation_id: organisationId` to the `xeroPersonMatch.findMany`
   `where` clause, alongside the existing `clerk_org_id` and `status`.
5. Pass `organisationId` as a new prop to `<MatchesClient />`.

**Verify**:

```
bun run typecheck
grep -n -A8 "database.xeroPersonMatch.findMany" "apps/app/app/(authenticated)/settings/integrations/xero/matches/page.tsx"
```

**Expected**: typecheck exits 0; the printed `where` clause contains
`clerk_org_id`, `organisation_id` and `status`.

### Step 3: Thread `organisationId` through the client component

Edit `matches-client.tsx`:

1. Add `organisationId: string` to `MatchesClientProps`.
2. Destructure it in the component signature alongside `matches`.
3. Add `organisationId` to both `resolveXeroPersonMatchAction(...)` call
   payloads (the "Link to Clerk user" and "Keep separate" buttons).

**Verify**:

```
bun run typecheck
grep -c "organisationId" "apps/app/app/(authenticated)/settings/integrations/xero/matches/matches-client.tsx"
```

**Expected**: typecheck exits 0; count is at least 3 (prop type, destructure,
two call sites — the grep just confirms it's wired, read the diff to confirm
correctness).

### Step 4: Validate and scope the lookup in the server action

Edit `_actions.ts`:

1. Add `organisationId: z.string().uuid()` to `ResolveMatchSchema`, and to the
   exported function's `input` type.
2. After the existing `orgRole` check, resolve and validate the Organisation
   the same way `settings/general/_actions.ts`'s `resolveAdminContext` does:
   call `getActiveOrgContext(parsed.data.organisationId)` (import from
   `@/lib/server/get-active-org-context`) and return its error branch,
   mapped to this file's `ActionError` shape, if `!ok`.
3. Add `organisation_id: context.value.organisationId` to the
   `xeroPersonMatch.findFirst` `where` clause, alongside the existing
   `clerk_org_id` and `id`.
4. Use `context.value.clerkOrgId` in place of the bare `orgId` you already
   had, for consistency with the rest of the function (the `auditEvent.create`
   call already uses `orgId` for `clerk_org_id` — update it to
   `context.value.clerkOrgId` too, same value, but keeps the function
   internally consistent about where its tenant identifiers come from).
5. Add the same one-line comment plan 019 used at its fixed sites:

```typescript
    where: {
      // Both tenant keys: one Clerk Organisation can own several Organisation
      // rows (one per Xero file), so clerk_org_id alone spans payroll entities.
      clerk_org_id: context.value.clerkOrgId,
      id: parsed.data.matchId,
      organisation_id: context.value.organisationId,
    },
```

Change nothing else in the transaction body: not the `Person` update, not the
`XeroPersonMatch` update, not the resolution-note logic.

**Verify**:

```
bun run typecheck
bun run check
grep -n -A6 "database.xeroPersonMatch.findFirst" "apps/app/app/(authenticated)/settings/integrations/xero/matches/_actions.ts"
```

**Expected**: both exit 0; the printed `where` clause contains `clerk_org_id`,
`id` and `organisation_id`.

### Step 5: Add the test file

Create
`apps/app/app/(authenticated)/settings/integrations/xero/matches/_actions.test.ts`,
modelled on `settings/general/_actions.test.ts`'s mocking setup. Cover:

1. **Happy path**: `getActiveOrgContext` resolves ok; `database.xeroPersonMatch.findFirst`
   is called with a `where` containing `clerk_org_id`, `id` and
   `organisation_id` (assert on the call arguments, not just the result, per
   plan 019's precedent — a wrong `where` and a coincidentally-passing result
   are not the same thing to catch).
2. **Rejection when the Organisation context is invalid**: `getActiveOrgContext`
   resolves `{ ok: false, error: ... }`; assert `resolveXeroPersonMatchAction`
   returns a non-ok result and that `database.xeroPersonMatch.findFirst` is
   **not** called (i.e. the function returns before the query, not after a
   failed one).

**Verify**:

```
cd apps/app && bunx vitest run "app/(authenticated)/settings/integrations/xero/matches/_actions.test.ts" --testTimeout=60000
```

**Expected**: all new tests pass, `Test Files 1 passed (1)`.

### Step 6: Full verification

```
bun run check
bun run typecheck
cd apps/app && bunx vitest run --maxWorkers=1 --testTimeout=60000
```

**Expected**: all exit 0. Test count is the Step 1 baseline (175) plus the
tests added in Step 5.

## Test plan

Covered in Step 5 above. No test files exist today for `page.tsx` or
`matches-client.tsx` in this directory (confirmed: only
`connect/_actions.test.ts` exists under
`settings/integrations/xero/`) — do not create page- or client-level tests as
part of this plan; the action-level test in Step 5 is the load-bearing one
because it is the write path. If you believe page- or component-level tests
are warranted, note that in your report rather than adding them, since it
would expand scope beyond what "Done criteria" below checks for.

## Done criteria

All of the following, verbatim:

1. `bun run check` exits 0.
2. `bun run typecheck` exits 0.
3. `cd apps/app && bunx vitest run --maxWorkers=1 --testTimeout=60000` exits
   0 with `Tests 175 passed (175)` plus the Step 5 additions.
4. `grep -A8 "database.xeroPersonMatch.findMany" "apps/app/app/(authenticated)/settings/integrations/xero/matches/page.tsx" | grep -c organisation_id`
   prints `1`.
5. `grep -A6 "database.xeroPersonMatch.findFirst" "apps/app/app/(authenticated)/settings/integrations/xero/matches/_actions.ts" | grep -c organisation_id`
   prints `1`.
6. `git diff --name-only` lists at most the four files in the "In scope" list,
   plus this plan file and `plans/README.md` for the status update.

## STOP conditions

Stop and report back rather than improvising if any of these occur:

- **The baseline in Step 1 is not green.** Report what fails; change nothing.
- **`requireActiveOrgPageContext` or `getActiveOrgContext` behave differently
  than described here** (for example, if `requireActiveOrgPageContext` no
  longer calls `notFound()` on an invalid param, or `getActiveOrgContext`'s
  `Result` shape has changed). Read both files in full before Step 2; if the
  live code disagrees with the excerpts above, that is drift — stop rather
  than adapting silently.
- **No Organisation ever exists for a Clerk Org that has Xero matches
  pending.** This should be impossible (a `XeroPersonMatch` implies a
  `XeroTenant` implies an `Organisation`), but if `requireActiveOrgPageContext`
  hits its `notFound()` fallback path for an org that legitimately has pending
  matches, that is a data-shape assumption this plan got wrong — stop and
  report rather than working around it.
- **Plan 027 has landed first and its diff conflicts with Step 4 in a way you
  cannot cleanly resolve** by re-reading the current file. Report the
  conflict; do not force a merge that guesses at intent.

## Maintenance notes

- **This changes user-visible behaviour.** Before this plan, an `org:admin`
  saw every pending match across every Organisation their Clerk Org owns on
  one screen. After, they see one Organisation at a time and switch via the
  same `?org=` mechanism used elsewhere. If the product intent was actually
  "one combined inbox across Xero files," this plan is the wrong fix and the
  right one is validating `match.organisation_id` against the caller's
  accessible Organisation set without narrowing the listing query — that
  option was on the table when this plan was written and was explicitly not
  chosen; see plan 019's Gap 2 note for the alternative.
- **Plan 029** ("test the untested server actions") is scoped to run "after
  plans 019 and 027 settle their final shape" per `plans/README.md`. This plan
  is part of that shape; once this and 027 both land, plan 029 should be
  re-read to confirm it still describes what's untested accurately.
