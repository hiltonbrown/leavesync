# Plan 128: Build a trustworthy Better Stack status page

> **Executor instructions**: Implement this plan as one vertical slice. Follow
> every step in order, keep provider data server-only, and run every verification
> gate. If a STOP condition occurs, stop and report rather than improvising.
> Update only this plan's status row in `plans/README.md` after execution.
>
> **Drift check (run first)**:
> `git diff --stat e7ee7c7..HEAD -- packages/observability/status packages/observability/keys.ts packages/observability/package.json apps/web/app/status apps/web/src/data/support.ts apps/web/src/data/support.test.ts apps/web/app/styles/style-loading.test.ts apps/web/.env.example apps/app/.env.example apps/api/.env.example README.md bun.lock`
>
> Drift produced by completed Plans 117, 118, 120, 121 and 122 is expected only
> when it matches those plans. Plan 128 must consume their shared contracts, not
> overwrite them.

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: MED
- **Depends on**: Plans 121 and 122 DONE
- **Category**: direction, correctness, accessibility, performance, observability, tests
- **Planned at**: commit `e7ee7c7`, 2026-08-30

## Why this matters

`/status` currently describes three broad areas but never reports whether Team
Calendar is operational. A visitor cannot distinguish a healthy service from an
unmaintained page, identify an acknowledged incident, subscribe to updates or
report an unlisted issue without remembering diagnostic details.

The repository already exposes a server-only Better Stack component, but it
reads every private monitor, trusts an unchecked response cast, divides by an
empty collection, collapses maintenance and paused states into outage maths, and
can report “All systems normal” for an empty response. It is not safe to place on
a public status page.

After this plan lands, `/status` will remain inside the complete shared
marketing header and footer while becoming a focused operational Read surface.
Better Stack status-page resources and status reports will be the sole source of
public health and incident truth. Missing, stale or malformed provider data will
render an explicit Unknown state, never a false green state.

## Approved Impeccable shape brief

- **Job and audience**: A customer, usually an HR administrator or operations
  manager, arrives concerned and time-constrained. Within five seconds they need
  to know whether Team Calendar is healthy, what customer outcome is affected,
  when the state was checked and what to do next.
- **Outcome and proof**: Show overall health, five customer-facing component
  states, active incident updates, recent resolved incidents, a Better Stack
  subscription path and a prefilled support email. Every displayed state is
  backed by validated Better Stack status-page data.
- **Selected direction**: Keep the full marketing shell. Replace the generic
  hero, feature cards and passive email callout with a compact operational
  hierarchy: identity and overall state, freshness/subscription, component
  health, active incidents, recent history, then issue reporting.
- **Scope and boundaries**: Use the existing brand, tokens, typography, themes,
  header and footer. Strengthen shared contracts only through already-approved
  prerequisite plans. Do not create a status-specific shell, monitoring backend,
  authenticated status route, CRM form or custom incident editor.
- **States and ranges**: Five public components; normally zero active incidents,
  up to three simultaneous active reports, up to ten recent resolved reports,
  and multiple timestamped updates per report. Cover operational, degraded,
  partial outage, major outage, maintenance, unknown, stale, unconfigured,
  malformed, empty and provider-failure states.
- **Interaction and layout**: Use a focusable main landmark, one h1, plain state
  labels, semantic time values, compact status rows, incident articles and a
  prominent prefilled email action. Colour always pairs with text and an icon.
  Reading measure stays below approximately 75 characters. The mobile view stays
  single-column without changing the marketing shell.
- **Builder must not invent**: Do not expose internal monitor names, URLs,
  credentials or raw provider payloads. Do not infer Operational from an empty
  list. Do not describe organisation switching as shipped. Do not claim 24/7
  support, automatic refresh in an already-open tab, an ETA or a region impact
  unless Better Stack explicitly supplies it.

## Public status contract

### Customer-facing components

