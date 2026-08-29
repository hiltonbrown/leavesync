# Plan 123: Reshape `/about` as a founder-led trust page

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on. Use the
> Impeccable design brief below as the authority for this surface. Modify only
> files listed under **In scope**. If a STOP condition occurs, stop and report it
> rather than improvising. The reviewer maintains `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat e7ee7c7..HEAD -- apps/web/app/about/page.tsx apps/web/app/about/about.module.css apps/web/app/about/about.test.tsx apps/web/app/components/header/index.tsx apps/web/app/components/header/header.test.tsx apps/web/app/styles/style-loading.test.ts apps/web/public/marketing/hilton-brown.webp apps/web/public/marketing/connie.webp`
>
> Plans 117–122 are expected to change shared marketing focus, metadata,
> stylesheet loading, shape scale, header tests and neighbouring pages before
> this plan starts. Compare the post-dependency code with the contracts below.
> Any other material mismatch is a STOP condition.

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: MED
- **Depends on**: Plan 122 DONE; operator-approved founder biography, LinkedIn
  URL, founder portrait and Connie photograph
- **Category**: direction
- **Planned at**: commit `e7ee7c7`, 2026-08-30
- **Findings combined**: public founder placeholders and broken LinkedIn link;
  misleading heading hierarchy; CTA/copy mismatch; generic and left-heavy
  composition; missing About contract test; route-irrelevant first-load CSS;
  missing canonical/Open Graph URL and effective Australian locale; absent
  active About navigation state

## Why this matters

The current About page explains Team Calendar precisely, but its highest-trust
section tells visitors that the founder biography is unfinished and links to a
nonexistent fragment. Its generic icon cards and narrow stacked text panels do
not show the human accountability or product evidence a cautious small-business
operator needs before trusting payroll-adjacent software. The page also has a
misleading document outline, promises a conversation without linking to one,
and lacks tests that would prevent those defects from returning.

This plan follows the Impeccable critique recommendation: make `/about` a
founder-led trust story. Preserve the established quiet visual world, but use
real approved human material and one authored Xero/manual-to-calendar visual to
make the page specific to Team Calendar. End with a direct choice to talk or
inspect the integration model.

## Impeccable design brief

### Job and audience

- **Mode**: Persuade.
- **Visitor**: an Australian small-business owner, payroll administrator or
  operations manager evaluating a pre-launch product that touches leave and
  payroll-adjacent data.
- **State of mind**: cautious, time-poor and looking for accountable human proof,
  a narrow product boundary and a credible next step.
- **Primary job**: understand why Team Calendar exists, who stands behind it,
  and whether it is worth a conversation.

### Outcome and proof

- The primary action is **Talk to us**, linking to `/contact`.
- The secondary action is **View integrations**, linking to `/integrations`.
- Product proof is one readable visual sequence: labelled **Xero leave** and
  **Manual availability** inputs become one privacy-controlled calendar view
  for Outlook, Google Calendar and Apple Calendar.
- Human proof is an approved founder portrait, an approved concise biography
  grounded in real experience, an exact public LinkedIn URL and a shorter
  Connie coda with an approved photograph.
- Success means the page no longer asks the visitor to trust placeholders or a
  generic SaaS composition.

### Selected direction

- Preserve the outcome-led hero and “narrow product, by design” idea.
- Replace the interchangeable three-card principle grid with one authored
  product-boundary composition. It should read as an explanation, not a fake
  application screenshot or customer account.
- Make the founder section the focal moment through an asymmetric portrait/copy
  composition that uses the full container intentionally.
- Keep Connie, but shorten the biography so the humour supports credibility
  instead of outweighing it.
- Close on action, not the defensive phrase “understand the product boundary”.

### Scope, states and anti-goals

- Production-ready static Server Component, with no loading, error or success
  state and no new client boundary.
- Light and dark themes, forced colours, keyboard use, screen readers, reduced
  motion, reduced transparency and 200% zoom are binding.
- Do not add a timeline, company-history section, customer claims, metrics,
  testimonials, decorative dashboard, carousel, video or new product feature.
- Do not use stock photography, synthetic founder/Connie imagery, invented
  personal history or unsupported qualifications.
- Do not replace `DESIGN.md`, introduce a new visual world or restyle another
  marketing page.

