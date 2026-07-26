# Plan 023: Regenerate the `.env.example` files and remove the dead Knock configuration

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report, do not improvise. When done, update this plan's status row in
> `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 75202db..HEAD -- apps/app/.env.example apps/api/.env.example apps/web/.env.example packages/database/.env.example packages/notifications/keys.ts apps/app/env.ts apps/api/env.ts`
> If any changed since this plan was written, re-check the "Current state"
> facts before proceeding.
>
> **Secrets rule for this plan**: you will be editing files that hold
> environment variable *names*. Never copy a value out of `.env.local`, out of
> a deployment environment, or out of any running process into a
> `.env.example`. Every value you write must be an obvious placeholder. If you
> encounter a real credential at any point, do not reproduce it anywhere,
> including in your report; reference the file and line and recommend rotation.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: dx, tech debt
- **Planned at**: commit `75202db`, 2026-07-25

## Why this matters

`.env.example` is the only executable documentation of what a developer needs
to run this product. It is currently wrong in both directions: it omits about
fifteen variables the code validates, and it lists three for a service the
product does not use.

The omissions are the expensive half. A new developer who copies
`apps/app/.env.example` gets a file with no `CLERK_SECRET_KEY`, no
`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, no `RESEND_TOKEN`, no `KV_REST_API_URL`
and no Stripe configuration. The app will not authenticate, will not send
email, will not cache feeds and will not bill. Nothing tells them why, because
every one of those keys is declared `.optional()` in its `keys.ts`, so env
validation passes and the failure surfaces later as a runtime error from a
third-party SDK.

The additions are the confusing half. `KNOCK_SECRET_API_KEY`,
`NEXT_PUBLIC_KNOCK_API_KEY` and `NEXT_PUBLIC_KNOCK_FEED_CHANNEL_ID` appear in
two `.env.example` files and in `packages/notifications/keys.ts`. Knock is a
notifications-as-a-service product. This repo does not use it: `CLAUDE.md`
specifies "Real-time notifications | SSE via Vercel streaming" and
"`packages/notifications` | In-app notification creation, SSE delivery,
notification preferences, email dispatch via Resend". The keys are inherited
from the next-forge template and nothing reads them. A developer who sees them
reasonably concludes they need a Knock account.

There is also a documentation defect worth fixing while here: `CLAUDE.md`'s
environment table lists `SENTRY_DSN`, but `packages/observability/keys.ts`
validates `NEXT_PUBLIC_SENTRY_DSN` and no `SENTRY_DSN` exists anywhere. That
correction belongs with the others in plan 026, and this plan should not touch
`CLAUDE.md`; it is noted here so the executor of 026 knows it is already
recorded.

## Current state

### What the `.env.example` files contain

Four files exist:

```
apps/api/.env.example
apps/app/.env.example
apps/web/.env.example
packages/database/.env.example
```

`apps/app/.env.example` declares these variable names, in this order:

```
DATABASE_URL
NEXT_PUBLIC_CLERK_SIGN_IN_URL
NEXT_PUBLIC_CLERK_SIGN_UP_URL
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_WEB_URL
NEXT_PUBLIC_API_URL
NEXT_PUBLIC_DOCS_URL
VERCEL_PROJECT_PRODUCTION_URL
XERO_TOKEN_ENCRYPTION_KEY
XERO_CLIENT_ID
XERO_CLIENT_SECRET
KNOCK_SECRET_API_KEY
NEXT_PUBLIC_KNOCK_API_KEY
NEXT_PUBLIC_KNOCK_FEED_CHANNEL_ID
BETTERSTACK_API_KEY
SENTRY_ORG
SENTRY_PROJECT
```

`apps/api/.env.example` is the same list plus `INNGEST_DEV`.

### What the code actually validates

`apps/app/env.ts` composes nine key modules:

```typescript
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

