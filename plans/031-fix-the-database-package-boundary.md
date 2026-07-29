# Plan 031: Fix the `@repo/database` package boundary

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report, do not improvise. When done, update this plan's status row in
> `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 75202db..HEAD -- packages/database/index.ts packages/database/package.json apps/app apps/api`
> If any changed since this plan was written, re-check the "Current state"
> facts before proceeding.

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: LOW
- **Depends on**: plan 032 should land first (same files, security fix)
- **Category**: tech debt, architecture
- **Planned at**: commit `75202db`, 2026-07-25

## Why this matters

`CLAUDE.md` states two boundary rules: "All database access through
`packages/database`. Never import Prisma client directly in apps" and "No
barrel files (`index.ts` re-exports) except at package root". The intent is
that `packages/database` presents one surface and apps consume that surface.

Two patterns cut across it.

**1. Eighteen deep imports reach past the package root into its source tree.**
Nine files in `apps/app` and `apps/api` import from
`@repo/database/src/queries/...` directly. They do this because
`packages/database/index.ts` re-exports only one of the ten query modules, so
the others are unreachable through the front door. The deep path works because
`packages/database/package.json` declares only `main` and `types` with no
`exports` map, leaving the whole directory tree addressable.

The practical cost is not aesthetic. A package with no defined surface cannot
be refactored: moving `src/queries/organisations.ts` breaks nine files in two
apps, with no compiler warning until the move. It also means the "all database
access through `packages/database`" rule is unenforceable, because there is no
"through" to speak of.

**2. Client components are typed with raw Prisma row types.** Three
`"use client"` components declare their props as Prisma models
(`Organisation`, `XeroConnection`, `XeroTenant`, `Person`,
`XeroPersonMatch`). That couples the browser-facing contract to the database
schema: a column rename becomes a client-component change, and, more
seriously, a prop type of "the whole row" gives a reviewer no signal about what
is actually crossing the boundary.

That second pattern is how plan 032's defect stayed invisible: encrypted Xero
tokens shipped to the browser for months while the types all agreed.

**This plan is the cleanup. Plan 032 is the security fix and must land
first.** Do not merge them: one is a P1 that should ship on its own, the other
is P3 tidying that can wait.

## Current state

### The eighteen deep imports

```
grep -rn "@repo/[a-z-]*/src/" apps packages --include=*.ts --include=*.tsx | grep -v node_modules | wc -l
```

At commit `75202db` this returns `18`, across nine files, every one of them
reaching into `@repo/database`:

| File | Imports |
|---|---|
| `apps/api/app/api/availability/[recordId]/route.ts` | `@repo/database/src/queries/availability-records`, `@repo/database/src/queries/organisations` |
| `apps/api/app/api/availability/route.ts` | `@repo/database/src/queries/organisations`, `@repo/database/src/queries/people` |
| `apps/api/app/api/support/github-issue/route.ts` | `@repo/database/src/queries/organisations` |
| `apps/app/app/(authenticated)/components/header.tsx` | `@repo/database/src/queries/organisations` |
| `apps/app/app/(authenticated)/layout.tsx` | `@repo/database/src/queries/organisations` |
| `apps/app/lib/server/get-active-org-context.ts` | `@repo/database/src/queries/organisations` |
| `apps/app/lib/server/require-active-org-page-context.ts` | `@repo/database/src/queries/organisations` |

Regenerate the exact list before starting; the table above is a lead, not a
contract.

### The package root exports only one query module

`packages/database/index.ts` in full:

```typescript
export { limitTypes } from "@repo/core";
export * from "./generated/client";
export { type Database, database } from "./src/client";
export {
  ...
};
export * from "./src/queries/billing";
export * from "./src/seed/plan-sync";
export * from "./src/seed/plans";
export { type ScopedQueryResult, scopedQuery } from "./src/tenant-query";
```

`src/queries/` contains ten modules:

```
availability-records.ts
billing.ts            <- the only one exported from the root
feeds.ts
leave-balances.ts
notifications.ts
organisations.ts
people.ts
public-holidays.ts
support-submissions.ts
sync-runs.ts
```

### No `exports` map to enforce the boundary

`packages/database/package.json`:

```json
{
 "main": "./index.ts",
 "types": "./index.ts"
}
```

With no `exports` field, Node and the bundler resolve any path under the
package directory. That is why `@repo/database/src/queries/organisations`
works, and why `@repo/database/generated/client` works too.

Note that `@repo/database/generated/client` is used widely and deliberately
(for Prisma model types and the `Prisma` namespace). It is a different case
from `src/queries/...`: it is a generated artefact with a stable path, and
`index.ts` already does `export * from "./generated/client"`. See "Design" for
how the two are treated differently.

