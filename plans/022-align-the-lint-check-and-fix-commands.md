# Plan 022: Make `bun run fix` cover the same files as `bun run check`

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report, do not improvise. When done, update this plan's status row in
> `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 75202db..HEAD -- package.json biome.jsonc`
> If either changed since this plan was written, re-check the "Current state"
> facts before proceeding.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: dx
- **Planned at**: commit `75202db`, 2026-07-25

## Why this matters

`bun run check` and `bun run fix` are meant to be the read-only and
write-enabled halves of one tool. They currently operate on different file
sets:

```json
"check": "ultracite check apps packages scripts tooling tsup.config.ts next-env.d.ts",
"fix": "ultracite fix",
```

`check` is scoped to six explicit paths. `fix` is unscoped, so it walks
everything Biome's `files.includes` admits, which in this repo is `**/*` minus
nine exclusions. `.next/`, `.turbo/`, `out/`, `dist/` and every other
git-ignored build directory are **not** among those exclusions and Biome is not
configured to read `.gitignore`.

Two consequences follow:

1. **`bun run fix` can rewrite generated build output.** A developer who has
   run `bun run dev` or `bun run build` has `.next/` populated. Running
   `bun run fix` then formats minified bundles and generated `.d.ts` files. The
   edits are harmless (the directory is git-ignored and regenerated) but the
   command becomes slow and its output becomes noise, which trains people to
   stop reading it.
2. **The two halves disagree.** `fix` can rewrite files that `check` never
   inspects, and CI runs only `check`. So `fix` is not a reliable way to make
   CI pass, and a file that `fix` reformats may still be unlinted in CI. That
   is precisely backwards from what the pair is for.

The `biome.jsonc` exclusion list also names three paths that do not exist:

| Excluded path | Exists at `75202db` |
|---|---|
| `packages/collaboration/config.ts` | no |
| `apps/email/.react-email` | no |
| `packages/cms/basehub-types.d.ts` | no |
| `docs` | no (the app is `apps/docs`) |

`packages/collaboration` and `packages/cms` are both on the "Not in use" list in
`CLAUDE.md`. These are leftovers from the next-forge template. They are inert,
but they make the exclusion list untrustworthy: a reader cannot tell which
entries are load-bearing.

## Current state

### Root `package.json` scripts

```json
    "check": "ultracite check apps packages scripts tooling tsup.config.ts next-env.d.ts",
    "fix": "ultracite fix",
```

All six `check` targets exist at the repo root:

```
apps  packages  scripts  tooling  tsup.config.ts  next-env.d.ts
```

Toolchain versions, from the root `devDependencies`:

```json
    "@biomejs/biome": "2.4.15",
    "ultracite": "7.7.0",
```

### `biome.jsonc` in full

```jsonc
{
  "$schema": "./node_modules/@biomejs/biome/configuration_schema.json",
  "extends": [
    "ultracite/biome/core",
    "ultracite/biome/react",
    "ultracite/biome/next"
  ],
  "javascript": {
    "globals": ["Liveblocks"]
  },
  "linter": {
    "rules": {
      "performance": {
        "noBarrelFile": "off"
      }
    }
  },
  "files": {
    "includes": [
      "**/*",
      "!packages/design-system/components/ui",
      "!packages/design-system/lib",
      "!packages/design-system/hooks",
      "!packages/collaboration/config.ts",
      "!docs",
      "!apps/docs/**/*.json",
      "!apps/email/.react-email",
      "!packages/cms/basehub-types.d.ts",
      "!packages/database/generated"
    ]
  }
}
```

Note `"globals": ["Liveblocks"]`. Liveblocks is the collaboration package,
which `CLAUDE.md` lists as not in use. Verify before removing it (see Step 4);
it is cheap to leave and only worth deleting if nothing references it.

### CI runs only `check`

`.github/workflows/ci.yml` line 48-49:

```yaml
      - name: Lint
        run: bun run check
```

There is no `fix` step, correctly. That is why the scope asymmetry matters:
`check` defines the contract, and `fix` should be its exact inverse.

## Commands you will need

All run from the repo root.

```
bun install                # run first if you hit "Cannot find module '@repo/observability/log'"
bun run check              # read-only, safe to run repeatedly
bun run typecheck
bun run test
```

**Do not run `bun run fix` until Step 3**, and when you do, run it on a clean
working tree so its effects are visible in `git status`. `fix` writes to source
files; that is its purpose, but it means an unexpected reformat is easy to lose
inside an unrelated diff.

## Scope

**In scope:**

- `package.json` (the `fix` script)
- `biome.jsonc` (the `files.includes` list, and possibly `javascript.globals`)

