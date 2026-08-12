# Plan 062: Make the Content Security Policy real

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the next
> step. If anything in "STOP conditions" occurs, stop and report — do not
> improvise. When done, update this plan's row in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 121da2a..HEAD -- apps/app/next.config.ts packages/next-config/index.ts`
> If any in-scope file changed, compare the "Current state" excerpts against the
> live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `121da2a`, 2026-08-12
- **Covers findings**: S-02

## Why this matters

The authenticated product UI ships its policy as
`Content-Security-Policy-Report-Only`, which instructs the browser to enforce
nothing. There is no `report-uri` or `report-to` directive either, so it is not
even collecting violations — the header is completely inert.

The policy it *would* enforce allows both `'unsafe-inline'` and `'unsafe-eval'`
in `script-src`, and its `connect-src` omits the API origin, so enforcing it
today would break the SSE stream and the availability fetches. That stale
`connect-src` is the evidence that the policy has never been tested against real
traffic, which is presumably why it has stayed in report-only.

Meanwhile `apps/app` is the one browser surface that renders plaintext feed
tokens, employee leave PII and Clerk session state, and `apps/api` has no CSP at
all. Neither app sends HSTS.

This plan is staged deliberately: observe, then fix, then enforce. Flipping the
header in one step would take out the product.

## Current state

`apps/app/next.config.ts:16-25`:

```ts
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.accounts.dev https://*.clerk.com https://challenges.cloudflare.com",
  "connect-src 'self' https://*.clerk.accounts.dev https://*.clerk.com https://*.sentry.io https://us.i.posthog.com",
  "img-src 'self' data: blob: https://img.clerk.com",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "worker-src 'self' blob:",
  "frame-src https://challenges.cloudflare.com",
  "frame-ancestors 'none'",
].join("; ");
```

`apps/app/next.config.ts:28-42` attaches it under the report-only header name:

```ts
headers: [
  ...securityHeaders,
  {
    key: "Content-Security-Policy-Report-Only",
    value: contentSecurityPolicy,
  },
],
source: "/(.*)",
```

`packages/next-config/index.ts:5-13` — the shared `securityHeaders` array holds
`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` and
`Permissions-Policy`. No CSP, no `Strict-Transport-Security`.

The plaintext feed token surface is
`apps/app/components/feed/one-time-token-panel.tsx`.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Lint | `bun run check` | exit 0 |
| Typecheck | `bun run typecheck` | exit 0 |
| Unit tests | `bun run test` | exit 0, 17/17 tasks |
| Build | `bun run build` | exit 0, 4/4 tasks |
| Dev server | `bun run dev` | app on :3000, api on :3002 |

## Scope

**In scope**:
- `apps/app/next.config.ts`
- `packages/next-config/index.ts`
- `apps/api/next.config.ts`
- a new test asserting the header set

**Out of scope**:
- Removing `'unsafe-inline'` from `style-src`. Tailwind and the design system
  make that a much larger change; leave it and note it.
- Vercel Firewall or WAF configuration. Platform-side, not repo-side.
- `apps/web`. The marketing site has a different risk profile and no session
  state; extend to it afterwards if the operator wants.

## Git workflow

- Branch: `advisor/062-enforce-csp`
- Conventional commits, e.g. `fix(app): make the content security policy enforceable`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Make report-only actually report

Add a `report-to` (and `report-uri` for older browser support) directive so
violations are collected. Point it at the Sentry CSP reporting endpoint if the
project has one configured, otherwise at a route in `apps/api` that logs
violations through the observability logger.

Until this step exists, every later step is guesswork. Do not skip it.

**Verify**: `bun run build` → exit 0. Load the app locally and confirm the
response carries a `Content-Security-Policy-Report-Only` header containing the
reporting directive (`curl -sI http://localhost:3000/ | grep -i content-security`).

### Step 2: Fix `connect-src` so the policy is survivable

