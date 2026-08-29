# Plan 126: Turn Careers into a candid, accessible applicant page

> **Executor instructions**: Follow every step and use the Impeccable brief as
> the design authority. Run every verification gate. Modify only files listed
> under **In scope**. If a STOP condition occurs, stop and report rather than
> improvising. When complete, update this plan's row in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat e7ee7c7..HEAD -- apps/web/app/careers/page.tsx apps/web/app/careers/careers.module.css apps/web/app/careers/careers.test.ts apps/web/app/components/header/index.tsx apps/web/app/components/header/header.test.tsx apps/web/app/styles/style-loading.test.ts plans/README.md`
> Drift from completed Plans 113–122 is expected only where those plans say so.
> Compare live files with **Current state** before editing. Any unrelated
> material mismatch is a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: Plan 122 DONE
- **Category**: direction
- **Planned at**: commit `e7ee7c7`, 2026-08-30
- **Findings combined**: missing main landmark and bypass link; vague,
  undersized email action; contradictory regional copy; product-value
  repetition instead of an applicant proposition; orphaned third card;
  semantically reused Mail icon; missing route regression coverage

This backlog plan is intentionally not executable until Plan 122 is DONE. Do
not treat the unsatisfied dependency as permission to recreate its shared seams.

## Why this matters

`/careers` clearly says there are no vacancies, but its generic value cards
explain the product better than the working experience and its sole applicant
action is a small, ambiguous email link. Browser testing reproduced four Axe
landmark failures at desktop and mobile because the route has no `main` and its
hero becomes a second banner. At intermediate widths, three cards become an
accidental two-plus-one grid.

After this plan, the page remains short and honest while giving prospective
product engineering, design-systems and payroll-operations applicants a clear
working-practices narrative, accurate launch context, a low-data email path,
one accessible main landmark and an intentional responsive composition.

## Impeccable design brief

- **Job and audience**: Persuade-mode empty careers page for someone interested
  in future product engineering, design-systems or payroll-operations work.
  They must quickly understand that no vacancy or timeline exists, decide
  whether the working style fits, and know whether to send an introduction.
- **Outcome and proof**: Lead with the no-open-roles state, then show three
  concrete working practices, then present one bounded email action. Proof must
  use repository facts only: small focused Gold Coast product, Australian Xero
  Payroll starting point, narrow product judgement, design-system discipline
  and conservative handling of leave/payroll data.
- **Selected direction**: Preserve the calm, type-led marketing world. Sequence
  status hero → **How we work** → three concise practices → future-opportunities
  CTA. The candid status and next step are the focal moment, not decoration.
- **Anti-goals**: No vacancy CMS, form, upload, applicant storage, portraits,
  testimonials, benefits, compensation, remote/visa/location, team-size,
  response, retention, privacy or hiring-timeline claims. Do not imply customer
  regions determine employment location.
- **Interaction and layout**: One focusable Careers `main`, one `h1`, logical
  `h2`s, route-aware skip link, decorative icons hidden from assistive
  technology, three columns only when readable then one column, never two plus
  one. The email CTA names the hand-off, keeps the complete address visible,
  has a 44px target and inherits the shared 3px focus ring.
- **Ranges**: The practice grid is one column below `64rem` and exactly three
  columns from `64rem` upward. Verify 390×844, 820×1180, 1024×1000 and
  1440×1000, light/dark and 200% zoom, with no horizontal overflow or clipped
  focus. There is no two-column state at any width.

## Current state

### Route evidence

`apps/web/app/careers/page.tsx:19-26` mixes a shipped-sounding AU/NZ/UK claim
with an Australian title and uses Mail for data care:

```tsx
{
  copy: "The product starts with Xero Payroll teams across Australia, New Zealand, and the United Kingdom, with a practical bias toward real operations.",
  icon: MapPin,
  title: "Grounded in Australian business",
},
{
  copy: "Leave, payroll, and availability data deserve clear boundaries, direct language, and conservative engineering choices.",
  icon: Mail,
  title: "Careful with customer data",
},
```

`apps/web/app/careers/page.tsx:30-41` has no main landmark but correctly exposes
the empty state:

```tsx
const CareersPage = () => (
  <div className="fmkt-page marketing-simple">
    <header className="marketing-simple__hero">
      {/* ... */}
      <p className="marketing-simple__lead">
        We do not have open roles right now. This page will list hiring
        plans when that changes.
      </p>
```

`apps/web/app/careers/page.tsx:49-58` sends three items through the shared
two-column auto-fit modifier:

```tsx
<div className="marketing-simple__grid marketing-simple__grid--two">
  {values.map((value) => (
    <article className="marketing-simple__panel" key={value.title}>
```

`apps/web/app/careers/page.tsx:76-87` leaves the only action underspecified:

```tsx
<p className="marketing-simple__section-copy">
  If your work sits close to product engineering, design systems, or payroll
  operations, you can introduce yourself.
</p>
<p className="marketing-simple__section-copy">
  Contact:{" "}
  <a className="marketing-simple__link" href={`mailto:careers@${primaryDomain}`}>
    careers@{primaryDomain}
  </a>
</p>
```

### Dependency and design contracts

- Plan 113 owns public regional truth: AU shipped, NZ/UK planned. Careers must
  not repeat a competing launch matrix.
- Plans 117/120 own the shared 3px focus ring and marketing shape scale.
- Plan 122 establishes route-aware header skip links and route-owned page
  styles. Extend those seams, do not create competing mechanisms.
- Follow `apps/web/app/contact/contact.test.ts` for narrow
  `renderToStaticMarkup` assertions, never full snapshots.
- `DESIGN.md:138-157,272-281,324-344` requires Persuade hierarchy, clean mobile
  and 200% reflow, a main landmark, bypass link and 3px focus ring.
- `.impeccable.md:13-29` requires modern, calm, precise expression and scarce
  signal green. Australian English and no em dashes are mandatory.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Focused tests | `TMPDIR=/tmp bunx vitest run --config apps/web/vitest.config.mts apps/web/app/careers/careers.test.ts apps/web/app/components/header/header.test.tsx apps/web/app/styles/style-loading.test.ts apps/web/app/integrations/capabilities.test.ts` | all pass, including exact AU/NZ/UK statuses |
| Focused check | `bunx ultracite check apps/web/app/careers apps/web/app/components/header/index.tsx apps/web/app/components/header/header.test.tsx apps/web/app/styles/style-loading.test.ts` | exit 0 |
| Web typecheck | `bun run --cwd apps/web typecheck` | exit 0 |
| Web build | `bun run --cwd apps/web build` | exit 0; `/careers` builds |
| Browser server (Step 6 only) | `bun run --cwd apps/web dev` in a recorded terminal/tool session | `/careers` returns 200 on port 3001; send Ctrl-C to that same session before leaving Step 6 |
| Detector | `node .agents/skills/impeccable/scripts/detect.mjs --json apps/web/app/careers/page.tsx` | exit 0 and JSON `[]` |
| Desktop Axe | `XDG_RUNTIME_DIR=/tmp AGENT_BROWSER_EXECUTABLE_PATH=/home/hilton/.cache/ms-playwright/chromium-1234/chrome-linux/chrome bunx agent-browser --session careers-a11y a11y http://127.0.0.1:3001/careers --json` | Axe JSON has `violations: []` and `incomplete: []` |
| Mobile Axe | `XDG_RUNTIME_DIR=/tmp AGENT_BROWSER_EXECUTABLE_PATH=/home/hilton/.cache/ms-playwright/chromium-1234/chrome-linux/chrome bunx agent-browser --session careers-mobile-a11y batch --bail 'set viewport 390 844' 'open http://127.0.0.1:3001/careers' 'wait --load networkidle' 'a11y --json'` | Axe JSON has `violations: []` and `incomplete: []` |
| Full gates | `bun run check && bun run typecheck && TMPDIR=/tmp bun run test && TMPDIR=/tmp bun run test:integration` | every command exits 0 |
| Port cleanup | `ss -ltn | rg ":3001\\b"` | no output after the server is stopped |
| Hygiene | `git diff --check && git status --short` | no whitespace errors; scope is clean |

## Suggested executor toolkit

- Invoke `impeccable`; read `clarify`, `adapt`, `audit`, then `craft-floor`
  immediately before editing. The brief is confirmed, so do not reopen visual
  discovery.
- Use `vercel:agent-browser-verify` or `vercel:agent-browser` for one bounded
  mobile/tablet/desktop review and at most one confirmation pass. Run Axe in the
  same pass.
- Use `vercel:react-best-practices` after TSX edits. Keep the page a Server
  Component and add no hydration.

## Scope

**In scope, the only source files that may change**:

- `apps/web/app/careers/page.tsx`
- `apps/web/app/careers/careers.module.css` (create)
- `apps/web/app/careers/careers.test.ts` (create)
- `apps/web/app/components/header/index.tsx`
- `apps/web/app/components/header/header.test.tsx`
- `apps/web/app/styles/style-loading.test.ts`
- `plans/README.md` (status row only after execution)

**Read only**:

- `apps/web/app/integrations/capabilities.ts`
- `apps/web/app/components/footer.tsx`
- `apps/web/app/about/page.tsx`
- `apps/web/app/contact/contact.test.ts`
- `DESIGN.md`; `.impeccable.md`

**Out of scope**:

- Regional capability status/footer wording; shared focus/button shapes.
- Header navigation membership or Careers discoverability.
- Vacancy infrastructure, forms, uploads, email delivery or applicant data.
- Privacy-policy changes or unsupported employment promises.
- Redesigning any other page.

## Git workflow

- Branch: `preview` (`origin/preview`), not `main` or a plan-specific feature
  branch. The completed plan lands on `preview`.
- Work directly in the current working tree and preserve unrelated changes.
- Commit: `feat(web): clarify careers experience`.
- Do not push to `origin/preview` without operator instruction.

## Steps

### Step 0: Confirm dependencies and truth

Confirm Plan 122 is DONE. Read the live regional capability/footer wording,
shared focus styles and route-aware skip-link implementation. Prove the
canonical contract through the capability test: AU shipped, NZ planned, UK
planned. Do not infer agreement from a text search and do not edit those facts.

**Verify**:

```bash
rg -n "\| \[122\].*DONE" plans/README.md
TMPDIR=/tmp bunx vitest run --config apps/web/vitest.config.mts apps/web/app/integrations/capabilities.test.ts
```

Expected: dependency is DONE and the focused test asserts AU `shipped`, NZ
`planned` and UK `planned`. Inspect the footer consumer to confirm it derives
from that model. Otherwise STOP.

### Step 1: Lock contracts with failing tests

Create `careers.test.ts` using `renderToStaticMarkup`. Assert:

1. one `<main id="careers-main" tabindex="-1">` and one `h1`;
2. visible no-open-roles and no-hiring-timeline truth;
3. “How we work” and exactly three practice items;
4. decorative SVGs are `aria-hidden="true"`;
5. an `href` starting with `mailto:careers@teamcalendar.online`, allowing only
   an optional encoded `subject` query, plus the visible address and primary
   marketing-button class;
6. what-to-send and sensitive-material guidance;
7. absence of the old shipped-sounding AU/NZ/UK sentence;
8. use of the page-owned three-item layout class.

Extend the established header test: `/careers` targets `#careers-main`, prior
route targets remain correct, and an unrelated route has no broken skip link.
Extend the style-loading test to prove Careers CSS is route-owned.

**Verify**: focused tests fail only for new missing contracts before edits, then
pass after Steps 2–5.

### Step 2: Correct semantics and applicant hierarchy

Use `<main id="careers-main" tabIndex={-1}>` as the page root. Keep the hero
header inside it so only the site header is a banner. Preserve one `h1`.

Add kicker **How we work**, heading **Small product decisions, made carefully.**
and lead **Team Calendar is built close to real payroll and leave admin. These
principles shape the work.** Use these approved card contracts exactly except
for punctuation required by formatting:

1. **Reduce the problem before adding features**: “We prefer narrow, reliable
   product work over feature sprawl. A change earns its place when it makes
   leave and availability easier to understand.”
2. **Stay close to payroll operations**: “The product starts with Australian
   Xero Payroll teams and practical business admin. Product decisions should
   reflect how leave is actually managed, not an abstract workflow.”
3. **Protect trust in the details**: “Leave, payroll and availability data need
   clear boundaries, direct language and conservative engineering. Design and
   implementation must make those boundaries visible.”

Replace the data-care Mail icon with `ShieldCheck`. Mark every decorative icon
`aria-hidden="true"`. Do not let the executor invent alternate employer claims.

Do not list NZ/UK as shipped or imply customer coverage is an employment
location policy.

**Verify**: Careers tests pass for semantics, hierarchy, item count, icons and
regional-copy absence.

### Step 3: Make the speculative email action explicit and low-data

Use this approved empty-state lead: **We do not have open roles or a hiring
timeline right now. When that changes, confirmed roles will be listed here.**

Keep heading **Future opportunities** and use this approved callout copy:

1. **If your work is in product engineering, design systems or payroll
   operations, you can send a short introduction even though no role is open.**
2. **Tell us which discipline is closest to your work and include a link to work
   you are comfortable sharing.**
3. **Please do not send identity documents, payroll records or other sensitive
   personal information at this stage.**

Use a primary button labelled **Introduce yourself by email** and keep the
complete `careers@{primaryDomain}` visible nearby.

A safely encoded neutral mail subject is allowed. Do not promise response,
retention, future contact, confidentiality or consideration.

**Verify**: static tests pass; the complete address wraps at 320 CSS pixels and
200% zoom; keyboard activation clearly launches email; target is at least 44px.

### Step 4: Replace the orphan grid with page-owned composition

Create and import `careers.module.css` through the route-owned pattern from the
dependency plans. Keep shared typography/panel/button primitives, but own the
Careers practice grid locally. The base rule is exactly one column. At
`@media (min-width: 64rem)`, change directly to
`repeat(3, minmax(0, 1fr))`. Define no two-column rule or auto-fit behaviour for
this grid.