Configure these as Better Stack **status-page resources** with these exact public
names. The application reads public resource names and states, not the complete
private monitor collection:

1. App access
2. Xero connection and synchronisation
3. Calendar feed delivery
4. In-app notifications
5. Email notifications

The status page must not render an arbitrary sixth resource returned by the API.
Unknown public names are ignored and recorded only through privacy-safe
observability. A missing required component renders that component as Unknown and
prevents an all-operational aggregate.

### Normalised component states

Map Better Stack public resource states exhaustively:

| Better Stack resource state | Team Calendar state |
|---|---|
| `operational` | `operational` |
| `degraded` | `degraded` |
| `downtime` | `outage` |
| `maintenance` | `maintenance` |
| `not_monitored` | `unknown` |
| missing or new provider value | `unknown` |

Derive the overall customer label from the five normalised resources, using
this precedence:

1. `unknown` if configuration, validation or required-resource completeness is
   not trustworthy;
2. `major_outage` when every required component is in outage;
3. `partial_outage` when at least one, but not every, required component is in
   outage;
4. `degraded` when no component is in outage and at least one is degraded;
5. `maintenance` when no component is in outage/degraded and at least one is in
   maintenance;
6. `operational` only when all five required components are operational.

Do not use a percentage of “up” monitors and do not use a default branch that
returns Operational.

### Incident reports

Use Better Stack status-page reports, not raw monitor incidents:

- List reports from
  `GET /api/v2/status-pages/{status_page_id}/status-reports`.
- Fetch status updates for the selected active and recent reports from the
  report-specific status-updates endpoint.
- Treat a manual report as active only when its state is not resolved and it has
  no resolved end state. Treat scheduled maintenance separately.
- Sort active reports by most recently updated, then recent resolved reports by
  resolution time descending.
- Bound the page to at most three active reports and ten resolved reports.
- Preserve Better Stack's published timestamp and timezone in data, then render
  an Australian English label with a semantic `<time dateTime>` value.
- If reports or their updates fail validation, show incident history as
  unavailable. Never replace that failure with “No active incidents”.

Official contracts confirmed at planning time:

- Status page resource states and history:
  `https://betterstack.com/docs/uptime/api/get-a-single-status-page-resource/`
- Status page aggregate state:
  `https://betterstack.com/docs/uptime/api/get-a-single-status-page/`
- Status reports:
  `https://betterstack.com/docs/uptime/api/list-existing-reports-on-a-status-page/`
- Report updates:
  `https://betterstack.com/docs/uptime/api/list-all-existing-status-updates-for-a-status-page-report/`

If these official schemas changed, update the plan's schemas and tests before
implementation. Do not preserve stale assumptions through casts.

## Current state

### Public route

`apps/web/app/status/page.tsx` is a static Server Component. It:

- describes “organisation switching” even though PRODUCT.md states that the
  capability is not implemented;
- combines Xero synchronisation with calendar feed publishing despite their
  separate failure domains;
- combines in-app and email notification delivery;
- renders no current state, checked time, active incident or resolved history;
- uses a generic `<div>` instead of a main landmark and gives service cards the
  same `h2` rank as their containing section;
- provides only a small unprefilled email link with no support hours,
  acknowledgement expectation or sensitive-data warning.

### Better Stack adapter

`packages/observability/status/index.tsx` currently:

- reads `BETTERSTACK_API_KEY` and `BETTERSTACK_URL` at module evaluation;
- requests `/api/v2/monitors`, exposing a private-monitor model to UI logic;
- casts `response.json()` to `BetterStackResponse` instead of validating it;
- computes an up ratio without guarding `data.length === 0`;
- treats every non-up monitor alike;
- swallows every failure into one label;
- owns React markup even though provider normalisation belongs below the app UI.

`packages/observability/status/types.ts` mirrors a broad private monitor payload,
including fields the public page must never need. Replace that contract rather
than extending it.

### Environment and shared prerequisites