### Layout and interaction

- One `<main id="about-main" tabIndex={-1}>` landmark.
- One `h1`; peer page sections use `h2`; principles and named people within a
  section use `h3`.
- Desktop may use an approximately 7:5 text/media split. Tablet keeps two
  columns only while both remain readable. Mobile becomes one deliberate
  reading column with each image adjacent to the copy it proves.
- Persistent surfaces use 20px radii and tonal layering. The final CTA may use
  the established 16px callout treatment. Do not add persistent shadows or
  frost.
- Sage leads. Editorial purple appears only as the subordinate manual-
  availability signal. Every provenance colour has a visible word or icon.
- Lora may appear once as a short human editorial aside, never in buttons,
  navigation, labels or the calendar artefact.
- Buttons and links use the shared 3px focus treatment from Plan 117 and remain
  at least 44px high where rendered as actions.

## Current state

### Route content and placeholders

`apps/web/app/about/page.tsx:100-109` currently publishes:

```tsx
{/* FOUNDER BIO PENDING: replace with Hilton's one-paragraph bio */}
<p className="marketing-simple__section-copy">
  A short biography is on the way. Team Calendar is built and run on
  the Gold Coast by Hilton Brown, for small businesses that want leave
  and availability to stay accurate without the admin.
</p>
{/* LINKEDIN PENDING: replace href with Hilton's LinkedIn URL */}
<a className="marketing-simple__link" href="#linkedin-pending">
  Connect on LinkedIn
</a>
```

The final callout at lines 143-153 says visitors can “talk to us”, but renders
only `/integrations`. The Connie comment at line 131 says a photograph is still
pending. No suitable personal images currently exist in
`apps/web/public/marketing`.

### Heading and landmark defects

- The product-boundary section starts with `h2` at line 52, but its subordinate
  principle cards also use `h2` at line 73.
- The founder section uses `h2` then `h3`, while the separate Connie section
  begins at `h3` without its own `h2`.
- The page root is a `div`, so the route has no main landmark between the shared
  header and footer.

### Generic composition

- Lines 62-78 render three icon-and-copy panels that could belong to an
  unrelated SaaS product.
- `apps/web/app/styles/shell.css:510-518` caps both founder blocks at 620px
  inside a 1200px container, leaving an unexplained empty right column on wide
  screens.
- The founder selectors are About-only in the pre-plan source. After Plan 122,
  keep new About styling in `about.module.css`; do not add new page-specific
  rules back to the global shell.

### Navigation

`apps/web/app/components/header/index.tsx:12-17` currently includes Home,
Features, Integrations and Pricing. Active state is calculated only for those
entries. About appears in the footer but receives no current-page cue in the
sticky header.

Plan 122 creates shared header tests and may add a route-aware skip link for
`/customers`. Extend that established pattern for `/about`; do not overwrite or
special-case away the Customers behaviour.

### Tests

No About test exists. Follow `apps/web/app/contact/contact.test.ts`, which uses
Vitest and `renderToStaticMarkup` for focused public-content assertions. Reuse
the header test created by Plan 122 instead of creating a second header suite.
Do not add full-page snapshots.

### Metadata

The About `createMetadata` call supplies only `title` and `description`. Add:

```tsx
alternates: { canonical: "/about" },
openGraph: { url: "/about" },
```

Plan 118 changes the shared default locale to `en_AU`. Assert the effective
locale in the About test. Do not add a redundant page override if the inherited
value is already proven.

### Stylesheet loading and performance

At the planning commit, root `apps/web/app/styles.css` imports home, feature and
motion styles for every route. Plans 119 and 122 own the shared CSS extraction
and source-loading contract. This plan must not reimplement those changes.

Extend `apps/web/app/styles/style-loading.test.ts` only as needed to prove:

- About imports `about.module.css` from its own route;
- About-specific selectors do not live in the shared shell;
- the production `/about` first-load graph does not regain homepage timeline,
  feature hero, integrations or pricing selectors.

### Design and language rules

- `DESIGN.md:138-157`: “Clarity at a glance”, richer authored Persuade
  composition, WCAG 2.2 AA and adaptive-mode requirements.
- `DESIGN.md:186`: cards use tonal layering rather than white-on-white or
  persistent elevation.
