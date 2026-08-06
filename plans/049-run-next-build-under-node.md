# Plan 049: Run `next build` under Node so `bun run build` stops crashing

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report, do not improvise. When done, update this plan's status row in
> `plans/README.md`.
>
> **Drift check (run first)**: `grep -n '"build"' apps/app/package.json apps/api/package.json apps/web/package.json`
> All three must currently read `"build": "bun --bun next build"`. If any already
> omits `--bun`, this plan has been partly applied; verify Step 3's gates and
> reconcile before continuing.

## Status

- **Priority**: P0
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none. **Unblocks**: plan 005's build gate, plan 016 (adds a
  build step to CI) and plan 046 (release build)
- **Category**: dx
- **Planned at**: commit `454ded7`, 2026-08-06
- **Execution status**: **DONE and VERIFIED** on the operator host at `44c2eb6`,
  2026-08-06. `bun run build` exits 0, `4 successful, 4 total`

Reconciled at `454ded7`: the three in-scope manifests had changed since the
original plan only because plan 048 sorted their `scripts` keys. Before this
plan was executed, all three build commands still read
`bun --bun next build`, so the diagnosis, scope and implementation steps were
unchanged.

### Execution attempt at `454ded7`

The executor applied the intended one-line change to each of the three package
manifests in the isolated worktree
`/tmp/teamcalendar-plan-049-executor`, on branch
`advisor/049-run-next-build-under-node`. The diff is scope-clean and remains
confined to those manifests. It is commit `71fa962`, merged into `main` as
`8adeaa5` at the operator's direction.
The plan is not marked DONE because the mandatory gates could not be completed.

Verified during review:

- `bun run check` exits 0: 722 files checked, no fixes applied.
- `bun run typecheck` exits 0: 18 successful tasks.
- The API and web production builds exit 0 and print route tables.
- The manifests contain exactly one `"build": "next build"` each; `dev` and
  `start` remain unchanged; `git diff --check` passes.

Blocked during review:

- Every app production build attempt, including an escalated reviewer rerun,
  stops when Turbopack tries to create an internal process that binds a local
  port. The host returns `Operation not permitted`. This occurs for both the
  Bun-runtime baseline and the Node-runtime build, so it is an execution-host
  restriction rather than evidence against the change.
- `bun run test` times out starting or stopping Vitest fork workers. A
  package-serial Turbo rerun clears the jobs tests, but the app tests still
  time out creating their own workers. No source assertion regression was
  identified.
- Because the app build does not complete, its route table and
  `ƒ Proxy (Middleware)` artefact cannot be reviewed on this host.

### Verification completed at `44c2eb6`, 2026-08-06

Rerun on the operator host, outside any agent sandbox. **The build gate now
passes and this plan is DONE.**

| Gate | Result |
|---|---|
| `bun run build` | **exit 0, `4 successful, 4 total`** |
| `cd apps/app && bun run build` | exit 0, full route table, `ƒ Proxy (Middleware)` present |
| `cd apps/api && bun run build` | exit 0, route table printed |
| `cd apps/web && bun run build` | exit 0, route table printed |
| `bun run check` | exit 0, 722 files, no fixes applied |
| `bun run typecheck` | exit 0, 18 successful |
| `cd apps/app && bunx vitest run --maxWorkers=2 --testTimeout=30000` | exit 0, 53 files / 175 tests |
| No `panic: Segmentation fault`, `SIGTRAP` or `Expected CommonJS module to have a function wrapper` in any build output | confirmed |

Structural criteria: `grep -l 'bun --bun next build'` over the three manifests
prints nothing; each contains exactly one `"build": "next build"`; all three
`.next` directories exist; `dev` and `start` are unchanged; `git status --short`
shows only plan files modified.

**The previously reported "host denies Turbopack's internal process creation"
was a misdiagnosis.** The real cause was a stale `apps/web/.next` in the operator
tree, carrying a leftover `dev/lock` from a development server. It made
`apps/web` fail deterministically at
`PostCssTransformedAsset::process -> evaluate_webpack_loader -> creating new
process -> timed out waiting for the Node.js process to connect (30s timeout)`,
with empty process output and empty process error output.

Two facts settle the attribution:

- The identical failure reproduced under the **old** `bun --bun next build`
  command, so it was never caused by, and could never be fixed by, this plan.
- `rm -rf apps/web/.next` followed by `bun run build` in `apps/web` exits 0.

If this signature reappears, clear the app's `.next` directory before suspecting
the host, the runtime or this change. It is a git-ignored artefact and rebuilds
from scratch.

### Production deployment confirmed green, 2026-08-07