`apps/api/env.ts` composes eleven (adds `billing()`, `jobs()`, `github()`) plus
`STRIPE_WEBHOOK_SECRET` declared inline.

Reading each `keys.ts` at commit `75202db` gives the full set:

| Module | Variables |
|---|---|
| `packages/auth/keys.ts` | `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL`, `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` |
| `packages/analytics/keys.ts` | `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `NEXT_PUBLIC_POSTHOG_HOST`, `NEXT_PUBLIC_POSTHOG_KEY` |
| `packages/next-config/keys.ts` | `ANALYZE`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_DOCS_URL`, `NEXT_PUBLIC_WEB_URL`, `NEXT_RUNTIME`, `VERCEL`, `VERCEL_ENV`, `VERCEL_PROJECT_PRODUCTION_URL`, `VERCEL_REGION`, `VERCEL_URL` |
| `packages/database/keys.ts` | `DATABASE_URL` (**required**, the only non-optional key besides the Xero encryption key) |
| `packages/email/keys.ts` | `RESEND_FROM`, `RESEND_TOKEN` |
| `packages/feeds/keys.ts` | `KV_REST_API_TOKEN`, `KV_REST_API_URL` |
| `packages/jobs/keys.ts` | `INNGEST_DEV`, `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY` |
| `packages/notifications/keys.ts` | `KNOCK_SECRET_API_KEY`, `NEXT_PUBLIC_KNOCK_API_KEY`, `NEXT_PUBLIC_KNOCK_FEED_CHANNEL_ID` (**all dead**) |
| `packages/observability/keys.ts` | `BETTERSTACK_API_KEY`, `BETTERSTACK_URL`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT` |
| `packages/xero/keys.ts` | `XERO_API_BASE_URL`, `XERO_CLIENT_ID`, `XERO_CLIENT_SECRET`, `XERO_REDIRECT_URI`, `XERO_TOKEN_ENCRYPTION_KEY` (**required**) |
| `packages/billing/keys.ts` | `STRIPE_CHECKOUT_CANCEL_URL`, `STRIPE_CHECKOUT_SUCCESS_URL`, `STRIPE_PORTAL_RETURN_URL`, `STRIPE_PRICE_BASIC`, `STRIPE_PRICE_PREMIUM`, `STRIPE_SECRET_KEY` |
| `apps/api/env.ts` inline | `STRIPE_WEBHOOK_SECRET` |
| `apps/api/lib/github/keys.ts` | `GITHUB_OWNER`, `GITHUB_REPO`, `GITHUB_TOKEN` |

Missing from `apps/app/.env.example` and validated by `apps/app/env.ts`:
`CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`,
`NEXT_PUBLIC_GA_MEASUREMENT_ID`, `NEXT_PUBLIC_POSTHOG_HOST`,
`NEXT_PUBLIC_POSTHOG_KEY`, `RESEND_FROM`, `RESEND_TOKEN`, `KV_REST_API_TOKEN`,
`KV_REST_API_URL`, `BETTERSTACK_URL`, `NEXT_PUBLIC_SENTRY_DSN`,
`XERO_API_BASE_URL`, `XERO_REDIRECT_URI`.

### `packages/notifications/keys.ts` in full

```typescript
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const keys = () =>
  createEnv({
    server: {
      KNOCK_SECRET_API_KEY: z.string().optional(),
    },
    client: {
      NEXT_PUBLIC_KNOCK_API_KEY: z.string().optional(),
      NEXT_PUBLIC_KNOCK_FEED_CHANNEL_ID: z.string().optional(),
    },
    runtimeEnv: {
      NEXT_PUBLIC_KNOCK_API_KEY: process.env.NEXT_PUBLIC_KNOCK_API_KEY,
      NEXT_PUBLIC_KNOCK_FEED_CHANNEL_ID:
        process.env.NEXT_PUBLIC_KNOCK_FEED_CHANNEL_ID,
      KNOCK_SECRET_API_KEY: process.env.KNOCK_SECRET_API_KEY,
    },
  });
