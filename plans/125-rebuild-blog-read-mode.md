# Plan 125: Rebuild Blog as a validated, accessible Read-mode publishing surface

> **Executor instructions**: Follow this plan step by step. Run every verification
> command and confirm the expected result before moving on. This is one coordinated
> vertical slice: do not split it into partial implementations or report completion
> while any finding remains. Touch only the files listed in scope. Stop on any STOP
> condition. The reviewer maintains `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat e7ee7c7..HEAD -- apps/web/package.json bun.lock apps/web/next.config.ts apps/web/mdx-components.tsx apps/web/app/layout.tsx apps/web/app/components/header/index.tsx apps/web/app/blog apps/web/app/rss.xml apps/web/app/sitemap.ts apps/web/app/sitemap.test.ts apps/web/src/lib/blog.ts apps/web/src/lib/blog.test.ts apps/web/src/lib/next-config.test.ts apps/web/src/components/mdx-content.tsx apps/web/src/content/blog`
>
> If an in-scope file changed, compare the live code with Current state. Stop if
> the change alters the content model, MDX pipeline, Blog structure, sitemap
> ownership or shared navigation contract.

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: MED
- **Depends on**: none; coordinate with Plans 117 and 118 as described below
- **Category**: bug, accessibility, performance, tests, tech-debt, docs, direction
- **Planned at**: commit `e7ee7c7`, 2026-08-30

## Why this matters

The current Blog has a sound content premise but an unreliable publishing
pipeline and incomplete reading experience. The active Next.js 16 local server
returns HTTP 500 for `/blog`, articles and `/sitemap.xml` because Next externalises
`mdx-bundler` and its packaged runtime cannot resolve the transitive `gray-matter`
dependency. The loader also compiles every article body for metadata-only work,
swallows content failures, and sends static prose through a Client Component for
runtime evaluation.

The interface has connected product and accessibility defects: articles have no
mobile gutter, their visual language does not match the index, Blog has no
primary-navigation location, routes lack a main landmark and usable bypass path,
regional claims contradict AU launch truth, and metadata, sitemap and tests are
incomplete.

After this plan, one statically imported, Zod-validated catalogue powers the
index, articles, related reading, RSS, metadata and sitemap. MDX renders as Server
Components through the official stable Next.js plugin. Mobile preserves a 16px
gutter, reading and focus paths are explicit, and published copy matches the AU
launch contract.

## Impeccable design brief

### Job, audience and outcome

- **Mode**: Read.
- **Audience**: Australian small-business owners, payroll administrators and
  operations managers evaluating Team Calendar or learning Xero-connected leave
  and calendar subscriptions.
- **Job**: teach one practical concept, establish trust through exact product
  language, then provide a useful next step without turning the article into a
  sales landing page.
- Position Blog as a **guide-led Xero Payroll knowledge base**. Product updates
  remain a supported secondary content type.
- The index explicitly names Xero Payroll leave, secure calendar feeds and team
  availability. Generic “updates, guides, and articles” wording is insufficient.

### Selected direction

- Preserve Plus Jakarta Sans, lavender tonal surfaces, scarce forest green and
  the existing header/footer. This is refinement inside the documented visual
  world, not a redesign.
- Establish a scoped Blog Read-mode system instead of generic `container` and
  `prose-neutral` composition.
- Use hierarchy, measure, spacing and one editorial-purple accent before adding
  decoration. Green stays an action/link and brand signal, not wallpaper.
- Index cards expose content type (`Guide` or `Update`), date, title, description
  and author. A card is featured only when metadata says so, never because it is
  array index zero.
- The ICS guide contains one compact, labelled Xero Payroll → Team Calendar →
  Outlook/Google Calendar/Apple Calendar figure. It must teach, not decorate.
- Every article ends with author context, related reading and one contextual link
  to Integrations, Help centre or Changelog.
- Keep motion to existing fast hover/focus transitions. No scroll animation.

