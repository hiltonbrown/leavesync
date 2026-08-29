# Plan 127: Harden security controls and rebuild `/security` from verified evidence

> **Executor instructions**: Execute this plan in order. Security remediations
> and their tests must land before the rewritten public claims. Use the
> Impeccable brief below as the authority for `/security`. Modify only **In
> scope** files. Run every verification command. If a STOP condition occurs,
> report it rather than improvising. The reviewer maintains `plans/README.md`.
>
> **Drift check**:
> `git diff --stat e7ee7c7..HEAD -- packages/feeds/src/projection/feed-projection.ts packages/feeds/src/projection/feed-projection.test.ts packages/availability/src/people/people-service.ts packages/availability/src/people/people-service.test.ts apps/app/app/'(authenticated)'/people/'[personId]'/page.tsx apps/app/app/'(authenticated)'/people/@modal/'(.)[personId]'/page.tsx apps/app/app/actions/settings/invite-member.ts apps/app/app/actions/settings/invite-member.test.ts apps/app/app/'(authenticated)'/public-holidays/_actions.ts apps/app/app/'(authenticated)'/public-holidays/_actions.test.ts packages/observability/server.ts packages/observability/client.ts packages/observability/edge.ts packages/observability/scrubber.ts packages/observability/scrubber.test.ts packages/auth/proxy.ts apps/app/proxy.ts apps/app/proxy.test.ts apps/api/proxy.ts apps/api/proxy.test.ts apps/web/app/security/page.tsx apps/web/app/security/security.module.css apps/web/app/security/security.test.ts SECURITY.md`
> Compare changed files with **Current evidence**. Post-Plan-120 marketing
> changes are expected. Other material overlap is a STOP condition.

## Status

- **Priority**: P0
- **Effort**: L
- **Risk**: HIGH
- **Depends on**: Plan 120 DONE
- **Category**: security
- **Planned at**: commit `e7ee7c7`, 2026-08-30
- **Findings combined**: live feed projection ignores record privacy; direct
  person profiles and history omit manager-scope authorisation; admins can
  invite owners; public-holiday actions deny owners; the Sentry scrubber is
  unused; middleware does not call Clerk protection; viewer wording conflicts
  with employee self-service; category-level feed controls are advertised but
  absent; blanket encryption and residency claims exceed evidence; eight equal
  cards create weak assessment hierarchy; evidence date, assessor navigation
  and distinct procurement/reporting paths are absent; body size and persistent
  panel radius drift from the design contract

## Why this matters

The current page promises controls the application does not consistently
enforce. A record marked `masked` or `private` can be rendered through a less
restrictive feed, and a manager can request an out-of-scope person's profile and
history by ID. Role assignment, owner actions, observability scrubbing and route
protection also diverge from the public story.

The page must become evidence, not aspiration. This plan first closes and proves
the control gaps, then rebuilds `/security` around four questions a buyer or
assessor actually asks: who can access data, how it is protected, where it moves
and lives, and what happens when something goes wrong.

## Impeccable shape brief

### Job, audience and outcome

- **Mode**: Persuade and Read.
- **Visitors**: first-time buyers, security and privacy assessors, technical
  procurement teams, and good-faith security researchers.
- **Job**: determine whether the implemented controls warrant further
  assessment, understand the product-specific data flow, then choose the right
  contact path.
- **Outcome**: a visitor can scan a compact summary, navigate four assessor
  questions, inspect the Xero-to-calendar flow, see when evidence was reviewed,
  and distinguish **Assess Team Calendar** from **Report a vulnerability**.
- **Proof**: every control statement maps to implementation and regression
  tests, `SECURITY.md`, or deliberately qualified provider wording.

### Selected direction

- Replace the repeated “Security” kicker with **Trust and safeguards**.
- Add local navigation labelled **Security topics** with four anchors:
  **Who can access data?**, **How is data protected?**, **Where does data move
  and live?**, and **What happens when something goes wrong?**
- Replace eight interchangeable icon cards with one trust summary and four
  grouped sections, each with no more than four concise control rows.
- Add a semantic HTML flow:
  **Xero Payroll → Team Calendar tenant boundary → encrypted token and primary
  data storage → privacy projection → subscribed calendars**. Include Redis/KV
  caching in the relevant stage. Use green only for verified protected
  transitions and never rely on colour alone.
- Split the closing surface into procurement and vulnerability-reporting paths.
  State the policy response targets: acknowledgement within two business days,
  triage within five business days.

### Public trust contract

