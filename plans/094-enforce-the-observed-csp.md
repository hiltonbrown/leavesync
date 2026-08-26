# Plan 094: Enforce the observed Content Security Policy

> **Executor instructions**: This is the enforcement phase. Do not start until
> Plan 093 is DONE and its observation record has no unexplained violation.
>
> **Drift check (run first)**:
> `git diff --stat ecd49f5..HEAD -- apps/app/next.config.ts apps/app/proxy.ts apps/app/app/layout.tsx apps/app/app/api/csp-report packages/design-system/providers/theme.tsx plans/093-csp-observation.md`
> Plan 093 changes are expected; any unrelated policy/provider drift is a STOP
> condition until the observation is repeated.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: MED
- **Depends on**: `plans/093-observe-a-nonce-ready-csp.md` DONE plus `plans/093-csp-observation.md` accepted
- **Category**: security
- **Planned at**: commit `ecd49f5`, 2026-08-24; re-stamp after Plan 093
- **Execution status**: TODO
- **Supersedes**: enforcement phase of rejected Plan 062

## Why this matters

Plan 093 makes violations observable but still asks the browser not to block
them. Enforcement closes the script-injection gap only after the exact candidate
has demonstrated compatibility with real authenticated flows.

## Current state

The required handoff is a DONE Plan 093 implementation plus
`plans/093-csp-observation.md` identifying deployment, dates, browser versions,
flows and zero unexplained violations. The live header must still be
`Content-Security-Policy-Report-Only`; its production script policy must already
exclude both unsafe script keywords.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Contract search | `rg -n "Content-Security-Policy|unsafe-inline|unsafe-eval" apps/app plans/093-csp-observation.md` | one enforcing header after change; unsafe script terms absent from production policy |
| App tests | `bunx vitest run apps/app` | header/proxy/report tests pass |
| Gates | `bun run check && bun run typecheck && bun run test && bun run test:integration && bun run build && git diff --check` | every command exits 0 |
| Browser | authenticated deployed verification | every named flow passes without unexplained reports |

## Scope

Change only the app CSP header selection and its focused test. Reporting, nonce plumbing and the
observation file are read-only handoff evidence. Do not broaden sources, change
the JSON API or marketing site, or remove style `unsafe-inline`.

## Git workflow

- Base branch: `preview` (`origin/preview`), not `main`. Branch from `preview`, commit there, and land the finished work on `preview` — see `plans/README.md` § Execution policy.
- Work directly in this working tree. No isolated git worktree is used for this repo's plan executions.
- Branch: `security/094-enforce-csp`
- Commit: `fix(app): enforce observed content security policy`
- Do not push or open a pull request unless instructed.

## Steps

1. Re-run the full authenticated browser matrix from Plan 093 against the exact
   candidate policy. Resolve every violation by correcting the producing code
   or a narrowly justified source directive, never by adding a wildcard.
2. Confirm the observed production policy still excludes `unsafe-eval` and
   script `unsafe-inline`. Retain only the proven nonce-based script contract.
   Keep style allowances no broader than required.
3. Change the app header to `Content-Security-Policy`; retain reporting
   directives and the bounded first-party sink for regression evidence.
4. Verify sign-in/challenge, theme bootstrap, SSE, feed preview, availability
   mutation, Xero settings, configured analytics, Sentry and PostHog in the
   deployed authenticated lane.
5. Run header tests, browser checks and all repository-required gates.

Do not absorb unbounded remediation here. Any unexplained violation stops this
plan and creates a separate reviewed fix; after that fix, repeat Plan 093's
observation window. `unsafe-inline` is forbidden in `script-src` only; the
observed `style-src 'unsafe-inline'` remains explicitly out of scope.

## Step verification

1. The observation file and a fresh report-only browser run cover every named
   flow with zero unexplained violation.
2. The contract search proves the production script directive contains neither
   unsafe keyword.
3. The focused header test fails before and passes after selecting the enforcing
   header, while reporting directives remain.
4. The deployed browser matrix passes and the report sink receives no new
   unexplained violation.
5. App tests and every full gate exit 0.

## Test plan

Extend Plan 093's focused header test to assert the enforcing key, nonce,
reporting directives and absence of unsafe production script sources. Repeat the
same authenticated browser matrix and record the post-enforcement deployment.

## Done criteria

- [ ] The observation artefact identifies environment, dates and exercised flows.
- [ ] The authenticated app emits an enforcing nonce policy.
- [ ] Header tests prove exactly one enforcing CSP header, zero report-only CSP
      headers, and a still-operational report endpoint.
- [ ] Script `unsafe-inline` and `unsafe-eval` are absent.
- [ ] Reporting remains privacy-safe and operational after enforcement.
- [ ] Every browser and repository gate passes.

## STOP conditions

Stop before editing if Plan 093 or its evidence is incomplete. Stop deployment
if any required authenticated flow reports or demonstrates a policy violation.

## Maintenance notes

Keep reporting after enforcement. Treat any future source-list broadening as a
security change requiring a concrete producing integration and browser proof.
