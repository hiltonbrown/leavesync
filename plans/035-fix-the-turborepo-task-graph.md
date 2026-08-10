# Plan 035: Fix the Turborepo task graph for `test` and `typecheck`

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report, do not improvise. When done, update this plan's status row in
> `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 75202db..HEAD -- turbo.json package.json .github/workflows/ci.yml packages/database/package.json`
> If any changed since this plan was written, re-check the "Current state"
> facts before proceeding.

- **Status**: DONE (2026-08-10)
- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none. Plan 015 adds `test` scripts to six workspaces and
  benefits from this landing first; either order works.
- **Category**: dx, ci
- **Planned at**: commit `75202db`, 2026-07-25
- **Reconciled**: 2026-08-10. Initial execution hit STOP condition in Step 4 because `typecheck: { "dependsOn": ["^build"] }` only triggers `build` on *upstream workspace dependencies*. Since `@repo/database` has no workspace dependencies, `^build` resolves to empty for `@repo/database`, leaving `@repo/database#typecheck` running before `@repo/database#build` (`prisma generate`). Refined task graph configuration to add package-specific task override `"@repo/database#typecheck": { "dependsOn": ["build"] }` in `turbo.json`. Verified that with this override, `rm -rf packages/database/generated && bun run typecheck` succeeds from clean state.

## Why this matters

`turbo.json` declares both `test` and `typecheck` as depending on the same task
in every upstream package:

```json
    "test": {
      "dependsOn": ["^test"]
    },
    "typecheck": {
      "dependsOn": ["^typecheck"]
    },
```

Neither dependency is real, and each has a cost.

**`test` depending on `^test`** serialises the test suite along the dependency
graph. `packages/core` must finish testing before `packages/database` starts,
which must finish before `packages/availability` starts, and so on up to the
apps. Nothing about running one package's unit tests requires another
package's unit tests to have run: they are pure functions of source code. The
result is a suite that could run mostly in parallel running mostly in series,
and a single failure in `packages/core` preventing every downstream package's
tests from running at all, so one failure reports as one failure when it might
be one of ten.

**`typecheck` depending on `^typecheck`** is the wrong dependency rather than a
redundant one. These packages ship TypeScript source and have no build step, so
typechecking `apps/app` reads `packages/availability`'s `.ts` files directly; it
does not need `packages/availability` to have been typechecked first. What it
*does* need is `packages/database`'s **generated Prisma client**, which is
produced by that package's `build` script (`prisma generate`), not by its
`typecheck` script.

CI works around this by generating the client explicitly before typechecking:

```yaml
      - name: Generate Prisma client
        run: cd packages/database && bunx prisma generate
```

That step is why CI passes. A developer running `bun run typecheck` on a fresh
clone without it gets errors about missing generated types, and the task graph
does not tell them why.

Neither problem is urgent. Both are cheap to fix and the second one encodes a
real fact about the repository that is currently only expressed in a CI
workaround.

## Current state

### `turbo.json` in full

```json
{
  "$schema": "https://v2-10-0.turborepo.dev/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "ui": "tui",
  "envMode": "loose",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [
        ".next/**",
        "!.next/cache/**",
        "**/generated/**",
        ".react-email/**"
      ]
    },
    "test": {
      "dependsOn": ["^test"]
    },
    "typecheck": {
      "dependsOn": ["^typecheck"]
    },
    "test:integration": {
      "dependsOn": ["^test:integration"],
      "cache": false
    },
    "analyze": {
      "dependsOn": ["^analyze"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "translate": {
      "dependsOn": ["^translate"],
      "cache": false
    },
    "clean": {
      "cache": false
    },
    "//#clean": {
      "cache": false
    }
  }
}
```

Note `test:integration` has the same `^test:integration` shape and the same
problem. It also correctly sets `cache: false`, which `test` and `typecheck` do
not need (they are deterministic in their inputs).

### Only `packages/database` has a meaningful build

```
packages/database/package.json:
  "build": "prisma generate --no-hints --schema=./prisma/schema.prisma",
```

