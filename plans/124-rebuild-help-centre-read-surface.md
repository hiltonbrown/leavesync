# Plan 124: Rebuild the help centre as an accurate task-led Read surface

> **Executor instructions**: Execute this as one cohesive help-centre change.
> Follow every phase in order, use the named Impeccable commands, and do not
> report completion while any content-contract, accessibility, responsive or
> verification criterion remains unmet. The reviewer maintains the index.
>
> **Drift check (run first)**:
> `git diff --stat e7ee7c7..HEAD -- PRODUCT.md apps/web/app/help-centre apps/web/app/components/header/index.tsx apps/web/app/styles/shell.css apps/web/app/sitemap.ts`

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: MED
- **Depends on**: Plans 121, 122 and 123 DONE
- **Category**: design, docs, accessibility, tests
- **Planned at**: commit `e7ee7c7`, 2026-08-30
- **Impeccable mode**: Read
- **Critique baseline**: 17/40 at
  `.impeccable/critique/2026-08-29T21-39-29Z__apps-web-app-help-centre.md`

## Job and audience

The public help centre serves invited AU Early Access customers and signed-in
Team Calendar users who need to set up the product, verify that Xero and calendar
publishing work, or recover from a sync, leave-write or feed problem. Primary
readers are small-business operations administrators, managers, employees and
keyboard or mobile users. They often arrive uncertain, interrupted or handling
sensitive payroll and privacy decisions.

This is a Read surface, not a marketing conversion page. Its job is to let a
user identify their task, follow only the relevant instructions, verify success
and recover safely without translating implementation language or contacting
support unnecessarily.

## Outcome and proof

After this plan:

- `/help-centre` is a task-led gateway, not a feature-card directory.
- `/help-centre/onboarding` is one accurate, phased and semantically ordered AU
  setup guide with role boundaries, prerequisites, expected-result receipts and
  contextual recovery.
- Every customer-facing control name, route, role, scope and timing claim agrees
  with PRODUCT.md and the shipped app.
- The help route has one main landmark, a skip path before global navigation, a
  semantic breadcrumb, visible 3px focus treatment, stable reading measure and
  usable mobile chapter navigation.
- The nested onboarding URL appears in the sitemap.
- Focused contract tests fail on the stale terms and paths found by the critique.
- A fresh `$impeccable critique apps/web/app/help-centre` improves the 17/40
  baseline with no P1 findings remaining.

## Selected direction

Use the incumbent Team Calendar visual world and replace only the help centre's
generic composition. Preserve Plus Jakarta Sans, the lavender-neutral surface
ramp, deep forest-green action signal, tonal depth and light/dark parity.

The structural thesis is **task gateway to verified phased guide**:

1. The landing page starts from a user's goal or symptom.
2. Onboarding groups the existing journey into Prepare, Connect, Verify and
   Publish phases.
3. Every actionable step names who can perform it, the exact visible control,
   and the receipt that proves it worked.
4. Recovery guidance appears beside the relevant step; email support is the
   escalation path, not the only troubleshooting model.
5. Mobile users can navigate directly to a phase and resume from a stable anchor.

For launch, `apps/web/app/help-centre` is the canonical customer-facing help
surface because `apps/docs` is not deployed and remains starter content. Update
PRODUCT.md to state that boundary. Keep `apps/docs` reserved for future
developer/API documentation and do not link customers there in this plan.

## Scope

**In scope**:

- `PRODUCT.md`, limited to help/docs surface ownership.
- `apps/web/app/help-centre/page.tsx`.
- `apps/web/app/help-centre/onboarding/page.tsx`.
- `apps/web/app/help-centre/content.ts` (create a typed content contract).
- `apps/web/app/help-centre/help-centre.module.css` (create route-scoped styles).
- Co-located help-centre tests under `apps/web/app/help-centre/`.
- `apps/web/app/components/header/index.tsx`, limited to Help centre navigation,
  active state and a help-route skip link before primary navigation.
- `apps/web/app/styles/shell.css`, limited to shared 3px content-link focus and
  skip-link presentation after Plan 117's shared focus baseline.
- `apps/web/app/sitemap.ts` and a focused sitemap test.

**Out of scope**:

- Building or deploying `apps/docs`.
- Authenticated onboarding state or database persistence.
- Adding an Organisation switcher, location feed scope or new feed-token action.
- Changing Xero, leave, feed or permission behaviour to match old copy.
- New support SLAs, legal promises, regions, calendar clients or marketing claims.
- Search infrastructure. The revised information architecture must first prove
  that article volume warrants search.
- Global redesign of other `marketing-simple` routes.

## Product-truth contract

Encode and test these facts before visual restructuring:

- In-app Organisation switching is not shipped. Step 1 uses the invitation flow
  and Organisation profile only.
- Clerk roles are Owner, Admin, Manager and Viewer. There is no Member role.
- Xero connection is under Settings, Integrations, Xero and requires Admin or
  Owner access.
- Sync review is labelled Sync Health.
- Xero Person Matches lives under Settings, Integrations, Xero, not People.
- Leave is created through the visible Calendar add affordance or the command
  menu's `New leave request` quick action. Do not claim a top-navigation CTA.
- Declines require a reason of 3–1000 characters.
- Xero approval write-back resolves synchronously and surfaces failure inline.
  The up-to-60-second statement belongs only to subscribed calendar publication.
- Feed scope choices are Just me, My team, Specific teams, Specific people and,
  for authorised admins, All of organisation. Do not advertise location scope.
- The shipped emergency credential action is `Rotate token`; it invalidates the
  old subscribe URL and presents the replacement URL.
- Privacy summaries follow PRODUCT.md: Named includes the person's name and
  allowed availability detail, Masked publishes `Out of office`, and Private
  publishes `Busy`.
- AU Early Access scope is visible before users enter onboarding.
- Support hours and contact details remain factual and use Australian English.

## Content and state ranges

The typed content model must support:

- Four landing tasks and four onboarding phases without hard-coding the layout
  to exactly those counts.
- Two to three steps per phase, with eight current steps in total.
- Each step: stable anchor, title, applicable roles, concise action, expected
  result, optional caution, optional troubleshooting and optional in-product URL.
- Phase anchors that remain valid deep links on mobile and desktop.
- Concise labels at 200% zoom and body copy constrained to 65–75 characters.
- A visible last-reviewed date sourced from one content constant.
- A direct support escalation state for sync discrepancies, Xero write failures,
  privacy concerns and unresolved feed-token incidents.

Do not add interactive completion checkboxes in this plan. Without persistence,
they would create false state and interruption expectations. The current phase
indicator is navigation, not a claim that setup progress is saved.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Focused help tests | `TMPDIR=/tmp bunx vitest run apps/web/app/help-centre apps/web/app/sitemap.test.ts` | all pass |
| Stale-term scan | `rg -n "organisation switcher|Owner, Admin, Manager, Member|top navigation CTA|location filters|Revoke Token|writes back synchronously to Xero Payroll within 60 seconds" apps/web/app/help-centre` | no matches outside explicit negative test fixtures |
| Detector | `node .agents/skills/impeccable/scripts/detect.mjs --json apps/web/app/help-centre` | exit 0 with no unresolved findings |
| Targeted check | `bunx ultracite check apps/web/app/help-centre apps/web/app/components/header/index.tsx apps/web/app/sitemap.ts apps/web/app/styles/shell.css` | exit 0 |
| Web typecheck | `bun run --cwd apps/web typecheck` | exit 0 |
| Web build | `bun run --cwd apps/web build` | exit 0; both routes and sitemap build |
| Full gates | `bun run check && bun run typecheck && bun run test && bun run test:integration` | all exit 0 |
| Diff hygiene | `git diff --check` | no output |

## Suggested executor toolkit

Use Impeccable throughout, in this order:

1. `$impeccable clarify apps/web/app/help-centre` for the product-truth rewrite.
2. `$impeccable harden apps/web/app/help-centre` for prerequisites, permissions,
   recovery and edge cases.
3. `$impeccable onboard apps/web/app/help-centre/onboarding` and
   `$impeccable layout apps/web/app/help-centre` for the task gateway and phased
   reading structure.
4. `$impeccable audit apps/web/app/help-centre` for landmarks, focus, keyboard,
   zoom, forced colours and responsive behaviour.
5. `$impeccable distill`, `$impeccable typeset` and `$impeccable adapt` for the
   card-stack replacement, prose measure and mobile chapter navigation.
6. `$impeccable polish apps/web/app/help-centre` as the final bounded pass.

Read Impeccable's `craft-floor.md` immediately before the first UI edit. The
incumbent design world is authoritative; do not enter `new-work` or replace
DESIGN.md.