- `packages/observability/keys.ts` declares only an API key and ambiguous URL.
- The three app `.env.example` files set optional Better Stack keys to empty
  strings and describe `BETTERSTACK_URL` as a logs-ingest URL, contrary to the
  repository rule that optional formatted values remain absent when unset.
- Plan 121 creates canonical public support values and the direct-email contract.
  Extend that file with a status-specific mailto value rather than hardcoding a
  second support address or service window.
- Plan 122 creates the shared marketing style-loading contract. Extend its test
  for `/status`; do not redo the root CSS extraction.
- Plans 117, 118 and 120 own the 3px marketing focus ring, `en_AU` metadata
  default and documented shape scale. Consume their landed primitives.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Impeccable context | `node .agents/skills/impeccable/scripts/context.mjs --target apps/web/app/status/page.tsx` | exits 0; run once before UI edits |
| Provider tests | `TMPDIR=/tmp bunx vitest run packages/observability/status/status.test.ts packages/observability/keys.test.ts` | all provider/configuration cases pass |
| Web tests | `TMPDIR=/tmp bunx vitest run --config apps/web/vitest.config.mts apps/web/app/status/status.test.tsx apps/web/src/data/support.test.ts apps/web/app/styles/style-loading.test.ts packages/seo/metadata.test.ts` | all public-contract tests pass |
| Package typecheck | `bun run --cwd packages/observability typecheck && bun run --cwd apps/web typecheck` | exits 0 with no diagnostics |
| Targeted check | `bunx ultracite check packages/observability/status packages/observability/keys.ts packages/observability/keys.test.ts apps/web/app/status apps/web/src/data/support.ts apps/web/src/data/support.test.ts apps/web/app/styles/style-loading.test.ts` | exits 0 with no fixes |
| Detector | `node .agents/skills/impeccable/scripts/detect.mjs --json apps/web/app/status/page.tsx` | no unresolved P0/P1 findings; contextual warnings documented |
| Production build | `bun run --cwd apps/web build` | `/status` builds and provider failures do not fail the route build |
| Full gates | `bun run check && bun run typecheck && TMPDIR=/tmp bun run test && TMPDIR=/tmp bun run test:integration` | all four repository gates pass |
| Diff hygiene | `git diff --check` | exits 0 with no output |

Use `TMPDIR=/tmp` only for Vitest in the current WSL environment. The default
Windows temp directory is unavailable; this is not a source-code defect.

## Suggested executor toolkit

- Use the `impeccable` skill in Read-mode refinement. Run context once, then read
  `reference/craft-floor.md` immediately before editing the UI.
- Use the installed Next.js 16 CSS documentation under
  `apps/web/node_modules/next/dist/docs/01-app/01-getting-started/11-css.md` and
  the style-loading seam landed by Plan 122. Do not guess CSS ownership.
- Use the current official Better Stack API documentation linked above. The
  provider is temporally unstable, so revalidate response schemas before coding.
- Use browser verification in one bounded desktop/mobile batch, fix all observed
  defects together, then run at most one confirmation batch.
- Run `vercel:react-best-practices` after editing the TSX surface if available.

## Scope

**In scope, the only source/config files that may change**:

- `packages/observability/status/index.tsx` (delete or rename to `index.ts`)
- `packages/observability/status/index.ts` (create if renamed)
- `packages/observability/status/schemas.ts` (create)
- `packages/observability/status/types.ts`
- `packages/observability/status/status.test.ts` (create)
- `packages/observability/keys.ts`
- `packages/observability/keys.test.ts` (create)
- `packages/observability/package.json`
- `apps/web/app/status/page.tsx`
- `apps/web/app/status/status.module.css` (create)
- `apps/web/app/status/status.test.tsx` (create)
- `apps/web/src/data/support.ts`
- `apps/web/src/data/support.test.ts`
- `apps/web/app/styles/style-loading.test.ts`
- `apps/web/.env.example`
- `apps/app/.env.example`
- `apps/api/.env.example`
- `README.md`
- `bun.lock` only if adding the workspace `@repo/core` dependency changes it
- `plans/README.md` for status bookkeeping only after execution

