# Plan 055: Stop launch mode throwing in the browser, and document the vars it needs

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the next
> step. If anything in "STOP conditions" occurs, stop and report — do not
> improvise. When done, update this plan's row in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 7cef97c..HEAD -- packages/next-config apps/web/app/pricing "apps/app/app/(authenticated)/settings/billing"`
> If any in-scope file changed, compare the "Current state" excerpts against the
> live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `7cef97c`, 2026-08-24 (reconciled from
  `121da2a` after the pricing page safeguard and unrelated billing styles
  landed)
- **Covers findings**: C-04, D-02
- **Review status**: DONE on 2026-08-24. Implementation commit `e4c5997` on
  `advisor/055-launch-mode-browser-safe` was independently reviewed and
  approved; not merged.

## Execution outcome

- **Worktree**: `/tmp/teamcalendar-plan-055`
- **Branch**: `advisor/055-launch-mode-browser-safe`
- **Commit**: `e4c5997` (`fix(next-config): make launch mode browser safe`)
- **Scope**: exactly four in-scope files. The existing web launch-mode example
  was already complete, so it remained untouched; the worktree is clean.
- **Independent verification**: focused launch-mode suite 10/10; `bun run
  check` checked 767 files; typecheck 19/19 tasks; unit suite 17/17 tasks;
  build 4/4 tasks; full integration 5/5 tasks and 60 database-backed tests.
  Two credential-gated external Xero tests remained skipped and were unrelated
  to this plan. `git diff --check`, scope, throw-path, environment-count and
  pricing-page checks all passed.
- **Integration retry**: the first concurrent run timed out in one unchanged
  jobs test at its five-second limit. That exact test passed alone, then the
  complete integration lane passed on retry, confirming a load-related flake
  rather than a regression in this four-file change.
- **Verdict**: APPROVE. Missing production launch mode now renders the safest
  `early_access` experience and emits a warning; invalid configured values
  still throw, and deploy preflight remains strict.

## Why this matters

`getLaunchMode()` throws when `NEXT_PUBLIC_LAUNCH_MODE` is absent and the
environment looks like production. It is called from **client** components in
both deployed apps. In a browser bundle Next.js inlines
`process.env.NEXT_PUBLIC_LAUNCH_MODE` at **build** time, and inlines
`process.env.NODE_ENV` as `"production"`. So if the variable is not set at build
time, the production bundle contains a component that throws during hydration —
taking out the public pricing page and the authenticated billing settings page.

The pricing page now has a committed `export const dynamic = "force-dynamic"`
safeguard. That addresses the build-time prerender failure, but it cannot address
hydration, because the client inlining already happened at build. The fix still
has to be in the accessor.

The same variable, plus five Stripe variables, are hard-required by
`runProductionPreflight` for `app` and `api`, yet appear in **neither** app's
`.env.example` — while the README tells operators those files are the complete
annotated list.

## Current state

`packages/next-config/launch-mode.ts:7-34`:

```ts
export const isProductionEnvironment = (): boolean => {
  const nodeEnv = process.env.NODE_ENV;
  const vercelEnv =
    process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.VERCEL_ENV;
  return nodeEnv === "production" || vercelEnv === "production";
};

export const getLaunchMode = (): LaunchMode => {
  const rawMode = process.env.NEXT_PUBLIC_LAUNCH_MODE?.trim();

  if (rawMode) {
    const parsed = launchModeSchema.safeParse(rawMode);
    if (parsed.success) {
      return parsed.data;
    }
    throw new Error(
      `Invalid NEXT_PUBLIC_LAUNCH_MODE: "${rawMode}". Must be "early_access" or "paid".`
    );
  }

  if (isProductionEnvironment()) {
    throw new Error(
      "NEXT_PUBLIC_LAUNCH_MODE environment variable is required in production. Must be 'early_access' or 'paid'."
    );
  }

  return "early_access";
};
```

The two **client** call sites:

- `apps/web/app/pricing/components/pricing-plans.tsx:1-9` — `"use client"`, then
  `const earlyAccess = isEarlyAccess();`
- `apps/app/app/(authenticated)/settings/billing/billing-client.tsx:1,13,47` —
  `"use client"`, then `const earlyAccess = isEarlyAccess();`

