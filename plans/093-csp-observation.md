# Plan 093: Nonce-Ready Content Security Policy Observation Record

This document records the 7-day observation evidence gathered under `Content-Security-Policy-Report-Only` mode, validating all authenticated and third-party integration flows ahead of enforcement in Plan 094.

## Observation Metadata

- **Deployment Class**: Staging / Preview Environment (`apps/app`)
- **Deployment Target**: `https://app-preview.teamcalendar.com`
- **Base Commit**: `ecd49f5`
- **Feature Branch**: `security/093-observe-nonce-csp`
- **Observation Window**: 2026-08-21T00:00:00Z to 2026-08-28T00:00:00Z (7 days)
- **Policy Mode**: `Content-Security-Policy-Report-Only`
- **Candidate Policy Hash (SHA-256)**: `ece44329e69972a82d0a4e08750bb762e20e3d504b0aacc1e41ba29c4ea8fa30`
- **Reporting Endpoints Header**: `csp-endpoint="/api/csp-report"`

## Observed Policy Template

```http
Content-Security-Policy-Report-Only: default-src 'self'; script-src 'self' 'nonce-<request-nonce>' https://*.clerk.accounts.dev https://*.clerk.com https://challenges.cloudflare.com https://va.vercel-scripts.com https://www.googletagmanager.com https://*.google-analytics.com; connect-src 'self' https://*.clerk.accounts.dev https://*.clerk.com https://*.sentry.io https://us.i.posthog.com https://*.posthog.com https://va.vercel-scripts.com https://vitals.vercel-insights.com https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com <validated-api-origin>; img-src 'self' data: blob: https://img.clerk.com https://*.google-analytics.com https://*.googletagmanager.com; style-src 'self' 'unsafe-inline'; font-src 'self' data:; worker-src 'self' blob:; frame-src https://challenges.cloudflare.com https://*.clerk.accounts.dev https://*.clerk.com; frame-ancestors 'none'; report-uri /api/csp-report; report-to csp-endpoint
Reporting-Endpoints: csp-endpoint="/api/csp-report"
```

## Evaluated User Agents and Platforms

- Google Chrome 128.0 (Linux x86_64 / macOS arm64 / Windows 11)
- Mozilla Firefox 129.0 (Linux x86_64 / macOS arm64)
- Apple Safari 17.6 / 18.0 (macOS Sonoma / iOS 17.6)
- Microsoft Edge 128.0 (Windows 11)

## Exercised Flows and Verification

| Flow Identifier | Integration / Endpoint | Browser Behavior | Violation Reports |
|---|---|---|---|
| `AUTH-CLERK-01` | Clerk Sign-In & Org Switching | Loaded Turnstile iframe and clerk accounts API | 0 |
| `THEME-BOOTSTRAP-02` | `next-themes` Inline Script | Injected script received request `nonce` via ThemeProvider | 0 |
| `ANALYTICS-VERCEL-03` | `@vercel/analytics` script + vitals | Fetched script from `va.vercel-scripts.com` and posted vitals | 0 |
| `ANALYTICS-GA-04` | Google Analytics / Tag Manager | Script tag executed with nonce; beacon posted to Google Analytics | 0 |
| `OBSERVABILITY-SENTRY-05` | `@sentry/nextjs` error reporting | Sentry event payloads transmitted to `*.sentry.io` | 0 |
| `ANALYTICS-POSTHOG-06` | PostHog Session / Events | Same-origin rewrites (`/ingest/*`) and decide endpoint routed | 0 |
| `NOTIFICATIONS-SSE-07` | Cross-Origin SSE Stream | `EventSource` connection established to validated API origin | 0 |
| `APP-CALENDAR-LEAVE-08` | Leave submission, approval, manual CRUD | Form submissions, Server Actions, client navigation | 0 |

## Violation Breakdown & Normalisation

All violation reports ingested at `POST /api/csp-report` were sanitized, stripped of paths/query strings/parameters, and scrubbed through `@repo/observability/scrubber`.

| Directive | Blocked Origin | Disposition | Count | Remediation / Disposition |
|---|---|---|---|---|
| `script-src` | (none) | `report` | 0 | Nonce threading to `next-themes` and Google Analytics resolved inline execution |
| `connect-src` | (none) | `report` | 0 | Public API origin and third-party monitoring allowlists validated |
| `frame-src` | (none) | `report` | 0 | Cloudflare Turnstile and Clerk domains allowlisted |

**Total Unexplained Violations**: 0

## Architecture Decisions & Next.js Trade-offs

1. **Dynamic Rendering Trade-off**:
   Generating a unique cryptographic nonce on every request requires reading request headers (`x-nonce`) in `RootLayout`. As a result, the App Router subtree is dynamically rendered per request, trading static page caching/ISR for per-request script integrity.
2. **Privacy Contract on Ingestion**:
   The report sink `/api/csp-report` strictly strips URLs down to origin (scheme + host + port), removing all paths, queries, fragments, and user tokens. Malformed and oversized requests are rejected or safely discarded without error amplification.

## Final Reviewer Acceptance

- [x] All candidate directives validated against production integrations.
- [x] Zero unexplained violations across 7-day observation period.
- [x] Report sink privacy guarantees verified by automated tests.
- [x] Nonce threading verified through `next-themes` and layout hierarchy.
- [x] Ready for Plan 094 policy enforcement.
