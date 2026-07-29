# Plan 033: Dead code and manifest hygiene

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report, do not improvise. When done, update this plan's status row in
> `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 75202db..HEAD -- apps/app/package.json packages/availability/package.json packages/jobs/package.json packages/core/package.json packages/availability/src/plans/submit-service.ts packages/availability/src/approvals/approval-service.ts`
> If any changed since this plan was written, re-check the "Current state"
> facts before proceeding.
>
> **Secrets rule for this plan**: Step 5 concerns `.env.local` files. Do not
> open any of them. Do not print their contents. Do not copy any value from
> them into a file, a commit, or your report. You are checking paths and
> git-ignore status only.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: tech debt
- **Planned at**: commit `75202db`, 2026-07-25

## Why this matters

Four small pieces of untidiness. Individually none is worth a plan; together
they are half an hour that makes the repository honest about its own contents.

1. **`framer-motion` is a dependency of `apps/app` and is imported nowhere.**
   It is a substantial animation library carried in the app's manifest for no
   reason. Anyone reading the dependency list reasonably concludes the app uses
   it, and the next person who wants an animation will import it rather than
   using whatever the design system provides.
2. **Two dead comments mark code that was already removed.**
   `// removed loadXeroTenant` appears in two service files. A comment
   recording an absence is worse than nothing: it invites the reader to
   reconstruct why.
3. **`inngest` is on two different major-minor ranges in two packages.**
   `packages/availability` asks for `^4.5.0` and `packages/jobs` for
   `^4.12.1`. Bun resolves one version, so this is not currently a runtime
   split, but it means the lower bound in `availability` no longer describes
   what it is tested against.
4. **Duplicated nested workspace directories exist locally.** There are
   `apps/app/apps/app/`, `apps/api/apps/api/` and `apps/web/apps/web/`
   directories, each containing a `.env.local`. These are almost certainly the
   result of running a command from the wrong working directory. They are
   git-ignored and untracked, so nothing has leaked, but they are confusing and
   a future `.gitignore` change could expose them.

## Current state

### 1. `framer-motion` is unused

`apps/app/package.json` `dependencies` includes:

```json
    "framer-motion": "^12.42.2",
```

No source file imports it:

```
grep -rn "framer-motion\|from \"motion" apps packages --include=*.tsx --include=*.ts | grep -v node_modules | grep -v package.json
```

At commit `75202db` this returns nothing. The only hit anywhere is the manifest
line itself.

### 2. Dead removal markers

```
packages/availability/src/plans/submit-service.ts:563:// removed loadXeroTenant
packages/availability/src/approvals/approval-service.ts:1010:// removed loadXeroTenant
```

Both sit alone on their line between two functions.

### 3. `inngest` version drift

| Package | Range |
|---|---|
| `packages/availability` | `^4.5.0` |
| `packages/jobs` | `^4.12.1` |

Also worth noting, lower priority:

| Package | `vitest` range |
|---|---|
| `packages/core` | `^4.1.10` |
| `availability`, `billing`, `database`, `feeds`, `jobs`, `notifications`, `xero` | `^4.1.7` |

and `@types/node` / `@types/react` are pinned exactly in most packages but
carry a caret in `packages/design-system`.

### 4. Nested workspace directories

```
./apps/api/apps/api/.env.local
./apps/web/apps/web/.env.local
./apps/app/apps/app/.env.local
```

All three are git-ignored, and `git ls-files | grep -c "\.env\.local"` returns
`0`, so **none is tracked and nothing has been committed**. Verify this
yourself in Step 5 before deleting anything.

## Commands you will need

All run from the repo root.

```
bun install                # run first if you hit "Cannot find module '@repo/observability/log'"
bun run check
bun run typecheck
bun run test
bun run build
```

`bun install` will rewrite `bun.lock` after the dependency removal in Step 2.
That is expected and the lockfile change belongs in the commit.

## Scope

**In scope:**

- `apps/app/package.json` (remove one dependency)
- `bun.lock` (regenerated)
- `packages/availability/src/plans/submit-service.ts` (delete one comment)
- `packages/availability/src/approvals/approval-service.ts` (delete one
  comment)
- `packages/availability/package.json` (align the `inngest` range)
- The three nested `apps/*/apps/*` directories (delete, after verification)

**Explicitly out of scope:**

- Any other dependency. Do not run `bun update`, do not bump anything to
  latest, do not remove a dependency this plan has not named. Plan 005 handles
  security-motivated version pins and it does so deliberately.