## Git workflow

- Branch: `preview` (`origin/preview`), not `main` or a plan-specific feature
  branch. The completed plan lands on `preview`.
- Commit: `refactor(web): rebuild help centre read surface`.
- Work directly in the current checkout after confirming the working tree is
  safe. Do not push to `origin/preview` without operator instruction.

## Implementation steps

### Step 1: Lock the content contract with failing tests

Create focused server-render and content-contract tests before rewriting. Assert
the canonical roles, paths, feed scopes, privacy summaries, timing distinction,
support address and AU scope. Add negative assertions for every stale phrase in
the critique. Avoid full-page snapshots and whole-paragraph matching.

Add sitemap coverage proving `/help-centre` and `/help-centre/onboarding` appear
exactly once. Ensure sitemap generation does not accidentally publish route
groups, dynamic routes, private folders or component directories.

**Verify**: the new tests fail against the current implementation for the named
contract reasons, not because of test-environment setup.

### Step 2: Centralise and correct help content

Move landing tasks, phase metadata and onboarding steps into `content.ts` with
strict inferred types and named exports. Keep icons in the rendering layer or
store typed icon components only if the module remains server-safe.

Rewrite the eight steps against the product-truth contract. Replace internal
phrases such as `Clerk Organisation boundary`, `ICS URL` and `synchronously`
with customer language, while retaining necessary domain terms such as Xero
Payroll and subscribe URL with concise explanation.

Update PRODUCT.md so customer-facing setup and operational help belong to
`apps/web/app/help-centre` for launch. Do not modify unrelated product truth.

**Verify**: content tests pass; stale-term scan is clean; links point to shipped
routes or stable same-page anchors.

### Step 3: Rebuild the landing page as a task gateway

Replace the equal four-card feature map with a hierarchy that makes AU onboarding
the recommended starting point and exposes four user tasks. Link tasks to the
relevant onboarding phase or recovery section. Keep direct support as the final
escalation, not a peer to every self-service task.

Use one `<main id="help-centre-main">`, one H1, a concise Read-mode introduction,
and route-scoped 20px task containers. Do not reuse persistent card styling that
forces the wrong 16px radius or 1200px prose measure.

**Verify**: static markup has one main and one H1; task links resolve; prose
measure and hierarchy remain readable at all named viewports.

### Step 4: Turn onboarding into a verified phased guide

Render a semantic breadcrumb `<nav aria-label="Breadcrumb">` with an ordered
list and `aria-current="page"`. Follow it with AU scope, applicable audience,
prerequisites and last-reviewed information.

Provide phase navigation with stable anchors for Prepare, Connect, Verify and
Publish. Render the procedure as an ordered structure rather than eight unrelated
articles. Each step must visibly separate:

- who can perform it;
- what to do;
- what success looks like;
- caution or privacy impact when relevant;
- nearby troubleshooting or support escalation.

Use one sequence marker. Remove redundant number-plus-icon decoration. End with
a completion receipt that states the observable checks for connected Xero,
successful sync, correct roles, a test leave workflow and an active calendar
subscription.

**Verify**: semantic tests confirm breadcrumb, ordered procedure, heading order,
anchors and role labels. No step asks the user to find an unshipped control.

### Step 5: Add route-specific accessibility and responsive behaviour

Add Help centre to desktop, mobile and no-script primary navigation with the
existing active-state logic. In the already-client header, render a help-route
skip link before the brand/navigation when `pathname` starts with
`/help-centre`; target `#help-centre-main` on both help pages. Do not emit a
broken skip target on other routes.

Extend the post-Plan-117 focus baseline so content links, breadcrumb, phase
navigation and skip link receive a full-opacity 3px semantic focus ring with no
clipping. Preserve forced-colour behaviour.

On small screens, provide compact phase navigation and stable anchor offsets.
Do not fake saved progress. Keep contextual support adjacent to each recovery
block, maintain 44px touch targets and avoid horizontal scrolling at 200% zoom.

**Verify**: keyboard order begins with the skip link on both help routes; focus is
visible in light, dark and forced-colour modes; landmarks and anchors announce
correctly; 390px and 200% zoom have no two-dimensional panning.

### Step 6: Fix sitemap discoverability