The three Next.js apps have `build` scripts too, but nothing typechecks
*against* an app, so `^build` from an app is never the dependency that matters.
Every other package is source-only.

### CI compensates manually

`.github/workflows/ci.yml` lines 45-52:

```yaml
      - name: Generate Prisma client
        run: cd packages/database && bunx prisma generate

      - name: Lint
        run: bun run check

      - name: Typecheck
        run: bun run typecheck
```

The explicit generate is what makes the typecheck work. Turborepo is not
expressing that requirement.

## Design

Four edits to `turbo.json`:

1. **`test`: remove `dependsOn` entirely.** Unit tests depend on nothing but
   their own package's source. Turbo will then run every package's tests in
   parallel up to its concurrency limit.
2. **`typecheck`: change `["^typecheck"]` to `["^build"]`.** That expresses the
   real requirement (generated artefacts from upstream packages) rather than a
   fictional one. Turbo skips packages with no `build` script, so this costs
   nothing for source-only packages and correctly runs `prisma generate` for
   downstream consumers of `packages/database`.
3. **`@repo/database#typecheck`: add package-specific override `["build"]`.**
   Because `^build` only schedules builds for *upstream dependencies*, and
   `@repo/database` has no workspace dependencies, `@repo/database#typecheck`
   needs an explicit task override pointing to its own package `build` script (`prisma generate`).
4. **`test:integration`: remove `dependsOn`, keep `cache: false`.** Same
   reasoning as `test`. Integration tests depend on a database, which Turbo
   does not model either way.

**Do not add `inputs` declarations** to tighten cache keys in this plan. That
is a separate optimisation with its own failure mode (an incomplete `inputs`
list produces stale cache hits, which is worse than no caching) and it should
not ride along with a dependency-graph change.

**Consider whether `bun run typecheck` should still work without the CI
generate step.** With `dependsOn: ["^build"]`, `turbo typecheck` will run
`packages/database`'s `build` first, so it should. Step 4 verifies exactly
that, from a clean state. If it works, the CI step becomes redundant, but
**leave it in place**: it is cheap, it is explicit, and removing it couples CI
correctness to a Turbo behaviour that is now the only thing guaranteeing it.
Note the redundancy in the maintenance section instead.

## Commands you will need

All run from the repo root.

```
bun install                # run first if you hit "Cannot find module '@repo/observability/log'"
bun run check
bun run typecheck
bun run test
bun run build
bunx turbo typecheck --graph    # renders the task graph
bunx turbo test --dry-run=json  # shows what would run, without running it
```

## Scope

**In scope:**

- `turbo.json`

**Explicitly out of scope:**

- `.github/workflows/ci.yml`. The explicit Prisma generate stays. Plan 016 adds
  a build step to CI and is the plan that owns that file.
- Any `package.json` script. Plan 015 adds `test` scripts to six workspaces and
  plan 020 splits `packages/xero`'s test lanes; neither conflicts with this,
  but neither is this plan's business.
- Turbo `inputs`, `outputs` or `cache` settings for `test` and `typecheck`.
- Remote caching.
- The `build`, `dev`, `analyze`, `translate` and `clean` tasks.

## Git workflow

```
git checkout -b chore/fix-turbo-task-graph
```

Commit message:

```
chore: express the real task dependencies for test and typecheck
```

Do not push or open a pull request unless the user asks.

## Steps

### Step 1: Establish the baseline

```
bun run check
bun run typecheck
bun run test
```

**Expected**: all three exit 0. Record the test count **and the wall-clock time
of `bun run test`**. The timing is the evidence for change 1; without it you
cannot say whether the change helped.

Run it twice and take the second figure, so Turbo's cache is warm in both the
before and after measurements. Better still, run with caching off for a clean
comparison:

```
bunx turbo test --force
```

Record that time too.

### Step 2: Capture the current task graph

```
bunx turbo test --dry-run=json > /tmp/turbo-test-before.json
bunx turbo typecheck --dry-run=json > /tmp/turbo-typecheck-before.json
```

(Use the session scratchpad directory rather than `/tmp` if one is configured.)

