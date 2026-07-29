# Plan 028: Fix three test-quality gaps (role hierarchy, feed preview, tenant query helpers)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report, do not improvise. When done, update this plan's status row in
> `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 75202db..HEAD -- apps/app/lib/auth packages/feeds/src/preview packages/database/src/queries packages/database/src/tenant-query.ts`
> If any changed since this plan was written, re-check the "Current state"
> facts before proceeding.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: tests
- **Planned at**: commit `75202db`, 2026-07-25

## Why this matters

This repository tests well. `apps/app` alone has around fifty test files, every
source file in `packages/feeds` but one has a co-located test, and the job
handlers have both unit and integration coverage. That makes the remaining gaps
worth naming precisely, because in a well-tested repo an untested file reads as
"covered elsewhere" rather than "not covered".

Three gaps, each a different failure mode:

**1. A test that cannot fail for the reason it exists.**
`apps/app/lib/auth/require-page-role.test.ts` mocks `requireRole` with a
function that ignores its argument and returns the same value every time. The
function under test exists to walk a role hierarchy, deciding which roles count
as "at or above" the required one. With a role-blind mock, that walk is
invisible: an implementation that returned the roles *below* the required one
would pass both tests. The file gives the appearance of covering an
authorisation primitive while covering only its plumbing.

**2. An untested file in an otherwise fully tested package.**
`packages/feeds/src/preview/preview-service.ts` is 161 lines and the only
source file in `packages/feeds` without a co-located test. It renders a preview
of what a feed will publish, which means it is a privacy surface: if the
preview shows more than the feed does, an admin sets a privacy mode based on
false information.

**3. The tenant-scoping helpers themselves are untested.**
`packages/database/src/queries/` holds ten query modules and one has a unit
test. `packages/database/src/tenant-query.ts` exports the helper whose entire
purpose is enforcing the repo's central security invariant, and it has no test
at all. `CLAUDE.md` names `clerk_org_id` query isolation as something to test
explicitly.

None of these is a bug report. Together they are the difference between a suite
that would catch a tenancy or authorisation regression and one that would
report green through it.

## Current state

### Gap 1: `require-page-role.test.ts` mocks away the logic

The implementation, `apps/app/lib/auth/require-page-role.ts` in full:

```typescript
import { requireRole } from "@repo/auth/helpers";

const ROLE_HIERARCHY = ["org:viewer", "org:manager", "org:admin", "org:owner"];

export class PermissionDeniedError extends Error {
  constructor() {
    super("Permission denied");
    this.name = "PermissionDeniedError";
  }
}

export async function requirePageRole(role: string): Promise<void> {
  const allowedRoles = rolesAtOrAbove(role);
  const accessResults = await Promise.all(
    allowedRoles.map((allowedRole) => requireRole(allowedRole))
  );
  const hasRole = accessResults.some(Boolean);
  if (!hasRole) {
    throw new PermissionDeniedError();
  }
}

function rolesAtOrAbove(role: string): string[] {
  const index = ROLE_HIERARCHY.indexOf(role);
  if (index === -1) {
    return [role];
  }
  return ROLE_HIERARCHY.slice(index);
}
```

The test, `apps/app/lib/auth/require-page-role.test.ts` in full:

```typescript
import { describe, expect, it, vi } from "vitest";
import { PermissionDeniedError, requirePageRole } from "./require-page-role";

const mockRequireRole = vi.fn();

vi.mock("@repo/auth/helpers", () => ({
  requireRole: (role: string) => mockRequireRole(role),
}));

describe("requirePageRole", () => {
  it("resolves if user has role", async () => {
    mockRequireRole.mockResolvedValue(true);
    await expect(requirePageRole("org:admin")).resolves.toBeUndefined();
  });

  it("throws PermissionDeniedError if user lacks role", async () => {
    mockRequireRole.mockResolvedValue(false);
    await expect(requirePageRole("org:admin")).rejects.toThrow(
      PermissionDeniedError
    );
  });
});
```

`mockResolvedValue(true)` returns `true` for `"org:viewer"`, `"org:owner"` and
`"anything"` alike. Nothing observes *which* roles were asked about, so
`rolesAtOrAbove` is unconstrained. Specifically untested:

- an owner passes a check that requires manager (the hierarchy's whole point);
- an admin **fails** a check that requires owner (the direction that matters
  for security);
- an unrecognised role falls back to exactly itself and is therefore denied
  unless that literal role matches (fail-closed behaviour at
  `rolesAtOrAbove`'s `index === -1` branch).

### Gap 2: `preview-service.ts` has no test

```
packages/feeds/src/
  cache/feed-cache.ts                  + feed-cache.test.ts
  cache/feed-invalidation.ts           + feed-invalidation.test.ts
  feed-service.ts                      + feed-service.test.ts
  preview/preview-service.ts           (no test)
  projection/feed-projection.ts        + feed-projection.test.ts
  publication/publication-service.ts   + publication-service.test.ts
  render/render-feed.ts                + render-feed.test.ts
  render/render-html.ts                + render-html.test.ts
  scope/feed-scope.ts                  + feed-scope.test.ts
  tokens/token-service.ts              + token-service.test.ts
```

`preview-service.ts` exports two things (line 16 and line 35):

```typescript
export type PreviewServiceError =
...
export async function previewFeed(
```

Read the whole file during execution before writing tests. The exemplar to
follow is `packages/feeds/src/scope/feed-scope.test.ts`, which tests the
nearest-neighbour concern (resolving which people a feed covers) and already
has the mocking setup for `@repo/database`.

### Gap 3: the tenant-scoping helpers are untested

`packages/database/src/queries/` contains:

```
availability-records.ts
billing.ts
feeds.ts
leave-balances.ts
notifications.ts
organisations.ts
people.ts
public-holidays.ts
support-submissions.ts     + support-submissions.test.ts
sync-runs.ts
```

One test file for ten modules.

`packages/database/src/tenant-query.ts` has no test. It exports:

```typescript
export const scopedQuery = (
  clerkOrgId: ClerkOrgId,
  organisationId: OrganisationId
) => ({
  clerk_org_id: clerkOrgId,
  organisation_id: organisationId,
});
```

`CLAUDE.md`'s testing rules name this explicitly: "Explicitly test: ... feed
token validation, `clerk_org_id` query isolation, XeroConnection/XeroTenant
uniqueness invariants ...".

`packages/database` does have four integration tests
(`availability_records.integration.test.ts`, `leave_balances`, `plan_limits`,
`public-holidays`) which exercise real queries against a database. Check what
they already assert before duplicating them: the gap this plan fills is
unit-level assertions on the scoping helpers and query builders, not another
round of integration coverage.

## Commands you will need

All run from the repo root.

```
bun install                # run first if you hit "Cannot find module '@repo/observability/log'"
bun run check
bun run typecheck
bun run test
bunx vitest run apps/app/lib/auth/require-page-role.test.ts
bunx vitest run packages/feeds/src/preview/preview-service.test.ts
bunx vitest run packages/database/src/tenant-query.test.ts
```

## Scope

**In scope:**

- `apps/app/lib/auth/require-page-role.test.ts` (rewrite)
- `packages/feeds/src/preview/preview-service.test.ts` (create)
- `packages/database/src/tenant-query.test.ts` (create)
- Unit tests for two or three modules in `packages/database/src/queries/`,
  chosen by the criterion in Step 6

**Explicitly out of scope:**

- **Any source file.** This plan writes tests only. If a test you write fails,
  see STOP conditions: a failing new test against unchanged code is a finding,
  not a licence to change the implementation.
- `apps/app/lib/auth/require-page-role.ts`. Its logic is correct; only its test
  is weak.
- The existing integration tests in `packages/database`. Do not modify them.
- Untested server actions in `apps/app`. That is plan 029.
- Adding a test runner to workspaces that lack one. That is plan 015.
- Coverage thresholds, CI reporting, or any tooling change.

## Git workflow

```
git checkout -b test/close-three-coverage-gaps
```

Suggested commits:

```
test(app): exercise the role hierarchy in requirePageRole
test(feeds): cover the feed preview service
test(database): cover the tenant scoping helpers
```

Do not push or open a pull request unless the user asks.

## Steps

### Step 1: Establish the baseline

```
bun run check
bun run typecheck
bun run test
```

**Expected**: all three exit 0. Record the total test count; every step below
adds to it and none should remove from it.

### Step 2: Prove the current role test is vacuous

Before rewriting it, demonstrate the gap. Temporarily change
`rolesAtOrAbove` in `apps/app/lib/auth/require-page-role.ts` to return the
roles *below* the required one:

```typescript
  return ROLE_HIERARCHY.slice(0, index + 1);
```

Then run:

```
bunx vitest run apps/app/lib/auth/require-page-role.test.ts
```

**Expected**: both tests still pass, despite the hierarchy now being inverted.
That is the evidence.

**Revert immediately**:

```
git checkout apps/app/lib/auth/require-page-role.ts
git diff --stat
```

**Expected**: no changes to that file. Confirm this before continuing; leaving
the mutation in place would be far worse than the gap it demonstrates.

Record the result in your report. If both tests *fail* under the mutation, the
gap is narrower than this plan describes; say so and adapt Step 3 accordingly.

### Step 3: Rewrite the role test around a role-aware mock

Replace `apps/app/lib/auth/require-page-role.test.ts`. The key change is a mock
that answers per role, modelling "the signed-in user holds exactly this role":

```typescript
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PermissionDeniedError, requirePageRole } from "./require-page-role";

const mockRequireRole = vi.fn();

vi.mock("@repo/auth/helpers", () => ({
  requireRole: (role: string) => mockRequireRole(role),
}));

// Model a signed-in user holding exactly one role. requirePageRole asks about
// every role at or above the one it needs, so a role-aware mock is what makes
// the hierarchy observable. A mock that returns the same answer for every role
// cannot distinguish "walks up the hierarchy" from "walks down it".
function signedInAs(role: string) {
  mockRequireRole.mockImplementation((asked: string) =>
    Promise.resolve(asked === role)
  );
}

describe("requirePageRole", () => {
  beforeEach(() => {
    mockRequireRole.mockReset();
  });

  it("allows a user whose role is exactly the required role", async () => {
    signedInAs("org:admin");
    await expect(requirePageRole("org:admin")).resolves.toBeUndefined();
  });

  it("allows a user whose role is above the required role", async () => {
    signedInAs("org:owner");
    await expect(requirePageRole("org:manager")).resolves.toBeUndefined();
  });

  it("denies a user whose role is below the required role", async () => {
    signedInAs("org:admin");
    await expect(requirePageRole("org:owner")).rejects.toThrow(
      PermissionDeniedError
    );
  });

  it("denies a viewer everywhere above viewer", async () => {
    signedInAs("org:viewer");
    await expect(requirePageRole("org:manager")).rejects.toThrow(
      PermissionDeniedError
    );
  });

  it("asks only about roles at or above the required one", async () => {
    signedInAs("org:owner");
    await requirePageRole("org:admin");
    const asked = mockRequireRole.mock.calls.map(([role]) => role);
    expect(asked).toEqual(["org:admin", "org:owner"]);
  });

  it("fails closed for an unrecognised required role", async () => {
    signedInAs("org:owner");
    await expect(requirePageRole("org:superuser")).rejects.toThrow(
      PermissionDeniedError
    );
  });
});
```

The fifth test is the one that pins the direction of the walk. Assert on the
exact array, not on `toContain`: `toContain` would still pass under the
inverted implementation from Step 2.

**Verify**:

```
bunx vitest run apps/app/lib/auth/require-page-role.test.ts
```

**Expected**: all six pass.

### Step 4: Re-run the mutation to confirm the new test catches it

Apply the Step 2 mutation again, run the test, confirm it now **fails**, then
revert.

```
bunx vitest run apps/app/lib/auth/require-page-role.test.ts
git checkout apps/app/lib/auth/require-page-role.ts
git diff --stat
```

**Expected**: the test fails under the mutation; `git diff --stat` shows no
change to the implementation afterwards.

This is the step that distinguishes "wrote more tests" from "closed the gap".
Do not skip it, and confirm the revert.

### Step 5: Test the feed preview service

Read `packages/feeds/src/preview/preview-service.ts` in full, then read
`packages/feeds/src/scope/feed-scope.test.ts` for the package's mocking
conventions.

Write `packages/feeds/src/preview/preview-service.test.ts` covering, at
minimum:

1. **The happy path**: a feed with a known scope and known availability records
   produces the expected preview payload.
2. **Tenant scoping**: the database queries `previewFeed` issues carry both
   `clerk_org_id` and `organisation_id`. Assert on the mocked query arguments.
3. **Each privacy mode**: the preview reflects the feed's privacy mode. Read
   the `availability_privacy_mode` enum in
   `packages/database/prisma/schema.prisma` and cover every member. This is the
   assertion that makes the preview trustworthy: if it renders more detail than
   the published feed would, an admin chooses a privacy setting on false
   information.
4. **Every branch of `PreviewServiceError`**: read the union at line 16 and
   write one test per variant, asserting the `Result` is `{ ok: false }` with
   the right `code`.
5. **Empty scope**: a feed covering nobody produces an empty preview rather
   than throwing.

If `previewFeed`'s output shape makes point 3 impossible to assert directly
(for example because privacy transforms happen further down in
`feed-projection.ts`), say so and cover what you can. Do not fabricate an
assertion that passes without meaning.

**Verify**:

```
bunx vitest run packages/feeds/src/preview/preview-service.test.ts
```

**Expected**: all pass.

### Step 6: Test the tenant-scoping helpers

Create `packages/database/src/tenant-query.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { scopedQuery } from "./tenant-query";

describe("scopedQuery", () => {
  it("returns both tenant keys", () => {
    expect(scopedQuery("org_123" as never, "11111111-1111-4111-8111-111111111111" as never)).toEqual({
      clerk_org_id: "org_123",
      organisation_id: "11111111-1111-4111-8111-111111111111",
    });
  });

  it("returns exactly two keys and no others", () => {
    const result = scopedQuery("org_123" as never, "11111111-1111-4111-8111-111111111111" as never);
    expect(Object.keys(result).sort()).toEqual([
      "clerk_org_id",
      "organisation_id",
    ]);
  });
});
```

The second test is the one worth having: it fails if someone adds a third key
to the helper, which would silently widen or narrow every scoped query in the
repo.

**Note on the casts**: `scopedQuery` takes branded `ClerkOrgId` and
`OrganisationId`. Casting in a test is acceptable and should carry a brief
comment saying so, since `CLAUDE.md` requires justified casts. If plan 021 has
landed, `scopedTo` takes plain strings and needs no cast; test both exports in
that case.

Then pick **two or three** modules from `packages/database/src/queries/` and
unit-test their exported query builders. Choose by this criterion, in order:

1. the module whose functions are called from the most places
   (`grep -rn "from \"@repo/database\"" packages apps | wc -l` per export);
2. `availability-records.ts`, because it queries the core domain table;
3. `feeds.ts`, because feed queries reach the public, unauthenticated ICS
   endpoint.

For each, assert:

- every exported function's `where` clause carries both tenant keys;
- any `select` used excludes `source_payload_json` and `xero_write_error_raw`
  where it should (these are audit-only columns per `CLAUDE.md`);
- the function returns a `Result` rather than throwing, if that is its
  contract.

Read `packages/database/src/queries/support-submissions.test.ts` first. It is
the only existing example in this directory and its mocking approach is the one
to copy.

**Verify**:

```
bunx vitest run packages/database/src/tenant-query.test.ts
bun run test
```

**Expected**: both exit 0.

### Step 7: Full verification

```
bun run check
bun run typecheck
bun run test
```

**Expected**: all exit 0, with at least twenty more tests than the Step 1
baseline.

## Test plan

This plan *is* a test plan. Summary of what gets written:

| File | Status | Tests |
|---|---|---|
| `apps/app/lib/auth/require-page-role.test.ts` | rewritten | 6: exact role, role above, role below denied, viewer denied, exact set of roles asked, unrecognised role fails closed |
| `packages/feeds/src/preview/preview-service.test.ts` | new | happy path, tenant scoping, one per privacy mode, one per error variant, empty scope |
| `packages/database/src/tenant-query.test.ts` | new | returns both keys, returns exactly two keys |
| two or three modules in `packages/database/src/queries/` | new | tenant scoping and select shape per exported function |

**The mutation checks in Steps 2 and 4 are the quality gate for this plan.** A
test suite that grows without becoming more sensitive is not an improvement.
Run them, record the results, and confirm the implementation file is unchanged
afterwards.

Conventions to follow, from `CLAUDE.md`: co-located test files, Vitest,
factories or builders for test data rather than repeated raw literals, and
`vi.hoisted` plus `vi.mock` module factories as the rest of the repo uses.

## Done criteria

All of the following, verbatim:

1. `bun run check` exits 0.
2. `bun run typecheck` exits 0.
3. `bun run test` exits 0 with at least twenty more tests than the Step 1
   baseline.
4. `test -f packages/feeds/src/preview/preview-service.test.ts` succeeds.
5. `test -f packages/database/src/tenant-query.test.ts` succeeds.
6. `grep -c "mockResolvedValue(true)" apps/app/lib/auth/require-page-role.test.ts`
   prints `0` (the role-blind mock is gone).
7. `grep -c "mockImplementation" apps/app/lib/auth/require-page-role.test.ts`
   prints `1` or more.
8. Step 4's mutation check was run and the rewritten test failed under it.
   Record the result.
9. `git diff --name-only` lists **only** `*.test.ts` files. No source file may
   appear.

Criterion 9 is the most important one in this plan. Check it before committing.

## STOP conditions

Stop and report back rather than improvising if any of these occur:

- **The baseline in Step 1 is not green.** Report what fails; write nothing.
- **A new test fails against unchanged source.** This is a finding, not a
  licence to edit the implementation. Report the assertion, the expected and
  actual values, and your reading of which is right. `previewFeed`'s privacy
  handling is the most likely place for this: if the preview shows more than
  the feed publishes, that is a real privacy defect and needs its own plan.
- **You cannot revert the Step 2 or Step 4 mutation cleanly.** Run
  `git checkout apps/app/lib/auth/require-page-role.ts` and confirm with
  `git diff`. If the file is still modified, stop and report; committing a
  mutated authorisation primitive would be far worse than the gap this plan
  fixes.
- **`previewFeed`'s dependencies cannot be mocked** with the conventions used
  elsewhere in `packages/feeds`. Report what it depends on. A service that
  cannot be unit-tested is a design finding worth surfacing rather than working
  around with an elaborate harness.
- **`packages/database/src/queries/*` modules turn out to be thin
  re-exports** with no logic of their own. Then unit tests there would be
  testing Prisma, not this code. Report it and stop after the `tenant-query.ts`
  tests; do not pad the count.
- **The privacy mode enum has members with no corresponding preview
  behaviour.** Report which. Untested enum members in a privacy transform are a
  finding.

## Maintenance notes

- **The lesson from gap 1 generalises**: when a test mocks a dependency that
  the function under test calls with *varying* arguments, the mock must vary
  its answers, or the argument-selection logic is untested. `vi.fn()` with
  `mockResolvedValue` is the shape to be suspicious of; `mockImplementation`
  that inspects the argument is usually what is wanted. Worth a look in review
  wherever a test mocks an authorisation or scoping helper.
- **The mutation check is a cheap, repeatable technique**: break the
  implementation in the specific way the test is meant to catch, confirm the
  test fails, revert. Two minutes, and it is the only thing that distinguishes
  a test from a test-shaped comment. Use it whenever writing a test for
  security-relevant logic.
- **`packages/feeds` now has full file-level coverage.** If a new source file
  is added there without a co-located test, the pattern is broken. That is a
  reasonable review check for this package specifically, since it is the one
  that renders to an unauthenticated public endpoint.
- **`packages/database/src/queries/` remains largely untested** after this
  plan, which covers two or three of ten modules. That is deliberate: the plan
  picks the highest-leverage modules rather than pretending to finish the job.
  If the user wants the rest, it is a follow-up, and the criterion in Step 6
  tells them how to order it.
- **Related plans**: plan 015 makes six workspaces able to run tests at all;
  plan 029 covers untested server actions in `apps/app`; plan 020 turns on the
  Xero disconnect integration test. All four are test-coverage work and can
  land in any order.
