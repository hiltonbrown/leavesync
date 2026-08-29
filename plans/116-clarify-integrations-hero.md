# Plan 116: Give the integrations hero a clear outcome, problem and mechanism

> **Executor instructions**: Follow the plan exactly. Touch only in-scope files
> and stop on drift. The reviewer maintains the index.
>
> **Drift check (run first)**:
> `git diff --stat d8f84cf..HEAD -- apps/web/app/integrations/page.tsx apps/web/app/integrations/integrations.test.ts`

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: Plan 115 DONE
- **Category**: docs
- **Planned at**: commit `d8f84cf`, 2026-08-30; reconciled after Plan 115
- **Preview landing**: PENDING; approved commit `ce5a1c4`; `preview` is
  user-provisioned

## Why this matters

The heading, lead and supporting paragraph currently repeat the same
Xero-to-calendar mechanism. A Persuade hero should establish the operational
outcome, connect it to the leave-admin problem, then explain how Team Calendar
delivers it.

## Current state

- `apps/web/app/integrations/page.tsx:127-139` repeats Xero, Team Calendar and
  calendars across three consecutive text blocks.
- PRODUCT.md defines the user problem as hunting through messages, email and
  Xero to work out who is away.
- The approved product boundaries are AU Xero Payroll, manual availability and
  secure ICS feeds for Outlook, Google Calendar and Apple Calendar.
- Preserve natural SEO mentions of Xero Payroll and calendar destinations.

## Commands you will need

Use the focused test, targeted lint, web typecheck and four gates from Plan 110.
Add bounded visual captures at 390px and 1440px widths; the actions must remain
visible without awkward wrapping and the copy measure must stay readable.

## Suggested executor toolkit

- Use `impeccable` with `clarify` and `polish`. Read `craft-floor` immediately
  before editing. This is refinement, not a new visual concept.

## Scope

**In scope**:
- `apps/web/app/integrations/page.tsx`
- `apps/web/app/integrations/integrations.test.ts`

**Out of scope**:
- CTA destinations or button styling.
- Metadata, later section copy or backend behaviour.
- Claims about faster refresh, extra regions or extra calendar clients.

## Git workflow

- Target branch: user-created `preview`; do not create or reset it.
- Branch: `codex/116-clarify-integrations-hero`
- Commit: `refactor(web): clarify integrations hero copy`
- Approved landing commit: `ce5a1c4`.
- Executor: do not push or merge. Stop if `preview` or `origin/preview` is absent.
- Landing owner: after Plan 115 is reachable from `origin/preview`, update local
  `preview`, fast-forward it to the working branch with `git merge --ff-only`,
  run the plan gates, then push `preview`. Stop and reconcile on divergence.
- Completion proof: `git merge-base --is-ancestor ce5a1c4 origin/preview` must
  exit 0 before this plan is considered landed.

## Steps

### Step 1: Assign one job to each text block

Rewrite the heading around the customer outcome, the lead around eliminating
the fragmented leave/availability view, and the support copy around the factual
AU Xero plus manual availability plus secure ICS mechanism. Avoid “canonical”
in the hero and use no hype or em dashes.

**Verify**: focused test asserts Xero Payroll, manual availability and all three
destinations remain represented.

### Step 2: Inspect responsive hierarchy

Capture mobile and desktop. Confirm the heading wraps deliberately, paragraphs
do not restate each other, and CTAs remain visually connected to the message.
Make at most one bounded copy/spacing correction if evidence requires it.

**Verify**: final captures show no overflow or orphaned one-word lines.

### Step 3: Run gates

Run targeted lint, web typecheck, all repository gates and `git diff --check`.

## Test plan

- Preserve core entity and destination terms.
- Reject the internal phrase `canonical view` from the hero.
- No full paragraph snapshots.

## Done criteria

- [x] Heading, lead and support copy perform distinct jobs.
- [x] All factual integration boundaries remain accurate.
- [ ] Mobile and desktop hierarchy is clean. Capture was blocked by the
  recorded local browser/tooling constraints.
- [x] Available tests and gates pass, subject to the recorded disposable-
  worktree deviations below.

## STOP conditions

- Product truth required for the rewrite is ambiguous.
- A new legal, security or timing claim appears necessary.
- The hero structure changed materially before execution.

## Maintenance notes

Keep technical protocol detail in the body of the integrations page. The hero
should retain only enough mechanism to make the promise credible.

## Execution review

- **Verdict**: APPROVE at `ce5a1c4` on
  `codex/116-clarify-integrations-hero`, with visual capture explicitly blocked.
- The heading now states the outcome, the lead names the fragmented Xero, email
  and calendar-update problem, and the support copy explains the verified AU
  Xero plus manual availability plus secure ICS mechanism. The internal phrase
  `canonical view` is removed; CTA structure and styling are unchanged.
- A hero-scoped contract test protects Xero Payroll Australia, manual
  availability, secure ICS and the Outlook, Google Calendar and Apple Calendar
  destinations without snapshotting the full paragraph.
- Executor verification passed 10 focused tests, targeted Ultracite, web
  type-check, all 17 unit tasks, all 5 integration tasks and
  `git diff --check`. Reviewer inspected the two-file diff and independently
  reran 2 files and 10 tests.
- Full `check` reproduced four unrelated public-holiday diagnostics. Full
  type-check reached 18 of 19 tasks before duplicate Prisma types from external
  dependency mounts blocked the database package.
- No screenshots are claimed. `agent-browser` is unavailable, and Turbopack
  rejects the disposable worktree's external `apps/web/node_modules` symlink.
  Temporary mounts, caches and the panic log were removed; the worktree is clean.
