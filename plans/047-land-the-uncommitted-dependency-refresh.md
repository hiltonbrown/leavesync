# Plan 047: Land the uncommitted dependency refresh so the verification baseline is reproducible

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report, do not improvise. When done, update this plan's status row in
> `plans/README.md`.
>
> **Drift check (run first)**: `git status --short -- package.json bun.lock apps/*/package.json packages/*/package.json`
> This plan exists because those files carry **uncommitted** changes in the
> operator's working tree. If `git status` reports them clean, the refresh has
> already been committed: verify Step 4's gates on `HEAD`, mark this plan DONE
> and stop.

## Status

- **Priority**: P0
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none. **Unblocks**: plans 002, 004, 005, 006, 007 and 008
  (all previously blocked on this exact dependency state)
- **Category**: dx
- **Planned at**: commit `2095b1f`, 2026-08-05
- **Execution status**: DONE. The operator committed the refresh as `f1884db`
  ("version updates") on 2026-08-05, containing exactly the 25 files listed
  under "Current state". Verified at `f1884db`: `apps/app/package.json` and
  `apps/api/package.json` both pin `react` and `react-dom` at `19.2.8`, the
  root `next` override is `16.3.0`, `bun run test` exits 0 with
  `10 successful, 10 total`, `bun run typecheck` exits 0, and `bun audit`
  reports 2 vulnerabilities (1 moderate, 1 low). Step 6 is also complete: the
  "Advisories accepted at 2026-08-05" section now exists in plan 005. **Nothing
  in this plan needs executing.** It is retained as the record of why five
  plans were repeatedly and wrongly marked BLOCKED, and as the reference for the
  Dependabot grouping change recommended under "Maintenance notes".
- **Reconciled**: 2026-08-06 at commit `454ded7`, re-confirmed at `44c2eb6`
  after plan 049 merged mid-reconciliation. Plan 049's implementation
  (`71fa962`) touches only the three `build` scripts in `apps/api`, `apps/app`
  and `apps/web`, so it cannot affect any criterion here; the pins, lockfile
  cleanliness and typecheck were re-run at `44c2eb6` regardless and all pass.
  Every done criterion re-verified on current `HEAD`, past the commit this plan
  was closed against:

  | Criterion | Result at `454ded7` |
  |---|---|
  | No modified manifest or lockfile | clean |
  | `bun install --frozen-lockfile` | exit 0 (run as `--dry-run`; lockfile untouched) |
  | `"react": "19.2.7"` in any manifest | no matches; all 15 declarations read `19.2.8` |
  | Second copy of `react` / `react-dom` | none: `node_modules/.bun` holds one `react@19.2.8` and one `react-dom@19.2.8` |
  | `bun run typecheck` | exit 0, 18/18 tasks |
  | `bun audit` | 2 vulnerabilities (1 moderate `uuid`, 1 low `esbuild`), unchanged |
  | "Advisories accepted" in plan 005 | present, line 328 |

  The `bun run test` criterion is superseded: see the test-command correction
  recorded in plan 048's Status block. Per-package counts were verified there
  and all ten match baseline. **Status stands: DONE, nothing to execute.**

## Why this matters

The single most expensive blocker in this backlog was never a code defect. Five
separate plans (002, 004, 006, 007, 008) were each executed correctly, each
passed its own targeted tests, and each was then marked BLOCKED for the same
reason: `bun run test` could not enter the `app` and `api` suites because the
installed `react` and `react-dom` patch versions differed. Plan 005 was blocked
separately by a high-severity `sharp` advisory reachable through production Next
image optimisation.

Both of those are already fixed, but only in the operator's **uncommitted
working tree**. Because the fix is unstaged:

- CI runs `bun install --frozen-lockfile` against the committed `bun.lock` and
  therefore still installs the mismatched pair;
- any executor working in a fresh git worktree (which contains only committed
  files) reproduces the original failure and blocks again;
- the release commit that plan 046 gates on does not contain the fix.

Committing this working tree converts a recurring, expensive, misdiagnosed
blocker into a settled fact, and it is the precondition for closing out six
plans that are otherwise complete.

## Current state

### The mismatch, in the committed tree

