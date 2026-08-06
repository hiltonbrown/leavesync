# Plan 015: Enable the test harness in the six workspaces that cannot run tests

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report, do not improvise. When done, update this plan's status row in
> `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 75202db..HEAD -- packages/auth packages/design-system/package.json packages/analytics/package.json packages/observability/package.json packages/seo/package.json apps/web/package.json turbo.json`
> If any changed since this plan was written, re-check the "Current state"
> facts before proceeding.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: tests, dx
- **Planned at**: commit `75202db`, 2026-07-25
- **Reconciled**: 2026-08-05 against `2095b1f`. Finding confirmed still present.
  These workspaces still declare no `test` script: `packages/analytics`,
  `packages/auth`, `packages/design-system`, `packages/email`,
  `packages/next-config`, `packages/observability`, `packages/seo`,
  `packages/typescript-config`, `apps/docs`, `apps/email` and `apps/web`. Only
  the manifests' dependency versions have moved since this plan was written
  (plan 047), plus a small change to `packages/auth/keys.ts`. The plan's own
  target list is unchanged.

## Why this matters

Six workspaces have no `test` script. Turborepo skips any package that does not
define the task it is asked to run, so `bun run test` and the CI test step report
green while never entering those packages at all. This is not a scheduling gap
that someone can close by writing a test: writing a test file in
`packages/auth` today would do nothing, because there is no script to run it and
no `vitest` dependency to run it with.

The dangerous one is `packages/auth`. It owns `entitlements.ts`, which decides
paid-plan enforcement. `withinLimit` computes `allowed: limit === -1 || current <
limit`, and `activePlanKey` silently downgrades any non-active, non-trialing or
unrecognised plan to Basic. A wrong comparison in either direction is a billing
defect: Basic customers exceeding their limits, or Premium customers blocked from
what they paid for. Nothing in CI can catch it.

The other five packages are lower risk, but the structural fix is the same and it
is cheap. Making the harness reach them is a prerequisite for several other
plans, which is why this one should land early.

## Current state

### The six workspaces with no `test` script

Verified at commit `75202db`:

| Workspace | Has `test` script | Has `vitest` devDependency |
|---|---|---|
| `packages/auth` | no | no |
| `packages/design-system` | no | no |
| `packages/analytics` | no | no |
| `packages/observability` | no | no |
| `packages/seo` | no | no |
| `apps/web` | no | no |

Reproduce with:

```
for d in packages/auth packages/design-system packages/analytics packages/observability packages/seo apps/web; do
  node -e "const p=require('./$d/package.json');console.log('$d ->', p.scripts?.test ?? 'NO-TEST-SCRIPT')"
done
```

### The current `packages/auth` manifest

```json
{
  "name": "@repo/auth",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "clean": "git clean -xdf .cache .turbo dist node_modules",
    "typecheck": "tsc --noEmit --emitDeclarationOnly false"
  },
```

### Why Turbo skips them

`turbo.json:16-18`:

```json
    "test": {
      "dependsOn": ["^test"]
    },
```

Turbo runs `test` only in packages that declare it.

### The code that most needs coverage

`packages/auth/entitlements.ts:18-33`:

```typescript
const ACTIVE_STATUSES = new Set(["active", "trialing"]);
const BASIC_PLAN_KEY: PlanKey = "basic";

const isPlanKey = (value: string): value is PlanKey =>
  (planKeys as readonly string[]).includes(value);

const activePlanKey = async (clerkOrgId: string): Promise<PlanKey> => {
  const subscription = await getSubscriptionForOrg(clerkOrgId);
  // Fall back to Basic for inactive subscriptions or any unrecognised plan_key
  // (e.g. legacy data) rather than casting blindly and throwing downstream.
  return subscription &&
    ACTIVE_STATUSES.has(subscription.status) &&
    isPlanKey(subscription.plan_key)
    ? subscription.plan_key
    : BASIC_PLAN_KEY;
};
```

`packages/auth/entitlements.ts:35-58`:

```typescript
export const withinLimit = async (
  clerkOrgId: string,
  _organisationId: string,
  limitType: LimitType
): Promise<Result<{ allowed: boolean; current: number; limit: number }>> => {
  try {
    const planKey = await activePlanKey(clerkOrgId);
    const [limits, usage] = await Promise.all([
      getPlanLimits(planKey),
      getUsageCounter(clerkOrgId, limitType),
    ]);
    const limit = limits[limitType];
    const current = usage?.current_value ?? 0;
    return {
      ok: true,
      value: { allowed: limit === -1 || current < limit, current, limit },
    };
  } catch {
    return {
      ok: false,
      error: appError("internal", "Failed to check billing limits."),
    };
  }
};
```

Note `limit === -1` is the unlimited sentinel, and `current < limit` is a strict
comparison, so `current === limit` is *not* allowed. Both are worth pinning.

### The script convention used by packages that do have tests

