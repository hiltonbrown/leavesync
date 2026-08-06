# Plan 048: Make `bun run check` exit 0 so the lint gate stops blocking every plan

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report, do not improvise. When done, update this plan's status row in
> `plans/README.md`.
>
> **Drift check (run first)**:
> `bun run check --max-diagnostics=5000 2>&1 | tail -3`
> This plan is calibrated against **2,589 diagnostics across 381 files**. If the
> current count differs by more than about 10%, re-derive the per-rule tallies
> in Step 0 before following the per-rule steps; the file lists below will have
> shifted.

## Status

- **Priority**: P0
- **Effort**: M
- **Risk**: MED
- **Depends on**: plan 047, which is **DONE** (committed as `f1884db`). Lint
  now runs against the same Biome 2.5.7 / Ultracite 7.10.1 that CI will install.
  This plan is ready to execute.
- **Category**: dx
- **Planned at**: commit `f1884db`, 2026-08-05
- **Confirmed on CI**: 2026-08-06, run 31071757693 on PR #121 at `893b5b1`.
  The `Test` job fails at its `bun run check` step and never reaches typecheck,
  migrate or either test lane, so this plan gates the whole CI pipeline exactly
  as described. Biome reported `Checked 727 files in 116s` and `Found 2589
  errors`, matching this plan's calibration figure on x64 CI rather than only on
  the machine where it was written. The 381-file figure below counts files
  carrying diagnostics; 727 is the total checked.

## Why this matters

`bun run check` currently fails with **2,589 diagnostics across 381 files**.
`.github/workflows/ci.yml` runs it at line 49, *before* typecheck and tests, so
CI is red on every pull request and never reaches the test step at all.

Almost every plan in this backlog lists `bun run check` exits 0 among its done
criteria. That criterion is currently unsatisfiable by any executor, no matter
how correct their change is. Plan 007's execution report already recorded this
as "root lint also has pre-existing out-of-scope diagnostics" and it has been
silently degrading every subsequent execution: an executor either blocks on a
gate it cannot pass, or learns to ignore a failing gate, which is worse.

This is a pre-existing backlog, not a regression. The affected files span
commits from April to August 2026, and `assist/source/useSortedKeys` is set to
`"on"` identically in Ultracite 7.9.4 and 7.10.1, so the recent Biome and
Ultracite bump did not cause it. The gate was added on 2026-06-13 in
`12fe5e6 ci: add lint and typecheck gates`, which changed `check` from a bare
`ultracite check` to
`ultracite check apps packages scripts tooling tsup.config.ts next-env.d.ts`
and wired it into CI. It has been failing since, and the backlog has grown
behind it for roughly two months.

After this plan, the lint gate means something again and the roughly forty
remaining plans can be executed against a gate they can actually pass.

## Current state

### The commands

`package.json`, root:

```json
    "check": "ultracite check apps packages scripts tooling tsup.config.ts next-env.d.ts",
    "fix": "ultracite fix apps packages scripts tooling tsup.config.ts next-env.d.ts",
```

### The configuration

`biome.jsonc`, root. Note the existing precedent for both a rule-level override
and path exclusions, which this plan extends in the same style:

```jsonc
{
  "$schema": "./node_modules/@biomejs/biome/configuration_schema.json",
  "extends": [
    "ultracite/biome/core",
    "ultracite/biome/react",
    "ultracite/biome/next"
  ],
  "linter": {
    "rules": {
      "performance": {
        "noBarrelFile": "off"
      }
    }
  },
  "files": {
    // "**/*" then subtract: generated output (database client, docs JSON,
    // email preview) and vendored shadcn/ui sources that are not ours to lint.
    "includes": [
      "**/*",
      "!packages/design-system/components/ui",
      "!packages/design-system/lib",
      "!packages/design-system/hooks",
      "!apps/docs/**/*.json",
      "!apps/email/.react-email",
      "!packages/database/generated"
    ]
  }
}
```

### The diagnostics, measured at commit `f1884db`

