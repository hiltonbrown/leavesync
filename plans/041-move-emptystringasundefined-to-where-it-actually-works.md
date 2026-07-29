# Plan 041: Move `emptyStringAsUndefined` to the package level, where it actually protects anything

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report, do not improvise. When done, update this plan's status row in
> `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 6ab940c..HEAD -- packages/auth/keys.ts packages/analytics/keys.ts packages/next-config/keys.ts packages/email/keys.ts packages/feeds/keys.ts packages/jobs/keys.ts packages/observability/keys.ts packages/xero/keys.ts packages/billing/keys.ts apps/api/lib/github/keys.ts apps/app/env.ts apps/web/env.ts apps/api/env.ts`
> If any changed since this plan was written, re-check the "Current state"
> facts before proceeding.
>
> **Secrets rule for this plan**: never copy a value out of `.env.local`, out
> of a deployment environment, or out of any running process into a tracked
> file or into your report. If you encounter a credential, reference the file
> and line and the credential type only, and recommend rotation. **Do not
> `cat`, `echo`, or otherwise print the full contents of any `.env.local` file
> in a command whose output you will read** — check for a variable's
> *presence* with `grep -c VARNAME file 2>/dev/null || echo 0`, never dump the
> file. A prior session on this exact plan accidentally surfaced real
> `DATABASE_URL` and `XERO_TOKEN_ENCRYPTION_KEY` values this way; don't repeat
> it.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: plan 040 (fixes an unrelated `bun run build` break that
  would otherwise block Step 1's baseline). **Supersedes plan 024**, which
  attempted this fix at the wrong layer and does not work — see "Why this
  matters."
- **Category**: bug
- **Planned at**: commit `6ab940c`, 2026-07-26

## Why this matters

Plan 024 set out to add `emptyStringAsUndefined: true` to `apps/app/env.ts`
and `apps/web/env.ts`, on the premise that this would make blank Vercel
environment variables behave as unset instead of failing Zod's format
constraints (a `z.string().url().optional()` accepts `undefined` but rejects
`""`). That premise is false, and an executor session proved it empirically
before stopping rather than committing a fix that doesn't fix anything.

The root cause is in `@t3-oss/env-core`'s `createEnv()` itself
(`node_modules/.../@t3-oss/env-core/dist/index.js`):

```js
function createEnv(opts) {
	const runtimeEnv = opts.runtimeEnvStrict ?? opts.runtimeEnv ?? process.env;
	if (opts.emptyStringAsUndefined ?? false) {
		for (const [key, value] of Object.entries(runtimeEnv)) if (value === "") delete runtimeEnv[key];
	}
	// ... validates finalSchemaShape against runtimeEnv ...
	const extendedObj = (opts.extends ?? []).reduce((acc, curr) => Object.assign(acc, curr), {});
	const fullObj = Object.assign(extendedObj, parsed.value);
	// ...
}
```

`emptyStringAsUndefined` only normalises **that call's own** `runtimeEnv`
object. `opts.extends` is an array of already-constructed values — in
JavaScript, `[auth(), billing(), analytics(), ...]` is evaluated to build the
array *before* `createEnv({ extends: [...], emptyStringAsUndefined: true })`
is even called, because argument expressions evaluate before the function
they're passed to runs. Each entry in that array (`auth()`, `analytics()`,
etc.) is itself a separate, already-completed `createEnv()` call — it has
already validated its own fields and thrown if any failed, using **its own**
`emptyStringAsUndefined` setting (which is `false`/unset for every package
except `packages/billing`). By the time the outer call's body executes, the
extended packages have already succeeded or already thrown.

So today, exactly one field in this entire codebase is actually protected by
`emptyStringAsUndefined`: `STRIPE_WEBHOOK_SECRET`, declared inline in
`apps/api/env.ts`, which is the one field that isn't sourced through
`extends`. Every other format-constrained optional variable — across every
package, in all three apps — still crashes the build or boot on a blank
Vercel value, exactly as before plan 024. `apps/api/env.ts`, which plan 024
cited as "the correct exemplar" specifically because it already has this
option, does not actually protect any of the ~20 format-constrained optional
fields it pulls in via `extends` (`auth()`, `analytics()`, `observability()`,
`xero()`, `github()`). Only `packages/billing/keys.ts` is genuinely safe
today, because it sets the option **on itself**, inside its own `createEnv()`
call, where it can actually see its own fields' raw values before they're
validated.