**Explicitly out of scope:**

- Any source file. If aligning the scopes causes `check` to report new
  violations in files it did not previously inspect, that is a finding to
  report, not a licence to reformat the repo inside this plan.
- Any lint rule. Do not enable, disable or reconfigure rules.
- `.github/workflows/ci.yml`. It correctly runs `check` only.
- Adding `vcs.useIgnoreFile`. That is a plausible alternative fix but it
  changes Biome's behaviour for every consumer of the config, including
  editors. See "Maintenance notes" for why this plan takes the narrower route.
- Deleting `packages/collaboration` or `packages/cms`. Removing dead packages is
  plan 033.

## Git workflow

```
git checkout -b chore/align-lint-scopes
```

Commit message:

```
chore: scope bun run fix to the same paths as bun run check
```

Do not push or open a pull request unless the user asks.

## Steps

### Step 1: Establish the baseline

```
bun run check
bun run typecheck
bun run test
git status --porcelain
```

**Expected**: the first three exit 0; `git status --porcelain` prints nothing
(a clean tree). A clean tree is required before Step 3, so if there are
uncommitted changes, stop and report rather than stashing someone else's work.

Record how long `bun run check` takes. You will compare against `fix` later.

### Step 2: Scope the `fix` script

Edit `package.json`. Change:

```json
    "fix": "ultracite fix",
```

to:

```json
    "fix": "ultracite fix apps packages scripts tooling tsup.config.ts next-env.d.ts",
```

The argument list must be **byte-identical** to the `check` script's. That is
the whole point: the two commands must not be able to drift again without
someone noticing they no longer match.

**Verify** they match:

```
node -e "const s=require('./package.json').scripts; const c=s.check.replace(/^ultracite check /,''); const f=s.fix.replace(/^ultracite fix /,''); console.log(c === f ? 'MATCH' : 'MISMATCH\n' + c + '\n' + f)"
```

**Expected**: `MATCH`.

### Step 3: Confirm `fix` is now a no-op on a clean tree

With a clean working tree:

```
bun run fix
git status --porcelain
```

**Expected**: `fix` exits 0 and `git status --porcelain` prints **nothing**.

The tree is already `check`-clean (Step 1), so a correctly scoped `fix` has
nothing to change. If it rewrites files, one of two things is true and both
matter:

- it touched a file outside the six scoped paths, which means the scoping did
  not take effect; or
- `fix` applies a transform that `check` does not report, which means the pair
  is not symmetric for a different reason.

Either way, go to STOP conditions and report which files changed.

Also compare the runtime against Step 1's `check`. They should now be within
the same order of magnitude. If `fix` is still dramatically slower, it is still
walking directories it should not.

### Step 4: Remove the dead exclusions from `biome.jsonc`

First confirm each is genuinely dead:

```
for p in packages/collaboration/config.ts docs apps/email/.react-email packages/cms/basehub-types.d.ts packages/design-system/components/ui packages/design-system/lib packages/design-system/hooks apps/docs packages/database/generated; do
  [ -e "$p" ] && echo "EXISTS  $p" || echo "MISSING $p"
done
```

**Expected at `75202db`**: `packages/collaboration/config.ts`, `docs`,
`apps/email/.react-email` and `packages/cms/basehub-types.d.ts` are MISSING;
the rest EXIST.

Remove only the MISSING entries. Keep `!apps/docs/**/*.json` (the `apps/docs`
directory exists; the exclusion targets its JSON files). The result:

```jsonc
  "files": {
    "includes": [
      "**/*",
      "!packages/design-system/components/ui",
      "!packages/design-system/lib",
      "!packages/design-system/hooks",
      "!apps/docs/**/*.json",
      "!packages/database/generated"
    ]
  }
```

**Important**: `apps/email/.react-email` is a generated directory that appears
when the email dev preview runs. It does not exist in a fresh checkout but will
exist on a developer machine that has run `bun run dev`. **Keep this
exclusion**, and revise the list above accordingly. Verify by checking whether
`apps/email` exists as a workspace:

```
ls apps/email
```

If `apps/email` exists as an app, retain `!apps/email/.react-email`. Only
remove exclusions whose *parent package* is absent from the repo entirely,
which is the case for `packages/collaboration`, `packages/cms` and the
top-level `docs`.

Add a comment recording why the remaining entries are there, since the file is
JSONC and already uses no comments:

```jsonc
  "files": {
    // "**/*" then subtract: generated output (database client, docs JSON,
    // email preview) and vendored shadcn/ui sources that are not ours to lint.
    "includes": [
```

### Step 5: Decide on the `Liveblocks` global