**Out of scope**:

- Changing the shared marketing header/footer composition or removing Pricing,
  Sign up or any shell link.
- Reimplementing the focus, locale, shape or root style-loading work owned by
  Plans 117, 118, 120 and 122.
- Editing `packages/seo/metadata.ts` after Plan 118 has landed.
- Editing `apps/web/app/styles.css` or shared `shell.css` unless a prerequisite
  plan failed to establish its documented contract. That is a STOP condition,
  not permission to absorb the prerequisite.
- Creating or updating Better Stack monitors, resources, reports, subscribers or
  status pages through write APIs.
- Building a custom incident form, API route, database model, webhook consumer,
  SSE stream, cron job, polling Client Component or auto-refresh timer.
- Exposing provider credentials, internal resource IDs, private monitor names,
  raw response payloads or provider error details to the browser.
- Claiming Xero, Clerk or downstream calendar-provider health that no configured
  Better Stack public resource actually measures.
- Changing authenticated sync-health UI, API health routes or application
  observability outside the public status adapter.
- Adding dependencies other than `@repo/core` to consume the canonical Result
  type. Zod and server-only are already available.

## Git workflow

- Branch: `preview` (`origin/preview`), not `main` or a plan-specific feature
  branch. The completed plan lands on `preview`.
- Work directly in the current working tree under the execution policy in
  `plans/README.md`. Inspect `git status` before editing and preserve
  all user work.
- Commit: `feat(web): publish Better Stack service status`
- Do not push to `origin/preview` without explicit operator approval.

## Steps

### Step 0: Confirm prerequisites and provider configuration

Confirm Plans 121 and 122 are DONE and their contracts match this plan:

- `apps/web/src/data/support.ts` owns the public email and support hours;
- `apps/web/app/styles/style-loading.test.ts` owns route CSS-loading assertions;
- the shared focus ring is 3px, metadata defaults to `en_AU`, controls use the
  documented shape scale and the full marketing shell remains intact.

In Better Stack, an operator must configure one published status page containing
the five exact public resource names listed above. Record only the status-page ID
and public URL in deployment configuration. Never place the API key, ID or live
resource identifiers in the plan, tests, fixtures or committed documentation.

Read the four official API pages linked in this plan and compare their response
attributes with the planned Zod schemas.

**Verify**: prerequisites are DONE, the drift check contains no unexplained
changes, official read endpoints still exist, and no credential value appears in
tracked files.

### Step 1: Lock the provider contract with failing tests

Create provider tests before production changes. Mock `fetch`, time and all
responses. Cover:

- valid status page, five valid resources and zero reports;
- each Better Stack resource state;
- empty resources and one missing required component;
- unknown public resource names;
- malformed JSON and schema-invalid JSON;
- 401/403, 404, 429, 5xx, network failure and timeout;
- report list with active, maintenance and resolved reports;
- multiple updates sorted by published time;
- partial update failure without a false “No active incidents” result;
- no secret, resource ID, private URL or raw provider payload in returned errors.

Tests must prove that Operational is impossible unless all five required public
components validate as operational.

**Verify**: new assertions fail against the current ratio-based adapter for the
intended reasons.

### Step 2: Replace the monitor component with a validated status service

Refactor `@repo/observability/status` into a pure server-only data service:

- remove React rendering from the package export;
- read keys inside the public function, not at module evaluation;
- use Zod schemas for status page, resource list, report list and status-update
  responses;
- accept an injected fetcher and clock in the low-level function so tests do not
  mutate process-wide globals;
- return `Result<PublicStatusSnapshot, PublicStatusError>` using `@repo/core`;
- implement named, finite error variants such as configuration, authentication,
  rate limit, not found, timeout/network, provider, invalid response and unknown;