| Rule | Count | Auto-fixable | Handled by |
|---|---|---|---|
| `assist/source/useSortedKeys` | 1,875 | yes | Step 1 |
| `lint/performance/noJsxPropsBind` | 240 | no | Step 5, rule off |
| `assist/source/useSortedAttributes` | 169 | yes | Step 1 |
| `lint/suspicious/noLeakedRender` | 97 | no | Step 3 |
| `lint/performance/noAwaitInLoops` | 47 | no | Step 5, rule off |
| `lint/style/useDestructuring` | 34 | no | Step 4 |
| `lint/suspicious/noUnnecessaryConditions` | 27 | no | Step 4 |
| `lint/suspicious/noShadow` | 19 | no | Step 4 |
| `lint/style/useConsistentMethodSignatures` | 12 | yes | Step 1 |
| `lint/complexity/noUselessReturn` | 11 | yes | Step 1 |
| `lint/style/noIncrementDecrement` | 6 | no | Step 4 |
| `assist/source/useSortedPackageJson` | 6 | yes | Step 1 |
| `lint/style/useBlockStatements` | 5 | yes | Step 1 |
| `lint/a11y/noSvgWithoutTitle` | 4 | no | Step 2, path exclusion |
| `lint/complexity/useOptionalChain` | 2 | yes | Step 1 |
| `lint/complexity/noRedundantDefaultExport` | 2 | no | Step 2, targeted ignore |
| `lint/suspicious/useArraySortCompare` | 1 | no | Step 2 |
| `lint/complexity/noExcessiveCognitiveComplexity` | 1 | no | Step 4 |
| `assist/source/organizeImports` | 1 | yes | Step 1 |

**2,081 are auto-fixable** (2,067 of them safe fixes). `bun run fix` clears
those in one pass. The remaining **478 sit in 139 files** and are addressed by
Steps 2 to 5.

### Repo conventions that apply here

- Biome 2 + Ultracite enforce repo style; configuration is `biome.jsonc` at the
  root (`CLAUDE.md`, "Platform notes").
- Australian English in all UI copy, documentation and comments.
- No em dashes anywhere.
- Comments only where intent is non-obvious. The two rule-suppression comments
  this plan adds are exactly that case: they record *why* the rule does not
  apply, which is not derivable from the code.
- Conventional commits, one logical change per commit.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Lint (the gate) | `bun run check` | exit 0 |
| Lint with full output | `bun run check --max-diagnostics=5000` | full diagnostic list |
| Auto-fix | `bun run fix` | exit 0 or a reduced diagnostic count |
| Typecheck | `bun run typecheck` | exit 0 |
| Unit tests | `bun run test` | exit 0, `10 successful, 10 total` |
| Per-rule tally | see Step 0 | a rule/count table |

## Scope

**In scope**:

- `biome.jsonc` (root) — the `linter.rules` and `files.includes` blocks only
- Any `.ts`, `.tsx` or `package.json` file under `apps/`, `packages/`,
  `scripts/`, `tooling/`, plus `tsup.config.ts` and `next-env.d.ts`, but **only
  to resolve a diagnostic this plan names**
- `plans/048-make-the-lint-gate-passable.md` and `plans/README.md`

**Out of scope** (do NOT touch, even though they look related):

- **Any behaviour change.** Every edit in this plan is a formatting, naming or
  syntax change. If resolving a diagnostic appears to require changing what the
  code *does*, that is a STOP condition.
- `.github/workflows/ci.yml`. The lint step there is already correct; it is the
  code that is wrong. Plan 016 owns CI changes.
- The `check` and `fix` script definitions in `package.json`. Their scope was
  set deliberately (`12fe5e6`, then aligned by plan 022 in `65afb84` so that
  `fix` operates on exactly the file set `check` inspects). Narrowing them to
  make the gate pass would defeat the purpose of this plan.
- Files already excluded by `biome.jsonc` (`packages/design-system/components/ui`,
  `packages/database/generated`, and the rest of the existing list).
- The `bun run build` crash in `apps/app`. Plan 049 owns it.

## Git workflow

- Branch: `advisor/048-make-the-lint-gate-passable`
- **One commit per step**, so a reviewer can read the mechanical bulk change
  separately from the judgement calls. Suggested messages:
  - Step 1: `style: apply biome safe fixes across the monorepo`
  - Step 2: `chore(lint): exclude docs svg assets and record two rule exceptions`
  - Step 3: `style: use explicit ternaries in conditional jsx`
  - Step 4: `refactor: resolve remaining biome style diagnostics`
  - Step 5: `chore(lint): record deliberate rule exclusions in biome.jsonc`
- Do NOT push or open a PR unless the operator instructs it.

## Steps

### Step 0: Record the baseline and derive the per-rule tally

```
bun run check --max-diagnostics=5000 > /tmp/lint-before.txt 2>&1
tail -3 /tmp/lint-before.txt
```

Then derive the tally you will work against:

```
awk '/^[a-zA-Z].*:[0-9]+:[0-9]+ (assist|lint)\// {
  for (i = 1; i <= NF; i++) if ($i ~ /^(assist|lint)\//) rule = $i
  fix = ($0 ~ /FIXABLE/) ? "FIXABLE" : "manual"
  print rule, fix
}' /tmp/lint-before.txt | sort | uniq -c | sort -rn
```