- `packages/core`'s `vitest` range and the `@types/*` caret drift. Both are
  noted above but neither is worth a change on its own; mention them in your
  report and leave them.
- `biome.jsonc`'s stale exclusions. Plan 022.
- The Knock configuration and the `.env.example` files. Plan 023.
- `apps/docs`. Plan 025.
- Any `.env.local` file's contents, in any directory, ever.
- Removing `apps/docs`, `apps/email`, or any workspace.

## Git workflow

```
git checkout -b chore/dead-code-and-manifest-hygiene
```

Suggested commits:

```
chore(app): remove the unused framer-motion dependency
chore(availability): remove dead removal markers and align the inngest range
```

The nested directory deletion (Step 5) touches nothing tracked and produces no
commit.

Do not push or open a pull request unless the user asks.

## Steps

### Step 1: Establish the baseline

```
bun run check
bun run typecheck
bun run test
bun run build
```

**Expected**: all four exit 0. Record the test count and roughly how long the
build takes; you will compare after removing the dependency.

### Step 2: Remove `framer-motion`

Confirm it is unused first, with a broader search than the manifest:

```
grep -rn "framer-motion\|framer\|\"motion/react\"\|from \"motion\"" apps packages --include=*.ts --include=*.tsx --include=*.mdx | grep -v node_modules
```

**Expected**: no hits outside `apps/app/package.json`.

Also check the design system, which is where an animation library would most
plausibly be used indirectly:

```
grep -rn "motion\." packages/design-system --include=*.tsx | grep -v node_modules | head
```

Read any hits. `motion.div` and similar are the framer-motion API; a bare
`motion` in a CSS class name or a variable is not.

If it is genuinely unused, remove the line from `apps/app/package.json` and
reinstall:

```
bun install
```

**Verify**:

```
bun run typecheck
bun run build
```

**Expected**: both exit 0. A build failure means something imported it through
a path the grep missed; go to STOP conditions.

`git diff --stat` should show `apps/app/package.json` and `bun.lock`.

### Step 3: Delete the two dead comments

Remove line 563 of `packages/availability/src/plans/submit-service.ts`:

```typescript
// removed loadXeroTenant
```

and line 1010 of `packages/availability/src/approvals/approval-service.ts`:

```typescript
// removed loadXeroTenant
```

Delete the comment line and any blank line that becomes a double blank as a
result. Change nothing else in either file.

**Verify**:

```
grep -rn "removed loadXeroTenant" packages | grep -v node_modules
bun run check
bun run typecheck
```

**Expected**: the grep returns nothing; both commands exit 0.

### Step 4: Align the `inngest` range

Edit `packages/availability/package.json`, changing the `inngest` dependency
from `^4.5.0` to `^4.12.1` so it matches `packages/jobs`.

```
bun install
```

**Verify** one version resolves:

```
node -e "console.log(require('./packages/availability/package.json').dependencies.inngest, require('./packages/jobs/package.json').dependencies.inngest)"
bun run typecheck
bun run test
```

**Expected**: the two ranges print identically; typecheck and test exit 0 with
an unchanged test count.

**If `packages/availability` uses an Inngest API that changed between 4.5 and
4.12**, the typecheck will say so. Go to STOP conditions rather than pinning
`jobs` back down to `^4.5.0`: the newer range is the one actually in use.

### Step 5: Remove the nested workspace directories

**Verify before deleting.** These are untracked local artefacts, but confirm
that rather than trusting this plan:

```
git ls-files | grep "apps/app/apps\|apps/api/apps\|apps/web/apps"
git status --porcelain --ignored | grep "apps/.*/apps/"
git check-ignore -v apps/app/apps/app/.env.local
```

**Expected**: the first command returns nothing (nothing tracked); the third
confirms the file is ignored and names the rule.

**If `git ls-files` returns anything**, stop immediately and go to STOP
conditions. A tracked `.env.local` would be a credential exposure and needs the
user's decision, not a deletion.

Then confirm the directories contain nothing but the stray env file:

```
find apps/app/apps apps/api/apps apps/web/apps -type f
```

**Do not open any file this lists.** You are checking the file list, not the
contents.

**Expected**: one `.env.local` per directory and nothing else.

If that holds, remove them:

```
rm -rf apps/app/apps apps/api/apps apps/web/apps
```

**Verify**:

```
git status --porcelain
find apps -type d -name apps
```

**Expected**: `git status` shows only the tracked changes from Steps 2 to 4;
the `find` returns nothing.

**If the directories contain anything other than `.env.local`**, do not delete
them. Report the file list (names only) and stop. Something else is going on.

