# Plan 121: Make the contact page a clear, specific and maintainable enquiry path

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report, do not improvise. When done, update the status row for this plan in
> `plans/README.md`, unless a reviewer dispatched you and told you they maintain
> the index.
>
> **Drift check (run first)**:
> `git diff --stat e7ee7c7..HEAD -- apps/web/app/contact apps/web/app/styles/shell.css apps/web/src/data/support.ts apps/web/app/help-centre/page.tsx apps/web/app/help-centre/onboarding/page.tsx apps/web/app/pricing/components/pricing-experience.tsx apps/web/app/pricing/components/pricing-plans.tsx apps/web/app/status/page.tsx apps/web/app/\(legal\)/terms-of-service/page.tsx apps/web/env.ts apps/web/.env.example apps/web/package.json packages/email/templates/contact.tsx bun.lock`
> If an in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding. On a
> material mismatch, treat it as a STOP condition. Drift in `shell.css` from
> completed Plans 117 and 120 is expected only when it matches those plans'
> documented 3px focus ring and 14px shared button radius.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: Plan 120 DONE (which includes Plan 117 through the integrations sequence)
- **Category**: direction, accessibility, correctness, performance, tech-debt, tests
- **Planned at**: commit `e7ee7c7`, 2026-08-30

## Why this matters

The marketing site routes early-access prospects to `/contact`, but the page's
only next step is a small inline email link buried among support metadata. The
component also mixes shared marketing CSS with utilities that are overridden by
more-specific selectors, hydrates static content unnecessarily, and retains an
unused email Server Action that would be unsafe to reconnect without validation
and abuse controls.

After this plan lands, `/contact` will remain a direct-email experience, but it
will present one unmistakable accessible action, prefill the qualification
details already promised by page metadata, explain the product through a
specific Xero-to-calendar pathway, and use Team Calendar's documented tonal and
typographic system. The retired form path and its marketing-app email wiring
will be removed rather than left as apparently reusable code.

## Impeccable design brief

- **Job and audience**: This is a Persuade-mode page for an Australian
  small-business owner, HR administrator or operations manager arriving from a
  "Talk to us" or early-access CTA. They need to confirm product fit and contact
  a real person without learning implementation jargon.
- **Outcome and proof**: The primary action is "Email our support team". Success
  means the visitor's email client opens with a useful early-access subject and
  prompts for organisation name, team size, Xero Payroll region and the help
  needed. The complete email address remains visible and copyable. Product proof
  is the concrete path from secure Xero Payroll connection, through combined
  leave and availability, to Outlook, Google Calendar and Apple Calendar.
- **Selected direction**: Preserve the incumbent marketing visual world and
  two-column composition. Make the Xero-to-calendar pathway the authored proof
  in the left column and the email action the focal moment in the right column.
  Use scale, spacing and tonal layering for hierarchy; reserve brand green for
  the CTA, pathway markers and small brand anchors.
- **Scope and boundaries**: Refine only the contact experience and the shared
  support constants required to stop content drift. Preserve closed Australian
  early access, the existing header/footer, page metadata intent, light/dark
  theming and direct support model. Do not add a form, scheduler, CRM, database
  write, analytics client boundary, testimonial, customer logo or unverified
  product claim.
- **States and ranges**: The page has no loading, success or error state because
  it performs no submission. It must remain usable when no desktop mail client
  is configured by displaying the full address. Long translated strings are
  out of scope because launch is English-only, but the layout must reflow at
  200% zoom and narrow mobile widths without clipping the address or CTA.
- **Interaction and layout**: Keep a single `h1`, give the contact panel a
  labelled `h2`, use a semantic ordered pathway for the three product steps,
  mark decorative icons `aria-hidden`, and expose the CTA as an ordinary
  `mailto:` anchor styled as the primary marketing button. The CTA must have a
  44px minimum target and a full 3px focus-visible ring. On mobile, stack the
  pathway and contact panel, then make the CTA full-width.
- **Builder must not invent**: Do not restore `ContactForm`, reuse the dormant
  Server Action, add Resend back to `apps/web`, change launch-region claims, or
  expand this work into other marketing-page redesigns.

## Current state

### Contact route

- `apps/web/app/contact/page.tsx` owns metadata and renders `ContactForm`:

```tsx
// apps/web/app/contact/page.tsx:3-11
import { ContactForm } from "./components/contact-form";

export const metadata: Metadata = createMetadata({
  description:
    "Talk to us about getting your small business onto Team Calendar, connected to your Xero Payroll file. Tell us your team size and we will help you set up.",
  title: "Get in touch",
});

const Contact = () => <ContactForm />;
```

- `apps/web/app/contact/components/contact-form.tsx` is a Client Component even
  though it contains no state, effects, handlers or browser APIs:

```tsx
// apps/web/app/contact/components/contact-form.tsx:1-3,28
"use client";

import { Check, Clock, Mail } from "lucide-react";

export const ContactForm = () => (
```

- The only contact action is currently an inline link inside a bordered utility
  container, while copy sizes are expressed through utilities:

```tsx
// apps/web/app/contact/components/contact-form.tsx:53-82
<div className="marketing-simple__panel space-y-4">
  <h2 className="font-semibold text-xl">
    Early Access Contact & Support
  </h2>
  <p className="text-muted-foreground text-sm">...</p>
  <div className="space-y-3 rounded-lg border bg-muted/50 p-4">
    ...
    <a
      className="font-semibold text-primary text-sm underline"
      href="mailto:support@teamcalendar.online"
    >
      support@teamcalendar.online
    </a>
  </div>
  <div className="space-y-1 text-muted-foreground text-xs">...</div>
</div>
```

### CSS conflict and visual rules

- `apps/web/app/styles/shell.css` applies more-specific descendant selectors
  that override the utility font sizes above:

```css
/* apps/web/app/styles/shell.css:397-410 */
.marketing-simple__panel h2,
.marketing-simple__panel h3 {
  font: 600 1.125rem / 1.35 var(--marketing-font);
}

.marketing-simple__panel p,
.marketing-simple__panel li {
  font: 400 0.9375rem / 1.6 var(--marketing-font);
}
```

- At the planning SHA, the reusable button supplies a 44px minimum target but
  uses a 2px focus outline and 16px radius. Plans 117 and 120 already own the
  shared corrections to a 3px focus ring and 14px button radius. Plan 121 must
  consume those completed primitives without adding a redundant local override:

```css
/* apps/web/app/styles/shell.css:223-251 */
.marketing-btn {
  min-height: 44px;
  ...
}

.marketing-btn:focus-visible,
.marketing-site-header__toggle:focus-visible {
  outline: 2px solid var(--marketing-primary);
  outline-offset: 3px;
}
```

- `DESIGN.md` defines the binding rules for this refinement:
  - Lines 145 and 171: marketing is Persuade mode; primary green identifies a
    verb-led primary action.
  - Lines 233-239: display/headline scale creates hierarchy; prose uses the body
    scale and stays readable.
  - Lines 257 and 300: use one primary action and tonal layering before borders.
  - Lines 310-324: persistent cards use 20px corners, controls use 14px and small
    containers use 12px; arbitrary 8px radii are prohibited.
  - Lines 324-328: interactive elements require a full-opacity 3px semantic
    focus ring and 44px minimum coarse-pointer target.
  - Line 157: WCAG 2.2 AA, dark mode, reduced motion/transparency and 200% reflow
    are required.

### Dormant form path

- `apps/web/app/contact/actions/contact.tsx` has no importer in the repository.
  It accepts unrestricted strings, ignores Resend's `{ data, error }` result and
  returns underlying exception messages:

```tsx
// apps/web/app/contact/actions/contact.tsx:8-32
export const contact = async (
  name: string,
  email: string,
  message: string
): Promise<{ error?: string }> => {
  try {
    ...
    await resend.emails.send({ ... });
    return {};
  } catch (error) {
    const errorMessage = parseError(error);
    return { error: errorMessage };
  }
};
```

- The action is the only `apps/web` consumer of `@repo/email`. Its removal makes
  the email-key extension in `apps/web/env.ts`, the `@repo/email` dependency in
  `apps/web/package.json`, the Resend examples in `apps/web/.env.example`, and
  `packages/email/templates/contact.tsx` dead contact-form infrastructure.
  `@repo/observability` must remain because web instrumentation and Next config
  still use it.

### Tests and shared support values

