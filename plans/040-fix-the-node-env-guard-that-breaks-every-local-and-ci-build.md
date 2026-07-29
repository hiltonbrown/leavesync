# Plan 040: Fix the `NODE_ENV` guard that breaks every local and CI build of `apps/web`

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report, do not improvise. When done, update this plan's status row in
> `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 887665f..HEAD -- apps/web/src/lib/auth-links.ts packages/next-config/keys.ts apps/web/env.ts`
> If any changed since this plan was written, re-check the "Current state"
> facts before proceeding.
>
> **Secrets rule for this plan**: `NEXT_PUBLIC_APP_URL` and `VERCEL_ENV` are
> public, non-secret configuration values. Nothing in this plan involves a
> credential. If you encounter one anyway in an unrelated file, do not
> reproduce it; reference the file, line and credential type and recommend
> rotation.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none. **Unblocks**: plan 024 (blocked on this), plan 033
  (blocked on this), and plan 016 (adds a CI build step that would otherwise
  be permanently red).
- **Category**: bug
- **Planned at**: commit `887665f`, 2026-07-26

## Why this matters

`bun run build` currently fails on every machine that has not manually
overridden `NEXT_PUBLIC_APP_URL` to a real domain, because
`apps/web/src/lib/auth-links.ts` throws during Next.js's page-data-collection
phase. Two separate advisor sessions have independently hit this and recorded
it as a blocker: plan 024's Step 1 baseline and plan 033's Step 1 baseline
both stopped here, each logging the identical error against `web#build`. No
plan that requires a working `bun run build` can proceed until this is fixed,
and plan 016 (adding a build step to CI) would fail on its first run for the
same reason.

The bug is a confusion between two different signals. The guard checks
`process.env.NODE_ENV === "production"` and treats that as "this is a genuine
production deployment with a public domain." But `NODE_ENV` is `"production"`
for **every** `next build` invocation — local, CI, preview, and real
production alike. That is standard Next.js behaviour, not a Vercel-specific
signal. The variable that actually distinguishes a genuine production
deployment is `VERCEL_ENV`, which Vercel sets to exactly one of
`"development" | "preview" | "production"` and which is unset entirely off
Vercel. `packages/next-config/keys.ts` already validates it and the comment
there (`// Vercel environment variables`) marks it as the intended tool for
this job.

## Current state

### The defect, in full: `apps/web/src/lib/auth-links.ts`

```typescript
import { env } from "@/env";

const PRODUCTION_APP_ORIGIN = "https://app.teamcalendar.online";
const LOCAL_APP_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);

const resolveAppOrigin = (): string => {
  const configuredUrl = env.NEXT_PUBLIC_APP_URL ?? PRODUCTION_APP_ORIGIN;
  const appUrl = new URL(configuredUrl);

  if (
    process.env.NODE_ENV === "production" &&
    LOCAL_APP_HOSTS.has(appUrl.hostname)
  ) {
    throw new Error(
      "NEXT_PUBLIC_APP_URL must point to the Team Calendar app domain in production."
    );
  }

  return appUrl.origin;
};

const appOrigin = resolveAppOrigin();

export const signInHref = `${appOrigin}/sign-in`;
export const signUpHref = `${appOrigin}/sign-up`;
```

Line 22 (`const appOrigin = resolveAppOrigin();`) runs at module import time.
Any page that transitively imports this module trips the guard during
`next build`'s page-data-collection step, not just at request time. That is
why the build fails on a static page (`/terms-of-service`) rather than at
request handling.

### The exact failure, reproduced

```
web:build: Error: Failed to collect page data for /terms-of-service
[cause]: Error: NEXT_PUBLIC_APP_URL must point to the Team Calendar app domain in production.
```

This happens with a completely ordinary local-dev `.env.local` value
(`NEXT_PUBLIC_APP_URL="http://localhost:3000"`), because `next build` sets
`NODE_ENV=production` regardless of who is running it or where.

### The correct signal already exists and is already imported

