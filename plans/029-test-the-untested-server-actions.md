# Plan 029: Test the eleven untested server actions in `apps/app`

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report, do not improvise. When done, update this plan's status row in
> `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 75202db..HEAD -- "apps/app/app/(authenticated)"`
> If the action files changed since this plan was written, re-check the
> "Current state" inventory before proceeding.

## Status

- **Priority**: P2
- **Effort**: L
- **Risk**: LOW
- **Depends on**: none. Plans 019 and 027 add tests to two of these files; see
  "Git workflow".
- **Category**: tests
- **Planned at**: commit `75202db`, 2026-07-25

## Why this matters

Server actions in `apps/app` are the authorisation boundary for the product.
Each one is a `"use server"` entry point reachable from the browser, and each
is individually responsible for three things the type system cannot check:
validating its input with Zod, verifying the caller's role, and scoping every
query to both `clerk_org_id` and `organisation_id`.

Eighteen files define server actions. Seven have co-located tests. Eleven do
not, including the two that matter most:

- `leave-approvals/_actions.ts` (327 lines, 7 exported actions) is the manager
  approval surface. Approve, decline, request-more-info and the retry paths all
  enter here, and every one of them writes to Xero Payroll.
- `settings/integrations/xero/_actions.ts` (316 lines, 5 exported actions)
  covers connecting and disconnecting Xero, including the destructive
  disconnect that archives people and availability records.

This is not a "no tests exist" problem. `apps/app` has roughly fifty test files
and seven of them test server actions, so the harness, the mocking conventions
and the assertions style are all established. The gap is that eleven files were
never brought into it, and the untested set is skewed towards the highest-risk
actions rather than being a random sample. That skew is what makes this worth
scheduling: the tested actions are the ones someone happened to write tests for
while building them, and approvals were not among them.

## Current state

### The inventory, verified at commit `75202db`

Tested (7):

| File | Test |
|---|---|
| `(authenticated)/feeds/_actions.ts` | `_actions.test.ts` |
| `(authenticated)/notifications/_actions.ts` | `_actions.test.ts` |
| `(authenticated)/plans/_actions.ts` | `_actions.test.ts` |
| `(authenticated)/settings/billing/actions.ts` | `actions.test.ts` |
| `(authenticated)/settings/general/_actions.ts` | `_actions.test.ts` |
| `(authenticated)/settings/integrations/xero/connect/_actions.ts` | `_actions.test.ts` |
| `(authenticated)/setup/_actions.ts` | `_actions.test.ts` |

Untested (11), with size and exported action count:

| File | Lines | Exported actions |
|---|---:|---:|
| `(authenticated)/leave-approvals/_actions.ts` | 327 | 7 |
| `(authenticated)/people/_actions.ts` | 328 | 6 |
| `(authenticated)/settings/integrations/xero/_actions.ts` | 316 | 5 |
| `(authenticated)/public-holidays/_actions.ts` | 246 | 5 |
| `(authenticated)/sync/_actions.ts` | 164 | 3 |
| `(authenticated)/analytics/leave-reports/_actions.ts` | 158 | 1 |
| `(authenticated)/settings/leave-approval/_actions.ts` | 154 | 2 |
| `(authenticated)/settings/audit-log/_actions.ts` | 106 | 1 |
| `(authenticated)/settings/feeds/_actions.ts` | 99 | 1 |
| `(authenticated)/people/new/_actions.ts` | 96 | 1 |
| `(authenticated)/settings/integrations/xero/matches/_actions.ts` | (see plan 027) | 1 |

Regenerate the list rather than trusting it:

```
for f in $(find "apps/app/app/(authenticated)" -name "_actions.ts" -o -name "actions.ts" | sort); do
  t="${f%.ts}.test.ts"
  [ -f "$t" ] && echo "TESTED   $f" || echo "UNTESTED $f"
done
```

### The established harness

`apps/app/app/(authenticated)/settings/general/_actions.test.ts` is the
exemplar. It mocks `clerkClient` through `vi.hoisted` plus a `vi.mock` module
factory, which is the pattern the whole repo uses:

```typescript
  clerkClient: vi.fn(),
...
  clerkClient: mocks.clerkClient,
```

`apps/app/app/(authenticated)/feeds/_actions.test.ts` is the exemplar for
actions that call into a service package and then revalidate paths.

**Read both before writing anything.** This plan deliberately does not restate
their contents: they are the source of truth for the conventions, they are 
longer than is useful to inline, and a plan that paraphrases them would drift
from them.

