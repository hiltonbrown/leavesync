# Plan 020: Make the Xero disconnect integration test actually run

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report, do not improvise. When done, update this plan's status row in
> `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 75202db..HEAD -- packages/xero/src/oauth/disconnect.integration.test.ts packages/xero/package.json packages/jobs/package.json .github/workflows/ci.yml`
> If any changed since this plan was written, re-check the "Current state"
> facts before proceeding.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: tests
- **Planned at**: commit `75202db`, 2026-07-25

## Why this matters

`packages/xero/src/oauth/disconnect.integration.test.ts` is a 393-line test that
covers the single most destructive operation in the product: disconnecting a
Xero connection, optionally with `destructive: true`, which archives people and
availability records and deletes leave balances, person matches, sync runs and
sync cursors. Its two cases assert exactly the right thing: that the blast
radius stops at the target tenant and that a second tenant's data is untouched.

It has never run. Not in CI, not in the default local test command, not in the
integration lane.

Three independent reasons, each sufficient on its own:

1. Its gate requires `RUN_XERO_DISCONNECT_INTEGRATION=true`, and that variable
   is set nowhere in the repository, nowhere in CI, and in no `.env.example`.
   The four job-handler integration tests gate on `DATABASE_URL` instead, which
   CI does set, so those do run.
2. `packages/xero` has no `test:integration` script, so
   `bun run test:integration` at the root never dispatches to it.
3. The file also contains a second `describe.skip` block whose only test
   asserts `runDisconnectIntegration === false`. It is a test that asserts the
   test is disabled, and it is itself skipped, so it does not even report that.

A destructive, cross-tenant, hard-to-reverse operation is exactly the code that
justifies an integration test, and this one is already written. Turning it on
is close to free. Leaving it off is worse than not having it, because the file's
presence makes the operation look covered.

## Current state

### The gate that never opens

`packages/xero/src/oauth/disconnect.integration.test.ts` lines 14-17:

```typescript
const runDisconnectIntegration =
  process.env.RUN_XERO_DISCONNECT_INTEGRATION === "true" &&
  Boolean(process.env.DATABASE_URL);
const describeDisconnect = runDisconnectIntegration ? describe : describe.skip;
```

Confirm the variable is set nowhere:

```
grep -rn "RUN_XERO_DISCONNECT_INTEGRATION" . --include=* -l 2>/dev/null | grep -v node_modules
```

At commit `75202db` this returns only the test file itself.

### The vestigial meta-test

Lines 56-60:

```typescript
describe.skip("disconnectXeroOAuthConnection integration opt-in", () => {
  test("requires RUN_XERO_DISCONNECT_INTEGRATION=true and a disposable DATABASE_URL", () => {
    expect(runDisconnectIntegration).toBe(false);
  });
});
```

Hard-coded `describe.skip`, so it never executes. Even if it did, it asserts
the *opposite* of what this plan wants: that the integration run is off.

### The two real tests

Lines 62-116. They are well-built and need no changes:

```typescript
describeDisconnect("disconnectXeroOAuthConnection integration", () => {
  ...
  test("non-destructive disconnect clears only the target connection tokens", async () => {
    const result = await disconnectXeroOAuthConnection({
      clerkOrgId: tenantA.clerkOrgId,
      connectionId: tenantA.connectionId,
      destructive: false,
      organisationId: tenantA.organisationId,
      performedByUserId: "admin_1",
    });

    expect(result).toEqual({ ok: true, value: { disconnected: true } });

    await expectConnectionDisconnected(tenantA, "admin_1");
    await expectConnectionActive(tenantB);
    await expectTenantDataPresent(tenantA);
    await expectTenantDataPresent(tenantB);
  });

  test("destructive disconnect clears only tenant-scoped Xero data", async () => {
    ...
    await expectConnectionDisconnected(tenantA, "admin_1");
    await expectTargetTenantDestroyed(tenantA);
    await expectConnectionActive(tenantB);
    await expectTenantDataPresent(tenantB);
  });
});
```