- `DESIGN.md:211`: sage leads and editorial purple supports.
- `DESIGN.md:241`: Lora is limited to short editorial human moments.
- `DESIGN.md:324`: interactive focus uses a full-opacity 3px semantic ring.
- `AGENTS.md:324-325`: Australian English, no em dashes.
- Use `next/image` with explicit dimensions and `sizes` for both photographs.
- TypeScript is strict. Use named exports except the required Next.js page
  default export. Do not add a dependency or barrel file.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Focused tests | `TMPDIR=/tmp bunx vitest run apps/web/app/about/about.test.tsx apps/web/app/components/header/header.test.tsx apps/web/app/styles/style-loading.test.ts packages/seo/metadata.test.ts` | all tests pass |
| Focused lint | `bunx ultracite check apps/web/app/about apps/web/app/components/header apps/web/app/styles/style-loading.test.ts` | exit 0, no fixes |
| Web typecheck | `bun run --cwd apps/web typecheck` | exit 0, no errors |
| Web tests | `TMPDIR=/tmp bun run --cwd apps/web test` | all web tests pass |
| Production build | `bun run --cwd apps/web build` | exit 0; `/about` builds |
| Detector | `node .agents/skills/impeccable/scripts/detect.mjs --json apps/web/app/about/page.tsx` | command completes; no unresolved P0/P1 issue |
| Repository gates | `bun run check && bun run typecheck && TMPDIR=/tmp bun run test && TMPDIR=/tmp bun run test:integration` | every command exits 0 |
| Diff hygiene | `git diff --check && git status --short` | no whitespace errors; only in-scope files plus `plans/README.md` are modified |

`TMPDIR=/tmp` is required in the current WSL environment because the default
Windows temporary directory is unavailable to Vitest.

## Suggested executor toolkit

- Use the `impeccable` skill. Run its context script once for
  `apps/web/app/about`, then read `reference/craft-floor.md` immediately before
  editing. The direction is decided here; do not run a new visual-world
  workshop.
- Use Impeccable's bounded verification: inspect desktop and mobile together,
  fix the observed defects in one batch, then perform at most one confirmation
  pass.
- Use `vercel:react-best-practices` after editing the TSX components if that
  skill is available.
- Use installed Next.js documentation or Context7 if CSS Module or metadata
  behaviour differs from the post-Plan-122 baseline. Do not guess.

## Scope

**In scope, the only source files the executor may modify:**

- `apps/web/app/about/page.tsx`
- `apps/web/app/about/about.module.css` (create)
- `apps/web/app/about/about.test.tsx` (create)
- `apps/web/app/components/header/index.tsx`
- `apps/web/app/components/header/header.test.tsx`
- `apps/web/app/styles/style-loading.test.ts`
- `apps/web/public/marketing/hilton-brown.webp` (create from approved source)
- `apps/web/public/marketing/connie.webp` (create from approved source)
- `plans/README.md` for status bookkeeping only

**Read-only references, never modify in this plan:**

- `PRODUCT.md`
- `DESIGN.md`
- `.impeccable.md`
- `packages/seo/metadata.ts`
- `packages/seo/metadata.test.ts`
- `apps/web/app/contact/contact.test.ts`
- `apps/web/app/customers/page.tsx`
- `apps/web/app/integrations/page.tsx`
- `apps/web/app/styles.css`
- `apps/web/app/styles/shell.css`

**Out of scope, do not touch even if related:**

- Other marketing-page copy, metadata or navigation destinations.
- Backend, authentication, Xero, feed, billing or database behaviour.
- Global colour, typography, radius, focus, spacing or stylesheet-loading
  changes owned by Plans 117–122.
- Sitemap timestamp behaviour, which was considered and rejected as outside the
  About-page scope.
- Organisation/Person JSON-LD. Defer until visible identity content is live and
  exact field parity can be reviewed.
- New motion systems, scroll-jacking, parallax, video, stock photography,
  synthetic personal images or unsupported customer claims.
- Editing Plans 110–122 or undoing their completed source changes.

## Git workflow

- Branch: `preview` (`origin/preview`), not `main` or a plan-specific feature
  branch. The completed plan lands on `preview`.
- Work directly in the current working tree under `plans/README.md` § Execution
  policy.