From `packages/billing/package.json` and `packages/core/package.json`:

```json
    "test": "NODE_ENV=test vitest run",
```

From packages that also have integration tests, such as
`packages/availability/package.json`:

```json
    "test": "NODE_ENV=test vitest run --exclude '**/*.integration.test.ts'",
    "test:integration": "NODE_ENV=test vitest run .integration.test.ts",
```

`vitest` is declared as `"vitest": "^4.1.10"` in most manifests. Match the version
already used by `packages/core`.

### Repo conventions that apply here

- Tests are co-located: `foo.ts` has `foo.test.ts` beside it.
- Vitest is the runner. Factories or builders for test data, not repeated raw
  literals.
- `@repo/auth` re-exports Clerk helpers; `helpers.ts` is a thin pass-through and
  is genuinely low value to test. `entitlements.ts` is the part that carries
  logic.
- TypeScript strict mode, no `any`, named exports only.
- Australian English in comments. No em dashes anywhere.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `bun install` | exit 0 |
| Typecheck | `bun run typecheck` | exit 0, no errors |
| Auth tests | `bunx vitest run packages/auth` | all pass |
| Full unit tests | `bun run test` | exit 0 |
| Lint | `bun run check` | exit 0 |

If `bun run typecheck` or `bun run test` fails before you have made any change
with an error mentioning `Cannot find module '@repo/observability/log'`, run
`bun install` first. That error is a stale-install artifact, not a code defect.

## Scope

**In scope** (the only files you may modify):

- `packages/auth/package.json`, `packages/design-system/package.json`,
  `packages/analytics/package.json`, `packages/observability/package.json`,
  `packages/seo/package.json`, `apps/web/package.json`
- `packages/auth/entitlements.test.ts` (create)
- `bun.lock` (regenerated by `bun install`, never hand-edited)
- `.github/workflows/ci.yml` — only the guard step in Step 5

**Out of scope** (do NOT touch, even though they look related):

- `packages/auth/entitlements.ts` and every other source file. This plan adds
  the ability to test and one real test suite. If a test reveals a bug, STOP and
  report it rather than fixing it here: a behaviour change to billing
  enforcement needs its own review.
- `turbo.json`'s `dependsOn` graph. Plan 035 covers that separately.
- Writing tests for the other five packages. This plan only unblocks them. See
  "Maintenance notes".
- Any vitest config file, unless a package genuinely fails without one.

## Git workflow

- Branch: `advisor/015-enable-test-harness`
- Conventional commits, one logical change per commit. Example from `git log`:
  `test(jobs): update stale leave-records query assertion`
- Do NOT push or open a PR unless the operator instructs it.

## Steps

### Step 1: Add the test script and dependency to all six workspaces

For each of the six manifests, add to `scripts`:

```json
    "test": "NODE_ENV=test vitest run --passWithNoTests",
```

and add `"vitest": "^4.1.10"` to `devDependencies`.

`--passWithNoTests` is required: five of the six have no test files yet, and
without it `bun run test` would fail the moment the script exists. It is a
temporary accommodation, not a permanent one; Step 5 adds a guard so a package
with test files but no script cannot recur.

For `packages/auth` specifically, once you have written the test in Step 3 you
may drop `--passWithNoTests`. Leave it on the other five.

**Verify**: `bun install` → exit 0, then `bun run test` → exit 0 and its output
mentions all six package names.

### Step 2: Confirm the harness actually reaches the new packages

Add a temporary failing test in `packages/auth`, for example a file containing
`it("harness reaches this package", () => { expect(1).toBe(2); })`, and run
`bun run test`.

**Verify**: `bun run test` FAILS, and the failure is attributed to
`@repo/auth`. If it passes, the harness is still not reaching the package and
that is a STOP condition. Delete the temporary file once you have seen it fail.

This step exists because a silently-skipped package is exactly the failure this
plan is fixing, and the only way to know the fix worked is to watch it catch
something.

### Step 3: Test `entitlements.ts`

Create `packages/auth/entitlements.test.ts`. Mock `@repo/database` with
`vi.mock`, following the `vi.hoisted` mock-object pattern used in
`packages/availability/src/approvals/approval-service.test.ts:1-60`.

Cover `withinLimit`:

1. `limit: 10`, `current: 5` → `allowed: true`.
2. `limit: 10`, `current: 10` → `allowed: false`. This pins the boundary; the
   comparison is strict `<`.
3. `limit: 10`, `current: 11` → `allowed: false`.
4. `limit: -1` (unlimited), `current: 999999` → `allowed: true`.
5. `getUsageCounter` returns `null` → `current: 0` and `allowed: true` for any
   positive limit.
6. `getPlanLimits` throws → `ok: false` with the internal error, not an
   exception.

Cover `activePlanKey` indirectly through `withinLimit` and `hasFeature`, by
asserting which plan key `getPlanLimits` was called with:

7. Subscription `status: "active"`, `plan_key: "premium"` → called with
   `"premium"`.
8. Subscription `status: "trialing"`, `plan_key: "premium"` → called with
   `"premium"`.
9. Subscription `status: "canceled"`, `plan_key: "premium"` → called with
   `"basic"`.
10. Subscription `status: "active"`, `plan_key: "enterprise_legacy"` (not a
    valid `PlanKey`) → called with `"basic"`.
11. No subscription at all → called with `"basic"`.

Cover `hasFeature`:

12. Returns the feature flag for the resolved plan.
13. A throwing dependency yields `ok: false` rather than an exception.

**Verify**: `bunx vitest run packages/auth` → all pass, 13 cases.

### Step 4: Confirm the suite is genuinely wired in

**Verify**: `bun run test` → exit 0 and its output includes `@repo/auth` with 13
passing tests. Running the package's tests directly is not sufficient evidence;
the point of this plan is that the aggregate command reaches them.

### Step 5: Add a CI guard so this cannot silently recur

In `.github/workflows/ci.yml`, add a step before the unit-test step that fails
when a workspace contains test files but declares no `test` script:

```yaml
      - name: Guard against untestable workspaces
        run: |
          status=0
          for manifest in apps/*/package.json packages/*/package.json; do
            dir=$(dirname "$manifest")
            if find "$dir" -name node_modules -prune -o -name '*.test.ts' -print -o -name '*.test.tsx' -print | grep -q .; then
              if ! node -e "process.exit(require('./$manifest').scripts?.test ? 0 : 1)"; then
                echo "ERROR: $dir contains test files but declares no test script"
                status=1
              fi
            fi
          done
          exit $status
```

**Verify**: run the same shell block locally; it must exit 0.

### Step 6: Confirm nothing else regressed

**Verify**: `bun run test` → exit 0, `bun run typecheck` → exit 0, and
`bun run check` → exit 0.

## Test plan

- New tests: 13 cases in `packages/auth/entitlements.test.ts`.
- Structural pattern to copy: `packages/billing/src/*.test.ts` for a small
  package's suite, and
  `packages/availability/src/approvals/approval-service.test.ts:1-60` for the
  `vi.hoisted` + `vi.mock` database mocking style.
- The load-bearing cases are 2 (`current === limit` is denied) and 10 (an
  unrecognised plan key falls back to Basic). Those two encode the billing
  decisions that currently have no coverage at all.
- Step 2's deliberate failing test is part of the verification, not an
  afterthought: it is the only proof the harness reaches the package.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `bun run typecheck` exits 0
- [ ] `bun run check` exits 0
- [ ] `bun run test` exits 0 and its output names all six previously-skipped
      workspaces
- [ ] `bunx vitest run packages/auth` passes with 13 tests
- [ ] For each of the six workspaces,
      `node -e "const p=require('./<dir>/package.json'); process.exit(p.scripts?.test?0:1)"`
      exits 0
- [ ] The temporary failing test from Step 2 has been deleted
      (`git status --short` shows no stray test file)
- [ ] The CI guard step exists in `.github/workflows/ci.yml` and passes locally
- [ ] Status row for plan 015 updated in `plans/README.md`

## STOP conditions

Stop and report back (do not improvise) if:

- Step 2's deliberately failing test PASSES. That means the harness still is not
  reaching the package and the rest of the plan is built on a false premise.
- Any of the 13 entitlement tests fails against the current implementation. Do
  NOT change `entitlements.ts` to make a test pass. Report the case, the expected
  behaviour and the actual behaviour: a billing-enforcement change needs a human
  decision, and discovering one is a successful outcome for this plan, not a
  blocker to work around.
- A package fails to run vitest without additional configuration (for example
  `packages/design-system` needing a JSDOM environment). Add the minimal config
  needed, or if that turns into real work, leave that package with
  `--passWithNoTests` and report which packages need config follow-up.
- `apps/web` turns out to need a browser environment to run any test at all.

## Maintenance notes

- What this plan does and does not do: it makes six workspaces *capable* of
  running tests, and writes a real suite for the one that most needed it. The
  other five now have a working harness and no tests. That is a deliberate stop
  point; adding token tests to five packages to make a number go up would be
  worse than leaving them empty and honest.
- `--passWithNoTests` should be removed from a package the moment it gains its
  first real test. A reviewer should treat a long-lived `--passWithNoTests` as a
  reminder, not a settled state.
- The CI guard in Step 5 is the durable fix. Without it, the next package created
  from a template will have the same gap and nobody will notice for months.
- `packages/auth/helpers.ts` was deliberately left untested. It is a thin
  re-export of Clerk functions, so a test there would assert that the mock
  returns what the mock was told to return. `entitlements.ts` is where the logic
  lives.
- Several other plans depend on this one landing first, because they add tests to
  packages that currently cannot run them.