The fix was committed locally on 2026-08-06 but **not pushed**, so Vercel kept
building `454ded7`, the commit immediately before it, and production stayed
broken for another day. The local build gate passing is not evidence that
production is fixed; only a deployment is.

Pushed `454ded7..6ae7291`. All three production deployments of `6ae7291` reached
`READY`, the first green production builds since `754a5aac`:

| App | Deployment | State |
|---|---|---|
| `teamcalendar-app` | `dpl_CxGfnMTo6cNvGkxW4dX7GbEqgnN4` | READY |
| `teamcalendar-api` | `dpl_A4NW5mgWLyYKMFTAvVkGp3ssZPTu` | READY |
| `teamcalendar-web` | `dpl_ENoziLD1duWPV3CNSmJfodDg4Pjy` | READY |

This closes the last open question on this plan. The `Expected CommonJS module
to have a function wrapper` failure is gone on x64 as well as arm64, confirming
the diagnosis end to end.

### Two failures remain on `main`, both out of scope for this plan

Neither is caused by this change: it edits three `"build"` scripts, which no
test reads.

- `bun run test` exits 1. `@repo/jobs` fails
  `src/handlers/sync-xero-leave-records.integration.test.ts` and the `app` suite
  reports `Timeout terminating forks worker`. The `app` suite passes cleanly
  per-package (175 tests).
- `bun run test:integration` exits 1 in `@repo/database` against live Neon.

The `@repo/jobs` failure is **non-deterministic**: one failing test on a
package-wide run, two on a single-file rerun, with `expected "Annual leave",
received "Previous title"`. That is shared live-database state pollution, most
likely seed data left behind when the `@repo/database` integration suite aborts
before its `afterAll` `cleanSeedData()`. It needs its own plan; do not treat it
as a regression from this one.

## Why this matters

`bun run build` fails. `apps/app` crashes the Bun runtime with a segmentation
fault partway through `next build`, reproducibly, at the same address every
time. The other apps build; only `app` is large enough to trigger it.

This blocks three separate plans. Plan 005 requires `bun run build` to exit 0
and calls that step "not optional". Plan 016 adds a production build to CI, and
would be adding a step that cannot pass. Plan 046 gates the release on a clean
build of every deployable app.

The cause is not the application code and not the Next version. The build
scripts pass `bun --bun`, which forces Next to execute under the **Bun runtime**
instead of Node. Running the identical build under Node 24 succeeds completely.
This is a Bun runtime bug, and the fix is to stop asking Bun to run a Node
program: Bun stays as the package manager and task runner, while `next build`
runs on Node, which is what Next.js targets and what Vercel's own build
environment provides.

## Current state

### The failure

`bun run build`, at commit `f1884db`:

```
app:build: Args: "node" "/home/hilton/Documents/teamcalendar/apps/app/node_modules/.bin/next" "build"
app:build: Elapsed: 25593ms | User: 74124ms | Sys: 13703ms
app:build: RSS: 0.15GB | Peak: 2.73GB | Commit: 0.15GB | Faults: 1 | Machine: 16.50GB
app:build: panic: Segmentation fault at address 0x13CB0
app:build: oh no: Bun has crashed. This indicates a bug in Bun, not your code.
app:build: error: Failed to run "next" due to signal SIGTRAP
app:build: error: script "build" was terminated by signal SIGTRAP
app#build:  ERROR  command (/home/hilton/Documents/teamcalendar/apps/app) bun run build exited (137)

 Tasks:    3 successful, 4 total
Failed:    app#build
```

Environment: `Bun v1.3.14 (0d9b296a) Linux arm64`, `WSL Kernel v6.18.33`,
`glibc v2.39`.

This is **not** memory exhaustion. Building `apps/app` on its own peaks at
1.06GB on a 16.5GB machine and crashes at the identical address, so the 2.73GB
figure from the full turbo run is incidental.

### The same build succeeds under Node

Verified on 2026-08-05, from `apps/app`:

```
$ node --version
v24.18.0

$ node ./node_modules/.bin/next build
... exit 0, full route table printed
```

And through the binary's own shebang, which is `#!/usr/bin/env node`:

```
$ ./node_modules/.bin/next build
... exit 0
```

### The scripts responsible

`apps/app/package.json`:

```json
    "dev": "bun --bun next dev -p 3000",
    "build": "bun --bun next build",
    "start": "bun --bun next start",
```

`apps/api/package.json` and `apps/web/package.json` carry the same
`"build": "bun --bun next build"`.

`bun --bun` explicitly overrides the shebang and forces the Bun runtime. Without
it, `next build` runs under Node.

