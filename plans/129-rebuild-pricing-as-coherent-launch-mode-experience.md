# Plan 129: Rebuild pricing as one truthful launch-mode experience

> **Executor instructions**: Execute this as one cohesive pricing-page change.
> Follow every step in order, run every verification command, and use the
> Impeccable design brief below as the authority. The pricing contract in Step
> 0 is approved and must not be reinterpreted. If a STOP condition occurs, report it rather
> than improvising. The reviewer maintains `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat e7ee7c7..HEAD -- apps/web/app/pricing apps/web/app/styles/features.css apps/web/app/styles/shell.css apps/web/package.json packages/core/index.ts packages/core/src packages/database/src/seed/plans.ts packages/database/src/seed/plan-sync.ts packages/database/src/queries/billing.ts packages/availability/src/settings/billing-service.ts bun.lock`
> Compare changed in-scope files with **Current state**. Changes from Plans 117,
> 120 and 121 are expected only when they match those plans' shared focus,
> shape, stylesheet and support-data contracts. Any other material mismatch is
> a STOP condition.

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: MED
- **Depends on**: Plans 120 and 121 DONE
- **Category**: correctness, direction, accessibility, performance, tech-debt, tests
- **Planned at**: commit `e7ee7c7`, 2026-08-30
- **Impeccable mode**: Persuade
- **Critique baseline**: 14/28; the critique was not persisted outside `plans/`
  because the selected `improve` workflow was read-only outside this directory
- **Findings combined**: partial launch-mode switching; open/closed access
  contradiction; no-per-seat promise conflicting with approved staff caps;
  Basic/Starter and Premium entitlement drift; duplicated plan catalogue;
  missing paid/full-page tests; inaccessible mobile comparison; ambiguous
  early-access conversion; unfinished one-card desktop composition; oversized
  client boundary; unnecessary dynamic rendering; pricing focus, radius and
  semantic-token drift

## Why this matters

Pricing is a commercial trust surface, but both supported launch modes currently
produce contradictory pages. Early access is described as open and closed,
future paid plans appear beside the closed cohort, Premium's connection limit
disagrees with the approved offer, and the hero promises unlimited headcount
while Starter and Premium have staff caps.

After this plan, one typed public catalogue owns names, features and limits;
database seeding and marketing project from it. Metadata, hero, offer,
comparison, FAQ and CTA form one coherent `early_access` or `paid` experience.
The route is statically delivered, server-rendered, responsive, WCAG 2.2 AA and
protected by tests that make commercial drift fail visibly.

## Impeccable design brief

### Job and audience

- **Mode**: Persuade.
- **Visitor**: an Australian small-business owner, payroll administrator or
  operations manager evaluating Team Calendar for a Xero Payroll team.
- **State**: cautious and time-poor. Pricing, rollout effort and payroll scope
  are trust-sensitive; conflicting claims matter more than visual novelty.
- **Job**: identify today's offer, understand cost or admission, verify people,
  Xero-file and feed coverage, then take one unambiguous next step.

### Outcome and proof

- `early_access` is a closed-cohort decision surface: AU eligibility,
  inclusions, onboarding help, commercial exposure and exact next step. Future
  paid plans do not appear buyable.
- `paid` is an Australia-first decision surface. Starter and Premium show the
  approved AUD prices and limits; Enterprise is clearly unavailable and marked
  Coming soon.
- Proof is specific: Xero Payroll connection, approved leave plus manual
  availability, secure Outlook/Google/Apple calendar feeds and guided setup
  where included.
- A visitor can answer four questions without inference: what is available,
  what is included, what changes between offers and what the CTA will do.

### Selected direction

- Preserve Plus Jakarta Sans, brief Lora emphasis, lavender tonal surfaces,
  forest-green action signal, restrained motion and light/dark parity.
- Drive the whole page from one launch-mode content model.
- Early access uses a deliberate two-part cohort composition: offer/inclusions
  plus eligibility/onboarding/next step. Never leave one card in three columns.