Read the `tasks[].dependencies` arrays in each. This is the before picture and
you will diff against it in Step 5.

### Step 3: Edit `turbo.json`

Change the task definitions:

```json
    "test": {},
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "@repo/database#typecheck": {
      "dependsOn": ["build"]
    },
    "test:integration": {
      "cache": false
    },
```

Add a comment explaining the `typecheck` dependency, since it is the
non-obvious one. `turbo.json` is strict JSON, not JSONC, so a comment is not
possible in the file. **Put the explanation in the commit message instead**,
and check whether the repo has a `docs/` or `CONTRIBUTING` note where task
conventions belong; if not, the commit message is the record.

Suggested commit body:

```
test and test:integration depend on nothing: unit and integration tests are a
function of their own package's source, so ^test only serialised the suite
along the dependency graph and let one upstream failure prevent every
downstream package's tests from running.

typecheck depends on ^build, not ^typecheck. These packages ship TypeScript
source with no build step, so typechecking a consumer reads the producer's .ts
files directly. What it genuinely needs is packages/database's generated Prisma
client, which comes from that package's build script. CI has been compensating
with an explicit prisma generate step.
```

**Verify the file is valid JSON**:

```
node -e "console.log(Object.keys(require('./turbo.json').tasks))"
```

**Expected**: the task list prints without a parse error.

### Step 4: Verify the typecheck works from a clean state

This is the step that proves change 2 does something real.

```
rm -rf packages/database/generated
bun run typecheck
```

**Expected**: Turbo runs `packages/database`'s `build` (visible in the output
as a `@repo/database#build` task), regenerating the client, and then the
typecheck succeeds.

`packages/database/generated` is git-ignored (`biome.jsonc` excludes it and
`turbo.json` lists `**/generated/**` as a build output), so removing it is safe
and it is regenerated. Confirm before removing:

```
git check-ignore -v packages/database/generated
```

**If the typecheck fails after the clean**, change 2 has not had the intended
effect. Report the error and go to STOP conditions.

Then restore a normal state:

```
bun run build
```

### Step 5: Verify the graph changed as intended

```
bunx turbo test --dry-run=json > /tmp/turbo-test-after.json
bunx turbo typecheck --dry-run=json > /tmp/turbo-typecheck-after.json
```

Compare against Step 2's captures.

**Expected**:

- in the `test` graph, every task's `dependencies` array is now empty;
- in the `typecheck` graph, `@repo/database#build` appears, and tasks depend on
  upstream `build` rather than upstream `typecheck`.

### Step 6: Measure

```
bunx turbo test --force
```

**Expected**: exits 0, with the same test count as Step 1 and a wall-clock time
no worse than the baseline. On a machine with several cores it should be
meaningfully faster, because the suite now parallelises.

**Record both numbers in your report.** If the time is unchanged, say so: the
correctness argument for the change stands on its own (one upstream failure no
longer blocks downstream tests from running), but do not claim a speedup that
did not happen.

### Step 7: Verify failure isolation improved

Introduce a deliberate failure in a low-level package and confirm downstream
tests still run.

Pick a test in `packages/core` and make it fail temporarily (change an expected
value). Then:

```
bunx turbo test --force
```

**Expected**: `packages/core` fails, and `packages/availability`,
`packages/feeds`, `packages/jobs` and the apps **still run** and report their
own results. Before this change they would have been skipped.

**Revert the deliberate failure and confirm**:

```
git checkout packages/core
git diff --stat
bun run test
```

**Expected**: `git diff --stat` shows no change under `packages/core`; the test
suite passes.

This is the step that demonstrates the real benefit. Record what you observed.

### Step 8: Full verification

```
bun run check
bun run typecheck
bun run test
bun run build
git diff --name-only
```

**Expected**: the first four exit 0; the last lists only `turbo.json`.

## Test plan

No unit tests. This is build-orchestration configuration and the verification
is the commands themselves.

The three that matter, in order of importance:

1. **Step 4** (clean generated directory, typecheck still works) proves the
   `^build` dependency is real rather than decorative.