### Scope, states and anti-goals

- Production-ready index, article, route error, content catalogue, metadata,
  social image, RSS and sitemap.
- Minimum: zero published posts has a useful empty state. Typical: 2–12 posts.
  Maximum for this slice: 20 posts without broken grid flow or metadata work
  proportional to article body size.
- Drafts stay out of index, static params, related reading, RSS and sitemap.
- Invalid metadata or MDX fails development/build with slug and field/compiler
  context. Only an unknown valid slug becomes a 404.
- Unexpected route errors use plain-language Retry and Back to Blog recovery and
  existing observability.
- No CMS, search, filters, pagination, comments, newsletter capture, analytics
  events, remote images, stock photography or client-side MDX runtime.

### Responsive and accessibility contract

- 16px outer padding below 640px; 65–75 character reading measure on larger
  screens; one-dimensional reflow at 200% zoom.
- One `<main id="blog-main">` per page. A keyboard-visible skip link targets it
  before the repeated Blog navigation path.
- Blog appears in desktop, mobile and no-JavaScript navigation;
  `aria-current="page"` works for `/blog` and `/blog/*`.
- Every Blog card, back link and action has a 3px focus-visible ring. Standalone
  coarse-pointer actions meet the 44px floor.
- The teaching diagram is a labelled `<figure>` with `<figcaption>`; colour is
  never its only carrier. Light, dark, forced-colours, reduced-motion and
  reduced-transparency remain usable.

### Decisions the executor must not invent

- Australia is shipped launch scope. New Zealand and United Kingdom are planned.
- Use `withdraw` / `withdrawn`, not `cancelled`, for the product action/state.
- Metadata becomes explicit JavaScript exports in MDX. Do not retain YAML
  frontmatter or add a second parser.
- Use stable `@next/mdx` as documented in
  `apps/web/node_modules/next/dist/docs/01-app/02-guides/mdx.md`. Do not enable
  experimental `mdxRs`.

## Current state

### Runtime and content pipeline

- `apps/web/src/lib/blog.ts:1-3` imports filesystem APIs and `bundleMDX`.
- `getPost` catches every read/compile error and returns `null`; `getAllPosts`
  catches directory errors and returns `[]`. Broken content can look unpublished.
- `getAllPosts` calls `getPost` for every file, so index, static params and sitemap
  each pay full MDX compilation cost.
- `apps/web/src/components/mdx-content.tsx:1-15` is a Client Component calling
  `getMDXComponent(code)`, hydrating and evaluating static prose in browsers.
- `apps/web/package.json` declares `mdx-bundler`. It is on Next 16's automatic
  external-package list, which explains the current packaged-runtime failure.
- Installed Next docs say local `@next/mdx` imports render through Server
  Components and require `mdx-components.tsx`.

### Product truth and lifecycle

- Both posts use YAML frontmatter with title, description, date and author only.
- `introducing-teamcalendar.mdx:10` claims current AU, NZ and UK connections,
  conflicting with AU-only launch truth.
- `ics-feeds-explained.mdx:22` says leave is “cancelled”, conflicting with the
  withdraw/withdrawn domain vocabulary.
- Both bylines are “Team Calendar Team”, with no role or trust context.
- Articles stop abruptly after the final instruction or one Changelog link.

### Composition, navigation and metadata

- `apps/web/app/blog/page.tsx:26-86` uses an authored shell but a root `<div>`;
  its first card is featured through `index === 0`.
- The index lead is generic and does not name Xero Payroll or the reader's job.
- `apps/web/app/blog/[slug]/page.tsx:45-87` uses
  `container mx-auto py-16`. At 390px the back link, metadata, H1 and body sit
  flush against both viewport edges.
- The Back to Blog link uses `focus:outline-none`; the article falls back to a
  generic neutral prose preset and has no end-state.
- `apps/web/app/components/header/index.tsx:12-17` omits Blog. Only desktop links
  calculate `aria-current`.