## Design

Eleven files is too much for one pass, and a plan that says "test everything"
produces either an abandoned branch or eleven shallow test files. Instead:

**Test in three tranches, ordered by blast radius**, and treat each tranche as
independently shippable.

- **Tranche A (required)**: `leave-approvals/_actions.ts` and
  `settings/integrations/xero/_actions.ts`. Both write to Xero Payroll; one of
  them can archive an organisation's data.
- **Tranche B (required)**: `people/_actions.ts`, `people/new/_actions.ts`,
  `settings/leave-approval/_actions.ts`. Person records carry
  `clerk_user_id`, the notification delivery address, and the leave-approval
  settings decide whether a decline reason is mandatory.
- **Tranche C (optional, only if A and B land comfortably)**:
  `public-holidays/_actions.ts`, `sync/_actions.ts`,
  `analytics/leave-reports/_actions.ts`, `settings/audit-log/_actions.ts`,
  `settings/feeds/_actions.ts`.

**Every action gets the same four baseline tests**, whatever else it needs:

1. **Rejects an unauthenticated caller.** No `orgId` or no user, and the action
   returns its `not_authorised` error without touching the database.
2. **Rejects an insufficient role.** For any action gated on `org:admin` or
   `org:owner`, a `org:manager` or `org:viewer` caller is refused. Assert no
   database write occurred, not merely that an error was returned.
3. **Rejects malformed input.** A Zod violation returns `validation_error` and
   nothing else runs.
4. **Scopes its queries.** Every mocked database call receives a `where`
   carrying both `clerk_org_id` and `organisation_id`. Assert on the argument
   passed to the mock.

Test 2 and test 4 are the ones that justify this plan. Both assert on the
*absence* of an effect, which is what makes them regression-proof: an action
that returns an error after writing is still broken, and a test that only
checks the return value would pass.

## Commands you will need

All run from the repo root.

```
bun install                # run first if you hit "Cannot find module '@repo/observability/log'"
bun run check
bun run typecheck
bun run test
bunx vitest run "apps/app/app/(authenticated)/leave-approvals/_actions.test.ts"
```

## Scope

**In scope:**

- New `*.test.ts` files co-located with the action files listed in tranches A
  and B, and optionally C.

**Explicitly out of scope:**

- **Any source file.** This plan writes tests only. A failing new test against
  unchanged code is a finding to report, not a licence to edit the action.
- The seven already-tested action files. Do not "improve" their tests here.
- `apps/app/app/(authenticated)/settings/integrations/xero/matches/_actions.ts`.
  Plan 027 creates its test file as part of a behaviour change; duplicating it
  here would collide.
- Service packages (`packages/availability`, `packages/feeds`,
  `packages/xero`). Mock them at the module boundary; do not test through into
  them.
- Component or page tests. Only actions.
- End-to-end tests, Playwright, or any new test runner.

## Git workflow

```
git checkout -b test/server-action-coverage
```

One commit per tranche:

```
test(app): cover the leave approval and Xero integration actions
test(app): cover the people and leave-approval settings actions
test(app): cover the remaining server actions
```

**Ordering with plans 019 and 027**: plan 019 adds a `where`-clause assertion
to `feeds/_actions.test.ts` (already tested, out of scope here) and plan 027
creates the matches action's test file. Neither touches a file this plan
creates. No conflict.

Do not push or open a pull request unless the user asks.

## Steps

### Step 1: Establish the baseline

```
bun run check
bun run typecheck
bun run test
```

**Expected**: all three exit 0. Record the total test count.

Regenerate the tested/untested inventory with the loop from "Current state" and
compare it against the table. If it differs, use what you found and say so.

### Step 2: Read the two exemplar tests and one target

Read, in full:

- `apps/app/app/(authenticated)/settings/general/_actions.test.ts`
- `apps/app/app/(authenticated)/feeds/_actions.test.ts`
- `apps/app/app/(authenticated)/leave-approvals/_actions.ts`

Write down, for the third file: every exported action, what it validates, what
role it requires, which service functions it calls, and which paths it
revalidates. That inventory is the test list. Do not start writing tests before
you have it.

### Step 3: Tranche A, part 1 (leave approvals)

Create
`apps/app/app/(authenticated)/leave-approvals/_actions.test.ts`.

For each of the seven exported actions, the four baseline tests from "Design",
plus these specific ones:

- **Decline requires a reason when the organisation setting demands it.** The
  approval workflow enforces a decline reason; assert the action refuses a
  decline with an empty reason when the setting is on. (If the enforcement
  lives in `packages/availability` rather than the action, assert the action
  passes the reason through unmodified and say so; do not test through into the
  service.)
- **A Xero write failure surfaces to the caller.** Mock the service to return
  `{ ok: false, error: { code: "xero_write_failed", ... } }` and assert the
  action returns an error rather than a success. `CLAUDE.md` requires outbound
  write failures to be surfaced inline, never swallowed.
- **The success path revalidates the approvals path.** Assert
  `revalidatePath` was called with the expected route.

**Verify**:

```
bunx vitest run "apps/app/app/(authenticated)/leave-approvals/_actions.test.ts"
bun run typecheck
```

**Expected**: both exit 0.

### Step 4: Tranche A, part 2 (Xero integration)

Create
`apps/app/app/(authenticated)/settings/integrations/xero/_actions.test.ts`.

The four baseline tests per action, plus:

- **Destructive disconnect requires the higher role.** Read the action to see
  which role it demands; assert the tier below it is refused **and that no
  service call was made**. This is the most consequential assertion in the
  plan: a destructive disconnect archives people and availability records and
  deletes leave balances, matches, sync runs and cursors.
- **Destructive and non-destructive are distinct.** Assert the `destructive`
  flag reaches the service as passed, and that the default (when the caller
  omits it) is the **non**-destructive path. A default that flipped to
  destructive would be catastrophic and invisible.
- **A disconnect on a connection belonging to another Organisation is
  refused.** Assert on the scoping of whatever lookup the action performs.

**Verify**:

```
bunx vitest run "apps/app/app/(authenticated)/settings/integrations/xero/_actions.test.ts"
```

**Expected**: passes.

### Step 5: Confirm tranche A tests are sensitive

For one assertion in each new file, apply a mutation, confirm the test fails,
and revert:

- In `leave-approvals/_actions.ts`, temporarily remove the role check.
- In `settings/integrations/xero/_actions.ts`, temporarily default
  `destructive` to `true`.

```
bunx vitest run "apps/app/app/(authenticated)/leave-approvals/_actions.test.ts"
bunx vitest run "apps/app/app/(authenticated)/settings/integrations/xero/_actions.test.ts"
git checkout "apps/app/app/(authenticated)/leave-approvals/_actions.ts" "apps/app/app/(authenticated)/settings/integrations/xero/_actions.ts"
git diff --stat
```

**Expected**: each test fails under its mutation; `git diff --stat` shows no
change to either action file afterwards.

**Confirm the revert before continuing.** Committing a mutated authorisation
check or a destructive default would be far worse than the coverage gap.

### Step 6: Tranche B

Create test files for:

- `apps/app/app/(authenticated)/people/_actions.ts`
- `apps/app/app/(authenticated)/people/new/_actions.ts`
- `apps/app/app/(authenticated)/settings/leave-approval/_actions.ts`

The four baseline tests per action, plus:

- **`people/_actions.ts`**: if any action writes `clerk_user_id`, assert the
  value is validated before the write. (Plan 027 establishes what that
  validation should look like for the matches action; if it has landed, the
  same standard applies here. If this file writes an unvalidated
  `clerk_user_id`, **report it** rather than writing a test that blesses the
  current behaviour.)
- **`settings/leave-approval/_actions.ts`**: assert the decline-reason toggle
  round-trips, and that a failed settings read does not silently default to the
  permissive value. Plan 011 covers the fail-open defect in the service layer;
  the action-level test should pin whatever the action itself does.

**Verify**:

```
bun run test
```

**Expected**: exits 0.

### Step 7: Tranche C (optional)

Only if tranches A and B are complete, passing, and the branch is not already
large. Create test files for the remaining five actions with the four baseline
tests each.

If you stop before tranche C, **say so explicitly in your report** and list
which files remain untested. A partial, well-tested tranche is a good outcome;
a partial one reported as complete is not.

### Step 8: Full verification

```
bun run check
bun run typecheck
bun run test
git diff --name-only
```

**Expected**: the first three exit 0; the last lists **only** `*.test.ts`
files.

## Test plan

This plan is a test plan. The structure is:

- **Four baseline tests per exported action**: unauthenticated refused,
  insufficient role refused with no write, malformed input refused, queries
  scoped to both tenant keys.
