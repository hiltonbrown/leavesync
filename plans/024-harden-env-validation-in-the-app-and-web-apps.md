# Plan 024: Harden env validation in `apps/app` and `apps/web`

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report, do not improvise. When done, update this plan's status row in
> `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 75202db..HEAD -- apps/app/env.ts apps/api/env.ts apps/web/env.ts packages/billing/keys.ts`
> If any changed since this plan was written, re-check the "Current state"
> facts before proceeding.
>
> **Secrets rule for this plan**: never copy a value out of `.env.local`, out
> of a deployment environment, or out of any running process into a tracked
> file or into your report. If you encounter a credential, reference the file
> and line and the credential type only, and recommend rotation.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none (but see "Git workflow" for ordering with plan 023)
- **Category**: dx, correctness
- **Planned at**: commit `75202db`, 2026-07-25

## Why this matters

Three apps compose their environment schema with `@t3-oss/env-nextjs`.
`apps/api` sets `emptyStringAsUndefined: true` and explains why in a comment.
`apps/app` and `apps/web` do not.

The consequence is a deployment-time failure mode that is specific to Vercel and
hard to diagnose. A Vercel environment variable that exists but is blank arrives
as `""`, not as `undefined`. A Zod schema like
`z.string().startsWith("sk_").optional()` accepts `undefined` and **rejects**
`""`, because `.optional()` only admits absence, not emptiness. So a blank
variable in the Vercel dashboard fails env validation and takes down the build
or the boot, with an error naming a variable the operator believes is optional.

`CLAUDE.md` already documents the workaround: "Optional variables with format
constraints must be absent (commented out), not `""`. Empty strings fail Zod
format validation even for `.optional()` fields." That is a rule humans must
remember, imposed on people editing a web dashboard, when a one-line
configuration change removes the need for it. `apps/api` and
`packages/billing` already took that line; `apps/app` and `apps/web` were
missed.

There is a second, smaller gap. `apps/app` depends on `@repo/billing` and calls
it from a server action, but `apps/app/env.ts` does not extend `billing()`. So
the Stripe variables the app's own code path depends on are never validated in
that app. A malformed `STRIPE_SECRET_KEY` fails at the Stripe SDK call rather
than at startup, which is exactly the inversion env validation exists to
prevent.

## Current state

### `apps/api/env.ts`, the correct exemplar

```typescript
export const env = createEnv({
  extends: [
    auth(),
    billing(),
    analytics(),
    core(),
    database(),
    email(),
    feeds(),
    github(),
    jobs(),
    observability(),
    xero(),
  ],
  server: { STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_").optional() },
  client: {},
  runtimeEnv: { STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET },
  // A blank Vercel env var must behave as unset, otherwise the format
  // constraint rejects it even though the variable is optional.
  emptyStringAsUndefined: true,
});
```

`packages/billing/keys.ts` does the same at the module level:

```typescript
    // Treat an empty string (e.g. a blank Vercel env var) as unset so the
    // format-constrained optional keys do not fail validation when billing is
    // not configured for an environment.
    emptyStringAsUndefined: true,
```

### `apps/app/env.ts` in full

```typescript
import { keys as analytics } from "@repo/analytics/keys";
import { keys as auth } from "@repo/auth/keys";
import { keys as database } from "@repo/database/keys";
import { keys as email } from "@repo/email/keys";
import { keys as feeds } from "@repo/feeds/keys";
import { keys as core } from "@repo/next-config/keys";
import { keys as notifications } from "@repo/notifications/keys";
import { keys as observability } from "@repo/observability/keys";
import { keys as xero } from "@repo/xero/keys";
import { createEnv } from "@t3-oss/env-nextjs";

export const env = createEnv({
  extends: [
    auth(),
    analytics(),
    core(),
    database(),
    email(),
    feeds(),
    notifications(),
    observability(),
    xero(),
  ],
  server: {},
  client: {},
  runtimeEnv: {},
});
```

No `emptyStringAsUndefined`. No `billing()`.

### `apps/web/env.ts` in full