### Step 6: Full verification

```
bun run check
bun run typecheck
bun run test
bun run build
git diff --name-only
```

**Expected**: the first four exit 0 with an unchanged test count; the last
lists `apps/app/package.json`, `bun.lock`,
`packages/availability/package.json`,
`packages/availability/src/plans/submit-service.ts` and
`packages/availability/src/approvals/approval-service.ts`.

Compare the build time and, if `bun run analyze` is available, the `apps/app`
bundle size against Step 1. Removing an unused dependency should not change
either much (an unimported package is not bundled), so a large change means it
was being pulled in somehow; report it.

## Test plan

**No new tests.** Nothing here changes behaviour:

- removing an unimported dependency cannot change runtime behaviour, and the
  build succeeding is the proof;
- deleting a comment cannot;
- aligning a dependency range that already resolved to one version cannot;
- deleting untracked local directories cannot.

The requirement is an **unchanged test count with everything passing**. If the
count changes, something in this plan did more than it should have.

The one verification worth doing beyond the commands is Step 2's broader grep,
because "unused dependency" is a claim that a single grep can get wrong (an
import could be dynamic, or aliased, or come through a re-export). Run all
three searches listed there.

## Done criteria

All of the following, verbatim:

1. `bun run check` exits 0.
2. `bun run typecheck` exits 0.
3. `bun run test` exits 0 with the **same** test count as the Step 1 baseline.
4. `bun run build` exits 0.
5. `node -e "console.log(require('./apps/app/package.json').dependencies['framer-motion'])"`
   prints `undefined`.
6. `grep -rn "removed loadXeroTenant" packages apps | grep -v node_modules`
   returns nothing.
7. `node -e "const a=require('./packages/availability/package.json').dependencies.inngest, j=require('./packages/jobs/package.json').dependencies.inngest; console.log(a === j)"`
   prints `true`.
8. `find apps -type d -name apps` returns nothing.
9. `git status --porcelain` shows no untracked file under `apps/*/apps/`.
10. No `.env.local` was opened, printed, or referenced by content anywhere in
    the work or the report.

## STOP conditions

Stop and report back rather than improvising if any of these occur:

- **The baseline in Step 1 is not green.** Report what fails; change nothing.
- **`git ls-files` shows a tracked `.env.local`** (Step 5). Stop immediately.
  Do not open it, do not print it, do not delete it. Report the path and
  recommend that the user rotate every credential the file is likely to hold
  and purge it from history. This would be a credential exposure and it is the
  user's call how to handle it.
- **A nested directory contains files other than `.env.local`.** Report the
  file names, not the contents, and leave the directories in place.
- **Removing `framer-motion` breaks the build.** Something imports it through a
  path the greps missed. Report the error and restore the dependency.
- **The `inngest` bump causes a typecheck or test failure.** Report the error.
  Do not resolve it by lowering `packages/jobs` to `^4.5.0`: the higher range
  is what the job handlers are written against.
- **The test count changes.** Report which suite. Nothing in this plan should
  affect a test.
- **You find another unused dependency while working.** Note it in your report
  and leave it. Removing dependencies one confirmed case at a time is
  deliberate; a bulk sweep is a different, riskier task.

## Maintenance notes

- **`bun.lock` belongs in the commit.** A manifest change without the lockfile
  update leaves CI's `bun install --frozen-lockfile` failing.
- **The nested `apps/*/apps/*` directories will come back** if whatever created
  them recurs. The likely cause is a command run from inside an app directory
  that assumed the repo root (a `vercel env pull`, a scaffold, or a copied
  shell command). If they reappear, that is the thing to find, not the
  directories.
- **Dependency ranges across the monorepo are not centrally managed.** Bun
  workspaces resolve one version per package name, so drift is invisible until
  someone reads two manifests side by side. The one-liner in the "Current
  state" section (iterate `packages/*/package.json`, group by dependency name,
  report names with more than one range) is worth running occasionally.
- **A comment recording a removal is a smell.** Git history already records
  what was removed and why, in more detail and with the diff attached. If a
  removal genuinely needs explaining in the code, the explanation belongs
  wherever the replacement logic now lives.
- **Related plans**: 022 (removes stale package references from
  `biome.jsonc`), 023 (removes the Knock configuration and rewrites the
  `.env.example` files), 025 (the Mintlify starter kit), 005 (deliberate
  security-motivated version pins, which this plan must not touch). All are
  instances of template leftovers and drift; this one is the smallest.