The executor may clarify these facts but must not broaden them:

- Clerk provides identity and organisation membership. After Step 6,
  authenticated product routes are protected at the route boundary; sensitive
  services still enforce tenant, organisation and role scope.
- A Clerk Organisation is the top-level tenant boundary. Describe the controls
  and tests, never say cross-tenant access is impossible.
- Owners/admins administer configuration, managers are limited to permitted
  teams and reports, and employees manage their own leave and availability.
  Under the recommended role interpretation, `org:viewer` is the baseline
  employee membership: read-only outside the employee's own self-service data.
- Primary records are stored in Neon PostgreSQL. Xero OAuth tokens additionally
  use application-level AES-256-GCM encryption and are not sent to client code.
  Published ICS bodies can be cached in configured Redis/KV. Supported network
  transport uses HTTPS/TLS. Do not make a blanket all-data-at-rest claim.
- Feed URLs use signed, revocable tokens. Plaintext tokens are not persisted;
  complete active subscribe URLs are intentionally shown to authorised users.
- Effective event privacy is the stricter of feed and record mode. Records can
  be excluded with `include_in_feed`. There are no category/type selectors.
- Vercel, Neon, Clerk, Redis/KV and configured analytics/observability providers
  participate in processing. Region and replication depend on deployed account
  configuration. Invite residency enquiries; do not promise no replication.
- Link `/privacy-policy`, `/contact`, and the confirmed private reporting route.
  Do not add certifications, audit badges, uptime, penetration-test or region
  claims without evidence.

### Layout, states and craft floor

- Static Server Component with one `<main id="security-main" tabIndex={-1}>`.
- Hero order: eyebrow, H1, precise lead, semantic last-reviewed `<time>`, compact
  summary, then local topic navigation.
- Data flow is an ordered list and collapses to a readable vertical sequence.
- Final assessment/reporting actions stack on mobile but remain equally clear.
- Page-owned persistent panels use 20px radii; buttons/links use 14px where
  applicable; chips use 12px; body copy is at least 1rem/1.6 and about 65–75
  characters per line; focus indicators are 3px.
- Use tonal layering, no content-separation borders or persistent shadows.
- Production-ready at 1440px, 1024px, 390px, dark mode and 200% zoom.
- No client boundary, smooth-scroll script, decorative animation, stock art,
  generic lock illustration, glass treatment or global-header redesign.
- Do not add category-level controls or redesign another page.

## Current evidence

### Feed privacy

`packages/feeds/src/projection/feed-projection.ts:77,102-124` applies only the
feed-wide mode:

```ts
const privacyMode = input.privacyMode ?? feed.privacy_mode;
const events = records.map((record) =>
  projectAvailabilityRecord(record, privacyMode)
);
```

Its `recordSelect` at lines 363–391 omits `privacy_mode`, while
`packages/feeds/src/publication/publication-service.ts:190-216` correctly uses
`record.privacy_mode` for materialised publication.

### Person direct-object scope

Both person page routes call `getPersonProfile` with actor and role, then call
`listHistoryPage` with only tenant, organisation and target ID. In
`people-service.ts:427-455`, `getPersonProfile` validates the role but fetches
the target with tenant/organisation scope only, then returns balances,
availability and alternative contacts. `listHistoryPage` at lines 581–623 has
the same missing actor/role boundary.

### Roles

`invite-member.ts:6-8,19-20,31-38` accepts `org:owner`, admits admins and forwards
the role to Clerk. `update-member-role.ts:33-39` already correctly restricts
owner assignment to owners. All five public-holiday mutations call only
`requireRole("org:admin")`; `packages/auth/helpers.ts:52-59` checks an exact
role, so owners see controls that their actions deny.

### Observability and middleware

`packages/observability/scrubber.ts:83-127` defines `scrubSentryEvent`, but
`server.ts`, `client.ts` and `edge.ts` do not configure it as `beforeSend`.
Server initialisation also enables `includeLocalVariables: true`.

`apps/app/proxy.ts:94-96` composes Clerk and CSP without `auth.protect()`;
`apps/api/proxy.ts:1-4` is bare middleware. Local guards reduce current exposure
but make protection depend on every future route remembering its own guard.

### Public page and visual hierarchy

`apps/web/app/security/page.tsx:19-68` makes unsupported claims about blanket
Neon encryption, regional replication, every-request checks, read-only viewers
and category-level feed controls. Lines 70–133 render eight equal panels and one
mixed sales/reporting callout. `SECURITY.md:12-21,34-39` instead defines private
GitHub advisory/support routes and precise response targets.