2. **Step 7** (upstream failure does not block downstream tests) proves the
   `test` change delivers the correctness benefit claimed for it.
3. **Step 6** (timing) is the performance claim and should be reported
   honestly, including if it is a wash.

Do not write a test that parses `turbo.json` and asserts on its contents. It
would assert the configuration matches itself and would break every time
someone legitimately adds a task.

## Done criteria

All of the following, verbatim:

1. `bun run check` exits 0.
2. `bun run typecheck` exits 0.
3. `bun run test` exits 0 with the **same** test count as the Step 1 baseline.
4. `bun run build` exits 0.
5. `node -e "const t=require('./turbo.json').tasks; console.log(JSON.stringify(t.test), JSON.stringify(t.typecheck), JSON.stringify(t['@repo/database#typecheck']), JSON.stringify(t['test:integration']))"`
   shows `test` with no `dependsOn`, `typecheck` with `["^build"]`, `@repo/database#typecheck` with `["build"]`, and
   `test:integration` with `cache: false` and no `dependsOn`.
6. Step 4 was performed: the generated directory was removed, `bun run
   typecheck` regenerated it and succeeded.
7. Step 7 was performed: an upstream failure did not prevent downstream
   packages from running, and the deliberate failure was reverted with a clean
   `git diff`.
8. Baseline and post-change `bun run test` timings are both recorded in the
   report.
9. `git diff --name-only` lists exactly one source file, `turbo.json`, plus this
   plan file and `plans/README.md` for the status update.

## STOP conditions

Stop and report back rather than improvising if any of these occur:

- **The baseline in Step 1 is not green.** Report what fails; change nothing.
- **`bun run typecheck` fails after removing `packages/database/generated`**
  (Step 4). That means `^build` is not producing what the typecheck needs.
  Report the error and restore with `bun run build`. Do not paper over it by
  reverting `typecheck` to `^typecheck`, which would leave the repository
  depending on a CI step nobody documented.
- **The test count changes.** Removing a dependency edge must not change which
  tests run, only when. Report which package's count moved: the likely cause is
  a test that was implicitly relying on another package's test run having
  happened first, which would be a real defect worth naming.
- **A test starts failing that passed before.** Same cause as above: an
  order-dependent test. Report which one. Do not restore the `^test` edge to
  hide it; a test that needs another package's tests to run first is broken and
  the serialisation was masking it.
- **You cannot revert the Step 7 deliberate failure cleanly.** Run
  `git checkout packages/core` and confirm with `git diff`. Stop if the file is
  still modified.
- **`turbo.json` rejects an empty task object** (`"test": {}`). Some schema
  versions require at least one key. If so, use `"test": { "cache": true }`,
  which is the default, and note the change.

## Maintenance notes

- **`dependsOn` should express a real artefact dependency, not a habit.** The
  question to ask of any `^task` edge is: does the downstream task read
  something the upstream task produces? For `build`, yes. For `typecheck` in
  this repo, only `packages/database`'s generated client, which comes from
  `build`. For `test`, nothing.
- **The CI `prisma generate` step is now redundant but should stay.** After
  this change `turbo typecheck` generates the client itself. Keeping the
  explicit step means CI does not silently depend on a Turbo behaviour, and it
  makes the requirement visible to anyone reading the workflow. If someone
  removes it later, Step 4 is the check that says whether that is safe.
- **`analyze` and `translate` still use `^task`.** They were left alone
  deliberately, not because they are correct: nobody audited them. If either
  becomes slow or starts blocking, apply the same question.
- **Turbo `inputs` are not declared for any task**, so cache keys are based on
  the whole package. That is conservative and correct, just not optimal. If
  cache hit rates ever become a problem, declaring `inputs` is the lever, and
  it needs care: an incomplete list produces stale hits, which is a much worse
  failure than a cache miss.
- **Related plans**: 015 (adds `test` scripts to six workspaces, which this
  change lets run in parallel), 020 (splits `packages/xero`'s unit and
  integration lanes), 016 (adds a build step to CI, and is the plan that owns
  `.github/workflows/ci.yml`).