- **Action-specific tests** as listed per step.
- **Mutation checks** in Step 5 for the two highest-risk files.

Conventions, from `CLAUDE.md` and the existing tests:

- co-located `*.test.ts` beside the action file;
- `vi.hoisted` for mock handles, `vi.mock` module factories for
  `@repo/database`, `@repo/auth/server` and the relevant service package;
- factories or builders for fixture data, not repeated raw literals;
- Australian English in test names and comments; no em dashes.

**Assert on effects, not just returns.** The recurring pattern for every
authorisation test is:

```typescript
    expect(result).toEqual({ ok: false, error: expect.objectContaining({ code: "not_authorised" }) });
    expect(mocks.someServiceFunction).not.toHaveBeenCalled();
```

The second line is the one that catches the real regression.

## Done criteria

All of the following, verbatim:

1. `bun run check` exits 0.
2. `bun run typecheck` exits 0.
3. `bun run test` exits 0.
4. A test file exists for every tranche A and tranche B action:
   ```
   for f in "apps/app/app/(authenticated)/leave-approvals/_actions.ts" \
            "apps/app/app/(authenticated)/settings/integrations/xero/_actions.ts" \
            "apps/app/app/(authenticated)/people/_actions.ts" \
            "apps/app/app/(authenticated)/people/new/_actions.ts" \
            "apps/app/app/(authenticated)/settings/leave-approval/_actions.ts"; do
     t="${f%.ts}.test.ts"; [ -f "$t" ] && echo "OK $t" || echo "MISSING $t"
   done
   ```
   Every line reads `OK`.
5. The test count is at least forty higher than the Step 1 baseline.
6. Step 5's mutation checks were run, both tests failed under their mutation,
   and both action files are unchanged afterwards. Record the results.
7. `git diff --name-only` lists **only** `*.test.ts` files.
8. If tranche C was skipped, the report says so and names the remaining
   untested files.

Criterion 7 is the one to check before committing.

## STOP conditions

Stop and report back rather than improvising if any of these occur:

- **The baseline in Step 1 is not green.** Report what fails; write nothing.
- **A new test fails against unchanged source.** Report the assertion, the
  expected and actual values, and your reading of which is right. Do not edit
  the action. Likely candidates: an action missing a role check, an action
  whose query omits `organisation_id`, or a `destructive` flag that defaults
  the wrong way. Each of those is a security finding worth its own plan.
- **You cannot revert a Step 5 mutation cleanly.** Run `git checkout` on the
  file and confirm with `git diff`. If it is still modified, stop and report.
- **An action turns out to have no role check at all.** Do not add one. Report
  which action, what it does, and what role you believe it should require.
- **An action reads the database directly rather than through a service.**
  Several do (that is the boundary question plan 031 covers). Mock
  `@repo/database` and test it as it is; do not restructure the action to make
  it easier to test.
- **The branch grows past roughly fifteen hundred added lines.** Stop at the
  end of the current tranche, report what is covered and what is not, and let
  the user decide whether to continue. A reviewable branch beats a complete
  one.

## Maintenance notes

- **The rule worth adopting**: a new `"use server"` action ships with a
  co-located test covering the four baseline cases. Actions are the
  authorisation boundary, and the four cases are exactly the properties the
  type system cannot check. This is a cheap review question ("where is the
  test that an insufficient role is refused?") and it is the one that would
  have prevented this gap.
- **Assert on absence of effect, not just on the returned error.** An action
  that writes and then returns `not_authorised` passes a return-value
  assertion. Every authorisation test in this plan pairs its return assertion
  with a `not.toHaveBeenCalled()`; keep that pairing.
- **The skew is the finding, not the count.** Seven actions were tested and
  eleven were not, and the untested set contained the approval workflow and the
  destructive Xero disconnect. Coverage percentages would have looked
  acceptable throughout. When auditing coverage, sort by blast radius rather
  than by line count.
- **Mutation checks belong on security-relevant tests.** Steps 5's technique
  (break it in the specific way the test should catch, confirm failure, revert)
  takes two minutes and is the only thing that distinguishes a test from a
  test-shaped comment. Plan 028 uses the same technique for the same reason.
- **Related plans**: 028 (three other test-quality gaps), 020 (turn on the
  disconnect integration test, which covers the service behind the Xero action
  tested here), 015 (make six workspaces able to run tests at all), 027 (tests
  the matches action as part of a behaviour change).