The generic panel in `apps/web/app/styles/shell.css:364-373` is 16px and its body
copy at lines 405–409 is 0.9375rem. Correct `/security` through a scoped CSS
module, not by changing the shared selector.

## Step 0: Preflight decisions

1. Confirm `preview` base, Plan 120 DONE and a clean drift check.
2. Confirm whether
   `https://github.com/hiltonbrown/team-calendar/security/advisories/new` is
   accessible to intended reporters. Confirm `security@teamcalendar.online` is
   monitored before retaining it. Use only a verified private route.
3. Confirm the recommended `org:viewer` employee-baseline interpretation. If
   production uses a separate employee role or dedicated read-only viewer, STOP
   for an operator decision because authorisation and copy both change.
4. Record provider region/replication facts only when the operator can verify
   deployed Vercel, Neon, Redis/KV, Clerk, Sentry and PostHog settings. Missing
   evidence means qualified wording, not a guessed guarantee.
5. Classify every API `route.ts` as Clerk-authenticated, public bearer,
   signature-verified, OAuth-state-verified, Inngest-verified, operator-only or
   health. If any route cannot be classified, STOP before middleware edits.

## Commands

| Purpose | Command | Expected |
|---|---|---|
| Feed | `TMPDIR=/tmp bunx vitest run packages/feeds/src/projection/feed-projection.test.ts` | privacy matrix and existing projection tests pass |
| People | `TMPDIR=/tmp bunx vitest run packages/availability/src/people/people-service.test.ts` | profile/history access matrix passes |
| Roles | `TMPDIR=/tmp bunx vitest run apps/app/app/actions/settings/invite-member.test.ts apps/app/app/'(authenticated)'/public-holidays/_actions.test.ts` | assignment and action matrices pass |
| Sentry | `TMPDIR=/tmp bunx vitest run packages/observability/scrubber.test.ts packages/observability/sentry-init.test.ts` | all runtimes scrub and frame locals are disabled |
| Proxies | `TMPDIR=/tmp bunx vitest run apps/app/proxy.test.ts apps/api/proxy.test.ts` | protected/public route matrix passes |
| Page | `TMPDIR=/tmp bunx vitest run apps/web/app/security/security.test.ts` | semantic/content/negative claim contract passes |
| Typecheck | `bun run --cwd packages/feeds typecheck && bun run --cwd packages/availability typecheck && bun run --cwd packages/observability typecheck && bun run --cwd apps/app typecheck && bun run --cwd apps/api typecheck && bun run --cwd apps/web typecheck` | all exit 0 |
| Builds | `bun run --cwd apps/app build && bun run --cwd apps/api build && bun run --cwd apps/web build` | all exit 0 |
| CI gates | `bun run check && bun run typecheck && TMPDIR=/tmp bun run test && TMPDIR=/tmp bun run test:integration` | all exit 0 |
| Hygiene | `git diff --check` | no output |

`TMPDIR=/tmp` is required in the current WSL environment.

## Executor toolkit

- Use `impeccable`: run its context script once for `apps/web/app/security`,
  read `reference/craft-floor.md` before editing, then apply its `clarify`,
  `layout`, `harden` and `polish` lenses. The direction is settled here.
- Use Context7 for installed Clerk 7 and Sentry 10 APIs before changing
  middleware or SDK hooks; verify against installed types.
- If available, run `vercel:react-best-practices` after TSX edits and
  `vercel:agent-browser-verify` after starting the web server.
- Inspect all target viewports together, fix observed defects in one batch, then
  perform at most one confirmation pass.

## Scope

**In scope**:

- `packages/feeds/src/projection/feed-projection.ts`
- `packages/feeds/src/projection/feed-projection.test.ts`
- `packages/availability/src/people/people-service.ts`
- `packages/availability/src/people/people-service.test.ts`
- `apps/app/app/(authenticated)/people/[personId]/page.tsx`
- `apps/app/app/(authenticated)/people/@modal/(.)[personId]/page.tsx`
- `apps/app/app/actions/settings/invite-member.ts`
- `apps/app/app/actions/settings/invite-member.test.ts`
- `apps/app/app/(authenticated)/public-holidays/_actions.ts`
- `apps/app/app/(authenticated)/public-holidays/_actions.test.ts`
- `packages/observability/server.ts`, `client.ts`, `edge.ts`, `scrubber.ts`
- `packages/observability/scrubber.test.ts`
- `packages/observability/sentry-init.test.ts` (create)
- `packages/auth/proxy.ts`
- `apps/app/proxy.ts`, `apps/app/proxy.test.ts`
- `apps/api/proxy.ts`, `apps/api/proxy.test.ts` (create test)
- `apps/web/app/security/page.tsx`
- `apps/web/app/security/security.module.css` (create)
- `apps/web/app/security/security.test.ts` (create)
- `SECURITY.md`
- `plans/README.md` (status only)