```

The file declares nothing but Knock keys. Its only importer is
`apps/app/env.ts` (line 7 imports it, line 20 calls it). `apps/api/env.ts` does
not extend it.

Confirm nothing else reads Knock:

```
grep -rn "KNOCK\|knock\|Knock" apps packages --include=*.ts --include=*.tsx 2>/dev/null | grep -v node_modules
```

At commit `75202db` this returns only `packages/notifications/keys.ts` and the
two `.env.example` files.

## Commands you will need

All run from the repo root.

```
bun install                # run first if you hit "Cannot find module '@repo/observability/log'"
bun run check
bun run typecheck
bun run test
```

## Scope

**In scope:**

- `apps/app/.env.example`
- `apps/api/.env.example`
- `apps/web/.env.example`
- `packages/database/.env.example`
- `packages/notifications/keys.ts` (delete)
- `apps/app/env.ts` (drop the `notifications()` extend and its import)

**Explicitly out of scope:**

- `CLAUDE.md`, `README.md`, `AGENTS.md`, `GEMINI.md`. Documentation drift,
  including the `SENTRY_DSN` error, is plan 026.
- Adding `emptyStringAsUndefined` or the missing `billing()` extend to
  `apps/app/env.ts`. That is plan 024. **This plan and plan 024 both edit
  `apps/app/env.ts`**; see "Git workflow" for the ordering.
- Any other `keys.ts`. Do not add, remove or change a Zod schema anywhere else.
- Any `.env.local` file, in any directory. Never read, write or reference one.
- Any actual credential value.
- Deleting other unused next-forge packages. That is plan 033.

## Git workflow

```
git checkout -b chore/env-examples-and-knock-removal
```

Suggested commits:

```
chore: remove the unused Knock notification configuration
docs: regenerate the .env.example files from the validated key schemas
```

**Ordering with plan 024**: both plans edit `apps/app/env.ts`. Land this one
first (it removes a line) and rebase 024 (which adds lines). If 024 has already
landed, its `emptyStringAsUndefined` and `billing()` additions must survive
this plan's edit; re-read the file rather than reconstructing it from this
plan's excerpt.

Do not push or open a pull request unless the user asks.

## Steps

### Step 1: Establish the baseline

```
bun run check
bun run typecheck
bun run test
```

**Expected**: all three exit 0. If any fails before you have changed anything,
go to STOP conditions.

### Step 2: Confirm Knock is genuinely unused

```
grep -rn "KNOCK\|Knock\|knock" apps packages scripts tooling --include=*.ts --include=*.tsx --include=*.json --include=*.md 2>/dev/null | grep -v node_modules
```

**Expected**: hits only in `packages/notifications/keys.ts`,
`apps/app/.env.example` and `apps/api/.env.example`.

Also check the package manifests for a Knock SDK:

```
grep -rn "knock" package.json apps/*/package.json packages/*/package.json
```

**Expected**: nothing.

If either check finds a real consumer, go to STOP conditions. Removing config
that something reads at runtime is a production incident, and `.optional()`
schemas mean the type system will not catch it.

### Step 3: Delete `packages/notifications/keys.ts`

```
git rm packages/notifications/keys.ts
```

Then edit `apps/app/env.ts`: remove the import on line 7 and the
`notifications(),` entry from the `extends` array.

Before:

```typescript
import { keys as notifications } from "@repo/notifications/keys";
...
    notifications(),
```

After: both lines gone. Leave every other import and extend exactly as it is,
in the same order.

**Verify**:

```
bun run typecheck
grep -c "notifications" apps/app/env.ts
```

**Expected**: typecheck exits 0; the grep prints `0`.

### Step 4: Rebuild `apps/app/.env.example`

Replace the file's contents. Every variable that `apps/app/env.ts` validates
appears exactly once, grouped by concern, with a comment naming the source of
each group. Values are placeholders only.

```
# ---------------------------------------------------------------------------
# Required. The app will not start without these.
# ---------------------------------------------------------------------------