- Paid mode retains three plan cards and a comparison. Below 640px, show the
  same comparison data as stacked plan cards instead of an undiscoverable pan.
- Each mode has one primary action. Closed early access uses the canonical
  support enquiry from Plan 121; paid Australian Starter and Premium use the
  canonical sign-up destination. Enterprise has no active purchase CTA.
- A compact labelled currency selector offers AUD, NZD and GBP. AUD is selected
  by default. NZD and GBP reveal truthful New Zealand/United Kingdom Coming soon
  states, never converted or invented prices.

### Boundaries and states

- Rebuild only `/pricing`, the neutral public-plan contract and the database
  seed adapter consuming it.
- Replace current numeric prices with the approved Australian amounts: Starter
  `$9/month` and Premium `$19/month`. The selector establishes AUD context, so
  do not add a GST or tax claim.
- Preserve AU closed early access, Xero-only scope, header/footer and themes.
- Do not build checkout, CRM, a support form, testimonials, logos, billing
  calculator, schema changes or authenticated billing features.
- Required modes: `early_access`, `paid`. Required currency states: AUD, NZD and
  GBP. Required viewports: 1440x1000,
  1024x768, 390x844 and 200% desktop zoom, light and dark.
- FAQ uses native disclosure. Only the currency selector and its dependent
  regional pricing panel may be a Client Component. Long labels wrap without
  shifting CTA alignment or causing page overflow.

### Builder must not invent

- Per-seat billing, alternative Australian limits or a second Xero connection
  on Premium.
- NZD or GBP prices, exchange-rate conversion, purchasing or launch dates.
- Currency/GST treatment beyond the visible AUD/NZD/GBP selector.
- New limits, SLAs, regions, release dates or a new visual world.

## Step 0: Lock the approved pricing and regional-availability contract

These values were approved by the product owner on 2026-08-30. Encode them in
tests before source changes and do not substitute the previous catalogue.

| Public plan | Australian price | Staff | Xero connections | Calendar feed | Analytics | Support | Availability |
|---|---:|---:|---:|---|---|---|---|
| Starter | `$9/month` | Up to 9 | Single | Core Feed | Basic Analytics | Standard Support | Available in AUD paid mode |
| Premium | `$19/month` | Up to 50 | Single | Team and location feeds | Advanced Analytics | Priority support | Available in AUD paid mode |
| Enterprise | No price | Not advertised | Multiple | Not advertised | Not advertised | Not advertised | Coming soon |

Implementation rules:

- Preserve the internal `plan_key` value `basic` for database, Stripe and
  subscription compatibility, but change its canonical public name to Starter.
- Starter changes from 10 to 9 staff. Premium changes from two payroll entities
  to one Xero connection. Treat the existing `payroll_entities` limit as the
  enforced connection count; do not introduce a second concept or migration.
- “Core Feed” and “Team and location feeds” are public capability labels. They
  do not authorise an executor to change the numeric feed-limit enforcement.
  Preserve existing feed counts unless the product owner separately specifies
  a new number.
- Existing `analytics: false` means no advanced analytics, not no analytics.
  Map it to the public label Basic Analytics. `analytics: true` maps to Advanced
  Analytics. Apply the same projection to Standard/Priority support.
- AUD is the initial selected currency. NZD and GBP appear in the selector but
  have no prices. Selecting either replaces purchasable plan pricing with a
  country-specific Coming soon state and a non-purchase secondary contact path.
- Enterprise is Coming soon for every currency and has no Get started button.
- Closed early access uses Plan 121's structured support enquiry. Paid AUD
  Starter and Premium use `signUpHref` with a clear Get started label.
- Do not make a GST-inclusive/exclusive claim. The selected AUD label supplies
  currency context for the approved `$9` and `$19` figures.