### What `--bun` is worth here

Nothing measurable. `next build` spends nearly all of its time in Next's own
Rust/SWC compiler, not in the JavaScript runtime, so running the thin CLI
wrapper under Bun buys no build speed. It costs a hard crash on this platform.

### Deployment context

`apps/app/vercel.json`, `apps/api/vercel.json` and `apps/web/vercel.json` each
set `"bunVersion": "1.x"`, so Vercel runs the build command under Bun too.

**Confirmed on Vercel, 2026-08-06.** An earlier draft of this plan speculated
that Vercel's x64 build machines might not be hitting the crash, since the local
reproduction was `Linux arm64`. That was wrong, and the correction matters: this
is not a preventive change, it is an active production outage.

Every Vercel deployment of `main` since `754a5aac` has failed, including the
production build of `fb9f1cc`
(`dpl_88jvowzxWwv63RKNLQFUT3vmMsGV`, target `production`, state `ERROR`). All
three deployable apps fail, not just `apps/app`:

| App | Deployment | Exit |
|---|---|---|
| `apps/app` | `dpl_63eqWpwesZme9ooFJV3PWTqvF6HT` | `next` exited 1 |
| `apps/api` | `dpl_ELdJu9ZgGgTVnYLGQMnRXnjrKhgP` | `next` exited 1 |
| `apps/web` | `dpl_FAkE1f4YLiE5wkAspkmEQHjd3ovM` | SIGILL, exit 137 |

**The exit code is not a reliable signature; the message is.** `apps/web` exited
137 via SIGILL on one deployment and plain 1 on another from the same branch, so
match on the `Expected CommonJS module to have a function wrapper` text rather
than on an exit code.

All three fail at the same point, collecting page data, with the same message:

```
Error: Failed to load external module next/dist/compiled/next-server/app-page-turbo.runtime.prod.js:
TypeError: Expected CommonJS module to have a function wrapper.
If you weren't messing around with Bun's internals, this is a bug in Bun
> Build error occurred
Error: Failed to collect page data for /_not-found
```

The x64 symptom differs from the arm64 one (a module-loading `TypeError` rather
than a segfault), but the cause is identical: `next build` running under the Bun
runtime. Bun's own error text names Bun as the culprit.

Three further details from the full Vercel logs, all of which support the fix:

- **The compile succeeds.** Every app reports `✓ Compiled successfully` and
  `Finished TypeScript` before failing. The failure is at `Collecting page
  data`, which is where Next first *executes* the built server bundle. So this
  is not a compile error, a type error or an environment-validation failure;
  it is the Bun runtime failing to load a module Next just emitted, exactly as
  this plan's premise states.
- **Vercel runs `bun install v1.3.12`**, while the local reproduction was
  `v1.3.14`. Two different Bun versions on two architectures produce the same
  failure.
- **It is Turbopack-specific.** All three builds report
  `▲ Next.js 16.3.0 (Turbopack)`, the failing module is
  `app-page-turbo.runtime.prod.js`, and the stack enters through
  `externalRequire` in `[turbopack]_runtime.js`. Turbopack's runtime performs a
  CommonJS `require` that Bun mishandles. Do not treat switching bundlers as the
  fix here; removing `--bun` is smaller and is what this plan does.

This raises the stakes on the fix rather than changing it. Removing `--bun` is
still the whole change, and it now restores deployment for all three apps.
Plan 046 must not be discovering this during a launch window, and plan 016 must
not add a CI build step until it is done.

### Repo conventions that apply here

- Bun is the package manager and task runner (`CLAUDE.md`, "Stack"). This plan
  does not change that; it changes only which runtime executes `next build`.
- `engines.node` in the root `package.json` is `"22 || >=24.0.0"`, so Node is
  already a declared, supported runtime for this repo.
- Conventional commits, one logical change per commit.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Build everything | `bun run build` | exit 0, all four tasks succeed |
| Build one app | `cd apps/app && bun run build` | exit 0, route table printed |
| Node version | `node --version` | `v22.x` or `>=v24.x` |
| Typecheck | `bun run typecheck` | exit 0 |
| Unit tests | `bun run test` | exit 0, `10 successful, 10 total` |
| Lint and formatting check | `bun run check` | exit 0, no fixes applied |
| Integration tests | `bun run test:integration` | exit 0 |

## Scope

**In scope** (the only files you may modify):

- `apps/app/package.json` — the `build` script only
- `apps/api/package.json` — the `build` script only
- `apps/web/package.json` — the `build` script only
- `plans/049-run-next-build-under-node.md` and `plans/README.md`