`packages/next-config/keys.ts` (unchanged by this plan, shown for reference):

```typescript
export const keys = () =>
  createEnv({
    server: {
      ANALYZE: z.string().optional(),
      NEXT_RUNTIME: z.enum(["nodejs", "edge"]).optional(),
      // Vercel environment variables
      VERCEL: z.string().optional(),
      VERCEL_ENV: z.enum(["development", "preview", "production"]).optional(),
      VERCEL_URL: z.string().optional(),
      VERCEL_REGION: z.string().optional(),
      VERCEL_PROJECT_PRODUCTION_URL: z.string().optional(),
    },
    client: { /* ... NEXT_PUBLIC_APP_URL and others ... */ },
    runtimeEnv: { /* ... */ },
  });
```

`apps/web/env.ts` (unchanged by this plan, shown for reference) extends
`core()`, which is this module:

```typescript
export const env = createEnv({
  extends: [core(), email(), observability()],
  server: {},
  client: {},
  runtimeEnv: {},
});
```

So `env.VERCEL_ENV` is already available through the exact `env` object
`auth-links.ts` already imports from `@/env` on line 1. No new import, no new
validated key, no new dependency.

### Confirm this is the only occurrence of the pattern

```
grep -rn "LOCAL_APP_HOSTS\|must point to the Team Calendar app domain\|NODE_ENV === \"production\"" apps packages --include=*.ts --include=*.tsx 2>/dev/null | grep -v node_modules
```

At commit `887665f` this returns four lines, all inside
`apps/web/src/lib/auth-links.ts`, plus one unrelated hit in
`packages/observability/log.ts` (`process.env.NODE_ENV === "production" ?
logtail : console`) which is a logger-selection switch, not a build-breaking
guard, and is explicitly out of scope (see Scope).

### Consumers of this module

```
grep -rln "auth-links" apps/web --include=*.ts --include=*.tsx
```

Five files import `signInHref` / `signUpHref` as plain string constants:
`app/features/components/hero-section.tsx`,
`app/features/components/final-cta-section.tsx`,
`app/features/components/interactive-hero.tsx`,
`app/components/footer.tsx`, `app/components/header/index.tsx`. None of them
need to change; the public shape of the module (two exported string
constants) stays identical.

### No existing test file

`apps/web/src/lib/auth-links.test.ts` does not exist. This repo's convention
for testing module-level, env-dependent code that computes a value at import
time is `vi.mock("@/env", () => ({ env: {...} }))` combined with a top-level
`await import(...)` — see `apps/api/app/webhooks/auth/route.test.ts` lines
1-53 for the exemplar. Because `resolveAppOrigin()` runs once at import, each
scenario in the new test needs its own module registry: use
`vi.resetModules()` and a fresh dynamic `import("./auth-links")` per test,
with `vi.doMock("@/env", ...)` set immediately before each import.

## Commands you will need

All run from the repo root.

```
bun install                # run first if you hit "Cannot find module '@repo/observability/log'"
bun run check
bun run typecheck
bun run test
bun run build              # required: the bug only manifests during a build
bunx turbo build --filter=web   # scoped reproduction, faster than the full build
```

## Scope

**In scope:**

- `apps/web/src/lib/auth-links.ts`
- `apps/web/src/lib/auth-links.test.ts` (create)

**Explicitly out of scope:**

- `packages/observability/log.ts`. Its `NODE_ENV` check selects a logger, it
  does not throw or break a build. Different concern, do not touch.
- `packages/next-config/keys.ts` and `apps/web/env.ts`. Both already expose
  `VERCEL_ENV` correctly; this plan only changes how `auth-links.ts` reads it.
- Plans 024 and 033 themselves. This plan removes the obstacle that blocked
  their Step 1 baselines; re-running those plans is a separate action, not
  part of this one.
- Any change to `PRODUCTION_APP_ORIGIN` or to what counts as a "local" host.
  The list of local hostnames and the fallback production origin are correct
  today; only the environment-detection condition is wrong.