There's a second, independent manifestation of the same gap:
`packages/observability/next-config.ts` calls `keys()` directly at module
load time (`org: keys().SENTRY_ORG`), and is imported by all three apps'
`next.config.ts` files. This path never goes through any app's `env.ts` at
all, so no amount of app-level `extends` configuration can ever reach it —
fixing `packages/observability/keys.ts` itself is the only way to protect
this path too, and doing so fixes both call sites at once, since they share
the same `keys()` factory.

The fix is mechanical but has to happen in nine places: every package whose
`keys.ts` declares a format-constrained optional field must set
`emptyStringAsUndefined: true` on its own `createEnv()` call, the same way
`packages/billing/keys.ts` already does.

## Current state

### The only currently-safe exemplar: `packages/billing/keys.ts`

```typescript
export const keys = () =>
  createEnv({
    server: {
      STRIPE_CHECKOUT_CANCEL_URL: z.string().url().optional(),
      STRIPE_CHECKOUT_SUCCESS_URL: z.string().url().optional(),
      STRIPE_PORTAL_RETURN_URL: z.string().url().optional(),
      STRIPE_PRICE_BASIC: z.string().optional(),
      STRIPE_PRICE_PREMIUM: z.string().optional(),
      STRIPE_SECRET_KEY: z.string().startsWith("sk_").optional(),
    },
    runtimeEnv: { /* ... */ },
    // Treat an empty string (e.g. a blank Vercel env var) as unset so the
    // format-constrained optional keys do not fail validation when billing is
    // not configured for an environment.
    emptyStringAsUndefined: true,
  });
```

Match this shape (including the comment) in every file below.

### Every other extended package, and what's currently unprotected in it

| File | Format-constrained optional fields (currently vulnerable) | Fields that are already safe (bare `z.string().optional()`, no format) |
|---|---|---|
| `packages/auth/keys.ts` | `CLERK_SECRET_KEY` (`startsWith("sk_")`), `CLERK_WEBHOOK_SECRET` (`startsWith("whsec_")`), `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (`startsWith("pk_")`), `NEXT_PUBLIC_CLERK_SIGN_IN_URL`/`SIGN_UP_URL`/`AFTER_SIGN_IN_URL`/`AFTER_SIGN_UP_URL` (all `startsWith("/")`) | none |
| `packages/analytics/keys.ts` | `NEXT_PUBLIC_POSTHOG_KEY` (`startsWith("phc_")`), `NEXT_PUBLIC_POSTHOG_HOST` (`url()`), `NEXT_PUBLIC_GA_MEASUREMENT_ID` (`startsWith("G-")`) | none |
| `packages/next-config/keys.ts` | `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_WEB_URL`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_DOCS_URL` (all `url()`), `VERCEL_ENV` (`z.enum(...)`) | `ANALYZE`, `NEXT_RUNTIME`, `VERCEL`, `VERCEL_URL`, `VERCEL_REGION`, `VERCEL_PROJECT_PRODUCTION_URL` |
| `packages/email/keys.ts` | `RESEND_FROM` (`email()`), `RESEND_TOKEN` (`startsWith("re_")`) | none |
| `packages/feeds/keys.ts` | `KV_REST_API_URL` (`url()`), `KV_REST_API_TOKEN` (`min(1)`) | none |
| `packages/jobs/keys.ts` | `INNGEST_EVENT_KEY` (`min(1)`), `INNGEST_SIGNING_KEY` (`startsWith("signkey-")`), `INNGEST_DEV` (enum-or-url union) | none |
| `packages/observability/keys.ts` | `BETTERSTACK_URL` (`url()`), `NEXT_PUBLIC_SENTRY_DSN` (`url()`) | `BETTERSTACK_API_KEY`, `SENTRY_ORG`, `SENTRY_PROJECT` |
| `packages/xero/keys.ts` | `XERO_API_BASE_URL`, `XERO_REDIRECT_URI` (both `url()`) | `XERO_CLIENT_ID`, `XERO_CLIENT_SECRET`. (`XERO_TOKEN_ENCRYPTION_KEY` is **required**, not optional — see "Scope" note below, it needs no behaviour change.) |
| `apps/api/lib/github/keys.ts` | `GITHUB_OWNER`, `GITHUB_REPO`, `GITHUB_TOKEN` (all `min(1)`) | none |

None of these nine files currently set `emptyStringAsUndefined`. Confirm this
before starting:

```
grep -L "emptyStringAsUndefined" packages/auth/keys.ts packages/analytics/keys.ts packages/next-config/keys.ts packages/email/keys.ts packages/feeds/keys.ts packages/jobs/keys.ts packages/observability/keys.ts packages/xero/keys.ts apps/api/lib/github/keys.ts
```

**Expected**: all nine paths printed (meaning none currently contain the
string).

### `packages/feeds/keys.ts` and `packages/jobs/keys.ts` have their own both-or-neither checks — these are unaffected and stay as-is

Both files, after calling `createEnv(...)`, run a manual check reading
**raw** `process.env` (not the validated proxy) to enforce "both keys set or
neither":

```typescript
// packages/feeds/keys.ts, after the createEnv(...) call
if (typeof window === "undefined") {
  const hasUrl = Boolean(process.env.KV_REST_API_URL);
  const hasToken = Boolean(process.env.KV_REST_API_TOKEN);
  if (hasUrl !== hasToken) {
    throw new Error(/* ... */);
  }
}
```

`emptyStringAsUndefined` only mutates the local `runtimeEnv` object built
inside that same `createEnv()` call; it never touches the real
`process.env`. So adding the option to these two files changes nothing about
this check's behaviour — `Boolean("")` is already `false`, so an empty string
was already correctly treated as "not configured" here. Do not touch this
logic; only add the one option next to it.

### `packages/xero/keys.ts` also self-invokes at module load — leave that alone too

```typescript
// Validate immediately on module load to prevent boot if invalid or missing
if (process.env.NODE_ENV !== "test") {
  keys();
}
```

This just calls the same `keys()` factory you're editing; once you add
`emptyStringAsUndefined` inside it, this call benefits automatically. Do not
change this block.

### `packages/observability/next-config.ts` — a second call site, fixed for free

```typescript
export const sentryConfig: Parameters<typeof withSentryConfig>[1] = {
  org: keys().SENTRY_ORG,
  project: keys().SENTRY_PROJECT,
  // ...
};
```

Imported by `apps/api/next.config.ts`, `apps/web/next.config.ts`, and
`apps/app/next.config.ts`. This calls the exact same `keys()` factory in
`packages/observability/keys.ts`. Fixing that one file fixes this path too;
you do not need to (and should not) touch `next-config.ts`.

### The two files plan 024 already edited, still correct and still needed

Plan 024's executor got as far as editing `apps/app/env.ts` (adding the
`billing()` import/extend, since `apps/app/package.json` depends on
`@repo/billing` and calls it from
`app/(authenticated)/settings/billing/actions.ts`, but `apps/app/env.ts`
never validated its Stripe config) and `apps/web/env.ts` (adding
`emptyStringAsUndefined: true`), then stopped before committing once the
deeper problem surfaced. Those two edits are correct and should be included
here as belt-and-braces (they protect any field either app ever declares
directly in its own `server`/`client`, and match the shape `apps/api/env.ts`
already has) — they were never the actual fix, just not wrong either. If a
worktree for this plan already has these two files edited from a prior
session (uncommitted), verify the diff matches Step 8 below rather than
reapplying blind.

## Commands you will need

All run from the repo root.

```
bun install                # run first if you hit "Cannot find module '@repo/observability/log'"
bun run check
bun run typecheck
bun run test
bun run build              # required: env.ts/keys.ts are only evaluated during a build or boot
```

`bun run build` is slow (several minutes). The turbo build cache is shared
across git worktrees on this machine; if you override an env var inline for a
single command and turbo serves a stale cached result instead of actually
re-running, add `--force`, e.g. `bunx turbo build --filter=app --force`.

## Scope

**In scope:**

- `packages/auth/keys.ts`
- `packages/analytics/keys.ts`
- `packages/next-config/keys.ts`
- `packages/email/keys.ts`
- `packages/feeds/keys.ts`
- `packages/jobs/keys.ts`
- `packages/observability/keys.ts`
- `packages/xero/keys.ts`
- `apps/api/lib/github/keys.ts`
- `apps/app/env.ts` (add `billing()` import/extend and `emptyStringAsUndefined: true`)
- `apps/web/env.ts` (add `emptyStringAsUndefined: true`)

**Explicitly out of scope:**

- `packages/billing/keys.ts`. Already correct, already the exemplar. Do not
  touch.