**Verify**: pricing contract tests assert every cell above, internal key
compatibility, the three currency states and absence of invented NZD/GBP prices.

## Current state

### Launch-mode leakage

Only `PricingPlans` branches:

```tsx
// apps/web/app/pricing/components/pricing-plans.tsx:8-15
export const PricingPlans = () => {
  const earlyAccess = isEarlyAccess();
  if (earlyAccess) {
    return <div className="fmkt-pricing-cards">...
```

The surrounding page always mixes incompatible states:

```tsx
// apps/web/app/pricing/components/pricing-experience.tsx:98-103,121,197-203
Early access is open now while plans are finalised.
...
<section className="fmkt-pricing-compare">
...
Team Calendar is currently in closed early access for Australian organisations
```

### Canonical and marketing drift

```ts
// packages/database/src/seed/plans.ts:14-29
Basic:   { feeds: 2, payroll_entities: 1, seats: 10 }
Premium: { feeds: -1, payroll_entities: 2, seats: 50 }
```

```tsx
// apps/web/app/pricing/components/pricing-experience.tsx:7-13,65-67,132-145
premium: "1"
...
"Multi-entity teams run on Enterprise"
...
<th>Starter</th>
```

`apps/web/app/pricing/constants.ts:3-70` independently duplicates plan names,
limits and feature prose. It and `packages/database/src/seed/plans.ts:12-13`
contain reciprocal manual-sync warnings, which have already failed.

### Seat contradiction

`pricing-experience.tsx:89-95` says “No per-seat maths” and “Add as many people
as your payroll file holds”; lines 58-62 say adding people never changes price.
Those promises conflict with the 10/50-seat catalogue caps.

### Rendering and interaction

```tsx
// apps/web/app/pricing/page.tsx:5-7
export const dynamic = "force-dynamic";
```

```tsx
// apps/web/app/pricing/components/pricing-experience.tsx:1-3,81-82
"use client";
const [openFaq, setOpenFaq] = useState(0);
```

Installed Next.js documentation at
`apps/web/node_modules/next/dist/docs/01-app/02-guides/environment-variables.md:154-166`
states that `NEXT_PUBLIC_` values are inlined and frozen at build time. The
server/client-boundary guide states that Client Component imports enter the
client bundle and native `<details>` supplies disclosure without client state.
`force-dynamic` therefore adds request rendering without making the flag
runtime-mutable.

### Layout, accessibility and styling

`features.css:2451-2473` always creates three pricing columns, uses 16px cards,
a 2px highlight border and a scale transform. One early-access card occupies
only the first column. `features.css:2588-2600` horizontally scrolls a 720px
comparison table in an unlabelled, non-focusable wrapper.

`DESIGN.md:306-324` requires 20px persistent cards, 14px controls and a 3px
focus ring. `DESIGN.md:397-401` requires narrow tables to become cards or use a
labelled focusable scroll region.

### Tests

`pricing.test.ts:6-20` renders only the early-access card. It does not exercise
the complete page, paid mode, metadata, catalogue alignment, comparison
semantics or static/client boundaries. It imports the component before stubbing
environment values even though auth links resolve at module import.

## Commands