Its cleanup is correctly bounded. Lines 118-152 delete only rows whose
`clerk_org_id` is in a two-element fixture list:

```typescript
const tenantFixtures = [tenantA, tenantB] as const;
const testClerkOrgIds = tenantFixtures.map((tenant) => tenant.clerkOrgId);
```

with fixture org ids `org_test_disconnect_a` and `org_test_disconnect_b`
(lines 28 and 42). It cannot touch other data.

### The script asymmetry

`packages/xero/package.json` scripts:

```json
"test": "NODE_ENV=test vitest run",
"typecheck": "tsc --noEmit --emitDeclarationOnly false"
```

Compare `packages/jobs/package.json`, which is the pattern the other four
database-touching packages follow:

```json
"test": "NODE_ENV=test vitest run --exclude '**/*.integration.test.ts'",
"test:integration": "NODE_ENV=test vitest run .integration.test.ts",
```

`packages/availability`, `packages/feeds` and `packages/database` are identical
to `packages/jobs` in this respect. `packages/xero` is the odd one out: its
unfiltered `test` script sweeps the integration file into the **unit** lane,
and it has no integration lane at all.

### How the other integration tests gate

`packages/jobs/src/handlers/sync-xero-leave-records.integration.test.ts`,
`sync-xero-leave-balances.integration.test.ts` and
`reconcile-xero-approval-state.integration.test.ts` all use:

```typescript
const describeWithDatabase = process.env.DATABASE_URL
  ? describe
  : describe.skip;
```

That is the convention this plan adopts for the disconnect test.

### CI already provides the database

`.github/workflows/ci.yml` lines 17-33 stand up a `postgres:16` service and set
the job-level `DATABASE_URL`, and lines 73-74 run the integration lane:

```yaml
      - name: Run integration tests
        run: bun run test:integration
```

So once `packages/xero` has a `test:integration` script and the test gates on
`DATABASE_URL`, CI runs it with no workflow change.

## Commands you will need

All run from the repo root.

```
bun install                # run first if you hit "Cannot find module '@repo/observability/log'"
bun run check
bun run typecheck
bun run test               # unit lane
bun run test:integration   # integration lane (needs DATABASE_URL)
bunx vitest run packages/xero/src/oauth/disconnect.integration.test.ts
```

**This plan requires a disposable PostgreSQL database.** The test creates,
mutates and deletes rows. It scopes every delete to its two fixture
`clerk_org_id` values, so it will not touch unrelated data, but do not point
`DATABASE_URL` at anything you care about. If you do not have a throwaway
database, go to STOP conditions.

## Scope

**In scope:**

- `packages/xero/package.json` (two script entries)
- `packages/xero/src/oauth/disconnect.integration.test.ts` (the gate and the
  vestigial `describe.skip` block)

**Explicitly out of scope:**

- `.github/workflows/ci.yml`. No workflow change is needed; the integration
  step and the database service already exist.
- The two real test bodies, the fixtures, and the helper functions
  (`cleanTestData`, `createTenantFixture`, `expect*`). They are correct.
- `packages/xero/src/oauth/service.ts`. This plan runs an existing test; it
  does not change the code under test. If the test fails once enabled, see
  STOP conditions.
- The other four integration test files. They already run.
- Adding `test:integration` to packages that have no integration tests. That is
  plan 015's territory.

## Git workflow

```
git checkout -b test/enable-xero-disconnect-integration
```

Commit message:

```
test(xero): run the disconnect integration test in the integration lane
```

Do not push or open a pull request unless the user asks.

### Step 1: Establish the baseline

```
bun run check
bun run typecheck
bun run test
bun run test:integration
```

**Expected**: all four exit 0. Record the test counts from the last two. The
integration lane should currently report tests from `availability`, `database`,
`feeds` and `jobs`, and **nothing** from `xero`.