- `apps/web/app/layout.tsx` uses `lang="en"`, not `en-AU`.
- Blog JSON-LD contains only context/type. Article metadata has title/description
  only and no `BlogPosting` data.
- `apps/web/app/sitemap.ts` converts every top-level directory into a URL,
  including `/components` and `/styles`, and stamps all entries with `new Date()`.
- No RSS route exists and there are no Blog/MDX/sitemap/RSS tests.
- Match focused static-markup tests in `apps/web/app/contact/contact.test.ts` and
  `apps/web/app/pricing/pricing.test.ts`; avoid whole-page snapshots.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `bun install` | exit 0; lockfile changes only for intended dependency graph |
| Focused tests | `bunx vitest run apps/web/src/lib/blog.test.ts apps/web/app/blog/blog.test.tsx apps/web/app/blog/[slug]/page.test.tsx apps/web/app/sitemap.test.ts apps/web/app/rss.xml/route.test.ts apps/web/src/lib/next-config.test.ts` | all pass |
| Targeted lint | `bunx ultracite check apps/web/next.config.ts apps/web/mdx-components.tsx apps/web/app/layout.tsx apps/web/app/components/header/index.tsx apps/web/app/blog apps/web/app/rss.xml apps/web/app/sitemap.ts apps/web/app/sitemap.test.ts apps/web/src/lib/blog.ts apps/web/src/lib/blog.test.ts apps/web/src/lib/next-config.test.ts apps/web/src/content/blog` | exit 0, no fixes |
| Web typecheck | `bun run --cwd apps/web typecheck` | exit 0 |
| Web build | `bun run --cwd apps/web build` | exit 0; Blog, articles, RSS and sitemap build |
| Repository gates | `bun run check && bun run typecheck && bun run test && bun run test:integration` | all exit 0 |
| Diff hygiene | `git diff --check` | no output, exit 0 |

If build validation needs public URL or launch-mode variables, use documented
non-secret local values already accepted by preflight. Do not invent secrets or
weaken environment validation.

## Suggested executor toolkit

- Use `impeccable`: run context once for `apps/web/app/blog`; read `adapt`,
  `typeset`, `audit`, `clarify` and `harden` before their steps; read
  `craft-floor` immediately before UI edits. After editing, run one bounded
  desktop/mobile light/dark scan, fix its complete defect batch, then perform at
  most one confirmation round.
- Use `vercel:nextjs` if available for `@next/mdx`, metadata conventions and App
  Router behavior. Installed local Next docs are authoritative.
- Use `vercel:react-best-practices` after editing multiple TSX components.
- Use `vercel:agent-browser-verify` when the local server starts.

## Scope

**Existing files in scope**:

- `apps/web/package.json`
- `bun.lock`
- `apps/web/next.config.ts`
- `apps/web/app/layout.tsx`
- `apps/web/app/components/header/index.tsx`
- `apps/web/app/blog/page.tsx`
- `apps/web/app/blog/[slug]/page.tsx`
- `apps/web/app/sitemap.ts`
- `apps/web/src/lib/blog.ts`
- `apps/web/src/lib/next-config.test.ts`
- `apps/web/src/content/blog/introducing-teamcalendar.mdx`
- `apps/web/src/content/blog/ics-feeds-explained.mdx`
- `apps/web/src/components/mdx-content.tsx` (delete after callers are gone)

**Files that may be created**:

- `apps/web/mdx-components.tsx`
- `apps/web/app/blog/blog.module.css`
- `apps/web/app/blog/components/article-footer.tsx`
- `apps/web/app/blog/components/calendar-flow-diagram.tsx`
- `apps/web/app/blog/error.tsx`
- `apps/web/app/blog/opengraph-image.tsx`
- `apps/web/app/blog/blog.test.tsx`
- `apps/web/app/blog/[slug]/page.test.tsx`
- `apps/web/app/rss.xml/route.ts`
- `apps/web/app/rss.xml/route.test.ts`
- `apps/web/app/sitemap.test.ts`
- `apps/web/src/content/blog/posts.tsx`
- `apps/web/src/lib/blog.test.ts`