| Purpose | Command | Expected result |
|---|---|---|
| Impeccable context | `node .agents/skills/impeccable/scripts/context.mjs --target apps/web/app/pricing` | exit 0; run once before edits |
| Core tests | `TMPDIR=/tmp bunx vitest run packages/core/src/plan-catalogue.test.ts --config packages/core/vitest.config.mts` | all pass |
| Database projection tests | `TMPDIR=/tmp bunx vitest run packages/database/src/seed/plans.test.ts --config packages/database/vitest.config.mts` | all pass without live DB |
| Pricing tests | `TMPDIR=/tmp bunx vitest run apps/web/app/pricing/pricing.test.ts --config apps/web/vitest.config.mts` | both modes and contracts pass |
| Targeted check | `bunx ultracite check apps/web/app/pricing apps/web/app/styles/features.css packages/core/src/plan-catalogue.ts packages/core/src/plan-catalogue.test.ts packages/core/index.ts packages/database/src/seed/plans.ts packages/database/src/seed/plans.test.ts` | exit 0 |
| Package typechecks | `bun run --cwd packages/core typecheck && bun run --cwd packages/database typecheck && bun run --cwd apps/web typecheck` | exit 0 |
| Detector | `node .agents/skills/impeccable/scripts/detect.mjs --json apps/web/app/pricing` | `[]`, or documented triage |
| Web build | `bun run --cwd apps/web build` | exit 0; `/pricing` static, not force-dynamic |
| Full gates | `bun run check && bun run typecheck && bun run test && bun run test:integration` | all exit 0 |
| Hygiene | `git diff --check` and `git status --short` | no whitespace errors; only scope files changed |

`TMPDIR=/tmp` works around the current host's missing Windows temp directory;
it is not a source change.

## Suggested executor toolkit

Use Impeccable in this order:

1. `$impeccable clarify apps/web/app/pricing` for the approved commercial copy.
2. `$impeccable harden apps/web/app/pricing` for mode isolation, truth and states.
3. `$impeccable layout apps/web/app/pricing` for cohort and paid hierarchy.
4. `$impeccable adapt apps/web/app/pricing` for mobile comparison and zoom.
5. `$impeccable audit apps/web/app/pricing` for semantics, focus and delivery.
6. `$impeccable polish apps/web/app/pricing` for the final bounded pass.

Read `.agents/skills/impeccable/reference/craft-floor.md` immediately before
the first UI edit. Preserve the incumbent design world; do not enter `new-work`
or replace `DESIGN.md`. Use installed Next.js docs, not remembered APIs.

## Scope

**In scope**:

- `packages/core/src/plan-catalogue.ts` (create)
- `packages/core/src/plan-catalogue.test.ts` (create)
- `packages/core/index.ts`
- `packages/database/src/seed/plans.ts`
- `packages/database/src/seed/plans.test.ts` (create)
- `apps/web/package.json`, only for direct `@repo/core`
- `bun.lock`, only if Bun records that workspace edge
- `apps/web/app/pricing/page.tsx`
- `apps/web/app/pricing/constants.ts`
- `apps/web/app/pricing/components/pricing-experience.tsx`
- `apps/web/app/pricing/components/pricing-plans.tsx`
- `apps/web/app/pricing/components/pricing-comparison.tsx` (create)
- `apps/web/app/pricing/components/pricing-currency-selector.tsx` (create; the
  only pricing Client Component)
- `apps/web/app/pricing/components/pricing-faq.tsx` (optional create; Server Component)
- `apps/web/app/pricing/pricing.test.ts`
- `apps/web/app/styles/features.css`, pricing selectors only
- `plans/README.md`, execution status only

**Out of scope**:

- Prisma schema, migrations and generated files.
- Stripe products/Price IDs, checkout, Portal, webhooks or enforcement.
- Authenticated plans/billing UI and subscription services.
- Header, footer, contact, support data and shared `shell.css`; consume Plans
  120/121 rather than duplicating them.
- Other marketing routes, root stylesheet ownership or global redesign.
- APIs, Server Actions, forms, CRM, analytics, testimonials and unapproved
  pricing/region/tax/SLA claims.
- Changes to `PRODUCT.md`, `DESIGN.md` or `.impeccable.md`.

## Git workflow

- Branch: `preview` (`origin/preview`), not `main` or a plan-specific feature
  branch. The completed plan lands on `preview`.
- Work directly in the current working tree after checking `git status`.
- Commits: `refactor(core): centralise public plan catalogue`,
  `refactor(web): make pricing launch-mode coherent`,
  `test(web): protect pricing contract`.
- Do not push to `origin/preview` without explicit operator instruction.

## Implementation steps