Replace the top-level-only assumption with the smallest explicit or page-aware
public-route mechanism that includes the nested onboarding page. Prefer an
explicit public-route registry if recursion would require brittle exclusions.

**Verify**: sitemap test proves both help URLs occur once and no implementation
directory becomes a URL.

### Step 7: Run one bounded visual verification cycle

Start the web app and capture these viewports together in one inspection batch:

- 390×844 mobile;
- 820×1180 tablet;
- 1440×1000 desktop.

Capture `/help-centre` and `/help-centre/onboarding` in light and dark mode. In
the same batch, inspect keyboard focus, 200% zoom, reduced motion and forced
colours. Fix every observed defect in one consolidated pass, then perform at
most one confirmation batch.

Do not claim visual verification if browser control is unavailable. Record the
exact blocker and leave the visual done criteria unchecked.

**Verify**: no overflow, unreadably long lines, clipped focus, orphaned headings,
equal-weight phase confusion or footer collision remains.

### Step 8: Polish, critique and run all gates

Run `$impeccable polish` for a final quality pass, then rerun
`$impeccable critique apps/web/app/help-centre`. The critique must use its
required independent assessment and detector method. Address all remaining P0
and P1 findings inside this plan; do not turn them into a follow-up backlog.

Run the focused commands, web build, all four repository gates and diff hygiene.
Record exact counts and any environment-specific `TMPDIR=/tmp` requirement.

## Test plan

- Static-render landing and onboarding markup.
- Exactly one main landmark and H1 per route.
- Semantic breadcrumb with current-page state.
- Ordered phase and step structure with stable unique IDs.
- Canonical roles and role-specific instructions.
- Correct shipped navigation labels and feed scope/action names.
- Synchronous Xero response separated from the calendar publication window.
- PRODUCT.md privacy summaries represented correctly.
- AU scope and last-reviewed metadata visible.
- Support email remains a valid `mailto:` destination.
- Every landing task and phase link resolves to a shipped route or page anchor.
- Stale terms prohibited through focused negative assertions.
- Sitemap contains both public help routes exactly once.
- No full snapshots and no assertions over entire prose paragraphs.

## Done criteria

- [ ] Content truth matches PRODUCT.md and the shipped app for every instruction.
- [ ] Landing page is task-led and onboarding is divided into four clear phases.
- [ ] Every step states role, action, receipt and contextual recovery where needed.
- [ ] No `Clerk Organisation boundary` or unexplained protocol jargon remains.
- [ ] Both help pages have one main landmark and the onboarding trail is a real
  breadcrumb.
- [ ] Skip link, primary navigation state and 3px focus treatments work by
  keyboard in all required modes.
- [ ] Procedure semantics, prose measure, 20px task surfaces and tonal hierarchy
  conform to DESIGN.md.
- [ ] Mobile and 200% zoom layouts avoid horizontal panning and preserve task
  navigation.
- [ ] Nested onboarding appears exactly once in the sitemap.
- [ ] Focused content, markup and sitemap tests pass.
- [ ] Web build and all four repository gates pass.
- [ ] Bounded visual verification is complete at all three viewports in light and
  dark modes.
- [ ] Fresh Impeccable critique has no P0 or P1 findings and improves the 17/40
  baseline.

## STOP conditions

- Product truth differs between PRODUCT.md and the rendered app after the drift
  check. Report the exact contradiction instead of choosing silently.
- Plan 117 or another intervening change materially alters shared focus or header
  navigation behaviour.
- A proposed task link requires a help article or product route that does not
  exist. Use a stable section anchor; do not invent a dead destination.
- The implementation requires saved onboarding progress, authentication or new
  backend state. Those are explicitly outside this plan.
- Browser control remains unavailable. Complete non-visual gates but do not mark
  the plan DONE or claim visual proof.
- A fresh critique still contains any P0 or P1 finding. Fix it within scope or
  return the plan for review.

## Maintenance notes

- Treat `content.ts` as the public help contract. Product changes that rename a
  control, role, route, feed scope, privacy mode or timing promise must update
  this module and its focused tests in the same change.
- Keep help-specific composition in the CSS module. Shared shell styles should
  contain only genuinely cross-route navigation, focus and accessibility rules.
- Do not add search until the help centre has enough distinct articles to make
  retrieval better than the four-task gateway.
- Re-run the Impeccable critique after substantive help-centre changes so trend
  history remains comparable to the 17/40 baseline.