`apps/api/package.json` and `apps/app/package.json` at `HEAD` declare:

```json
    "react": "19.2.7",
    "react-dom": "19.2.8",
```

Every other workspace that declares `react` already uses `19.2.8`. The committed
`bun.lock` resolves the app and api workspaces to `react@19.2.7` alongside
`react-dom@19.2.8`. `react-dom@19.2.8` declares `"peerDependencies": { "react":
"^19.2.8" }`, so the pair is unsatisfiable and `@testing-library/react` fails to
initialise before any app test file loads.

### The fix, already present but unstaged

The working tree raises both to `19.2.8` and refreshes the surrounding
dependency set. `git diff --stat` currently reports 25 files:

```
 apps/api/next-env.d.ts                             |   1 +
 apps/api/package.json                              |  20 +-
 apps/app/next-env.d.ts                             |   1 +
 apps/app/package.json                              |  30 +-
 apps/email/package.json                            |  10 +-
 apps/web/next-env.d.ts                             |   1 +
 apps/web/package.json                              |  30 +-
 bun.lock                                           | 552 +++++++--------------
 package.json                                       |  16 +-
 packages/analytics/package.json                    |  14 +-
 packages/auth/package.json                         |  10 +-
 packages/availability/package.json                 |   4 +-
 packages/billing/package.json                      |   4 +-
 packages/database/generated/internal/class.ts      |   8 +-
 .../database/generated/internal/prismaNamespace.ts |  90 +++-
 packages/database/package.json                     |  16 +-
 packages/design-system/package.json                |  26 +-
 packages/email/package.json                        |  10 +-
 packages/feeds/package.json                        |   4 +-
 packages/jobs/package.json                         |   4 +-
 packages/next-config/package.json                  |   4 +-
 packages/notifications/package.json                |  10 +-
 packages/observability/package.json                |  12 +-
 packages/seo/package.json                          |  10 +-
 packages/xero/package.json                         |   4 +-
```

The load-bearing changes are:

- `react` raised from `19.2.7` to `19.2.8` in `apps/api/package.json` and
  `apps/app/package.json`, matching `react-dom`;
- the root `overrides` entry for `next` raised from `16.2.12` to `16.3.0`, which
  pulls `sharp@0.35.3` and clears the advisory that blocked plan 005;
- `@biomejs/biome` `2.5.6` to `2.5.7` and `ultracite` `7.9.4` to `7.10.1`;
- routine minor bumps across `@sentry/nextjs`, `inngest`, `svix`,
  `lucide-react`, `recharts`, `react-hook-form`, `jsdom`, `vitest`, `turbo` and
  the `@types/*` set.

Two files in the diff are **generated output, not hand edits**:
`packages/database/generated/internal/class.ts` and
`packages/database/generated/internal/prismaNamespace.ts` are written by
`prisma generate`. They are tracked in this repo, so they belong in the commit.
`apps/*/next-env.d.ts` are likewise regenerated by Next.

### Verified state of the working tree, 2026-08-05

Measured on the uncommitted tree at `2095b1f`:

| Gate | Command | Result |
|---|---|---|
| Unit tests | `bun run test` | exit 0, 10/10 turbo tasks, `app` 53 files / 175 tests pass, `api` 13 files / 101 tests pass |
| Typecheck | `bun run typecheck` | exit 0 |
| Audit | `bun audit` | 2 vulnerabilities (1 moderate, 1 low), down from 43 |
| Installed pair | `react@19.2.8`, `react-dom@19.2.8` | single copy of each in `node_modules/.bun` |

`bun run check` and `bun run build` do **not** pass, but neither failure is
caused by this change. They are pre-existing and are owned by plans 048 and 049
respectively. Do not attempt to fix them here.

### Remaining advisories after this change

`bun audit` reports exactly two, both build- or dev-time only:

- `esbuild >=0.27.3 <0.28.1`, **low**: arbitrary file read when running the
  esbuild dev server on Windows. Reached through `vitest`, `tsup`,
  `@turbo/gen`, `mdx-bundler` and the `email` workspace. No production runtime
  path, and the repo does not run the esbuild dev server.