### Step 1: Lock contracts with failing tests

Create core catalogue tests for unique Starter/Premium/Enterprise public names,
stable `basic`/`premium`/`enterprise` internal keys, the exact Step 0
limits/features and explicit unlimited handling. Create a database
projection test proving `PLAN_CATALOGUE` preserves every public field and adds
only `is_custom`/`priceId`, without a live database or real credential.

Rewrite pricing tests to render complete explicit `early_access` and `paid`
experiences. Assert mode-specific metadata and absence of opposite-mode copy;
approved staff wording; canonical names/limits; Starter 9 staff; Premium one
connection and 50 staff; the exact `$9`/`$19` AUD prices; Enterprise Coming
soon; AUD/NZD/GBP selector states; exactly one early-access CTA;
caption/scoped headings/accessible comparison; native FAQ; no broad pricing
client boundary or `force-dynamic`.

Avoid snapshots and whole-paragraph matches.

**Verify**: tests fail against current source only for the named contracts.

### Step 2: Centralise the public plan catalogue

Create `packages/core/src/plan-catalogue.ts` containing only public,
environment-independent `plan_key`, public `name`, `limits` and `features`, plus
`PUBLIC_PLAN_CATALOGUE` and total `getPublicPlanDefinition`. Reuse existing
`PlanKey`, `LimitType` and `FeatureKey`; use readonly structures and `satisfies`,
no `any` or unjustified casts. Export from the allowed core root barrel.

Refactor database `PLAN_CATALOGUE` to project public definitions and attach only
`is_custom` and configured `priceId`. Preserve existing exports/callers. Remove
manual-sync comments. Add `@repo/core` directly to web; never import database,
billing, Stripe or price IDs into marketing.

**Verify**: core/database tests and dependent typechecks pass; manual-sync
warnings have zero matches.

### Step 3: Define one launch-mode content model

Keep marketing-only prices, descriptions, labels and CTAs in `constants.ts`,
keyed by `PlanKey`/`LaunchMode`, never array position. Names, entity counts,
seats, feeds and feature booleans come from `PUBLIC_PLAN_CATALOGUE`; helpers may
format `-1` as Unlimited but may not restate limits as literals.

Define a typed `PricingCurrency = "AUD" | "NZD" | "GBP"` and a presentation
record for currency label, country label and availability. Only AUD has numeric
plan prices. Do not store or compute exchange rates.

Resolve `getLaunchMode()` once in `page.tsx`, pass mode to
`PricingExperience`, and generate coherent build-time metadata. Delete
`force-dynamic`; do not replace it with request APIs or uncached data.

**Verify**: both-mode tests and web typecheck pass; component-level launch-mode
reads have zero matches.

### Step 4: Rebuild early access as one cohort decision

Make pricing components server-rendered. State closed AU access consistently.
Use the two-part cohort layout, Plan 121's structured support enquiry and
product-specific onboarding proof. Do not render paid prices, comparison, Most Popular,
plan-change FAQ or Enterprise onboarding. Future pricing is omitted unless an
operator explicitly asks for a subordinate “provisional” preview.

**Verify**: early markup has one primary CTA and no paid-mode leakage.

### Step 5: Rebuild paid mode from canonical data

Render Starter, Premium and Enterprise from the catalogue plus presentation
data. In AUD, render `$9/month` for Starter and `$19/month` for Premium.
Starter shows up to 9 staff, one Xero connection, Core Feed, Basic Analytics and
Standard Support. Premium shows up to 50 staff, one Xero connection, Team and
location feeds, Advanced Analytics and Priority support. Enterprise shows
Multiple Xero connections and Coming soon, with no price or purchase CTA.

Generate comparison rows from canonical limits/features and the approved public
capability projection. Remove the no-seat proposition. Highlight Premium as the
recommended available plan with text and tone, not scale or colour alone. Do
not add checkout.