- enforce a bounded timeout with `AbortSignal` cleanup;
- fetch independent status-page, resource and report reads concurrently;
- fetch updates only for the bounded reports selected for display, concurrently
  with an explicit maximum;
- normalise to the public contract in this plan and discard all raw/internal
  fields before returning.

The snapshot includes the normalised overall state, exactly five ordered public
components, incident availability, active reports, recent reports, hosted public
URL and a `checkedAt` timestamp representing the successful read time.

Use Next-compatible fetch revalidation of approximately 60 seconds without
adding an interval or Client Component. If the installed Next.js version cannot
apply revalidation through the package fetch boundary, keep the provider pure
and add the narrow cache wrapper inside the status route. Do not add a process
memory cache.

**Verify**: provider tests pass, package typecheck passes, empty data returns
Unknown, and the package export contains no React element.

### Step 3: Correct the Better Stack environment contract

Replace ambiguous `BETTERSTACK_URL` usage with explicit optional keys:

- `BETTERSTACK_API_KEY`
- `BETTERSTACK_STATUS_PAGE_ID`
- `BETTERSTACK_STATUS_PAGE_URL`

All three are required together for a configured public status page. When the
group is absent, return a configuration Result; when partially supplied, fail
environment validation with a plain configuration message. The public URL is a
validated HTTPS URL in production. The API key and status-page ID remain
server-only.

Update all three app `.env.example` files so optional Better Stack values are
commented out, never `""`. Explain that only `apps/web` consumes the public
status-page trio; remove misleading logs-ingest wording. Update the README
production matrix and web deployment notes without exposing example secrets or
live identifiers.

Create key-schema tests for all-absent, all-present, partial and malformed URL
cases.

**Verify**: env tests pass, `rg -n '^BETTERSTACK_.*=""' apps/*/.env.example`
returns no matches, and no key is exposed through a client schema.

### Step 4: Build the operational status hierarchy

Rewrite `apps/web/app/status/page.tsx` as an async Server Component. Preserve the
root marketing layout, Header and Footer supplied by `apps/web/app/layout.tsx`.

Required reading order:

1. `main#status-main` with a concise Status kicker and one `h1`, “Team Calendar
   status”;
2. overall state surface with plain label and supporting sentence;
3. checked time, reload link and hosted “Subscribe to updates” link;
4. “Current status by service” component list;
5. “Active incidents” section;
6. “Recent incidents” section;
7. “Report an issue” recovery section.

For a successful empty incident list, say “No active incidents reported”. For an
unavailable incident channel, say that incident history is temporarily
unavailable and link to the hosted Better Stack page. Do not conflate these
states.

For complete provider failure, render an Unknown overall state, all five
components as Unknown, the last available checked time only when the actual
cache supplies one, the hosted status link when configured, and the support
path. The page itself must still return usable HTML rather than throwing.

Add canonical `/status` and Open Graph URL metadata. Inherit the `en_AU` default
from Plan 118 and assert it rather than adding a redundant locale override.

**Verify**: the static-render contract test proves the section order, one main,
one h1, logical headings, complete five-component list and truthful success and
failure copy.

### Step 5: Render incidents, history and subscription accessibly

Render each incident as an article labelled by its title. Include:

- active, maintenance or resolved state in text;
- affected public components;
- start and resolved times where provided;
- newest update first, each with semantic time;
- a direct hosted Better Stack incident link only when the provider supplies a
  validated public destination.

Keep incident updates as provider-authored plain text. React escaping remains
the rendering boundary; do not introduce HTML parsing or `dangerouslySetInnerHTML`.

The subscription action links to the validated hosted status page. Do not build
subscriber collection inside Team Calendar and do not imply subscription is
available when Better Stack marks the page non-subscribable.

**Verify**: active, maintenance, resolved, no-incident and unavailable-history
tests pass; keyboard reading order matches visual order.

