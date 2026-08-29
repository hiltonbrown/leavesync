# Plan 110: Describe calendar refresh timing without an unenforceable SLA

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on. Touch
> only the files listed as in scope. Stop on any STOP condition. The reviewer
> maintains `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat e7ee7c7..HEAD -- apps/web/app/integrations/page.tsx apps/web/app/integrations/integrations.test.ts`
> If the cited copy has changed, stop and report the new wording.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `e7ee7c7`, 2026-08-30
- **Execution status**: DONE, approved at `45357d92` on 2026-08-30

## Why this matters

The integrations page promises that external calendar clients receive changes
within 60 seconds. Team Calendar controls feed publication, but Outlook, Google
Calendar and Apple Calendar control subscription polling. The page must state
the server-side guarantee and disclose client-controlled refresh timing without
turning the Persuade surface into implementation documentation.

## Current state

- `apps/web/app/integrations/page.tsx:115` says calendar clients receive the
  latest view "within 60 seconds of a change".
- `apps/api/app/ical/[token]/route.ts:80-97` serves ETags and a one-hour
  `max-age`; it does not push changes to clients.
- `apps/app/components/feed/subscribe-instructions.tsx:174` is the canonical
  product wording: each calendar keeps the feed current on its own refresh
  schedule.
- Australian English and no em dashes are mandatory. Keep the copy direct and
  buyer-readable.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Focused test | `bunx vitest run apps/web/app/integrations/integrations.test.ts` | all tests pass |
| Lint | `bunx ultracite check apps/web/app/integrations/page.tsx apps/web/app/integrations/integrations.test.ts` | exit 0, no fixes |
| Web typecheck | `bun run --cwd apps/web typecheck` | exit 0 |
| Repository gates | `bun run check && bun run typecheck && bun run test && bun run test:integration` | every command exits 0 |

## Suggested executor toolkit

- Use the `impeccable` skill in Persuade mode. Run its context script for
  `apps/web/app/integrations`, then read its `clarify` reference before editing
  the copy. This is a narrow refinement, not a redesign.

## Scope

**In scope**:
- `apps/web/app/integrations/page.tsx`
- `apps/web/app/integrations/integrations.test.ts` (create)

**Out of scope**:
- Feed caching, polling, headers or jobs.
- Other marketing pages, README and PRODUCT.md.
- Promising a replacement number of minutes or hours.

## Git workflow

- Branch: `codex/110-correct-calendar-refresh-claim`
- Commit: `fix(web): correct calendar refresh claim`
- Do not push or merge.

## Steps

### Step 1: Add a focused content regression test

Render `IntegrationsPage` to static markup following
`apps/web/app/contact/contact.test.ts`. Assert that the rendered page does not
contain the 60-second receipt promise and does explain that calendar clients
refresh subscribed feeds on their own schedules. Avoid a whole-page snapshot.

**Verify**: run the focused test before the production edit and confirm the new
assertion fails for the current wording.

### Step 2: Replace the freshness promise

Update only the `Feed publishing` copy. State that Team Calendar republishes the
feed after relevant changes and that the calendar client determines when a
subscription refreshes. Keep `scoped`, `signed` and `revocable` only if the
sentence remains plain-language and easy to scan.

**Verify**: focused test and targeted lint both pass.

### Step 3: Run the gates

Run web typecheck and all four repository gates.

**Verify**: every command exits 0 and `git diff --check` reports no errors.

## Test plan

- Static-render test proves the unsupported 60-second claim is absent.
- Static-render test proves client-controlled refresh timing is disclosed.
- Do not assert the full paragraph verbatim; assert durable phrases so future
  editorial improvements do not cause needless churn.

## Done criteria

- [ ] No 60-second client-delivery promise remains on the integrations page.
- [ ] Client-controlled subscription refresh timing is explicit.
- [ ] Focused test proves both conditions.
- [ ] All repository gates pass.
- [ ] Only in-scope files changed.

## STOP conditions

- Product owners provide a contractual, provider-backed end-to-end SLA.
- The existing page or canonical in-app wording has materially changed.
- Testing the page requires production environment secrets or network access.

## Maintenance notes

Future freshness wording must distinguish Team Calendar publication latency,
Xero inbound polling cadence and third-party calendar polling. They are three
different clocks.

## Review record

- Executor commit: `45357d92` on branch
  `codex/110-correct-calendar-refresh-claim`.
- Scope: exactly `page.tsx` and the new focused test.
- Focused test command used the web app configuration:
  `bun run --cwd apps/web test -- app/integrations/integrations.test.ts`. The
  root Vitest invocation cannot transform this app's JSX-preserving tsconfig.
- Independent reviewer verification passed targeted Ultracite, web typecheck,
  repository check, 19/19 typecheck tasks, 17/17 unit-test tasks and 5/5
  integration-test tasks.