- Commit: `feat(web): reshape about page around founder trust`
- Do not push to `origin/preview` without operator instruction.
- Before changing branches, stop if `git status --short` contains user work that
  is not safely accounted for.

## Steps

### Step 0: Confirm dependencies and approved human material

Confirm Plans 117–122 are DONE and the post-dependency focused tests pass.
Obtain all four operator-approved inputs before editing production code:

1. A concise founder biography grounded in real operating experience. It must
   not invent employment history, qualifications, customer counts or outcomes.
2. The exact public LinkedIn URL.
3. A licensed founder portrait approved for publication.
4. A licensed Connie photograph approved for publication.

Prepare the photographs as `hilton-brown.webp` and `connie.webp`. Preserve a
natural crop and keep each source file at or below 600 KB. Do not manufacture
missing content with image generation or inferred biography details.

**Verify**:

```bash
rg -n 'State.*DONE|Status.*DONE' plans/117-*.md plans/118-*.md plans/119-*.md plans/120-*.md plans/121-*.md plans/122-*.md
file apps/web/public/marketing/hilton-brown.webp apps/web/public/marketing/connie.webp
test "$(stat -c%s apps/web/public/marketing/hilton-brown.webp)" -le 600000
test "$(stat -c%s apps/web/public/marketing/connie.webp)" -le 600000
```

Expected: each prerequisite is recorded DONE; both assets are valid WebP files;
both size checks exit 0. If any prerequisite or approved input is missing, stop
before changing production code.

### Step 1: Add failing About, header and style-loading contracts

Create `apps/web/app/about/about.test.tsx`, following the static-render pattern
in `contact.test.ts`. Assert:

- one `main` landmark with `id="about-main"` and one `h1`;
- peer product-boundary, human-story and final-action sections use `h2`;
- principles and named people beneath those sections use `h3`;
- no `pending`, `on the way` or `#linkedin-pending` text/target remains;
- approved founder content, exact LinkedIn URL and both meaningful image alt
  texts render;
- `/contact` and `/integrations` both render in the final CTA;
- Xero Payroll, manual availability, Outlook, Google Calendar and Apple Calendar
  remain represented without freezing complete paragraphs;
- exported metadata resolves `/about` for canonical and Open Graph URL and has
  an effective `en_AU` locale.

Extend the post-Plan-122 header test. Mock `usePathname()` as `/about` and assert
About is present and receives `aria-current="page"` in desktop and mobile
navigation. Preserve every existing Customers and non-Customers assertion.

Extend `style-loading.test.ts` to require an About-owned CSS Module import and
reject About-only selectors from the shared shell. Do not restate the entire
cross-route loading test from Plan 122.

**Verify**: run the focused test command. Expected: new About assertions fail
against the old page for the known defects, while pre-existing post-Plan-122
tests continue to pass. There must be no test import or syntax error.

### Step 2: Rebuild the page's semantic and narrative structure

Refactor the route root to `<main id="about-main" tabIndex={-1}>`. Use this
heading structure:

1. one hero `h1`;
2. an `h2` for the product boundary, with `h3` labels inside its visual;
3. an `h2` for the human story, with `h3` names for Hilton and Connie;
4. an `h2` for the final action.

Preserve the core claim that availability should be visible where work already
happens and the narrow-product positioning. Tighten repeated copy rather than
adding another explanatory section.

Replace the three generic principle cards with one accessible product-boundary
composition. It must show:

- a labelled `Xero leave` source;
- a labelled `Manual availability` source;
- a clear convergence into one privacy-controlled calendar view;
- Outlook, Google Calendar and Apple Calendar as destinations;
- fictional illustrative entries that cannot be mistaken for customer data.

Use visible labels and icons so source meaning does not depend on sage and
purple alone. Hide decorative SVGs with `aria-hidden`.

**Verify**: About tests pass for landmark, hierarchy and product vocabulary.
Run focused lint and web typecheck; both exit 0.

### Step 3: Publish approved founder proof and rebalance Connie

Import both photographs with `next/image`, explicit dimensions and responsive
`sizes`. Use meaningful alt text approved alongside the assets.