**Out of scope** (do NOT touch, even though they look related):

- The `dev` and `start` scripts. `bun --bun next dev` works today and the
  operator uses it; changing the local development runtime is a separate
  decision with its own risk. This plan fixes the **build** gate only.
- `apps/*/vercel.json`. Leave `bunVersion` alone. Bun remains the package
  manager and task runner on Vercel; only the program Bun launches changes.
- `apps/email/package.json`. Its build script is `email build ...`, does not
  use `--bun`, and is excluded from `bun run build` by the root
  `--filter=!email`.
- `turbo.json`. The task graph is correct; plan 035 owns it.
- Any application or package source file. If the build fails for a **code**
  reason after this change, that is a STOP condition, not something to patch
  inline.
- Upgrading or downgrading Bun. Pinning a different Bun version is a much wider
  change than removing a flag, and the flag is not earning its risk.

## Git workflow

- Branch: `advisor/049-run-next-build-under-node`
- Single commit:
  `fix(build): run next build under node instead of the bun runtime`
- Do NOT push or open a PR unless the operator instructs it.

## Steps

### Step 0: Reproduce the crash and confirm the diagnosis

```
cd apps/app
bun run build; echo "EXIT: $?"
```

**Verify**: it fails, printing `panic: Segmentation fault` and
`Failed to run "next" due to signal SIGTRAP`.

Then confirm Node succeeds on the identical input:

```
node --version
./node_modules/.bin/next build; echo "EXIT: $?"
```

**Verify**: `node --version` reports `v22.x` or `v24.x` or later, and the build
exits 0 with a route table.

If `bun run build` **succeeds** at this step, STOP. The crash is
platform-specific and you are not reproducing it; changing the scripts without
reproducing the failure would be an unverified change.

If Node is **not installed**, STOP and report. Node is required by
`engines.node` and this plan's fix depends on it.

### Step 1: Drop the `--bun` flag from the three build scripts

In `apps/app/package.json`, `apps/api/package.json` and
`apps/web/package.json`, change exactly one line each:

```json
    "build": "next build",
```

Change nothing else in those files. Leave `dev` and `start` exactly as they are.

**Verify**:

```
grep -n '"build"' apps/app/package.json apps/api/package.json apps/web/package.json
```

All three read `"build": "next build"`, and

```
git diff --stat
```

shows exactly three files, one changed line each.

### Step 2: Build each app individually

```
cd apps/app && bun run build; echo "app EXIT: $?"
cd ../api && bun run build; echo "api EXIT: $?"
cd ../web && bun run build; echo "web EXIT: $?"
```

**Verify**: all three exit 0. Each prints a Next route table. No
`panic: Segmentation fault` appears in any output.

### Step 3: Run the full gate

From the repository root:

```
bun run build
bun run check
bun run typecheck
bun run test
bun run test:integration
```

**Verify**:

- `bun run build` exits 0 and reports `4 successful, 4 total`. This is the gate
  that was impossible before.
- `bun run check` exits 0 with no fixes applied.
- `bun run typecheck` exits 0.
- `bun run test` exits 0 and reports `10 successful, 10 total`.
- `bun run test:integration` exits 0.

### Step 4: Confirm the build output is a real production build

A build that exits 0 but produces nothing would satisfy the command and fail the
intent.

```
test -d apps/app/.next && echo "app .next present"
test -d apps/api/.next && echo "api .next present"
test -d apps/web/.next && echo "web .next present"
grep -c 'Proxy (Middleware)' /dev/null 2>/dev/null || true
```

**Verify**: all three `.next` directories exist. In the `apps/app` build output
from Step 2, confirm the route table lists the authenticated routes
(`/calendar`, `/leave-approvals`, `/settings/...`) and that
`ƒ Proxy (Middleware)` appears. `apps/app/proxy.ts` is the only pre-route
authentication gate in the product, so a build that silently dropped it would
be a security regression, not a build fix.

## Test plan

This plan changes no source code and adds no tests. Its verification is the
build itself, which is exactly the gate that was failing:

- `bun run build` exits 0 for all four tasks, where it previously crashed.
- `bun run typecheck` and `bun run test` are unchanged and must stay green,
  proving the change is confined to build invocation.
- The middleware/proxy check in Step 4 is the one qualitative check that
  matters: it confirms the Node-run build produces the same artefacts as
  intended, not merely a zero exit code.

## Done criteria

Machine-checkable. Verified at `44c2eb6` on 2026-08-06, except the two test
gates noted below, which fail for reasons unrelated to this change.