- `apps/web/app/contact/contact.test.ts` only checks the visible address, hours
  and absence of two obsolete form labels. It does not protect CTA prominence,
  product-specific proof, semantic structure or the removal of client/form code.
- `packages/seo/branding.ts` already exports `primaryDomain`; help and status
  pages derive support addresses from it, while contact and pricing hardcode the
  same address. Support hours are duplicated in long and compact formats across
  contact, pricing and onboarding.
- Existing shared-data style uses named exports from `apps/web/src/data`, for
  example `apps/web/src/data/changelog.ts`. Continue that convention. Do not add
  a barrel file.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Impeccable context | `node .agents/skills/impeccable/scripts/context.mjs --target apps/web/app/contact` | exits 0; confirms PRODUCT/DESIGN context; run once before editing |
| Dependency refresh | `bun install` | exits 0; lockfile changes are limited to removing the web app's direct `@repo/email` edge if Bun records it |
| Focused tests | `bunx vitest run apps/web/app/contact/contact.test.ts apps/web/src/data/support.test.ts apps/web/app/pricing/pricing.test.ts --config apps/web/vitest.config.mts` | all focused tests pass |
| Web typecheck | `bunx tsc -p apps/web/tsconfig.json --noEmit --emitDeclarationOnly false` | exits 0 with no diagnostics |
| Detector | `node .agents/skills/impeccable/scripts/detect.mjs --json apps/web/app/contact` | exits 0 and prints `[]` |
| Autofix | `bun run fix` | exits 0; only intended in-scope files change |
| Lint/check | `bun run check` | exits 0 |
| Monorepo typecheck | `bun run typecheck` | exits 0 |
| Unit tests | `bun run test` | exits 0 |
| Integration tests | `bun run test:integration` | exits 0 |
| Production build | `bun run build` | exits 0 for all deployable apps |
| Diff hygiene | `git diff --check` | exits 0 with no output |

If Vitest inherits a nonexistent Windows temporary directory in a Linux shell,
prefix only the affected Vitest command with
`env TMPDIR=/tmp TEMP=/tmp TMP=/tmp`. This is an environment workaround, not a
source-code change.

## Suggested executor toolkit

- Use the `impeccable` skill in refinement/Persuade mode. Run its context script
  once, then follow the craft floor immediately before editing UI.
- Use an available browser verification tool for the bounded desktop/mobile
  inspection in Step 6. `vercel:agent-browser-verify` or
  `vercel:agent-browser` are appropriate when installed.
- Read `PRODUCT.md`, `DESIGN.md`, `.impeccable.md` and
  `apps/web/AGENTS.md` before changing copy or CSS.

## Scope

**In scope** (the only source/config files the executor may modify):

- `apps/web/app/contact/page.tsx`
- `apps/web/app/contact/contact.test.ts`
- `apps/web/app/contact/components/contact-form.tsx` (delete)
- `apps/web/app/contact/components/contact-page-content.tsx` (create)
- `apps/web/app/contact/actions/contact.tsx` (delete)
- `apps/web/app/styles/shell.css`
- `apps/web/src/data/support.ts` (create)
- `apps/web/src/data/support.test.ts` (create)
- `apps/web/app/help-centre/page.tsx`
- `apps/web/app/help-centre/onboarding/page.tsx`
- `apps/web/app/pricing/components/pricing-experience.tsx`
- `apps/web/app/pricing/components/pricing-plans.tsx`
- `apps/web/app/status/page.tsx`
- `apps/web/app/(legal)/terms-of-service/page.tsx`
- `apps/web/env.ts`
- `apps/web/.env.example`
- `apps/web/package.json`
- `packages/email/templates/contact.tsx` (delete)
- `bun.lock`
- `plans/README.md` (status only after execution)

**Out of scope** (do not touch even if related):

- Replacing direct email with a form, Server Action, API route, scheduler or CRM.
- Adding `@repo/email`, Resend configuration or client-side analytics to
  `apps/web`.
- Changing `packages/email/index.ts`, transactional notification templates or
  API-app email delivery.
- Changing shared `.marketing-simple__panel` typography, global marketing
  button focus behaviour or global button radius; Plans 117 and 120 own the
  shared control corrections.
- Redesigning pricing, help, status, legal, header, footer or other marketing
  layouts. Their only allowed change is consuming canonical support values.