Confirm the disconnect test is currently inert:

```
bunx vitest run packages/xero/src/oauth/disconnect.integration.test.ts
```

**Expected**: the run reports skipped suites and zero passing tests. This is
the "before" evidence.

### Step 2: Split the xero test scripts

Edit `packages/xero/package.json`. Change:

```json
    "test": "NODE_ENV=test vitest run",
```

to:

```json
    "test": "NODE_ENV=test vitest run --exclude '**/*.integration.test.ts'",
    "test:integration": "NODE_ENV=test vitest run .integration.test.ts",
```

Keep the existing key ordering convention of the file (the other packages list
`test` then `test:integration`, alphabetically adjacent).

**Verify**:

```
node -e "console.log(JSON.stringify(require('./packages/xero/package.json').scripts, null, 2))"
```

**Expected**: `test` carries the `--exclude` flag and `test:integration` is
present, matching `packages/jobs/package.json` exactly apart from indentation.

Then confirm Turborepo now dispatches to it:

```
bun run test:integration
```

**Expected**: the run now includes `@repo/xero`, and its suites are **skipped**
(the gate has not changed yet). Exit code 0.

### Step 3: Change the gate to `DATABASE_URL`

Edit `packages/xero/src/oauth/disconnect.integration.test.ts`. Replace lines
14-17:

```typescript
const runDisconnectIntegration =
  process.env.RUN_XERO_DISCONNECT_INTEGRATION === "true" &&
  Boolean(process.env.DATABASE_URL);
const describeDisconnect = runDisconnectIntegration ? describe : describe.skip;
```

with the convention used by the job integration tests:

```typescript
const describeDisconnect = process.env.DATABASE_URL ? describe : describe.skip;
```

### Step 4: Delete the vestigial meta-test

Remove lines 56-60 entirely:

```typescript
describe.skip("disconnectXeroOAuthConnection integration opt-in", () => {
  test("requires RUN_XERO_DISCONNECT_INTEGRATION=true and a disposable DATABASE_URL", () => {
    expect(runDisconnectIntegration).toBe(false);
  });
});
```

It references `runDisconnectIntegration`, which Step 3 deleted, so leaving it
is a type error. Do not "fix" it by reintroducing the variable.

Check whether `describe` is still used elsewhere in the file after this
removal; if the import becomes unused, remove it from the `vitest` import list
at lines 2-10. `bun run check` will tell you.

**Verify**:

```
bun run typecheck
bun run check
grep -c "RUN_XERO_DISCONNECT_INTEGRATION" packages/xero/src/oauth/disconnect.integration.test.ts
```

**Expected**: typecheck and check exit 0; the grep prints `0`.

### Step 5: Run the test for real

```
bunx vitest run packages/xero/src/oauth/disconnect.integration.test.ts
```

**Expected**: two tests pass:

- `non-destructive disconnect clears only the target connection tokens`
- `destructive disconnect clears only tenant-scoped Xero data`

If either fails, go to STOP conditions. Do not modify
`packages/xero/src/oauth/service.ts` to make it pass.

### Step 6: Confirm the lanes are correctly split

The integration test must run in the integration lane and **not** in the unit
lane.

```
bun run test
```

**Expected**: exits 0. `@repo/xero`'s unit run no longer includes
`disconnect.integration.test.ts` (the `--exclude` flag). Its unit test count
should drop by the number of suites that file contributed, or stay the same if
it contributed only skipped suites.

```
bun run test:integration
```

**Expected**: exits 0, and the total is **two higher** than the Step 1
integration baseline.

### Step 7: Full verification

```
bun run check
bun run typecheck
bun run test
bun run test:integration
```

**Expected**: all four exit 0.

## Test plan

No new tests. This plan enables two existing ones and deletes a dead third.

The verification that matters is Step 6: the two tests must appear in the
integration lane's passing count, not merely stop being skipped. A test that
runs and passes is the deliverable; a test that is no longer marked skipped but
still contributes zero assertions is not.