- `uuid <11.1.1`, **moderate**: missing buffer bounds check in v3/v5/v6 when a
  `buf` argument is supplied. Reached only through `workspace:web ›
  mdx-bundler`, which runs at marketing-site build time over repo-owned MDX.

Neither is reachable from application runtime code, so neither meets plan 005's
"high severity AND runtime reachable" STOP condition.

### Repo conventions that apply here

- Package manager is Bun (`bun@1.3.14`); `bun.lock` is committed and must never
  be hand-edited.
- CI runs `bun install --frozen-lockfile`, so manifests and lockfile must be
  committed together and stay consistent.
- Conventional commits, one logical change per commit. The precedent for this
  exact kind of change is `daa3985 chore(deps): refresh vulnerable dependency
  pins`.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Inspect the pending change | `git status --short` | the 25 files listed above |
| Verify lockfile consistency | `bun install --frozen-lockfile` | exit 0, no lockfile rewrite |
| Resolved react pair | `bun pm ls --all \| grep -E "^.*react(-dom)?@"` | only `19.2.8` for both |
| Unit tests | `bun run test` | exit 0, 10/10 turbo tasks |
| Typecheck | `bun run typecheck` | exit 0 |
| Audit | `bun audit` | 2 vulnerabilities (1 moderate, 1 low) |

## Scope

**In scope** (commit exactly these, nothing else):

- `package.json` (root)
- `apps/api/package.json`, `apps/app/package.json`, `apps/web/package.json`,
  `apps/email/package.json`
- `packages/*/package.json` for the twelve packages listed in the diff above
- `bun.lock`
- `apps/api/next-env.d.ts`, `apps/app/next-env.d.ts`, `apps/web/next-env.d.ts`
- `packages/database/generated/internal/class.ts`,
  `packages/database/generated/internal/prismaNamespace.ts`
- `plans/047-land-the-uncommitted-dependency-refresh.md` and
  `plans/README.md`

**Out of scope** (do NOT touch):

- Any application or package **source** file. This plan commits a dependency
  state that already exists; it writes no code.
- `bun update` or `bun update --latest`. The working tree state is the
  deliverable. Do not widen it.
- The `bun run check` failures. They are pre-existing and repo-wide; plan 048
  owns them.
- The `bun run build` crash in `apps/app`. It is a Bun runtime bug, not a
  dependency problem; plan 049 owns it.
- The two remaining audit advisories. They are documented above as accepted.

## Git workflow

- Work directly on the operator's branch, because the change is already in
  their working tree. Do **not** move it to a worktree; a worktree contains only
  committed files and would lose it.
- Single commit:
  `chore(deps): align react pins and refresh the dependency baseline`
- Do NOT push or open a PR unless the operator instructs it.

## Steps

### Step 1: Confirm the working tree is the expected change and nothing else

```
git status --short
```

**Verify**: exactly the 25 files listed under "Current state" appear, all with
status `M`. If any **source** file (`.ts`/`.tsx` outside
`packages/database/generated`) or any file under `plans/` other than this plan
and `README.md` appears, that is a STOP condition: the operator has unrelated
work in progress and you must not sweep it into this commit.

### Step 2: Confirm the react pair is aligned

```
grep -rn '"react": \|"react-dom": ' apps/*/package.json packages/*/package.json
```

**Verify**: every `react` and `react-dom` line reads `19.2.8`. No `19.2.7`
remains.

Then confirm what is actually installed:

```
bun pm ls --all | grep -E "react@|react-dom@" | sort -u
```

**Verify**: only `react@19.2.8` and `react-dom@19.2.8` appear. If a second
version of either appears, STOP.

### Step 3: Confirm the lockfile matches the manifests

```
bun install --frozen-lockfile
```

**Verify**: exit 0. Then:

```
git status --short bun.lock
```

**Verify**: `bun.lock` is still listed as modified relative to `HEAD` (it is
part of the pending change) but was **not** rewritten by the install. Compare
with `git diff --stat bun.lock` before and after; the line counts must be
identical. A frozen install that errors means the manifests and lockfile
disagree, which is a STOP condition.

### Step 4: Run the gates this plan is responsible for

In this order:

```
bun run typecheck
bun run test
bun audit
```

**Verify**:

- `bun run typecheck` exits 0.
- `bun run test` exits 0 and reports `10 successful, 10 total`. The `app` task
  must actually execute (53 test files, 175 tests) rather than erroring during
  setup. This is the specific gate that was failing.
- `bun audit` reports `2 vulnerabilities (1 moderate, 1 low)` and names only
  `esbuild` and `uuid`.

Do **not** run `bun run check` or `bun run build` as gates for this plan. Both
fail for reasons documented in plans 048 and 049.

### Step 5: Commit

```
git add package.json bun.lock apps/api/package.json apps/app/package.json \
  apps/web/package.json apps/email/package.json packages/*/package.json \
  apps/api/next-env.d.ts apps/app/next-env.d.ts apps/web/next-env.d.ts \
  packages/database/generated/internal/class.ts \
  packages/database/generated/internal/prismaNamespace.ts
git commit -m "chore(deps): align react pins and refresh the dependency baseline"
```

**Verify**:

```
git status --short
```

shows no remaining modified files from the in-scope list, and

```
git show --stat HEAD | head -30
```

lists the 25 in-scope files.

### Step 6: Record the accepted advisories

Append a section to the bottom of
`plans/005-refresh-vulnerable-dependency-pins.md` headed
`## Advisories accepted at 2026-08-05`, listing the `esbuild` and `uuid`
advisories with the one-line justification given under "Remaining advisories
after this change" above. Plan 005's Step 5 requires this section and it is the
last of its done criteria that is outstanding.

**Verify**: `grep -n "Advisories accepted" plans/005-refresh-vulnerable-dependency-pins.md`
returns a match.

## Test plan

This plan changes no source code and adds no tests. Its verification is the
existing gate plus the audit delta, all specified in Step 4. The load-bearing
check is that `bun run test` enters the `app` workspace at all: for five
previous plans it did not, and that is precisely what this change fixes.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `git status --short` reports no modified manifest or lockfile
- [ ] `bun install --frozen-lockfile` exits 0
- [ ] `grep -rn '"react": "19.2.7"' apps packages --include=package.json` returns no matches
- [ ] `bun pm ls --all | grep -c "react@19.2.7"` returns 0
- [ ] `bun run typecheck` exits 0
- [ ] `bun run test` exits 0 and reports `10 successful, 10 total`
- [ ] `bun audit` reports 2 vulnerabilities, naming only `esbuild` and `uuid`
- [ ] The "Advisories accepted" section exists in plan 005
- [ ] Status rows for plans 005 and 047 updated in `plans/README.md`

## STOP conditions

Stop and report back (do not improvise) if:

- `git status --short` shows source files or unrelated plan files modified. The
  operator has in-flight work; do not commit it.
- `bun install --frozen-lockfile` fails. The manifests and lockfile disagree and
  regenerating the lockfile is a different, wider change than this plan allows.
- `bun run test` still cannot enter the `app` workspace. Report the exact error;
  the diagnosis in this plan would then be wrong.
- `bun audit` reports any **high** severity advisory, or any advisory reachable
  from application runtime code. Plan 005's STOP condition applies.
- A second copy of `react` or `react-dom` appears in `bun pm ls --all`.

## Maintenance notes

- The failure mode this plan closes is subtle and will recur: a Dependabot PR
  that bumps `react-dom` without `react` (or the reverse) produces an
  unsatisfiable peer pair that fails **at test setup**, before any test file
  loads, with an error that looks nothing like a dependency problem. Five plans
  were misdiagnosed as blocked on their own implementation because of it.
  Consider grouping `react` and `react-dom` in the Dependabot configuration so
  they can only move together.
- A reviewer should confirm the commit contains no `.ts`/`.tsx` file outside
  `packages/database/generated`, and that the root `overrides` block still has
  exactly eight entries with no `^` or `~` prefixes introduced.
- The `next` override moving to `16.3.0` is what clears `sharp`. If a future
  advisory forces `next` back below `16.3.0`, re-check `bun audit` for `sharp`
  before assuming plan 005 is still satisfied.
- Deliberately deferred: `esbuild` and `uuid`. Both are build-time only and are
  documented as accepted in plan 005. Revisit if either ever appears on a
  production runtime path.