```typescript
import { keys as email } from "@repo/email/keys";
import { keys as core } from "@repo/next-config/keys";
import { keys as observability } from "@repo/observability/keys";
import { createEnv } from "@t3-oss/env-nextjs";

export const env = createEnv({
  extends: [core(), email(), observability()],
  server: {},
  client: {},
  runtimeEnv: {},
});
```

No `emptyStringAsUndefined`. Its three modules do declare format-constrained
optional keys, so it is exposed to the same failure: `BETTERSTACK_URL` and
`NEXT_PUBLIC_SENTRY_DSN` are both `z.string().url().optional()`.

### `apps/app` genuinely uses billing

`apps/app/package.json` lists `"@repo/billing": "*"` in `dependencies`, and
`apps/app/app/(authenticated)/settings/billing/actions.ts` line 3:

```typescript
import { createCheckoutSession, createPortalSession } from "@repo/billing";
```

So the Stripe configuration is on a live code path in this app.

### `apps/app` does not use Inngest

```
grep -rn "@repo/jobs\|inngest" apps/app --include=*.ts --include=*.tsx --include=package.json
```

At commit `75202db` this returns nothing. **Do not add `jobs()` to
`apps/app/env.ts`.** Validating configuration an app never reads is noise, and
`packages/jobs/keys.ts` throws when only one of the two Inngest keys is set,
which would make an unrelated app fail to boot on a half-configured Inngest
environment.

## Commands you will need

All run from the repo root.

```
bun install                # run first if you hit "Cannot find module '@repo/observability/log'"
bun run check
bun run typecheck
bun run test
bun run build              # the only command that exercises env validation end to end
```

> If a test or typecheck fails with `Cannot find module
> '@repo/observability/log'`, that is a stale local `node_modules` symlink, not
> a repository defect. Run `bun install` once and retry.

`bun run build` is slow (several minutes) and writes to git-ignored `.next/`
directories. It is required here: `env.ts` is only evaluated during a build or
a boot, so `typecheck` alone proves nothing about this change.

## Scope

**In scope:**

- `apps/app/env.ts`
- `apps/web/env.ts`

**Explicitly out of scope:**

- `apps/api/env.ts`. Already correct.
- Any `packages/*/keys.ts`. Do not add `emptyStringAsUndefined` to individual
  key modules; the app-level setting covers the composed schema, and
  `packages/billing` already sets its own for its standalone consumers.
- Making any variable required. Every optional key stays optional; this plan
  changes how blank values are interpreted, not what is mandatory.
- Removing the `notifications()` extend from `apps/app/env.ts`. That is plan
  023.
- `CLAUDE.md`. The empty-string guidance there stays true and useful even after
  this change (it still applies to `.env` files generally); revising it is plan
  026's business.
- Any `.env.example`. That is plan 023.

## Git workflow

```
git checkout -b chore/harden-app-env-validation
```

Commit message:

```
chore(app,web): treat blank env vars as unset and validate billing keys
```

**Ordering with plan 023**: both plans edit `apps/app/env.ts`. Plan 023 removes
the `notifications()` import and extend; this plan adds `billing()` and one
option. They do not conflict semantically but they will conflict textually.
Land 023 first if both are queued. If this plan lands first, plan 023's
executor must re-read the file rather than applying its excerpt blindly.

Do not push or open a pull request unless the user asks.

## Steps

### Step 1: Establish the baseline

```
bun run check
bun run typecheck
bun run test
bun run build
```

**Expected**: all four exit 0. Record the test count.

If `bun run build` fails on the unmodified tree, go to STOP conditions: this
plan cannot be verified without a working build, and a pre-existing build break
is a separate finding (see plan 016, which adds a build step to CI precisely
because nothing currently catches this).

### Step 2: Reproduce the failure this plan prevents

This step proves the change does something. It is worth the two minutes.

Pick a format-constrained optional variable that `apps/app` validates.
`NEXT_PUBLIC_SENTRY_DSN` is `z.string().url().optional()` in
`packages/observability/keys.ts`. Run a build with it set to an empty string:

```
NEXT_PUBLIC_SENTRY_DSN="" bun run build
```

**Expected**: the build **fails** with a Zod validation error naming
`NEXT_PUBLIC_SENTRY_DSN` and complaining about an invalid URL, despite the
variable being optional.