Build one asymmetric founder composition using the approved portrait,
biography, role and LinkedIn URL. If the external link opens a new tab, add
`rel="noopener noreferrer"`; otherwise use a normal same-tab anchor. Remove all
pending comments and visible placeholder prose.

Place Connie after the founder within the same human-story section. Shorten the
current comic biography materially, retain one or two specific lines of warmth,
and ensure it remains subordinate to the founder's accountability story. Do not
erase the page's personality by reducing Connie to a generic caption.

**Verify**:

```bash
rg -n "PENDING|pending|on the way|#linkedin-pending" apps/web/app/about
```

Expected: no matches. Focused About tests, lint and web typecheck all pass.

### Step 4: Implement the route-owned composition

Create `about.module.css` and import it from the page. Use CSS Module class
references for About-specific layout. Keep shared `marketing-simple`, button,
container and typography primitives global; do not copy their declarations.

Implementation requirements:

- persistent panels use 20px radii and tonal surfaces without borders or
  shadows;
- the final CTA may retain the shared 16px callout surface;
- green is reserved for primary action and Xero/source signal;
- editorial purple is a quieter manual-source signal;
- body measure remains approximately 65–75 characters;
- at 1440px, founder and product-boundary sections use the available container
  instead of leaving an unexplained half-empty column;
- at 820px, retain two columns only while content remains readable;
- at 390px and 200% zoom, use one column with no horizontal scrolling;
- images preserve faces and remain adjacent to their supporting copy;
- no new animation is required. If one source-to-calendar transition is added,
  it must be explanatory, brief and removed under `prefers-reduced-motion`.

**Verify**: style-loading and About tests, lint and web typecheck pass. Run the
detector and resolve every real issue without adding ignores.

### Step 5: Complete navigation, metadata and final action

Add About to the existing navigation model. Reuse the established active-link
helper/pattern for desktop and mobile links. Preserve Customers skip-link
behaviour, mobile close-on-navigation, Escape handling, theme control and the
no-JavaScript fallback. Do not shrink type or targets to fit the extra link.

Add route-owned metadata:

```tsx
alternates: { canonical: "/about" },
openGraph: { url: "/about" },
```

Use relative paths so the shared `metadataBase` resolves the host. Rely on Plan
118's inherited `en_AU` default and keep its override tests green.

Rewrite the closing heading around the visitor's next step. Render a primary
button-sized `Talk to us` action to `/contact` and a quieter
`View integrations` action to `/integrations`. The sentence and actions must
promise the same choices.

**Verify**: focused About, header and metadata tests pass; lint and web
typecheck exit 0.

### Step 6: Run one bounded visual and accessibility pass

Start the web app with a recorded stop method. Capture `/about` at 390x844,
820x1180 and 1440x1000, with mobile and desktop in light and dark modes. Also
check 200% zoom, keyboard traversal and forced colours when supported.

Confirm:

- no clipping, overflow or unexplained empty right column;
- portrait and Connie crops remain intentional;
- the boundary visual reads in source-to-calendar order without colour;
- heading navigation returns one `h1`, peer `h2`s and subordinate `h3`s;
- About has a visible active navigation state and the fifth desktop nav link
  fits before the established collapse breakpoint;
- skip-link, CTA and focus order match visual order;
- first-load production CSS for `/about` excludes homepage timeline, feature
  hero, integrations and pricing selectors;
- `/`, `/features`, `/integrations`, `/pricing`, `/contact` and `/customers`
  retain their post-Plan-122 styling after the shared header change.

Make one consolidated correction pass, then perform at most one confirmation
batch. Stop the server and confirm its port is free. Do not retain screenshots.

**Verify**: record viewport, theme, keyboard, CSS-network and cleanup results in
the executor report or plan review section.

### Step 7: Run final gates and prove scope

Run the focused tests, focused lint, web typecheck, web tests, production build,
detector, all four repository gates, `git diff --check` and `git status --short`.

Review every hunk against this plan. Remove temporary content, debugging output,
unused old About markup/classes and comments that narrate obvious JSX. Do not
format or edit unrelated files.

**Verify**: every command exits as expected; all tests pass; no unresolved P0/P1
detector issue remains; only in-scope files and the plan index are modified.

## Test plan

### `apps/web/app/about/about.test.tsx`