- Changing Australian launch scope, support hours, pricing promises, product
  availability or factual claims.
- Adding screenshots or generated image assets to the repository.

## Git workflow

- Branch: `preview` (`origin/preview`), not `main` or a plan-specific feature
  branch. The completed plan lands on `preview`.
- Work directly in the current working tree. Before editing, inspect `git status`; preserve all existing uncommitted and untracked user files.
- Commit: `feat(web): refine contact experience`
- Do not push to `origin/preview` unless the operator explicitly asks.

## Steps

### Step 1: Introduce canonical public support values

Create `apps/web/src/data/support.ts` with named exports derived from
`primaryDomain`:

- `supportEmail`
- `supportMailtoHref`, including a URL-encoded subject and body prompt for
  organisation name, team size, Xero Payroll region and help needed
- one long support-hours display string for prose/card use
- one compact support-hours display string for dense feature lists

Use Australian English and the existing factual window, Monday to Friday,
9:00 am to 5:00 pm AEST. Do not use `as const`, a default export or a barrel.

Update only the support value references in the allowlisted help, pricing,
status and terms files. Preserve each page's surrounding sentence and layout.
Use the long or compact canonical display based on the existing context.

Create `apps/web/src/data/support.test.ts` to assert:

- the email is derived from `primaryDomain`;
- the mailto target contains the expected encoded subject and four prompts;
- long and compact hours retain the same days, times and timezone.

**Verify**:

```bash
rg -n 'support@teamcalendar\.online|Monday . Friday, 9:00|Mon-Fri 9am-5pm' \
  apps/web/app/contact \
  apps/web/app/help-centre \
  apps/web/app/pricing \
  apps/web/app/status \
  'apps/web/app/(legal)/terms-of-service'
```

Expected: no hardcoded support address or service-window value remains in these
consumers; values are imported from `apps/web/src/data/support.ts`.

Run the support test; expected result: all tests pass.

### Step 2: Replace the misleading Client Component with static contact content

Delete `components/contact-form.tsx`. Create
`components/contact-page-content.tsx` as a Server Component named
`ContactPageContent`; it must not contain a `"use client"` directive.

Update `page.tsx` and the existing contact test to import the new component.
Keep the page metadata title and description. Because the mailto body now asks
for team size, the existing metadata promise becomes truthful and should not be
removed.

Build the left column as a semantic three-step product pathway with this factual
sequence:

1. Securely connect Australian Xero Payroll.
2. Bring approved leave and manual availability into one Team Calendar view.
3. Publish availability to Outlook, Google Calendar and Apple Calendar.

Use concise user language. Do not mention OAuth, internal canonical models,
sync cursors, API mechanics or unsupported regions. Use existing Lucide icons,
mark them `aria-hidden="true"`, and keep the written step title and description
as the accessible content.

**Verify**:

```bash
rg -n '"use client"|OAuth flow|AU Payroll organisations|ContactForm' apps/web/app/contact
```

Expected: no matches.

Run the web typecheck; expected result: exit 0 with no diagnostics.

### Step 3: Make email the clear accessible focal action

In `ContactPageContent`, build the right column as a labelled persistent contact
panel:

- Sentence-case heading: `Early access contact and support`.
- Explain that Team Calendar is in closed early access for Australian
  organisations using Xero Payroll.
- Render an ordinary anchor using `supportMailtoHref`, with classes
  `marketing-btn marketing-btn--primary marketing-contact__cta` and the visible
  verb-led label `Email our support team`.
- Display `supportEmail` directly below as selectable/copyable fallback text.
- Display the canonical long support-hours value and preserve the existing
  Australia-only scope and pre-billing clarification.
- Use `aria-labelledby` or equivalent semantic heading association for the
  panel. Mark Mail, Clock and pathway icons decorative.

Do not add an `onClick`, React state, form fields or a client component merely to
measure the link.

**Verify**: extend `contact.test.ts` so static markup asserts the CTA label,
encoded mailto target, visible address, hours, region copy, product pathway,
semantic heading and decorative icon treatment. Keep explicit negative
assertions for `<form`, `<input`, `Preferred date` and `type="file"`.

Run the focused tests; expected result: all pass.

### Step 4: Apply one contact-specific tonal and typographic system