- Introducing any new required environment variable.

## Git workflow

```
git checkout -b fix/web-build-vercel-env-guard
```

Commit message:

```
fix(web): use VERCEL_ENV instead of NODE_ENV to guard the production app URL
```

Do not push or open a pull request unless the user asks.

## Steps

### Step 1: Establish the baseline and reproduce the failure

```
bun run check
bun run typecheck
bun run test
bunx turbo build --filter=web
```

**Expected**: `check`, `typecheck`, `test` all exit 0. `turbo build
--filter=web` **fails** with the exact error quoted in "Current state"
(`NEXT_PUBLIC_APP_URL must point to the Team Calendar app domain in
production`, from `/terms-of-service`). This confirms you are looking at the
live bug, not a stale description.

If `check`, `typecheck`, or `test` fail, or if the build fails with a
*different* error than the one quoted above, go to STOP conditions: something
else has drifted since this plan was written.

### Step 2: Fix the guard

Edit `apps/web/src/lib/auth-links.ts`. Change only the condition inside
`resolveAppOrigin`. Before:

```typescript
  if (
    process.env.NODE_ENV === "production" &&
    LOCAL_APP_HOSTS.has(appUrl.hostname)
  ) {
```

After:

```typescript
  if (
    env.VERCEL_ENV === "production" &&
    LOCAL_APP_HOSTS.has(appUrl.hostname)
  ) {
```

Nothing else in the file changes: not the imports (the `env` import already
exists), not `PRODUCTION_APP_ORIGIN`, not `LOCAL_APP_HOSTS`, not the error
message, not the exports.

**Verify**:

```
bun run typecheck
grep -n "NODE_ENV\|VERCEL_ENV" apps/web/src/lib/auth-links.ts
```

**Expected**: typecheck exits 0; the grep shows one `VERCEL_ENV` line and zero
`NODE_ENV` lines.

### Step 3: Confirm the build now succeeds

```
bunx turbo build --filter=web
```

**Expected**: succeeds. `/terms-of-service` and every other `apps/web` page
now build without a locally-configured `NEXT_PUBLIC_APP_URL` throwing.

If the build still fails with the same error, `VERCEL_ENV` is not reaching
`env` the way "Current state" describes; go to STOP conditions rather than
reaching for `process.env.VERCEL_ENV` as a workaround without understanding
why the validated `env` object didn't have it.

### Step 4: Add the test file

Create `apps/web/src/lib/auth-links.test.ts`, modelled on the
`vi.mock("@/env", ...)` + fresh dynamic import pattern in
`apps/api/app/webhooks/auth/route.test.ts`. Cover:

1. `VERCEL_ENV` unset (the local-dev and CI case), `NEXT_PUBLIC_APP_URL`
   pointing at `localhost` → does not throw; `signInHref` resolves to the
   localhost origin.
2. `VERCEL_ENV: "preview"`, `NEXT_PUBLIC_APP_URL` pointing at `localhost` →
   does not throw. (A preview deployment with a misconfigured app URL should
   not crash the build; it is not production.)
3. `VERCEL_ENV: "production"`, `NEXT_PUBLIC_APP_URL` pointing at `localhost` →
   throws the exact "must point to the Team Calendar app domain in
   production" error. This is the regression case: it must still fail loudly
   in real production.
4. `VERCEL_ENV: "production"`, `NEXT_PUBLIC_APP_URL` pointing at the real
   domain → does not throw; `signInHref` resolves to that domain's
   `/sign-in`.
5. `NEXT_PUBLIC_APP_URL` unset, `VERCEL_ENV: "production"` → falls back to
   `PRODUCTION_APP_ORIGIN` and does not throw (the fallback is already a valid
   production host).

Each case needs `vi.resetModules()` and its own `vi.doMock("@/env", () => ({
env: { NEXT_PUBLIC_APP_URL: ..., VERCEL_ENV: ... } }))` before a fresh
`await import("./auth-links")`, because the module computes `appOrigin` once
at import time and a cached module would carry over the previous test's
result.

