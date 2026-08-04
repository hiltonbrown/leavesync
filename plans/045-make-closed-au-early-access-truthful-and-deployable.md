# Plan 045: Make closed AU early access truthful and deployable

> **Executor instructions**: Implement the explicit early-access launch mode
> before changing public copy or billing affordances. Do not enable paid
> checkout as part of this plan. Run every verification command and update this
> plan's row in `plans/README.md` when complete.
>
> **Drift check (run first)**:
> `git diff --stat b261792..HEAD -- apps/web/app/pricing apps/web/app/contact apps/web/src/lib/auth-links.ts apps/app/app packages/next-config README.md`
> Reconcile any launch-mode, pricing, legal-link or production-env work that has
> landed since this plan was written.

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: MED
- **Depends on**: none for implementation; blocks plan 046
- **Category**: direction, launch, operations
- **Planned at**: commit `b261792`, 2026-08-04

## Why this matters

The repository currently presents a mixture of early-access, paid and
production-ready states. The pricing page advertises firm plans but its lead
form discards submissions, the contact page has no working contact path,
billing controls can appear when Stripe is not configured, and several app
legal links do not match the marketing site's real routes. Core service keys
are also optional at build time, so a production deployment can succeed while
authentication, Xero sync, jobs, email or feeds are unusable.

The first go-live should be a closed, AU-only early access with guided
onboarding and no self-service paid checkout. This plan makes that state
explicit and fail-safe. General availability and paid launch remain separate
product decisions.

## Launch decision to encode

Use an explicit public launch mode with two values:

```text
early_access
paid
```

For this release, production must use `early_access`:

- AU Payroll only;
- customers admitted and onboarded by the Team Calendar team;
- no self-service checkout, plan change or billing portal;
- pricing described as early-access availability, without firm recurring
  charges;
- one monitored support address and a published response-hours statement;
- the existing help centre expanded into a concise onboarding path.

Do not infer launch mode from whether a Stripe variable happens to exist. Paid
mode must be an explicit later switch with its own preflight requirements.

## Current state

- `apps/web/app/pricing/constants.ts:29,47` links the Basic and Premium CTAs to
  `/sign-up` even though `apps/web/src/lib/auth-links.ts:23` already exposes the
  canonical cross-origin sign-up URL.
- `apps/web/app/pricing/components/pricing-experience.tsx:207-231` prevents the
  form submission and displays success without storing or sending the lead.
- `apps/web/app/contact/components/contact-form.tsx:80-142` renders controls
  that are not a form, never call the existing
  `apps/web/app/contact/actions/contact.tsx` action, and include an unrelated
  upload interaction.
- App footer/legal links use `/legal/privacy` and `/legal/terms`, while the web
  app provides `/privacy-policy` and `/terms-of-service`.
- Clerk, Xero OAuth, Inngest, Resend, Stripe and observability variables are
  optional in several package env schemas. `apps/api/app/health/route.ts`
  returns 200 without checking required dependencies.
- `apps/docs` remains starter content. The app now points at the web help
  centre, which can carry the minimum early-access onboarding material.
- Sentry client and server configuration samples all traces and captures a
  broad replay share. Production sampling and server-local capture are not
  explicitly constrained.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Web tests | `bunx vitest run apps/web` | all web tests pass |
| App tests | `bunx vitest run apps/app` | all app tests pass |
| API tests | `bunx vitest run apps/api` | all API tests pass |
| Lint | `bun run check` | exit 0 |
| Typecheck | `bun run typecheck` | exit 0 |
| Tests | `bun run test` | exit 0 |
| Integration | `bun run test:integration` | exit 0 against a disposable database |
| Build | `bun run build` | exit 0 with synthetic early-access production values |

## Scope

**In scope:**

- a shared, Zod-validated launch-mode setting available to `app` and `web`;
- production preflight validation by deployed app and launch mode;
- truthful early-access pricing and contact CTAs;
- removal of non-functional form success states;
- hiding paid billing actions in early-access mode;
- correction of privacy and terms URLs;
- an early-access onboarding and support page in the existing help centre;
- environment-aware Sentry sampling and disabling server-local capture;
- tests, environment examples and operator documentation for these behaviours.

**Out of scope:**

- implementing a CRM, mailing-list provider or bespoke lead database;
- enabling Stripe checkout or charging early-access tenants;
- rewriting legal terms without approval from the accountable business owner;
- completing or publishing the Mintlify documentation application;
- NZ or UK payroll support;
- production secret values in source control, logs or test snapshots.

## Git workflow

- Branch: `feat/closed-au-early-access-mode`
- Commits:
  1. `feat(config): add explicit launch mode and production preflight`
  2. `feat(web): make early-access acquisition paths truthful`
  3. `feat(app): gate paid billing and correct support links`
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Add one explicit launch-mode contract

Add a Zod enum for `NEXT_PUBLIC_LAUNCH_MODE` in the shared configuration path
used by both `apps/app` and `apps/web`. Add it to each relevant env schema and
example. Production has no implicit default. Development and test may default
to `early_access` only if the existing env helper supports defaults without
weakening production validation.

Expose named helpers such as `isEarlyAccess()` rather than comparing raw
strings throughout components. Keep the helper server-safe and client-safe;
the setting is public and must contain no secret.

Add focused tests for accepted values, a missing production value and an
invalid value.

**Verify**: focused env/config tests pass and no package defines a second launch
mode.

### Step 2: Add a production preflight per deployed application