Use design tokens, tonal layering, documented standalone-card radius, dark and
forced-colour support. Do not add borders, decorative shadows or frost. Prove
the module is absent from unrelated first-load CSS.

**Verify**: focused tests/checks pass, then run
`node .agents/skills/impeccable/scripts/detect.mjs --json apps/web/app/careers/page.tsx`.
Expected: exit 0 and `[]`.

### Step 5: Extend the route-aware bypass link

Extend the existing header route-to-main mapping for `/careers` and
`#careers-main`, preserving trailing-slash handling, prior routes, mobile
navigation and unrelated header behaviour.

**Verify**: header tests pass. In-browser first Tab reveals the skip link and
Enter focuses the Careers main.

### Step 6: Run bounded browser verification

Start the dev server in a recorded terminal/tool session so it can be stopped
with Ctrl-C. Inspect `/careers` at 390×844, 820×1180, 1024×1000 and 1440×1000 in
both themes, plus 200% zoom. Use one defect pass and at most one confirmation
pass. Confirm status
hierarchy, applicant-specific middle, clear CTA/full address, three-or-one
composition, no overflow, correct headings, working bypass link and unclipped
focus. Axe must report zero `landmark-no-duplicate-banner`,
`landmark-one-main`, `landmark-unique` and `region` violations.

Run the exact Desktop Axe and Mobile Axe commands from **Commands you will
need**. Both JSON results must contain empty `violations` and `incomplete`
arrays; retain their Axe version, pass count and rule counts in executor notes.
Then close both sessions:

```bash
XDG_RUNTIME_DIR=/tmp AGENT_BROWSER_EXECUTABLE_PATH=/home/hilton/.cache/ms-playwright/chromium-1234/chrome-linux/chrome bunx agent-browser --session careers-a11y close
XDG_RUNTIME_DIR=/tmp AGENT_BROWSER_EXECUTABLE_PATH=/home/hilton/.cache/ms-playwright/chromium-1234/chrome-linux/chrome bunx agent-browser --session careers-mobile-a11y close
```

Smoke-check prior route-aware skip targets after changing the header. Send
Ctrl-C to the recorded dev-server session, then run
`ss -ltn | rg ":3001\\b"`. Expected: no output.

### Step 7: Run production and repository gates

Run the focused tests, focused check, web typecheck, web build, full gates and
hygiene commands from **Commands you will need**. Do not start the development
server again in this step. The detector and server/port checks already completed
in Steps 4 and 6. Confirm `/careers` is in the build and scope is clean.

## Test plan

- `careers.test.ts`: eight static contracts from Step 1, no snapshots.
- `header.test.tsx`: Careers target, preserved prior targets, unrelated absence.
- `style-loading.test.ts`: Careers stylesheet route ownership.
- Browser/Axe: three viewports, both themes, 200% zoom, keyboard bypass, 44px
  CTA, no orphan layout and zero named landmark failures.
- Commit no screenshot artifacts; stop every development process.

## Done criteria

- [ ] One focusable Careers main, one site banner and a working first-focus
  route-aware skip link.
- [ ] No role or hiring timeline remains explicit.
- [ ] Three concise factual working practices replace product-value repetition.
- [ ] Careers no longer contradicts canonical AU-shipped/NZ-UK-planned status.
- [ ] Email action says what to send and not send without unsupported promises.
- [ ] CTA is at least 44px with visible 3px focus.
- [ ] Three-item layout is never two plus one.
- [ ] Focused tests, build and all four repository gates pass.
- [ ] Axe has zero named landmark failures; port 3001 is free.
- [ ] Only in-scope files changed; Plan 126 marked DONE with evidence.

## STOP conditions

Stop and report if:

- Plan 122 is not DONE or its skip-link/style-loading seams differ materially.
- The verified Playwright Chromium executable in the Axe commands no longer
  exists and no browser skill can resolve a working executable; do not silently
  skip Axe.
- Capability source and footer disagree on launch status.
- Copy requires inventing employment, response, retention or privacy claims.
- A truthful path requires persistence, uploads or policy changes.
- Axe remediation requires unrelated route changes.
- Responsive readability requires global token/typography changes.
- Verification fails twice after one reasonable in-scope correction.
- An unrelated gate failure prevents proof; record it, do not modify unrelated
  code.

## Maintenance notes

- Add real vacancies only when truthful role data exists and update the
  empty-state test simultaneously.
- Regional truth remains owned by Plan 113; Careers describes working context,
  not the launch matrix.
- Keep route-aware skip targets and tests synchronised for future pages.
- Re-run `$impeccable critique apps/web/app/careers` after implementation to
  compare design health and specificity.