Add the `apps/api` origin to `connect-src`, sourced from the same environment
value the app already uses to build API URLs — do not hard-code a hostname.

Exercise the authenticated shell locally with the browser console open and
confirm zero CSP violations are reported for: the SSE notification stream, an
availability create/update, a feed preview, and a Xero settings page load.

**Verify**: browser console shows no CSP violation reports on those four flows.

### Step 3: Add HSTS to the shared header set

Add `Strict-Transport-Security` to `securityHeaders` in
`packages/next-config/index.ts` so all three apps inherit it. Use a conservative
`max-age` to begin with and do **not** add `preload` — preload is effectively
irreversible and is an operator decision.

**Verify**: `bun run build` → exit 0; the header appears on responses from both
`apps/app` and `apps/api`.

### Step 4: Replace `'unsafe-inline'`/`'unsafe-eval'` in `script-src` with a nonce

Generate a per-request nonce in `apps/app/proxy.ts` and thread it into the CSP
header and Next's script tags. Remove `'unsafe-eval'` first and confirm the app
still works, then `'unsafe-inline'` — they fail differently and diagnosing both
at once is painful.

If Clerk's widgets require an allowance that cannot be expressed with a nonce,
STOP and report exactly which directive and which widget, rather than restoring
a blanket `'unsafe-*'`.

**Verify**: the four flows from Step 2 still work with no console violations.

### Step 5: Enforce

Rename the header from `Content-Security-Policy-Report-Only` to
`Content-Security-Policy`. Keep the reporting directive in place — enforcement
without reporting is how a policy silently breaks a minority browser.

**Verify**: `curl -sI http://localhost:3000/ | grep -i content-security` shows
the enforcing header name; the four flows still work; `bun run build` exit 0.

## Test plan

- a unit test asserting `securityHeaders` contains `Strict-Transport-Security`
- a unit test asserting the app's header list uses the enforcing CSP key and
  that its `connect-src` includes the API origin
- a unit test asserting `script-src` contains neither `'unsafe-eval'` nor
  `'unsafe-inline'`
- manual: the four flows in Step 2, recorded in the report with the browser and
  version used

Verification: `bun run test` → exit 0, with at least 3 new tests.

## Done criteria

ALL must hold:

- [ ] `bun run check` exits 0
- [ ] `bun run typecheck` exits 0
- [ ] `bun run test` exits 0, 17/17 tasks, with at least 3 new tests
- [ ] `bun run build` exits 0, 4/4 tasks
- [ ] `grep -c "Content-Security-Policy-Report-Only" apps/app/next.config.ts` prints `0`
- [ ] `grep -c "unsafe-eval" apps/app/next.config.ts` prints `0`
- [ ] `grep -c "Strict-Transport-Security" packages/next-config/index.ts` prints 1 or more
- [ ] The report includes the four manual flows, the browser used, and confirmation
      of zero CSP violations
- [ ] `plans/README.md` row updated

## STOP conditions

Stop and report if:

- Clerk, PostHog or Sentry require an allowance incompatible with a nonce.
  Report the directive and the vendor; do not restore a blanket `'unsafe-*'`
  and call the plan done.
- No CSP reporting sink is available. Enforcing a policy with no violation
  feedback is worse than the status quo — stop after Step 3 and report.
- You cannot run the app locally to exercise the four flows. This plan cannot be
  honestly verified by static inspection; say so rather than marking it done.
- `bun run dev` leaves listeners running — stop every app before handing back
  (ports 3000-3003).

## Maintenance notes

- Any new third-party script, font source or API origin needs a CSP directive
  update. A reviewer should treat "added a script tag" as a CSP change.
- `style-src 'unsafe-inline'` remains, deliberately. Removing it means changing
  how Tailwind and the design system emit styles, and should be its own plan.
- If violation reports spike after enforcement, the reporting endpoint from
  Step 1 is the diagnostic — do not revert to report-only without reading it.