# packages/database/keys.ts. Neon Postgres connection string.
DATABASE_URL="postgresql://user:password@host/database?sslmode=require"

# packages/xero/keys.ts. AES-256-GCM key for encrypting Xero OAuth tokens at
# rest. Must decode to exactly 32 bytes. Generate with:
#   openssl rand -base64 32
XERO_TOKEN_ENCRYPTION_KEY=""

# ---------------------------------------------------------------------------
# Auth (packages/auth/keys.ts). Required for anyone to sign in.
# ---------------------------------------------------------------------------

CLERK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
# Only needed by the app that receives Clerk webhooks.
# CLERK_WEBHOOK_SECRET="whsec_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/"

# ---------------------------------------------------------------------------
# Xero (packages/xero/keys.ts)
# ---------------------------------------------------------------------------

XERO_CLIENT_ID=""
XERO_CLIENT_SECRET=""
# Must exactly match a redirect URI registered on the Xero app.
# XERO_REDIRECT_URI="http://localhost:3002/api/xero/oauth/callback"
# Override only when pointing at a non-production Xero host.
# XERO_API_BASE_URL="https://api.xero.com"

# ---------------------------------------------------------------------------
# Email (packages/email/keys.ts). Without these, no transactional email sends.
# ---------------------------------------------------------------------------

RESEND_TOKEN="re_..."
RESEND_FROM="Team Calendar <noreply@example.com>"

# ---------------------------------------------------------------------------
# Feed cache (packages/feeds/keys.ts). Without these, ICS feeds are rendered
# on every request instead of being served from cache.
# ---------------------------------------------------------------------------

KV_REST_API_URL=""
KV_REST_API_TOKEN=""

# ---------------------------------------------------------------------------
# URLs (packages/next-config/keys.ts)
# ---------------------------------------------------------------------------

NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_WEB_URL="http://localhost:3001"
NEXT_PUBLIC_API_URL="http://localhost:3002"
NEXT_PUBLIC_DOCS_URL="http://localhost:3004"
# Set automatically on Vercel; leave unset locally.
# VERCEL_PROJECT_PRODUCTION_URL=""

# ---------------------------------------------------------------------------
# Observability (packages/observability/keys.ts). All optional.
# ---------------------------------------------------------------------------

# NEXT_PUBLIC_SENTRY_DSN=""
# SENTRY_ORG=""
# SENTRY_PROJECT=""
# BETTERSTACK_API_KEY=""
# BETTERSTACK_URL=""

# ---------------------------------------------------------------------------
# Analytics (packages/analytics/keys.ts). All optional.
# ---------------------------------------------------------------------------

# NEXT_PUBLIC_POSTHOG_KEY=""
# NEXT_PUBLIC_POSTHOG_HOST=""
# NEXT_PUBLIC_GA_MEASUREMENT_ID=""
```

**Two rules that matter more than the layout:**

1. **Optional variables with a format constraint must be commented out, not set
   to `""`.** `CLAUDE.md` states this explicitly: "Optional variables with
   format constraints must be absent (commented out), not `""`. Empty strings
   fail Zod format validation even for `.optional()` fields." That is why
   `NEXT_PUBLIC_SENTRY_DSN` (a `z.string().url()`) and `CLERK_WEBHOOK_SECRET`
   (a `startsWith("whsec_")`) are commented out above, while `XERO_CLIENT_ID`
   (a bare `z.string()`) can be an empty string. Check each variable's schema
   before deciding.
2. **`XERO_TOKEN_ENCRYPTION_KEY` is required and format-constrained.** It
   cannot be commented out (validation fails) and cannot be `""` (fails the
   32-byte check). Leaving it as `""` in the example is a deliberate choice:
   the developer must fill it in and the failure message tells them how. Keep
   the `openssl` hint.

Sanity-check your work against the schemas:

```
grep -n "optional()" packages/observability/keys.ts packages/analytics/keys.ts packages/auth/keys.ts
```

### Step 5: Rebuild `apps/api/.env.example`

Same structure, plus the modules `apps/api/env.ts` extends that `apps/app` does
not. Start from the Step 4 file and add:

```
# ---------------------------------------------------------------------------
# Inngest (packages/jobs/keys.ts). Both keys must be set together or both
# omitted; a half-configured pair throws during env validation. The local dev
# server needs neither.
# ---------------------------------------------------------------------------