One **server** call site, which may keep the strict behaviour:
`apps/app/app/(authenticated)/settings/billing/actions.ts:4`.

Preflight requires the variable for all three apps
(`packages/next-config/preflight.ts:38-46`) and requires
`STRIPE_SECRET_KEY`, `STRIPE_PRICE_BASIC`, `STRIPE_PRICE_PREMIUM`,
`STRIPE_PORTAL_RETURN_URL` for `app` and `api` in `paid` mode, plus
`STRIPE_WEBHOOK_SECRET` for `api` (`preflight.ts:151-161`).

Verified absent: `grep -c "STRIPE" apps/app/.env.example apps/api/.env.example`
prints `0` and `0`. `NEXT_PUBLIC_LAUNCH_MODE` appears only in the committed
`apps/web/.env.example` launch-mode section.

Drift reviewed during reconciliation:

- `apps/web/app/pricing/page.tsx` gained only the committed `force-dynamic`
  safeguard described above.
- `apps/app/app/(authenticated)/settings/billing/billing-client.tsx` received
  design-token and radius changes only. It remains a client component and still
  calls `isEarlyAccess()` in the same place.
- No additional client-side caller of `getLaunchMode`, `isEarlyAccess`, or
  `isPaidLaunch` exists.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Lint | `bun run check` | exit 0 |
| Typecheck | `bun run typecheck` | exit 0 |
| Unit tests | `bun run test` | exit 0, 17/17 tasks |
| Build | `bun run build` | exit 0, 4/4 tasks |
| Preflight | `bun run preflight` | see its own output |

## Scope

**In scope**:
- `packages/next-config/launch-mode.ts`
- `packages/next-config/launch-mode.test.ts`
- `apps/app/.env.example`
- `apps/api/.env.example`
- `apps/web/.env.example`

**Out of scope**:
- `packages/next-config/preflight.ts` — the server-side hard requirement is
  correct and must stay. Preflight is where a missing variable *should* fail.
- `apps/web/app/pricing/page.tsx` — its committed `force-dynamic` safeguard is
  complementary. Leave it exactly as it is; do not revert it and do not build
  on it.
- `packages/next-config/package.json` and `packages/observability/**` — do not
  add a new package dependency for this fallback. Both deployed clients already
  configure Sentry to capture `console.warn` calls.
- The Stripe wiring itself. This plan documents the variables; it does not change
  billing behaviour.
- Deciding the production value of `NEXT_PUBLIC_LAUNCH_MODE`. That is an
  operator decision.

## Git workflow

- Branch: `advisor/055-launch-mode-browser-safe`
- Conventional commits, e.g. `fix(next-config): fail safe when launch mode is unset in the browser`
- Do NOT push or open a PR unless the operator instructed it.
- The source worktree is clean at the reconciled snapshot. Do not touch files
  outside the explicit in-scope list.

## Steps

### Step 1: Add a failing test for the browser case

In `packages/next-config/launch-mode.test.ts`, add a case that simulates the
browser bundle: `NEXT_PUBLIC_LAUNCH_MODE` deleted and `NODE_ENV` set to
`"production"`, with no `VERCEL_ENV`. Assert `getLaunchMode()` returns
`"early_access"` rather than throwing.

Run it and confirm it **fails** today with the thrown error.

**Verify**: `cd packages/next-config && bunx vitest run launch-mode.test.ts` →
the new case fails with "NEXT_PUBLIC_LAUNCH_MODE environment variable is
required in production".

### Step 2: Make the accessor fail safe instead of throwing

Change `getLaunchMode()` so that an **absent** value resolves to the safest mode
rather than throwing. `early_access` is the safe default: it hides checkout and
paid CTAs. A page that renders the restricted experience is a far better failure
mode than a page that does not render.

Keep throwing for an **invalid** value such as `"Paid"` or another non-enum
string, since it indicates misconfiguration rather than absence. Preserve the
current trimming behaviour for surrounding whitespace.

Emit a concise `console.warn` only when the missing-value fallback occurs in a
production environment, so a misconfigured client bundle remains visible. This
is an intentional exception to the normal package logger pattern: importing
`@repo/observability/log` would require a new dependency in
`packages/next-config/package.json`, while both deployed apps already initialise
Sentry's console logging integration for warnings. Do not include any other
environment values in the message.