### Step 6: Make issue reporting a low-memory recovery path

Extend the canonical support data from Plan 121 with a named
`statusIncidentMailtoHref`. It must URL-encode:

- a plain incident-report subject;
- organisation name placeholder;
- affected component placeholder;
- issue start time and timezone placeholder;
- concise symptom/impact placeholder.

Render a visible, copyable support address, the canonical Monday-to-Friday
9:00 am to 5:00 pm AEST response hours, and an explicit note that this is the
staffed response window, not a guaranteed resolution time.

Warn users not to include payroll data, leave details, passwords, API keys,
calendar feed URLs or other sensitive information. Keep the action as a normal
`mailto:` link using the shared marketing button and focus primitives.

**Verify**: support tests prove encoding and canonical values; page tests prove
the button, full address, hours and sensitive-data warning remain visible.

### Step 7: Apply the operational visual system without forking the shell

Create `status.module.css` for page-owned composition. Use existing marketing
tokens, not hardcoded colours. Apply:

- 20px for the overall status and incident cards;
- 16px for major grouped component/incident surfaces;
- 12px for compact component rows and status labels;
- tonal layering without persistent shadows or decorative borders;
- primary green only for operational signal, actions and brand anchors;
- warning/error/unknown semantic tokens for corresponding states;
- adjacent icon and text for every state;
- readable lines no wider than approximately 75 characters;
- 44px minimum targets and the shared 3px focus-visible treatment;
- no ping, pulse or decorative motion on the overall state.

The five services must read as operational rows, not the existing generic
icon-over-heading feature cards. Preserve the full global header and footer at
all breakpoints. Do not introduce a status-specific header, footer or root
layout.

Extend the route-style loading test created by Plan 122 to prove `/status` owns
its CSS Module, status-only selectors are absent from shared shell styles, and
the first-load route graph does not regain homepage timeline or feature-demo
styles. Record the production CSS baseline and after-size; do not assert a
brittle exact byte count.

**Verify**: module/style tests pass and the production build shows no unrelated
route-specific CSS regression for `/status`.

### Step 8: Run one bounded accessibility and visual pass

Inspect 1440×1000 and 390×844 together in light and dark mode. In the same pass,
also test:

- 200% browser zoom;
- keyboard traversal and unclipped focus;
- forced-colour mode;
- reduced motion;
- long incident title and update copy;
- all-operational, partial outage, maintenance and unknown fixtures or mocked
  provider states.

Fix every observed in-scope issue in one batch, then run at most one confirmation
batch. The existing full marketing shell must remain visually consistent with
adjacent marketing routes.

Run the Impeccable detector. Treat the mandated Plus Jakarta Sans warning as the
known false positive. Resolve line-length, inaccessible status, heading,
landmark and generic icon-stack warnings caused by this page.

**Verify**: report exact viewport/theme/state coverage in executor notes; no P0
or P1 design defect remains.

### Step 9: Run build and all repository gates

Run targeted checks, provider and web focused tests, package typechecks, the web
production build, `bun run check`, `bun run typecheck`, `bun run test`,
`bun run test:integration` and `git diff --check`.

Review the final diff against the scope list. Update the Plan 128 row in
`plans/README.md` only after every gate passes.

## Test plan

### Provider unit tests

- Valid status page and all five resource states.
- Exhaustive Better Stack-to-domain state mapping.
- Overall state precedence and no false operational fallback.
- Missing/extra resources and deterministic public ordering.
- Active, maintenance and resolved report classification.
- Status-update ordering and bounded fetching.
- Timeout, network, HTTP and Zod failures mapped to safe Results.
- Raw IDs, URLs, credentials and payloads absent from public values/errors.

### Environment tests

- All three status keys absent is allowed and produces unconfigured runtime
  state.
- All three valid keys pass.
- Every partial combination fails clearly.
- Non-HTTPS production public URL and malformed values fail.
- No server key appears in the client schema.

### Web static-render tests