Create one small preflight module or script that accepts the deployed app name
and launch mode, then validates only variable presence and valid public URLs.
It must never print values. Wire it into production builds without making
ordinary local unit tests require real credentials.

At minimum, early-access production requires:

- all apps: explicit launch mode, canonical app/web/API URLs and Sentry DSN;
- `app`: database URL, Xero encryption and OAuth credentials, Clerk
  public/secret keys and KV credentials;
- `api`: database URL, Xero encryption/OAuth credentials, Clerk keys and
  webhook secret, both Inngest credentials, KV credentials and Resend
  credentials;
- `web`: canonical URLs and the monitored support address.

Paid mode additionally requires the complete Stripe key, webhook and price-ID
set. Validate pairs atomically. A half-configured integration must fail the
preflight with variable names only, never values.

Update `README.md` with the authoritative per-project matrix and a safe command
for an operator to run the preflight before deployment.

**Verify**: table-driven tests prove each missing dependency fails the correct
app and mode, and no error or snapshot contains a secret value.

### Step 3: Make public early-access journeys functional

In early-access mode:

- replace firm Basic and Premium prices with one clear closed early-access
  offer;
- use `signUpHref` for the authorised sign-up CTA;
- replace the fake lead form with a direct monitored support/contact link or a
  real server-side submission path already approved by the owner;
- remove the fake success state and unrelated file upload;
- state AU Payroll scope, guided onboarding, support hours and that pricing
  will be confirmed before any future charge.

Do not introduce a new data processor for lead capture without a privacy and
ownership decision. A tested `mailto:` route to the configured support address
is acceptable for the closed cohort.

Paid mode may retain plan cards, but its CTA must remain disabled until Stripe
preflight succeeds and the business owner approves public pricing.

**Verify**: component tests assert that early-access mode contains no price,
checkout or false-success UI and that every CTA resolves to the intended app or
support URL.

### Step 4: Gate product billing and repair trust links

Hide checkout, plan-change and customer-portal actions in early-access mode.
Replace them with the support path and a concise early-access status. Enforce
the same rule in server actions so a guessed action URL cannot create a paid
session.

Replace `/legal/privacy` and `/legal/terms` with canonical `webUrl()` links to
`/privacy-policy` and `/terms-of-service`. Search the repository for all old
paths and add a regression test for the final link destinations.

Do not rewrite legal promises in code. Instead, record as a release approval in
plan 046 that the owner has confirmed the privacy request channel, retention
practice, subprocessors and early-access commercial terms.

**Verify**: early-access billing actions fail closed server-side and every
public legal link resolves to a route that exists in `apps/web`.

### Step 5: Publish the minimum guided-onboarding help path

Add a focused help-centre path covering:

1. joining the correct Clerk Organisation;
2. connecting an AU Xero organisation;
3. confirming the first people, leave and balance sync;
4. linking people and assigning manager roles;
5. submitting, approving and declining leave;
6. creating and revoking a calendar feed;
7. privacy modes and what a subscriber can see;
8. how to report a sync, payroll-write or privacy incident.

Link it from the app and early-access pricing/contact surfaces. Keep starter
Mintlify content out of the user journey.

**Verify**: every help link resolves and the instructions match the current UI
labels and AU-only feature set.

### Step 6: Set bounded production telemetry defaults

Make Sentry trace and replay sampling explicit by environment. Use conservative
production defaults that can be overridden through validated numeric env vars.
Disable server-local capture. Ensure tokens, OAuth codes, cookies, raw Xero
payloads and personal calendar details are filtered before events leave the
process.

Document the owner and alert destination for authentication, Xero OAuth, sync
freshness, feed 5xx and webhook failures. External alert creation is an
operator action in plan 046, not a source-code side effect here.

**Verify**: config tests cover production defaults and the event scrubber;
search tests prove representative token and payload keys are removed.

### Step 7: Run the full repository gates

Run every applicable command in the table. Run the production preflight and
build once with synthetic non-secret values matching each deployed app. Review
the final diff for literal secrets, copied legal text and accidental paid-mode
activation.

## Test plan

- Launch-mode parsing in development, test and production.
- Per-app early-access and paid preflight matrices.
- No secret values in preflight errors or logs.
- Early-access pricing, contact, app billing and help-centre rendering.
- Server-side billing fail-closed behaviour.
- Canonical sign-up, privacy, terms and support URLs.
- Sentry sampling and sensitive-data filtering.
- Full unit, integration, typecheck, lint and production build gates.

## Done criteria

- [ ] Production cannot build without explicit launch mode and core service
      configuration.
- [ ] Early-access UI contains no paid checkout or misleading form success.
- [ ] Sign-up, support, privacy and terms links resolve correctly.
- [ ] Paid billing is hidden and blocked server-side in early-access mode.
- [ ] The help centre supports the complete guided AU onboarding journey.
- [ ] Telemetry has bounded sampling and tested sensitive-data filtering.
- [ ] The environment matrix and operator preflight are documented.
- [ ] All repository gates pass.

## STOP conditions

- The business owner chooses paid general availability instead of closed early
  access. Replace this plan rather than hiding that decision in copy changes.
- No monitored support address and accountable responder are available.
- Legal review requires different privacy, retention or commercial terms.
- A core integration has no production credentials or owner.
- Production preflight would require embedding or printing real secrets.

## Maintenance notes

Launch mode is a business control, not an integration-detection shortcut. A
future switch to `paid` requires a separate acceptance decision, current
pricing and terms, successful Stripe checkout and webhook tests, and a rollback
path. Remove early-access branching only after all supported tenants have been
migrated deliberately.