**Out of scope**:

- Category/type feed configuration, schema changes, Clerk dashboard changes,
  feed/Xero token formats, and authorised full feed URL behaviour.
- Certifications, audit artifacts, subprocessor register, provider guarantees,
  public-web CSP and dependency upgrades.
- ID-only diagnostic queries used solely to distinguish not-found without
  returning tenant data. Plan separately if the team adopts a literal ban.
- Shared marketing-panel changes, global navigation, privacy-policy or other
  page redesigns.

## Git workflow

- Branch: `preview` (`origin/preview`), not `main` or a plan-specific feature
  branch. The completed plan lands on `preview`.
- Work directly in the current working tree per `plans/README.md`.
- Commits:
  - `fix(security): enforce privacy and person access scope`
  - `fix(auth): close role and route protection gaps`
  - `fix(observability): apply sentry data scrubbing`
  - `feat(web): rebuild security page from verified controls`
- Do not push to `origin/preview` without operator instruction. Stop before
  editing if uncommitted user work is not safely accounted for.

## Steps

### 1. Add failing characterisation tests

- Feed: table-drive all nine `named`/`masked`/`private` feed-record combinations.
  Assert effective mode, summary, location and title/category disclosure.
- People: owner/admin any target; manager permitted report; manager unrelated
  person denied; employee self allowed; employee other denied. Cover profile and
  paginated history.
- Invite: owner may invite owner; admin may not; valid lower-role invitations
  remain available.
- Holidays: table-drive all five actions for owner, admin and denied roles;
  denial occurs before mutation.
- Sentry: mock `Sentry.init`, capture each runtime's options, invoke hooks with
  nested headers, cookies, user data, breadcrumb data, token fields and frame
  locals.
- Proxies: table-drive the complete route classification from Step 6.
- Page: use `renderToStaticMarkup` plus metadata inspection. Assert one main,
  ordered headings, four topic anchors, ordered data flow, review `<time>`, both
  closing paths and response targets. Negatively assert unsupported phrases.

Run each focused suite and record expected assertion failures. Fixture, syntax
or mock failures are not valid evidence.

### 2. Enforce the stricter feed privacy mode

Add `privacy_mode` to `recordSelect`. Define an explicit typed order
`named < masked < private`; do not rely on enum spelling. Combine the candidate
feed mode, including preview override, with each record's mode before projection.
Public holidays retain feed-wide privacy because they have no record mode.

Do not alter stored privacy, feed config or UID. Prove record privacy changes
continue to trigger the existing publication sequence/cache invalidation path.
If they do not, STOP and add the exact invalidation seam to this plan before
continuing.

**Verify**: feed command passes, including all nine disclosure assertions.

### 3. Centralise person visibility before sensitive queries

Add one private service helper enforcing, inside validated tenant and
organisation scope: owner/admin any active person; manager self plus existing
manager-scope results; employee/viewer self only. Apply it before profile
balances, status, history or alternative-contact queries. Extend
`listHistoryPage` input with the same actor/role context and check.

Pass actor and role from both full and intercepted person routes. Return the
existing non-enumerating denial/not-found contract. Do not duplicate a looser
page-only check.

**Verify**: people suite passes and denied targets cause no downstream sensitive
query.

### 4. Align privileged role actions

Apply `update-member-role.ts`'s invariant to invitations: only an owner can
request `org:owner`, before Clerk is called. For holidays, add one local
owner-or-admin helper and use it for all five actions; do not change shared
exact-role helper semantics or tenant resolution.

**Verify**: role command passes and denied requests call no external service.

### 5. Wire and harden Sentry scrubbing

After checking Sentry 10 docs/types, configure `scrubSentryEvent` as
`beforeSend` in server, client and edge. Disable server
`includeLocalVariables`. Route breadcrumb/log structured data through supported
SDK hooks where available and test real installed event shapes. Preserve Replay
text/media masking and useful non-sensitive diagnostics.

If console logging can emit structured secrets through no supported hook, STOP
and disable that integration instead of retaining an unsanitised path.