- `apps/api/env.ts`. Already has `emptyStringAsUndefined: true` for its own
  inline `STRIPE_WEBHOOK_SECRET` field; no change needed there. (It benefits
  automatically once its extended packages are fixed here.)
- `packages/database/keys.ts`. `DATABASE_URL` is required, not optional.
  Making a required field accept `""` would be wrong; leave it exactly as is.
- `packages/xero/keys.ts`'s `XERO_TOKEN_ENCRYPTION_KEY` field itself. It is
  required (not optional) and enforced via `.refine()`, not a bare format
  check. `emptyStringAsUndefined` normalises `""` to `undefined` *before*
  validation, and `undefined` still fails a required field, correctly, so
  adding the module-level option changes nothing about this field's
  behaviour — you're only adding the option once at the top of the
  `createEnv()` call in this file for the two genuinely-optional fields.
- The both-or-neither manual checks in `packages/feeds/keys.ts` and
  `packages/jobs/keys.ts`. Do not modify them; see "Current state" for why
  they're already correct as-is.
- `packages/observability/next-config.ts`. Do not touch; it's fixed for free
  once `packages/observability/keys.ts` is fixed.
- `CLAUDE.md`. Its empty-string guidance stays true and useful (it still
  documents the underlying Zod behaviour, which this plan works around, not
  eliminates); revising it is plan 026's business, if at all.
- Any `.env.example`. That was plan 023's business, already done.
- Making any field required, or changing what's optional. This plan changes
  how blank values are interpreted, not what is mandatory.

## Git workflow

```
git checkout -b fix/empty-string-env-vars-at-the-source
```

Commit message:

```
fix(env): move emptyStringAsUndefined to every package's own keys.ts

Only packages/billing/keys.ts set emptyStringAsUndefined on itself; every
other package's optional format-constrained fields (Clerk keys, Resend,
Vercel KV, Sentry/BetterStack, Xero URLs, GitHub, analytics, and the
NEXT_PUBLIC_*_URL family) were still rejected by a blank Vercel env var,
because createEnv's extends array is fully evaluated, and each extended
package's own createEnv() call already validated and returned, before the
outer call's emptyStringAsUndefined option ever runs. Setting the option on
each package's own createEnv() call is the only place it can take effect.
```

Do not push or open a pull request unless the user asks.

## Steps

### Step 1: Establish the baseline

```
bun run check
bun run typecheck
bun run test
bun run build
```

**Expected**: all four exit 0. Record the test count. If `bun run build`
fails here, confirm plan 040 has actually landed in your branch's history
(`git log --oneline | grep -i vercel-env-guard`); if it's missing, merge it in
the same way described in plan 040's own "Git workflow", then retry this
step. If it still fails after confirming plan 040 is present, go to STOP
conditions.

### Step 2: Reproduce the failure, cleanly this time