**Verify**: paid/catalogue tests assert the Step 0 table exactly; `Basic`, `$49`,
10 staff and a two-connection Premium have no user-visible pricing matches.

### Step 6: Add the isolated currency selector and regional Coming soon states

Create `pricing-currency-selector.tsx` as the only pricing Client Component.
It owns only the selected `PricingCurrency` and the dependent regional pricing
panel. Keep `getCurrencyPricingState(currency)` as a pure exported projection
in `constants.ts` so every currency state is unit-testable without adding a DOM
testing dependency. Requirements:

- a persistent visible label, `Currency`;
- options `AUD`, `NZD` and `GBP`, with Australia/New Zealand/United Kingdom in
  supporting text or accessible names;
- deterministic server/client initial state of AUD, with no hydration flash;
- AUD displays the approved Starter and Premium cards plus Enterprise Coming
  soon;
- NZD displays “New Zealand pricing is coming soon” and no dollar amounts or
  enabled Get started CTA;
- GBP displays “United Kingdom pricing is coming soon” and no pound amounts or
  enabled Get started CTA;
- a polite status announcement when the selected regional panel changes;
- keyboard operation through the native `<select>`, visible 3px focus and a
  44px touch target;
- no exchange-rate fetch, geolocation, localStorage, cookie, URL mutation or
  inferred visitor country.

Keep plan catalogue, pricing cards, comparison and FAQ as Server Components or
serialisable rendered children. Do not move the entire page behind this client
boundary.

**Verify**: pure projection tests cover all three values and assert no NZD/GBP
numeric prices or purchase CTA; the bounded browser pass exercises the native
select itself. Source-boundary tests prove the only pricing
`"use client"` directive is in `pricing-currency-selector.tsx`.

### Step 7: Remove the client FAQ boundary

Render mode-specific FAQs with native `<details><summary>`. Hide decorative
indicators from assistive technology. Do not add manual ARIA, handlers or React
state. Default closed unless approved research requires one open item.

**Verify**: FAQ has no `useState` or manual ARIA; semantic tests pass. The only
remaining pricing state is the isolated currency selector.

### Step 8: Implement responsive comparison and token-correct geometry

Create a typed Server Component projecting one dataset into:

- desktop/tablet semantic table with caption, `scope="col"` and `scope="row"`;
- mobile stacked per-plan cards below 640px;
- a labelled, instructed, `tabIndex={0}` overflow region only where intermediate
  widths still pan. Follow `apps/web/app/features/page.tsx:363-366`.

In pricing CSS, use 20px persistent cards, completed 14px controls and 3px
focus contract, semantic tokens instead of raw brand hex, no card scale, no
three-column early-access dead space, 44px targets and zero 390px/200% overflow.
Do not edit `shell.css`; STOP if Plans 120/121 did not deliver its prerequisites.

**Verify**: tests, detector and targeted check pass.

Include the currency selector in responsive checks. At 390px it is full-width,
its label remains visible and changing currency does not move focus or cause
page-level overflow.

### Step 9: Run bounded Impeccable browser verification

Inspect separate builds/restarts for both deployment modes at 1440, 1024, 390
and 200% zoom, light/dark, keyboard-only, forced colours and reduced motion when
supported. Check headings, one main landmark, CTA outcome, focus, FAQ,
comparison order and console/hydration output. Fix once in a batch, confirm once.

**Verify**: record the matrix in execution notes; no overflow, clipping,
opposite-mode copy or console error.

Exercise AUD, NZD and GBP in paid mode at desktop and mobile. Confirm the
Coming soon replacements are announced and expose no purchasable pricing.

### Step 10: Run all gates and review scope

Run every command above. Confirm `/pricing` builds static, every entitlement
traces to the public catalogue, no server-only module enters web, and only
allowlisted files changed.

**Verify**: all gates exit 0; `git diff --check` is empty.

## Test plan