### Client components typed as Prisma rows

Three files:

```
apps/app/app/(authenticated)/settings/integrations/xero/matches/matches-client.tsx
apps/app/app/(authenticated)/settings/integrations/xero/xero-client.tsx
apps/app/app/(authenticated)/settings/integrations/integrations-client.tsx
```

`xero-client.tsx` lines 3-7 and 29-35:

```tsx
import type {
  Organisation,
  XeroConnection,
  XeroTenant,
} from "@repo/database/generated/client";
...
type OrganisationWithXero = Organisation & {
  xero_connection: (XeroConnection & { xero_tenant: XeroTenant | null }) | null;
};

interface XeroClientProps {
  organisations: OrganisationWithXero[];
}
```

`matches-client.tsx` line 3:

```tsx
import type { Person, XeroPersonMatch } from "@repo/database/generated/client";
```

Only these three. Every other client component in `apps/app` takes view models,
which is the pattern to extend.

## Design

Two independent changes.

**Change A: give `packages/database` a front door.** Export the query modules
from `index.ts` and rewrite the eighteen deep imports to use the package root.
Then add an `exports` map to `package.json` that admits the root and
`./generated/client` and nothing else, so the deep path stops resolving and the
boundary becomes enforced rather than aspirational.

**Change B: give the three client components view models.** Plan 032 already
creates `_connection-view.ts` with a view type for two of them; this change
extends that to `matches-client.tsx` and removes the last raw-Prisma prop
types from client components.

**Do change A first and verify, then change B.** They are independent and A is
the larger diff.

**On name collisions.** Ten query modules exported with `export *` may collide
(several probably export a `list` or a `getById`). Check before doing it: if
they collide, export namespaces instead:

```typescript
export * as availabilityRecordQueries from "./src/queries/availability-records";
```

Namespaced exports are also more readable at the call site
(`organisationQueries.getOrganisationById`) and make the package surface
self-documenting. **Prefer namespaces unless the existing `billing` export
pattern makes flat exports clearly more consistent.** Whichever you choose,
apply it to all ten.

## Commands you will need

All run from the repo root.

```
bun install                # run first if you hit "Cannot find module '@repo/observability/log'"
bun run check
bun run typecheck
bun run test
bun run build
```

`bun run build` matters here: an `exports` map that is wrong breaks module
resolution in ways `typecheck` may not catch, because TypeScript and the
bundler resolve differently.

## Scope

**In scope:**

- `packages/database/index.ts`
- `packages/database/package.json` (the `exports` map)
- The nine files holding deep imports
- `apps/app/app/(authenticated)/settings/integrations/xero/matches/matches-client.tsx`
  and the page that renders it
- The two integrations client components, **only** to the extent plan 032 has
  not already narrowed them

**Explicitly out of scope:**

- Any query implementation in `packages/database/src/queries/`. This plan
  re-exports them; it does not change them.
- `@repo/database/generated/client` imports elsewhere in the repo. That path
  stays supported; it is the Prisma type surface and dozens of files use it
  correctly.
- The `select` on the integrations pages. Plan 032 owns that and must land
  first.
- Other packages' export surfaces. `@repo/availability`, `@repo/feeds`,
  `@repo/xero` and the rest are not audited here; the sweep in Step 1 will
  reveal whether any has the same problem, and finding one is a report, not a
  scope extension.
- Moving database access out of server components and into service packages.
  That is a much larger architectural change and it is not what `CLAUDE.md`
  requires: the rule is "through `packages/database`", which server components
  satisfy.

## Git workflow

```
git checkout -b refactor/database-package-boundary
```

Two commits:

```
refactor(database): export the query modules from the package root
refactor(app): type client components with view models, not Prisma rows
```

**Ordering**: plan 032 first (security fix, same files). If 032 has not landed
and you are about to touch `xero-client.tsx` or `integrations-client.tsx`,
stop and report: doing the cleanup first makes the security fix harder to
review.

Do not push or open a pull request unless the user asks.

## Steps

### Step 1: Establish the baseline and regenerate the inventory

```
bun run check
bun run typecheck
bun run test
bun run build
```

**Expected**: all four exit 0. Record the test count.

Then regenerate the deep-import list:

```
grep -rn "@repo/[a-z-]*/src/" apps packages --include=*.ts --include=*.tsx | grep -v node_modules | grep -v "\.test\."
```

**Expected**: eighteen occurrences, all `@repo/database/src/queries/...`.

If any hit reaches into a package other than `@repo/database`, **report it and
leave it alone**. That is a second instance of the same problem in a package
this plan has not analysed.

### Step 2: Check for export name collisions