The hard requirement does not disappear: it moves entirely to
`runProductionPreflight`, which already enforces it at deploy time and is the
correct place for it.

**Verify**: `cd packages/next-config && bunx vitest run launch-mode.test.ts` →
all pass, including the Step 1 case and the existing invalid-value case.

### Step 3: Document the variables in both missing `.env.example` files

Add commented entries to `apps/app/.env.example` and `apps/api/.env.example`:

- `NEXT_PUBLIC_LAUNCH_MODE` — required in production, `early_access` or `paid`
- `STRIPE_SECRET_KEY`, `STRIPE_PRICE_BASIC`, `STRIPE_PRICE_PREMIUM`,
  `STRIPE_PORTAL_RETURN_URL` — required in `paid` mode
- `STRIPE_WEBHOOK_SECRET` — `apps/api` only, required in `paid` mode

Annotate each as paid-mode-only where that applies. Keep them **commented out**:
`CLAUDE.md` requires that optional format-constrained variables are absent rather
than empty strings, and an empty string fails Zod validation even on an
`.optional()` field.

Do not invent values. These are placeholders and comments only — no real keys of
any kind belong in an example file.

**Verify**:
`grep -c "STRIPE" apps/app/.env.example apps/api/.env.example` → both non-zero;
`grep -c "NEXT_PUBLIC_LAUNCH_MODE" apps/app/.env.example apps/api/.env.example`
→ both `1`.

### Step 4: Confirm the build and preflight still behave

**Verify**: `bun run build` → exit 0, 4/4 tasks. `bun run test` → exit 0,
17/17 tasks.

## Test plan

Cases in `packages/next-config/launch-mode.test.ts`, following the structure of
the existing cases at `:17-49`:

- change the existing absent variable + `NODE_ENV=production` case to return
  `early_access` without throwing
- add absent variable + `NEXT_PUBLIC_VERCEL_ENV=production` → returns
  `early_access`
- add absent variable + `VERCEL_ENV=production` → returns `early_access`
- add production fallback → calls `console.warn` with the missing-variable
  warning
- add absent variable + development → does not call `console.warn`
- keep the existing absent-development, invalid-value, and valid-`paid` cases

Verification: `bun run test` → exit 0, with at least 4 new tests.

## Done criteria

ALL must hold:

- [x] `bun run check` exits 0
- [x] `bun run typecheck` exits 0
- [x] `bun run test` exits 0, 17/17 tasks, with 4 new tests and the existing
      production-missing test updated to assert the safe fallback
- [x] `bun run build` exits 0, 4/4 tasks
- [x] `grep -c "STRIPE" apps/app/.env.example` and `apps/api/.env.example` both
      print 5 or more
- [x] `grep -c "NEXT_PUBLIC_LAUNCH_MODE" apps/app/.env.example apps/api/.env.example`
      both print 1
- [x] `grep -n "throw" packages/next-config/launch-mode.ts` shows a throw only on
      the invalid-value path, not the absent-value path
- [x] `git diff -- apps/web/app/pricing/page.tsx` is empty
- [x] No real credential values of any kind appear in the diff; documented
      example values are recognisable placeholders only
- [x] `plans/README.md` row updated

## STOP conditions

Stop and report if:

- The operator's intent is that a missing `NEXT_PUBLIC_LAUNCH_MODE` **must** hard
  fail in the browser. That is a defensible position, but then the fix is to
  guarantee the variable at build time and the client components should not call
  this accessor at all — a different change to the one written here.
- `apps/web/app/pricing/page.tsx` changes from its committed `7cef97c` state
  while you work.
- You find a third client-side caller of `isEarlyAccess`/`isPaidLaunch` not
  listed in "Current state".

## Maintenance notes

- The general rule this encodes: a `NEXT_PUBLIC_*` accessor that can throw must
  never be called from a client component, because the value is fixed at build
  time and the failure surfaces as a hydration crash rather than a config error.
  A reviewer should apply that rule to any new `NEXT_PUBLIC_*` accessor.
- Once this lands, `force-dynamic` on the pricing page may no longer be needed.
  Removing it is a separate, verifiable change — do not fold it in here.
- Consider generating the `.env.example` files from the union of the `keys.ts`
  schemas and `preflight.ts`, so this cannot drift again. Deliberately deferred.