- One focusable main landmark and one `h1`.
- Truthful `h2`/`h3` order.
- Approved founder content, exact LinkedIn destination and both image paths/alt
  texts.
- No placeholder prose, pending fragment or pending comments in rendered output.
- Direct `/contact` and `/integrations` final actions.
- Stable product/source/destination vocabulary without whole-page snapshots.
- Effective `/about` canonical, Open Graph URL and `en_AU` locale.

### `apps/web/app/components/header/header.test.tsx`

- About renders in desktop and mobile navigation.
- `/about` receives `aria-current="page"`.
- Existing Customers skip-link and non-Customers assertions remain unchanged.

### `apps/web/app/styles/style-loading.test.ts`

- About owns its CSS Module import.
- About-only selectors do not return to the global shell.
- Existing cross-route CSS-loading assertions from Plan 122 continue to pass.

### Verification order

1. New assertions fail for the intended pre-change defects.
2. Focused tests pass after each owning step.
3. Production build and CSS-network evidence pass before visual sign-off.
4. Full repository gates pass after the complete implementation.

## Done criteria

- [ ] All four approved human inputs are present; no personal fact or image was
  invented.
- [ ] `rg -n "PENDING|pending|on the way|#linkedin-pending" apps/web/app/about`
  returns no matches.
- [ ] About renders one focusable `main`, one `h1`, peer `h2`s and subordinate
  `h3`s; tests prove the outline.
- [ ] The product-boundary visual visibly distinguishes Xero leave and manual
  availability without relying on colour.
- [ ] Founder proof is the human-story focal point; Connie remains a shorter,
  specific coda.
- [ ] Both responsive images use `next/image`, meaningful alt text and approved
  WebP sources no larger than 600 KB each.
- [ ] Final copy and actions both offer `/contact` and `/integrations`.
- [ ] About appears in desktop/mobile navigation with a visible active state.
- [ ] About exports canonical and Open Graph `/about` metadata and inherits the
  tested `en_AU` default.
- [ ] About-specific styles are route-scoped and production evidence shows
  unrelated campaign CSS is absent from its first-load graph.
- [ ] Mobile, tablet, desktop, light, dark, 200% zoom, keyboard and forced-colour
  checks pass in one bounded batch plus at most one confirmation pass.
- [ ] Focused tests, lint, web typecheck, web tests, build, detector and all four
  repository gates pass.
- [ ] Only in-scope files and `plans/README.md` are modified.
- [ ] `plans/README.md` marks Plan 123 DONE only after every criterion passes.

## STOP conditions

Stop and report back, do not improvise, if:

- Plan 122 or any prerequisite in its chain is not DONE;
- the approved biography, LinkedIn URL, founder portrait or Connie photograph
  is missing;
- the operator asks for synthetic personal imagery or an unverified personal
  claim without explicit source material and approval;
- post-dependency source does not match the expected shared focus, locale,
  stylesheet-loading or header-test contracts;
- adding About cannot fit the supported desktop header without reducing target
  size, causing overlap or changing the global breakpoint;
- approved images cannot meet the 600 KB source limit without unacceptable
  quality loss;
- `/about` still loads unrelated campaign CSS after using the post-Plan-122
  route-owned module pattern;
- fixing a regression requires source outside Scope;
- canonical metadata requires an environment-specific absolute URL rather than
  resolving through the existing `metadataBase`;
- a focused or full verification command fails twice after a reasonable,
  in-scope correction;
- implementation requires a new dependency, design-token change, backend work,
  new product claim or any out-of-scope file.

## Maintenance notes

- Treat founder copy and photographs as factual public identity material. Future
  edits require the same approval discipline.
- Keep the product-boundary composition illustrative and visibly fictional; it
  is not customer evidence or a live application screenshot.
- Future About-specific styling belongs in `about.module.css`. Do not restore it
  to the global shell for convenience.
- When personal images change, preserve aspect-ratio behaviour, alt-text intent
  and source-size limits.
- If the site becomes multilingual, locale should become route-owned; until
  then, Plan 118's `en_AU` default remains authoritative.
- Add Organisation/Person JSON-LD only after visible founder content is live and
  exact field parity can be reviewed.
- Reviewers should scrutinise asset provenance, factual-copy approval, heading
  order, route CSS evidence and desktop navigation width before approval.