```
for f in packages/database/src/queries/*.ts; do
  echo "== $f"
  grep -oE "^export (async )?(function|const|type|interface) [A-Za-z_]+" "$f" | awk '{print $NF}'
done
```

Read the output and look for the same identifier in two modules.

**If there are no collisions**: flat `export *` is safe and matches the
existing `billing` line.

**If there are collisions**: use namespaced exports. Either way, be consistent
across all ten and say which you chose and why in your report.

### Step 3: Export the query modules from the package root

Edit `packages/database/index.ts`. Add the nine missing modules alongside the
existing `billing` export, in alphabetical order:

```typescript
export * from "./src/queries/availability-records";
export * from "./src/queries/billing";
export * from "./src/queries/feeds";
export * from "./src/queries/leave-balances";
export * from "./src/queries/notifications";
export * from "./src/queries/organisations";
export * from "./src/queries/people";
export * from "./src/queries/public-holidays";
export * from "./src/queries/support-submissions";
export * from "./src/queries/sync-runs";
```

(or the namespaced form from Step 2).

**Verify**:

```
bun run typecheck
```

**Expected**: exits 0. A collision that Step 2 missed surfaces here as a
duplicate-export error.

### Step 4: Rewrite the eighteen deep imports

For each of the nine files, change:

```typescript
import { getOrganisationById } from "@repo/database/src/queries/organisations";
```

to:

```typescript
import { getOrganisationById } from "@repo/database";
```

Merge with an existing `@repo/database` import in the same file where there is
one, keeping the import list alphabetical as the surrounding code does.

**Do this one file at a time**, running `bun run typecheck` after each. Nine
files is few enough that per-file verification costs little and localises any
failure.

**Verify after all nine**:

```
grep -rn "@repo/database/src/" apps packages --include=*.ts --include=*.tsx | grep -v node_modules
bun run typecheck
bun run test
```

**Expected**: the grep returns nothing; both commands exit 0 with an unchanged
test count.

### Step 5: Close the door with an `exports` map

Edit `packages/database/package.json`:

```json
{
  "main": "./index.ts",
  "types": "./index.ts",
  "exports": {
    ".": "./index.ts",
    "./generated/client": "./generated/client/index.ts",
    "./generated/enums": "./generated/enums.ts",
    "./keys": "./keys.ts"
  }
}
```

**Derive the real subpath list first.** Grep for every `@repo/database/...`
import in the repo and make sure each still resolves:

```
grep -rhn "from \"@repo/database[^\"]*\"" apps packages --include=*.ts --include=*.tsx | grep -oE "@repo/database[^\"]*" | sort -u
```

Every path in that output must be either `.` or an entry in the map. Check the
actual file each path resolves to before writing it (`generated/client` may be
a directory with an `index.ts`, or a single file; `generated/enums` may or may
not exist as written).

**Do not add `./src/*` to the map.** The whole point is that the deep path
stops resolving.

**Verify**:

```
bun run typecheck
bun run build
bun run test
```

**Expected**: all three exit 0. **`bun run build` is the one that matters
here**: TypeScript and the bundler resolve `exports` differently, and a map
that satisfies `tsc` can still break a Next.js build.

If the build fails on a path you did not anticipate, add it to the map only if
it is a legitimate public subpath (a generated artefact, a `keys.ts`). If it is
another `src/...` path, that is a deep import Step 4 missed: fix the import,
not the map.

### Step 6: Give `matches-client.tsx` a view model

Read
`apps/app/app/(authenticated)/settings/integrations/xero/matches/matches-client.tsx`
and the page that renders it. List the fields the component actually reads from
`Person` and `XeroPersonMatch`.

Define a view type beside the page, following the shape plan 032 established
in `_connection-view.ts`:

```typescript
export type PersonMatchView = {
  // ... only the fields the client renders
};
```

and have the page map its query result into it, or select exactly those fields
and derive the type with `Prisma.XeroPersonMatchGetPayload<...>` as plan 032
does.

Then replace the client component's import and prop type:

```tsx
import type { PersonMatchView } from "./_match-view";
```

**Note**: `Person` and `XeroPersonMatch` hold no credentials, so this is a
typing improvement rather than a leak fix. But `Person` does hold
`clerk_user_id` and `email`, which are worth not shipping wholesale.

**Verify**:

```
bun run typecheck
bun run check
grep -c "@repo/database/generated/client" "apps/app/app/(authenticated)/settings/integrations/xero/matches/matches-client.tsx"
```

**Expected**: typecheck and check exit 0; the grep prints `0`.

### Step 7: Confirm no client component imports Prisma types

```
grep -rln "\"use client\"" apps/app --include=*.tsx | grep -v node_modules | xargs grep -ln "@repo/database" 2>/dev/null
```