**Verify**: the output resembles the table under "Current state". Record the
actual total. If the total differs from 2,589 by more than about 10%, note the
real figure and use your own tally rather than the file lists below.

### Step 1: Apply every safe automatic fix

```
bun run fix
```

Then re-measure:

```
bun run check --max-diagnostics=5000 > /tmp/lint-after-fix.txt 2>&1
tail -3 /tmp/lint-after-fix.txt
```

**Verify**: the diagnostic count drops to roughly **478** (from 2,589). Every
remaining diagnostic should be one of the rules marked "no" in the auto-fixable
column.

Now prove nothing broke. `useSortedKeys` reorders object literal properties,
which is safe in JavaScript but touches a very large number of files:

```
bun run typecheck
bun run test
```

**Verify**: both exit 0, and `bun run test` reports `10 successful, 10 total`.
If any test that passed before Step 1 now fails, STOP: a safe fix has changed
behaviour and that needs investigation, not a workaround.

Commit before continuing. The remaining steps are much smaller and you want
this bulk change isolated.

### Step 2: Handle the three narrow, clearly-justified cases

**2a. `lint/a11y/noSvgWithoutTitle`, 4 diagnostics.** All four are brand image
assets in the Mintlify documentation app, not application UI:

```
apps/docs/images/hero-dark.svg
apps/docs/images/hero-light.svg
apps/docs/logo/dark.svg
apps/docs/logo/light.svg
```

`biome.jsonc` already excludes `!apps/docs/**/*.json` on the same reasoning.
Add one more entry to `files.includes`, immediately after it:

```jsonc
      "!apps/docs/**/*.json",
      // Mintlify brand assets. These are decorative logo and hero images
      // referenced from docs pages that supply their own alt text.
      "!apps/docs/**/*.svg",
```

**2b. `lint/complexity/noRedundantDefaultExport`, 2 diagnostics.** Both sites
already carry a comment explaining that the default export is required:

- `packages/email/templates/contact.tsx:56`
- `packages/email/templates/notification.tsx:80`

React Email's CLI discovers templates through the default export, while
application code imports the named export. The code is correct and the rule
does not apply. Add a targeted suppression on the line above each
`export default`, keeping the existing explanatory comment:

```tsx
// React Email's CLI discovers templates via the default export, so keep one
// alongside the named export used by application code.
// biome-ignore lint/complexity/noRedundantDefaultExport: React Email's CLI requires the default export.
export default ContactTemplate;
```

Do **not** turn this rule off globally. `CLAUDE.md` says "Named exports only.
No default exports", so the rule is doing useful work everywhere else.

**2c. `lint/suspicious/useArraySortCompare`, 1 diagnostic.** At
`packages/database/src/test-fixtures/slice-14-fixture.test.ts:16`:

```typescript
    expect(fixture.syncRuns.map((run) => run.status).sort()).toEqual([
```

A bare `.sort()` on strings is implementation-dependent. Give it an explicit
comparator:

```typescript
    expect(
      fixture.syncRuns.map((run) => run.status).sort((a, b) => a.localeCompare(b))
    ).toEqual([
```

**Verify**:

```
bun run check --max-diagnostics=5000 2>&1 | grep -cE "noSvgWithoutTitle|noRedundantDefaultExport|useArraySortCompare"
```

returns 0, and `bun run test` still exits 0.

### Step 3: Convert leaked conditional renders to explicit ternaries

`lint/suspicious/noLeakedRender`, **97 diagnostics across 40 files**. The rule
guards a genuine React footgun: `{count && <X />}` renders a literal `0` when
`count` is `0`, and `{name && <X />}` renders nothing but is fragile when `name`
becomes `""`.

The mechanical transform, applied at every flagged site:

```tsx
// before
{canConnect && (
  <a href={...}>Connect Xero</a>
)}

// after
{canConnect ? (
  <a href={...}>Connect Xero</a>
) : null}
```

Work file by file, heaviest first:

| File | Count |
|---|---|
| `apps/app/components/people/person-profile-content.tsx` | 11 |
| `apps/app/components/people/alternative-contacts-panel.tsx` | 10 |
| `apps/app/components/feed/feed-detail.tsx` | 7 |
| `apps/app/app/(authenticated)/plans/plans-client.tsx` | 5 |
| `apps/app/app/(authenticated)/people/people-client.tsx` | 5 |
| `apps/app/app/(authenticated)/notifications/notifications-client.tsx` | 5 |
| `apps/app/app/(authenticated)/sync/[runId]/sync-run-detail-client.tsx` | 4 |
| `apps/app/app/(authenticated)/plans/record-form.tsx` | 4 |
| `apps/app/components/feed/feed-table.tsx` | 3 |
| `apps/app/components/calendar/calendar-event-popover.tsx` | 3 |