**Out of scope**:

- Content outside the two current posts; `packages/seo` API changes; global site
  redesign; authenticated app/API/database/Xero/feed/jobs code; CMS, search,
  pagination, filters, comments or analytics.
- Plans 110–120. Plan 117 owns global marketing focus correction and Plan 118
  owns default site-wide Open Graph locale. This plan makes Blog compliant but
  must not mark those plans complete or overwrite unrelated page work.
- New UI dependencies solely for Blog presentation.

## Git workflow

- Branch: `preview` (`origin/preview`), not `main` or a plan-specific feature
  branch. The completed plan lands on `preview`.
- Work in the current checkout per repository policy. Preserve existing user
  changes; do not use destructive Git commands.
- Suggested commits:
  1. `refactor(web): render blog mdx on the server`
  2. `fix(web): align blog content and metadata`
  3. `feat(web): establish blog read mode`
  4. `test(web): cover blog publishing pipeline`
- Do not push to `origin/preview` without explicit operator instruction.

## Steps

### Step 1: Add failing characterisation tests

Add tests for the final public contract before production edits.

`apps/web/src/lib/blog.test.ts` must cover:

1. Valid required metadata and strict `YYYY-MM-DD` dates.
2. Missing/invalid title, description, author, author role, category, status,
   date or region fails with slug/field context.
3. `updatedAt` cannot predate `publishedAt`.
4. Draft exclusion from every public selector.
5. Published-date descending order with slug tie-break.
6. Feature state comes from metadata and at most one published post is featured.
7. Exact unknown slug returns `null` without filesystem access.
8. Related posts exclude current slug, prefer category and cap at two.

Route tests cover index semantics/empty state, article metadata/markup/404,
sitemap allowlist/stable dates, RSS XML/escaping/order and MDX config composition.
Run them before production edits and confirm they fail for named missing
contracts, not harness errors.

**Verify**: focused tests fail only for expected final-contract gaps.

### Step 2: Replace `mdx-bundler` with official local MDX imports

1. Remove direct `mdx-bundler`.
2. Add versions compatible with installed Next 16 for `@next/mdx`,
   `@mdx-js/loader`, `@mdx-js/react` and `@types/mdx` as documented locally.
3. Run `bun install`; reject unrelated lockfile churn.
4. Compose `createMDX()` around the final web config without losing redirects,
   logging, Sentry or analyser behavior. Add `.mdx` to `pageExtensions` if the
   installed guide requires it. Do not use experimental `mdxRs`.
5. Create required `mdx-components.tsx` with named `useMDXComponents`. Keep MDX
   semantic and server-rendered; internal links use `Link`, external links use
   safe anchors without unchecked casts.
6. Convert YAML frontmatter to exported `metadata` objects.
7. Create `src/content/blog/posts.tsx` as the only registry, using explicit static
   imports for each known MDX component and metadata export.
8. Delete `src/components/mdx-content.tsx` after all callers are removed.

**Verify**:

- `rg -n 'mdx-bundler|getMDXComponent' apps/web/package.json apps/web/next.config.ts apps/web/app/blog apps/web/src` returns no matches.
- Web typecheck and production build exit 0.

### Step 3: Define one validated editorial catalogue

Refactor `src/lib/blog.ts` around the static registry. Remove filesystem reads,
path construction, compilation and broad catches.

The Zod contract includes bounded non-empty `title`, `description`, `author` and
`authorRole`; `category: guide | update`; `status: draft | published`; strict
`publishedAt`; optional non-earlier `updatedAt`; non-empty
`regions: AU | NZ | UK[]`; and `featured` default false.

Parse once at registry initialisation with slug/field context and no MDX source
dump. Public APIs:

- `getAllPosts()` returns published metadata in canonical order.
- `getPost(slug)` returns validated metadata/component or `null` for unknown slug.
- `getRelatedPosts(slug, limit = 2)` excludes current post/drafts.
- Export a pure parser seam for fixtures, not raw schema internals.

Do not catch schema/module/compile failures. They are build defects.

**Verify**: `bunx vitest run apps/web/src/lib/blog.test.ts` passes.

### Step 4: Correct and lifecycle-tag both articles

- Launch post: category `update`, published, AU, not featured. State AU launch
  truth; name NZ/UK as planned only where useful. Remove stale “next releases”
  promises or replace with a dated update note pointing to current truth.
- ICS post: category `guide`, published, AU, the single featured article. Replace
  cancellation vocabulary, explain ICS in everyday language before RFC/UID/token
  terms, and add `<CalendarFlowDiagram />` after the concept introduction.
- Use author `Team Calendar` and short `Product team, Gold Coast` context.
- Set `updatedAt` only for material revisions.
- Shared article footer owns related reading and next steps.
- Do not promise calendar-client delivery timing. Use Australian English and no
  em dashes.

**Verify**:

- Content tests pass.
- `rg -n 'connects to Xero Payroll AU, NZ, and UK|cancelled|within 60 seconds' apps/web/src/content/blog` returns no matches.

### Step 5: Build the scoped Read-mode interface

Create `blog.module.css`; reuse the global shell only where correct.

**Index**:

- Use `<main id="blog-main">`, guide-led hero copy and explicit category/date/
  author/title/description.
- Feature only through metadata. Balance zero, one, two and twenty-card layouts.
- Use subtle tonal hover and 3px focus-visible rings.

**Article**:

- Use `<main id="blog-main">` and `<article>` with header, one H1, description,
  body and footer.
- Guarantee 16px mobile outer padding and 65–75ch desktop measure. Remove
  `focus:outline-none`; Back to Blog gets visible focus and a coarse-pointer hit
  area.
- Use existing font/tokens, at least 1rem body and approximately 1.7 line height.
  Style headings, lists, links, inline code, blockquotes and figures in light,
  dark and forced colours. Avoid border-led separation.

**Diagram/end-state**:

- Server-rendered `CalendarFlowDiagram` uses `<figure>/<figcaption>`, labelled
  nodes and decorative arrows hidden from assistive technology; stack vertically
  on mobile without horizontal scrolling.
- `ArticleFooter` renders author context, up to two related posts and one
  contextual next step (`/integrations` for ICS, Changelog/guide for launch).

**Verify**: focused markup tests, targeted lint and web typecheck pass.

### Step 6: Make Blog discoverable and keyboard-oriented

- Add Blog to desktop, mobile and no-JavaScript header navigation.
- Use one active-state helper so `/blog` and descendants set `aria-current`
  consistently.
- On Blog paths, render a visually hidden skip link before repeated Blog
  navigation that becomes opaque/visible on focus and targets `#blog-main`.
  Do not render a broken Blog target elsewhere.
- Set root document language to `en-AU`; update the global-error document only if
  required for consistency.
- Keep Blog focus selectors compatible with future Plan 117. Do not duplicate
  Plan 118's global Open Graph locale change.

**Verify**: one main target per route, header active-state tests, and keyboard
browser check for skip-link focus transfer.

### Step 7: Complete metadata and social presentation

Use `resolveCanonicalWebUrl` everywhere.

- Index metadata: canonical `/blog`, guide-led description and RSS autodiscovery.
- Blog JSON-LD: name, description, URL, publisher and published-post references.
- Article metadata: canonical, `openGraph.type = article`, URL, published/modified
  times, author and social image.
- Article JSON-LD: escaped `BlogPosting` with headline, description, dates,
  author, publisher and `mainEntityOfPage`.