If you want extra confidence that the test genuinely exercises the code,
temporarily break `disconnectXeroOAuthConnection` (for example by removing the
`clerk_org_id` filter from one of its deletes), confirm the test fails, then
revert. **If you do this, `git diff` must be empty afterwards.** This is
optional; do not leave any trace of it in the commit.

## Done criteria

All of the following, verbatim:

1. `bun run check` exits 0.
2. `bun run typecheck` exits 0.
3. `bun run test` exits 0.
4. `bun run test:integration` exits 0 with two more passing tests than the
   Step 1 baseline.
5. `grep -c "RUN_XERO_DISCONNECT_INTEGRATION" -r . --include=*.ts --include=*.json --include=*.yml 2>/dev/null | grep -v node_modules` finds no occurrences.
6. `grep -c "describe.skip" packages/xero/src/oauth/disconnect.integration.test.ts`
   prints `0` (the only remaining conditional is the ternary on
   `process.env.DATABASE_URL`, which does not contain the literal string when
   written as in Step 3).
7. `node -e "const s=require('./packages/xero/package.json').scripts; console.log(Boolean(s['test:integration']))"`
   prints `true`.
8. `git diff --name-only` lists exactly two files.

## STOP conditions

Stop and report back rather than improvising if any of these occur:

- **The baseline in Step 1 is not green.** Report what fails; change nothing.
- **No disposable `DATABASE_URL` is available.** Steps 5 and 6 cannot be
  verified. Report this rather than marking the plan done on the strength of a
  typecheck: the entire point is proving the test executes.
- **Either test fails once enabled.** This is the most important stop
  condition. A failure means one of two things: the test encodes an
  expectation the implementation never met, or `disconnectXeroOAuthConnection`
  has a real cross-tenant defect. Both matter and neither should be resolved by
  editing the test. Report the failing assertion, the expected and actual
  values, and which of the two you believe it is. Do not touch
  `packages/xero/src/oauth/service.ts`.
- **The test passes locally but leaves rows behind.** Check with:
  `SELECT count(*) FROM organisations WHERE clerk_org_id LIKE 'org_test_disconnect_%';`
  It should be 0 after the run. If not, the `afterAll` cleanup is incomplete
  and CI will accumulate state across runs. Report it.
- **`bun run test` in `packages/xero` drops more tests than expected** after
  the `--exclude` flag. That would mean other test files match
  `**/*.integration.test.ts` unintentionally. List them and stop.

## Maintenance notes

- **The unit/integration split is now uniform** across the five packages that
  touch the database: `availability`, `database`, `feeds`, `jobs` and `xero`
  all exclude `*.integration.test.ts` from `test` and run it from
  `test:integration`. A new database-touching package must follow the same
  shape or its integration tests will silently land in the unit lane, where
  they will either fail without a database or, worse, pass against a developer's
  real one.
- **`DATABASE_URL` is now the only gate.** That means any environment with a
  `DATABASE_URL` set runs the destructive disconnect test when the integration
  lane is invoked. The fixtures are scoped to two synthetic
  `clerk_org_id` values so this is safe, but the safety depends on
  `cleanTestData` and `createTenantFixture` staying scoped. In review, treat
  any widening of a `deleteMany` in that file as a serious change.
- **A per-test opt-in flag is an anti-pattern here.** The original
  `RUN_XERO_DISCONNECT_INTEGRATION` gate was presumably added to keep a
  destructive test out of casual local runs. The lane split achieves the same
  thing more honestly: `bun run test` never touches it, and
  `bun run test:integration` is explicit about what it is. If a future test
  genuinely needs a second opt-in, it also needs a home in CI, or it will end
  up exactly where this one was.
- **Related plan**: plan 015 adds a `test` script to six workspaces that have
  none. It and this plan both operate on package manifests but on different
  packages, so they do not conflict.