# INNGEST_EVENT_KEY=""
# INNGEST_SIGNING_KEY="signkey-..."
# INNGEST_DEV="1"

# ---------------------------------------------------------------------------
# Stripe (packages/billing/keys.ts and apps/api/env.ts). All optional; billing
# is disabled when unset.
# ---------------------------------------------------------------------------

# STRIPE_SECRET_KEY="sk_test_..."
# STRIPE_WEBHOOK_SECRET="whsec_..."
# STRIPE_PRICE_BASIC="price_..."
# STRIPE_PRICE_PREMIUM="price_..."
# STRIPE_CHECKOUT_SUCCESS_URL="http://localhost:3000/settings/billing?checkout=success"
# STRIPE_CHECKOUT_CANCEL_URL="http://localhost:3000/settings/billing?checkout=cancelled"
# STRIPE_PORTAL_RETURN_URL="http://localhost:3000/settings/billing"

# ---------------------------------------------------------------------------
# GitHub (apps/api/lib/github/keys.ts). All optional.
# ---------------------------------------------------------------------------

# GITHUB_TOKEN=""
# GITHUB_OWNER=""
# GITHUB_REPO=""
```

The both-or-neither Inngest constraint is real: `packages/jobs/keys.ts` throws
`"INNGEST_EVENT_KEY and INNGEST_SIGNING_KEY must both be set or both omitted"`
when only one is present. The comment above must stay, because a developer who
fills in one will otherwise get an opaque startup failure.

### Step 6: Rebuild `apps/web/.env.example`

`apps/web/env.ts` extends only three modules:

```typescript
export const env = createEnv({
  extends: [core(), email(), observability()],
  server: {},
  client: {},
  runtimeEnv: {},
});
```

So its example needs only the URL group, the Resend group and the observability
group. Do not copy the Clerk, Xero, database or Stripe sections into it: the
marketing site does not validate them and listing them implies it does.

### Step 7: Check `packages/database/.env.example`

Read it. `packages/database/keys.ts` declares exactly one variable,
`DATABASE_URL`, and it is required. The file should contain that and nothing
else. If it already does, leave it alone and say so in your report.

### Step 8: Verify no example lists a variable the code does not validate

For each of the four files, extract the variable names and confirm each appears
in a `keys.ts` or an `env.ts`:

```
for f in apps/app/.env.example apps/api/.env.example apps/web/.env.example packages/database/.env.example; do
  echo "=== $f"
  grep -oE "^#?\s*[A-Z][A-Z_0-9]+=" "$f" | tr -d '#= ' | sort -u | while read -r v; do
    if ! grep -rq "$v" packages/*/keys.ts apps/*/env.ts apps/api/lib/github/keys.ts 2>/dev/null; then
      echo "  ORPHAN: $v"
    fi
  done