Add semantic `.marketing-contact__*` rules to `apps/web/app/styles/shell.css`.
Do not mix Tailwind typography utilities into the contact panel. The rules must:

- use a 20px radius for the persistent contact panel;
- separate the contact action area with a marketing surface-token shift, not a
  decorative border or shadow;
- inherit the completed 14px shared button radius and full 3px primary
  focus-visible outline from Plans 117 and 120; do not redefine either locally;
- create distinct title, body and metadata sizes without relying on utilities
  overridden by `.marketing-simple__panel p/h2`;
- keep all essential copy at a readable body or label size; do not reproduce the
  current all-`0.9375rem` paragraph cascade or `text-xs` fine print;
- provide an ordered pathway with clear number/icon, title and description
  hierarchy;
- keep prose measures restrained and allow the address to wrap safely;
- stack cleanly below 720px, make the CTA full-width on mobile and preserve at
  least 16px internal gaps;
- use only existing marketing semantic tokens so light and dark themes resolve
  automatically;
- retain usable boundaries in forced-colours mode through the existing
  accessibility section or a narrowly scoped addition.

Do not alter the generic `.marketing-simple__panel` selectors. This avoids a
site-wide typography regression while fixing the contact cascade conflict.

**Verify**:

```bash
rg -n 'rounded-lg|border|text-xs|text-sm|text-xl|bg-muted' \
  apps/web/app/contact/components/contact-page-content.tsx
```

Expected: no matches. Then run the detector; expected output: `[]`.

Also verify the shared primitives before visual review:

```bash
rg -n 'border-radius: 14px|outline: 3px solid var\(--marketing-primary\)' \
  apps/web/app/styles/shell.css
```

Expected: both shared values are present from completed Plans 117 and 120.

### Step 5: Remove the retired contact-form delivery path

Delete:

- `apps/web/app/contact/actions/contact.tsx`
- `packages/email/templates/contact.tsx`

Remove the `@repo/email/keys` extension from `apps/web/env.ts`, the direct
`@repo/email` dependency from `apps/web/package.json`, and the obsolete Resend
section from `apps/web/.env.example`. Keep every `@repo/observability` import and
dependency. Run `bun install` to reconcile `bun.lock`; accept no unrelated
dependency upgrades or broad lockfile churn.

**Verify**:

```bash
rg -n 'ContactTemplate|contact/actions/contact|@repo/email|RESEND_FROM|RESEND_TOKEN' \
  apps/web packages/email/templates
```

Expected: no contact-template/action or marketing-app email dependency/config
matches. Operational email code in other applications and `packages/email`
remains untouched.

Run the web typecheck and focused tests; expected result: both pass.

### Step 6: Perform one bounded Impeccable visual review

Start the web app with `bun run --filter web dev`; expected result: Next.js is
ready on `http://localhost:3001`. Inspect `/contact` in one batched pass at:

- desktop, approximately 1440x900;
- mobile, approximately 390x844;
- light and dark theme;
- 200% browser zoom or equivalent narrow reflow check;
- keyboard-only navigation to the email CTA.

Confirm in the same pass:

- the CTA is the first obvious action and its 3px focus ring is fully visible;
- the pathway reads in the intended order and is recognisably specific to Team
  Calendar;
- the email fallback wraps without clipping;
- no decorative border separates persistent content;
- typography has clear title/body/metadata hierarchy;
- the mobile CTA is full-width and at least 44px high;
- dark mode preserves contrast and tonal separation;
- no horizontal overflow appears at mobile width or 200% zoom.

Batch all defects found in that pass into one correction. Run at most one
confirmation pass after the correction, then stop polishing. Store screenshots
outside the repository or in a temporary directory and remove them after review.
Stop the development process after the confirmation pass and verify port 3001
is no longer owned by the process started for this plan.

**Verify**: record the inspected viewport/theme matrix and confirmation result in
the execution hand-off. Do not claim visual verification if a browser was not
available.

### Step 7: Run all repository gates and inspect scope

Run `bun run fix`, then every focused, detector, typecheck, CI, build and diff
command from the command table. Inspect `git diff --stat` and `git status` before
handoff. Preserve any pre-existing untracked files and unrelated user changes.

**Verify**: every command exits 0, the detector prints `[]`, the visual matrix is
complete, and source/config changes are limited to the in-scope list.

