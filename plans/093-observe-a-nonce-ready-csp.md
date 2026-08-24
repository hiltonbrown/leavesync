# Plan 093: Observe a nonce-ready Content Security Policy

> **Executor instructions**: Keep the policy report-only. This plan creates the
> evidence required by Plan 094 and must not switch to enforcement.
>
> **Drift check (run first)**:
> `git diff --stat ecd49f5..HEAD -- apps/app/next.config.ts apps/app/proxy.ts apps/app/app/layout.tsx apps/app/app/api/csp-report packages/auth/proxy.ts packages/design-system/index.tsx packages/design-system/providers/theme.tsx packages/analytics/provider.tsx apps/app/lib/public-api-url.ts packages/notifications/components/provider.tsx packages/observability`
> Stop on a changed proxy composition, report route collision or different
> analytics/theme provider.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: `plans/057-make-failures-visible-and-scrub-what-is-logged.md` DONE
- **Category**: security
- **Planned at**: commit `ecd49f5`, 2026-08-24; re-stamp after Plan 057
- **Execution status**: TODO
- **Supersedes**: observation phase of rejected Plan 062

## Why this matters

The current static report-only policy has no sink and permits unsafe script
execution. Enforcing a nonce policy without first exercising Clerk, theme
bootstrap, analytics, Sentry, PostHog and cross-origin notification SSE would
turn runtime-only omissions into an outage.

## Current state

- `apps/app/next.config.ts:16-42` emits a static report-only CSP with
  `unsafe-inline`, `unsafe-eval` and no report destination.
- `apps/app/proxy.ts` exports the bare Clerk `authMiddleware()` composition.
- `apps/app/app/layout.tsx:17-35` does not obtain or pass a request nonce.
- `packages/design-system/providers/theme.tsx:6-18` wraps `next-themes`, whose
  bootstrap supports a nonce.
- `packages/analytics/provider.tsx:12-18` renders Vercel Analytics and optional
  Google Analytics. Notification SSE uses the validated public API origin.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Focused | `bunx vitest run apps/app/app/api/csp-report/route.test.ts apps/app/proxy.test.ts` | route and nonce/header tests pass |
| App tests | `bunx vitest run apps/app` | app suite passes |
| Gates | `bun run check && bun run typecheck && bun run test && bun run test:integration && bun run build && git diff --check` | every command exits 0 |
| Browser | `bun run dev` plus authenticated browser verification | named flows work and reports contain no sensitive fields |

## Scope

The authenticated app proxy/layout/configuration, a same-origin app report
route, scrubbed operational logging, and browser verification. The JSON API is
not a document CSP surface. Source references:
<https://nextjs.org/docs/app/guides/content-security-policy> and
<https://nextjs.org/docs/app/getting-started/proxy>.

**In-scope files**: drift-check paths, new route/proxy tests, and
`plans/093-csp-observation.md`. **Out of scope**: enforcing the header, API-app
CSP, marketing-site CSP, WAF changes and removal of style `unsafe-inline`.

## Git workflow

- Branch: `security/093-observe-nonce-csp`
- Commit: `feat(app): observe nonce content security policy`
- Do not push or open a pull request unless instructed.

## Steps

1. Add a public `apps/app/app/api/csp-report/route.ts` with a strict body-size
   limit and Zod support for standard CSP media shapes. Return 204 for accepted
   or safely discarded input. Never log raw bodies, headers, cookies or IDs.
2. Allowlist only operational fields. Remove query strings/fragments from
   reported URIs and pass the result through the shared production scrubber.
3. Compose nonce generation with Clerk proxy behaviour. Put the report-only CSP
   on forwarded request headers and the response, then thread the nonce to the
   root theme provider so the `next-themes` bootstrap can use it. Record and
   test the deliberate Next.js trade-off: nonce-based CSP makes the affected
   route tree dynamically rendered and removes static optimisation, ISR and PPR.
4. Add `Reporting-Endpoints`, `report-to` and `report-uri`. Derive the API origin
   from validated public environment configuration. Inventory Clerk/Cloudflare,
   next-themes, Google Analytics, Vercel Analytics, Sentry tunnel, same-origin
   PostHog rewrites and notification SSE. Do not invent an availability browser
   fetch that source search does not show.
5. In the production candidate policy, remove script `unsafe-inline` and
   `unsafe-eval` and use the request nonce. Development may retain
   `unsafe-eval` only behind an explicit environment branch. Keep
   `Content-Security-Policy-Report-Only`, deploy, and record a seven-day
   observation covering authenticated traffic and all flows named above.
6. Add route abuse/schema tests, header/nonce tests and authenticated browser
   checks; run all repository-required gates.

The sink accepts `application/csp-report`, `application/reports+json` and
`application/json` up to 16 KiB. Oversize returns 413; malformed/unsupported
reports are safely discarded with 204 to prevent retry amplification. Log only
`effectiveDirective`, `disposition`, numeric status/line/column, and parsed
document/blocked/source origins. Strip paths, queries, fragments, samples,
original policy, referrer and raw bodies.

Generate one base64 nonce per request in `apps/app/proxy.ts`, while preserving
Clerk middleware. Set `x-nonce` and the report-only CSP on forwarded request
headers, and the same CSP plus `Reporting-Endpoints` on the response. The root
layout reads `x-nonce` and passes it through `DesignSystemProvider` to
`ThemeProvider`. Use `Reporting-Endpoints: csp-endpoint="/api/csp-report"` with
CSP directives `report-to csp-endpoint; report-uri /api/csp-report`. The report
sink remains same-origin; the validated API origin is added only to
`connect-src`. Remove the static CSP entry from `apps/app/next.config.ts` so each
response has exactly one request-specific policy.

Write `plans/093-csp-observation.md` with deployment URL/class, commit SHA,
exact policy hash, start/end timestamps, browser versions, each exercised flow,
normalised violation counts/dispositions, every remediation reference and final
reviewer acceptance. Never include raw report bodies, full URLs or identifiers.

## Step verification

| After step | Verification | Expected result |
|---|---|---|
| 1 | route test | accepted/discarded shapes return 204; oversize input is bounded |
| 2 | route test with malicious URLs/fields | logs contain only allowlisted, query-free operational fields |
| 3 | proxy test | one nonce appears consistently in request and response policy |
| 4 | app tests and header assertion | candidate directives cover the evidenced integrations and validated API origin |
| 5 | deployed observation record | seven dated days, named flows, zero unexplained violations |
| 6 | browser and full gates commands | all pass; development listeners are stopped |

## Test plan

Create `route.test.ts` beside the report route and a focused proxy/header test.
Cover both standard report shapes, invalid JSON, excessive body, dangerous URL
components, log-field allowlisting, per-request nonce uniqueness, request/
response parity, production/dev directives and missing optional analytics.

## Done criteria

- [ ] Reports reach the first-party sink without collecting sensitive payloads.
- [ ] One nonce is forwarded and emitted consistently per request.
- [ ] Required browser integrations are explicitly exercised.
- [ ] Seven days of unexplained-violation-free evidence is recorded for 094.
- [ ] All required gates pass.

## STOP conditions

Stop if CSP reporting can expose raw URLs or user data, Clerk proxy composition
is ambiguous, or the nonce path cannot be covered by request/response tests.

## Maintenance notes

Any new third-party script, frame, worker, font or browser connection is a CSP
change. Review Plan 093's reporting privacy contract before adding fields.