done
```

**Expected**: no `ORPHAN` lines.

### Step 9: Full verification

```
bun run check
bun run typecheck
bun run test
```

**Expected**: all exit 0, with the same test count as the Step 1 baseline.

Then confirm Knock is gone:

```
grep -rn "KNOCK\|Knock\|knock" apps packages --include=*.ts --include=*.tsx 2>/dev/null | grep -v node_modules
```

**Expected**: nothing.

## Test plan

No tests. `.env.example` files are not loaded by anything and
`packages/notifications/keys.ts` had no test.

The verification that carries the weight is Step 8: no `.env.example` may list
a variable that no schema validates, which is the failure mode that produced
the Knock entries in the first place. Run it against the final state of all
four files.

If you want stronger assurance for the removal, the honest check is a build:
`bun run build` compiles all three apps with env validation active. It is slow
but it is the only thing that exercises `apps/app/env.ts` end to end. Plan 016
adds this to CI; until then, running it once locally is worthwhile here because
this plan edits an `env.ts`.

## Done criteria

All of the following, verbatim:

1. `bun run check` exits 0.
2. `bun run typecheck` exits 0.
3. `bun run test` exits 0 with the Step 1 baseline test count.
4. `bun run build` exits 0.
5. `test -f packages/notifications/keys.ts` returns non-zero (the file is
   deleted).
6. `grep -rc "KNOCK" apps packages --include=*.ts --include=*.tsx --include=.env.example 2>/dev/null | grep -v ":0" | grep -v node_modules` prints nothing.
7. `grep -c "CLERK_SECRET_KEY" apps/app/.env.example` prints `1`.
8. `grep -c "KV_REST_API_URL" apps/app/.env.example` prints `1`.
9. `grep -c "RESEND_TOKEN" apps/app/.env.example` prints `1`.
10. The Step 8 orphan check reports no `ORPHAN` lines for any of the four
    files.
11. No `.env.example` contains a value that is not an obvious placeholder.
    Read all four files in full and confirm.
12. `git diff --name-only` lists only files from the "In scope" list.

## STOP conditions

Stop and report back rather than improvising if any of these occur:

- **The baseline in Step 1 is not green.** Report what fails; change nothing.
- **Step 2 finds a real Knock consumer.** Report the file and line. Do not
  delete `packages/notifications/keys.ts`.
- **`bun run build` fails after removing the `notifications()` extend.** That
  would mean something depends on the validated env object even though nothing
  reads the variables. Report the error verbatim.
- **You find what looks like a real credential in a tracked file.** Do not
  reproduce the value anywhere, including in your report. State the file, the
  line, and the credential type, and recommend rotating it. Then stop and let
  the user decide.
- **A `.env.local` exists in any directory.** Do not open it, do not copy from
  it, do not list its contents. It is untracked and its values are not yours to
  move.
- **A variable in `keys.ts` has a shape you cannot classify** as "safe as `""`"
  versus "must be commented out". When in doubt, comment it out: an absent
  optional variable always validates, an empty string sometimes does not.

## Maintenance notes

- **The rule that keeps these files correct**: a `.env.example` lists exactly
  the variables its app's `env.ts` transitively validates, and no others. The
  Step 8 orphan loop is the check. Any PR that adds a key to a `keys.ts` should
  add it to every `.env.example` whose `env.ts` extends that module.
- **The empty-string trap is real and repo-specific.** `CLAUDE.md` documents
  it, `apps/api/env.ts` and `packages/billing/keys.ts` both set
  `emptyStringAsUndefined: true` with an explanatory comment, and
  `apps/app/env.ts` does not (plan 024 fixes that). Until 024 lands, the rule
  "optional plus format constraint means comment it out" is load-bearing for
  `apps/app` specifically.
- **`packages/notifications` no longer has a `keys.ts`.** If notification
  configuration is ever needed (a Resend template ID, an SSE heartbeat
  interval), recreate the file and add the extend back to the apps that need
  it. Do not resurrect the Knock keys.
- **`CLAUDE.md` still lists `SENTRY_DSN`** in its environment table, which does
  not exist; the real variable is `NEXT_PUBLIC_SENTRY_DSN`. Plan 026 corrects
  the documentation. Do not fix it here, and do not add `SENTRY_DSN` to any
  `.env.example` to make the docs true.
- **Related plan**: plan 024 also edits `apps/app/env.ts`. Coordinate as
  described under "Git workflow".