- Unknown slug metadata is empty/noindex-safe and page uses `notFound`.
- Create a local 1200×630 Blog-level `ImageResponse` using existing brand palette.
  Do not fetch remote assets. If local SVG use is unsupported, use text/CSS
  shapes rather than a network dependency.

**Verify**: metadata/JSON-LD tests and production image-route build pass.

### Step 8: Replace sitemap guessing with an explicit public contract

- Remove `fs.readdirSync("app")` inference.
- Explicitly include root, About, Blog, Careers, Changelog, Contact, Customers,
  Features, Help centre, Integrations, Pricing, Privacy, Security, Status and
  Terms.
- Omit `lastModified` for static pages without truthful dates.
- Add published posts with `updatedAt ?? publishedAt`; omit drafts, route groups,
  components, styles, templates and internal endpoints.

**Verify**: sitemap test proves allowlist, exclusions, stable dates and canonical
URLs.

### Step 9: Add RSS from the same catalogue

Create static `GET /rss.xml`:

- RSS 2.0 channel title, guide-led description, canonical Blog link, self link
  and `en-AU` language.
- Published posts only, in canonical order, with escaped title/description,
  absolute link/GUID, category/author and stable publication date.
- Use a small tested XML-escape helper. Do not embed compiled article HTML.
- Add metadata autodiscovery and only a secondary visible RSS link if it does not
  compete with article choice.

**Verify**: route returns 200, RSS content type and parseable/escaped XML with no
drafts.

### Step 10: Add Blog-specific unexpected-error recovery

Create the smallest necessary Client Component error boundary:

- Capture through existing observability.
- Plainly state Blog could not load.
- Retry and Back to Blog controls with compliant focus.
- No stack, dependency name or raw payload.
- Unknown slugs remain 404. Validation/MDX defects remain build failures.

**Verify**: focused error test covers copy, retry, navigation and absence of
technical details.

### Step 11: Run bounded Impeccable visual verification

Start the current checkout's web server separately. Verify HTTP 200 for `/blog`,
both article slugs, `/rss.xml` and `/sitemap.xml`.

Inspect 390×844, 820×1180 and 1440×1000 in light/dark; article at 200% zoom;
keyboard-only path; reduced motion; forced colours; and JavaScript-disabled
article prose. Check mobile gutter/no overflow, desktop measure, category not
colour-only, balanced card ranges, stacked diagram, visible 3px focus, active
Blog location, useful ending and no console/hydration errors.

Fix the complete defect batch once, rerun affected tests, then do at most one
confirmation capture. Stop all processes started for verification and confirm
port 3001 is free unless the user asked otherwise.

**Verify**: record exact coverage; all five HTTP checks return 200 and console
has no Blog error.

### Step 12: Run production and repository gates

Run focused tests, targeted lint, web typecheck, clean web production build,
`bun run check`, `bun run typecheck`, `bun run test`,
`bun run test:integration`, then `git diff --check`. Inspect `git diff --stat`.
Do not run a repository-wide fixer for scoped formatting issues.

**Verify**: all commands exit 0; production manifest includes Blog, two articles,
RSS, sitemap and Blog Open Graph image; only in-scope files changed.

## Test plan

- `src/lib/blog.test.ts`: schema fields/dates, update ordering, draft exclusion,
  sort tie-break, feature uniqueness, unknown slug, related-post behavior.
- `app/blog/blog.test.tsx`: guide-led copy, main landmark, card semantics,
  metadata feature state, empty state, complete Blog JSON-LD, header active/skip.
- `app/blog/[slug]/page.test.tsx`: static params, known/unknown behavior,
  canonical/article metadata, BlogPosting, one H1, article/main, figure,
  related/next step, error recovery and no client MDX contract.
- `app/sitemap.test.ts`: exact public allowlist, exclusions, published posts and
  stable dates.
- `app/rss.xml/route.test.ts`: status/type, escaping, language, canonical/self,
  published order/dates.