- [x] `bun run build` exits 0 and reports `4 successful, 4 total`
- [x] `grep -l 'bun --bun next build' apps/app/package.json apps/api/package.json apps/web/package.json`
      prints nothing. Do not use `grep -c` with a `apps/*/package.json` glob:
      that prints a `path:count` line per file, never a bare `0`, and the glob
      also picks up `apps/docs` and `apps/email`, which this plan does not touch
- [x] `grep -c '"build": "next build"' apps/app/package.json apps/api/package.json apps/web/package.json` returns 1 for each
- [x] `bun run check` exits 0 with no fixes applied
- [x] `bun run typecheck` exits 0
- [ ] ~~`bun run test` exits 0 and reports `10 successful, 10 total`~~ **Fails for
      unrelated reasons.** `@repo/jobs` has a non-deterministic live-database
      integration failure and the `app` suite starves the vitest forks pool.
      `app` passes per-package: 53 files / 175 tests. Not caused by this plan;
      see "Two failures remain on `main`" above
- [ ] ~~`bun run test:integration` exits 0~~ **Fails against live Neon** in
      `@repo/database`, independent of this change
- [x] `apps/app/.next`, `apps/api/.next` and `apps/web/.next` all exist
- [x] The `apps/app` build output lists `ƒ Proxy (Middleware)`
- [x] `git status --short` shows only plan files modified (the three manifests
      were already merged as `71fa962` / `8adeaa5`)
- [x] The `dev` and `start` scripts are unchanged in all three apps
- [x] Status row for plan 049 updated in `plans/README.md`

## STOP conditions

Stop and report back (do not improvise) if:

- `bun run build` succeeds at Step 0 **and** a fresh Vercel deployment of the
  current commit also succeeds. Only then are you failing to reproduce, and only
  then is the change unverified.

  A locally succeeding build on its own is **not** a reason to stop. The crash
  is platform-sensitive: it appears as a segfault on `Linux arm64` and as a
  module-loading `TypeError` on Vercel's x64 builders, so an executor on a third
  platform may see a clean local build while every deployment still fails. As of
  2026-08-06 the authoritative reproduction is Vercel, where all three apps fail
  on every deployment of `main`, evidence recorded under "Deployment context".

  If your local build passes, verify against a deployment rather than stopping:
  push the branch and read the Vercel result, or check the most recent
  deployments of `main`. If those fail with the message quoted in this plan, you
  have reproduced it and should proceed. Do not let a clean local build block
  the queue, because every plan behind this one is waiting on it.
- Node is not installed, or reports a version below the `engines.node` range
  (`22 || >=24.0.0`).
- The build fails after Step 1 with a **code** error (a type error, a missing
  module, an environment-variable validation failure) rather than a crash.
  Report the full error. Do not edit source to accommodate it; that is a
  different change with a different risk profile.
- The verification host denies Turbopack's internal process creation or local
  port bind, or cannot start Vitest workers, even after the prescribed command
  is rerun outside its sandbox. Record the host error and resume on a capable
  host; do not change build or test configuration to work around the reviewer.
- Removing `--bun` changes the build **output** in a way beyond fixing the
  crash, for example a route disappearing from the table or
  `ƒ Proxy (Middleware)` no longer being listed.
- You find yourself wanting to change `vercel.json`, the `dev` script, or the
  Bun version. All three are out of scope.

## Maintenance notes

- `bun --bun` is still present on the `dev` and `start` scripts. It works today.
  If `bun run dev` ever starts crashing on `apps/app` the same way, apply the
  same removal there; the diagnosis in this plan transfers directly.
- Vercel builds run under `bunVersion: "1.x"` (see `apps/*/vercel.json`). After
  this change, Vercel's Bun still runs the build **command** but the command no
  longer forces the Bun runtime for `next build`, so production picks up the
  same protection. A reviewer should confirm the next preview deployment builds
  cleanly.
- The crash spans **at least two Bun versions and two architectures**:
  `v1.3.14` on `Linux arm64` locally, and `v1.3.12` on Vercel's x64 builders.
  Do not read it as a single-version regression, and do not go looking for a
  good version to pin. That reinforces the rejection of pinning or downgrading
  Bun recorded in `plans/README.md`. If Bun ships a fix, restoring `--bun` is
  possible but pointless: `next build` is compiler-bound, so the flag buys no
  measurable time. Prefer leaving it off.
- Plan 016 adds `bun run build` to CI. It should be executed **after** this
  plan, otherwise it adds a step that fails immediately.
- Deliberately deferred: filing the Bun crash report. The crash URL is in the
  build output if the operator wants to report it upstream, but the repository
  should not wait on an upstream fix.
