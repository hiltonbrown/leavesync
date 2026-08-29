# Plan 135: Make notifications calmer, accessible and mobile-first

> **Executor instructions**: Read the Impeccable skill, load context once for notifications, then read `reference/critique.md`, `reference/distill.md`, `reference/adapt.md`, `reference/harden.md` and `reference/craft-floor.md`. Preserve the existing SSE architecture.
>
> **Drift check**: `git diff --stat e7ee7c7..HEAD -- 'apps/app/app/(authenticated)/notifications'`

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: accessibility, design, tests
- **Planned at**: commit `e7ee7c7`, 2026-08-30

## Why this matters

Live status and domain grouping are strong, but the feed exposes Unread plus all 11 types as peer buttons, preference switches lack programmatic labels, notification rows squeeze several duplicate actions horizontally, and deep-link scrolling does not move focus to the intended item.

## Current state and contract

- Preserve one app-wide notifications provider, reconnecting copy, unread semantics, category model, optimistic rollback and the rule that at least one delivery channel remains enabled.
- `notifications-client.tsx:344-365` owns the filter wall.
- Switch labelling/disabled reasoning is at `:572-595`.
- Row layout is at `:386-431`; focus logic is at `:187-195,458-464`.

## Scope

**In scope**: `notifications-client.tsx`, its tests, and local notification filter/type configuration.

**Out of scope**: SSE transport/backoff, persistence services, email delivery, notification enum changes.

## Git workflow

- Branch: `preview` (`origin/preview`), not `main` or a plan-specific feature
  branch. The completed plan lands on `preview`.
- Work and commit directly in the current working tree after checking `git status` and preserving unrelated user changes.
- Do not push to `origin/preview` without explicit operator instruction.

## Steps

1. Expose Unread plus the four domain categories as the primary filter set; move individual event types into a secondary disclosure with clear/reset behaviour.
2. Associate each preference switch with its visible label and a stable description. Render the last-channel disabled reason inline and via `aria-describedby`, not only `title`.
3. Reflow each mobile row around one primary navigation action. Stack metadata and secondary actions; remove duplicate “View” affordances where the body already navigates.
4. Resolve deep-link focus against the actual notification or preference row, add `tabIndex={-1}`, move focus after scroll and announce the target.
5. Add row-level saving/saved/error receipts for auto-save while retaining rollback.
6. Run one bounded mobile/desktop, 200%-zoom and dark-mode inspection, then one confirmation pass.

## Verification and done criteria

- Switches have unique accessible names and described disabled reasons.
- Tests cover category/type disclosure, reset, mobile row action, deep-link focus and save/rollback receipts.
- Primary page navigation exposes current state semantically.
- `bun run check`, `bun run typecheck`, `bun run test`, and `bun run test:integration` pass.
- Detector returns no untriaged findings.

## STOP conditions

Stop if category mappings do not cover every enum value, if focus targets are virtualised/unmounted, or if a change would create a second provider or alter SSE retry policy.

## Maintenance notes

Keep filter configuration exhaustive against the Prisma notification enum so new types cannot silently disappear.