- One focusable main and one h1.
- Overall state appears before component details.
- Exactly five customer-facing components in the required order.
- No organisation-switching claim, raw “ICS” shorthand or “availability
  normalisation” jargon in customer copy.
- Success, degraded, outage, maintenance and unknown presentations pair icon,
  colour and text.
- Checked time uses `<time>` and AEST display copy.
- Active, recent, empty and unavailable incident states remain distinct.
- Subscription appears only when provider configuration allows it.
- Prefilled mailto, support address, hours and sensitive-data warning.
- Canonical/Open Graph `/status` metadata and inherited `en_AU` locale.

### Style and browser verification

- Status owns a CSS Module and does not add status selectors to the shared shell.
- `/status` does not regain unrelated home/feature CSS after Plan 122.
- Light/dark, desktop/mobile, zoom, keyboard, forced-colour and reduced-motion
  checks pass.
- Long incident text reflows without overflow or destructive truncation.

## Done criteria

- [ ] Better Stack status-page resources, not private monitors, are the public
      source of truth.
- [ ] Every external payload is Zod-validated before use; no `as` cast bypasses
      validation.
- [ ] Service functions return canonical `Result` values and expected failures
      do not throw through the page.
- [ ] Operational is rendered only when all five required components validate
      as operational.
- [ ] Overall, component, maintenance, unknown and stale states are explicit and
      accessible.
- [ ] Active and recent incidents use Better Stack status reports and updates.
- [ ] The hosted subscription path appears only when supported.
- [ ] Issue reporting uses the canonical support address, prefilled incident
      prompts, staffed hours and sensitive-data warning.
- [ ] Unshipped organisation switching and unexplained technical jargon are
      absent.
- [ ] The page has one focusable main, one h1, logical headings, semantic time
      values, 44px actions and visible 3px focus.
- [ ] Page-owned surfaces follow the documented 20/16/12px hierarchy without
      changing the full marketing shell.
- [ ] Status styles are route-scoped and production evidence shows no unrelated
      route-specific CSS regression.
- [ ] Better Stack optional environment examples are commented when unset and
      deployment documentation is accurate.
- [ ] Focused tests, production build, all four repository gates and diff hygiene
      pass.
- [ ] Bounded visual/accessibility verification covers every named viewport,
      theme and operational state.
- [ ] Only in-scope files changed and prerequisite plan work was not duplicated.

## STOP conditions

Stop and report, do not improvise, if:

- Plan 121 or 122 is not DONE;
- the shared support, focus, metadata, shape or style-loading contract differs
  materially from its prerequisite plan;
- the five required Better Stack public resources have not been configured or
  cannot be mapped unambiguously;
- Better Stack's official API no longer provides the planned read contracts;
- status reports cannot distinguish active, maintenance and resolved states
  without operator-authored conventions that are not documented;
- a provider response would require exposing private monitor data or raw IDs;
- caching requires a database, KV, background job or process-memory store;
- the operator requests in-page subscriptions, a custom report form, polling or
  automatic client refresh;
- CSS isolation requires changing another page's markup or redoing Plan 122;
- a shared-shell visual change is needed outside prerequisite contracts;
- any verification fails twice after one reasonable correction;
- an out-of-scope file must change.

## Maintenance notes

- Better Stack public resource names are an external configuration contract.
  Review them when a customer-facing service is added, renamed or split.
- Keep provider schemas narrow. Do not mirror the complete Better Stack payload
  or let private monitor types leak into the web app.
- A public status state is not the authenticated sync-health state. The former
  reports shared platform availability; the latter remains tenant-specific.
- Keep incident authorship in Better Stack. Team Calendar reads and projects
  public reports but does not become a second incident-management source.
- When subscription or webhook requirements change, plan them separately with
  privacy, abuse and operational ownership defined first.
- Review provider API schemas, first-load CSS, keyboard focus and unknown-state
  behaviour closely during code review.