**Expected**: no output.

If a file appears, read it. A client component importing a value (not just a
type) from `@repo/database` is a bundling problem as well as a typing one:
report it.

### Step 8: Full verification

```
bun run check
bun run typecheck
bun run test
bun run build
git diff --name-only
```

**Expected**: the first four exit 0; the test count is unchanged from Step 1.

## Test plan

**No new behaviour, so few new tests.** This is a refactor and the existing
suite is the regression test: an unchanged test count with everything passing
is the requirement.

Two additions worth making:

1. **A boundary test.** In `packages/database`, assert the public surface
   exports what it claims:

   ```typescript
   import { describe, expect, it } from "vitest";
   import * as db from "./index";

   describe("@repo/database public surface", () => {
     it("exports the organisation queries consumers rely on", () => {
       expect(typeof db.getOrganisationById).toBe("function");
     });
   });
   ```

   Name the handful of functions the apps actually import. This turns "the
   front door is open" into something a test can state.

2. **Nothing for the view models.** They are types, erased at runtime. The
   typecheck is the test.

Do not write a test that greps the source for deep imports. Done criterion 4
below does that as a command, which is the right place for it: a repo-scanning
test is slow, brittle, and fails for reasons unrelated to the code it lives
beside.

## Done criteria

All of the following, verbatim:

1. `bun run check` exits 0.
2. `bun run typecheck` exits 0.
3. `bun run test` exits 0 with the Step 1 baseline test count plus any tests
   added from the test plan.
4. `grep -rn "@repo/database/src/" apps packages --include=*.ts --include=*.tsx | grep -v node_modules`
   returns nothing.
5. `bun run build` exits 0.
6. `node -e "console.log(Boolean(require('./packages/database/package.json').exports))"`
   prints `true`, and the map contains no `./src` entry.
7. `grep -rln "\"use client\"" apps/app --include=*.tsx | grep -v node_modules | xargs grep -ln "@repo/database" 2>/dev/null`
   returns nothing.
8. `git diff` contains no change to any file under
   `packages/database/src/queries/`. This plan re-exports those modules; it does
   not edit them.

## STOP conditions

Stop and report back rather than improvising if any of these occur:

- **The baseline in Step 1 is not green.** Report what fails; change nothing.
- **Plan 032 has not landed and you are about to edit `xero-client.tsx` or
  `integrations-client.tsx`.** Stop. Land the security fix first; doing this
  cleanup on top of the leak makes the leak harder to see in review.
- **The test count changes.** This is a refactor and must not alter behaviour.
  Report which suite changed.
- **Adding the `exports` map breaks the build on a path you cannot classify.**
  Report the path and what imports it. Do not add `./src/*` to the map to make
  the error go away: that restores exactly the hole this step closes.
- **Two query modules export the same identifier** and namespacing them would
  change more call sites than Step 4 anticipates. Report the collisions and the
  call-site count; the user may prefer flat exports with a rename.
- **A file outside `apps/` deep-imports `@repo/database/src/...`**, for example
  another package. Report it. Package-to-package deep imports are a different
  problem (a dependency-graph question) and may be load-bearing.
- **A client component imports a runtime value from `@repo/database`**, not
  just a type. That is a bundling defect with its own consequences (the Prisma
  client is large and server-only). Report it separately.

## Maintenance notes

- **The `exports` map is what makes the rule real.** Before it, "all database
  access through `packages/database`" was a sentence in `CLAUDE.md` that
  nothing enforced; after it, a deep import fails to resolve. That is the
  difference between a convention and a boundary. If someone later adds
  `"./src/*"` to the map to unblock themselves, the boundary is gone again.
- **New query modules must be exported from `index.ts`.** Otherwise the next
  consumer hits an unresolvable import and reaches for a `./src/` path, and the
  cycle restarts. Worth a line in the package's own README if one exists.
- **Client components take view models.** After this plan, no `"use client"`
  component in `apps/app` imports from `@repo/database`. Keep it that way: the
  Step 7 grep is a one-line review check, and plan 032 exists because a raw
  Prisma prop type hid a token leak in plain sight.
- **Other packages were not audited.** `@repo/availability`, `@repo/feeds`,
  `@repo/xero`, `@repo/notifications` and `@repo/core` may have the same shape.
  The Step 1 sweep will show whether anything deep-imports them today (nothing
  does at `75202db`), but none of them has an `exports` map either, so the door
  is open. Applying the same treatment package by package is a reasonable
  follow-up.
- **Related plans**: 032 (the security fix in the same files; land first), 021
  (consolidates the tenant-scoping helpers, which also live in
  `packages/database`), 030 (touches `get-active-org-context.ts`, one of the
  nine files with a deep import).