That failure is the bug. Record the exact error text; you will confirm it is
gone in Step 5.

If the build *succeeds*, the environment is not reproducing the condition
(perhaps a shell or tooling layer is dropping the empty variable). Note it and
continue; the change is still correct, but say in your report that you could
not reproduce the failure locally.

### Step 3: Harden `apps/app/env.ts`

Edit `apps/app/env.ts`. Add the `billing()` import and extend, and the option.

Add to the imports, keeping them alphabetically ordered as the file already is:

```typescript
import { keys as billing } from "@repo/billing/keys";
```

Add `billing()` to the `extends` array. The array is currently ordered with
`auth()` first and the rest alphabetically; `apps/api/env.ts` places
`billing()` immediately after `auth()`. Match that:

```typescript
  extends: [
    auth(),
    billing(),
    analytics(),
    core(),
    database(),
    email(),
    feeds(),
    notifications(),
    observability(),
    xero(),
  ],
```

(If plan 023 has already landed, `notifications()` will be absent. Leave it
absent; do not re-add it.)

Add the option after `runtimeEnv`, with the same comment `apps/api/env.ts`
uses, so the two files read identically:

```typescript
  server: {},
  client: {},
  runtimeEnv: {},
  // A blank Vercel env var must behave as unset, otherwise the format
  // constraint rejects it even though the variable is optional.
  emptyStringAsUndefined: true,
});
```

**Do not add `jobs()`.** See "Current state" for why.

**Verify**:

```
bun run typecheck
grep -n "billing\|emptyStringAsUndefined" apps/app/env.ts
```

**Expected**: typecheck exits 0; the grep shows the import, the extend and the
option.

Then confirm the dependency edge already exists (it does, but check rather than
assume):

```
node -e "console.log(require('./apps/app/package.json').dependencies['@repo/billing'])"
```

**Expected**: `*`. If it prints `undefined`, go to STOP conditions rather than
adding a dependency.

### Step 4: Harden `apps/web/env.ts`

Edit `apps/web/env.ts`. Add only the option; `apps/web` uses neither billing
nor Xero nor Clerk, and its three extends are correct:

```typescript
export const env = createEnv({
  extends: [core(), email(), observability()],
  server: {},
  client: {},
  runtimeEnv: {},
  // A blank Vercel env var must behave as unset, otherwise the format
  // constraint rejects it even though the variable is optional.
  emptyStringAsUndefined: true,
});
```

**Verify**:

```
bun run typecheck
bun run check
```

**Expected**: both exit 0.

### Step 5: Confirm the failure is gone

Repeat Step 2's command:

```
NEXT_PUBLIC_SENTRY_DSN="" bun run build
```

**Expected**: the build now **succeeds**. The blank variable is treated as
unset and the optional schema accepts it.

If Step 2 could not reproduce the failure, this step proves nothing; say so
rather than claiming it as verification.

Also confirm a genuinely malformed value is still rejected, so the change did
not disable validation:

```
NEXT_PUBLIC_SENTRY_DSN="not-a-url" bun run build
```

**Expected**: the build **fails** with a URL validation error. This is the
important half of the verification: `emptyStringAsUndefined` must narrow the
accepted set to "absent or valid", not widen it to "anything".

### Step 6: Confirm billing keys are now validated in `apps/app`

```
STRIPE_SECRET_KEY="wrong_prefix" bun run build
```

**Expected**: the build **fails** with an error naming `STRIPE_SECRET_KEY` and
the `sk_` prefix constraint. Before Step 3, `apps/app` would have built happily
with this value and failed later at the Stripe call.

### Step 7: Full verification

```
bun run check
bun run typecheck
bun run test
bun run build
```

**Expected**: all four exit 0, with the same test count as the Step 1 baseline.

## Test plan

No unit tests. `env.ts` is evaluated by the Next.js build and boot, not by
Vitest, and mocking `@t3-oss/env-nextjs` to assert on a configuration option
would test the mock rather than the behaviour.

The real test plan is Steps 2, 5 and 6, which form a proper before/after:

| Command | Before | After |
|---|---|---|
| `NEXT_PUBLIC_SENTRY_DSN="" bun run build` | fails | succeeds |
| `NEXT_PUBLIC_SENTRY_DSN="not-a-url" bun run build` | fails | fails |
| `STRIPE_SECRET_KEY="wrong_prefix" bun run build` (apps/app) | succeeds | fails |

Run all three and record the outcomes in your report. The middle row is the one
that proves validation was tightened rather than loosened; do not skip it.

**Cleanup**: these commands set variables inline for a single invocation only.
Confirm nothing persisted:

```
git status --porcelain
```

**Expected**: only the two in-scope files appear.

## Done criteria

All of the following, verbatim:

1. `bun run check` exits 0.
2. `bun run typecheck` exits 0.
3. `bun run test` exits 0 with the Step 1 baseline test count.
4. `bun run build` exits 0.
5. `grep -c "emptyStringAsUndefined: true" apps/app/env.ts` prints `1`.
6. `grep -c "emptyStringAsUndefined: true" apps/web/env.ts` prints `1`.
7. `grep -c "billing()" apps/app/env.ts` prints `1`.
8. `grep -c "jobs()" apps/app/env.ts` prints `0`.
9. `NEXT_PUBLIC_SENTRY_DSN="not-a-url" bun run build` still fails.
10. `git diff --name-only` lists exactly `apps/app/env.ts` and
    `apps/web/env.ts`.

## STOP conditions

Stop and report back rather than improvising if any of these occur:

- **`bun run build` fails on the unmodified tree at Step 1.** Report the
  failing app and the error. This plan cannot be verified without a working
  build and fixing an unrelated build break is out of scope.
- **`apps/app/package.json` does not depend on `@repo/billing`.** Adding a
  workspace dependency edge is a larger decision than this plan makes. Report
  it.
- **Adding `billing()` causes the build to fail** with a Stripe-related
  validation error on your machine. That means your local environment has a
  malformed Stripe value. Do not weaken the schema and do not read the value.
  Report the variable name and the constraint it violated, nothing more.
- **`NEXT_PUBLIC_SENTRY_DSN="not-a-url" bun run build` succeeds after the
  change** (Step 5). That would mean `emptyStringAsUndefined` is disabling
  validation rather than normalising blanks, which is not what it does and
  would indicate a version mismatch in `@t3-oss/env-nextjs`. Report the
  installed version from `apps/app/package.json` and stop.
- **You find that `apps/app` does import `@repo/jobs` after all.** Re-run the
  grep from "Current state". If it now returns hits, adding `jobs()` may be
  correct, but the both-or-neither Inngest constraint makes it a judgement
  call. Report and let the user decide.

## Maintenance notes

- **All three apps now share one shape**: `extends` the modules they actually
  use, plus `emptyStringAsUndefined: true` with the same comment. A new app, or
  a new `keys.ts` consumer, should copy that shape. In review, an `env.ts`
  without the option is a defect waiting for a blank Vercel variable.
- **`extends` should mirror `dependencies`.** The `billing()` gap existed
  because the two drifted: `apps/app` gained a `@repo/billing` dependency
  without gaining the corresponding extend. A useful review check is: for each
  `@repo/*` dependency that ships a `keys.ts`, does the app's `env.ts` extend
  it? The exception is deliberate omission, as with `jobs()` here, which should
  carry a comment saying so if it ever becomes non-obvious.
- **The `packages/jobs` both-or-neither throw is a landmine for `extends`.**
  `packages/jobs/keys.ts` throws outright when exactly one Inngest key is set.
  Any app that extends `jobs()` inherits that failure mode for its entire boot,
  whether or not it runs jobs. Only `apps/api` should extend it.
- **`emptyStringAsUndefined` does not make anything optional.** It normalises
  `""` to `undefined` before validation. A required variable set to `""` still
  fails, correctly, and `DATABASE_URL` and `XERO_TOKEN_ENCRYPTION_KEY` are both
  required. That is the behaviour Step 5's second command pins.
- **Related plans**: 023 edits the same `apps/app/env.ts` (removing the
  `notifications()` extend) and rewrites the `.env.example` files, whose
  commented-out-versus-empty-string convention exists because of the very
  problem this plan fixes. After both land, the `.env.example` convention is
  belt and braces rather than load-bearing, but keep it: it still documents
  intent.