**Verify**: Sentry suites pass and no fixture secret survives emitted payloads.

### 6. Protect routes by default with a narrow allowlist

Re-export Clerk's supported route matcher from `packages/auth/proxy.ts`. Use
`auth.protect()` for every matched route not explicitly public.

- App public routes: sign-in/sign-up, `/api/csp-report`, Clerk internals and
  matcher-excluded static assets. Preserve nonce CSP headers on all responses.
- API public bearer: `/ical/:token.ics`.
- API independently verified: auth/payment webhooks, Inngest, Xero OAuth
  callback.
- Operator/health: keep-alive and health, preserving their current contracts.
- Clerk protected: availability, notifications, support, sync, Xero OAuth start
  and feed-management routes.

Inspect every current `route.ts` before coding. Allow exact paths/prefixes, not
whole `/api`, `/webhooks` or `/cron` namespaces. Tests must list every current
route and prove a new route defaults to protected.

**Verify**: proxy suites and app/API builds pass, including unauthenticated,
authenticated, CSP, ICS, webhook, Inngest, OAuth, health and keep-alive cases.

### 7. Rebuild `/security` from the confirmed contract

Implement the Impeccable brief in `page.tsx` and a page-scoped CSS module:

1. Canonical metadata and effective `en_AU` Open Graph locale, following
   post-Plan-118 convention.
2. Focusable main, authored hero, fixed review date, compact summary and local
   topic nav.
3. Four semantic sections in prescribed order, with concise control rows.
4. Ordered Xero-to-calendar flow with Redis/KV called out accurately.
5. Effective feed privacy wording from Step 2, no category selectors.
6. Privacy, assessment and verified private-reporting links.
7. Distinct assessment/reporting blocks with policy response targets.

Use icons only for distinct concepts and mark decorative icons `aria-hidden`.
Do not repeat `ShieldCheck` as decoration. Keep all page-owned layout and
responsive rules scoped.

**Verify**: page suite and web typecheck pass, then run:

```bash
node .agents/skills/impeccable/scripts/detect.mjs --json apps/web/app/security/page.tsx
```

Expected: no unapproved violation and no unsupported phrase in rendered markup.

### 8. Align the reporting policy

Update `SECURITY.md` only as required by the verified Step 0 channel. Preserve
private advisory preference, safe harbour, two-day acknowledgement, five-day
triage and coordinated disclosure. Add a monitored alternative only when its
ownership is confirmed. Page and policy must not conflict.

**Verify**: the page test locks shared targets/channel; `git diff --check` passes.

### 9. Verify responsive, accessible and dark output

Run the web app on 3001 and inspect `/security` at 1440×1000, 1024×768,
390×844 light, 390×844 dark, and 200% zoom at 1280px. Verify keyboard anchors,
3px focus, heading order, readable vertical flow, no horizontal scroll, 16px
body minimum, distinct closing actions, WCAG 2.2 AA contrast, reduced-motion
safety, and no console/network/hydration errors.

Keep screenshots in `/tmp`. Fix observed defects in one batch and confirm once.
If a browser is unavailable, record visual verification as incomplete and do
not claim this plan done from source inspection alone.

### 10. Run release gates and review the trust diff

Run all commands in **Commands**. Review that privacy never weakens, denied
profiles do not reach sensitive queries, admins cannot grant ownership, owner
actions work, Sentry scrubs all runtimes, routes default protected, every public
claim has evidence, and only in-scope files changed. Record commands, provider
facts and viewports in review notes. The reviewer marks the plan DONE after
independent verification.

## Done criteria

- [ ] All nine feed/record privacy combinations use the stricter mode and prove
  no summary, location or type/title leakage.
- [ ] Profile and history use one actor/role scope policy in both route variants.
- [ ] Admins cannot invite owners; owners can.
- [ ] Owners/admins can use all five holiday actions; other roles cannot.
- [ ] All Sentry runtimes use supported scrub hooks and server locals are off.
- [ ] App/API middleware default protected with a narrow verified allowlist.
- [ ] `/security` answers four assessor questions, includes semantic flow and
  date, and separates procurement from vulnerability reporting.
- [ ] Unsupported category, blanket encryption, replication, impossible-access
  and blanket read-only-viewer claims are absent.
- [ ] Page and policy share a monitored private channel and response targets.
- [ ] Scoped CSS meets shape, type, focus, tonal, responsive and theme rules.
- [ ] Browser verification and all focused/build/CI/hygiene gates pass.

## Review notes

Pending execution.