- `plan-catalogue.test.ts`: stable internal keys; Starter/Premium/Enterprise
  public names; 9/50 staff; one/one/multiple connection limits; exact feature
  flags; unlimited sentinel; unknown lookup.
- database `plans.test.ts`: lossless public projection, configured internal
  `basic`/`premium` Price IDs, custom Enterprise and no live DB.
- `pricing.test.ts`: full early/paid renders, metadata, mode isolation, exact
  AUD contract, one CTA, Enterprise Coming soon, AUD/NZD/GBP states, absence of
  invented NZD/GBP prices, comparison semantics, native FAQ, isolated selector
  client boundary, static route, no raw brand hex or stale `/mo`.
- Mutation proof: separately restore Basic, change Starter 9 to 10, give Premium
  two connections, expose a price in NZD, leak paid comparison into early
  access, and restore `force-dynamic`; each associated
  assertion must fail, then revert immediately.

## Done criteria

- [ ] Step 0's approved Australian and regional contract is encoded exactly.
- [ ] One public catalogue owns names, limits and features for seed and pricing.
- [ ] Manual-sync comments and independent comparison literals are gone.
- [ ] Both modes have coherent metadata, hero, offer, comparison, FAQ and CTA.
- [ ] Starter is the public name for internal key `basic`, costs `$9/month` in
  AUD, supports up to 9 staff and one Xero connection, and shows Core Feed,
  Basic Analytics and Standard Support.
- [ ] Premium costs `$19/month` in AUD, supports up to 50 staff and one Xero
  connection, and shows Team and location feeds, Advanced Analytics and
  Priority support.
- [ ] Enterprise shows Multiple Xero connections and Coming soon with no price
  or purchase CTA.
- [ ] The selector offers AUD, NZD and GBP; NZD/GBP show country-specific Coming
  soon states with no numeric prices, conversions or purchase CTA.
- [ ] Early access exposes one primary outcome and no paid leakage.
- [ ] `pricing-currency-selector.tsx` is the only pricing Client Component;
  FAQ and the route have no client state or `force-dynamic`.
- [ ] FAQ is native; comparison is equivalent and accessible on desktop/mobile.
- [ ] Pricing cards use 20px, controls/focus consume completed 14px/3px
  contracts, and pricing CSS has no raw brand hex.
- [ ] 1440/1024/390/200% checks pass in required themes without overflow.
- [ ] Focused tests and mutation proof pass.
- [ ] `bun run check`, `bun run typecheck`, `bun run test`,
  `bun run test:integration` and web build all pass.
- [ ] Web build reports `/pricing` static; diff and scope checks are clean.
- [ ] Plan 129 is marked DONE after reviewer approval.

## STOP conditions

Stop if implementation would require changing the approved 9/50 staff caps,
one/one/multiple connection contract, numeric feed enforcement, schema, Stripe
policy or subscription identifiers; if NZD/GBP amounts or exchange conversion
are requested without an approved price table; if closed access does not match
operations; if catalogue source has moved; if Plans 120/121 are incomplete; if web would need
database/Stripe/server-only imports; static rendering fails after correct
build-time mode resolution; responsive parity requires JavaScript or concurrent
duplicate visible content; a gate fails twice; or scope must expand.

## Maintenance notes

- Future plan changes update `PUBLIC_PLAN_CATALOGUE`; seed and pricing tests must
  catch missed projections.
- AUD prices and descriptions remain presentation data until a safe public Stripe-price
  projection is intentionally designed.
- NZD and GBP are availability states, not converted prices. Adding local prices
  requires explicit amounts and tax/currency approval, then new contract tests.
- Launch mode is a build/deploy switch; changing it requires rebuild, preflight
  and both-mode tests.
- Review commercial truth before polish: access, staff caps, connections, currency/tax
  and CTA outcome must each trace to an approved source.
- Re-run `$impeccable critique apps/web/app/pricing`; target no P1 findings and
  a materially higher score than 14/28.