```
grep -rn "Liveblocks" apps packages scripts tooling --include=*.ts --include=*.tsx 2>/dev/null | grep -v node_modules
```

**If this returns nothing**, remove the `javascript.globals` block entirely. It
declares a global for the collaboration package, which `CLAUDE.md` lists as not
in use and which does not exist in the tree.

**If it returns anything**, leave the block alone and note in your report where
Liveblocks is referenced. Do not remove a global that something depends on for
the sake of tidiness.

### Step 6: Verify the configuration change did not widen the lint surface

```
bun run check
```

**Expected**: exits 0, with no new diagnostics compared to Step 1.

Removing exclusions for paths that do not exist cannot widen the surface, so a
new diagnostic here means you removed an exclusion for a path that *does*
exist. Re-check Step 4 and go to STOP conditions if you cannot account for it.

### Step 7: Full verification

```
bun run check
bun run typecheck
bun run test
bun run fix && git status --porcelain
```

**Expected**: the first three exit 0; the last prints nothing.

## Test plan

No tests. This is build tooling configuration; the verification is the
commands themselves, specifically the Step 3 and Step 7 invariant:

> On a `check`-clean tree, `bun run fix` produces no diff.

That invariant is the entire contract between the two commands and it is worth
stating in the commit message.

Do not add a test that shells out to Biome. It would be slow, would duplicate
what CI's lint step already does, and would fail for environmental reasons
rather than code reasons.

## Done criteria

All of the following, verbatim:

1. `bun run check` exits 0.
2. `bun run typecheck` exits 0.
3. `bun run test` exits 0.
4. The scripts match:
   `node -e "const s=require('./package.json').scripts; console.log(s.check.replace(/^ultracite check /,'') === s.fix.replace(/^ultracite fix /,''))"`
   prints `true`.
5. On a clean tree, `bun run fix` leaves `git status --porcelain` empty.
6. Every path in `biome.jsonc`'s `files.includes` exclusion list either exists
   in the tree or is a generated directory belonging to an app or package that
   does exist. Re-run the Step 4 existence loop against the final list to
   confirm.
7. `git diff --name-only` lists at most `package.json` and `biome.jsonc`.

## STOP conditions

Stop and report back rather than improvising if any of these occur:

- **The working tree is not clean at Step 1.** Do not stash. Report and stop.
- **`bun run fix` rewrites files on a `check`-clean tree** (Step 3 or Step 7).
  Report the exact file list. Do not commit the reformatting: it means `check`
  and `fix` are still asymmetric, and committing the output would hide that
  rather than fix it.
- **`bun run check` reports new diagnostics after the `biome.jsonc` change.**
  Report them and revert the exclusion removal that caused them. Reformatting
  source files is explicitly out of scope for this plan.
- **`ultracite fix` rejects positional path arguments.** Check with
  `bunx ultracite --help`. If the CLI does not accept them the way `check`
  does, the correct fix is different (probably `vcs.useIgnoreFile` in
  `biome.jsonc`) and the user should choose. Report the CLI's actual usage
  rather than guessing.
- **`apps/email` turns out not to exist** at Step 4. `CLAUDE.md` documents it
  as a dev-preview app on port 3003. If it is gone, more has drifted than this
  plan accounts for; report it.

## Maintenance notes

- **The invariant to keep**: on a `check`-clean tree, `fix` produces no diff.
  If someone adds a path to `check`, they must add it to `fix`. Consider that
  pairing part of the review checklist for any change to the root scripts. The
  one-line Node check in done criterion 4 is cheap enough to paste into a PR
  comment.
- **Why not `vcs.useIgnoreFile: true`?** Telling Biome to honour `.gitignore`
  would also solve the build-output problem, and more generally. It was not
  taken here because it changes behaviour for every consumer of `biome.jsonc`,
  including editor integrations that read the config directly, and because it
  would silently exclude anything anyone adds to `.gitignore` later, including
  source files someone ignores for local reasons. Scoping the script is the
  narrower change with the same effect on the reported problem. If the user
  prefers the broader fix, it is a one-line addition to `biome.jsonc` and both
  can coexist.
- **The exclusion list should stay auditable.** Every entry now points at
  something that exists or at a known generated directory. When a package is
  deleted, its exclusion should go with it. Plan 033 covers removing the dead
  `collaboration` and `cms` package references elsewhere in the repo; if it
  lands first, re-check this list.
- **`CLAUDE.md` lists nine packages as "Not in use"**: `ai`, `cms`,
  `collaboration`, `feature-flags`, `internationalization`, `payments`,
  `rate-limit`, `security`, `storage`, `webhooks`. Config that references any
  of them is by definition stale. That is a useful grep when auditing any
  config file in this repo.