- `src/lib/next-config.test.ts`: redirects remain and MDX composition preserves
  config behavior.

Test semantics and small pure helpers. Do not snapshot full pages or compiled
MDX programs.

## Done criteria

- [ ] Blog, both articles, RSS and sitemap return HTTP 200 locally.
- [ ] `mdx-bundler`/`MdxContent` are removed; stable `@next/mdx` server rendering
  works without runtime eval.
- [ ] Metadata-only consumers never compile article bodies.
- [ ] Schema/MDX failures fail builds with context; unknown slugs alone 404.
- [ ] Draft, category, regions, dates, author context and explicit feature state
  exist and are tested.
- [ ] AU launch truth and withdrawal vocabulary are correct.
- [ ] Blog navigation/current state and keyboard skip path work.
- [ ] Mobile has 16px gutter/no overflow; desktop measure is 65–75ch.
- [ ] Index/article form one Team Calendar Read system with labelled product
  figure and non-colour-only category.
- [ ] Every article ends with author, related reading and contextual next step.
- [ ] Canonical/article/BlogPosting/social metadata is complete and tested.
- [ ] Sitemap uses real routes and stable dates; RSS uses the same catalogue.
- [ ] Unexpected errors recover plainly without technical leakage.
- [ ] JavaScript-disabled prose works; console is clean.
- [ ] Named visual checks complete in no more than two rounds.
- [ ] Focused tests, lint, typecheck, build and all CI gates pass.
- [ ] Scope is clean and `git diff --check` passes.

## STOP conditions

Stop and report if:

- In-scope code materially drifted from `e7ee7c7`.
- Installed Next 16 MDX docs do not match resolved `@next/mdx` behavior.
- MDX setup would replace rather than compose shared config.
- Static imports cannot expose component and metadata without a client boundary.
- Success appears to require retaining `mdx-bundler`, adding `gray-matter`,
  enabling experimental `mdxRs` or allowing runtime eval.
- Canonical launch truth changed or NZ/UK became shipped; obtain approved copy.
- More than one published post must be featured without a supplied rule.
- Correct skip behavior requires changing every marketing route.
- Social image generation needs external fetches; report before fallback.
- Plans 117/118 landed overlapping Blog-specific code that conflicts.
- A verification fails twice after one reasonable scoped correction.
- Work requires an out-of-scope domain package or application.

## Maintenance notes

- Every post needs one explicit registry entry. This deliberate constraint keeps
  route generation, metadata and Server Components deterministic. If volume
  makes it onerous, plan a generated registry separately with drift tests.
- One metadata contract serves index, articles, related reading, RSS and sitemap.
  Never add a second parser.
- Consider pagination only beyond twenty published posts or measured need.
- RSS carries summaries, not compiled HTML, unless sanitisation and absolute
  asset behavior receive a separate contract.
- Reviewers should scrutinise server/client boundaries, URL construction,
  XML/JSON-LD escaping, draft exclusion, mobile gutters and whether the diagram
  teaches rather than decorates.
- Re-run Impeccable critique against
  `.impeccable/critique/2026-08-29T21-32-58Z__apps-web-app-blog.md`; target at
  least 28/32 with no P0/P1 Blog finding.

## Findings covered

This plan covers all vetted Blog findings: local runtime failure; missing mobile
gutter; contradictory region/state language; unvalidated metadata and swallowed
failures; missing landmarks/bypass/navigation/focus; disconnected Read design and
weak ending; absent tests; incorrect sitemap and incomplete metadata; repeated
compilation and client evaluation; plus guide-led positioning, editorial
lifecycle metadata and RSS direction.

## Findings considered and rejected

- Standalone filesystem traversal was not established through a single Next
  dynamic segment. The static registry removes URL-derived paths as defence in
  depth without claiming an unproven exploit.
- Repository-wide advisories unrelated to reachable Blog code remain outside
  scope. The MDX dependency path is replaced on its architectural merits.