**Verify**:

```
bunx vitest run apps/web/src/lib/auth-links.test.ts
```

**Expected**: all 5 cases pass.

### Step 5: Full verification

```
bun run check
bun run typecheck
bun run test
bun run build
```

**Expected**: all four exit 0. The full `bun run build` (not just the `web`
filter) now succeeds, including `apps/app` and `apps/api`, which were already
passing.

## Test plan

New file `apps/web/src/lib/auth-links.test.ts`, 5 cases as listed in Step 4.
Structural model: `apps/api/app/webhooks/auth/route.test.ts` for the
`vi.mock("@/env", ...)` shape; this file additionally needs
`vi.resetModules()` per case since the auth webhook route test only needs one
static mock for its whole suite, while this module's behaviour depends on
re-evaluating the top-level `resolveAppOrigin()` call under different env
values.

Verification: `bunx vitest run apps/web/src/lib/auth-links.test.ts` → 5
passed. Then `bun run test` → exits 0 with the Step 1 baseline count plus 5.

## Done criteria

All of the following, verbatim:

1. `bun run check` exits 0.
2. `bun run typecheck` exits 0.
3. `bun run test` exits 0, with the Step 1 baseline test count plus 5 (the new
   `auth-links.test.ts` cases).
4. `bun run build` exits 0.
5. `grep -c "NODE_ENV" apps/web/src/lib/auth-links.ts` prints `0`.
6. `grep -c "VERCEL_ENV" apps/web/src/lib/auth-links.ts` prints `1`.
7. `git diff --name-only` lists exactly `apps/web/src/lib/auth-links.ts` and
   `apps/web/src/lib/auth-links.test.ts`.

## STOP conditions

Stop and report back rather than improvising if any of these occur:

- **The Step 1 reproduction fails with a different error** than the one
  quoted in "Current state", or does not fail at all. The bug this plan
  targets may already be fixed or may have changed shape; re-verify "Current
  state" against the live file before proceeding.
- **`env.VERCEL_ENV` is `undefined` in a context where you expected
  `"production"`** (e.g. you cannot make case 3 in Step 4 throw). That would
  mean `apps/web/env.ts` or `packages/next-config/keys.ts` no longer exposes
  `VERCEL_ENV` the way "Current state" describes. Report the actual shape;
  do not fall back to reading `process.env.VERCEL_ENV` directly without
  understanding why the validated object didn't have it.
- **`bun run build` still fails after Step 2**, with any error. Report the
  exact error verbatim. Do not weaken or delete the guard to make the build
  pass; the guard is correct in intent, only its condition was wrong.
- **You find `NODE_ENV === "production"` used as a "genuinely in production"
  signal anywhere else that is now suspect** beyond the one already noted and
  excluded (`packages/observability/log.ts`). Note the location, but do not
  fix it here, it is out of scope.

## Maintenance notes

- **This unblocks plans 024 and 033.** After this lands, re-run each plan's
  Step 1 baseline (`bun run build`) before resuming their own steps; both
  were marked `BLOCKED` in `plans/README.md` for exactly this reason and
  should be re-tried once this plan is `DONE`.
- **`NODE_ENV` is never the right signal for "is this a genuine production
  deployment on Vercel."** It is `"production"` for every `next build`,
  everywhere. `VERCEL_ENV` (`"development" | "preview" | "production"`,
  unset off Vercel) is the correct check, and it is already validated in
  `packages/next-config/keys.ts` for exactly this purpose. Any future guard
  that needs to distinguish "really deployed to production" from "a build ran
  somewhere" should use `VERCEL_ENV`, not `NODE_ENV`.
- **The throw-at-import-time shape is intentional and stays.** It makes a
  misconfigured production app URL fail the build loudly instead of shipping
  broken sign-in links. Do not refactor `signInHref`/`signUpHref` into lazy
  functions as part of this fix; that would touch all five call sites for no
  benefit over fixing the one wrong condition.