Plan 024's executor found that testing via `NEXT_PUBLIC_SENTRY_DSN` is
contaminated by the `next-config.ts` direct-call path described above (it
fails the same way regardless of any `env.ts` change, for a reason unrelated
to whichever file you're actively editing). Use `CLERK_SECRET_KEY` instead —
it has exactly one path into the codebase, `packages/auth/keys.ts`, consumed
only via `extends` in `apps/app/env.ts` and `apps/api/env.ts`:

```
CLERK_SECRET_KEY="" bunx turbo build --filter=app --force
```

**Expected**: fails with a Zod error naming `CLERK_SECRET_KEY` ("Invalid
string: must start with sk_"), despite the field being optional. Record the
exact error text.

### Step 3: Fix each package's `keys.ts`

For each of the nine files listed in Scope, add `emptyStringAsUndefined:
true` as the last property of the `createEnv({...})` call, with the same
comment `packages/billing/keys.ts` uses (adapted to name the right package if
you want, but copying it verbatim is fine — the intent is identical
everywhere):

```typescript
    // Treat an empty string (e.g. a blank Vercel env var) as unset so the
    // format-constrained optional keys do not fail validation.
    emptyStringAsUndefined: true,
```

For `packages/feeds/keys.ts` and `packages/jobs/keys.ts`, whose `keys()`
factories wrap the `createEnv()` call in a function body (not a direct arrow
return), add the option inside that inner `createEnv({...})` call, not
anywhere near the manual both-or-neither check that follows it.

Do this one file at a time and run:

```
bun run typecheck
```

after each, so a mistake in one file is caught before you move to the next.

**Verify, after all nine are done**:

```
grep -Lc "emptyStringAsUndefined" packages/auth/keys.ts packages/analytics/keys.ts packages/next-config/keys.ts packages/email/keys.ts packages/feeds/keys.ts packages/jobs/keys.ts packages/observability/keys.ts packages/xero/keys.ts apps/api/lib/github/keys.ts
```

**Expected**: no output (every file now contains the string, so `-L`, which
lists files *without* a match, finds none).

### Step 4: Confirm the failure from Step 2 is gone

```
CLERK_SECRET_KEY="" bunx turbo build --filter=app --force
```

**Expected**: succeeds.

Also confirm a genuinely malformed value is still rejected, so this didn't
disable validation:

```
CLERK_SECRET_KEY="not-sk-prefixed" bunx turbo build --filter=app --force
```

**Expected**: fails with the same `startsWith("sk_")` error as before. This
is the important half: the fix must narrow acceptance to "absent or valid",
not widen it to "anything".

### Step 5: Confirm the `next-config.ts` path is fixed too

```
NEXT_PUBLIC_SENTRY_DSN="" BETTERSTACK_URL="" bunx turbo build --filter=web --force
```

**Expected**: succeeds. Before Step 3, this failed regardless of what
`apps/web/env.ts` looked like, because `next-config.ts` calls
`packages/observability/keys.ts`'s `keys()` directly. If it still fails,
`packages/observability/keys.ts`'s edit did not take effect; go to STOP
conditions.

### Step 6: Add the `billing()` extend and app-level option to `apps/app/env.ts`

Add the import (keep the existing alphabetical order):

```typescript
import { keys as billing } from "@repo/billing/keys";
```

Add `billing()` to `extends`, placed immediately after `auth()` (matching
`apps/api/env.ts`'s ordering):

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

(If a prior session already removed `notifications()` here as part of plan
023's unmerged branch, leave it absent — do not re-add it. Re-read the file
rather than assuming its current shape.)

Add the option after `runtimeEnv`:

```typescript
  server: {},
  client: {},
  runtimeEnv: {},
  // Belt-and-braces: protects any field this app's own env.ts ever declares
  // directly. The fields that matter today all come through `extends`, and
  // are protected at the package level (see the nine files above).
  emptyStringAsUndefined: true,
});
```

**Do not add `jobs()`.** `apps/app` does not import `@repo/jobs` or Inngest
(`grep -rn "@repo/jobs\|inngest" apps/app --include=*.ts --include=*.tsx
--include=package.json` returns nothing); adding it would make this app
inherit `packages/jobs/keys.ts`'s both-or-neither throw for an integration it
never uses.

**Verify**:

```
bun run typecheck
node -e "console.log(require('./apps/app/package.json').dependencies['@repo/billing'])"
```

**Expected**: typecheck exits 0; the `node -e` prints `*` (confirming the
dependency edge already exists — if it prints `undefined`, go to STOP
conditions rather than adding a workspace dependency as part of this plan).

### Step 7: Add the app-level option to `apps/web/env.ts`

```typescript
export const env = createEnv({
  extends: [core(), email(), observability()],
  server: {},
  client: {},
  runtimeEnv: {},
  // Belt-and-braces: protects any field this app's own env.ts ever declares
  // directly. The fields that matter today all come through `extends`, and
  // are protected at the package level (see the nine files above).
  emptyStringAsUndefined: true,
});
```

**Verify**:

```
bun run typecheck
bun run check
```

**Expected**: both exit 0.

### Step 8: Confirm the STRIPE_SECRET_KEY gap plan 024 identified is now closed

```
STRIPE_SECRET_KEY="wrong_prefix" bunx turbo build --filter=app --force
```

**Expected**: fails, naming `STRIPE_SECRET_KEY` and the `sk_` prefix
constraint. Before Step 6, `apps/app` built happily with this value and would
have failed later at the Stripe SDK call instead.

### Step 9: Full verification

```
bun run check
bun run typecheck
bun run test
bun run build
```

**Expected**: all four exit 0, with the same test count as the Step 1
baseline.

## Test plan

No unit tests. Every field here is evaluated by `@t3-oss/env-nextjs` during a
Next.js build or boot, not by Vitest, and mocking `createEnv` to assert on a
configuration option would test the mock rather than the real composition
behaviour that caused this bug (which only manifests through the real
`extends` mechanism).

The real test plan is Steps 2/4 (the clean before/after on `CLERK_SECRET_KEY`),
5 (the independent `next-config.ts` path), and 8 (the `STRIPE_SECRET_KEY`
gap from plan 024). Record all four outcomes:

| Command | Before this plan | After this plan |
|---|---|---|
| `CLERK_SECRET_KEY="" bunx turbo build --filter=app --force` | fails | succeeds |
| `CLERK_SECRET_KEY="not-sk-prefixed" bunx turbo build --filter=app --force` | fails | fails |
| `NEXT_PUBLIC_SENTRY_DSN="" BETTERSTACK_URL="" bunx turbo build --filter=web --force` | fails | succeeds |
| `STRIPE_SECRET_KEY="wrong_prefix" bunx turbo build --filter=app --force` | succeeds | fails |

**Cleanup**: these are single-invocation inline env overrides. Confirm
nothing persisted: `git status --porcelain` should show only the eleven
in-scope files.

## Done criteria

All of the following, verbatim:

1. `bun run check` exits 0.
2. `bun run typecheck` exits 0.
3. `bun run test` exits 0 with the Step 1 baseline test count.
4. `bun run build` exits 0.
5. `grep -Lc "emptyStringAsUndefined" packages/auth/keys.ts packages/analytics/keys.ts packages/next-config/keys.ts packages/email/keys.ts packages/feeds/keys.ts packages/jobs/keys.ts packages/observability/keys.ts packages/xero/keys.ts apps/api/lib/github/keys.ts` prints nothing (all nine now contain it).
6. `grep -c "emptyStringAsUndefined: true" apps/app/env.ts` prints `1`.
7. `grep -c "emptyStringAsUndefined: true" apps/web/env.ts` prints `1`.
8. `grep -c "billing()" apps/app/env.ts` prints `1`.
9. `grep -c "jobs()" apps/app/env.ts` prints `0`.
10. All four rows of the Test plan table produce the "after" outcome shown.
11. `git diff --name-only` lists exactly the eleven in-scope files.

## STOP conditions

Stop and report back rather than improvising if any of these occur:

- **`bun run build` fails at Step 1 even with plan 040 merged in.** Report the
  failing app and the exact error.
- **Step 4 or Step 5's "after" build still fails with the same error.** That
  would mean the edit didn't take effect somewhere, or there's a third,
  still-undiscovered call path. Report which command failed and the exact
  error; do not add more `emptyStringAsUndefined` options speculatively
  looking for a fourth place to put one — find the actual path first, the way
  this plan traced `next-config.ts`.
- **`apps/app/package.json` does not depend on `@repo/billing`.** Report it;
  do not add the workspace dependency yourself.
- **A genuinely malformed value (Step 4's second command, or Step 8) stops
  failing after the fix.** That means `emptyStringAsUndefined` is disabling
  validation rather than normalising blanks — not what it does, and would
  indicate a version mismatch in `@t3-oss/env-core`. Report the installed
  version (`bun pm ls @t3-oss/env-core` or check `bun.lock`) and stop.
- **You find a tenth place where a `keys()` factory or its fields are
  consumed directly**, the way `next-config.ts` consumes observability's.
  Report the location; do not fix it without understanding whether it needs
  the same treatment or something different.

## Maintenance notes

- **The rule going forward**: `emptyStringAsUndefined` must be set on the
  `createEnv()` call that owns the field, not on whatever app happens to
  `extends` it. Any new `packages/*/keys.ts` with a format-constrained
  optional field should set it on itself, following
  `packages/billing/keys.ts`'s shape, from day one.
- **The app-level `emptyStringAsUndefined` in `apps/app/env.ts`,
  `apps/web/env.ts`, and `apps/api/env.ts` is not wrong, just narrow.** It
  protects only fields that app declares directly in its own `server`/
  `client` (today, only `STRIPE_WEBHOOK_SECRET` in `apps/api/env.ts`). Keep it
  as a default for any field added directly to an app's `env.ts` in future,
  but never rely on it to protect an `extends`-sourced field.
- **This finding likely explains any past "works locally, breaks on Vercel"
  reports involving a blank optional variable** in any of the nine packages
  touched here, prior to this plan landing. It was not specific to
  `apps/app`/`apps/web`; `apps/api` had the identical gap for everything
  except its one inline field, despite looking correct.
- **Plan 024 is superseded by this plan.** Its `billing()`-extend insight was
  correct and is folded in here (Step 6); its `emptyStringAsUndefined`
  framing was not, for the reason explained in "Why this matters."