The remaining 30 files have one or two each. Get the full current list with:

```
bun run check --max-diagnostics=5000 2>&1 \
  | grep 'noLeakedRender' | cut -d: -f1 | sort | uniq -c | sort -rn
```

**If a flagged left operand is a number or a string** (rather than a boolean),
the current code has a real rendering bug. Convert it to an explicit comparison,
for example `{items.length > 0 ? <List /> : null}`, and note the file and line
in your completion report so a reviewer can confirm the intended behaviour.

**Verify** after each file:

```
bun run check --max-diagnostics=5000 2>&1 | grep -c 'noLeakedRender'
```

decreases as expected, reaching 0 at the end. Then:

```
bun run test
```

**Verify**: exit 0. `apps/app` has 53 test files covering these components; a
mistyped ternary will surface there.

### Step 4: Resolve the remaining mechanical style diagnostics

Four rules, 87 diagnostics total. All are local, mechanical edits.

**4a. `lint/style/useDestructuring`, 34 diagnostics across 26 files.** Replace
repeated member access with a destructured binding, as the diagnostic's
suggestion shows. Heaviest files:
`packages/availability/src/slice-14-integration-flows.test.ts` (3),
`packages/xero/src/oauth/service.test.ts` (2),
`packages/xero/src/oauth/disconnect.integration.test.ts` (2),
`packages/jobs/src/handlers/sync-xero-people.ts` (2),
`packages/feeds/src/scope/feed-scope.ts` (2).

**4b. `lint/suspicious/noUnnecessaryConditions`, 27 diagnostics across 9
files.** Concentrated in
`packages/availability/src/people/current-status.test.ts` (13) and
`apps/web/app/features/components/interactive-hero.tsx` (5). Each flags a
condition the type system proves is always true or always false. Remove the
redundant condition. **If removing it would change behaviour at runtime**
(for example, the value is typed non-nullable but actually arrives from an
unvalidated external source), do not remove it: leave the condition and add a
`biome-ignore` with a one-line reason, and list it in your report.

**4c. `lint/suspicious/noShadow`, 19 diagnostics across 14 files.** Rename the
inner binding. Heaviest:
`packages/availability/src/calendar/calendar-service.ts` (5),
`packages/feeds/src/cache/feed-cache.ts` (2). Most of the rest are test mocks
whose parameters shadow outer fixture names, for example
`apps/app/app/(authenticated)/public-holidays/page.test.tsx:9`. Renaming a
parameter is purely local.

**4d. `lint/style/noIncrementDecrement`, 6 diagnostics**, all in
`apps/web/app/features/components/interactive-hero.tsx`. Replace `x++` with
`x += 1` and `x--` with `x -= 1`. Watch for any *postfix* usage whose returned
value is consumed (`const a = i++`); rewrite those explicitly rather than
mechanically.

**4e. `lint/complexity/noExcessiveCognitiveComplexity`, 1 diagnostic.** Locate
it with:

```
bun run check --max-diagnostics=5000 2>&1 | grep -A2 'noExcessiveCognitiveComplexity'
```

`packages/jobs/src/handlers/reconcile-xero-approval-state.ts:115` already sets
the precedent for how this repo handles the rule:

```typescript
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: This handler coordinates run lifecycle, batching, per-record outcomes and finalisation.
```

If the flagged function can be split without changing behaviour, split it.
Otherwise add a `biome-ignore` in that style with a specific reason. Do **not**
refactor a Xero, approval or feed code path to reduce a complexity score during
a release freeze; a suppression with a reason is the correct trade here.

**Verify**:

```
bun run check --max-diagnostics=5000 2>&1 \
  | grep -cE "useDestructuring|noUnnecessaryConditions|noShadow|noIncrementDecrement|noExcessiveCognitiveComplexity"
```

returns 0. Then `bun run typecheck` and `bun run test` both exit 0.

### Step 5: Record the two deliberate rule exclusions

Two rules remain, 287 diagnostics. Both are opinionated performance rules whose
advice is wrong for this codebase, and fixing them would mean a wide, risky
refactor for no defect closed. Turn them off **with a recorded reason**, in the
same style as the existing `noBarrelFile` entry.

In `biome.jsonc`, extend the `linter.rules` block:

```jsonc
  "linter": {
    "rules": {
      "performance": {
        "noBarrelFile": "off",
        // 240 sites. React 19 with the React Compiler makes manual useCallback
        // wrapping unnecessary, and hand-wrapping every JSX handler costs more
        // readability than it buys. Revisit if profiling shows a real cost.
        "noJsxPropsBind": "off",
        // 47 sites, nearly all deliberately sequential: Xero pagination loops
        // and the batched sync handlers. Xero rate limiting allows only five
        // concurrent requests per organisation, so the rule's suggested
        // Promise.all rewrite would breach the documented limit.
        "noAwaitInLoops": "off"
      }
    }
  },
```

**Verify**:

```
bun run check
```

**exit 0.** This is the point of the entire plan.

### Step 6: Confirm the whole gate

```
bun run check
bun run typecheck
bun run test
```

**Verify**: all three exit 0, and `bun run test` reports
`10 successful, 10 total`.

Then confirm you changed nothing outside the sanctioned surface:

```
git diff --name-only origin/main...HEAD | grep -vE '^(apps|packages|scripts|tooling)/|^biome\.jsonc$|^tsup\.config\.ts$|^plans/'
```

**Verify**: no output.

## Test plan

This plan adds no new tests. It is a formatting, naming and configuration
change, and the existing suite is the regression net:

- `bun run test` must pass identically before and after every step. The `app`
  workspace alone has 53 test files and 175 tests covering the components edited
  in Step 3.
- `bun run typecheck` must pass after Step 1 in particular, because
  `useSortedKeys` rewrites a very large number of object literals.
- Record the test totals from Step 0 and compare them at Step 6. The counts must
  be **identical**, not merely both green. A dropped test file is a silent
  failure this plan could otherwise cause.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `bun run check` exits 0
- [ ] `bun run typecheck` exits 0
- [ ] `bun run test` exits 0 and reports `10 successful, 10 total`
- [ ] Test counts match the Step 0 baseline exactly
- [ ] `grep -c 'noJsxPropsBind' biome.jsonc` returns 1 and the entry carries the reason comment
- [ ] `grep -c 'noAwaitInLoops' biome.jsonc` returns 1 and the entry carries the reason comment
- [ ] `grep -c 'apps/docs/\*\*/\*.svg' biome.jsonc` returns 1
- [ ] `git diff --name-only origin/main...HEAD` contains no file outside `apps/`, `packages/`, `scripts/`, `tooling/`, `biome.jsonc`, `tsup.config.ts` and `plans/`
- [ ] No `package.json` script definition changed
- [ ] Status row for plan 048 updated in `plans/README.md`

## STOP conditions

Stop and report back (do not improvise) if:

- `bun run fix` in Step 1 causes any previously passing test to fail. A "safe"
  fix changing behaviour is a real finding, not something to work around.
- The diagnostic count after Step 1 is materially above about 600. The per-rule
  file lists in this plan would then be stale and the later steps would be
  guesswork.
- Resolving any diagnostic appears to require a behaviour change. In particular:
  a `noUnnecessaryConditions` site where the condition guards genuinely
  untrusted external input, or a `noLeakedRender` site where the fix changes
  which branch renders.
- You find yourself editing `.github/workflows/ci.yml` or the `check` / `fix`
  scripts in `package.json`. Narrowing the gate is not a fix.
- Any diagnostic remains that is not listed in the Step 0 table and has no
  handling step in this plan.

## Maintenance notes

- The reason this backlog grew to 2,589 is that the gate was scoped up and wired
  into CI (`12fe5e6`, 2026-06-13) without a clearing pass, so it failed from its
  first run and everyone learned to look past it. A permanently red gate is
  worse than no gate, because it trains executors to ignore verification. Once
  green, keep it green: the CI step at `.github/workflows/ci.yml:49` will then
  actually catch drift.
- `assist/source/useSortedKeys` produces very large but entirely mechanical
  diffs. A reviewer should read Step 1's commit with `git diff -w` and focus
  their attention on Steps 2 to 5, where the judgement calls are.
- The two rules disabled in Step 5 are disabled *for stated reasons*, not
  because they were inconvenient. If the React Compiler is ever removed, or if
  Xero's concurrency limit changes, revisit `noJsxPropsBind` and
  `noAwaitInLoops` respectively.
- Deliberately deferred: no `biome-ignore` sweep. Every suppression this plan
  adds is individually justified in a comment. Resist adding blanket
  file-level suppressions later; they hide the next real defect.
- Expect one more clearing pass whenever Ultracite bumps a major version and
  enables new rules. Budget for it rather than letting it accumulate again.