## Test plan

### `apps/web/src/data/support.test.ts` (new)

- derives `supportEmail` from `primaryDomain`;
- encodes the early-access subject;
- prompts for organisation name, team size, Xero Payroll region and help needed;
- keeps long and compact support hours semantically consistent.

### `apps/web/app/contact/contact.test.ts` (expand)

Use the current `renderToStaticMarkup` pattern. Cover:

- the verb-led CTA and full mailto URL;
- visible copyable support address;
- canonical support hours, Australia-only scope and pre-billing clarification;
- all three product pathway steps;
- one `h1` and the labelled contact panel heading;
- decorative icons hidden from accessibility APIs;
- absence of form, input, file upload and obsolete scheduling copy.

### Existing regression coverage

- Keep `apps/web/app/pricing/pricing.test.ts` passing after canonical support
  imports.
- Run the full web and monorepo suites because deleting a workspace dependency
  and template can affect package boundaries and email-preview discovery.

## Done criteria

- [ ] `/contact` renders through `ContactPageContent` with no client directive.
- [ ] One prominent 44px primary email CTA has a full 3px focus-visible ring.
- [ ] The complete support address remains visible and copyable.
- [ ] The mailto subject/body prompts for the four agreed qualification fields.
- [ ] The page explains the Xero-to-availability-to-calendar outcome without
      OAuth or internal implementation jargon.
- [ ] Contact typography is controlled by semantic contact classes; current
      utility/cascade conflicts are absent.
- [ ] Persistent contact containers use tonal layering, 20px card corners and no
      decorative border or shadow.
- [ ] Support email and hours come from `apps/web/src/data/support.ts` in every
      allowlisted consumer.
- [ ] Dormant Server Action, contact email template, marketing-app email keys,
      dependency and sample configuration are removed.
- [ ] `@repo/observability` remains configured for the web app.
- [ ] Focused tests, detector, web typecheck, `bun run check`,
      `bun run typecheck`, `bun run test`, `bun run test:integration`,
      `bun run build` and `git diff --check` all pass.
- [ ] Desktop/mobile, light/dark, 200% reflow and keyboard checks complete in one
      bounded review plus at most one confirmation pass.
- [ ] The development process used for visual verification is stopped and its
      temporary screenshots are removed.
- [ ] No files outside the in-scope list are modified, and pre-existing untracked
      files are preserved.
- [ ] `plans/README.md` marks Plan 121 DONE only after all criteria pass.

## STOP conditions

Stop and report, do not improvise, if:

- Any in-scope current-state excerpt has materially drifted since `e7ee7c7`.
- Plan 120 is not DONE, or the shared 3px focus ring and 14px button radius from
  Plans 117 and 120 are absent.
- Product ownership wants a structured form, scheduler, CRM or analytics event;
  that requires a separate privacy, abuse-control and failure-state design.
- The support address, support hours, Australian launch scope or pricing promise
  is no longer authoritative.
- Removing `@repo/email` from `apps/web` breaks a live marketing-app email path
  not found during this audit.
- `packages/email/templates/contact.tsx` has acquired a caller or is required by
  an approved operational email workflow.
- Fixing contact typography appears to require changing the global
  `.marketing-simple__panel` cascade or other marketing pages.
- The dependency refresh introduces unrelated version changes or broad lockfile
  churn.
- A browser is unavailable for the required visual/accessibility review.
- Any verification command fails twice after one reasonable in-scope correction.
- Completion would require modifying a file outside the allowlist.

## Maintenance notes

- Treat `apps/web/src/data/support.ts` as the canonical public-contact source.
  Future mailbox or service-window changes should update it and its test first;
  page-specific surrounding prose may remain contextual.
- Keep `/contact` server-rendered while it remains a direct-email surface. Adding
  event handlers or a form must come with an explicit client-boundary,
  accessibility, privacy, rate-limit, error-recovery and delivery plan.
- Reviewers should scrutinise computed typography, focus visibility, mobile
  wrapping, dark-mode tonal separation and lockfile scope, not only JSX classes.
- A measurable structured enquiry funnel remains deliberately deferred. If
  early-access operations require qualification analytics, begin with a design
  spike comparing a prefilled email, secure form and scheduling path; do not
  reconnect the deleted action.
