# Plan 133: Make feed subscription primary and administration progressive

> **Executor instructions**: Read the Impeccable skill, load context once for `apps/app/app/(authenticated)/feeds`, then read `reference/critique.md`, `reference/distill.md`, `reference/harden.md` and `reference/craft-floor.md`. Run the drift check and all gates. Never mask, truncate or replace the complete active feed URL.
>
> **Drift check**: `git diff --stat e7ee7c7..HEAD -- 'apps/app/app/(authenticated)/feeds' 'apps/app/components/feed'`

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: accessibility, design, permissions, tests
- **Planned at**: commit `e7ee7c7`, 2026-08-30

## Why this matters

Feed subscription is specific and well explained, but non-admins can reach a complete-looking create form, repeated feed cards expose too many lifecycle actions, filtered empty state says “No feeds yet”, and feed detail gives subscription and rare administration equal visual weight.

## Current state and contract

- Preserve complete selectable/copyable URLs, provider instructions, scope/privacy truth, confirmed rotate/archive dialogs and server-side feed visibility.
- `feeds/new/page.tsx:12-52` renders the form without a page-level role gate.
- `feed-table.tsx:183-259` exposes Copy, detail, Rotate, Pause/Resume/Restore and Archive per card.
- `feed-filter-bar.tsx:35-114` has no reset; `feeds/page.tsx:80-95` does not distinguish filtered empty.

## Scope

**In scope**: feed list/detail/new pages, filter bar, create form permission presentation, feed table/detail components and co-located tests.

**Out of scope**: token storage/signing, ICS generation, scope algorithms, URL masking of any kind, new lifecycle states.

## Git workflow

- Branch: `preview` (`origin/preview`), not `main` or a plan-specific feature
  branch. The completed plan lands on `preview`.
- Work and commit directly in the current working tree after checking `git status` and preserving unrelated user changes.
- Do not push to `origin/preview` without explicit operator instruction.

## Steps

1. Gate `/feeds/new` at the page boundary for admin/owner. Render a clear read-only permission state with a safe return path; do not show a form that will fail only after submission.
2. Keep Copy URL as the primary repeated action and one context action visible. Move rotation and lifecycle actions into a labelled keyboard-accessible overflow while retaining consequence dialogs.
3. Add Clear filters preserving `org`, active-filter feedback, and distinct “No feeds exist” versus “No feeds match” states.
4. Recompose detail in task order: usable URL and provider guidance, preview/visibility, then progressively disclosed scope, privacy, token history and lifecycle controls.
5. Verify card/action wrapping, long URLs, 200% zoom, mobile, dark mode, keyboard overflow and confirmation focus return in one bounded visual pass plus one confirmation.

## Verification and done criteria

- Viewer access to `/feeds/new` never renders submit.
- Filter reset and both empty-state branches have tests.
- URL completeness and exact Copy value remain covered for list and detail.
- Lifecycle overflow is fully keyboard accessible and confirmations restore focus.
- `bun run check`, `bun run typecheck`, `bun run test`, and `bun run test:integration` pass.
- Detector returns no untriaged feed findings.

## STOP conditions

Stop if the route cannot know role without changing the auth contract, if an action move would alter server permission checks, or if any proposed layout obscures the full active URL.

## Maintenance notes

Future provider instructions belong in the existing progressive disclosure, not as additional peer cards. The subscribe URL is intentionally authorised user-facing data.
